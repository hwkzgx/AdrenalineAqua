import "./customer-topbar.css";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import AquaLogo from "../../assets/AquaLogo.png";
import { supabase } from "../../supabase";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faUser,
  faKey,
  faRightFromBracket,
  faCheckDouble,
  faCircleUser,
  faCheck
} from "@fortawesome/free-solid-svg-icons";

export default function CustomerTopbar() {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [openNotif, setOpenNotif] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("unread");

  // NOTIFICATION STATES
  const [notifications, setNotifications] = useState([]);
  const role = "customer";

  // FETCH NOTIFICATIONS FROM SUPABASE
  const fetchNotifications = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time listener para sa bagong notifications
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    const channel = supabase
      .channel("customer-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.user_id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // MARK SINGLE NOTIFICATION AS READ
  const markAsRead = async (id) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("notification_id", id);

    setNotifications(
      notifications.map((n) =>
        n.notification_id === id ? { ...n, is_read: true } : n
      )
    );
  };

  // MARK ALL AS READ
  const markAllAsRead = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.user_id)
      .eq("is_read", false);

    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
  };

  // FILTERED NOTIFICATIONS
  const filteredNotifs = notifications.filter((n) =>
    activeTab === "unread" ? !n.is_read : n.is_read
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <header className="customer-topbar">

        {/* LOGO */}
        <div className="customer-topbar-logo">
          <img src={AquaLogo} alt="Aqua Logo" />
        </div>

        {/* LINKS */}
        <nav className="ctopbar-links">
          <NavLink to="/customer/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
          <NavLink to="/customer/make-order" className={({ isActive }) => (isActive ? "active" : "")}>
            Make Order
          </NavLink>
          <NavLink to="/customer/track-order" className={({ isActive }) => (isActive ? "active" : "")}>
            Track Order
          </NavLink>
          <NavLink to="/customer/order-history" className={({ isActive }) => (isActive ? "active" : "")}>
            Order History
          </NavLink>
          <NavLink to="/customer/about-us" className={({ isActive }) => (isActive ? "active" : "")}>
            About Us
          </NavLink>
          <NavLink to="/customer/contact-us" className={({ isActive }) => (isActive ? "active" : "")}>
            Contact Us
          </NavLink>
        </nav>

        {/* RIGHT ICONS */}
        <div className="ctopbar-buttons">

          {/* NOTIFICATIONS */}
          <div className="profile-wrapper">
            <div
              className="icon-btn"
              onClick={() => {
                setOpenNotif(!openNotif);
                setOpenProfile(false);
              }}
            >
              <FontAwesomeIcon icon={faBell} />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </div>

            {openNotif && (
              <div className="dropdown-panel notif-panel">
                <div className="notif-tabs">
                  <span
                    className={activeTab === "unread" ? "active" : ""}
                    onClick={() => setActiveTab("unread")}
                  >
                    Unread ({unreadCount})
                  </span>
                  <span
                    className={activeTab === "read" ? "active" : ""}
                    onClick={() => setActiveTab("read")}
                  >
                    Read
                  </span>
                </div>

                <div className="notif-list">
                  {filteredNotifs.length > 0 ? (
                    filteredNotifs.map((notif) => (
                      <div
                        key={notif.notification_id}
                        className={`notif-item ${!notif.is_read ? "unread" : ""}`}
                        onClick={() => !notif.is_read && markAsRead(notif.notification_id)}
                      >
                        <p>{notif.message}</p>
                        <span className="notif-time">
                          {new Date(notif.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="notif-placeholder">
                      {activeTab === "unread" ? "No new notifications" : "No read notifications"}
                    </div>
                  )}
                </div>

                {activeTab === "unread" && unreadCount > 0 && (
                  <div className="notif-footer">
                    <button onClick={markAllAsRead}>
                      <FontAwesomeIcon icon={faCheckDouble} /> Mark all as read
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PROFILE */}
          <div className="profile-wrapper">
            <div
              className="icon-btn"
              onClick={() => {
                setOpenProfile(!openProfile);
                setOpenNotif(false);
              }}
            >
              <FontAwesomeIcon icon={faCircleUser} />
            </div>

            {openProfile && (
              <div className="dropdown-panel">
                <div
                  className="dropdown-item"
                  onClick={() => {
                    setOpenProfile(false);
                    navigate("/customer/customerprofile");
                  }}
                >
                  <FontAwesomeIcon icon={faUser} /> My Profile
                </div>

                <div
                  className="dropdown-item"
                  onClick={() => {
                    setOpenProfile(false);
                    navigate("/reset-password");
                  }}
                >
                  <FontAwesomeIcon icon={faKey} /> Change Password
                </div>

                <button
                  className="cus-logout-btn"
                  onClick={() => {
                    setOpenProfile(false);
                    setShowLogoutModal(true);
                  }}
                >
                  <FontAwesomeIcon icon={faRightFromBracket} /> Logout
                </button>
              </div>
            )}
          </div>

        </div>

      </header>

      {/* ================= LOGOUT MODAL ================= */}
      {showLogoutModal && (
        <div className="cus-modal-overlay">
          <div className="cus-modal-box">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>

            <div className="cus-modal-actions">
              <button
                className="cus-modal-cancel-btn"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>

              <button
                className="cus-modal-logout-btn"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  setShowLogoutModal(false);
                  navigate("/customer/home");
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE CONTENT */}
      <Outlet context={{ role }} />
    </>
  );
}