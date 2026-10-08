import React, { useState, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "../../../supabase";
import "./rider-topbar.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faUser,
  faKey,
  faRightFromBracket,
  faCheckDouble,
  faCircleUser,
  faArrowLeft,
  faShoppingCart
} from "@fortawesome/free-solid-svg-icons";

export default function RiderTopbar({ title, showBackBtn = false, onBack }) {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [openNotif, setOpenNotif] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("unread");

  // NOTIFICATION STATES
  const [notifications, setNotifications] = useState([]);

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

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.users_id) return;

    const channel = supabase
      .channel("rider-notifications")
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

  return (
    <>
      <header className="ridertopbar customer-topbar">
        {/* LEFT TITLE / BACK BUTTON */}
        <div className="ridertopbar-left">
          {showBackBtn && (
            <button
              onClick={onBack || (() => navigate(-1))}
              className="icon-btn"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
          )}
          <h2 className="topbar-title">{title}</h2>
        </div>

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
                    Unread
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
                        <div className="notif-item-content">
                          <FontAwesomeIcon icon={faShoppingCart} className="notif-icon-item" />
                          <div>
                            <p>
  {notif.message.replace(/\s*\[STATE:.*?\]\s*$/, "")}
</p>
                            <span className="notif-time">
                              {new Date(notif.created_at).toLocaleString([], {
                                month: "numeric",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="notif-placeholder">
                      {activeTab === "unread" ? "No new notifications" : "No read notifications"}
                    </div>
                  )}
                </div>

                {/* Mark all as read button: Lalabas basta't naka-UNREAD tab */}
                {activeTab === "unread" && (
                  <div className="notif-footer-action">
                    <button className="mark-all-btn-footer" onClick={markAllAsRead}>
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
                    navigate("/rider/profile");
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
                  navigate("/rider/riderlogin");
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
