import { useState, useEffect } from "react";
import "./rider-history.css";
import { NavLink } from "react-router-dom";
import RiderTopbar from "../Rider-Topbar/RiderTopbar";
import { supabase } from "../../../supabase";
import {
  Home,
  Truck,
  History,
  Sparkles,
  CheckCircle,
  MapPin,
  Clock,
  Award,
  PackageCheck,
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

export default function RiderHistory() {
  const [historyList, setHistoryList] = useState([]);
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    // 1. Kunin ang nakalogin na rider (parehong "user" object gaya ng sa Home at Deliveries)
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");

    // Walang nakalogin = walang ipapakita (wala nang "Mark" na fallback)
    if (!currentUser) {
      setHistoryList([]);
      setTotalAssigned(0);
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
          assigned_rider_id,
          proof_of_delivery
        )
      `)
      .eq("order_type", "Delivery");

    if (error) {
      console.log(error.message);
      setLoading(false);
      return;
    }

    // 2. Salain muna ang buong data para sa nakalogin na rider LANG
    const riderOrders = (data || []).filter((item) => {
      const d = item.delivery_schedule?.[0];
      if (!d) return false;

      // May assigned_rider_id? ID lang ang basehan
      if (d.assigned_rider_id != null) {
        return myId != null && String(d.assigned_rider_id) === String(myId);
      }

      // Walang ID (lumang records): exact na pangalan lang
      const assigned = (d.assigned_rider || "").trim().toLowerCase();
      return assigned !== "" && assigned === myName;
    });

    // 3. Ang total assigned ay ang kabuuang naging trabaho ng rider na ito
    setTotalAssigned(riderOrders.length);

    // 4. I-filter ang mga "Delivered" o "Completed" para sa history list
    const formatted = riderOrders
      .map((item) => ({
        id: item.order_id,
        orderDate: item.order_date,
        totalAmount: item.total_amount,
        paymentMethod: item.payment_method,
        paymentStatus: getPaymentStatus(
          item.payment_method,
          item.payment_status,
          item.delivery_schedule?.[0]?.delivery_status || "Delivered"
        ),
        proofUrl: item.delivery_schedule?.[0]?.proof_of_delivery || "",
        orderId: item.order_code,
        customer: item.full_name,
        address: item.delivery_address,
        date: item.delivery_date,
        status: item.delivery_schedule?.[0]?.delivery_status || "Delivered",
      }))
      .filter((item) => {
        const s = item.status.toLowerCase();
        return s === "delivered" || s === "completed";
      });

    // Pinakabagong delivery muna
    setHistoryList(sortByPendingThenLatest(formatted));
    setLoading(false);
  };

  // Computation ng Success Rate para sa rider na ito
  const successRate =
    totalAssigned > 0
      ? Math.round((historyList.length / totalAssigned) * 100)
      : 0;

  return (
    <div className="history-container">

      {/* Reusable Topbar */}
      <RiderTopbar title="Delivery History" />

      {/* Modern Summary Stat Cards */}
      <div className="history-summary-row">
        <div className="summary-card">
          <div className="summary-icon-box green">
            <PackageCheck size={26} />
          </div>
          <div>
            <p className="summary-label">Total Delivered</p>
            <h3 className="summary-value">{historyList.length}</h3>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-box blue">
            <Award size={26} />
          </div>
          <div>
            <p className="summary-label">Success Rate</p>
            <h3 className="summary-value">{successRate}%</h3>
          </div>
        </div>
      </div>

      {/* Section Title */}
      <div className="section-title">
        <h3>Completed Deliveries</h3>
      </div>

      {loading ? (
        <p style={{ marginTop: "30px", textAlign: "center", color: "#64748b", fontWeight: "500" }}>
          Loading history...
        </p>
      ) : historyList.length === 0 ? (
        <p style={{ marginTop: "30px", textAlign: "center", color: "#64748b", fontWeight: "500" }}>
          No completed deliveries yet.
        </p>
      ) : (
        historyList.map((item, index) => (
          <div className="history-card" key={item.id || index}>
            <div className="historytop-row">
              <div className="history-id-group">
                <div className="success-icon-wrapper">
                  <CheckCircle size={28} className="success-icon" />
                </div>
                <div>
                  <p className="label">Order ID</p>
                  <h2>#{item.orderId}</h2>
                </div>
              </div>
              <span className="historydelstatus">{item.status}</span>
            </div>

            <h4 className="customer-name">{item.customer}</h4>

            <div className="history-details-box">
              <div className="historyinfo">
                <MapPin size={16} className="info-icon" /> <span>{item.address}</span>
              </div>

              <div className="historyinfo">
                <Clock size={16} className="info-icon" /> <span>{item.date}</span>
              </div>

              {/* PAYMENT: Paid / Unpaid + total na binayaran */}
              <div
                className="historyinfo"
                style={{ justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <PaymentTag status={item.paymentStatus} />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {methodLabel(item.paymentMethod)}
                  </span>
                </span>
                <strong style={{ fontSize: "16px", color: "#1e293b" }}>
                  {peso(item.totalAmount)}
                </strong>
              </div>

              {item.proofUrl && (
                <a
                  href={item.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
                >
                  <img
                    src={item.proofUrl}
                    alt="Proof of delivery"
                    style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#2563eb" }}>
                    View proof of delivery
                  </span>
                </a>
              )}
            </div>
          </div>
        ))
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <NavLink to="/rider/home" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
          <Home size={22} /><span>Home</span>
        </NavLink>
        <NavLink to="/rider/deliveries" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
          <Truck size={22} /><span>Deliveries</span>
        </NavLink>
        <NavLink to="/rider/history" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
          <History size={22} /><span>History</span>
        </NavLink>
        <NavLink to="/rider/insights" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
          <Sparkles size={22} /><span>Insights</span>
        </NavLink>
      </nav>
    </div>
  );
}
