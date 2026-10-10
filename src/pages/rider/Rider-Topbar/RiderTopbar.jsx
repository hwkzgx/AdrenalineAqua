import React, { useState, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "../../../supabase";
import { clearInsightsStorage } from "../../../services/aiInsightsService";
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
      <header className="ridertopbar">
        {/* LEFT TITLE / BACK BUTTON */}
        <div className="ridertopbar-left">
          {showBackBtn && (
            <button
              onClick={onBack || (() => navigate(-1))}
              className="icon-btn"
              type="button"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
          )}
          <h2 className="topbar-title">{title}</h2>
        </div>

        {/* RIGHT ICONS */}
        <div className="ridertopbar-right">
          {/* NOTIFICATIONS */}
          <div className="riderprofile-wrapper">
            <button
              className="icon-btn"
              onClick={() => {
                setOpenNotif(!openNotif);
                setOpenProfile(false);
              }}
              type="button"
            >
              <FontAwesomeIcon icon={faBell} />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {openNotif && (
              <div className="riderdropdown-panel notif-panel">
                <div className="notif-tabs">
                  <button
                    className={`notif-tab ${activeTab === "unread" ? "active" : ""}`}
                    onClick={() => setActiveTab("unread")}
                    type="button"
                  >
                    Unread
                  </button>
                  <button
                    className={`notif-tab ${activeTab === "read" ? "active" : ""}`}
                    onClick={() => setActiveTab("read")}
                    type="button"
                  >
                    Read
                  </button>
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

                {/* Mark all as read button */}
                {activeTab === "unread" && (
                  <div className="notif-footer-action">
                    <button className="mark-all-btn-footer" onClick={markAllAsRead} type="button">
                      <FontAwesomeIcon icon={faCheckDouble} /> Mark all as read
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PROFILE */}
          <div className="riderprofile-wrapper">
            <button
              className="icon-btn"
              onClick={() => {
                setOpenProfile(!openProfile);
                setOpenNotif(false);
              }}
              type="button"
            >
              <FontAwesomeIcon icon={faCircleUser} />
            </button>

            {openProfile && (
              <div className="riderdropdown-panel">
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
                  className="dropdown-item rider-logout"
                  onClick={() => {
                    setOpenProfile(false);
                    setShowLogoutModal(true);
                  }}
                  type="button"
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
        <div className="rider-modal-overlay">
          <div className="rider-modal-box">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>

            <div className="rider-modal-actions">
              <button
                className="rider-modal-cancel-btn"
                onClick={() => setShowLogoutModal(false)}
                type="button"
              >
                Cancel
              </button>

              <button
                className="rider-modal-logout-btn"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  clearInsightsStorage();
                  setShowLogoutModal(false);
                  navigate("/rider/riderlogin");
                }}
                type="button"
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
