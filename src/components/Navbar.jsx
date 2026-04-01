import { useState, useEffect, useRef } from "react";
import { getUser, logout, apiCall, BASE_URL } from "../utils/api";
import { useNavigate } from "react-router-dom";

// ── helpers ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "read_notification_ids";

function getLocalReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveLocalReadId(id) {
  const ids = getLocalReadIds();
  ids.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function saveAllReadIds(notifications) {
  const ids = getLocalReadIds();
  notifications.forEach((n) => ids.add(n.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function mergeReadState(notifications) {
  const localReadIds = getLocalReadIds();
  return notifications.map((n) => ({
    ...n,
    is_read: n.is_read || localReadIds.has(n.id),
  }));
}

function getNotifRoute(type, role) {
  const isAdmin = role === "admin" || role === "super_admin";
  if (isAdmin) {
    const adminMap = {
      task: "/admin/assign-task",
      leave: "/admin/leaves",
      payroll: "/admin/payroll",
      attendance: "/admin/attendance",
    };
    return adminMap[type] || null;
  }
  const employeeMap = {
    task: "/employee/tasks",
    leave: "/employee/leaves",
    payroll: "/employee/payroll",
    attendance: "/employee/attendance",
  };
  return employeeMap[type] || null;
}

function extractRelatedId(notification) {
  return (
    notification.task_id ||
    notification.related_id ||
    notification.related_object_id ||
    null
  );
}

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function notifIcon(type) {
  const map = {
    task: "📋",
    leave: "🗓️",
    payroll: "💰",
    attendance: "🕐",
    system: "🔔",
  };
  return map[type] || "🔔";
}

// ── component ──────────────────────────────────────────────────────────────

const Navbar = ({ onHamburgerClick }) => {
  const user = getUser();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await apiCall("/notifications");
      const data = await res.json();
      if (data.status === "success") {
        setNotifications(mergeReadState(data.data || []));
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const handleNotificationClick = async (n) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === n.id ? { ...item, is_read: true } : item
      )
    );
    saveLocalReadId(n.id);
    setOpen(false);
    const route = getNotifRoute(n.type, user?.role);
    if (route) {
      const relatedId = extractRelatedId(n);
      const destination =
        relatedId && n.type === "task" ? `${route}?taskId=${relatedId}` : route;
      navigate(destination);
    }
    try {
      await apiCall(`/notifications/${n.id}/read`, { method: "PUT" });
    } catch (err) {
      console.error("Failed to mark notification as read on server:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    saveAllReadIds(notifications);
    try {
      await apiCall("/notifications/mark-all-read", { method: "PUT" });
    } catch (err) {
      console.error("Failed to mark all notifications as read on server:", err);
    }
  };

  const markRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    saveLocalReadId(id);
    try {
      await apiCall(`/notifications/${id}/read`, { method: "PUT" });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const photoUrl = user?.photo_url
    ? user.photo_url.startsWith("http") ? user.photo_url : `${BASE_URL}/${user.photo_url}`
    : `https://ui-avatars.com/api/?name=${user?.first_name || "U"}+${user?.last_name || ""}&background=3b82f6&color=fff&size=36`;

  return (
    <>
      <div
        style={{
          height: "60px",
          background: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          gap: "12px",
        }}
      >
        {/* ── Hamburger (mobile only) ── */}
        <button
          onClick={onHamburgerClick}
          className="hamburger-btn"
          aria-label="Open menu"
          style={{
            display: "none", // overridden by CSS on mobile
            flexShrink: 0,
            background: "none",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            width: "38px",
            height: "38px",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexDirection: "column",
            gap: "4px",
            padding: "8px",
          }}
        >
          <span style={{ display: "block", width: "18px", height: "2px", background: "#1e293b", borderRadius: "2px" }} />
          <span style={{ display: "block", width: "18px", height: "2px", background: "#1e293b", borderRadius: "2px" }} />
          <span style={{ display: "block", width: "18px", height: "2px", background: "#1e293b", borderRadius: "2px" }} />
        </button>

        {/* ── Logo / Title ── */}
        <h1
          className="navbar-title"
          style={{ fontSize: "17px", fontWeight: "800", whiteSpace: "nowrap", color: "#1e293b", margin: 0 }}
        >
          {user?.role === "employee" ? "Employee Panel" : "Admin Panel"}
        </h1>

        {/* ── Search (hidden on small phones) ── */}
        <input
          type="text"
          placeholder="Search..."
          className="navbar-search"
          style={{
            flex: 1,
            maxWidth: "380px",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            fontSize: "14px",
            outline: "none",
            background: "#f8fafc",
          }}
        />

        {/* ── Right cluster ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>

          {/* Bell */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => {
                setOpen((v) => !v);
                if (!open) fetchNotifications();
              }}
              style={{
                position: "relative",
                background: open ? "#f1f5f9" : "transparent",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                width: "38px",
                height: "38px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    background: "#ef4444",
                    color: "white",
                    borderRadius: "50%",
                    fontSize: "9px",
                    fontWeight: "700",
                    minWidth: "16px",
                    height: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {open && (
              <div
                style={{
                  position: "absolute",
                  top: "46px",
                  right: 0,
                  width: "320px",
                  background: "white",
                  borderRadius: "12px",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
                  border: "1px solid #e2e8f0",
                  zIndex: 1000,
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: "700", fontSize: "14px", color: "#1e293b" }}>
                    Notifications{" "}
                    {unreadCount > 0 && (
                      <span style={{ background: "#ef4444", color: "white", borderRadius: "10px", fontSize: "11px", padding: "1px 7px", marginLeft: "6px" }}>
                        {unreadCount}
                      </span>
                    )}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#2563eb", fontWeight: "600" }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                      <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔕</div>
                      <p style={{ fontSize: "13px" }}>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #f8fafc",
                          display: "flex",
                          gap: "12px",
                          alignItems: "flex-start",
                          cursor: "pointer",
                          background: n.is_read ? "white" : "#eff6ff",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = n.is_read ? "#f8fafc" : "#dbeafe"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = n.is_read ? "white" : "#eff6ff"; }}
                      >
                        <div style={{ fontSize: "20px", flexShrink: 0, marginTop: "1px" }}>
                          {notifIcon(n.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "13px", color: "#1e293b", fontWeight: n.is_read ? "400" : "600", lineHeight: "1.4", margin: 0 }}>
                            {n.message}
                          </p>
                          <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                        {!n.is_read && (
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb", flexShrink: 0, marginTop: "5px" }} />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
                    <button
                      onClick={() => setOpen(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#64748b" }}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User info (hidden on very small screens) */}
          <div className="navbar-user-info" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img
              src={photoUrl}
              alt=""
              style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }}
            />
            <div className="navbar-user-text" style={{ fontSize: "13px", lineHeight: "1.3" }}>
              <div style={{ fontWeight: "700", color: "#1e293b" }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ color: "#64748b", fontSize: "11px" }}>
                {user?.employee_id} · {user?.role?.replace("_", " ")}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={async () => {
              try {
                await apiCall("/attendance/check-out", { method: "POST" });
                await apiCall("/auth/logout", { method: "POST" });
              } catch (e) {}
              logout();
            }}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              padding: "7px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              whiteSpace: "nowrap",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          .hamburger-btn { display: flex !important; }
          .navbar-search { display: none !important; }
          .navbar-user-text { display: none !important; }
        }
        @media (max-width: 480px) {
          .navbar-user-info img { display: none; }
          .navbar-title { font-size: 15px !important; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
