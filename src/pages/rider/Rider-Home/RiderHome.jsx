import RiderTopbar from "../Rider-Topbar/RiderTopbar";
import { supabase } from "../../../supabase";
import "./rider-home.css";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  Truck,
  History,
  Sparkles,
  Package,
  CheckCircle2,
  Wallet,
  Droplets,
  CalendarDays,
  Clock3,
  ChevronRight,
} from "lucide-react";

export default function RiderHome() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riderName, setRiderName] = useState("");

  const [stats, setStats] = useState({
    assigned: 0,
    progress: 0,
    completed: 0,
    earnings: 0,
  });

  useEffect(() => {
    // Kunin ang nakalogin na rider mula sa localStorage ("user" object)
    const user = JSON.parse(localStorage.getItem("user") || "null");

    setRiderName(user?.name || "Rider");
    fetchDeliveries(user);
  }, []);

  const fetchDeliveries = async (currentUser) => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(`
        order_id,
        order_code,
        full_name,
        delivery_address,
        delivery_date,
        delivery_schedule(
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

    const myName = (currentUser.name || "").trim().toLowerCase();
    const myId = currentUser.users_id;

    // 1. Salain para sa nakalogin na rider LANG
    const riderOrders = (data || []).filter((item) => {
      const d = item.delivery_schedule?.[0];
      if (!d) return false;

      // May assigned_rider_id? ID lang ang basehan (hindi na titingin sa pangalan)
      if (d.assigned_rider_id != null) {
        return myId != null && String(d.assigned_rider_id) === String(myId);
      }

      // Walang ID (lumang records): exact na pangalan lang ang tatanggapin
      const assigned = (d.assigned_rider || "").trim().toLowerCase();
      return assigned !== "" && assigned === myName;
    });

    // 2. I-format ang mga nakasalang orders
    const formatted = riderOrders.map((item) => ({
      id: item.order_id,
      deliveryId: item.delivery_schedule?.[0]?.delivery_code,
      customer: item.full_name,
      address: item.delivery_address,
      date: item.delivery_date,
      status: item.delivery_schedule?.[0]?.delivery_status || "Pending",
    }));

    setDeliveries(formatted);

    // 3. Bilangin ang mga estatistika base sa status
    const assigned = formatted.filter(
      (d) => d.status.toLowerCase() === "pending"
    ).length;

    const progress = formatted.filter(
      (d) =>
        d.status.toLowerCase() === "out for delivery" ||
        d.status.toLowerCase() === "in progress"
    ).length;

    const completed = formatted.filter(
      (d) =>
        d.status.toLowerCase() === "completed" ||
        d.status.toLowerCase() === "delivered"
    ).length;

    setStats({
      assigned,
      progress,
      completed,
      earnings: completed * 120,
    });

    setLoading(false);
  };

  const currentHour = new Date().getHours();
  let greeting = "";

  if (currentHour < 12) {
    greeting = "Good Morning";
  } else if (currentHour < 18) {
    greeting = "Good Afternoon";
  } else {
    greeting = "Good Evening";
  }

  return (
    <div className="home-container">

      <RiderTopbar title="Home" />

      {/* HERO */}
      <div className="hero-card">
        <div>
          <span className="hero-small">{greeting}</span>
          <h2>{riderName}</h2>
          <p>
            You have {stats.assigned + stats.progress} deliveries today.
          </p>
        </div>

        <div className="hero-icon">
          <Droplets size={55} />
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid">

        <div className="stat-card">
          <Package size={28}/>
          <h2>{stats.assigned}</h2>
          <p>Pending</p>
        </div>

        <div className="stat-card">
          <Truck size={28}/>
          <h2>{stats.progress}</h2>
          <p>In Progress</p>
        </div>

        <div className="stat-card">
          <CheckCircle2 size={28}/>
          <h2>{stats.completed}</h2>
          <p>Completed</p>
        </div>

        <div className="stat-card">
          <Wallet size={28}/>
          <h2>₱{stats.earnings}</h2>
          <p>Earnings</p>
        </div>

      </div>

      {/* TODAY'S PROGRESS */}
      <div className="progress-card">

        <div className="progress-header">
          <h3>Today's Progress</h3>
          <span>{stats.completed} completed</span>
        </div>

        <div className="progress-content">
          <div
            className="progress-circle"
            style={{
              background: `conic-gradient(
                #2563eb ${
                  deliveries.length === 0
                    ? 0
                    : (stats.completed / deliveries.length) * 360
                }deg,
                #e5e7eb 0deg
              )`,
            }}
          >
            <span>
              {deliveries.length === 0
                ? "0%"
                : `${Math.round((stats.completed / deliveries.length) * 100)}%`}
            </span>
          </div>
        </div>

      </div>

      {/* NEXT DELIVERY */}
      <div className="next-delivery-card">

        <div className="card-header">
          <h3>Next Delivery</h3>
          <ChevronRight size={18} />
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : deliveries.length > 0 ? (
          <>
            <h2>{deliveries[0].customer}</h2>

            <div className="delivery-info">
              <Truck size={16} />
              <span>{deliveries[0].deliveryId}</span>
            </div>

            <div className="delivery-info">
              <CalendarDays size={16} />
              <span>{deliveries[0].date}</span>
            </div>

            <div className="delivery-info">
              <Clock3 size={16} />
              <span>{deliveries[0].address}</span>
            </div>

            <Link
              to={`/rider/delivery-details/${deliveries[0].id}`}
              className="view-delivery-btn"
            >
              View Details
            </Link>
          </>
        ) : (
          <p>No deliveries available.</p>
        )}

      </div>

      {/* TODAY'S SCHEDULE */}
      <div className="schedule-card">

        <div className="card-header">
          <h3>Today's Schedule</h3>
          <CalendarDays size={18} />
        </div>

        {deliveries.slice(0, 3).map((item) => (
          <div className="schedule-item" key={item.id}>
            <Clock3 size={16} />

            <div>
              <strong>{item.customer}</strong>
              <p>{item.date}</p>
            </div>
          </div>
        ))}

      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link to="/rider/home" className="nav-item active">
          <Home size={22} />
          <span>Home</span>
        </Link>

        <Link to="/rider/deliveries" className="nav-item">
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
