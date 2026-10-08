const supabase = require("./supabaseClient");
const { askOllama } = require("./ollamaClient");

async function generateCoAssociateInsight() {
  try {
    // =====================================================
    // SALES
    // =====================================================
    const { data: salesData, error: salesError } =
      await supabase
        .from("sales")
        .select("total_sales, date");

    if (salesError) {
      throw new Error(
        `Sales error: ${salesError.message}`
      );
    }

    const totalSales = (salesData || []).reduce(
      (total, sale) =>
        total + Number(sale.total_sales || 0),
      0
    );

    // =====================================================
    // EXPENSES
    // =====================================================
    const { data: expensesData, error: expensesError } =
      await supabase
        .from("expenses")
        .select("amount");

    if (expensesError) {
      throw new Error(
        `Expenses error: ${expensesError.message}`
      );
    }

    const totalExpenses = (expensesData || []).reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );

    // =====================================================
    // INVENTORY
    // =====================================================
    const { data: inventoryData, error: inventoryError } =
      await supabase
        .from("inventory")
        .select(
          "item_name, quantity_available, reorder_level"
        );

    if (inventoryError) {
      throw new Error(
        `Inventory error: ${inventoryError.message}`
      );
    }

    const totalInventoryItems =
      (inventoryData || []).length;

    const totalStock = (inventoryData || []).reduce(
      (total, item) =>
        total + Number(item.quantity_available || 0),
      0
    );

    const lowStockItems = (inventoryData || [])
      .filter((item) => {
        const quantity =
          Number(item.quantity_available || 0);

        const reorderLevel =
          Number(item.reorder_level || 0);

        return quantity <= reorderLevel;
      })
      .map((item) => item.item_name);

    // =====================================================
    // RESULT
    // =====================================================
    const result = {
      totalSales,
      totalExpenses,
      totalInventoryItems,
      totalStock,
      lowStockCount: lowStockItems.length,
      lowStockItems,
    };

    // =====================================================
    // AI INFORMATIONAL INSIGHT
    // =====================================================
    const prompt = `
You are an informational business analyst for the Co-Associate
of Adrenaline Aqua Water Refilling Station.

The Co-Associate has VIEW-ONLY access.

Use ONLY the CURRENT business data provided below.

CURRENT BUSINESS DATA:
Total recorded sales: ₱${totalSales}
Total recorded expenses: ₱${totalExpenses}
Total inventory items: ${totalInventoryItems}
Total stock quantity: ${totalStock}
Low-stock item count: ${lowStockItems.length}
Low-stock items: ${
      lowStockItems.length > 0
        ? lowStockItems.join(", ")
        : "None"
    }

Write one short informational business insight for the Co-Associate.

STRICT RULES:
- Maximum 2 short sentences.
- The message must be informational or analytical only.
- Describe ONLY the current state of the provided data.
- Do NOT tell the Co-Associate to perform any action.
- Do NOT give recommendations or operational instructions.
- Do NOT use phrases such as "you should", "consider",
  "prioritize", "restock", "reorder", "process",
  or "take action".
- Do NOT say that sales, expenses, stock, or inventory
  increased, decreased, dropped, rose, improved, declined,
  or changed.
- Do NOT describe a trend unless previous-period comparison
  data is explicitly provided.
- Do NOT invent previous values or historical comparisons.
- Do NOT invent sales, expenses, products, quantities,
  predictions, reasons, or business conditions.
- If there are low-stock items, state ONLY that the listed
  items are currently at or below their reorder level.
- Do NOT calculate or describe profit, loss, or net income.
- Do NOT expose customer personal information.
- Do NOT write "AI Insight:", "Alert:", or "Notification:".
- Do NOT mention that you are an AI.
`;

    // =====================================================
    // GENERATE INSIGHT
    // =====================================================
    let insight;

    try {
      insight = (
        await askOllama(prompt)
      ).trim();
    } catch (ollamaError) {
      console.error(
        "Co-Associate Ollama Insight Error:",
        ollamaError
      );

      // Safe informational fallback
      if (lowStockItems.length > 0) {
        insight =
          `Current recorded sales are ₱${totalSales.toLocaleString()} ` +
          `and recorded expenses are ₱${totalExpenses.toLocaleString()}. ` +
          `${lowStockItems.join(", ")} ${
            lowStockItems.length === 1
              ? "is"
              : "are"
          } currently at or below the reorder level.`;
      } else {
        insight =
          `Current recorded sales are ₱${totalSales.toLocaleString()} ` +
          `and recorded expenses are ₱${totalExpenses.toLocaleString()}. ` +
          `There are currently no inventory items at or below their reorder level.`;
      }
    }

    return {
      success: true,
      result,
      insight,
    };
  } catch (error) {
    console.error(
      "Co-Associate Insight Error:",
      error
    );

    throw error;
  }
}

module.exports = {
  generateCoAssociateInsight,
};