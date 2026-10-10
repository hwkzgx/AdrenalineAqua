/**
 * Client-side intelligent fallback insights generator for Adrenaline Aqua
 * Used when network is offline, rate limits are hit, or AI API is temporarily unreachable.
 */

export function generateFallbackInsights(role, metrics = {}, currentUser = null) {
  const isCustomer = role === "customer";
  const isRider = role === "rider";
  const name =
    currentUser?.name ||
    currentUser?.fullName ||
    (isRider ? "Rider" : isCustomer ? "Customer" : "Team");

  if (isCustomer) {
    const avgDays = metrics.avgIntervalDays || 7;
    const daysSince = metrics.daysSinceLastOrder || 0;
    const isDue = daysSince >= avgDays;

    return {
      success: true,
      generatedAt: new Date().toISOString(),
      role: "customer",
      headline: isDue
        ? `Hello, ${name}! Water refill recommended today.`
        : `Hello, ${name}! Your water refill cycle is on track.`,
      highlightBanner: {
        title: isDue ? "Refill Window Open" : "Projected Next Delivery",
        subtitle: `Suggested Next Order: ${metrics.projectedNextOrderDate || "Within 2-3 Days"} (${metrics.topProduct || "5-Gallon Slim"})`,
        statusType: isDue ? "urgent" : "optimal",
      },
      keyMetrics: [
        {
          label: "Hydration Rate",
          value: `~${Math.max(1, Math.round(19 / (avgDays || 7)))} L/day`,
          badge: "Consistent",
          trend: "stable",
        },
        {
          label: "Refill Window",
          value: metrics.projectedNextOrderDate || "In 2-3 Days",
          badge: isDue ? "Due Soon" : "Optimal",
          trend: isDue ? "up" : "stable",
        },
        {
          label: "Water Consumed",
          value: `${(metrics.totalOrders || 0) * 19} Liters`,
          badge: "Total",
          trend: "up",
        },
        {
          label: "Active Bottles",
          value: `${metrics.borrowedContainers || 0} Jugs`,
          badge: "In Hand",
          trend: "stable",
        },
      ],
      insights: [
        {
          title: "Consistent Household Consumption",
          bullets: [
            `Average consumption rate: orders ${metrics.topProduct || "5-gallon water"} every ${avgDays} days.`,
            `Demonstrates regular, healthy household hydration habits.`,
          ],
          category: "Cadence",
          impact: "positive",
        },
        {
          title: "Container Asset Rotation",
          bullets: [
            `Currently holding ${metrics.borrowedContainers || 0} borrowed containers in custody.`,
            `Prompt exchange upon delivery prevents additional deposit fees.`,
          ],
          category: "Logistics",
          impact: "medium",
        },
      ],
      recommendations: [
        {
          title: "Schedule Upcoming Refill",
          bullets: [
            `Place order on or before ${metrics.projectedNextOrderDate || "this weekend"}.`,
            `Select 2+ jugs per order to maintain an active household buffer.`,
          ],
          priority: isDue ? "high" : "medium",
          benefit: "Guarantees uninterrupted pure drinking water for your home.",
        },
        {
          title: "Prepare Empty Containers",
          bullets: [
            `Keep empty 5-gallon jugs near the doorway before delivery arrives.`,
            `Ensures quick 1-minute container handoff with your rider.`,
          ],
          priority: "medium",
          benefit: "Faster rider turnaround and zero container deposit charges.",
        },
      ],
      specializedSection: {
        type: "customer_projection",
        title: "Recommended Refill Timing",
        details: `Based on your average consumption rate of 5-gallon jugs, ordering on or before ${metrics.projectedNextOrderDate || "the scheduled date"} ensures optimal freshness.`,
        actionTip: "Order 2+ containers together to qualify for priority route scheduling.",
      },
    };
  }

  if (isRider) {
    const total = metrics.totalAssigned || 0;
    const delivered = metrics.deliveredCount || 0;
    const active = total - delivered;

    return {
      success: true,
      generatedAt: new Date().toISOString(),
      role: "rider",
      headline:
        delivered > 0
          ? `Good day, Rider ${name}! ${delivered} of ${total} delivery drops completed.`
          : `Good day, Rider ${name}! ${total} active stops ready for fulfillment.`,
      highlightBanner: {
        title: total > 0 ? "Active Delivery Schedule" : "No Active Orders",
        subtitle:
          total > 0
            ? `${active > 0 ? `${active} pending stop(s) queued for your route` : "All assigned stops completed!"}`
            : "Check back when new deliveries are assigned.",
        statusType: "optimal",
      },
      keyMetrics: [
        {
          label: "Assigned Stops",
          value: `${total} Orders`,
          badge: "Today's Route",
          trend: "stable",
        },
        {
          label: "Completed Drops",
          value: `${delivered} Delivered`,
          badge: delivered > 0 ? "Completed" : "In Progress",
          trend: delivered > 0 ? "up" : "stable",
        },
        {
          label: "Route Turnaround",
          value: "~15-20 Mins",
          badge: "Est. per Stop",
          trend: "optimal",
        },
        {
          label: "Bottle Retrieval",
          value: "1:1 Exchange",
          badge: "Active",
          trend: "stable",
        },
      ],
      insights: [
        {
          title: "Active Delivery Schedule",
          bullets: [
            `Total of ${total} delivery orders assigned to your shift today.`,
            "Cluster deliveries by nearby streets or subdivisions to minimize backtracking.",
          ],
          category: "Routing",
          impact: "positive",
        },
        {
          title: "Container Asset Collection",
          bullets: [
            "Ensure 1:1 empty container exchange upon each delivery handoff.",
            "Inspect returned 5-gallon containers for cleanliness and cap seals.",
          ],
          category: "Logistics",
          impact: "medium",
        },
      ],
      recommendations: [
        {
          title: "Cluster Neighborhood Drops",
          bullets: [
            "Group orders located in the same barangay or subdivision before heading out.",
            "Delivers faster turnaround and saves fuel during peak afternoon heat.",
          ],
          priority: "high",
          benefit: "Reduces overall travel time by an estimated 20-30 minutes.",
        },
        {
          title: "Vehicle Jug Balance & Safety",
          bullets: [
            "Secure full 5-gallon slim and round bottles with elastic straps.",
            "Keep heavier round jugs centered over the vehicle axle for optimal balance.",
          ],
          priority: "medium",
          benefit: "Prevents bottle spillage, container damage, and ensures rider safety.",
        },
      ],
      specializedSection: {
        type: "route_efficiency",
        title: "Daily Route Optimization Tip",
        details:
          "Send a quick SMS or app notification 5 minutes before arriving at the drop location so the customer can prepare empty containers and payment.",
        actionTip:
          "Notify customers 5 minutes prior to arrival to reduce wait times at the gate to under 1 minute.",
      },
    };
  }

  // Admin / Staff / Co-Associate (Business-inclined)
  const avgBasket =
    metrics.totalOrdersCount > 0
      ? Math.round((metrics.totalSalesRevenue || 0) / metrics.totalOrdersCount)
      : 0;
  const profitMargin =
    metrics.totalSalesRevenue > 0
      ? Math.round(
          (((metrics.totalSalesRevenue || 0) -
            (metrics.totalExpensesAmount || 0)) /
            metrics.totalSalesRevenue) *
            100
        )
      : 80;

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    role,
    headline: `Welcome back, ${name}! Station operations stable across Hagonoy.`,
    highlightBanner: {
      title: "Revenue & Fulfillment Overview",
      subtitle: `${metrics.lowStockItemsCount > 0 ? `⚠️ ${metrics.lowStockItemsCount} Low Stock Item(s) Need Restocking` : "All Inventory Levels are Healthy"}`,
      statusType: metrics.lowStockItemsCount > 0 ? "warning" : "success",
    },
    keyMetrics: [
      {
        label: "Profit Margin",
        value: `${profitMargin}%`,
        badge: profitMargin >= 70 ? "Healthy" : "Tight",
        trend: "up",
      },
      {
        label: "Avg. Order Basket",
        value: `₱${avgBasket.toLocaleString()}`,
        badge: "Per Customer",
        trend: "stable",
      },
      {
        label: "Daily Sales Pace",
        value: `₱${Math.round((metrics.totalSalesRevenue || 0) / 30).toLocaleString()}/day`,
        badge: "Active",
        trend: "up",
      },
      {
        label: "Stock Safety Buffer",
        value:
          metrics.lowStockItemsCount > 0
            ? `${metrics.lowStockItemsCount} Alert(s)`
            : "Sufficient",
        badge: metrics.lowStockItemsCount > 0 ? "Action Required" : "Optimal",
        trend: metrics.lowStockItemsCount > 0 ? "down" : "stable",
      },
    ],
    insights: [
      {
        title: "Strong Commercial Unit Economics",
        bullets: [
          `Healthy revenue of ₱${(metrics.totalSalesRevenue || 0).toLocaleString()} against minimal recorded expenses.`,
          "Station delivers solid profit margins; primary bottleneck is inventory replenishment rather than demand.",
        ],
        category: "Profitability",
        impact: "positive",
      },
      {
        title: "Inventory Restock Trigger",
        bullets: [
          metrics.lowStockItemsCount > 0
            ? `${metrics.lowStockItemsCount} high-turnover item(s) are near or below safety reorder thresholds.`
            : "Current stock adequately covers projected 7-day demand.",
          "Immediate replenishment recommended before peak weekend rush.",
        ],
        category: "Inventory",
        impact: metrics.lowStockItemsCount > 0 ? "high" : "positive",
      },
    ],
    recommendations: [
      {
        title: "Boost Commercial Refill Packages",
        bullets: [
          "Offer bundle subscriptions or bulk discounts for local offices and stores.",
          "Set up automatic weekly recurring delivery schedules.",
        ],
        priority: "high",
        benefit: "Expands steady monthly recurring revenue by an estimated 15-20%.",
      },
      {
        title: "Pre-Weekend Stock Buffer",
        bullets: [
          "Restock round and slim 5-gallon caps, seals, and purified units on Thursdays.",
          "Pre-fill 30+ units to eliminate bottlenecking during Saturday morning peak.",
        ],
        priority: "high",
        benefit: "Eliminates stockout risks during peak Saturday-Sunday demand.",
      },
    ],
    specializedSection: {
      type: "sales_growth",
      title: "Sales Growth & Expansion Strategy",
      details: "Leverage customer SMS/chat reminders 1 day before their projected refill date to increase repeat order velocity.",
      actionTip: "Coordinate rider route clustering to reduce delivery turnaround by 25%.",
    },
  };
}
