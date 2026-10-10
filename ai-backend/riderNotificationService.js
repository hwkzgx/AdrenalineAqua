const supabase = require("./supabaseClient");
const {
  generateRiderInsight,
} = require("./riderInsightService");

async function generateRiderNotification(userId) {
  // Notification creation disabled across all roles in favor of the dedicated Insights page.
  return {
    notificationCreated: false,
    reason: "AI notifications disabled in favor of dedicated Insights page.",
  };
}

module.exports = {
  generateRiderNotification,
};