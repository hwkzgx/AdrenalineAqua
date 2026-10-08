const supabase = require("./supabaseClient");
const { askOllama } = require("./ollamaClient");

async function generateDeliveryInsight() {
  const { data: deliveries, error } = await supabase
    .from("delivery_schedule")
    .select(`
      delivery_id,
      delivery_date,
      delivery_status,
      order_id,
      delivery_code,
      assigned_rider,
      assigned_rider_id
    `)
    .order("delivery_date", { ascending: true });

  if (error) {
    throw error;
  }

  const records = deliveries || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDeliveries = records.length;

  const delivered = records.filter(
    (item) =>
      String(item.delivery_status || "").toLowerCase() ===
      "delivered"
  );

  const pending = records.filter(
    (item) =>
      String(item.delivery_status || "").toLowerCase() ===
      "pending"
  );

  const outForDelivery = records.filter(
    (item) =>
      String(item.delivery_status || "").toLowerCase() ===
      "out for delivery"
  );

  const pendingWithoutRider = pending.filter((item) => {
    const riderName = String(
      item.assigned_rider || ""
    ).trim();

    return (
      !riderName ||
      riderName.toLowerCase() === "not assigned"
    );
  });

  const overduePending = pending.filter((item) => {
    if (!item.delivery_date) return false;

    const deliveryDate = new Date(
      `${item.delivery_date}T00:00:00`
    );

    return deliveryDate < today;
  });

  const overdueOutForDelivery = outForDelivery.filter(
    (item) => {
      if (!item.delivery_date) return false;

      const deliveryDate = new Date(
        `${item.delivery_date}T00:00:00`
      );

      return deliveryDate < today;
    }
  );

  const completionRate =
    totalDeliveries > 0
      ? Number(
          (
            (delivered.length / totalDeliveries) *
            100
          ).toFixed(2)
        )
      : 0;

  let analysisStatus = "normal";

  if (
    overduePending.length > 0 ||
    overdueOutForDelivery.length > 0
  ) {
    analysisStatus = "delay_warning";
  } else if (pendingWithoutRider.length > 0) {
    analysisStatus = "rider_assignment_needed";
  } else if (pending.length > delivered.length) {
    analysisStatus = "high_pending";
  }

  const result = {
    status: analysisStatus,

    totalDeliveries,

    delivered: delivered.length,

    pending: pending.length,

    outForDelivery: outForDelivery.length,

    completionRate,

    pendingWithoutRider:
      pendingWithoutRider.length,

    overduePending:
      overduePending.length,

    overdueOutForDelivery:
      overdueOutForDelivery.length,

    pendingWithoutRiderDeliveries:
      pendingWithoutRider.map((item) => ({
        deliveryCode: item.delivery_code,
        deliveryDate: item.delivery_date,
        orderId: item.order_id,
      })),

    overdueDeliveries:
      overduePending.map((item) => ({
        deliveryCode: item.delivery_code,
        deliveryDate: item.delivery_date,
        orderId: item.order_id,
      })),
  };

  const prompt = `
You are a delivery operations assistant for
Adrenaline Aqua Water Refilling Station.

Analyze ONLY the delivery data below.
Do not invent information or numbers.

Total deliveries: ${result.totalDeliveries}
Delivered: ${result.delivered}
Pending: ${result.pending}
Out for Delivery: ${result.outForDelivery}
Completion rate: ${result.completionRate}%
Pending without assigned rider: ${result.pendingWithoutRider}
Past-date pending deliveries: ${result.overduePending}
Past-date Out for Delivery: ${result.overdueOutForDelivery}
System status: ${result.status}

Write one short professional insight for the administrator.

Rules:
- Maximum 2 short sentences.
- Explain the most important delivery issue.
- Give a practical recommendation if there is a problem.
- If operations appear normal, say so briefly.
- Do not write "AI Insight:".
- Do not write "Notification:".
- Do not mention that you are an AI.
- Do not invent dates, counts, riders, percentages, or causes.
`;

  let insight;

  try {
    const ollamaResponse =
      await askOllama(prompt);

    insight = {
      success: true,
      insight: ollamaResponse.trim(),
    };
  } catch (ollamaError) {
    console.error(
      "Delivery Ollama Error:",
      ollamaError
    );

    let fallback =
      `${result.pending} delivery(s) are currently pending.`;

    if (result.overduePending > 0) {
      fallback =
        `${result.overduePending} pending delivery(s) are already past their scheduled delivery date. ` +
        `Review these deliveries and prioritize the necessary action.`;
    } else if (result.pendingWithoutRider > 0) {
      fallback =
        `${result.pendingWithoutRider} pending delivery(s) currently have no assigned rider. ` +
        `Consider assigning riders before their scheduled delivery.`;
    }

    insight = {
      success: false,
      insight: fallback,
    };
  }

  return {
    result,
    insight,
  };
}

module.exports = {
  generateDeliveryInsight,
};