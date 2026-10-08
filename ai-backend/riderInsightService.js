const supabase = require("./supabaseClient");
const { askOllama } = require("./ollamaClient");

async function generateRiderInsight(userId) {
  try {
    // =========================================================
    // GET RIDER INFORMATION
    // =========================================================
    const { data: rider, error: riderError } =
      await supabase
        .from("users")
        .select("users_id, name")
        .eq("users_id", userId)
        .single();

    if (riderError) {
      throw new Error(
        `Rider error: ${riderError.message}`
      );
    }

    if (!rider) {
      throw new Error("Rider not found.");
    }

    const riderName = (rider.name || "")
      .trim()
      .toLowerCase();

    // =========================================================
    // GET DELIVERY SCHEDULE
    // =========================================================
    const { data: deliveries, error: deliveryError } =
      await supabase
        .from("delivery_schedule")
        .select(`
          delivery_id,
          delivery_code,
          delivery_status,
          delivery_date,
          assigned_rider,
          assigned_rider_id
        `)
        .order("delivery_date", { ascending: true });

    if (deliveryError) {
      throw new Error(
        `Delivery error: ${deliveryError.message}`
      );
    }

    // =========================================================
    // GET ONLY THIS RIDER'S DELIVERIES
    //
    // Priority:
    // 1. assigned_rider_id
    // 2. old records -> exact assigned_rider name
    // =========================================================
    const riderDeliveries = (deliveries || []).filter(
      (delivery) => {
        // NEW RECORDS: use rider ID
        if (delivery.assigned_rider_id != null) {
          return (
            String(delivery.assigned_rider_id) ===
            String(userId)
          );
        }

        // OLD RECORDS: fallback to rider name
        const assignedName = (
          delivery.assigned_rider || ""
        )
          .trim()
          .toLowerCase();

        return (
          assignedName !== "" &&
          assignedName === riderName
        );
      }
    );

    // =========================================================
    // COUNT DELIVERY STATUS
    // =========================================================
    const pending = riderDeliveries.filter(
      (delivery) =>
        (delivery.delivery_status || "")
          .toLowerCase() === "pending"
    ).length;

    const inProgress = riderDeliveries.filter(
      (delivery) => {
        const status = (
          delivery.delivery_status || ""
        ).toLowerCase();

        return (
          status === "out for delivery" ||
          status === "in progress"
        );
      }
    ).length;

    const completed = riderDeliveries.filter(
      (delivery) => {
        const status = (
          delivery.delivery_status || ""
        ).toLowerCase();

        return (
          status === "completed" ||
          status === "delivered"
        );
      }
    ).length;

    const totalAssigned = riderDeliveries.length;

    // =========================================================
    // FIND NEXT ACTIVE DELIVERY
    // =========================================================
    const nextDelivery = riderDeliveries.find(
      (delivery) => {
        const status = (
          delivery.delivery_status || ""
        ).toLowerCase();

        return (
          status === "pending" ||
          status === "out for delivery" ||
          status === "in progress"
        );
      }
    );

    const result = {
      totalAssigned,
      pending,
      inProgress,
      completed,
      nextDeliveryCode:
        nextDelivery?.delivery_code || null,
      nextDeliveryDate:
        nextDelivery?.delivery_date || null,
    };

    // =========================================================
    // NO ASSIGNED DELIVERIES
    // =========================================================
    if (totalAssigned === 0) {
      return {
        success: true,
        result,
        insight:
          "You currently have no assigned deliveries.",
      };
    }

    // =========================================================
    // OLLAMA RIDER INSIGHT
    // =========================================================
    const prompt = `
You are a delivery assistant for a rider of Adrenaline Aqua Water Refilling Station.

Use ONLY the rider delivery data below.

RIDER DELIVERY DATA:
Total assigned deliveries: ${result.totalAssigned}
Pending deliveries: ${result.pending}
Deliveries in progress: ${result.inProgress}
Completed deliveries: ${result.completed}
Next active delivery code: ${result.nextDeliveryCode || "None"}
Next delivery date: ${result.nextDeliveryDate || "None"}

Write one short and practical delivery insight for the rider.

STRICT RULES:
- Maximum 2 short sentences.
- Use ONLY the data provided above.
- Do NOT invent delivery addresses.
- Do NOT invent customer names.
- Do NOT invent delivery times.
- Do NOT invent traffic conditions.
- Do NOT invent routes or travel times.
- Do NOT invent additional deliveries.
- Do NOT expose sales, expenses, inventory, or other internal business information.
- You may mention the number of pending or in-progress deliveries.
- You may mention the next delivery code if one is provided.
- If there is an active delivery, suggest prioritizing the active delivery before pending deliveries.
- If there are only pending deliveries, suggest reviewing the assigned deliveries before starting.
- If all deliveries are completed, acknowledge that the assigned deliveries are completed.
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
        "Rider Ollama Insight Error:",
        ollamaError
      );

      // =======================================================
      // SAFE FALLBACK
      // =======================================================
      if (inProgress > 0) {
        insight =
          `You currently have ${inProgress} delivery or deliveries in progress and ${pending} pending. ` +
          `Prioritize your active delivery before proceeding to the remaining assigned deliveries.`;
      } else if (pending > 0) {
        insight =
          `You currently have ${pending} pending delivery or deliveries. ` +
          `Review your assigned deliveries before starting your next delivery.`;
      } else {
        insight =
          "Your currently assigned deliveries have been completed.";
      }
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
      "Rider Insight Error:",
      error
    );

    throw error;
  }
}

module.exports = {
  generateRiderInsight,
};