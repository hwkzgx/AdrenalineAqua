import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./admin-sidebar.css";

// Assets
import AquaLogo from "../../../assets/AquaLogo.png";
import Profile from "../../../assets/Profile.png";

// Font Awesome
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faShoppingCart,
  faTruck,
  faBox,
  faMoneyBill,
  faChartPie,
  faUsers,
  faUserTie,
  faUser,
  faUserShield,
  faMotorcycle,
  faArrowRightFromBracket,
  
} from "@fortawesome/free-solid-svg-icons";

export default function AdminSidebar() {
  const navigate = useNavigate();

  // 🔥 STATES (IMPORTANT FIX)
  const [openUsers, setOpenUsers] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // 🔥 TOGGLES (clean behavior)
  const toggleUsers = () => {
    setOpenUsers(!openUsers);
    setOpenProfile(false);
  };

  const toggleProfile = () => {
    setOpenProfile(!openProfile);
    setOpenUsers(false);
  };

  return (
    <div className="sidebar">

      {/* LOGO */}
      <img src={AquaLogo} alt="Aqua Logo" className="logo" />

      {/* MAIN NAVIGATION */}
      <button onClick={() => navigate("/admin/dashboard")}>
        <FontAwesomeIcon icon={faChartLine} /> Dashboard
      </button>

      <button onClick={() => navigate("/admin/orders")}>
        <FontAwesomeIcon icon={faShoppingCart} /> Orders
      </button>

      <button onClick={() => navigate("/admin/delivery")}>
        <FontAwesomeIcon icon={faTruck} /> Delivery
      </button>

      <button onClick={() => navigate("/admin/inventory")}>
        <FontAwesomeIcon icon={faBox} /> Inventory
      </button>

      <button onClick={() => navigate("/admin/expenses")}>
        <FontAwesomeIcon icon={faMoneyBill} /> Expenses
      </button>

      <button onClick={() => navigate("/admin/sales")}>
        <FontAwesomeIcon icon={faChartPie} /> Sales
      </button>

      {/* USERS DROPDOWN */}
      <button onClick={toggleUsers}>
        <FontAwesomeIcon icon={faUsers} /> Users ▾
      </button>

      {openUsers && (
        <div className="dropdown">

          <button onClick={() => navigate("/admin/users/co")}>
            <FontAwesomeIcon icon={faUserTie} /> Co-Associates
          </button>

          <button onClick={() => navigate("/admin/users/customer")}>
            <FontAwesomeIcon icon={faUser} /> Customers
          </button>

          <button onClick={() => navigate("/admin/users/staff")}>
            <FontAwesomeIcon icon={faUserShield} /> Staff
          </button>

          {/* 🔥 Idinagdag ang Rider dito */}
          <button onClick={() => navigate("/admin/users/rider")}>
            <FontAwesomeIcon icon={faMotorcycle} /> Riders
          </button>

        </div>
      )}

      {/* BOTTOM SECTION */}
      <div className="sidebar-bottom">

{/* ADMIN PROFILE */}
<div className="admin-profile" onClick={toggleProfile}>
  <img src={Profile} alt="Admin Profile" />

  <div>
    <p className="name"> {user?.name || "User"} </p>
    <p className="role">Administrator</p>
  </div>
</div>
      </div>
    </div>
  );
}