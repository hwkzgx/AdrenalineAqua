import React from "react";
import { NavLink } from "react-router-dom";
import RiderTopbar from "../Rider-Topbar/RiderTopbar";
import InsightsView from "../../../components/Insights/InsightsView";
import { Home, Truck, History, Sparkles } from "lucide-react";
import "../Rider-Home/rider-home.css";
import "../Rider-Deliveries/rider-deliveries.css";

export default function RiderInsights() {
  return (
    <div className="home-container">
      <RiderTopbar title="Insights" />

      <InsightsView role="rider" customTitle="Insights" />

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <NavLink to="/rider/home" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
          <Home size={22} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/rider/deliveries" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
          <Truck size={22} />
          <span>Deliveries</span>
        </NavLink>
        <NavLink to="/rider/history" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
          <History size={22} />
          <span>History</span>
        </NavLink>
        <NavLink to="/rider/insights" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
          <Sparkles size={22} />
          <span>Insights</span>
        </NavLink>
      </nav>
    </div>
  );
}
