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
  // AI notification triggers have been removed in favor of the dedicated Insights page.
  return {
    notificationsCreated: 0,
    notifications: [],
    affectedProducts: [],
  };
}

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  generateInventoryForecastNotifications,
};