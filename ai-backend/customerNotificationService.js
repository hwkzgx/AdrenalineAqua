const supabase = require("./supabaseClient");
const {
  generateCustomerInsight,
} = require("./customerInsightService");

async function generateCustomerNotification(userId) {
  try {
    // =========================================================
    // GENERATE CUSTOMER AI INSIGHT
    // =========================================================
    const insightData =
      await generateCustomerInsight(userId);

    if (
      !insightData ||
      !insightData.success ||
      !insightData.insight
    ) {
      return {
        notificationCreated: false,
        reason: "No customer insight available.",
      };
    }

    // If customer has no order history yet,
    // don't create an AI notification.
    if (
      !insightData.result ||
      Number(insightData.result.totalOrders || 0) === 0
    ) {
      return {
        notificationCreated: false,
        reason: "Customer has no order history.",
      };
    }

    const message =
      `AI Insight: ${insightData.insight.trim()}`;

    // =========================================================
    // CHECK EXISTING UNREAD AI INSIGHT
    // Prevent duplicate notifications
    // =========================================================
    const { data: existing, error: checkError } =
      await supabase
        .from("notifications")
        .select("id, message")
        .eq("user_id", userId)
        .eq("is_read", false)
        .ilike("message", "AI Insight:%")
        .limit(1);

    if (checkError) {
      throw new Error(
        `Notification check error: ${checkError.message}`
      );
    }

    // Customer already has an unread AI insight
    if (existing && existing.length > 0) {
      return {
        notificationCreated: false,
        reason:
          "Customer already has an unread AI insight.",
        existingNotification: existing[0],
      };
    }

    // =========================================================
    // SAVE TO NOTIFICATIONS TABLE
    // =========================================================
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        target_role: "customer",
        message,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        `Customer notification insert error: ${error.message}`
      );
    }

    return {
      notificationCreated: true,
      notification: data,
      insightResult: insightData.result,
    };
  } catch (error) {
    console.error(
      "Customer AI Notification Error:",
      error
    );

    throw error;
  }
}

module.exports = {
  generateCustomerNotification,
};