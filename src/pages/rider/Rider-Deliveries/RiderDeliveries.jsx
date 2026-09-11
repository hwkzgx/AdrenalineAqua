import { useState, useEffect } from "react";
import "./rider-deliveries.css";
import { Link } from "react-router-dom";
import RiderTopbar from "../Rider-Topbar/RiderTopbar";
import { supabase } from "../../../supabase";
import {
  Home,
  Truck,
  History,
  User,
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
    // 1. Kunin ang pangalan ng nakelogin na rider mula sa localStorage
    // (I-adjust ang key kung iba ang ginamit mo, halimbawa "riderName" o "user")
    const loggedInRiderName = localStorage.getItem("userName") || "Mark"; 

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
          assigned_rider
        )
      `)
      .eq("order_type", "Delivery")
      .order("delivery_date", { ascending: true });

    if (error) {
      console.log(error.message);
      setLoading(false);
      return;
    }

    // 2. I-format at i-filter agad na para lamang sa nakelogin na rider
    const formatted = data
      .filter((item) => {
        const assignedRider = item.delivery_schedule?.[0]?.assigned_rider;
        // Sinisigurong tugma ang pangalan ng nakelogin sa assigned_rider (case-insensitive)
        return assignedRider && assignedRider.toLowerCase() === loggedInRiderName.toLowerCase();
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

  // 🔥 Filter logic batay sa activeTab (All, Pending, Out for Delivery)
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
                <span className={`delivery-status ${item.status?.toLowerCase().replace(/\s+/g, '-')}`}>
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
              <Link to={`/rider/delivery-details/${item.id}`} className="details-link">
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
      </nav>
    </div>
  );
}