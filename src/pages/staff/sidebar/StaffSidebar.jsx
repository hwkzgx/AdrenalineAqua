import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./staff-sidebar.css";

import AquaLogo from "../../../assets/AquaLogo.png";
import Profile from "../../../assets/Profile.png";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faMoneyBill,
  faShoppingCart,
  faTruck,
  faChartPie,
  faBox,
  faUser,
  faArrowRightFromBracket,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";

export default function StaffSidebar() {
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

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="sidebar">
      <img src={AquaLogo} alt="Aqua Logo" className="logo" />

      <div className="sidebar-top">
        <button
          className={isActive("/staff/dashboard") ? "active" : ""}
          onClick={() => navigate("/staff/dashboard")}
        >
          <FontAwesomeIcon icon={faChartLine} /> Dashboard
        </button>

        <button
          className={isActive("/staff/orders") ? "active" : ""}
          onClick={() => navigate("/staff/orders")}
        >
          <FontAwesomeIcon icon={faShoppingCart} /> Orders
        </button>

        <button
          className={isActive("/staff/delivery-schedule") ? "active" : ""}
          onClick={() => navigate("/staff/delivery-schedule")}
        >
          <FontAwesomeIcon icon={faTruck} /> Delivery Schedule
        </button>

        <button
          className={isActive("/staff/inventory") ? "active" : ""}
          onClick={() => navigate("/staff/inventory")}
        >
          <FontAwesomeIcon icon={faBox} /> Inventory
        </button>

        <button
          className={isActive("/staff/sales") ? "active" : ""}
          onClick={() => navigate("/staff/sales")}
        >
          <FontAwesomeIcon icon={faChartPie} /> Sales
        </button>

        <button
          className={isActive("/staff/insights") ? "active" : ""}
          onClick={() => navigate("/staff/insights")}
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} /> Insights
        </button>

        <button
          className={isActive("/staff/customers") ? "active" : ""}
          onClick={() => navigate("/staff/customers")}
        >
          <FontAwesomeIcon icon={faUser} /> Customers
        </button>
      </div>

      <div className="sidebar-bottom">
        <div className="admin-profile" onClick={toggleProfile}>
          <img src={Profile} alt="Staff Profile" />
          <div>
            <p className="name">{user?.name || "Staff"}</p>
            <p className="role">Staff</p>
          </div>
        </div>
      </div>
    </div>
  );
}