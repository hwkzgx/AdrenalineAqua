// forecastEvaluationService.js

const {
  getHistoricalWeeklyDemand,
} = require("./predictionService");

// ================================
// FORECASTING METHODS
// ================================

// Weighted Moving Average
function weightedMovingAverage(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  let weightedTotal = 0;
  let totalWeight = 0;

  values.forEach((value, index) => {
    const weight = index + 1;

    weightedTotal += Number(value || 0) * weight;
    totalWeight += weight;
  });

  return totalWeight > 0
    ? weightedTotal / totalWeight
    : 0;
}

// Simple Moving Average
function simpleMovingAverage(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const total = values.reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  return total / values.length;
}

// ================================
// EVALUATION METRICS
// ================================

// Mean Absolute Error
function calculateMAE(results) {
  if (!results.length) {
    return null;
  }

  const totalAbsoluteError = results.reduce(
    (sum, result) =>
      sum + Math.abs(result.actual - result.predicted),
    0
  );

  return totalAbsoluteError / results.length;
}

// Root Mean Square Error
function calculateRMSE(results) {
  if (!results.length) {
    return null;
  }

  const totalSquaredError = results.reduce(
    (sum, result) => {
      const error = result.actual - result.predicted;
      return sum + error ** 2;
    },
    0
  );

  return Math.sqrt(
    totalSquaredError / results.length
  );
}

// ================================
// GENERIC BACKTEST
// ================================

function backtestForecast(
  weeklyDemand,
  forecastingFunction,
  methodName,
  historySize = 4
) {
  if (
    !Array.isArray(weeklyDemand) ||
    weeklyDemand.length <= historySize
  ) {
    return {
      method: methodName,
      historySize,
      samples: 0,
      mae: null,
      rmse: null,
      results: [],
      message:
        "Not enough historical weeks for backtesting.",
    };
  }

  const results = [];

  for (
    let targetIndex = historySize;
    targetIndex < weeklyDemand.length;
    targetIndex++
  ) {
    // Only use weeks before the target week
    const historicalWindow = weeklyDemand.slice(
      targetIndex - historySize,
      targetIndex
    );

    const rawPrediction =
      forecastingFunction(historicalWindow);

    const predicted = Math.max(
      0,
      Math.round(rawPrediction)
    );

    const actual = Number(
      weeklyDemand[targetIndex] || 0
    );

    const error = actual - predicted;

    results.push({
      historicalWindow,
      predicted,
      actual,
      absoluteError: Math.abs(error),
      squaredError: error ** 2,
    });
  }

  const mae = calculateMAE(results);
  const rmse = calculateRMSE(results);

  return {
    method: methodName,
    historySize,
    samples: results.length,

    mae:
      mae === null
        ? null
        : Number(mae.toFixed(2)),

    rmse:
      rmse === null
        ? null
        : Number(rmse.toFixed(2)),

    results,
  };
}

// ================================
// INDIVIDUAL MODEL EVALUATION
// ================================

function evaluateWMA(
  weeklyDemand,
  historySize = 4
) {
  return backtestForecast(
    weeklyDemand,
    weightedMovingAverage,
    "Weighted Moving Average",
    historySize
  );
}

function evaluateSMA(
  weeklyDemand,
  historySize = 4
) {
  return backtestForecast(
    weeklyDemand,
    simpleMovingAverage,
    "Simple Moving Average",
    historySize
  );
}

// ================================
// MODEL SELECTION
// ================================

function selectBestModel(evaluations) {
  const validEvaluations = evaluations.filter(
    (evaluation) =>
      evaluation.samples > 0 &&
      evaluation.mae !== null &&
      evaluation.rmse !== null
  );

  if (validEvaluations.length === 0) {
    return null;
  }

  // Primary basis: lowest MAE
  // Tie-breaker: lowest RMSE
  return validEvaluations.reduce((best, current) => {
    if (current.mae < best.mae) {
      return current;
    }

    if (
      current.mae === best.mae &&
      current.rmse < best.rmse
    ) {
      return current;
    }

    return best;
  });
}

// ================================
// EVALUATE ALL PRODUCTS
// ================================

async function evaluateAllProducts() {
  const historicalData =
    await getHistoricalWeeklyDemand();

  if (
    !Array.isArray(historicalData) ||
    historicalData.length === 0
  ) {
    return [];
  }

  return historicalData.map((item) => {
    const quantities = item.weeklyDemand.map(
      (week) => Number(week.quantity || 0)
    );

    // Same historical window for fair comparison
    const wmaEvaluation = evaluateWMA(
      quantities,
      4
    );

    const smaEvaluation = evaluateSMA(
      quantities,
      4
    );

    const evaluations = [
      wmaEvaluation,
      smaEvaluation,
    ];

    const bestModel =
      selectBestModel(evaluations);

    const models = evaluations.map(
      (evaluation) => {
        const backtestResults =
          evaluation.results.map(
            (result, index) => {
              const targetIndex =
                evaluation.historySize + index;

              return {
                targetWeek:
                  item.weeklyDemand[targetIndex]
                    ?.week || null,

                predicted: result.predicted,
                actual: result.actual,

                absoluteError:
                  result.absoluteError,

                squaredError:
                  result.squaredError,
              };
            }
          );

        return {
          method: evaluation.method,
          backtestSamples:
            evaluation.samples,
          mae: evaluation.mae,
          rmse: evaluation.rmse,
          message:
            evaluation.message || null,
          backtestResults,
        };
      }
    );

    return {
      product: item.product,

      totalHistoricalWeeks:
        item.weeklyDemand.length,

      models,

      selectedModel: bestModel
        ? {
            method: bestModel.method,
            mae: bestModel.mae,
            rmse: bestModel.rmse,
          }
        : null,
    };
  });
}

module.exports = {
  weightedMovingAverage,
  simpleMovingAverage,
  calculateMAE,
  calculateRMSE,
  backtestForecast,
  evaluateWMA,
  evaluateSMA,
  selectBestModel,
  evaluateAllProducts,
};