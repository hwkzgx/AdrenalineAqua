import { supabase } from "../supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const GROQ_API_KEY =
  import.meta.env.VITE_GROQ_API_KEY ||
  "";

const GROQ_MODEL = "qwen/qwen3.8-27b";
const GROQ_FALLBACK_MODEL = "openai/gpt-oss-120b";

/**
 * Fetch live data context from Supabase for the given role and user
 */
export async function fetchRoleContext(role, currentUser) {
  const normalizedRole = (role || "").toLowerCase().trim();
  const context = {
    role: normalizedRole,
    timestamp: new Date().toISOString(),
    metrics: {},
    raw: {},
  };

  try {
    if (normalizedRole === "customer") {
      const numericUserId = Number(currentUser?.users_id || currentUser?.id);
      
      let orders = [];
      if (!isNaN(numericUserId) && numericUserId > 0) {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", numericUserId)
          .order("order_date", { ascending: true });
        
        if (!error && data) {
          orders = data;
        } else if (error) {
          console.warn("[AI Insights] Customer orders fetch error by user_id:", error);
        }
      }

      // Fallback: If no orders by user_id and email is present, check by email
      if (orders.length === 0 && currentUser?.email) {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("email", currentUser.email)
          .order("order_date", { ascending: true });
        if (!error && data && data.length > 0) {
          orders = data;
        }
      }

      const orderIds = (orders || []).map((o) => o.order_id).filter(Boolean);

      let orderItems = [];
      if (orderIds.length > 0) {
        const { data: items = [], error: itemsError } = await supabase
          .from("order_items")
          .select("*")
          .in("order_id", orderIds);
        if (!itemsError && items) {
          orderItems = items;
        }
      }

      // Calculate Customer Metrics
      const totalOrders = orders.length;
      const completedOrders = orders.filter(
        (o) => (o.status || "").toLowerCase() === "delivered"
      ).length;

      const totalSpend = orders.reduce(
        (sum, o) => sum + Number(o.total_amount || 0),
        0
      );

      const totalGallons = orderItems.reduce(
        (sum, i) => sum + Number(i.quantity || 1),
        0
      );

      const borrowedContainers =
        orders.reduce(
          (sum, o) => sum + Number(o.borrowed_containers || 0),
          0
        ) || totalGallons;

      // Product distribution
      const productCounts = {};
      orderItems.forEach((item) => {
        const name =
          item.item_name ||
          [item.water_type, item.size_variant].filter(Boolean).join(" ") ||
          "Water Gallon";
        productCounts[name] = (productCounts[name] || 0) + Number(item.quantity || 1);
      });

      const favoriteProducts = Object.entries(productCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Ordering Cadence & Interval
      const orderDates = orders
        .map((o) => (o.order_date ? new Date(o.order_date) : null))
        .filter(Boolean)
        .sort((a, b) => a - b);

      let avgIntervalDays = 0;
      if (orderDates.length >= 2) {
        const intervals = [];
        for (let i = 1; i < orderDates.length; i++) {
          const diffDays = Math.round(
            (orderDates[i] - orderDates[i - 1]) / (1000 * 60 * 60 * 24)
          );
          if (diffDays > 0 && diffDays < 90) intervals.push(diffDays);
        }
        if (intervals.length > 0) {
          avgIntervalDays = Math.round(
            intervals.reduce((a, b) => a + b, 0) / intervals.length
          );
        }
      }

      // Last Order Date
      let daysSinceLastOrder = 0;
      let lastOrderDateStr = null;
      let projectedNextOrderDateStr = null;

      if (orderDates.length > 0) {
        const lastDate = orderDates[orderDates.length - 1];
        lastOrderDateStr = lastDate.toISOString().split("T")[0];
        const now = new Date();
        daysSinceLastOrder = Math.max(
          0,
          Math.round((now - lastDate) / (1000 * 60 * 60 * 24))
        );

        const targetInterval = avgIntervalDays > 0 ? avgIntervalDays : 7;
        const nextOrderDate = new Date(lastDate);
        nextOrderDate.setDate(nextOrderDate.getDate() + targetInterval);
        projectedNextOrderDateStr = nextOrderDate.toISOString().split("T")[0];
      }

      context.metrics = {
        totalOrders,
        completedOrders,
        totalSpend,
        borrowedContainers,
        avgIntervalDays: avgIntervalDays || 7,
        daysSinceLastOrder,
        lastOrderDate: lastOrderDateStr,
        projectedNextOrderDate: projectedNextOrderDateStr,
        favoriteProducts,
        topProduct: favoriteProducts[0]?.name || "5-Gallon Purified",
      };
    } else if (normalizedRole === "rider") {
      const myName = (currentUser?.name || "").trim().toLowerCase();
      const myId = currentUser?.users_id;

      const { data: orders = [] } = await supabase
        .from("orders")
        .select(`
          order_id,
          order_code,
          full_name,
          delivery_address,
          delivery_date,
          status,
          delivery_schedule(
            delivery_code,
            delivery_status,
            assigned_rider,
            assigned_rider_id
          )
        `)
        .eq("order_type", "Delivery");

      const riderOrders = (orders || []).filter((item) => {
        const d = item.delivery_schedule?.[0];
        if (!d) return false;
        if (d.assigned_rider_id != null && myId != null) {
          return String(d.assigned_rider_id) === String(myId);
        }
        const assigned = (d.assigned_rider || "").trim().toLowerCase();
        return assigned !== "" && assigned === myName;
      });

      const totalAssigned = riderOrders.length;
      const deliveredCount = riderOrders.filter((o) => {
        const st = (
          o.delivery_schedule?.[0]?.delivery_status ||
          o.status ||
          ""
        ).toLowerCase();
        return st === "delivered" || st === "completed";
      }).length;

      const pendingCount = riderOrders.filter((o) => {
        const st = (
          o.delivery_schedule?.[0]?.delivery_status ||
          o.status ||
          ""
        ).toLowerCase();
        return st === "pending" || st === "assigned";
      }).length;

      const outForDeliveryCount = riderOrders.filter((o) => {
        const st = (
          o.delivery_schedule?.[0]?.delivery_status ||
          o.status ||
          ""
        ).toLowerCase();
        return st === "out for delivery" || st === "in progress";
      }).length;

      const destinationAreas = Array.from(
        new Set(
          riderOrders
            .map((o) => (o.delivery_address || "").trim())
            .filter(Boolean)
            .map((addr) =>
              addr
                .replace(/,\s*philippines/i, "")
                .replace(/,\s*bulacan/i, "")
                .replace(/,\s*hagonoy/i, "")
                .trim()
            )
        )
      ).slice(0, 5);

      context.metrics = {
        totalAssigned,
        deliveredCount,
        pendingCount,
        outForDeliveryCount,
        completionRate:
          totalAssigned > 0 ? Math.round((deliveredCount / totalAssigned) * 100) : 0,
        destinationAreas,
      };
    } else {
      // Admin / Co-Associate / Staff Context
      const [salesRes, ordersRes, inventoryRes, expensesRes] = await Promise.all([
        supabase.from("sales").select("*").order("date", { ascending: true }),
        supabase.from("orders").select("order_id, status, total_amount, order_date"),
        supabase.from("inventory").select("*"),
        supabase.from("expenses").select("*"),
      ]);

      const sales = salesRes.data || [];
      const orders = ordersRes.data || [];
      const inventory = inventoryRes.data || [];
      const expenses = expensesRes.data || [];

      const totalSalesRevenue = sales.reduce(
        (sum, s) => sum + Number(s.total_sales || 0),
        0
      );

      const totalExpensesAmount = expenses.reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
      );

      const totalOrdersCount = orders.length;
      const deliveredOrdersCount = orders.filter(
        (o) => (o.status || "").toLowerCase() === "delivered"
      ).length;

      const lowStockItems = inventory.filter(
        (i) => Number(i.quantity_available || 0) <= Number(i.reorder_level || 0)
      );

      const totalStockUnits = inventory.reduce(
        (sum, i) => sum + Number(i.quantity_available || 0),
        0
      );

      const avgOrderValue =
        totalOrdersCount > 0
          ? Math.round(totalSalesRevenue / totalOrdersCount)
          : 0;

      const profitMarginPct =
        totalSalesRevenue > 0
          ? Math.round(
              ((totalSalesRevenue - totalExpensesAmount) / totalSalesRevenue) *
                100
            )
          : 0;

      context.metrics = {
        totalSalesRevenue,
        totalExpensesAmount,
        netProfit: totalSalesRevenue - totalExpensesAmount,
        totalOrdersCount,
        deliveredOrdersCount,
        avgOrderValue,
        profitMarginPct,
        orderFulfillmentRate:
          totalOrdersCount > 0
            ? Math.round((deliveredOrdersCount / totalOrdersCount) * 100)
            : 0,
        totalInventoryCount: inventory.length,
        totalStockUnits,
        lowStockItemsCount: lowStockItems.length,
        lowStockProducts: lowStockItems.map((i) => ({
          name: i.item_name,
          stock: i.quantity_available,
          reorderLevel: i.reorder_level,
        })),
        recentSalesRecords: sales.slice(-6).map((s) => ({
          date: s.date,
          amount: Number(s.total_sales || 0),
        })),
      };
    }
  } catch (error) {
    console.error("Error collecting role context:", error);
  }

  return context;
}

/**
 * Format compact, token-efficient metrics summary for prompts
 */
function formatCompactMetrics(role, currentUser, metrics = {}) {
  const name = currentUser?.name || currentUser?.fullName || role;

  if (role === "customer") {
    const {
      totalOrders = 0,
      avgIntervalDays = 7,
      daysSinceLastOrder = 0,
      lastOrderDate = "N/A",
      projectedNextOrderDate = "N/A",
      topProduct = "5-Gallon Purified",
      borrowedContainers = 0,
    } = metrics;
    return `Customer: ${name}. Location: Hagonoy, Bulacan. Orders: ${totalOrders}. Water Habit: orders ${topProduct} every ${avgIntervalDays} days (${daysSinceLastOrder} days since last order on ${lastOrderDate}, suggested next order: ${projectedNextOrderDate}). Jugs at Home: ${borrowedContainers}. Task: Greet ${name} with a concise 1-line headline (strictly max 8-10 words, e.g. "Welcome back, ${name}! Water refill is on track."), provide 2 household consumption observations (2 bullets each), 2 smart timing & bottle care recommendations (2 bullets each with expected benefit), 4 customer overview metrics, and 1 dynamic personalized refill guidance section with a custom pro-tip.`;
  }

  if (role === "rider") {
    const {
      totalAssigned = 0,
      deliveredCount = 0,
      pendingCount = 0,
      outForDeliveryCount = 0,
      completionRate = 0,
      destinationAreas = [],
    } = metrics;
    const active = pendingCount + outForDeliveryCount;
    const stopsText =
      destinationAreas.length > 0
        ? destinationAreas.join(", ")
        : "Hagonoy delivery route";

    return `Rider: ${name}. Base: Hagonoy, Bulacan. Assigned: ${totalAssigned}, Delivered: ${deliveredCount}, Pending: ${active}, Completion: ${completionRate}%. Delivery Stops: ${stopsText}. Task: Greet Rider ${name} with a concise 1-line headline (strictly max 8-10 words, e.g. "Good day, Rider ${name}! 5 active stops in Hagonoy."), give 2 route clustering & delivery pacing observations for these Hagonoy stops (2 bullets each), 2 practical container handling & dispatch recommendations (2 bullets each with benefit), 4 route metrics, and 1 dynamic route efficiency section with a customized pro-tip.`;
  }

  // Admin / Staff / Co-Associate (Business-inclined)
  const {
    totalSalesRevenue = 0,
    totalExpensesAmount = 0,
    profitMarginPct = 0,
    totalOrdersCount = 0,
    deliveredOrdersCount = 0,
    avgOrderValue = 0,
    totalStockUnits = 0,
    lowStockItemsCount = 0,
    lowStockProducts = [],
  } = metrics;
  const lowNames =
    (lowStockProducts || [])
      .map((p) => p.name)
      .filter(Boolean)
      .slice(0, 3)
      .join(", ") || "None";

  return `Role: ${role.toUpperCase()}. User: ${name}. Base: Hagonoy, Bulacan. Rev: ₱${Number(totalSalesRevenue).toLocaleString()}, Exp: ₱${Number(totalExpensesAmount).toLocaleString()}, Margin: ${profitMarginPct}%. Orders: ${totalOrdersCount} (${deliveredOrdersCount} delivered, avg ₱${avgOrderValue}). Stock: ${totalStockUnits} units (Low: ${lowStockItemsCount} [${lowNames}]). Task: Greet ${name} with a short, punchy 1-line headline (strictly max 8-12 words, e.g. "Welcome back, ${name}! Healthy 83% margin across Hagonoy."), identify 2 comprehensive commercial observations (revenue/margin, inventory/cadence - 2 bullets each), 2 actionable growth & operational recommendations with expected outcome benefits (2 bullets each), 4 financial diagnostics, and 1 dynamic specialized strategy section (custom title, details, and actionTip) tailored to current station performance in Hagonoy, Bulacan.`;
}

/**
 * Generate AI Business Insights and Recommendations via Groq API
 */
export async function generateAIInsights(role, currentUser) {
  const context = await fetchRoleContext(role, currentUser);
  const normalizedRole = (role || "").toLowerCase().trim();

  let systemPrompt = "";

  if (normalizedRole === "customer") {
    const customerDisplayName =
      currentUser?.name || currentUser?.fullName || "Valued Customer";
    systemPrompt = `You are the Hydration & Refill Assistant for a household customer at Adrenaline Aqua in Hagonoy, Bulacan.
Audience: Household customer (${customerDisplayName}).
Tone: Friendly, helpful, everyday layman terms. Strictly avoid business jargon (do not mention revenue, sales margins, cadence, ROI, or profitability).
Guidance: Headline MUST be short and punchy (strictly max 8-10 words, e.g. "Welcome back, ${customerDisplayName}! Water refill on track."). Provide practical advice on refill timing, household water habits, returning empty 5-gallon jugs, and ordering convenience.
Output: valid JSON only (no markdown/backticks).
Schema:
{"headline":"Short greeting & status (max 8-10 words, e.g. Welcome back, ${customerDisplayName}! Refill on track.)","highlightBanner":{"title":"Refill Reminder","subtitle":"Suggested order timing","statusType":"optimal|warning|urgent"},"keyMetrics":[{"label":"Refill Habit","value":"Every ${context.metrics.avgIntervalDays || 7} Days","badge":"Consistent","trend":"stable"},{"label":"Refill Window","value":"${context.metrics.projectedNextOrderDate || "In 2-3 Days"}","badge":"Upcoming","trend":"up"},{"label":"Water Consumed","value":"${(context.metrics.totalOrders || 0) * 19} Liters","badge":"Total","trend":"up"},{"label":"Jugs at Home","value":"${context.metrics.borrowedContainers || 0} Jugs","badge":"In Hand","trend":"stable"}],"insights":[{"title":"Observation Title","bullets":["Clear observation on water habit","Helpful takeaway for household hydration"],"category":"Hydration|Refill|Containers","impact":"positive|medium"}],"recommendations":[{"title":"Helpful Tip","bullets":["Actionable tip on when to order next refill","Reminder for staging empty bottles at door"],"priority":"high|medium|low","benefit":"Household convenience or savings"}],"specializedSection":{"type":"customer_projection","title":"Personalized refill guidance title","details":"Personalized recommendation based on the customer's average refill interval and container count","actionTip":"Practical tip on order timing or bundle ordering"}}
Rules: The 'headline' must be strictly max 10 words. Exactly 4 metrics in keyMetrics, exactly 2 distinct insights (2 helpful bullets each), exactly 2 actionable recommendations (2 practical bullets each with benefit), and 1 dynamic specializedSection where title, details, and actionTip are generated uniquely for this customer.`;
  } else if (normalizedRole === "rider") {
    const riderDisplayName = currentUser?.name || "Rider";
    systemPrompt = `You are the Local Route & Delivery Assistant for Adrenaline Aqua in Hagonoy, Bulacan.
Audience: Rider ${riderDisplayName}.
Tone: Everyday layman terms (simple, practical, conversational). Avoid corporate buzzwords.
Guidance: Headline MUST be short and punchy (strictly max 8-10 words, e.g. "Good day, Rider ${riderDisplayName}! 5 active stops in Hagonoy."). Reference actual delivery barangays/streets in Hagonoy from order stops. Give practical tips on grouping nearby drop-offs, quick 1:1 empty container exchanges, vehicle balance, and road safety.
Output: valid JSON only (no markdown/backticks).
Schema:
{"headline":"Short friendly greeting & route status (max 8-10 words, e.g. Good day, Rider ${riderDisplayName}! 5 stops in Hagonoy.)","highlightBanner":{"title":"Status Title","subtitle":"Active route status","statusType":"optimal"},"keyMetrics":[{"label":"Active Drops","value":"${context.metrics.totalAssigned || 0} Orders","badge":"Active Route","trend":"stable"},{"label":"Route Pacing","value":"On Schedule","badge":"Good","trend":"up"},{"label":"Stop Turnaround","value":"~12-15 mins","badge":"Efficient","trend":"stable"},{"label":"Bottle Retrieval","value":"1:1 Exchange","badge":"Active","trend":"up"}],"insights":[{"title":"Route Observation","bullets":["Practical note on stops/barangays in Hagonoy","Operational takeaway for shift pacing"],"category":"Routing|Dispatch|Logistics","impact":"positive|medium"}],"recommendations":[{"title":"Action Tip","bullets":["Clustering step for Hagonoy streets","Container handling and safety tip"],"priority":"high|medium|low","benefit":"Clear time or safety benefit"}],"specializedSection":{"type":"route_efficiency","title":"Dynamic shift & route focus title","details":"Actionable route advice tailored to current stops and streets in Hagonoy","actionTip":"Practical high-impact delivery or safety tip"}}
Rules: The 'headline' must be strictly max 10 words. Exactly 4 metrics in keyMetrics, exactly 2 route insights (2 practical bullets each), exactly 2 actionable recommendations (2 bullets each with benefit), and 1 dynamic specializedSection with customized details and actionTip.`;
  } else {
    // Admin, Staff, Co-Associate (Business-inclined)
    const userDisplayName =
      currentUser?.name || currentUser?.fullName || "Team";
    systemPrompt = `You are the Business Intelligence AI for Adrenaline Aqua Water Refilling Station in Hagonoy, Bulacan.
Audience: ${normalizedRole.toUpperCase()} (${userDisplayName}) - Station Operator/Executive.
Tone: Business-inclined, commercial, executive, analytical. Focus on revenue optimization, profit margins, inventory turnover, customer order cadence, and delivery efficiency across Hagonoy, Bulacan.
Guidance: Headline MUST be very short, concise, and punchy (STRICT LIMIT: max 8-12 words, e.g. "Welcome back, ${userDisplayName}! Healthy 83% margin across Hagonoy station."). NEVER write long compound sentences, multiple clauses, or full paragraphs in the headline. Keep all detailed analysis inside the insights and recommendations sections.
Output: valid JSON only (no markdown/backticks).
Schema:
{"headline":"Short greeting & core status (strictly max 8-12 words, e.g. Welcome back, ${userDisplayName}! Healthy 83% margin in Hagonoy.)","highlightBanner":{"title":"Strategic Focus","subtitle":"Core commercial takeaway","statusType":"optimal|warning|urgent"},"keyMetrics":[{"label":"Diagnostic Name","value":"Formatted Value","badge":"Status","trend":"up|down|stable"}],"insights":[{"title":"Observation Title","bullets":["Commercial finding with figures/₱ in Hagonoy","Operational/margin takeaway and trend analysis"],"category":"Revenue|Inventory|Cadence|Operations","impact":"positive|medium|high"}],"recommendations":[{"title":"Strategic Action","bullets":["Actionable commercial/operational step","Implementation tactic for station growth and efficiency"],"priority":"high|medium|low","benefit":"Expected financial or operational outcome"}],"specializedSection":{"type":"sales_growth","title":"Specific strategic initiative title based on live data","details":"Dynamic, data-driven business strategy tailored to current station metrics in Hagonoy","actionTip":"Concrete high-impact actionable tip for revenue growth or efficiency"}}
Rules: The 'headline' must be strictly max 12 words. Exactly 4 metrics in keyMetrics, exactly 2 comprehensive observations (covering revenue, margin, order cadence, and inventory with 2 bullets each), exactly 2 actionable recommendations (each with 2 bullets and strategic financial or operational benefit), and 1 dynamic specializedSection where the title, details, and actionTip are uniquely generated from the live metrics (e.g., addressing low stock if items are low, or driving weekend promotions, or optimizing delivery routes).`;
  }

  const userPrompt = formatCompactMetrics(
    normalizedRole,
    currentUser,
    context.metrics
  );

  const candidateModels = [
    GROQ_MODEL,
    GROQ_FALLBACK_MODEL,
    "openai/gpt-oss-20b",
  ]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);

  for (const modelName of candidateModels) {
    try {
      const maxTokens = 550;
      console.log(
        `[AI Insights] Requesting insights from model: ${modelName} (max_tokens: ${maxTokens})`
      );

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 429) {
          console.warn(
            `[AI Insights] Rate limit (429) reached on model '${modelName}'. Automatically redirecting to next fallback model...`
          );
        } else {
          console.warn(
            `[AI Insights] Model '${modelName}' returned status ${response.status}: ${errText}. Trying next model...`
          );
        }
        continue; // Automatically failover to next model
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent) {
        console.warn(`[AI Insights] Empty response from model '${modelName}'. Trying next model...`);
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(rawContent);
      } catch (e) {
        const cleaned = (rawContent || "")
          .replace(/^```json\s*/i, "")
          .replace(/```\s*$/, "")
          .trim();
        parsed = JSON.parse(cleaned);
      }

      if (parsed && typeof parsed === "object") {
        console.log(`[AI Insights] Successfully generated insights with model: ${modelName}`);
        const normalized = normalizeInsightsResult(
          parsed,
          normalizedRole,
          context.metrics,
          currentUser
        );

        return {
          success: true,
          generatedAt: new Date().toISOString(),
          role: normalizedRole,
          metricsContext: context.metrics,
          usedModel: modelName,
          ...normalized,
        };
      }
    } catch (modelError) {
      console.warn(`[AI Insights] Network or parsing error on model '${modelName}':`, modelError);
    }
  }

  // Fallback if all API attempts exhausted
  console.warn("[AI Insights] All candidate models exhausted. Using intelligent client-side fallback.");
  return generateFallbackInsights(normalizedRole, context.metrics, currentUser);
}

/**
 * Normalizes and guarantees completeness of AI response (preventing empty recommendations or observations)
 */
function normalizeInsightsResult(parsed, role, metrics, currentUser) {
  if (!parsed || typeof parsed !== "object") {
    return generateFallbackInsights(role, metrics, currentUser);
  }

  const normalized = { ...parsed };

  // 0. Normalize and clean Headline (ensuring punchy, concise length)
  const name =
    currentUser?.name ||
    currentUser?.fullName ||
    (role === "rider" ? "Rider" : role === "customer" ? "Valued Customer" : "Team");

  if (normalized.headline && typeof normalized.headline === "string") {
    let cleanHeadline = normalized.headline.trim();
    const words = cleanHeadline.split(/\s+/);
    if (words.length > 14) {
      // Keep first punchy sentence or clause if the model returned a run-on sentence
      const firstSentence = cleanHeadline.split(/[.!?]\s+/)[0];
      if (firstSentence && firstSentence.split(/\s+/).length <= 14) {
        cleanHeadline = firstSentence.endsWith(".") ? firstSentence : `${firstSentence}.`;
      }
    }
    normalized.headline = cleanHeadline;
  } else {
    normalized.headline =
      role === "customer"
        ? `Welcome back, ${name}! Water refill is on track.`
        : role === "rider"
        ? `Good day, Rider ${name}! Active stops ready for fulfillment.`
        : `Welcome back, ${name}! Station operations stable across Hagonoy.`;
  }

  // 1. Normalize Observations / Insights
  if (!Array.isArray(normalized.insights) || normalized.insights.length === 0) {
    normalized.insights = (
      normalized.observations ||
      normalized.key_observations ||
      normalized.keyObservations ||
      []
    );
  }

  // 2. Normalize Recommendations
  if (!Array.isArray(normalized.recommendations) || normalized.recommendations.length === 0) {
    normalized.recommendations = (
      normalized.smart_recommendations ||
      normalized.smartRecommendations ||
      normalized.action_items ||
      normalized.actionItems ||
      normalized.suggestions ||
      normalized.action_points ||
      normalized.actionPoints ||
      normalized.actions ||
      []
    );
  }

  // If recommendations is still empty, synthesize high-value role-specific recommendations
  if (!Array.isArray(normalized.recommendations) || normalized.recommendations.length === 0) {
    if (role === "rider") {
      normalized.recommendations = [
        {
          title: "Cluster Stops by Barangay / Street",
          bullets: [
            "Group deliveries in the same barangay together before departing the station.",
            "Saves up to 20-30 minutes of backtracking and fuel consumption."
          ],
          priority: "high",
          benefit: "Accelerates route delivery turnaround and lowers transit strain."
        },
        {
          title: "1:1 Container Return Protocol",
          bullets: [
            "Collect an empty 5-gallon jug for every fresh refill handed over.",
            "Inspect cap seals and handle grips before loading onto the delivery vehicle."
          ],
          priority: "medium",
          benefit: "Ensures container inventory balance and smooth station bottle rotation."
        }
      ];
    } else if (role === "customer") {
      const avgDays = metrics?.avgIntervalDays || 7;
      normalized.recommendations = [
        {
          title: "Schedule Upcoming Refill",
          bullets: [
            `Place your refill order every ${avgDays} days to ensure uninterrupted drinking water.`,
            "Order in multi-gallon bundles (2+ jugs) for maximum delivery convenience."
          ],
          priority: "high",
          benefit: "Maintains uninterrupted household hydration buffer."
        },
        {
          title: "Prepare Clean Empty Containers",
          bullets: [
            "Stage empty 5-gallon jugs near the doorway before your rider arrives.",
            "Enables seamless 1-minute container exchanges."
          ],
          priority: "medium",
          benefit: "Faster delivery turnaround and zero bottle deposit fees."
        }
      ];
    } else {
      normalized.recommendations = [
        {
          title: "Dynamic Inventory Replenishment",
          bullets: [
            "Maintain a 20% minimum safety buffer on high-demand purified 5-gallon stock.",
            "Pre-fill standard gallon stock during morning low-traffic hours."
          ],
          priority: "high",
          benefit: "Prevents fulfillment delays during afternoon order surges."
        },
        {
          title: "Route Clustering & Dispatch Optimization",
          bullets: [
            "Batch multi-order deliveries by geographic radius.",
            "Reduces per-drop transit cost and accelerates turnaround."
          ],
          priority: "medium",
          benefit: "Boosts delivery capacity by +15% per shift."
        }
      ];
    }
  }

  // 3. Ensure each recommendation has title, bullets array, and priority
  normalized.recommendations = normalized.recommendations.map((rec) => {
    if (typeof rec === "string") {
      return {
        title: rec,
        bullets: [rec],
        priority: "medium",
        benefit: "",
      };
    }
    const title = rec.title || rec.action || rec.recommendation || rec.name || "Action Point";
    let bullets = [];
    if (Array.isArray(rec.bullets) && rec.bullets.length > 0) {
      bullets = rec.bullets.filter(Boolean);
    } else if (rec.bullets && typeof rec.bullets === "string") {
      bullets = [rec.bullets];
    } else if (rec.action && typeof rec.action === "string") {
      bullets = [rec.action];
    } else if (rec.description && typeof rec.description === "string") {
      bullets = [rec.description];
    } else if (rec.details && typeof rec.details === "string") {
      bullets = [rec.details];
    } else if (rec.text && typeof rec.text === "string") {
      bullets = [rec.text];
    }

    return {
      title,
      bullets: bullets.length > 0 ? bullets : [title],
      priority: (rec.priority || "medium").toLowerCase(),
      benefit: rec.benefit || rec.expected_benefit || rec.outcome || "",
    };
  });

  // 4. Ensure each insight has title, bullets array, and category
  if (Array.isArray(normalized.insights)) {
    normalized.insights = normalized.insights.map((ins) => {
      if (typeof ins === "string") {
        return {
          title: ins,
          bullets: [ins],
          category: "Operations",
          impact: "positive",
        };
      }
      const title = ins.title || ins.observation || ins.headline || "Key Observation";
      let bullets = [];
      if (Array.isArray(ins.bullets) && ins.bullets.length > 0) {
        bullets = ins.bullets.filter(Boolean);
      } else if (ins.description && typeof ins.description === "string") {
        bullets = [ins.description];
      } else if (ins.details && typeof ins.details === "string") {
        bullets = [ins.details];
      } else if (ins.text && typeof ins.text === "string") {
        bullets = [ins.text];
      }

      return {
        title,
        bullets: bullets.length > 0 ? bullets : [title],
        category: ins.category || "Operations",
        impact: (ins.impact || "positive").toLowerCase(),
      };
    });
  }

  // 5. Ensure specializedSection (Strategy / Projection / Pro-Tip) is dynamically extracted from AI
  const spec =
    normalized.specializedSection ||
    normalized.specialized_section ||
    normalized.sales_growth ||
    normalized.growth_strategy ||
    normalized.strategy ||
    normalized.specialized ||
    normalized.pro_tip ||
    normalized.action_plan ||
    {};

  const extractedTitle =
    spec.title ||
    spec.heading ||
    spec.name ||
    (role === "customer"
      ? "Personalized Refill Guidance"
      : role === "rider"
      ? "Daily Route & Safety Strategy"
      : "Commercial Growth & Operational Strategy");

  const extractedDetails =
    spec.details ||
    spec.description ||
    spec.strategy ||
    spec.text ||
    spec.summary ||
    spec.advice ||
    (role === "customer"
      ? `Based on your refill cycle, ordering on or before ${metrics?.projectedNextOrderDate || "your scheduled date"} keeps your household water supply fresh.`
      : role === "rider"
      ? "Group delivery drops in the same barangay to eliminate backtracking and speed up container recovery."
      : metrics?.lowStockItemsCount > 0
      ? `Prioritize immediate restock of ${metrics.lowStockItemsCount} low-inventory item(s) to safeguard peak delivery volume in Hagonoy.`
      : "Target high-volume household clusters with subscription refill reminders to accelerate monthly revenue velocity.");

  const extractedTip =
    spec.actionTip ||
    spec.action_tip ||
    spec.proTip ||
    spec.pro_tip ||
    spec.tip ||
    spec.action ||
    spec.recommendation ||
    (role === "customer"
      ? "Order 2+ containers together for priority scheduling."
      : role === "rider"
      ? "Send a 5-minute arrival notice to reduce wait times at customer drop locations."
      : "Offer bundle discounts to commercial stores and offices to expand repeat order volume.");

  normalized.specializedSection = {
    type:
      spec.type ||
      (role === "customer"
        ? "customer_projection"
        : role === "rider"
        ? "route_efficiency"
        : "sales_growth"),
    title: extractedTitle,
    details: extractedDetails,
    actionTip: String(extractedTip).replace(/^Pro Tip:\s*/i, ""),
  };

  return normalized;
}

/**
 * Intelligent client-side fallback if API is temporarily unreachable
 */
function generateFallbackInsights(role, metrics, currentUser) {
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

/**
 * Sanitize text for standard jsPDF fonts (converts Peso sign, bullet points, smart quotes, etc.)
 */
export function cleanPdfText(input) {
  if (input === null || input === undefined) return "";
  const str = String(input);
  return str
    .replace(/₱/g, "PHP ")
    .replace(/[•●▪]/g, "- ")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r\n/g, "\n")
    .replace(/[^\x00-\x7F]/g, (char) => {
      const map = {
        "…": "...",
        "™": "(TM)",
        "©": "(C)",
        "®": "(R)",
        "°": " deg",
        "±": "+/-",
        "≥": ">=",
        "≤": "<=",
        "×": "x",
        "÷": "/",
        "→": "->",
        "←": "<-",
        "✓": "[OK]",
        "✔": "[OK]",
      };
      return map[char] || "";
    });
}

/**
 * ==========================================
 * EXPORT INSIGHTS TO PDF
 * ==========================================
 */
export const exportInsightsToPDF = (
  insightsResult,
  role = "admin",
  currentUser = null,
  filename = null
) => {
  if (!insightsResult) return;

  const doc = new jsPDF();
  const primaryColor = [2, 69, 122]; // #02457A Brand Blue
  const darkSlate = [30, 41, 59];
  const mutedGray = [100, 116, 139];
  const lightBg = [248, 250, 252];
  const accentBorder = [226, 232, 240];

  const roleName = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Station";
  const userName = cleanPdfText(currentUser?.name || currentUser?.fullName || `${roleName} User`);
  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 1. Top Decorative Bar & Header
  doc.setFillColor(...primaryColor);
  doc.rect(14, 12, 4, 16, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...darkSlate);
  doc.text("ADRENALINE AQUA WATER REFILLING STATION", 22, 19);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...mutedGray);
  doc.text(
    role === "customer"
      ? "Personal Hydration Analytics & Refill Strategy Report"
      : "AI Business Intelligence & Executive Operational Briefing",
    22,
    25
  );

  // Meta on Right
  doc.setFontSize(8.5);
  doc.text(`Date: ${reportDate}`, 196, 18, { align: "right" });
  doc.text(`Target: ${roleName} (${userName})`, 196, 24, { align: "right" });

  // Divider line
  doc.setDrawColor(...accentBorder);
  doc.setLineWidth(0.4);
  doc.line(14, 32, 196, 32);

  // 2. Executive Headline Box (Dynamic Height)
  let currentY = 38;
  const headlineText = cleanPdfText(insightsResult.headline || "Operational Summary");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  const headlineLines = doc.splitTextToSize(headlineText, 170);
  const headlineHeight = headlineLines.length * 4.8;
  const briefingBoxHeight = 10 + headlineHeight + 2;

  doc.setFillColor(...lightBg);
  doc.setDrawColor(...accentBorder);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, currentY, 182, briefingBoxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text("EXECUTIVE BRIEFING", 19, currentY + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...darkSlate);
  doc.text(headlineLines, 19, currentY + 12);

  currentY += briefingBoxHeight + 6;

  // 3. Highlight Callout Box (Dynamic Height)
  if (insightsResult.highlightBanner) {
    const bannerTitle = cleanPdfText(insightsResult.highlightBanner.title || "Key Focus");
    const bannerSubtitle = cleanPdfText(insightsResult.highlightBanner.subtitle || "");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const bannerSubLines = doc.splitTextToSize(bannerSubtitle, 170);
    const bannerSubHeight = bannerSubLines.length * 4.2;
    const bannerBoxHeight = 9 + bannerSubHeight + 3;

    doc.setFillColor(239, 246, 255); // #eff6ff
    doc.setDrawColor(191, 219, 254);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, currentY, 182, bannerBoxHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(2, 69, 122);
    doc.text(`KEY FOCUS: ${bannerTitle}`, 19, currentY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(bannerSubLines, 19, currentY + 11);

    currentY += bannerBoxHeight + 6;
  }

  // 4. Performance Diagnostics Table
  const metricsRows = (insightsResult.keyMetrics || []).map((m) => [
    cleanPdfText(m.label || "-"),
    cleanPdfText(m.value || "-"),
    cleanPdfText(m.badge || "-"),
    cleanPdfText(m.trend?.toUpperCase() || "STABLE"),
  ]);

  const overviewHeader =
    role === "rider"
      ? "Riding Overview Metric"
      : role === "customer"
      ? "Customer Overview Metric"
      : "Business Overview Metric";

  if (metricsRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [[overviewHeader, "Current Value", "Classification", "Trend"]],
      body: metricsRows,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3.5,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      bodyStyles: {
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: "bold" },
        1: { cellWidth: 45 },
        2: { cellWidth: 50 },
        3: { cellWidth: 32 },
      },
      margin: { left: 14, right: 14 },
    });
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 5. Key Observations Table (Clean bulleted format, left-aligned)
  const observationsRows = (insightsResult.insights || []).map((item) => {
    let bulletsText = "";
    if (Array.isArray(item.bullets) && item.bullets.length > 0) {
      bulletsText = item.bullets
        .filter(Boolean)
        .map((b) => `- ${cleanPdfText(b)}`)
        .join("\n");
    } else if (item.description) {
      bulletsText = cleanPdfText(item.description);
    }
    return [
      cleanPdfText(item.category || "General"),
      cleanPdfText(item.title || "Observation"),
      bulletsText || "-",
      cleanPdfText(item.impact?.toUpperCase() || "POSITIVE"),
    ];
  });

  if (observationsRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [["Category", "Key Observation", "Diagnostic Takeaways", "Impact"]],
      body: observationsRows,
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3.5,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      bodyStyles: {
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 42, fontStyle: "bold" },
        2: { cellWidth: 90 },
        3: { cellWidth: 24 },
      },
      margin: { left: 14, right: 14 },
    });
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 6. Actionable Recommendations Table (Left-aligned)
  const recommendationsRows = (insightsResult.recommendations || []).map((item) => {
    let actionsText = "";
    if (Array.isArray(item.bullets) && item.bullets.length > 0) {
      actionsText = item.bullets
        .filter(Boolean)
        .map((b) => `- ${cleanPdfText(b)}`)
        .join("\n");
    } else if (item.action) {
      actionsText = cleanPdfText(item.action);
    }
    return [
      cleanPdfText(item.priority?.toUpperCase() || "MEDIUM"),
      cleanPdfText(item.title || "Strategy"),
      actionsText || "-",
      cleanPdfText(item.benefit || "-"),
    ];
  });

  if (recommendationsRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [["Priority", "Action Plan", "Operational Steps", "Expected Outcome"]],
      body: recommendationsRows,
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3.5,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      bodyStyles: {
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: "bold" },
        1: { cellWidth: 44, fontStyle: "bold" },
        2: { cellWidth: 64 },
        3: { cellWidth: 50 },
      },
      margin: { left: 14, right: 14 },
    });
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 7. Projections / Growth Strategy (Compact & Sleek Dynamic Box)
  if (insightsResult.specializedSection) {
    const titleText = cleanPdfText(
      insightsResult.specializedSection.title || "Strategic Blueprint"
    );
    const detailsText = cleanPdfText(
      insightsResult.specializedSection.details || ""
    );
    const tipRaw = insightsResult.specializedSection.actionTip
      ? `Pro Tip: ${insightsResult.specializedSection.actionTip.replace(/^Pro Tip:\s*/i, "")}`
      : "";
    const tipText = cleanPdfText(tipRaw);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const detailsLines = doc.splitTextToSize(detailsText, 172);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const tipLines = tipText ? doc.splitTextToSize(tipText, 172) : [];

    const detailsHeight = detailsLines.length * 3.8;
    const tipHeight = tipLines.length > 0 ? tipLines.length * 3.8 + 2 : 0;
    const boxHeight = 5.5 + 3.5 + detailsHeight + tipHeight + 3;

    // Check if box fits on current page
    if (currentY + boxHeight > 275) {
      doc.addPage();
      currentY = 20;
    }

    // Draw container card
    doc.setFillColor(...lightBg);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, currentY, 182, boxHeight, 2, 2, "FD");

    // Title
    let innerY = currentY + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text(titleText, 18, innerY);

    // Details paragraph
    innerY += 4.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(...darkSlate);
    doc.text(detailsLines, 18, innerY);

    // Action Tip
    if (tipLines.length > 0) {
      innerY += detailsHeight + 1.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(2, 69, 122);
      doc.text(tipLines, 18, innerY);
    }

    currentY += boxHeight + 6;
  }

  // Footer on all pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedGray);
    doc.text(
      `Adrenaline Aqua Refilling Station • Performance & Insights Report • Page ${i} of ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
  }

  const defaultFilename =
    filename ||
    `Adrenaline-Aqua-Insights-${role}-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(defaultFilename);
};
