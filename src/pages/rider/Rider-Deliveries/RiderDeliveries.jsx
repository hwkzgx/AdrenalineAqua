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
      .order("delivery_date", { ascending: true });

    if (error) {
      console.log(error.message);
      setLoading(false);
      return;
    }

    // 2. Salain para sa nakalogin na rider LANG, tapos i-format
    const formatted = (data || [])
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
        deliveryId: item.delivery_schedule?.[0]?.delivery_code,
        orderId: item.order_code,
        customer: item.full_name,
        address: item.delivery_address,
        date: item.delivery_date,
        status: item.delivery_schedule?.[0]?.delivery_status || "Pending",
        rider: item.delivery_schedule?.[0]?.assigned_rider,
      }));

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
          <div className="delivery-card" key={item.id || index}>
            <div className="top-row">
              <div className="left-content">
                <div className="order-number">{index + 1}</div>

                <div>
                  <p className="label">Order ID</p>
                  <h2>{item.orderId}</h2>
                </div>
              </div>

              <div className="right-content">
                <span
                  className={`delivery-status ${item.status
                    ?.toLowerCase()
                    .replace(/\s+/g, "-")}`}
                >
                  {item.status}
                </span>
              </div>
            </div>

            <h4 className="customer-name">{item.customer}</h4>

            <div className="info">
              <MapPin size={16} /> {item.address}
            </div>

            <div className="info">
              <Clock size={16} /> {item.date}
            </div>

            <div className="buttons">
              <Link
                to={`/rider/delivery-details/${item.id}`}
                className="details-link"
              >
                <button className="details-btn">View Details</button>
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
