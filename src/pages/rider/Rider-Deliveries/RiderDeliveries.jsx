import { useState, useEffect } from "react";
import "./rider-deliveries.css";
import { Link } from "react-router-dom";
import RiderTopbar from "../Rider-Topbar/RiderTopbar";
import { supabase } from "../../../supabase";
import {
  Home,
  Truck,
  History,
  Sparkles,
  MapPin,
  Clock,
  Calendar,
} from "lucide-react";

// ==========================================
// PAYMENT (Paid / Unpaid) PARA SA RIDER
// COD = Unpaid hangga't hindi pa Delivered (Delivered = Paid)
// GCash = galing sa admin (Pending / Paid / Rejected)
// Cash (walk-in) = galing sa admin (Unpaid / Paid)
// ==========================================
const getPaymentStatus = (method, rawStatus, deliveryStatus) => {
  const m = String(method || "").toLowerCase();
  if (m === "cod") return deliveryStatus === "Delivered" ? "Paid" : "Unpaid";

  const r = String(rawStatus || "").toLowerCase();
  if (r === "paid" || r === "verified") return "Paid";
  if (r === "rejected") return "Rejected";
  return m === "gcash" ? "Pending" : "Unpaid";
};

const methodLabel = (method) =>
  String(method || "").toLowerCase() === "cod" ? "Cash on Delivery" : method || "—";

const PaymentTag = ({ status }) => {
  const colors =
    status === "Paid"
      ? { bg: "#dcfce7", fg: "#15803d" }
      : status === "Pending"
      ? { bg: "#fef9c3", fg: "#a16207" }
      : { bg: "#fee2e2", fg: "#b91c1c" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        background: colors.bg,
        color: colors.fg,
      }}
    >
      {status}
    </span>
  );
};

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

// Pending (nasa taas) -> Out for Delivery -> Delivered -> Cancelled
// Sa bawat grupo, pinakabagong order muna
const STATUS_ORDER = { Pending: 0, "Out for Delivery": 1, Delivered: 2, Completed: 2, Cancelled: 3 };
const sortByPendingThenLatest = (list) =>
  [...list].sort((a, b) => {
    const ra = STATUS_ORDER[a.status] ?? 4;
    const rb = STATUS_ORDER[b.status] ?? 4;
    if (ra !== rb) return ra - rb;

    const ta = new Date(a.orderDate || 0).getTime();
    const tb = new Date(b.orderDate || 0).getTime();
    if (tb !== ta) return tb - ta;

    return Number(b.id || 0) - Number(a.id || 0);
  });

export default function RiderDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    fetchRiderDeliveries();
  }, []);

  const fetchRiderDeliveries = async () => {
    // 1. Kunin ang nakalogin na rider (parehong "user" object gaya ng sa Home)
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");

    // Walang nakalogin = walang ipapakita (wala nang "Mark" na fallback)
    if (!currentUser) {
      setDeliveries([]);
      setLoading(false);
      return;
    }

    const myName = (currentUser.name || "").trim().toLowerCase();
    const myId = currentUser.users_id;

    const { data, error } = await supabase
      .from("orders")
      .select(`
        order_id,
        order_code,
        order_date,
        total_amount,
        payment_method,
        payment_status,
        full_name,
        delivery_address,
        delivery_date,
        delivery_schedule (
          order_id,
          delivery_code,
          delivery_status,
          assigned_rider,
          assigned_rider_id
        )
      `)
      .eq("order_type", "Delivery");

    if (error) {
      console.log(error.message);
      setLoading(false);
      return;
    }

    // 2. Salain para sa nakalogin na rider LANG, tapos i-format
    const formatted = sortByPendingThenLatest((data || [])
      .filter((item) => {
        const d = item.delivery_schedule?.[0];
        if (!d) return false;

        // May assigned_rider_id? ID lang ang basehan
        if (d.assigned_rider_id != null) {
          return myId != null && String(d.assigned_rider_id) === String(myId);
        }

        // Walang ID (lumang records): exact na pangalan lang
        const assigned = (d.assigned_rider || "").trim().toLowerCase();
        return assigned !== "" && assigned === myName;
      })
      .map((item) => ({
        id: item.order_id,
        orderDate: item.order_date,
        totalAmount: item.total_amount,
        paymentMethod: item.payment_method,
        paymentStatus: getPaymentStatus(
          item.payment_method,
          item.payment_status,
          item.delivery_schedule?.[0]?.delivery_status || "Pending"
        ),
        deliveryId: item.delivery_schedule?.[0]?.delivery_code,
        orderId: item.order_code,
        customer: item.full_name,
        address: item.delivery_address,
        date: item.delivery_date,
        status: item.delivery_schedule?.[0]?.delivery_status || "Pending",
        rider: item.delivery_schedule?.[0]?.assigned_rider,
      })));

    setDeliveries(formatted);
    setLoading(false);
  };

  // Filter logic batay sa activeTab (All, Pending, Out for Delivery)
  const filteredDeliveries = deliveries.filter((item) => {
    if (activeTab === "All") return true;
    return item.status.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className="deliveries-container">

      <RiderTopbar title="Deliveries" />

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`all-tab ${activeTab === "All" ? "active" : ""}`}
          onClick={() => setActiveTab("All")}
        >
          All
        </button>

        <button
          className={`pending-tab ${activeTab === "Pending" ? "active" : ""}`}
          onClick={() => setActiveTab("Pending")}
        >
          Pending
        </button>

        <button
          className={`out-tab ${activeTab === "Out for Delivery" ? "active" : ""}`}
          onClick={() => setActiveTab("Out for Delivery")}
        >
          Out for Delivery
        </button>
      </div>

      {/* Date */}
      <div className="date-row">
        <h3>Today</h3>
        <Calendar size={20} />
      </div>

      {loading ? (
        <p style={{ padding: "0 20px" }}>Loading...</p>
      ) : filteredDeliveries.length === 0 ? (
        <p style={{ padding: "0 20px" }}>No assigned deliveries found.</p>
      ) : (
        filteredDeliveries.map((item, index) => (
          <div className="rider-delivery-card" key={item.id || index}>
            {/* Desktop Col 1 / Mobile Top Left */}
            <div className="rider-card-header-col">
              <div className="rider-card-num">{index + 1}</div>
              <div className="rider-card-order-info">
                <span className="rider-card-label">ORDER ID</span>
                <span className="rider-card-code">{item.orderId}</span>
              </div>
            </div>

            {/* Desktop Col 2 / Mobile Top Right */}
            <div className="rider-card-status-col">
              <span
                className={`rider-status-tag ${item.status
                  ?.toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {item.status}
              </span>
            </div>

            {/* Desktop Col 3 / Mobile Center */}
            <div className="rider-card-customer-info">
              <span className="rider-customer-title">{item.customer}</span>
              <div className="rider-meta-row">
                <span className="rider-meta-item">
                  <MapPin size={14} />
                  <span className="rider-meta-text">{item.address}</span>
                </span>
                <span className="rider-meta-item">
                  <Clock size={14} />
                  <span className="rider-meta-text">{item.date}</span>
                </span>
              </div>

              {/* PAYMENT: Paid / Unpaid + halaga */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                <PaymentTag status={item.paymentStatus} />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                  {peso(item.totalAmount)}
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  {methodLabel(item.paymentMethod)}
                </span>
              </div>
            </div>

            {/* Desktop Col 4 / Mobile Bottom */}
            <div className="rider-card-action">
              <Link
                to={`/rider/delivery-details/${item.id}`}
                className="rider-details-btn"
              >
                View Details
              </Link>
            </div>
          </div>
        ))
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link to="/rider/home" className="nav-item">
          <Home size={22} />
          <span>Home</span>
        </Link>
        <Link to="/rider/deliveries" className="nav-item active">
          <Truck size={22} />
          <span>Deliveries</span>
        </Link>
        <Link to="/rider/history" className="nav-item">
          <History size={22} />
          <span>History</span>
        </Link>
        <Link to="/rider/insights" className="nav-item">
          <Sparkles size={22} />
          <span>Insights</span>
        </Link>
      </nav>
    </div>
  );
}
