const supabase = require("./supabaseClient");
const { askOllama } = require("./ollamaClient");

async function generateStaffInsight() {
  try {
    // =========================================================
    // GET ORDERS
    // =========================================================
    const { data: orders, error: ordersError } =
      await supabase
        .from("orders")
        .select("order_id, status");

    if (ordersError) {
      throw new Error(
        `Orders error: ${ordersError.message}`
      );
    }

    // =========================================================
    // GET DELIVERY SCHEDULE
    // =========================================================
    const { data: deliveries, error: deliveryError } =
      await supabase
        .from("delivery_schedule")
        .select(
          "delivery_id, delivery_status"
        );

    if (deliveryError) {
      throw new Error(
        `Delivery error: ${deliveryError.message}`
      );
    }

    // =========================================================
    // GET INVENTORY
    // =========================================================
    const { data: inventory, error: inventoryError } =
      await supabase
        .from("inventory")
        .select(
          "inventory_id, item_name, quantity_available, reorder_level"
        );

    if (inventoryError) {
      throw new Error(
        `Inventory error: ${inventoryError.message}`
      );
    }

    // =========================================================
    // COUNT PENDING ORDERS
    // =========================================================
    const pendingOrders = (orders || []).filter(
      (order) =>
        (order.status || "").toLowerCase() ===
        "pending"
    ).length;

    // =========================================================
    // COUNT PENDING DELIVERIES
    // =========================================================
    const pendingDeliveries = (
      deliveries || []
    ).filter(
      (delivery) =>
        (
          delivery.delivery_status || ""
        ).toLowerCase() === "pending"
    ).length;

    // =========================================================
    // FIND LOW STOCK ITEMS
    // quantity_available <= reorder_level
    // =========================================================
    const lowStockItems = (
      inventory || []
    ).filter((item) => {
      const quantity = Number(
        item.quantity_available || 0
      );

      const reorderLevel = Number(
        item.reorder_level || 0
      );

      return quantity <= reorderLevel;
    });

    const lowStockNames = lowStockItems.map(
      (item) => item.item_name
    );

    // =========================================================
    // RESULT
    // =========================================================
    const result = {
      pendingOrders,
      pendingDeliveries,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockNames,
    };

    // =========================================================
    // OLLAMA STAFF INSIGHT
    // =========================================================
    const prompt = `
You are an operations assistant for the staff of Adrenaline Aqua Water Refilling Station.

Use ONLY the operational data provided below.

STAFF OPERATIONAL DATA:
Pending orders: ${result.pendingOrders}
Pending deliveries: ${result.pendingDeliveries}
Low-stock item count: ${result.lowStockCount}
Low-stock items: ${
      result.lowStockItems.length > 0
        ? result.lowStockItems.join(", ")
        : "None"
    }

Write one short and practical operational insight for the staff.

STRICT RULES:
- Maximum 2 short sentences.
- Use ONLY the data provided above.
- Do NOT invent orders.
- Do NOT invent deliveries.
- Do NOT invent products.
- Do NOT invent stock quantities.
- Do NOT invent customer information.
- Do NOT invent reasons for delays or low stock.
- Do NOT mention sales forecasts, profits, or expenses.
- If there are pending orders, you may suggest reviewing or processing them.
- If there are pending deliveries, you may suggest prioritizing or reviewing them.
- If there are low-stock items, mention ONLY the low-stock items listed above.
- If there are no pending orders, pending deliveries, or low-stock items, say that current operations have no immediate issues requiring attention.
- Do NOT write "AI Insight:", "Alert:", or "Notification:".
- Do NOT mention that you are an AI.
`;

    let insight;

    try {
      insight = (
        await askOllama(prompt)
      ).trim();
    } catch (ollamaError) {
      console.error(
        "Staff Ollama Insight Error:",
        ollamaError
      );

      // =======================================================
      // SAFE FALLBACK
      // =======================================================
      const issues = [];

      if (pendingOrders > 0) {
        issues.push(
          `${pendingOrders} pending order(s)`
        );
      }

      if (pendingDeliveries > 0) {
        issues.push(
          `${pendingDeliveries} pending delivery or deliveries`
        );
      }

      if (lowStockItems.length > 0) {
        issues.push(
          `${lowStockItems.length} low-stock item(s)`
        );
      }

      if (issues.length > 0) {
        insight =
          `Current operations have ${issues.join(
            ", "
          )}. Review these items to keep daily operations on track.`;
      } else {
        insight =
          "Current operations have no immediate issues requiring attention.";
      }
    }

    return {
      success: true,
      result,
      insight,
    };
  } catch (error) {
    console.error(
      "Staff Insight Error:",
      error
    );

    throw error;
  }
}

module.exports = {
  generateStaffInsight,
};