const supabase = require("./supabaseClient");
const {
  generateCustomerInsight,
} = require("./customerInsightService");

async function generateCustomerNotification(userId) {
  // Notification creation disabled across all roles in favor of the dedicated Insights page.
  return {
    notificationCreated: false,
    reason: "AI notifications disabled in favor of dedicated Insights page.",
  };
}

module.exports = {
  generateCustomerNotification,
};