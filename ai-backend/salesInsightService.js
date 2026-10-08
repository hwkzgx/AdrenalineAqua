const { askOllama } = require("./ollamaClient");

async function generateSalesInsight(salesResult) {
  try {
    const {
      status,
      predictedSales,
      trend,
      trendPercentage,
      latestSales,
      latestSalesDate,
      previousSales,
      previousSalesDate,
      recordCount,
      minimumRecordsForPrediction,
    } = salesResult;

    const prompt = `
You are a sales assistant for Adrenaline Aqua Water Refilling Station.

Use ONLY the data below.
Do not invent or change any numbers.

Sales data status: ${status}
Sales records available: ${recordCount}
Minimum records needed for prediction: ${minimumRecordsForPrediction || "N/A"}

Previous sales: ${previousSales}
Previous sales date: ${previousSalesDate}

Latest sales: ${latestSales}
Latest sales date: ${latestSalesDate}

Sales trend: ${trend}
Trend percentage: ${trendPercentage}

Predicted sales: ${predictedSales}

Write one short professional admin sales insight.

Rules:
- Maximum of 2 short sentences.
- Do not write "AI Insight:", "Notification:", or "Alert:".
- If status is "insufficient_data", clearly say there is not enough historical data for a reliable forecast.
- If trend is decreasing, mention that sales decreased.
- If trend is increasing, mention that sales increased.
- If trend is stable, mention that sales remained stable.
- Do not invent reasons why sales changed.
- Do not add numbers that are not provided.
- Do not mention that you are an AI.
`;

    const response = await askOllama(prompt);

    return {
      success: true,
      insight: response.trim(),
    };
  } catch (error) {
    console.error("Sales Insight Error:", error);

    return {
      success: false,
      insight: null,
    };
  }
}

module.exports = {
  generateSalesInsight,
};