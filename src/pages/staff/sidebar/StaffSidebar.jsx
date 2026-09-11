import { useNavigate } from "react-router-dom";
import { useState } from "react";
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
} from "@fortawesome/free-solid-svg-icons";

export default function StaffSidebar() {
  const navigate = useNavigate();
    const [openProfile, setOpenProfile] = useState(false);
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const toggleProfile = () => {
    setOpenProfile(!openProfile);
  };
  return (
    <div className="sidebar">

    
      <img src={AquaLogo} alt="Aqua Logo" className="logo" />

      
      <button onClick={() => navigate("/staff/dashboard")}>
        <FontAwesomeIcon icon={faChartLine} /> Dashboard
      </button>

      <button onClick={() => navigate("/staff/orders")}>
        <FontAwesomeIcon icon={faShoppingCart} /> Orders
      </button>

      <button onClick={() => navigate("/staff/delivery-schedule")}>
        <FontAwesomeIcon icon={faTruck} /> Delivery Schedule
      </button>

      <button onClick={() => navigate("/staff/inventory")}>
        <FontAwesomeIcon icon={faBox} /> Inventory
      </button>

      <button onClick={() => navigate("/staff/sales")}>
        <FontAwesomeIcon icon={faChartPie} /> Sales
      </button>

     <button onClick={() => navigate("/staff/customers")}>
        <FontAwesomeIcon icon={faUser} /> Customers
      </button>


      <div className="sidebar-bottom">

      
        <div className="admin-profile" onClick={toggleProfile}>
          <img src={Profile} alt="Admin Profile" />
        
          <div>
        <p className="name"> {user?.name || "User"} </p>
        <p className="role">Staff</p>
          </div>
        </div>
      </div>
    </div>
  );
}