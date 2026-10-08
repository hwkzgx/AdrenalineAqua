const supabase = require("./supabaseClient");
const {
  generateStaffInsight,
} = require("./staffInsightService");

async function generateStaffNotification() {
  try {
    // =========================================================
    // GENERATE CURRENT STAFF INSIGHT
    // =========================================================
    const insightData =
      await generateStaffInsight();

    if (
      !insightData ||
      !insightData.success ||
      !insightData.result
    ) {
      return {
        notificationCreated: false,
        reason: "No staff insight available.",
      };
    }

    const result = insightData.result;

    // =========================================================
    // CREATE STATE SIGNATURE
    // Used to detect meaningful operational changes
    // =========================================================
    const lowStockItems = [
      ...(result.lowStockItems || []),
    ].sort();

    const stateSignature = [
      result.pendingOrders,
      result.pendingDeliveries,
      result.lowStockCount,
      lowStockItems.join(",") || "none",
    ].join("|");

    const signatureMarker =
      `[STATE:${stateSignature}]`;

    // =========================================================
    // CHECK LATEST STAFF AI NOTIFICATION
    // =========================================================
    const { data: existing, error: checkError } =
      await supabase
        .from("notifications")
        .select("id, message")
        .eq("target_role", "staff")
        .like("message", "AI Insight:%")
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

    if (checkError) {
      throw new Error(
        `Notification check error: ${checkError.message}`
      );
    }

    // =========================================================
    // DON'T CREATE DUPLICATE IF STATE DID NOT CHANGE
    // =========================================================
    if (existing && existing.length > 0) {
      const latestMessage =
        existing[0].message || "";

      if (
        latestMessage.includes(
          signatureMarker
        )
      ) {
        return {
          notificationCreated: false,
          reason:
            "No meaningful staff operational change detected.",
          existingNotification:
            existing[0],
        };
      }
    }

    // =========================================================
    // CREATE STAFF AI NOTIFICATION
    // =========================================================
    const message =
      `AI Insight: ${insightData.insight.trim()} ` +
      signatureMarker;

    const { data, error } =
      await supabase
        .from("notifications")
        .insert({
          target_role: "staff",
          message,
          is_read: false,
        })
        .select()
        .single();

    if (error) {
      throw new Error(
        `Staff notification insert error: ${error.message}`
      );
    }

    return {
      notificationCreated: true,
      notification: data,
      insightResult: result,
    };
  } catch (error) {
    console.error(
      "Staff AI Notification Error:",
      error
    );

    throw error;
  }
}

module.exports = {
  generateStaffNotification,
};