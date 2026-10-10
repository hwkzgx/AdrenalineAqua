import "./customer-topbar.css";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import AquaLogo from "../../assets/AquaLogo.png";
import { supabase } from "../../supabase";
import { clearInsightsStorage } from "../../services/aiInsightsService";


import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faUser,
  faKey,
  faRightFromBracket,
  faCheckDouble,
  faCircleUser,
  faCheck,
  faBars,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

export default function CustomerTopbar() {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [openNotif, setOpenNotif] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("unread");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // NOTIFICATION STATES
  const [notifications, setNotifications] = useState([]);
  const role = "customer";

  // FETCH NOTIFICATIONS FROM SUPABASE
  // notifications.user_id = users.users_id (bigint)
  const fetchNotifications = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.users_id) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.users_id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time listener para sa bagong notifications
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.users_id) return;

    const channel = supabase
      .channel("customer-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.users_id}`,
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
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  // MARK ALL AS READ
  const markAllAsRead = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.users_id) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.users_id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // FILTERED NOTIFICATIONS
  const filteredNotifs = notifications.filter((n) =>
    activeTab === "unread" ? !n.is_read : n.is_read
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const navItems = [
    { to: "/customer/dashboard", label: "Dashboard" },
    { to: "/customer/make-order", label: "Make Order" },
    { to: "/customer/track-order", label: "Track Order" },
    { to: "/customer/order-history", label: "Order History" },
    { to: "/customer/insights", label: "Insights" },
  ];

  return (
    <>
      <header className="customer-topbar">

        {/* LOGO */}
        <div className="customer-topbar-logo">
          <img src={AquaLogo} alt="Aqua Logo" />
        </div>

        {/* LINKS (desktop) */}
        <nav className="ctopbar-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
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
                setMobileMenuOpen(false);
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
                        key={notif.id}
                        className={`notif-item ${!notif.is_read ? "unread" : ""}`}
                        onClick={() => !notif.is_read && markAsRead(notif.id)}
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
                setMobileMenuOpen(false);
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

          {/* HAMBURGER (mobile only) */}
          <div
            className="icon-btn hamburger-btn"
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              setOpenNotif(false);
              setOpenProfile(false);
            }}
          >
            <FontAwesomeIcon icon={mobileMenuOpen ? faXmark : faBars} />
          </div>

        </div>

      </header>

      {/* MOBILE NAV DRAWER */}
      <div className={`mobile-nav-panel ${mobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-nav-brand">
          <img src={AquaLogo} alt="Aqua Logo" />
          <span>Adrenaline Aqua</span>
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      {mobileMenuOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

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
                  clearInsightsStorage();
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
