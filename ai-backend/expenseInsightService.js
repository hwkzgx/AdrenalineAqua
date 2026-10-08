const supabase = require("./supabaseClient");
const { askOllama } = require("./ollamaClient");

async function generateExpenseInsight() {
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "expenses_id, date, category, description, amount, expenses_code"
    )
    .order("date", { ascending: true });

  if (error) {
    throw new Error(
      `Expense data error: ${error.message}`
    );
  }

  const expenses = (data || [])
    .filter(
      (item) =>
        item.date &&
        item.amount !== null
    )
    .map((item) => ({
      ...item,
      amount: Number(item.amount || 0),
    }));

  if (expenses.length === 0) {
    return {
      result: {
        status: "no_data",
        recordCount: 0,
        trend: "unknown",
        trendPercentage: null,
        unusualExpense: false,
        latestExpense: null,
        averageExpense: null,
      },

      insight: {
        success: true,
        insight:
          "No expense history is available yet.",
      },
    };
  }

  const latest =
    expenses[expenses.length - 1];

  const previous =
    expenses.length >= 2
      ? expenses[expenses.length - 2]
      : null;

  let trend = "insufficient_data";
  let trendPercentage = null;

  if (previous) {
    const latestAmount =
      Number(latest.amount || 0);

    const previousAmount =
      Number(previous.amount || 0);

    if (
      previousAmount === 0 &&
      latestAmount === 0
    ) {
      trend = "stable";
      trendPercentage = 0;
    } else if (
      previousAmount === 0 &&
      latestAmount > 0
    ) {
      trend = "increasing";
    } else {
      const change =
        (
          (latestAmount - previousAmount) /
          previousAmount
        ) * 100;

      trendPercentage =
        Number(change.toFixed(2));

      if (Math.abs(change) < 10) {
        trend = "stable";
      } else if (change > 0) {
        trend = "increasing";
      } else {
        trend = "decreasing";
      }
    }
  }

  let averageExpense = null;
  let unusualExpense = false;

  if (expenses.length >= 3) {
    const previousExpenses =
      expenses.slice(0, -1);

    const totalPrevious =
      previousExpenses.reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      );

    averageExpense =
      totalPrevious /
      previousExpenses.length;

    unusualExpense =
      Number(latest.amount) >
      averageExpense * 1.5;
  }

  let status = "ready";

  if (expenses.length < 3) {
    status = "insufficient_data";
  }

  const result = {
    status,

    recordCount:
      expenses.length,

    minimumRecordsForAnalysis: 3,

    latestExpense:
      latest.amount,

    latestExpenseDate:
      latest.date,

    latestCategory:
      latest.category,

    latestDescription:
      latest.description,

    previousExpense:
      previous
        ? previous.amount
        : null,

    previousExpenseDate:
      previous
        ? previous.date
        : null,

    trend,

    trendPercentage,

    averageExpense:
      averageExpense !== null
        ? Number(
            averageExpense.toFixed(2)
          )
        : null,

    unusualExpense,
  };

  let insightText;

  if (status === "insufficient_data") {
    insightText =
      `There are currently only ${expenses.length} expense record(s). ` +
      `More expense history is needed before a reliable expense trend or unusual spending pattern can be identified.`;
  } else {
    const prompt = `
You are an expense analysis assistant for Adrenaline Aqua Water Refilling Station.

Use ONLY the data below.
Do not invent or change any numbers.

Expense records available:
${result.recordCount}

Latest expense:
${result.latestExpense}

Latest expense date:
${result.latestExpenseDate}

Expense category:
${result.latestCategory}

Expense description:
${result.latestDescription}

Previous expense:
${result.previousExpense}

Expense trend:
${result.trend}

Trend percentage:
${result.trendPercentage}

Average previous expense:
${result.averageExpense}

Unusual expense detected:
${result.unusualExpense}

Write one short professional admin expense insight.

Rules:
- Maximum 2 short sentences.
- Do not write "AI Insight:", "Notification:", or "Alert:".
- If unusualExpense is true, clearly mention that the latest expense is unusually high compared with previous expenses.
- If trend is increasing, mention that expenses increased.
- If trend is decreasing, mention that expenses decreased.
- If trend is stable, mention that expenses remained relatively stable.
- Do not invent a reason why expenses changed.
- Do not add numbers not provided.
- Do not mention that you are an AI.
`;

    try {
      const ollamaResponse =
        await askOllama(prompt);

      insightText =
        ollamaResponse.trim();
    } catch (ollamaError) {
      console.error(
        "Expense Ollama Insight Error:",
        ollamaError
      );

      if (unusualExpense) {
        insightText =
          `The latest expense of ₱${Number(
            latest.amount
          ).toLocaleString()} is unusually high compared with previous expenses.`;
      } else {
        insightText =
          `The current expense trend is ${trend}.`;
      }
    }
  }

  return {
    result,
    insight: {
      success: true,
      insight: insightText,
    },
  };
}

module.exports = {
  generateExpenseInsight,
};