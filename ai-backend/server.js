const supabase = require("./supabaseClient");
const { askOllama } = require("./ollamaClient");
const { generateSalesPrediction } = require("./salesPredictionService");
const { generateSalesInsight } = require("./salesInsightService");
const { generateDemandPrediction } = require("./predictionService");
const { generateRecommendations } = require("./recommendationService");
const { generateExpenseInsight } = require("./expenseInsightService");
const { generateDeliveryInsight } = require("./deliveryInsightService");
const { generateOrderInsight } = require("./orderInsightService");
const { generateCustomerInsight } = require("./customerInsightService");

const {
  generateCustomerNotification,
} = require("./customerNotificationService");

const {
  generateRiderInsight,
} = require("./riderInsightService");

const {
  generateRiderNotification,
} = require("./riderNotificationService");

const {
  generateStaffInsight,
} = require("./staffInsightService");

const {
  generateStaffNotification,
} = require("./staffNotificationService");

const {
  generateCoAssociateInsight,
} = require("./coAssociateInsightService");

const {
  generateCoAssociateNotification,
} = require("./coAssociateNotificationService");

const {
  startOrderEventListener,
} = require("./orderEventListener");

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// =========================================================
// TEST BACKEND
// =========================================================

app.get("/", (req, res) => {
  res.json({
    message: "Adrenaline Aqua AI Backend is running!",
  });
});

// =========================================================
// TEST SUPABASE ORDERS
// =========================================================

app.get("/test-orders", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .limit(5);

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }

  res.json({
    success: true,
    count: data.length,
    orders: data,
  });
});

// =========================================================
// TEST AI DATA
// =========================================================

app.get("/test-ai-data", async (req, res) => {
  const { data: orderItems, error: orderItemsError } =
    await supabase
      .from("order_items")
      .select("*");

  const { data: inventory, error: inventoryError } =
    await supabase
      .from("inventory")
      .select("*");

  if (orderItemsError || inventoryError) {
    return res.status(500).json({
      success: false,
      orderItemsError:
        orderItemsError?.message || null,
      inventoryError:
        inventoryError?.message || null,
    });
  }

  res.json({
    success: true,
    orderItemsCount: orderItems.length,
    inventoryCount: inventory.length,
    orderItems,
    inventory,
  });
});

// =========================================================
// TEST OLLAMA CONNECTION
// =========================================================

app.get("/test-ollama", async (req, res) => {
  try {
    const response = await askOllama(
      "Reply with one short sentence: Ollama is connected to Adrenaline Aqua."
    );

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =========================================================
// AI DEMAND PREDICTION
// =========================================================

app.get("/ai/predictions", async (req, res) => {
  try {
    const predictions =
      await generateDemandPrediction();

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      predictions,
    });
  } catch (error) {
    console.error(
      "Demand Prediction Error:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =========================================================
// AI INVENTORY RECOMMENDATIONS
// =========================================================

app.get("/ai/recommendations", async (req, res) => {
  try {
    const recommendations =
      await generateRecommendations();

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      recommendations,
    });
  } catch (error) {
    console.error(
      "Recommendation Error:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =========================================================
// AI SALES PREDICTION + SALES TREND
// =========================================================

app.get("/ai/sales-prediction", async (req, res) => {
  try {
    const result =
      await generateSalesPrediction();

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error(
      "Sales Prediction Error:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =========================================================
// AI SALES INSIGHT USING OLLAMA
// =========================================================

app.get("/ai/sales-insight", async (req, res) => {
  try {
    const salesResult =
      await generateSalesPrediction();

    const insightResult =
      await generateSalesInsight(
        salesResult
      );

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      sales: salesResult,
      insight: insightResult,
    });
  } catch (error) {
    console.error(
      "Sales Insight Error:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =========================================================
// CHECK UNIQUE PRODUCTS FROM ORDER_ITEMS
// =========================================================

app.get("/test-products", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("order_items")
      .select(
        "item_name, size_variant, water_type"
      );

    if (error) {
      throw error;
    }

    const uniqueProducts = [
      ...new Map(
        data.map((item) => {
          const key =
            `${item.water_type || ""}|` +
            `${item.size_variant || ""}|` +
            `${item.item_name || ""}`;

          return [
            key,
            {
              item_name: item.item_name,
              water_type: item.water_type,
              size_variant:
                item.size_variant,
            },
          ];
        })
      ).values(),
    ];

    res.json({
      success: true,
      count: uniqueProducts.length,
      products: uniqueProducts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =========================================================
// AI EXPENSE ANALYSIS + UNUSUAL EXPENSE DETECTION
// =========================================================

app.get(
  "/ai/expense-insight",
  async (req, res) => {
    try {
      const data =
        await generateExpenseInsight();

      res.json({
        success: true,
        generatedAt:
          new Date().toISOString(),
        result: data.result,
        insight: data.insight,
      });
    } catch (error) {
      console.error(
        "Expense Analysis Error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// =========================================================
// DELIVERY ANALYSIS + OLLAMA INSIGHT
// =========================================================

app.get(
  "/ai/delivery-insight",
  async (req, res) => {
    try {
      const data =
        await generateDeliveryInsight();

      res.json({
        success: true,
        generatedAt:
          new Date().toISOString(),
        result: data.result,
        insight: data.insight,
      });
    } catch (error) {
      console.error(
        "Delivery Analysis Error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// =========================================================
// HIGH-DEMAND PRODUCT DETECTION
// =========================================================

app.get("/ai/high-demand", async (req, res) => {
  try {
    const predictions =
      await generateDemandPrediction();

    const validPredictions = (
      predictions || []
    )
      .filter(
        (item) =>
          item?.product &&
          Number(
            item.predictedDemand || 0
          ) > 0
      )
      .sort(
        (a, b) =>
          Number(
            b.predictedDemand || 0
          ) -
          Number(
            a.predictedDemand || 0
          )
      );

    if (validPredictions.length === 0) {
      return res.json({
        success: true,
        generatedAt:
          new Date().toISOString(),

        result: {
          status: "no_demand_detected",
          topProduct: null,
          predictedDemand: 0,
          productsChecked:
            predictions?.length || 0,
        },

        insight: {
          success: true,
          insight:
            "No significant product demand is currently predicted.",
        },
      });
    }

    const topProduct =
      validPredictions[0];

    const predictedDemand =
      Number(
        topProduct.predictedDemand || 0
      );

    const isHighDemand =
      predictedDemand >= 3;

    const result = {
      status: isHighDemand
        ? "high_demand"
        : "normal_demand",

      topProduct:
        topProduct.product,

      predictedDemand,

      productsChecked:
        predictions.length,

      rankedProducts:
        validPredictions.map(
          (item) => ({
            product:
              item.product,

            predictedDemand:
              Number(
                item.predictedDemand || 0
              ),
          })
        ),
    };

    const prompt = `
You are an operations assistant for
Adrenaline Aqua Water Refilling Station.

Use ONLY the data below.

Top predicted product:
${result.topProduct}

Predicted demand:
${result.predictedDemand}

Demand status:
${result.status}

Write one short professional admin insight.

Rules:
- Maximum 2 short sentences.
- Do not write "AI Insight:", "Alert:", or "Notification:".
- If status is high_demand, mention that the product may require extra preparation or stock attention.
- If status is normal_demand, say demand is currently within a normal range.
- Do not invent numbers.
- Do not invent reasons for demand changes.
- Do not mention that you are an AI.
`;

    let insightText;

    try {
      insightText = (
        await askOllama(prompt)
      ).trim();
    } catch (error) {
      console.error(
        "High Demand Ollama Error:",
        error
      );

      insightText = isHighDemand
        ? `${result.topProduct} has the highest predicted demand at ${result.predictedDemand} unit(s). Consider preparing sufficient stock.`
        : `${result.topProduct} currently has the highest predicted demand at ${result.predictedDemand} unit(s), which remains within the normal range.`;
    }

    res.json({
      success: true,

      generatedAt:
        new Date().toISOString(),

      result,

      insight: {
        success: true,
        insight: insightText,
      },
    });
  } catch (error) {
    console.error(
      "High Demand Detection Error:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =========================================================
// ORDER ANALYSIS + OLLAMA INSIGHT
// =========================================================

app.get(
  "/ai/order-insight",
  async (req, res) => {
    try {
      const data =
        await generateOrderInsight();

      res.json({
        success: true,
        generatedAt:
          new Date().toISOString(),
        result: data.result,
        insight: data.insight,
      });
    } catch (error) {
      console.error(
        "Order Analysis Error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// =========================================================
// CUSTOMER PERSONALIZED AI INSIGHT
// =========================================================

app.get(
  "/ai/customer-insight/:userId",
  async (req, res) => {
    try {
      const userId =
        req.params.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error:
            "Customer user ID is required.",
        });
      }

      const data =
        await generateCustomerInsight(
          userId
        );

      res.json({
        success: true,
        generatedAt:
          new Date().toISOString(),
        result: data.result,
        insight: data.insight,
      });
    } catch (error) {
      console.error(
        "Customer Insight Endpoint Error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// =========================================================
// CUSTOMER AI NOTIFICATION
// =========================================================

app.get(
  "/ai/customer-notification/:userId",
  async (req, res) => {
    try {
      const userId =
        req.params.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error:
            "Customer user ID is required.",
        });
      }

      const result =
        await generateCustomerNotification(
          userId
        );

      res.json({
        success: true,
        generatedAt:
          new Date().toISOString(),
        result,
      });
    } catch (error) {
      console.error(
        "Customer Notification Endpoint Error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// =========================================================
// RIDER AI INSIGHT
// =========================================================

app.get(
  "/ai/rider-insight/:userId",
  async (req, res) => {
    try {
      const userId =
        req.params.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error:
            "Rider user ID is required.",
        });
      }

      const data =
        await generateRiderInsight(
          userId
        );

      res.json({
        success: true,
        generatedAt:
          new Date().toISOString(),
        result: data.result,
        insight: data.insight,
      });
    } catch (error) {
      console.error(
        "Rider Insight Endpoint Error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// =========================================================
// RIDER AI NOTIFICATION
// =========================================================

app.get(
  "/ai/rider-notification/:userId",
  async (req, res) => {
    try {
      const userId =
        req.params.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error:
            "Rider user ID is required.",
        });
      }

      const result =
        await generateRiderNotification(
          userId
        );

      res.json({
        success: true,
        generatedAt:
          new Date().toISOString(),
        result,
      });
    } catch (error) {
      console.error(
        "Rider Notification Endpoint Error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// =========================================================
// STAFF AI INSIGHT
// =========================================================

app.get(
  "/ai/staff-insight",
  async (req, res) => {
    try {
      const data =
        await generateStaffInsight();

      res.json({
        success: true,
        generatedAt:
          new Date().toISOString(),
        result: data.result,
        insight: data.insight,
      });
    } catch (error) {
      console.error(
        "Staff Insight Endpoint Error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// =========================================================
// STAFF AI NOTIFICATION
// =========================================================

app.get(
  "/ai/staff-notification",
  async (req, res) => {
    try {
      const result =
        await generateStaffNotification();

      res.json({
        success: true,
        generatedAt:
          new Date().toISOString(),
        result,
      });
    } catch (error) {
      console.error(
        "Staff Notification Endpoint Error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// =========================================================
// CO-ASSOCIATE AI INSIGHT
// =========================================================

app.get(
  "/ai/co-associate-insight",
  async (req, res) => {
    try {
      const data =
        await generateCoAssociateInsight();

      res.json({
        success: true,
        generatedAt:
          new Date().toISOString(),
        result: data.result,
        insight: data.insight,
      });
    } catch (error) {
      console.error(
        "Co-Associate Insight Endpoint Error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// =========================================================
// CO-ASSOCIATE AI NOTIFICATION
// =========================================================

app.get(
  "/ai/co-associate-notification",
  async (req, res) => {
    try {
      const result =
        await generateCoAssociateNotification();

      res.json({
        success: true,
        generatedAt:
          new Date().toISOString(),
        result,
      });
    } catch (error) {
      console.error(
        "Co-Associate Notification Endpoint Error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// =========================================================
// START SERVER
// =========================================================

app.listen(PORT, () => {
  console.log(
    `AI Backend running on port ${PORT}`
  );

  // Automatic order event listener stays active.
  startOrderEventListener();
});