const supabase = require("./supabaseClient");

const {
  generateInventoryForecastNotifications,
} = require("./aiNotificationService");

let processing = false;
let rerunRequested = false;

async function runForecastJob() {
  // AI notification triggers have been removed in favor of the dedicated Insights page.
  return;
}

function startOrderEventListener() {
  console.log(
    "Order event listener started."
  );

  const channel = supabase
    .channel("backend-order-events")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
      },
      async (payload) => {
        try {
          const oldOrder = payload.old;
          const newOrder = payload.new;

          if (!newOrder) {
            return;
          }

          const oldStatus = String(
            oldOrder?.status || ""
          )
            .trim()
            .toLowerCase();

          const newStatus = String(
            newOrder.status || ""
          )
            .trim()
            .toLowerCase();

          // Only trigger when an order
          // changes TO Delivered.
          if (
            newStatus !== "delivered" ||
            oldStatus === "delivered"
          ) {
            return;
          }

          console.log(
            `Order ${
              newOrder.order_code ||
              newOrder.order_id
            } delivered.`
          );

          await runForecastJob();
        } catch (error) {
          console.error(
            "Order event processing error:",
            error
          );
        }
      }
    )
    .subscribe((status, error) => {
      console.log(
        "Order listener subscription status:",
        status
      );

      if (error) {
        console.error(
          "Order listener subscription error:",
          error
        );
      }

      if (status === "SUBSCRIBED") {
        console.log(
          "Listening for delivered orders."
        );
      }
    });

  return channel;
}

module.exports = {
  startOrderEventListener,
};