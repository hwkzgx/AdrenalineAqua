const supabase = require("./supabaseClient");

const {
  generateDemandPrediction,
} = require("./predictionService");

// Normalize product names for safer matching
function normalizeProductName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Find matching inventory record
function findMatchingInventory(inventory, productName) {
  const predictedProduct =
    normalizeProductName(productName);

  // Exact match first
  const exactMatch = inventory.find(
    (item) =>
      normalizeProductName(item.item_name) ===
      predictedProduct
  );

  if (exactMatch) {
    return exactMatch;
  }

  // Fallback partial match
  return inventory.find((item) => {
    const inventoryName =
      normalizeProductName(item.item_name);

    if (!inventoryName) {
      return false;
    }

    return (
      predictedProduct.includes(inventoryName) ||
      inventoryName.includes(predictedProduct)
    );
  });
}

async function generateRecommendations() {
  // Get demand forecasts
  const predictions =
    await generateDemandPrediction();

  // Get current inventory
  const {
    data: inventory,
    error: inventoryError,
  } = await supabase
    .from("inventory")
    .select(
      "inventory_id, item_name, category, quantity_available, reorder_level, price"
    );

  if (inventoryError) {
    throw new Error(
      `Inventory error: ${inventoryError.message}`
    );
  }

  const inventoryData = inventory || [];

  const recommendations = predictions.map(
    (prediction) => {
      const matchingInventory =
        findMatchingInventory(
          inventoryData,
          prediction.product
        );

      const predictedDemand = Math.max(
        0,
        Number(
          prediction.predictedNextWeekDemand || 0
        )
      );

      // Model evaluation from prediction service
      const modelEvaluation =
        prediction.modelEvaluation || {
          testSamples: 0,
          mae: null,
          rmse: null,
        };

      // ==========================================
      // NO MATCHING INVENTORY
      // ==========================================

      if (!matchingInventory) {
        return {
          product: prediction.product,

          forecastingMethod:
            prediction.forecastingMethod,

          predictedDemand,

          modelEvaluation,

          inventoryFound: false,

          status: "inventory_not_found",

          recommendation:
            "No matching inventory record was found.",
        };
      }

      // ==========================================
      // INVENTORY VALUES
      // ==========================================

      const currentStock = Math.max(
        0,
        Number(
          matchingInventory.quantity_available || 0
        )
      );

      const reorderLevel = Math.max(
        0,
        Number(
          matchingInventory.reorder_level || 0
        )
      );

      /*
       * Forecast shortage:
       *
       * How many additional units are required
       * for the predicted demand alone.
       */
      const shortage = Math.max(
        0,
        predictedDemand - currentStock
      );

      /*
       * Inventory target:
       *
       * For the current system, the target is
       * whichever is greater:
       *
       * - predicted demand
       * - configured reorder level
       *
       * This prevents a recommendation from
       * leaving inventory below its configured
       * minimum level.
       */
      const targetStock = Math.max(
        predictedDemand,
        reorderLevel
      );

      const suggestedRestock = Math.max(
        0,
        targetStock - currentStock
      );

      // ==========================================
      // RECOMMENDATION
      // ==========================================

      let status = "sufficient";

      let recommendation =
        "Current stock is sufficient for the forecasted demand.";

      // Forecasted demand exceeds stock
      if (shortage > 0) {
        status = "shortage";

        recommendation =
          `Forecasted demand may exceed available stock. ` +
          `Prepare ${suggestedRestock} additional unit(s).`;
      }

      // Stock is at/below configured reorder level
      else if (currentStock <= reorderLevel) {
        status = "low_stock";

        if (suggestedRestock > 0) {
          recommendation =
            `Stock is at or below the reorder level. ` +
            `Consider restocking ${suggestedRestock} unit(s).`;
        } else {
          recommendation =
            "Stock is at the reorder level and should be monitored.";
        }
      }

      // ==========================================
      // RESULT
      // ==========================================

      return {
        product: prediction.product,

        forecastingMethod:
          prediction.forecastingMethod,

        predictedDemand,

        modelEvaluation,

        inventoryFound: true,

        inventoryId:
          matchingInventory.inventory_id,

        currentStock,

        reorderLevel,

        shortage,

        targetStock,

        suggestedRestock,

        status,

        recommendation,
      };
    }
  );

  return recommendations;
}

module.exports = {
  generateRecommendations,
};