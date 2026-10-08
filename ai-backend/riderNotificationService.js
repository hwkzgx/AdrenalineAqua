const supabase = require("./supabaseClient");
const {
  generateRiderInsight,
} = require("./riderInsightService");

async function generateRiderNotification(userId) {
  try {
    // =========================================================
    // GENERATE CURRENT RIDER INSIGHT
    // =========================================================
    const insightData =
      await generateRiderInsight(userId);

    if (
      !insightData ||
      !insightData.success ||
      !insightData.result
    ) {
      return {
        notificationCreated: false,
        reason: "No rider insight available.",
      };
    }

    const result = insightData.result;

    // =========================================================
    // DON'T CREATE AI NOTIFICATION IF NO DELIVERIES
    // =========================================================
    if (Number(result.totalAssigned || 0) === 0) {
      return {
        notificationCreated: false,
        reason: "Rider has no assigned deliveries.",
      };
    }

    // =========================================================
    // CREATE A SIGNATURE OF CURRENT DELIVERY STATE
    //
    // If these values don't change, we don't create
    // another AI notification.
    // =========================================================
    const stateSignature = [
      result.totalAssigned,
      result.pending,
      result.inProgress,
      result.completed,
      result.nextDeliveryCode || "none",
      result.nextDeliveryDate || "none",
    ].join("|");

    // =========================================================
    // CHECK LATEST RIDER AI NOTIFICATION
    // =========================================================
    const { data: existing, error: checkError } =
      await supabase
        .from("notifications")
        .select("id, message")
        .eq("user_id", userId)
        .eq("target_role", "rider")
        .like(
          "message",
          "AI Insight:%"
        )
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
    // CHECK IF CURRENT STATE WAS ALREADY NOTIFIED
    // =========================================================
    if (existing && existing.length > 0) {
      const latestMessage =
        existing[0].message || "";

      const signatureMarker =
        `[STATE:${stateSignature}]`;

      if (
        latestMessage.includes(signatureMarker)
      ) {
        return {
          notificationCreated: false,
          reason:
            "No meaningful delivery change detected.",
          existingNotification: existing[0],
        };
      }
    }

    // =========================================================
    // BUILD NOTIFICATION MESSAGE
    // =========================================================
    const message =
      `AI Insight: ${insightData.insight.trim()} ` +
      `[STATE:${stateSignature}]`;

    // =========================================================
    // SAVE NOTIFICATION
    // =========================================================
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        target_role: "rider",
        message,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        `Rider notification insert error: ${error.message}`
      );
    }

    return {
      notificationCreated: true,
      notification: data,
      insightResult: result,
    };
  } catch (error) {
    console.error(
      "Rider AI Notification Error:",
      error
    );

    throw error;
  }
}

module.exports = {
  generateRiderNotification,
};