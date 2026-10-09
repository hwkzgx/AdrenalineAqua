import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  RefreshCw,
  RotateCcw,
  Download,
  Check,
  TrendingUp,
  TrendingDown,
  Calendar,
  CalendarDays,
  Package,
  ShoppingCart,
  Lightbulb,
  AlertCircle,
  Clock,
  ArrowRight,
  Zap,
  DollarSign,
  Truck,
  Award,
  AlertTriangle,
  CheckCircle2,
  Activity,
  CircleDollarSign,
} from "lucide-react";
import {
  fetchRoleContext,
  generateAIInsights,
  exportInsightsToPDF,
} from "../../services/aiInsightsService";
import "./insights-view.css";

// Helper to get storage key
const getStorageKey = (role, user, prefix) => {
  const userIdentifier = user?.users_id || user?.id || user?.user_id || "default";
  return `${prefix}_${(role || "").toLowerCase()}_${userIdentifier}`;
};

export default function InsightsView({ role = "customer", customTitle }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  // Pre-load context synchronously from cache so there is ZERO 0-state flashing
  const [contextData, setContextData] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const key = getStorageKey(role, user, "insights_ctx");
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loadingContext, setLoadingContext] = useState(!contextData);
  const [generating, setGenerating] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [error, setError] = useState(null);

  // 30-Second Refresh Cooldown state
  const [cooldown, setCooldown] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const key = getStorageKey(role, user, "insights_cooldown");
      const lastGen = sessionStorage.getItem(key);
      if (lastGen) {
        const elapsed = (Date.now() - parseInt(lastGen, 10)) / 1000;
        if (elapsed < 30) {
          return Math.ceil(30 - elapsed);
        }
      }
    } catch {
      // ignore
    }
    return 0;
  });

  // Countdown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  // Pre-load insights result from session cache if generated during active session
  const [insightsResult, setInsightsResult] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const key = getStorageKey(role, user, "insights_res");
      // Clean legacy localStorage keys so fresh logins always start empty
      localStorage.removeItem(key);
      const cached = sessionStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Load / refresh live data in background
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    setCurrentUser(user);

    let isMounted = true;

    const loadContext = async () => {
      try {
        const ctx = await fetchRoleContext(role, user);
        if (isMounted) {
          setContextData(ctx);
          // Persist to cache
          try {
            const key = getStorageKey(role, user, "insights_ctx");
            localStorage.setItem(key, JSON.stringify(ctx));
          } catch (e) {
            console.warn("Storage write error:", e);
          }
        }
      } catch (err) {
        console.error("Context fetch error:", err);
      } finally {
        if (isMounted) {
          setLoadingContext(false);
        }
      }
    };

    loadContext();

    return () => {
      isMounted = false;
    };
  }, [role]);

  // Handle AI Insights Generation
  const handleGenerate = async () => {
    if (generating || cooldown > 0) return;
    setGenerating(true);
    setError(null);

    try {
      const result = await generateAIInsights(role, currentUser);
      if (result && result.success) {
        setInsightsResult(result);
        const now = Date.now();
        setCooldown(30);
        // Persist result to session cache
        try {
          const key = getStorageKey(role, currentUser, "insights_res");
          sessionStorage.setItem(key, JSON.stringify(result));
          localStorage.removeItem(key);
          const cooldownKey = getStorageKey(role, currentUser, "insights_cooldown");
          sessionStorage.setItem(cooldownKey, now.toString());
        } catch (e) {
          console.warn("Storage write error:", e);
        }
      } else {
        throw new Error(result?.error || "Failed to generate AI insights.");
      }
    } catch (err) {
      console.error("Generate error:", err);
      setError("Unable to generate insights right now. Please check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Reset insights back to empty state
  const handleReset = () => {
    if (generating || cooldown > 0) return;
    setInsightsResult(null);
    setCooldown(0);
    try {
      const key = getStorageKey(role, currentUser, "insights_res");
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
      const cooldownKey = getStorageKey(role, currentUser, "insights_cooldown");
      sessionStorage.removeItem(cooldownKey);
    } catch (e) {
      console.warn("Storage remove error:", e);
    }
  };

  // Helper to extract bullets from an insight/recommendation item
  const getBulletPoints = (item, defaultField) => {
    if (!item) return [];
    if (typeof item === "string") return [item];

    if (Array.isArray(item.bullets) && item.bullets.length > 0) {
      return item.bullets.filter(Boolean);
    }

    const text =
      item[defaultField] ||
      item.action ||
      item.description ||
      item.details ||
      item.text ||
      item.tip ||
      item.recommendation ||
      item.title;

    if (!text || typeof text !== "string") return [];

    if (text.includes("\n") || text.includes("•")) {
      return text
        .split(/[\n•]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return sentences.length > 0 ? sentences : [text];
  };

  // Semantic icon configuration for diagnostic cards
  const getDiagnosticIconConfig = (item) => {
    const label = (item?.label || "").toLowerCase();
    const value = (item?.value || "").toLowerCase();
    const badge = (item?.badge || "").toLowerCase();
    const trend = (item?.trend || "").toLowerCase();

    // 1. Drops / Orders / Deliveries / Stops
    if (
      label.includes("drop") ||
      label.includes("order") ||
      (label.includes("stop") && !label.includes("turnaround")) ||
      label.includes("dispatch") ||
      (label.includes("route") && !label.includes("turnaround") && !label.includes("pacing"))
    ) {
      return { icon: Truck, theme: "blue" };
    }

    // 2. Bottle / Container / Jugs / Exchange / Asset / Stock
    if (
      label.includes("bottle") ||
      label.includes("container") ||
      label.includes("retrieval") ||
      label.includes("exchange") ||
      label.includes("jug") ||
      label.includes("stock") ||
      label.includes("unit")
    ) {
      return { icon: Package, theme: "teal" };
    }

    // 3. Pacing / Efficiency / Route Progress
    if (
      label.includes("pacing") ||
      label.includes("schedule") ||
      badge.includes("good") ||
      badge.includes("track") ||
      badge.includes("efficient") ||
      trend === "up"
    ) {
      return { icon: TrendingUp, theme: "green" };
    }

    // 4. Time / Turnaround / Duration / Interval / Hours
    if (
      label.includes("turnaround") ||
      label.includes("duration") ||
      label.includes("mins") ||
      label.includes("hour") ||
      label.includes("time") ||
      label.includes("cadence") ||
      label.includes("window")
    ) {
      return { icon: Clock, theme: "purple" };
    }

    // 5. Money / Margin / Revenue / Profit / Cost / Spend
    if (
      label.includes("profit") ||
      label.includes("margin") ||
      label.includes("revenue") ||
      label.includes("sales") ||
      label.includes("spend") ||
      label.includes("cost") ||
      label.includes("price") ||
      label.includes("basket") ||
      value.includes("₱") ||
      value.includes("%")
    ) {
      if (trend === "down") return { icon: TrendingDown, theme: "red" };
      return { icon: DollarSign, theme: "green" };
    }

    // 6. Water / Hydration / Consumed
    if (
      label.includes("water") ||
      label.includes("hydration") ||
      label.includes("consumed") ||
      label.includes("refill")
    ) {
      return { icon: Activity, theme: "blue" };
    }

    if (trend === "down") return { icon: TrendingDown, theme: "red" };
    return { icon: Zap, theme: "blue" };
  };

  // Export PDF Report handler
  const handleExportPDF = () => {
    if (!insightsResult) return;
    setDownloadingPDF(true);

    try {
      exportInsightsToPDF(insightsResult, role, currentUser);
      setToastMessage("Report PDF downloaded successfully!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("PDF export error:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Compute 4 overview cards data based on role
  const getOverviewCards = () => {
    const isReady = !!contextData?.metrics;
    const m = contextData?.metrics || {};

    if (role === "customer") {
      return [
        {
          theme: "card-today",
          icon: ShoppingCart,
          label: "Total Orders",
          value: isReady ? `${m.totalOrders ?? 0} Orders` : "—",
        },
        {
          theme: "card-weekly",
          icon: Calendar,
          label: "Refill Habit",
          value: isReady
            ? m.avgIntervalDays
              ? `Every ${m.avgIntervalDays} Days`
              : "Every 7 Days"
            : "—",
        },
        {
          theme: "card-monthly",
          icon: Clock,
          label: "Days Since Last Refill",
          value: isReady
            ? `${m.daysSinceLastOrder ?? 0} Day${m.daysSinceLastOrder === 1 ? "" : "s"}`
            : "—",
        },
        {
          theme: "card-overall",
          icon: Package,
          label: "Jugs at Home",
          value: isReady ? `${m.borrowedContainers ?? 0} Gallons` : "—",
        },
      ];
    }

    if (role === "rider") {
      return [
        {
          theme: "card-today",
          icon: Truck,
          label: "Assigned Orders",
          value: isReady ? `${m.totalAssigned ?? 0} Orders` : "—",
        },
        {
          theme: "card-weekly",
          icon: CheckCircle2,
          label: "Completed Drops",
          value: isReady ? `${m.deliveredCount ?? 0} Delivered` : "—",
        },
        {
          theme: "card-monthly",
          icon: Clock,
          label: "Active Route",
          value: isReady
            ? `${(m.pendingCount || 0) + (m.outForDeliveryCount || 0)} In-Transit`
            : "—",
        },
        {
          theme: "card-overall",
          icon: Award,
          label: "Completion Rate",
          value: isReady ? `${m.completionRate ?? 0}%` : "—",
        },
      ];
    }

    // Default for Admin / Co-Associate / Staff
    return [
      {
        theme: "card-today",
        icon: DollarSign,
        label: "Total Revenue",
        value: isReady
          ? `₱${Number(m.totalSalesRevenue || 0).toLocaleString()}`
          : "—",
      },
      {
        theme: "card-weekly",
        icon: ShoppingCart,
        label: "Total Orders",
        value: isReady
          ? `${m.totalOrdersCount ?? 0} Orders`
          : "—",
      },
      {
        theme: "card-monthly",
        icon: Package,
        label: "Available Stock",
        value: isReady ? `${m.totalStockUnits ?? 0} Units` : "—",
      },
      {
        theme: "card-overall",
        icon: AlertTriangle,
        label: "Low Stock Alerts",
        value: isReady ? `${m.lowStockItemsCount ?? 0} Items` : "—",
      },
    ];
  };

  const overviewCards = getOverviewCards();

  // Role-tailored content for headers, empty state, capability pills & loading
  const getRoleContent = (role) => {
    const normalizedRole = (role || "").toLowerCase();

    if (normalizedRole === "rider") {
      return {
        headerSubtitle:
          "Real-time delivery route pacing, bottle exchange tracking, and shift optimization",
        emptyTitle: "Unlock Smart Route Intelligence & Delivery Insights",
        emptyDescription:
          "Analyze today's assigned delivery stops, track container exchanges, and receive intelligent tips for faster route turnaround and peak efficiency.",
        pills: [
          { icon: Zap, text: "Route Pacing & Drop Tracking" },
          { icon: CalendarDays, text: "Delivery Surge & Shift Estimations" },
          { icon: Lightbulb, text: "Route Optimization Action Points" },
        ],
        loadingText:
          "Analyzing today's delivery queue, stop pacing, and container exchange records.",
      };
    }

    if (normalizedRole === "customer") {
      return {
        headerSubtitle:
          "Personal water refill habits, upcoming delivery reminders, and bottle exchange tips",
        emptyTitle: "Track Water Refills & Get Helpful Reminders",
        emptyDescription:
          "See how often your household refills water, get reminders before you run out, and receive easy tips for quick bottle exchanges.",
        pills: [
          { icon: Zap, text: "Household Water Habit" },
          { icon: CalendarDays, text: "Next Refill Window" },
          { icon: Lightbulb, text: "Bottle Return & Savings Tips" },
        ],
        loadingText:
          "Checking your household refill history, bottle returns, and upcoming delivery schedule.",
      };
    }

    if (normalizedRole === "staff") {
      return {
        headerSubtitle:
          "Track station inventory velocity, daily order fulfillment, and operational workflow suggestions",
        emptyTitle: "Unlock Operational Intelligence & Stock Forecasting",
        emptyDescription:
          "Monitor station stock levels, track daily order fulfillment pacing, and get proactive alerts to prevent inventory stockouts.",
        pills: [
          { icon: Zap, text: "Station Fulfillment Pacing" },
          { icon: CalendarDays, text: "Inventory Velocity & Restock Alerts" },
          { icon: Lightbulb, text: "Operational Workflow Tips" },
        ],
        loadingText:
          "Analyzing station inventory levels, fulfillment pacing, and stock velocity.",
      };
    }

    if (
      normalizedRole === "co" ||
      normalizedRole === "co-assoc" ||
      normalizedRole === "co-associate"
    ) {
      return {
        headerSubtitle:
          "Co-partner business intelligence, commercial order trends, and growth opportunities",
        emptyTitle: "Unlock Partner Business Analytics & Growth Insights",
        emptyDescription:
          "Examine commercial order volumes, track revenue distribution, and uncover actionable strategies to expand your refill distribution network.",
        pills: [
          { icon: Zap, text: "Partner Revenue & Volume Analysis" },
          { icon: CalendarDays, text: "Customer Retention & Demand Trends" },
          { icon: Lightbulb, text: "Commercial Growth Recommendations" },
        ],
        loadingText:
          "Analyzing commercial partner orders, distribution channels, and volume trends.",
      };
    }

    // Default Admin
    return {
      headerSubtitle:
        "Monitor AI-driven sales intelligence, profitability analysis, and operational recommendations",
      emptyTitle: "Unlock Real-Time Executive Intelligence & Strategy",
      emptyDescription:
        "Generate deep sales trend analysis, inventory stock surge projections, and concrete revenue-boosting recommendations tailored to Adrenaline Aqua.",
      pills: [
        { icon: Zap, text: "Real-Time Revenue & Profitability Analysis" },
        { icon: CalendarDays, text: "Sales Surge & Demand Forecasting" },
        { icon: Lightbulb, text: "Strategic Growth Action Points" },
      ],
      loadingText:
        "Analyzing real-time order intervals, inventory velocity, and commercial performance.",
    };
  };

  const roleContent = getRoleContent(role);

  return (
    <div className="insights-page-wrapper">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="insights-toast-box">
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. HEADER SECTION (For Non-Rider Roles, or Rider Action Bar) */}
      {role !== "rider" ? (
        <div className="insights-header-section">
          <div className="insights-header-text">
            <h1>{customTitle || "Insights"}</h1>
            <p>{roleContent.headerSubtitle}</p>
          </div>

          {insightsResult && (
            <div className="insights-top-actions">
              <button
                onClick={handleExportPDF}
                disabled={downloadingPDF}
                className="insights-btn-secondary"
                title="Download PDF report"
              >
                <Download size={16} />
                <span>{downloadingPDF ? "Generating PDF..." : "Export Report"}</span>
              </button>

              <button
                onClick={handleGenerate}
                disabled={generating || cooldown > 0}
                className="insights-btn-primary"
                title={
                  cooldown > 0
                    ? `Refresh available in ${cooldown}s`
                    : "Refresh AI Insights"
                }
              >
                <RefreshCw size={15} className={generating ? "spin" : ""} />
                <span>
                  {generating
                    ? "Refreshing..."
                    : cooldown > 0
                    ? `Refresh (${cooldown}s)`
                    : "Refresh"}
                </span>
              </button>
            </div>
          )}
        </div>
      ) : (
        insightsResult && (
          <div className="rider-insights-top-actions">
            <button
              onClick={handleExportPDF}
              disabled={downloadingPDF}
              className="insights-btn-secondary"
              title="Download PDF report"
            >
              <Download size={15} />
              <span>{downloadingPDF ? "Exporting..." : "Export Report"}</span>
            </button>

            <button
              onClick={handleGenerate}
              disabled={generating || cooldown > 0}
              className="insights-btn-primary"
              title={
                cooldown > 0
                  ? `Refresh available in ${cooldown}s`
                  : "Refresh AI Insights"
              }
            >
              <RefreshCw size={14} className={generating ? "spin" : ""} />
              <span>
                {generating
                  ? "Refreshing..."
                  : cooldown > 0
                  ? `Refresh (${cooldown}s)`
                  : "Refresh"}
              </span>
            </button>
          </div>
        )
      )}

      {/* 2. OVERVIEW CARDS (Matches Sales / Expenses / Inventory) */}
      <div className="sales-cards-container">
        {loadingContext
          ? [0, 1, 2, 3].map((idx) => (
              <div className="sales-card skeleton-card" key={idx}>
                <div className="skeleton-icon-box skeleton-shimmer" />
                <div className="skeleton-info-col">
                  <div className="skeleton-bar label skeleton-shimmer" />
                  <div className="skeleton-bar value skeleton-shimmer" />
                </div>
              </div>
            ))
          : overviewCards.map((card, idx) => {
              const IconComponent = card.icon;
              return (
                <div className={`sales-card ${card.theme}`} key={idx}>
                  <div className="icon-wrapper">
                    <IconComponent size={24} />
                  </div>
                  <div className="card-info">
                    <span className="card-label">{card.label}</span>
                    <h2 className="card-value">{card.value}</h2>
                  </div>
                </div>
              );
            })}
      </div>

      {/* 3. CONTROLS / STATUS BAR (Only when not generating & has results) */}
      {insightsResult && !generating && !loadingContext && (
        <div className="insights-controls-row">
          <div className="insights-status-indicator">
            <span className="live-status-dot" />
            <span>
              {role === "rider"
                ? "AI Route Active"
                : role === "customer"
                ? "AI Hydration Active"
                : "AI Operations Active"}
            </span>
          </div>

          <div className="insights-controls-right">
            <div
              className="insights-timestamp-badge"
              title={`Generated at ${new Date(insightsResult.generatedAt).toLocaleTimeString()}`}
            >
              <Clock size={12} />
              <span className="timestamp-text">
                <span className="timestamp-prefix">Generated at </span>
                {new Date(insightsResult.generatedAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>

            <button
              onClick={handleReset}
              disabled={generating || cooldown > 0}
              className="insights-reset-btn"
              title={
                cooldown > 0
                  ? `Reset available in ${cooldown}s`
                  : generating
                  ? "Refreshing insights..."
                  : "Reset insights"
              }
              aria-label={
                cooldown > 0
                  ? `Reset available in ${cooldown}s`
                  : "Reset insights"
              }
            >
              <RotateCcw size={13} />
              <span className="reset-btn-text">Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT CONTAINER (Solid White Card) */}
      <div className="insights-main-container">
        {/* SKELETON STATE (Initial First-Run Fetch) */}
        {loadingContext && !insightsResult && (
          <div className="skeleton-empty-box">
            <div className="skeleton-circle-icon skeleton-shimmer" />
            <div className="skeleton-bar title skeleton-shimmer" />
            <div className="skeleton-bar desc skeleton-shimmer" />
            <div className="skeleton-bar desc short skeleton-shimmer" />
            <div className="skeleton-btn-pill skeleton-shimmer" />
            <div className="skeleton-pills-row">
              <div className="skeleton-pill skeleton-shimmer" />
              <div className="skeleton-pill skeleton-shimmer" />
              <div className="skeleton-pill skeleton-shimmer" />
            </div>
          </div>
        )}

        {/* STATE 1: INITIAL / EMPTY STATE */}
        {!loadingContext && !insightsResult && !generating && (
          <div className="insights-empty-box">
            <div className="insights-icon-circle">
              <Sparkles size={30} />
            </div>

            <h2>{roleContent.emptyTitle}</h2>
            <p>{roleContent.emptyDescription}</p>

            <button
              onClick={handleGenerate}
              className="insights-generate-btn"
            >
              <Sparkles size={18} />
              <span>Generate AI Insights</span>
            </button>

            <div className="insights-capability-pills">
              {roleContent.pills.map((pill, pIdx) => {
                const PillIcon = pill.icon;
                return (
                  <div className="cap-pill" key={pIdx}>
                    <PillIcon size={14} />
                    <span>{pill.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STATE 2: LOADING / GENERATING STATE */}
        {generating && (
          <div className="insights-loading-box">
            <div className="insights-spinner-ring">
              <RefreshCw size={36} className="spin-fast text-blue" />
            </div>
            <h3>Generating insights...</h3>
            <p>{roleContent.loadingText}</p>
            <div className="insights-loading-steps">
              <span className="step-pill done">1. Ingesting Live Data</span>
              <span className="step-pill done">2. Calculating Trends</span>
              <span className="step-pill active">3. Generating Recommendations</span>
            </div>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="insights-error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={handleGenerate} className="insights-retry-btn">
              Retry
            </button>
          </div>
        )}

        {/* STATE 3: RESULTS STATE */}
        {insightsResult && !generating && (
          <div className="insights-results-content">
            {/* EXECUTIVE BRIEFING BANNER */}
            <div className="insights-briefing-card">
              <div className="briefing-header">
                <div className="briefing-title-group">
                  <span className="briefing-badge">
                    <Sparkles size={13} /> Briefing
                  </span>
                  <h3>{insightsResult.headline}</h3>
                </div>
              </div>

              {insightsResult.highlightBanner && (
                <div
                  className={`briefing-callout ${
                    insightsResult.highlightBanner.statusType || "optimal"
                  }`}
                >
                  <div className="callout-text">
                    <strong>{insightsResult.highlightBanner.title}</strong>
                    <p>{insightsResult.highlightBanner.subtitle}</p>
                  </div>
                  {role === "customer" && (
                    <button
                      onClick={() => navigate("/customer/make-order")}
                      className="callout-btn"
                    >
                      <span>Order Now</span>
                      <ArrowRight size={15} />
                    </button>
                  )}
                  {(role === "admin" || role === "staff") && (
                    <button
                      onClick={() => navigate(`/${role}/inventory`)}
                      className="callout-btn"
                    >
                      <span>View Inventory</span>
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* DISTINCT AI KEY METRICS RIBBON */}
            {insightsResult.keyMetrics && insightsResult.keyMetrics.length > 0 && (
              <div className="ai-diagnostics-ribbon">
                <div className="diagnostics-ribbon-label">
                  <Activity size={14} />
                  <span>
                    {role === "rider"
                      ? "Riding Overview"
                      : role === "customer"
                      ? "Customer Overview"
                      : "Business Overview"}
                  </span>
                </div>

                <div className="diagnostics-items-container">
                  {insightsResult.keyMetrics.map((item, idx) => {
                    const iconConfig = getDiagnosticIconConfig(item);
                    const IconComp = iconConfig.icon;
                    return (
                      <div className="diagnostics-item" key={idx}>
                        <div className="diagnostics-item-top">
                          <span className="diagnostics-label">{item.label}</span>
                          <span className={`diagnostics-trend-chip ${iconConfig.theme}`}>
                            <IconComp size={12} />
                          </span>
                        </div>
                        <div className="diagnostics-item-body">
                          <span className="diagnostics-value">{item.value}</span>
                          <span className={`diagnostics-badge ${item.trend || "neutral"}`}>
                            {item.badge}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2-COLUMN OBSERVATIONS & RECOMMENDATIONS GRID */}
            <div className="insights-split-grid">
              {/* COLUMN 1: KEY OBSERVATIONS */}
              <div className="insights-column-panel">
                <div className="panel-header">
                  <div className="panel-icon blue">
                    <Lightbulb size={18} />
                  </div>
                  <div>
                    <h4>Key Observations</h4>
                    <p>Pattern recognition and operational diagnostic</p>
                  </div>
                </div>

                <div className="panel-items-list">
                  {(insightsResult.insights || []).map((insight, idx) => {
                    const bullets = getBulletPoints(insight, "description");
                    return (
                      <div className="panel-item-card" key={idx}>
                        <div className="item-meta-row">
                          <span className="item-cat-badge">{insight.category}</span>
                          <span
                            className={`item-impact-badge ${
                              insight.impact || "positive"
                            }`}
                          >
                            {insight.impact
                              ? `${insight.impact.toUpperCase()}`
                              : "OBSERVATION"}
                          </span>
                        </div>
                        <h5>{insight.title}</h5>

                        {/* BULLET POINTS PRESENTATION */}
                        <ul className="item-bullet-list">
                          {bullets.map((bullet, bIdx) => (
                            <li key={bIdx}>
                              <span className="bullet-dot" />
                              <span className="bullet-text">{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COLUMN 2: SMART RECOMMENDATIONS */}
              <div className="insights-column-panel">
                <div className="panel-header">
                  <div className="panel-icon orange">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4>Smart Recommendations</h4>
                    <p>
                      {role === "customer"
                        ? "Timing, container returns & savings suggestions"
                        : "Revenue optimization & operational action points"}
                    </p>
                  </div>
                </div>

                <div className="panel-items-list">
                  {(insightsResult.recommendations || []).map((rec, idx) => {
                    const bullets = getBulletPoints(rec, "action");
                    return (
                      <div className="panel-item-card" key={idx}>
                        <div className="item-meta-row">
                          <span
                            className={`item-priority-badge ${
                              rec.priority || "medium"
                            }`}
                          >
                            {rec.priority?.toUpperCase()} PRIORITY
                          </span>
                        </div>
                        <h5>{rec.title}</h5>

                        {/* BULLET POINTS PRESENTATION */}
                        <ul className="item-bullet-list">
                          {bullets.map((bullet, bIdx) => (
                            <li key={bIdx}>
                              <span className="bullet-dot orange" />
                              <span className="bullet-text">{bullet}</span>
                            </li>
                          ))}
                        </ul>

                        {rec.benefit && (
                          <div className="rec-benefit-chip">
                            <strong>Expected Outcome:</strong> {rec.benefit}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SPECIALIZED STRATEGY / PROJECTION SECTION */}
            {insightsResult.specializedSection && (
              <div className="insights-strategy-box">
                <div className="strategy-icon-box">
                  {role === "customer" ? (
                    <Calendar size={24} />
                  ) : (
                    <TrendingUp size={24} />
                  )}
                </div>
                <div className="strategy-text">
                  <h4>{insightsResult.specializedSection.title}</h4>
                  <p>{insightsResult.specializedSection.details}</p>
                  {insightsResult.specializedSection.actionTip && (
                    <div className="strategy-tip">
                      <strong>Pro Tip:</strong>{" "}
                      {(insightsResult.specializedSection.actionTip || "").replace(
                        /^Pro Tip:\s*/i,
                        ""
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
