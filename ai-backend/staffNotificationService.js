const supabase = require("./supabaseClient");
const {
  generateStaffInsight,
} = require("./staffInsightService");

async function generateStaffNotification() {
  // Notification creation disabled across all roles in favor of the dedicated Insights page.
  return {
    notificationCreated: false,
    reason: "AI notifications disabled in favor of dedicated Insights page.",
  };
}

module.exports = {
  generateStaffNotification,
};