const supabase = require("./supabaseClient");
const {
  generateCoAssociateInsight,
} = require("./coAssociateInsightService");

async function generateCoAssociateNotification() {
  try {
    const insightData =
      await generateCoAssociateInsight();

    if (
      !insightData ||
      !insightData.success ||
      !insightData.result
    ) {
      return {
        notificationCreated: false,
        reason:
          "No Co-Associate insight available.",
      };
    }

    const result = insightData.result;

    // Sort para consistent ang state signature
    const lowStockItems = [
      ...(result.lowStockItems || []),
    ].sort();

    // =====================================================
    // CURRENT BUSINESS STATE
    // =====================================================
    const stateSignature = [
      result.totalSales,
      result.totalExpenses,
      result.totalInventoryItems,
      result.totalStock,
      result.lowStockCount,
      lowStockItems.join(",") || "none",
    ].join("|");

    const signatureMarker =
      `[STATE:${stateSignature}]`;

    // =====================================================
    // CHECK LATEST CO-ASSOCIATE AI NOTIFICATION
    // =====================================================
    const {
      data: existing,
      error: checkError,
    } = await supabase
      .from("notifications")
      .select("id, message")
      .eq(
        "target_role",
        "co-associate"
      )
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

    // Same state = huwag gumawa ng duplicate
    if (
      existing &&
      existing.length > 0
    ) {
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
            "No meaningful Co-Associate data change detected.",
          existingNotification:
            existing[0],
        };
      }
    }

    // =====================================================
    // INFORMATIONAL-ONLY MESSAGE
    // =====================================================
    const message =
      `AI Insight: ${insightData.insight.trim()} ` +
      signatureMarker;

    // =====================================================
    // SAVE NOTIFICATION
    // =====================================================
    const {
      data,
      error,
    } = await supabase
      .from("notifications")
      .insert({
        target_role:
          "co-associate",
        message,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        `Co-Associate notification insert error: ${error.message}`
      );
    }

    return {
      notificationCreated: true,
      notification: data,
      insightResult: result,
    };
  } catch (error) {
    console.error(
      "Co-Associate AI Notification Error:",
      error
    );

    throw error;
  }
}

module.exports = {
  generateCoAssociateNotification,
};