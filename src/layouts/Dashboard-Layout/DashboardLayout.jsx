import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { supabase } from "../../supabase";

import {
  faBell,
  faCircleUser,
  faUser,
  faRightFromBracket,
  faKey,
  faCheckDouble,
} from "@fortawesome/free-solid-svg-icons";

import AdminSidebar from "../../pages/admin/sidebar/AdminSidebar";
import CoSidebar from "../../pages/co-assoc/sidebar/CoSidebar";
import StaffSidebar from "../../pages/staff/sidebar/StaffSidebar";

import "./dashboard-layout.css";

export default function DashboardLayout() {
  const [openProfile, setOpenProfile] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const [activeTab, setActiveTab] = useState("unread");

  const [userRole, setUserRole] = useState("staff");
  const [loadingRole, setLoadingRole] = useState(true);

  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  // Kunin ang role mula sa 'user' object sa localStorage
  useEffect(() => {
    const fetchUserRole = async () => {
      setLoadingRole(true);
      
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.role) {
            setUserRole(parsedUser.role.toLowerCase());
            setLoadingRole(false);
            return;
          }
        } catch (e) {
          console.error("Error parsing user from localStorage", e);
        }
      }

      const storedRole = localStorage.getItem("userRole") || localStorage.getItem("role");
      if (storedRole) {
        setUserRole(storedRole.toLowerCase());
      }
      setLoadingRole(false);
    };

    fetchUserRole();
  }, []);

  // I-fetch ang notifications base sa role at makinig sa Realtime
  useEffect(() => {
    if (loadingRole) return;

    fetchNotifications(userRole);

    const channel = supabase
      .channel("role-notifications-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = payload.new;
          if (
            newNotif.target_role === userRole ||
            newNotif.target_role === "all"
          ) {
            setNotifications((prev) => [newNotif, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, loadingRole]);

  const fetchNotifications = async (currentRole) => {
    setLoadingNotifs(true);
    let allowedRoles = [currentRole, "all"];

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .in("target_role", allowedRoles)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error.message);
    } else {
      setNotifications(data || []);
    }
    setLoadingNotifs(false);
  };

  const handleMarkAsRead = async (id) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications
      .filter((n) => !n.is_read)
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    }
  };

  const SidebarMap = {
    admin: AdminSidebar,
    co: CoSidebar,
    staff: StaffSidebar,
  };

  const Sidebar = SidebarMap[userRole] || StaffSidebar;

  const filteredNotifs = notifications.filter((n) =>
    activeTab === "unread" ? !n.is_read : n.is_read
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="layout">
      <Sidebar />

      <div className="main">
        <div className="topbar">
          <div className="topbar-right">
            <div className="profile-wrapper">
              <div
                  className={`icon-btn ${unreadCount > 0 ? "has-notif" : ""}`}
                  onClick={() => {
                    setOpenNotif(!openNotif);
                    setOpenProfile(false);
                  }}
                >
                  <FontAwesomeIcon icon={faBell} />
                </div>

              {openNotif && (
                <div className="dropdown-panel notif-panel">
                  <div className={`notif-tabs ${activeTab === "read" ? "tab-is-read" : ""}`}>
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
                    {loadingNotifs || loadingRole ? (
                      <div className="notif-placeholder">Loading...</div>
                    ) : filteredNotifs.length === 0 ? (
                      <div className="notif-placeholder">
                        {activeTab === "unread"
                          ? "No new notifications"
                          : "No read notifications"}
                      </div>
                    ) : (
                      filteredNotifs.map((notif) => (
                        <div
                          key={notif.id}
                          className={`notif-item ${!notif.is_read ? "unread" : ""}`}
                          onClick={() => {
                            if (!notif.is_read) handleMarkAsRead(notif.id);
                          }}
                        >
                          <p className="notif-message">{notif.message}</p>
                          <small className="notif-time">
                            {notif.created_at ? new Date(notif.created_at).toLocaleString() : ""}
                          </small>
                        </div>
                      ))
                    )}
                  </div>

                  {activeTab === "unread" && unreadCount > 0 && (
                    <div className="notif-footer">
                      <button onClick={handleMarkAllAsRead}>
                        <FontAwesomeIcon icon={faCheckDouble} /> Mark all as read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                      if (userRole === "admin") navigate("/admin/profile");
                      else if (userRole === "co") navigate("/co/profile");
                      else navigate("/staff/profile");
                    }}
                  >
                    <FontAwesomeIcon icon={faUser} /> My Profile
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => navigate("/reset-password")}
                  >
                    <FontAwesomeIcon icon={faKey} /> Change Password
                  </div>

                  <div
                    className="dropdown-item admin-logout"
                    onClick={() => setShowLogoutModal(true)}
                  >
                    <FontAwesomeIcon icon={faRightFromBracket} /> Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Outlet context={{ role: userRole }} />
      </div>

      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-logout-btn"
                onClick={() => {
                  localStorage.removeItem("user");
                  localStorage.removeItem("token");
                  localStorage.removeItem("userRole");
                  localStorage.removeItem("role");
                  setShowLogoutModal(false);
                  navigate("/login");
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}