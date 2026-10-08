const { askOllama } = require("./ollamaClient");

async function generateAIInsight(recommendation) {
  try {
    const {
      product,
      forecastingMethod,
      predictedDemand,
      inventoryFound,
      currentStock,
      reorderLevel,
      targetStock,
      shortage,
      suggestedRestock,
      status,
      recommendation: ruleBasedRecommendation,
    } = recommendation;

    // No matching inventory record
    if (!inventoryFound) {
      return {
        success: true,
        insight:
          `${product}: No matching inventory record was found. ` +
          `Inventory data should be reviewed before generating a stock recommendation.`,
      };
    }

    const prompt = `
You are an inventory assistant for Adrenaline Aqua Water Refilling Station.

The forecasting and inventory calculations below were already completed by the system.

Your ONLY job is to turn the results into a short professional notification.

Do NOT calculate, estimate, modify, or invent any values.

DATA:
Product: ${product}
Forecasting method: ${forecastingMethod}
Predicted next-week demand: ${predictedDemand}
Current stock: ${currentStock}
Reorder level: ${reorderLevel}
Target stock: ${targetStock}
Forecast shortage: ${shortage}
Suggested restock quantity: ${suggestedRestock}
Inventory status: ${status}
System recommendation: ${ruleBasedRecommendation}

Write one concise professional notification.

RULES:
- Maximum of 2 short sentences.
- Start with "Demand Forecast:".
- Mention the product and predicted next-week demand.
- Keep the message concise and suitable for a notification bell.
- Do NOT repeat every inventory value.
- If status is "shortage", mention the suggested restock quantity.
- If status is "low_stock":
  - If predicted demand is 0, clearly separate the zero demand forecast from the low-stock condition.
  - Mention the suggested restock quantity as restoring the reorder level, not as a forecast shortage.
- If status is "sufficient", state that current stock is sufficient.
- Do NOT write "AI Prediction:", "AI Insight:", "Alert:", or "Notification:".
- Do NOT mention Ollama or artificial intelligence.
- Do NOT invent reasons for demand changes.
- Do NOT change any provided number.
- Do NOT make your own forecast.
`;

    const response = await askOllama(prompt);

    const insight = String(response || "").trim();

    // If Ollama returns nothing, use deterministic fallback
    if (!insight) {
      throw new Error(
        "Ollama returned an empty response."
      );
    }

    return {
      success: true,
      insight,
    };
  } catch (error) {
    console.error(
      "AI Insight Error:",
      error
    );

    // Safe fallback using system-computed values
    const {
      product,
      predictedDemand,
      suggestedRestock,
      status,
    } = recommendation;

    let fallbackInsight =
      `Demand Forecast: ${product} is expected to reach ` +
      `${predictedDemand} unit(s) next week.`;

    if (status === "shortage") {
      fallbackInsight +=
        ` Prepare or restock ${suggestedRestock} additional unit(s).`;
  } else if (status === "low_stock") {
  if (predictedDemand === 0) {
    fallbackInsight +=
      ` Stock is below the reorder level; consider restocking ${suggestedRestock} unit(s) to restore the minimum stock level.`;
  } else {
    fallbackInsight +=
      ` Stock is at or below the reorder level; consider restocking ${suggestedRestock} unit(s).`;
  }
    } else {
      fallbackInsight +=
        " Current stock is sufficient.";
    }

    return {
      success: false,
      insight: fallbackInsight,
    };
  }
}

module.exports = {
  generateAIInsight,
};