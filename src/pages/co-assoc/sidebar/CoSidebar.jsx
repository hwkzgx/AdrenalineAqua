import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./co-sidebar.css";

import AquaLogo from "../../../assets/AquaLogo.png";
import Profile from "../../../assets/Profile.png";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faMoneyBill,
  faChartPie,
  faBox,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";

export default function CoSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openProfile, setOpenProfile] = useState(false);
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "{}")
  );

  useEffect(() => {
    const handleUserUpdated = () => {
      const updatedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );
      setUser(updatedUser);
    };

    window.addEventListener("userUpdated", handleUserUpdated);

    return () => {
      window.removeEventListener("userUpdated", handleUserUpdated);
    };
  }, []);

  const toggleProfile = () => {
    setOpenProfile(!openProfile);
  };

  // Highlight active page
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="sidebar">
      <img src={AquaLogo} alt="Aqua Logo" className="logo" />

      <div className="sidebar-nav">
        <button
          className={isActive("/co/dashboard") ? "active" : ""}
          onClick={() => navigate("/co/dashboard")}
        >
          <FontAwesomeIcon icon={faChartLine} /> Dashboard
        </button>

        <button
          className={isActive("/co/expenses") ? "active" : ""}
          onClick={() => navigate("/co/expenses")}
        >
          <FontAwesomeIcon icon={faMoneyBill} /> Expenses
        </button>

        <button
          className={isActive("/co/sales") ? "active" : ""}
          onClick={() => navigate("/co/sales")}
        >
          <FontAwesomeIcon icon={faChartPie} /> Sales
        </button>

        <button
          className={isActive("/co/inventory") ? "active" : ""}
          onClick={() => navigate("/co/inventory")}
        >
          <FontAwesomeIcon icon={faBox} /> Inventory
        </button>

        <button
          className={isActive("/co/insights") ? "active" : ""}
          onClick={() => navigate("/co/insights")}
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} /> Insights
        </button>
      </div>

      <div className="sidebar-bottom">
        <div className="admin-profile" onClick={toggleProfile}>
          <img src={Profile} alt="Admin Profile" />

          <div>
            <p className="name">{user?.name || "User"}</p>
            <p className="role">Co-Associate</p>
          </div>
        </div>
      </div>
    </div>
  );
}
