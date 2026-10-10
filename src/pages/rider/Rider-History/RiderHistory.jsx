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
      .eq("order_type", "Delivery")
      .order("delivery_date", { ascending: false });

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

    setHistoryList(formatted);
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
