const supabase = require("./supabaseClient");
const { askOllama } = require("./ollamaClient");

async function generateOrderInsight() {
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      order_id,
      order_date,
      status,
      total_amount,
      payment_method,
      full_name,
      delivery_date,
      delivery_address,
      order_code,
      order_type,
      user_id,
      created_by
    `)
    .order("order_date", { ascending: true });

  if (error) {
    throw error;
  }

  const records = orders || [];

  const normalize = (value) =>
    String(value || "").trim().toLowerCase();

  const pending = records.filter(
    (item) =>
      normalize(item.status) === "pending"
  );

  const processing = records.filter(
    (item) =>
      normalize(item.status) === "processing"
  );

  const delivered = records.filter(
    (item) =>
      normalize(item.status) === "delivered"
  );

  const cancelled = records.filter(
    (item) =>
      normalize(item.status) === "cancelled" ||
      normalize(item.status) === "canceled"
  );

  const deliveryOrders = records.filter(
    (item) =>
      normalize(item.order_type) === "delivery"
  );

  const pickupOrders = records.filter(
    (item) =>
      normalize(item.order_type) === "pickup"
  );

  const paymentCounts = records.reduce(
    (acc, item) => {
      const method =
        normalize(item.payment_method) || "unknown";

      acc[method] = (acc[method] || 0) + 1;

      return acc;
    },
    {}
  );

  const totalOrderValue = records.reduce(
    (sum, item) =>
      sum + Number(item.total_amount || 0),
    0
  );

  const averageOrderValue =
    records.length > 0
      ? Number(
          (
            totalOrderValue / records.length
          ).toFixed(2)
        )
      : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeOrders = records.filter((item) => {
    const status = normalize(item.status);

    return (
      status === "pending" ||
      status === "processing"
    );
  });

  const overdueOrders = activeOrders.filter(
    (item) => {
      if (!item.delivery_date) return false;

      const deliveryDate = new Date(
        `${item.delivery_date}T00:00:00`
      );

      return deliveryDate < today;
    }
  );

  const totalOrders = records.length;

  const pendingRate =
    totalOrders > 0
      ? Number(
          (
            (pending.length / totalOrders) *
            100
          ).toFixed(2)
        )
      : 0;

  const cancelledRate =
    totalOrders > 0
      ? Number(
          (
            (cancelled.length / totalOrders) *
            100
          ).toFixed(2)
        )
      : 0;

  const deliveredRate =
    totalOrders > 0
      ? Number(
          (
            (delivered.length / totalOrders) *
            100
          ).toFixed(2)
        )
      : 0;

  let analysisStatus = "normal";

  if (overdueOrders.length > 0) {
    analysisStatus = "overdue_orders";
  } else if (pendingRate >= 40) {
    analysisStatus = "high_pending";
  } else if (cancelledRate >= 20) {
    analysisStatus = "high_cancellation";
  }

  const result = {
    status: analysisStatus,

    totalOrders,

    pending: pending.length,

    processing: processing.length,

    delivered: delivered.length,

    cancelled: cancelled.length,

    pendingRate,

    deliveredRate,

    cancelledRate,

    deliveryOrders:
      deliveryOrders.length,

    pickupOrders:
      pickupOrders.length,

    paymentMethods:
      paymentCounts,

    totalOrderValue:
      Number(totalOrderValue.toFixed(2)),

    averageOrderValue,

    overdueOrders:
      overdueOrders.length,

    overdueOrderList:
      overdueOrders.map((item) => ({
        orderCode: item.order_code,
        orderId: item.order_id,
        deliveryDate: item.delivery_date,
        status: item.status,
      })),
  };

  const prompt = `
You are an order operations assistant for
Adrenaline Aqua Water Refilling Station.

Use ONLY the order data below.
Do not invent information or numbers.

Total orders: ${result.totalOrders}
Pending orders: ${result.pending}
Processing orders: ${result.processing}
Delivered orders: ${result.delivered}
Cancelled orders: ${result.cancelled}

Pending rate: ${result.pendingRate}%
Delivered rate: ${result.deliveredRate}%
Cancelled rate: ${result.cancelledRate}%

Delivery orders: ${result.deliveryOrders}
Pickup orders: ${result.pickupOrders}

Overdue active orders: ${result.overdueOrders}

Total order value: ${result.totalOrderValue}
Average order value: ${result.averageOrderValue}

System status: ${result.status}

Write one short professional admin order insight.

Rules:
- Maximum 2 short sentences.
- Explain the most important order issue.
- If there are overdue orders, mention them.
- If pending rate is high, mention the backlog.
- If cancellations are high, mention the cancellation concern.
- If operations look normal, say so briefly.
- Give a practical recommendation only when needed.
- Do not write "AI Insight:", "Notification:", or "Alert:".
- Do not invent reasons for order changes.
- Do not add numbers not provided.
- Do not mention that you are an AI.
`;

  let insightText;

  try {
    insightText =
      (
        await askOllama(prompt)
      ).trim();
  } catch (ollamaError) {
    console.error(
      "Order Ollama Insight Error:",
      ollamaError
    );

    if (result.overdueOrders > 0) {
      insightText =
        `${result.overdueOrders} active order(s) are already past their delivery date. ` +
        `Review these orders and prioritize follow-up.`;
    } else if (result.pendingRate >= 40) {
      insightText =
        `${result.pending} of ${result.totalOrders} orders are still pending. ` +
        `Consider reviewing the current order backlog.`;
    } else if (result.cancelledRate >= 20) {
      insightText =
        `${result.cancelled} order(s) are cancelled, representing ${result.cancelledRate}% of all orders. ` +
        `Review recent cancellations for possible operational issues.`;
    } else {
      insightText =
        "Order activity is currently within a normal range.";
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
  generateOrderInsight,
};