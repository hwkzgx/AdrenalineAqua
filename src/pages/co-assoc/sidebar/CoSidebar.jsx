import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./co-sidebar.css";

import AquaLogo from "../../../assets/AquaLogo.png";
import Profile from "../../../assets/Profile.png";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faMoneyBill,
  faChartPie,
  faBox,
  faArrowRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";

export default function CoSidebar() {
  const navigate = useNavigate();
    const [openProfile, setOpenProfile] = useState(false);
    const user = JSON.parse(localStorage.getItem("user") || "{}");


    const toggleProfile = () => {
    setOpenProfile(!openProfile);
  };
  return (
    <div className="sidebar">

    
      <img src={AquaLogo} alt="Aqua Logo" className="logo" />

      
      <button onClick={() => navigate("/co/dashboard")}>
        <FontAwesomeIcon icon={faChartLine} /> Dashboard
      </button>

      <button onClick={() => navigate("/co/expenses")}>
        <FontAwesomeIcon icon={faMoneyBill} /> Expenses
      </button>

      <button onClick={() => navigate("/co/sales")}>
        <FontAwesomeIcon icon={faChartPie} /> Sales
      </button>

      <button onClick={() => navigate("/co/inventory")}>
        <FontAwesomeIcon icon={faBox} /> Inventory
      </button>

     
      <div className="sidebar-bottom">

      
        <div className="admin-profile" onClick={toggleProfile}>
          <img src={Profile} alt="Admin Profile" />
        
          <div>
         <p className="name"> {user?.name || "User"} </p>

        <p className="role">Co-Associate</p>
      </div>
        </div>
      </div>
    </div>
  );
}