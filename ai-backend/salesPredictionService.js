const supabase = require("./supabaseClient");

async function generateSalesPrediction() {
  const { data, error } = await supabase
    .from("sales")
    .select("date, total_sales, total_products, total_orders, sales_code")
    .order("date", { ascending: true });

  if (error) {
    throw new Error(`Sales data error: ${error.message}`);
  }

  const sales = (data || [])
    .filter((row) => row.date && row.total_sales !== null)
    .map((row) => ({
      ...row,
      total_sales: Number(row.total_sales || 0),
      total_products: Number(row.total_products || 0),
      total_orders: Number(row.total_orders || 0),
    }));

  if (sales.length === 0) {
    return {
      status: "no_data",
      message: "No sales history is available yet.",
      recordCount: 0,
      predictedSales: null,
      trend: "unknown",
      trendPercentage: null,
      latestSales: null,
      previousSales: null,
    };
  }

  const latest = sales[sales.length - 1];
  const previous =
    sales.length >= 2 ? sales[sales.length - 2] : null;

  let trend = "insufficient_data";
  let trendPercentage = null;

  if (previous) {
    const previousSales = Number(previous.total_sales || 0);
    const latestSales = Number(latest.total_sales || 0);

    if (previousSales === 0 && latestSales === 0) {
      trend = "stable";
      trendPercentage = 0;
    } else if (previousSales === 0 && latestSales > 0) {
      trend = "increasing";
      trendPercentage = null;
    } else {
      const change =
        ((latestSales - previousSales) / previousSales) * 100;

      trendPercentage = Number(change.toFixed(2));

      if (Math.abs(change) < 5) {
        trend = "stable";
      } else if (change > 0) {
        trend = "increasing";
      } else {
        trend = "decreasing";
      }
    }
  }

  // Need at least 4 records before generating a forecast
  if (sales.length < 4) {
    return {
      status: "insufficient_data",
      message:
        "More sales history is needed before a reliable sales forecast can be generated.",
      recordCount: sales.length,
      minimumRecordsForPrediction: 4,
      predictedSales: null,
      trend,
      trendPercentage,
      latestSales: latest.total_sales,
      latestSalesDate: latest.date,
      previousSales: previous ? previous.total_sales : null,
      previousSalesDate: previous ? previous.date : null,
    };
  }

  // Weighted moving average
  const recent = sales.slice(-4);

  const weights = [1, 2, 3, 4];

  const weightedTotal = recent.reduce(
    (sum, row, index) =>
      sum + Number(row.total_sales || 0) * weights[index],
    0
  );

  const totalWeight = weights.reduce(
    (sum, weight) => sum + weight,
    0
  );

  const predictedSales = Number(
    (weightedTotal / totalWeight).toFixed(2)
  );

  return {
    status: "ready",
    message: "Sales prediction generated successfully.",
    recordCount: sales.length,
    predictedSales,
    method: "weighted_moving_average",
    recordsUsed: recent.length,
    trend,
    trendPercentage,
    latestSales: latest.total_sales,
    latestSalesDate: latest.date,
    previousSales: previous ? previous.total_sales : null,
    previousSalesDate: previous ? previous.date : null,
  };
}

module.exports = {
  generateSalesPrediction,
};