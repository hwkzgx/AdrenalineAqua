import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./admin-sidebar.css";
import { supabase } from "../../../supabase";

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
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  // STATES
  const [openUsers, setOpenUsers] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "{}")
  );

  // Profile picture mula sa customer_profiles (null = gamitin ang default na Profile.png)
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    const loadProfilePic = async (u) => {
      if (!u) return;

      // Kunin ang users_id (kung wala sa localStorage, hanapin sa users table)
      let uid = u.users_id;

      if (!uid) {
        let lookup = supabase.from("users").select("users_id");

        if (u.email) lookup = lookup.ilike("email", String(u.email).trim());
        else if (u.user_id) lookup = lookup.eq("user_id", u.user_id);
        else return;

        const { data: found } = await lookup.limit(1).maybeSingle();
        uid = found?.users_id;
      }

      if (!uid) return;

      const { data, error } = await supabase
        .from("customer_profiles")
        .select("id_photo")
        .eq("users_id", uid)
        .maybeSingle();

      if (error) {
        console.log("Sidebar profile picture error:", error.message);
        return;
      }

      setProfilePic(data?.id_photo || null);
    };

    // Unang load
    loadProfilePic(JSON.parse(localStorage.getItem("user") || "{}"));

    const handleUserUpdated = () => {
      const updatedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );
      setUser(updatedUser);
      loadProfilePic(updatedUser);
    };

    window.addEventListener("userUpdated", handleUserUpdated);

    return () => {
      window.removeEventListener("userUpdated", handleUserUpdated);
    };
  }, []);


  const toggleUsers = () => {
    setOpenUsers(!openUsers);
    setOpenProfile(false);
  };

  const toggleProfile = () => {
    setOpenProfile(!openProfile);
    setOpenUsers(false);
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="sidebar">
      {/* LOGO */}
      <img src={AquaLogo} alt="Aqua Logo" className="logo" />

      {/* MAIN NAVIGATION */}
      <div className="sidebar-nav">
        <button
          className={isActive("/admin/dashboard") ? "active" : ""}
          onClick={() => navigate("/admin/dashboard")}
        >
          <FontAwesomeIcon icon={faChartLine} /> Dashboard
        </button>

        <button
          className={isActive("/admin/orders") ? "active" : ""}
          onClick={() => navigate("/admin/orders")}
        >
          <FontAwesomeIcon icon={faShoppingCart} /> Orders
        </button>

        <button
          className={isActive("/admin/delivery") ? "active" : ""}
          onClick={() => navigate("/admin/delivery")}
        >
          <FontAwesomeIcon icon={faTruck} /> Delivery
        </button>

        <button
          className={isActive("/admin/inventory") ? "active" : ""}
          onClick={() => navigate("/admin/inventory")}
        >
          <FontAwesomeIcon icon={faBox} /> Inventory
        </button>

        <button
          className={isActive("/admin/expenses") ? "active" : ""}
          onClick={() => navigate("/admin/expenses")}
        >
          <FontAwesomeIcon icon={faMoneyBill} /> Expenses
        </button>

        <button
          className={isActive("/admin/sales") ? "active" : ""}
          onClick={() => navigate("/admin/sales")}
        >
          <FontAwesomeIcon icon={faChartPie} /> Sales
        </button>

        <button
          className={isActive("/admin/insights") ? "active" : ""}
          onClick={() => navigate("/admin/insights")}
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} /> Insights
        </button>

        {/* USERS DROPDOWN */}
        <button
          className={isActive("/admin/users") ? "active" : ""}
          onClick={toggleUsers}
        >
          <FontAwesomeIcon icon={faUsers} /> Users ▾
        </button>

        {openUsers && (
          <div className="dropdown">
            <button
              className={isActive("/admin/users/co") ? "active" : ""}
              onClick={() => navigate("/admin/users/co")}
            >
              <FontAwesomeIcon icon={faUserTie} /> Co-Associates
            </button>

            <button
              className={isActive("/admin/users/customer") ? "active" : ""}
              onClick={() => navigate("/admin/users/customer")}
            >
              <FontAwesomeIcon icon={faUser} /> Customers
            </button>

            <button
              className={isActive("/admin/users/staff") ? "active" : ""}
              onClick={() => navigate("/admin/users/staff")}
            >
              <FontAwesomeIcon icon={faUserShield} /> Staff
            </button>

            <button
              className={isActive("/admin/users/rider") ? "active" : ""}
              onClick={() => navigate("/admin/users/rider")}
            >
              <FontAwesomeIcon icon={faMotorcycle} /> Riders
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM SECTION */}
      <div className="sidebar-bottom">
        {/* ADMIN PROFILE */}
        <div className="admin-profile" onClick={toggleProfile}>
          <img
            src={profilePic || Profile}
            alt="Admin Profile"
            style={{ objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = Profile;
            }}
          />

          <div>
            <p className="name">{user?.name || "Kenn"}</p>
            <p className="role">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
}