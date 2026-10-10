import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Chat from "../../components/Chat";
import { supabase } from "../../supabase";

import {
  faBell,
  faCircleUser,
  faUser,
  faRightFromBracket,
  faCheckDouble,
  faMessage,
  faBars,
} from "@fortawesome/free-solid-svg-icons";

import AdminSidebar from "../../pages/admin/sidebar/AdminSidebar";
import CoSidebar from "../../pages/co-assoc/sidebar/CoSidebar";
import StaffSidebar from "../../pages/staff/sidebar/StaffSidebar";

import AquaLogo from "../../assets/AquaLogo.png";
import { clearInsightsStorage } from "../../services/aiInsightsService";


import "./dashboard-layout.css";

const CO_ROLES = ["co", "co_associate", "co-associate"];

export default function DashboardLayout() {
  const [openProfile, setOpenProfile] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const [activeTab, setActiveTab] = useState("unread");

  const [currentUserId, setCurrentUserId] = useState(null);

  const [openMessages, setOpenMessages] = useState(false);
  const [internalUsers, setInternalUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unreadMessagesByUser, setUnreadMessagesByUser] = useState({});
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [conversationMeta, setConversationMeta] = useState({});

  const [userRole, setUserRole] = useState("staff");
  const [loadingRole, setLoadingRole] = useState(true);

  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ----- MOBILE SIDEBAR -----
  const [openSidebar, setOpenSidebar] = useState(false);

  const navigate = useNavigate();

  // isara ang sidebar kapag lumaki ang screen
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setOpenSidebar(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // huwag mag-scroll ang page sa likod habang bukas ang sidebar
  useEffect(() => {
    document.body.style.overflow = openSidebar ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [openSidebar]);

  // =========================================================
  // GET USER ROLE
  // =========================================================
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

      const storedRole =
        localStorage.getItem("userRole") || localStorage.getItem("role");

      if (storedRole) {
        setUserRole(storedRole.toLowerCase());
      }

      setLoadingRole(false);
    };

    fetchUserRole();
  }, []);

  // =========================================================
  // NOTIFICATIONS
  // =========================================================
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

          const isCoAssociate = CO_ROLES.includes(userRole);

          const isForCurrentRole =
            newNotif.target_role === userRole ||
            newNotif.target_role === "all" ||
            (isCoAssociate && CO_ROLES.includes(newNotif.target_role));

          if (isForCurrentRole) {
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

    const allowedRoles = CO_ROLES.includes(currentRole)
      ? [...CO_ROLES, "all"]
      : [currentRole, "all"];

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
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  // =========================================================
  // CURRENT USER
  // =========================================================
  const loadCurrentUserId = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

    if (!storedUser.email) return;

    const { data, error } = await supabase
      .from("users")
      .select("users_id")
      .eq("email", storedUser.email)
      .single();

    if (error) {
      console.error("Current user ID error:", error.message);
      return;
    }

    setCurrentUserId(data.users_id);
  };

  useEffect(() => {
    loadCurrentUserId();
  }, []);

  // =========================================================
  // INTERNAL USERS
  // =========================================================
  const loadInternalUsers = async () => {
    let rolesToLoad = [];

    if (userRole === "admin") {
      rolesToLoad = ["staff", "co"];
    } else if (userRole === "staff") {
      rolesToLoad = ["admin"];
    } else if (userRole === "co" || userRole === "co_associate") {
      rolesToLoad = ["admin"];
    }

    const { data, error } = await supabase
      .from("users")
      .select("users_id, name, role")
      .in("role", rolesToLoad)
      .order("name", { ascending: true });

    if (error) {
      console.error("Load internal users error:", error.message);
      return;
    }

    setInternalUsers(data || []);
  };

  useEffect(() => {
    if (!loadingRole) {
      loadInternalUsers();
    }
  }, [userRole, loadingRole]);

  // =========================================================
  // MESSAGE INBOX
  // =========================================================
  const loadMessageInbox = async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("messages")
      .select(
        "messages_id, sender_id, receiver_id, message, is_read, created_at, message_type"
      )
      .eq("message_type", "internal")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Load message inbox error:", error.message);
      return;
    }

    const unreadMap = {};
    const metaMap = {};
    const me = String(currentUserId);

    (data || []).forEach((msg) => {
      const sender = String(msg.sender_id);
      const receiver = String(msg.receiver_id);

      let otherUserId = null;

      if (sender === me) {
        otherUserId = receiver;
      } else if (receiver === me) {
        otherUserId = sender;
      }

      if (!otherUserId) return;

      if (!metaMap[otherUserId]) {
        metaMap[otherUserId] = {
          message: msg.message,
          created_at: msg.created_at,
          sender_id: msg.sender_id,
        };
      }

      if (receiver === me && msg.is_read === false) {
        unreadMap[otherUserId] = (unreadMap[otherUserId] || 0) + 1;
      }
    });

    setUnreadMessagesByUser(unreadMap);
    setConversationMeta(metaMap);
    setUnreadMessageCount(
      Object.values(unreadMap).reduce((total, count) => total + count, 0)
    );
  };

  const markConversationAsRead = async (otherUserId) => {
    if (!currentUserId || !otherUserId) return;

    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("message_type", "internal")
      .eq("sender_id", otherUserId)
      .eq("receiver_id", currentUserId)
      .eq("is_read", false);

    if (error) {
      console.error("Mark messages as read error:", error.message);
      return;
    }

    await loadMessageInbox();
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();

    const sameDay =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (sameDay) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    if (currentUserId) {
      loadMessageInbox();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`internal-message-inbox-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new;

          if (newMessage.message_type !== "internal") return;

          const sender = String(newMessage.sender_id);
          const receiver = String(newMessage.receiver_id);
          const me = String(currentUserId);

          if (sender !== me && receiver !== me) return;

          if (
            selectedUser &&
            String(selectedUser.users_id) === sender &&
            receiver === me
          ) {
            await markConversationAsRead(selectedUser.users_id);
            return;
          }

          await loadMessageInbox();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, selectedUser]);

  // =========================================================
  // SIDEBAR
  // =========================================================
  const SidebarMap = {
    admin: AdminSidebar,
    co: CoSidebar,
    co_associate: CoSidebar,
    staff: StaffSidebar,
  };

  const Sidebar = SidebarMap[userRole] || StaffSidebar;

  const filteredNotifs = notifications.filter((n) =>
    activeTab === "unread" ? !n.is_read : n.is_read
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getRoleLabel = (role) => {
    if (role === "co" || role === "co_associate") return "Co-Associate";
    if (role === "staff") return "Staff";
    if (role === "admin") return "Admin";
    return role;
  };

  const closeAllDropdowns = () => {
    setOpenNotif(false);
    setOpenProfile(false);
    setOpenMessages(false);
  };

  const sortedInternalUsers = [...internalUsers].sort((a, b) => {
    const timeA = conversationMeta[String(a.users_id)]?.created_at;
    const timeB = conversationMeta[String(b.users_id)]?.created_at;

    if (!timeA && !timeB) return a.name.localeCompare(b.name);
    if (!timeA) return 1;
    if (!timeB) return -1;

    return new Date(timeB) - new Date(timeA);
  });

  // =========================================================
  // UI
  // =========================================================
  return (
    <div className={`layout ${openSidebar ? "sidebar-open" : ""}`}>
      {/* ================= SIDEBAR ================= */}
      <div
        className="sidebar-shell"
        onClick={(e) => {
          // isara ang sidebar kapag may pinindot na menu button
          if (e.target.closest("button, a")) setOpenSidebar(false);
        }}
      >
        <Sidebar />
      </div>

      {/* dark overlay (mobile lang) */}
      <div className="sidebar-overlay" onClick={() => setOpenSidebar(false)} />

      <div className="main">
        {/* ================= TOPBAR ================= */}
        <div className="topbar">
          {/* logo (mobile lang) */}
          <img src={AquaLogo} alt="Aqua Logo" className="topbar-logo" />

          <div className="topbar-right">
            {/* ================= MESSAGES ================= */}
            <div className="profile-wrapper">
              <div
                className="icon-btn"
                style={{ position: "relative" }}
                onClick={() => {
                  const next = !openMessages;
                  closeAllDropdowns();
                  setOpenMessages(next);
                }}
              >
                <FontAwesomeIcon icon={faMessage} />

                {unreadMessageCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-7px",
                      minWidth: "17px",
                      height: "17px",
                      padding: "0 4px",
                      borderRadius: "999px",
                      background: "#ef4444",
                      color: "#fff",
                      fontSize: "10px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid white",
                    }}
                  >
                    {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                  </span>
                )}
              </div>

              {openMessages && (
                <div className="dropdown-panel">
                  <div
                    style={{
                      padding: "12px 14px",
                      fontWeight: "700",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Messages
                  </div>

                  <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                    {internalUsers.length === 0 ? (
                      <div
                        style={{
                          padding: "16px",
                          color: "#64748b",
                          fontSize: "13px",
                          textAlign: "center",
                        }}
                      >
                        No internal users found.
                      </div>
                    ) : (
                      sortedInternalUsers.map((user) => {
                        const unreadForUser =
                          unreadMessagesByUser[String(user.users_id)] || 0;

                        const meta = conversationMeta[String(user.users_id)];

                        return (
                          <div
                            key={user.users_id}
                            onClick={() => {
                              setSelectedUser(user);
                              setOpenMessages(false);
                              markConversationAsRead(user.users_id);
                            }}
                            style={{
                              padding: "12px 14px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9",
                              background:
                                unreadForUser > 0 ? "#f8fafc" : "#ffffff",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: unreadForUser > 0 ? "700" : "600",
                                  color: "#111827",
                                }}
                              >
                                {user.name}
                              </div>

                              {meta?.created_at && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: "#94a3b8",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatMessageTime(meta.created_at)}
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                fontSize: "12px",
                                color: "#64748b",
                                marginTop: "2px",
                              }}
                            >
                              {getRoleLabel(user.role)}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "10px",
                                marginTop: "5px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: unreadForUser > 0 ? "#334155" : "#94a3b8",
                                  fontWeight: unreadForUser > 0 ? "600" : "400",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "220px",
                                }}
                              >
                                {meta?.message || "No messages yet"}
                              </div>

                              {unreadForUser > 0 && (
                                <span
                                  style={{
                                    minWidth: "19px",
                                    height: "19px",
                                    padding: "0 5px",
                                    borderRadius: "999px",
                                    background: "#ef4444",
                                    color: "#fff",
                                    fontSize: "10px",
                                    fontWeight: "700",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  {unreadForUser > 99 ? "99+" : unreadForUser}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ================= NOTIFICATIONS ================= */}
            <div className="profile-wrapper">
              <div
                className={`icon-btn ${unreadCount > 0 ? "has-notif" : ""}`}
                onClick={() => {
                  const next = !openNotif;
                  closeAllDropdowns();
                  setOpenNotif(next);
                }}
              >
                <FontAwesomeIcon icon={faBell} />
              </div>

              {openNotif && (
                <div className="dropdown-panel notif-panel">
                  <div
                    className={`notif-tabs ${
                      activeTab === "read" ? "tab-is-read" : ""
                    }`}
                  >
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
                          className={`notif-item ${
                            !notif.is_read ? "unread" : ""
                          }`}
                          onClick={() => {
                            if (!notif.is_read) {
                              handleMarkAsRead(notif.id);
                            }
                          }}
                        >
                          <p className="notif-message">
                            {notif.message.replace(/\s*\[STATE:.*?\]\s*$/, "")}
                          </p>

                          <small className="notif-time">
                            {notif.created_at
                              ? new Date(notif.created_at).toLocaleString()
                              : ""}
                          </small>
                        </div>
                      ))
                    )}
                  </div>

                  {activeTab === "unread" && unreadCount > 0 && (
                    <div className="notif-footer">
                      <button onClick={handleMarkAllAsRead}>
                        <FontAwesomeIcon icon={faCheckDouble} /> Mark all as
                        read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ================= PROFILE ================= */}
            <div className="profile-wrapper">
              <div
                className="icon-btn"
                onClick={() => {
                  const next = !openProfile;
                  closeAllDropdowns();
                  setOpenProfile(next);
                }}
              >
                <FontAwesomeIcon icon={faCircleUser} />
              </div>

              {openProfile && (
                <div className="dropdown-panel">
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      if (userRole === "admin") {
                        navigate("/admin/profile");
                      } else if (
                        userRole === "co_associate" ||
                        userRole === "co"
                      ) {
                        navigate("/co/profile");
                      } else {
                        navigate("/staff/profile");
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faUser} /> My Profile
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

            {/* hamburger (mobile lang) - nasa kanan */}
            <button
              className="hamburger-btn"
              onClick={() => setOpenSidebar(true)}
              aria-label="Open menu"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <Outlet context={{ role: userRole }} />

        {/* ================= INTERNAL CHAT ================= */}
        {selectedUser && (
          <div
            className="internal-chat-popup"
            style={{
              position: "fixed",
              bottom: "20px",
              right: "20px",
              zIndex: 9999,
              width: "360px",
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              padding: "16px",
            }}
          >
            <Chat
              currentUserId={currentUserId}
              otherUserId={selectedUser.users_id}
              otherUserName={selectedUser.name}
              otherUserRole={getRoleLabel(selectedUser.role)}
              messageType="internal"
              onClose={() => setSelectedUser(null)}
            />
          </div>
        )}
      </div>

      {/* ================= LOGOUT MODAL ================= */}
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
                  clearInsightsStorage();

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
