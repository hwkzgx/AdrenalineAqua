import { useState, useRef, useEffect } from "react";
import "./customer-dashboard.css"; // NEW: mobile-only styles (must come after the main css)
import CustomerTopbar from "../../../components/NavBar/CustomerTopbar";
import { supabase } from "../../../supabase";

import {
  Package,
  BarChart3,
  CalendarDays,
  ChevronDown,
} from "lucide-react";

export default function CustomerDashboard() {
  const [month, setMonth] = useState("This Month");
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  // SEPARATE DROPDOWN STATES
  const [openWelcome, setOpenWelcome] = useState(false);
  const [openGraph, setOpenGraph] = useState(false);

  const welcomeRef = useRef(null);
  const graphRef = useRef(null);

  const fetchDashboard = async () => {
    const user = JSON.parse(localStorage.getItem("user"));

    console.log("USER:", user);
    console.log("user.user_id:", user?.user_id);
    console.log("user.users_id:", user?.users_id);
    console.log("user.id:", user?.id);

    if (!user) return;

    // CUSTOMER INFO
    const { data: customerData, error: customerError } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", user.user_id)
      .single();

    console.log("Customer Data:", customerData);
    console.log("Customer Error:", customerError);

    setCustomer(customerData);

    // CUSTOMER ORDERS
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.users_id)
      .order("order_date", { ascending: false });

    console.log("Orders Data:", ordersData);
    console.log("Orders Error:", ordersError);

    setOrders(ordersData || []);
    setRecentOrders((ordersData || []).slice(0, 5));

    // DELIVERY SCHEDULE
    const { data: deliveryData, error: deliveryError } = await supabase
      .from("delivery_schedule")
      .select(`
        *,
        orders!inner(
          user_id,
          delivery_address,
          order_code
        )
      `)
      .eq("orders.user_id", user.users_id)
      .in("delivery_status", ["Pending", "Out for Delivery"])
      .order("delivery_date");

    console.log("Delivery Data:", deliveryData);
    console.log("Delivery Error:", deliveryError);

    setPendingDeliveries(deliveryData || []);
  };

  useEffect(() => {
    fetchDashboard();

    const handleClickOutside = (e) => {
      if (welcomeRef.current && !welcomeRef.current.contains(e.target)) {
        setOpenWelcome(false);
      }
      if (graphRef.current && !graphRef.current.contains(e.target)) {
        setOpenGraph(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ranges = [
    "May 1–7",
    "May 8–14",
    "May 15–21",
    "May 22–28",
    "Full Month",
  ];

  // NEW: mobile segmented control options
  const mobileRanges = ["This Week", "This Month", "All Time"];

  const graphLabels = [
    "Apr 28 - May 4",
    "May 5 - May 11",
    "May 12 - May 18",
    "May 19 - May 25",
    "May 26 - Jun 1",
    "Jun 2 - Jun 8",
    "Jun 9 - Jun 15",
    "Jun 16 - Jun 22",
    "Jun 23 - Jun 29",
  ];

  return (
    <>
      <CustomerTopbar />

      <div className="cusdashboard-container">

        {/* WELCOME SECTION */}
        <div className="welcome-section">
          <div>
            <h1>Welcome, {customer?.name || "Customer"} 👋</h1>
            <p>Here’s what’s happening with your account today.</p>
          </div>
        </div>

        {/* TOP CARDS */}
        <div className="top-cards">
          {/* Card 1: Pending Deliveries */}
          <div className="card stat-card pending-card">
            <div className="pending-card-main">
              <div className="icon-box stat-blue">
                <Package size={22} />
              </div>
              <div className="card-body">
                <span className="card-tag-label">Pending Deliveries</span>
                <h2 className="card-metric-val">
                  {pendingDeliveries.length} <span className="unit-text">order/s</span>
                </h2>
                <p className="card-helper-text">Here's your pending orders</p>
              </div>
            </div>
            <button
              type="button"
              className="view-orders-btn"
              onClick={() =>
                document
                  .getElementById("recent-orders")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              View orders
            </button>
          </div>

          {/* Card 2: Order Frequency */}
          <div className="card stat-card frequency-card">
            <div className="card-top-row">
              <div className="icon-box stat-purple">
                <BarChart3 size={22} />
              </div>
              <span className="card-pill-tag">{month}</span>
            </div>
            <div className="card-body">
              <span className="card-tag-label">Order Frequency</span>
              <h2 className="card-metric-val">
                {orders.length} <span className="unit-text">order/s</span>
              </h2>
              <p className="card-helper-text">Total orders placed</p>
            </div>
          </div>

          {/* Card 3: Member Since */}
          <div className="card stat-card member-card">
            <div className="card-top-row">
              <div className="icon-box stat-teal">
                <CalendarDays size={22} />
              </div>
              <span className="card-pill-tag">Customer</span>
            </div>
            <div className="card-body">
              <span className="card-tag-label">Member Since</span>
              <h2 className="card-metric-val">
                {customer
                  ? new Date(customer.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })
                  : "-"}
              </h2>
              <p className="card-helper-text">Regular customer</p>
            </div>
          </div>
        </div>

        {/* GRAPH SECTION */}
        <div className="graph-card">
          <div className="graph-header">
            <h2>Order Frequency</h2>

            {/* NEW: mobile only segmented control */}
            <div className="range-seg" role="group" aria-label="Time range">
              {mobileRanges.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={month === opt ? "active" : ""}
                  aria-pressed={month === opt}
                  onClick={() => setMonth(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* GRAPH DROPDOWN (desktop) */}
            <div className="month-dropdown" ref={graphRef}>
              <button className="month-btn small" onClick={() => setOpenGraph(!openGraph)}>
                <CalendarDays size={16} />
                <span>{month}</span>
                <ChevronDown size={14} />
              </button>

              {openGraph && (
                <div className="month-dropdown-menu">
                  <div className="dropdown-title">Select Range</div>
                  {ranges.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setMonth(r);
                        setOpenGraph(false);
                      }}
                    >
                      {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* GRAPH CONTAINER */}
          <div className="graph">
            <div className="line"></div>

            {/* NEW: mobile only line on top of the area */}
            <svg className="graph-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points="3,85 15,75 28,65 40,50 53,72 66,55 76,40 86,30 97,38" />
            </svg>

            <div className="points">
              <div className="point" style={{ left: "3%", bottom: "15%" }}><span>2</span></div>
              <div className="point" style={{ left: "15%", bottom: "25%" }}><span>3</span></div>
              <div className="point" style={{ left: "28%", bottom: "35%" }}><span>4</span></div>
              <div className="point" style={{ left: "40%", bottom: "50%" }}><span>6</span></div>
              <div className="point" style={{ left: "53%", bottom: "28%" }}><span>3</span></div>
              <div className="point" style={{ left: "66%", bottom: "45%" }}><span>5</span></div>
              <div className="point" style={{ left: "76%", bottom: "60%" }}><span>7</span></div>
              <div className="point" style={{ left: "86%", bottom: "70%" }}><span>8</span></div>
              <div className="point" style={{ left: "97%", bottom: "62%" }}><span>6</span></div>
            </div>
          </div>

          <div className="graph-labels">
            {graphLabels.map((label, i) => (
              <span key={label}>
                <span className="lbl-full">{label}</span>
                <span className="lbl-short">Wk {i + 1}</span>
              </span>
            ))}
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="customer-bottom-grid">

          {/* UPCOMING DELIVERIES */}
          <div className="customer-delivery-card">
            <div className="customer-section-header">
              <h2>Upcoming Deliveries</h2>
            </div>

            {pendingDeliveries.filter(
              (delivery) => delivery.delivery_status === "Out for Delivery"
            ).length > 0 ? (
              pendingDeliveries
                .filter((delivery) => delivery.delivery_status === "Out for Delivery")
                .map((delivery) => (
                  <div
                    className="customer-delivery-content"
                    key={delivery.delivery_id}
                  >
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/3050/3050158.png"
                      alt=""
                    />

                    <div>
                      <h4>{delivery.orders?.order_code}</h4>
                      <h4>
                        {new Date(delivery.delivery_date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </h4>
                      <p>{delivery.orders?.delivery_address}</p>
                    </div>

                    <button>{delivery.delivery_status}</button>
                  </div>
                ))
            ) : (
              <div className="customer-delivery-content">
                <img
                  src="https://cdn-icons-png.flaticon.com/512/3050/3050158.png"
                  alt=""
                />
                <div>
                  <h4>No Upcoming Delivery</h4>
                  <p>Your order is not yet out for delivery.</p>
                </div>
              </div>
            )}
          </div>

          {/* RECENT ORDERS */}
          <div className="recent-card" id="recent-orders">
            <div className="section-header">
              <h2>Recent Orders</h2>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.order_id}>
                      <td>{order.order_code}</td>
                      <td>{new Date(order.order_date).toLocaleDateString()}</td>
                      <td>{order.status}</td>
                      <td>₱{order.total_amount}</td>
                    </tr>
                  ))}
                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
                        No recent orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}