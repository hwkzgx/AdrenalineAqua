const supabase = require("./supabaseClient");

const {
  generateRecommendations,
} = require("./recommendationService");

// =========================================================
// SETTINGS
// =========================================================

const SIGNIFICANT_CHANGE_PERCENT = 20;

// =========================================================
// NOTIFICATION HELPERS
// =========================================================

async function hasUnreadNotification(
  message,
  targetRole = "admin"
) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, message")
    .eq("target_role", targetRole)
    .eq("is_read", false)
    .eq("message", message)
    .limit(1);

  if (error) {
    throw new Error(
      `Notification duplicate check error: ${error.message}`
    );
  }

  return data && data.length > 0;
}

async function insertNotification(
  message,
  targetRole = "admin"
) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      target_role: targetRole,
      message,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `AI notification insert error: ${error.message}`
    );
  }

  return data;
}

// =========================================================
// PREDICTION STATE HELPERS
// =========================================================

async function getPredictionState(product) {
  const { data, error } = await supabase
    .from("ai_prediction_state")
    .select(
      "id, product, predicted_demand, status, suggested_restock, updated_at"
    )
    .eq("product", product)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Prediction state error: ${error.message}`
    );
  }

  return data;
}

async function savePredictionState(item) {
  const state = {
    product: item.product,

    predicted_demand:
      Number(item.predictedDemand || 0),

    status:
      String(
        item.status || "sufficient"
      ),

    suggested_restock:
      Number(
        item.suggestedRestock || 0
      ),

    updated_at:
      new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("ai_prediction_state")
    .upsert(
      state,
      {
        onConflict: "product",
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      `Prediction state save error: ${error.message}`
    );
  }

  return data;
}

// =========================================================
// SIGNIFICANT CHANGE HELPERS
// =========================================================

function getPercentageChange(
  previousValue,
  currentValue
) {
  const previous =
    Number(previousValue || 0);

  const current =
    Number(currentValue || 0);

  if (previous === current) {
    return 0;
  }

  if (
    previous === 0 &&
    current > 0
  ) {
    return 100;
  }

  if (previous === 0) {
    return 0;
  }

  return (
    Math.abs(
      current - previous
    ) /
    Math.abs(previous)
  ) * 100;
}

function detectSignificantPredictionChange(
  previousState,
  currentItem
) {
  if (!previousState) {
    return {
      isNew: true,
      isSignificant: true,
      reason: "new_prediction",
    };
  }

  const previousStatus =
    String(
      previousState.status || ""
    );

  const currentStatus =
    String(
      currentItem.status || ""
    );

  if (
    previousStatus !==
    currentStatus
  ) {
    return {
      isNew: false,
      isSignificant: true,
      reason: "status_changed",
    };
  }

  const previousDemand =
    Number(
      previousState.predicted_demand || 0
    );

  const currentDemand =
    Number(
      currentItem.predictedDemand || 0
    );

  const demandChangePercent =
    getPercentageChange(
      previousDemand,
      currentDemand
    );

  if (
    demandChangePercent >=
    SIGNIFICANT_CHANGE_PERCENT
  ) {
    return {
      isNew: false,
      isSignificant: true,
      reason:
        "predicted_demand_changed",
      changePercent:
        Number(
          demandChangePercent.toFixed(2)
        ),
    };
  }

  const previousRestock =
    Number(
      previousState.suggested_restock || 0
    );

  const currentRestock =
    Number(
      currentItem.suggestedRestock || 0
    );

  const restockChangePercent =
    getPercentageChange(
      previousRestock,
      currentRestock
    );

  if (
    restockChangePercent >=
    SIGNIFICANT_CHANGE_PERCENT
  ) {
    return {
      isNew: false,
      isSignificant: true,
      reason:
        "recommended_restock_changed",
      changePercent:
        Number(
          restockChangePercent.toFixed(2)
        ),
    };
  }

  return {
    isNew: false,
    isSignificant: false,
    reason: "no_significant_change",
  };
}

// =========================================================
// INVENTORY / DEMAND FORECAST NOTIFICATIONS
// =========================================================

async function generateInventoryForecastNotifications() {
  const createdNotifications = [];

  try {
    const recommendations =
      await generateRecommendations();

    const significantIssues = [];

    for (const item of recommendations) {
      if (!item.inventoryFound) {
        continue;
      }

      const previousState =
        await getPredictionState(
          item.product
        );

      const change =
        detectSignificantPredictionChange(
          previousState,
          item
        );

      // Save the newest forecast as the next baseline.
      await savePredictionState(item);

      if (!change.isSignificant) {
        continue;
      }

      if (
        item.status === "sufficient"
      ) {
        continue;
      }

      if (
        item.status !== "shortage" &&
        item.status !== "low_stock"
      ) {
        continue;
      }

      significantIssues.push({
        ...item,
        changeReason: change.reason,
        changePercent:
          change.changePercent || null,
      });
    }

    // =====================================================
    // NO SIGNIFICANT ISSUE
    // =====================================================

    if (
      significantIssues.length === 0
    ) {
      return {
        notificationsCreated: 0,
        notifications: [],
        affectedProducts: [],
        reason:
          "No significant inventory forecast change detected.",
      };
    }

    // =====================================================
    // GROUP PRODUCTS
    // =====================================================

    const shortageItems =
      significantIssues.filter(
        (item) =>
          item.status === "shortage"
      );

    const lowStockItems =
      significantIssues.filter(
        (item) =>
          item.status === "low_stock"
      );

    // =====================================================
    // ADMIN - ONE SUMMARY NOTIFICATION
    // =====================================================

    const adminParts = [];

    if (shortageItems.length > 0) {
      const shortageText =
        shortageItems
          .map(
            (item) =>
              `${item.product} (${item.suggestedRestock} additional unit(s))`
          )
          .join(", ");

      adminParts.push(
        `Demand Forecast: ${shortageText} may require additional stock to meet forecasted demand.`
      );
    }

    if (lowStockItems.length > 0) {
      const lowStockText =
        lowStockItems
          .map(
            (item) =>
              `${item.product} (${item.suggestedRestock} unit(s) to restore target stock)`
          )
          .join(", ");

      adminParts.push(
        `Stock Alert: ${lowStockText} ${
          lowStockItems.length === 1
            ? "is"
            : "are"
        } at or below the reorder level.`
      );
    }

    const adminMessage =
      adminParts.join(" ");

    if (adminMessage) {
      const duplicate =
        await hasUnreadNotification(
          adminMessage,
          "admin"
        );

      if (!duplicate) {
        const notification =
          await insertNotification(
            adminMessage,
            "admin"
          );

        createdNotifications.push(
          notification
        );
      }
    }

    // =====================================================
    // STAFF - ONE SUMMARY NOTIFICATION
    // =====================================================

    const staffParts = [];

    if (shortageItems.length > 0) {
      const shortageText =
        shortageItems
          .map(
            (item) =>
              `${item.product} (${item.suggestedRestock} additional unit(s))`
          )
          .join(", ");

      staffParts.push(
        `Demand Forecast: ${shortageText} may require additional stock.`
      );
    }

    if (lowStockItems.length > 0) {
      const lowStockText =
        lowStockItems
          .map(
            (item) =>
              item.product
          )
          .join(", ");

      staffParts.push(
        `Stock Alert: ${lowStockText} ${
          lowStockItems.length === 1
            ? "is"
            : "are"
        } currently at or below the reorder level.`
      );
    }

    const staffMessage =
      staffParts.join(" ");

    if (staffMessage) {
      const duplicate =
        await hasUnreadNotification(
          staffMessage,
          "staff"
        );

      if (!duplicate) {
        const notification =
          await insertNotification(
            staffMessage,
            "staff"
          );

        createdNotifications.push(
          notification
        );
      }
    }

    // =====================================================
    // CO-ASSOCIATE - ONE SUMMARY NOTIFICATION
    // =====================================================

    const coParts = [];

    if (shortageItems.length > 0) {
      const shortageProducts =
        shortageItems
          .map(
            (item) =>
              item.product
          )
          .join(", ");

      coParts.push(
        `Demand Update: ${shortageProducts} ${
          shortageItems.length === 1
            ? "is"
            : "are"
        } expected to exceed current available stock.`
      );
    }

    if (lowStockItems.length > 0) {
      const lowStockProducts =
        lowStockItems
          .map(
            (item) =>
              item.product
          )
          .join(", ");

      coParts.push(
        `Inventory Update: ${lowStockProducts} ${
          lowStockItems.length === 1
            ? "is"
            : "are"
        } currently at or below the reorder level.`
      );
    }

    const coMessage =
      coParts.join(" ");

    if (coMessage) {
      const duplicate =
        await hasUnreadNotification(
          coMessage,
          "co"
        );

      if (!duplicate) {
        const notification =
          await insertNotification(
            coMessage,
            "co"
          );

        createdNotifications.push(
          notification
        );
      }
    }

    // =====================================================
    // RESULT
    // =====================================================

    return {
      notificationsCreated:
        createdNotifications.length,

      notifications:
        createdNotifications,

      affectedProducts:
        significantIssues.map(
          (item) => ({
            product: item.product,
            status: item.status,
            predictedDemand:
              item.predictedDemand,
            suggestedRestock:
              item.suggestedRestock,
            changeReason:
              item.changeReason,
          })
        ),
    };
  } catch (error) {
    console.error(
      "Inventory forecast notification error:",
      error
    );

    return {
      notificationsCreated: 0,
      notifications: [],
      affectedProducts: [],
      error: error.message,
    };
  }
}

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  generateInventoryForecastNotifications,
};