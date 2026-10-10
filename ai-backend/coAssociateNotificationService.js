const supabase = require("./supabaseClient");
const {
  generateCoAssociateInsight,
} = require("./coAssociateInsightService");

async function generateCoAssociateNotification() {
  // Notification creation disabled across all roles in favor of the dedicated Insights page.
  return {
    notificationCreated: false,
    reason: "AI notifications disabled in favor of dedicated Insights page.",
  };
}

module.exports = {
  generateCoAssociateNotification,
};