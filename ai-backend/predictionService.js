const supabase = require("./supabaseClient");

// =====================================================
// DATE HELPERS
// =====================================================

// Get start of week (Monday)
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
}

// Convert Date to YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Get completed calendar weeks only.
// Current/incomplete week is excluded.
function getCompletedWeeks(referenceDate, numberOfWeeks = 4) {
  const weeks = [];
  const currentWeekStart = getStartOfWeek(referenceDate);

  for (let i = numberOfWeeks; i >= 1; i--) {
    const week = new Date(currentWeekStart);

    week.setDate(
      currentWeekStart.getDate() - i * 7
    );

    weeks.push(formatDate(week));
  }

  return weeks;
}

// Get all completed weeks between two dates
function getWeekRange(startDate, endDate) {
  const weeks = [];

  const start = getStartOfWeek(startDate);
  const end = getStartOfWeek(endDate);

  const current = new Date(start);

  while (current < end) {
    weeks.push(formatDate(current));
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

// =====================================================
// DATA
// =====================================================

// Fetch delivered orders and their items
async function getDeliveredData() {
  const { data: orders, error: ordersError } =
    await supabase
      .from("orders")
      .select("order_id, order_date, status");

  if (ordersError) {
    throw new Error(
      `Orders error: ${ordersError.message}`
    );
  }

  const { data: orderItems, error: itemsError } =
    await supabase
      .from("order_items")
      .select(
        "order_id, item_name, size_variant, water_type, quantity"
      );

  if (itemsError) {
    throw new Error(
      `Order items error: ${itemsError.message}`
    );
  }

  const deliveredOrders = (orders || []).filter(
    (order) => {
      const status = String(order.status || "")
        .trim()
        .toLowerCase();

      return (
        status === "delivered" &&
        order.order_date
      );
    }
  );

  const deliveredOrderMap = {};

  deliveredOrders.forEach((order) => {
    deliveredOrderMap[order.order_id] = order;
  });

  return {
    orderItems: orderItems || [],
    deliveredOrders,
    deliveredOrderMap,
  };
}

// =====================================================
// WEEKLY PRODUCT HISTORY
// =====================================================

function buildProductHistory(
  orderItems,
  deliveredOrderMap
) {
  const productHistory = {};

  orderItems.forEach((item) => {
    const order =
      deliveredOrderMap[item.order_id];

    if (!order) {
      return;
    }

    const productName =
      item.item_name ||
      `${item.water_type || ""} ${
        item.size_variant || ""
      }`.trim();

    if (!productName) {
      return;
    }

    const quantity = Number(
      item.quantity || 0
    );

    if (quantity <= 0) {
      return;
    }

    const weekStart = formatDate(
      getStartOfWeek(order.order_date)
    );

    if (!productHistory[productName]) {
      productHistory[productName] = {};
    }

    if (
      !productHistory[productName][weekStart]
    ) {
      productHistory[productName][weekStart] =
        0;
    }

    productHistory[productName][weekStart] +=
      quantity;
  });

  return productHistory;
}

// =====================================================
// WEIGHTED MOVING AVERAGE
// =====================================================

function calculateWMA(values) {
  if (!values || values.length === 0) {
    return 0;
  }

  let weightedTotal = 0;
  let totalWeight = 0;

  values.forEach((quantity, index) => {
    const weight = index + 1;

    weightedTotal += quantity * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) {
    return 0;
  }

  return weightedTotal / totalWeight;
}

// =====================================================
// MODEL EVALUATION
// =====================================================

/*
 * Backtesting:
 *
 * Example:
 *
 * Weeks 1-4 -> predict Week 5
 * Weeks 2-5 -> predict Week 6
 * Weeks 3-6 -> predict Week 7
 *
 * This lets us compare predictions with
 * actual historical demand.
 */
function evaluateWMA(weeklyDemand) {
  const windowSize = 4;

  const results = [];

  if (weeklyDemand.length <= windowSize) {
    return {
      testSamples: 0,
      mae: null,
      rmse: null,
      backtestResults: [],
    };
  }

  for (
    let i = windowSize;
    i < weeklyDemand.length;
    i++
  ) {
    const trainingWindow = weeklyDemand
      .slice(i - windowSize, i)
      .map((item) =>
        Number(item.quantity || 0)
      );

    const rawPrediction =
      calculateWMA(trainingWindow);

    const predicted = Math.max(
      0,
      Math.round(rawPrediction)
    );

    const actual = Number(
      weeklyDemand[i].quantity || 0
    );

    const absoluteError = Math.abs(
      actual - predicted
    );

    const squaredError =
      Math.pow(actual - predicted, 2);

    results.push({
      week: weeklyDemand[i].week,
      actual,
      predicted,
      absoluteError,
      squaredError,
    });
  }

  if (results.length === 0) {
    return {
      testSamples: 0,
      mae: null,
      rmse: null,
      backtestResults: [],
    };
  }

  // Mean Absolute Error
  const mae =
    results.reduce(
      (sum, result) =>
        sum + result.absoluteError,
      0
    ) / results.length;

  // Root Mean Square Error
  const mse =
    results.reduce(
      (sum, result) =>
        sum + result.squaredError,
      0
    ) / results.length;

  const rmse = Math.sqrt(mse);

  return {
    testSamples: results.length,

    mae: Number(mae.toFixed(2)),

    rmse: Number(rmse.toFixed(2)),

    backtestResults: results.map(
      ({
        week,
        actual,
        predicted,
        absoluteError,
      }) => ({
        week,
        actual,
        predicted,
        absoluteError,
      })
    ),
  };
}

// =====================================================
// COMPLETE HISTORICAL WEEKLY DEMAND
// =====================================================

async function getHistoricalWeeklyDemand() {
  const {
    orderItems,
    deliveredOrders,
    deliveredOrderMap,
  } = await getDeliveredData();

  if (deliveredOrders.length === 0) {
    return [];
  }

  const productHistory =
    buildProductHistory(
      orderItems,
      deliveredOrderMap
    );

  const orderDates = deliveredOrders
    .map(
      (order) =>
        new Date(order.order_date)
    )
    .filter(
      (date) =>
        !Number.isNaN(date.getTime())
    );

  if (orderDates.length === 0) {
    return [];
  }

  const earliestDate = new Date(
    Math.min(
      ...orderDates.map(
        (date) => date.getTime()
      )
    )
  );

  const referenceDate = new Date();

  const allWeeks = getWeekRange(
    earliestDate,
    referenceDate
  );

  return Object.entries(
    productHistory
  ).map(([product, weeklyData]) => ({
    product,

    weeklyDemand: allWeeks.map(
      (week) => ({
        week,
        quantity: Number(
          weeklyData[week] || 0
        ),
      })
    ),
  }));
}

// =====================================================
// GENERATE FORECAST
// =====================================================

async function generateDemandPrediction() {
  const historicalData =
    await getHistoricalWeeklyDemand();

  const predictions = [];

  historicalData.forEach(
    ({ product, weeklyDemand }) => {

      // Last 4 completed weeks
      const recentWeeks =
        weeklyDemand.slice(-4);

      const recentQuantities =
        recentWeeks.map((item) =>
          Number(item.quantity || 0)
        );

      // Next-week prediction
      const rawPrediction =
        calculateWMA(recentQuantities);

      const predictedDemand =
        Math.max(
          0,
          Math.round(rawPrediction)
        );

      const totalRecentDemand =
        recentQuantities.reduce(
          (sum, quantity) =>
            sum + quantity,
          0
        );

      // Evaluate model using historical data
      const evaluation =
        evaluateWMA(weeklyDemand);

      predictions.push({
        product,

        forecastingMethod:
          "Weighted Moving Average",

        historicalWeeksUsed:
          recentWeeks.length,

        recentWeeklyDemand:
          recentWeeks,

        totalRecentDemand,

        predictedNextWeekDemand:
          predictedDemand,

        modelEvaluation: {
          testSamples:
            evaluation.testSamples,

          mae:
            evaluation.mae,

          rmse:
            evaluation.rmse,
        },

        backtestResults:
          evaluation.backtestResults,
      });
    }
  );

  return predictions;
}

module.exports = {
  generateDemandPrediction,
  getHistoricalWeeklyDemand,
};