import { Link, useLocation } from "react-router-dom";
import { getUser, BASE_URL } from "../utils/api";

const Sidebar = ({ onNavClick }) => {
  const user = getUser();
  const location = useLocation();
  const role = user?.role;
  const isAdmin = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";

  const photoUrl = user?.photo_url
    ? user.photo_url.startsWith("http") ? user.photo_url : `${BASE_URL}/${user.photo_url}`
    : `https://ui-avatars.com/api/?name=${user?.first_name || "U"}+${user?.last_name || ""}&background=3b82f6&color=fff&size=40`;

  const isActive = (path) => location.pathname === path;

  const linkStyle = (path) => ({
    color: isActive(path) ? "#60a5fa" : "#cbd5e1",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 12px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: isActive(path) ? "600" : "400",
    background: isActive(path) ? "rgba(96,165,250,0.12)" : "transparent",
    transition: "background 0.15s, color 0.15s",
    borderLeft: isActive(path) ? "3px solid #60a5fa" : "3px solid transparent",
  });

  const sectionLabel = {
    fontSize: "10px",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontWeight: "700",
    padding: "16px 12px 6px",
    display: "block",
  };

  const NavLink = ({ to, icon, children }) => (
    <li>
      <Link to={to} style={linkStyle(to)} onClick={onNavClick}>
        <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>{icon}</span>
        {children}
      </Link>
    </li>
  );

  return (
    <div
      style={{
        width: "220px",
        minWidth: "220px",
        background: "#1e293b",
        color: "white",
        padding: "16px 10px",
        overflowY: "auto",
        height: "100%",
        boxSizing: "border-box",
        borderRadius: "12px",
      }}
    >
      {/* User Avatar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "4px 8px 14px",
          borderBottom: "1px solid #334155",
          marginBottom: "6px",
        }}
      >
        <img
          src={photoUrl}
          alt=""
          style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: "2px solid #475569", flexShrink: 0 }}
        />
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", lineHeight: "1.2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user?.first_name} {user?.last_name?.charAt(0)}.
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>
            {isAdmin ? (isSuperAdmin ? "Super Admin" : "Admin") : "Employee"}
          </div>
        </div>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {isAdmin && (
          <>
            <span style={sectionLabel}>Overview</span>
            <NavLink to="/admin" icon="🏠">Dashboard</NavLink>
            <NavLink to="/admin/employees" icon="👥">Employees</NavLink>

            <span style={sectionLabel}>Work</span>
            <NavLink to="/admin/assign-task" icon="📋">Assign Tasks</NavLink>
            <NavLink to="/admin/attendance" icon="🕐">Attendance</NavLink>
            <NavLink to="/admin/leaves" icon="🗓️">Leaves</NavLink>

            <span style={sectionLabel}>Finance</span>
            <NavLink to="/admin/metals" icon="💎">Metal Prices</NavLink>
            <NavLink to="/admin/payments" icon="💳">Payments</NavLink>

            <span style={sectionLabel}>Admin</span>
            <NavLink to="/admin/login-activity" icon="🔑">Login Activity</NavLink>
            <NavLink to="/admin/reports" icon="📊">Reports</NavLink>
            <NavLink to="/admin/password-resets" icon="🔒">Password Resets</NavLink>
            {isSuperAdmin && (
              <NavLink to="/admin/system-logs" icon="🖥️">System Logs</NavLink>
            )}
          </>
        )}

        {!isAdmin && (
          <>
            <span style={sectionLabel}>Employee</span>
            <NavLink to="/employee" icon="🏠">Dashboard</NavLink>
            <NavLink to="/employee/tasks" icon="📋">My Tasks</NavLink>
            <NavLink to="/employee/attendance" icon="🕐">Attendance</NavLink>
            <NavLink to="/employee/leaves" icon="🗓️">Leaves</NavLink>
            <NavLink to="/employee/documents" icon="📄">Documents</NavLink>

            <span style={sectionLabel}>Finance</span>
            <NavLink to="/employee/payments" icon="💳">My Payments</NavLink>

            <span style={sectionLabel}>Account</span>
            <NavLink to="/employee/profile" icon="👤">My Profile</NavLink>
          </>
        )}
      </ul>
    </div>
  );
};

export default Sidebar;
