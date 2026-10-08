const {
  evaluateAllProducts,
} = require("./forecastEvaluationService");

async function runEvaluation() {
  try {
    console.log("\nFORECAST MODEL EVALUATION\n");

    const results = await evaluateAllProducts();

    if (!results.length) {
      console.log(
        "No historical data available for evaluation."
      );
      return;
    }

    results.forEach((product) => {
      console.log(
        `Product: ${product.product}`
      );

      console.log(
        `Historical Weeks: ${product.totalHistoricalWeeks}`
      );

      product.models.forEach((model) => {
        console.log(
          `${model.method}: MAE = ${
            model.mae ?? "N/A"
          }, RMSE = ${model.rmse ?? "N/A"}`
        );
      });

      if (product.selectedModel) {
        console.log(
          `Selected Model: ${product.selectedModel.method}`
        );
      } else {
        console.log(
          "Selected Model: Not enough data"
        );
      }

      console.log("--------------------------------");
    });
  } catch (error) {
    console.error(
      "Forecast Evaluation Error:",
      error.message
    );
  }
}

runEvaluation();