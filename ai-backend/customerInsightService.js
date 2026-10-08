const supabase = require("./supabaseClient");
const { askOllama } = require("./ollamaClient");

async function generateCustomerInsight(userId) {
  try {
    // =========================================================
    // GET CUSTOMER ORDERS
    // =========================================================
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("order_id, order_date, status")
      .eq("user_id", userId)
      .neq("status", "Cancelled")
      .order("order_date", { ascending: false });

    if (ordersError) {
      throw new Error(`Orders error: ${ordersError.message}`);
    }

    // No order history yet
    if (!orders || orders.length === 0) {
      return {
        success: true,
        result: {
          totalOrders: 0,
          favoriteProduct: null,
          favoriteQuantity: 0,
          lastOrderDate: null,
        },
        insight:
          "You don't have enough order history yet for a personalized recommendation.",
      };
    }

    const orderIds = orders.map((order) => order.order_id);

    // =========================================================
    // GET PRODUCTS FROM CUSTOMER ORDERS
    // =========================================================
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select(
        "order_id, item_name, water_type, size_variant, quantity"
      )
      .in("order_id", orderIds);

    if (itemsError) {
      throw new Error(`Order items error: ${itemsError.message}`);
    }

    // =========================================================
    // COUNT QUANTITY ORDERED PER PRODUCT
    // =========================================================
    const productTotals = {};

    (orderItems || []).forEach((item) => {
      // item_name already contains the complete product name.
      // Use water_type + size_variant only as fallback.
      const productName =
        item.item_name ||
        [item.water_type, item.size_variant]
          .filter(Boolean)
          .join(" ");

      if (!productName) {
        return;
      }

      if (!productTotals[productName]) {
        productTotals[productName] = 0;
      }

      productTotals[productName] += Number(item.quantity || 0);
    });

    // Rank products from most ordered to least ordered
    const rankedProducts = Object.entries(productTotals).sort(
      (a, b) => b[1] - a[1]
    );

    const favoriteProduct =
      rankedProducts.length > 0
        ? rankedProducts[0][0]
        : null;

    const favoriteQuantity =
      rankedProducts.length > 0
        ? rankedProducts[0][1]
        : 0;

    const lastOrderDate =
      orders[0]?.order_date || null;

    const result = {
      totalOrders: orders.length,
      favoriteProduct,
      favoriteQuantity,
      lastOrderDate,
    };

    // =========================================================
    // NO USABLE PRODUCT DATA
    // =========================================================
    if (!favoriteProduct) {
      return {
        success: true,
        result,
        insight:
          "Your order history is available, but there is not enough product data yet for a personalized recommendation.",
      };
    }

    // =========================================================
    // OLLAMA CUSTOMER INSIGHT
    // =========================================================
    const prompt = `
You are a customer assistant for Adrenaline Aqua Water Refilling Station.

Use ONLY the customer data provided below.

CUSTOMER DATA:
Total previous orders: ${result.totalOrders}
Most frequently ordered product: ${result.favoriteProduct}
Total quantity ordered for this product: ${result.favoriteQuantity}
Last order date: ${result.lastOrderDate}

Write one short personalized customer insight.

STRICT RULES:
- Maximum 2 short sentences.
- Only mention products explicitly listed in CUSTOMER DATA.
- Do NOT recommend or mention any other product.
- Do NOT invent products, services, promotions, discounts, prices, schedules, or features.
- Do NOT claim that the customer is running out of water.
- Do NOT predict when the customer needs a refill.
- Do NOT say the customer is "due", "due soon", "running low", or needs to reorder.
- The last order date is context only and must NOT be used to predict refill timing.
- Do NOT expose inventory, sales, or internal business information.
- Do NOT write "AI Insight:", "Alert:", or "Notification:".
- Do NOT mention that you are an AI.
- Base the message only on the customer's previous ordering pattern.
- A safe recommendation is to mention the customer's ordering preference and suggest using their order history when planning a future order.
`;

    let insight;

    try {
      insight = (await askOllama(prompt)).trim();
    } catch (ollamaError) {
      console.error(
        "Customer Ollama Insight Error:",
        ollamaError
      );

      // Safe fallback if Ollama is unavailable
      insight =
        `${favoriteProduct} is your most frequently ordered product based on your previous orders. ` +
        `You can consider it when planning your next order.`;
    }

    // =========================================================
    // RETURN RESULT
    // =========================================================
    return {
      success: true,
      result,
      insight,
    };
  } catch (error) {
    console.error(
      "Customer Insight Error:",
      error
    );

    throw error;
  }
}

module.exports = {
  generateCustomerInsight,
};