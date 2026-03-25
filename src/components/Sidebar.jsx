import { Link, useLocation } from "react-router-dom";
import { getUser } from "../utils/api";

const Sidebar = () => {
  const user = getUser();
  const location = useLocation();
  const role = user?.role;
  const isAdmin = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";

  const linkStyle = (path) => ({
    color: location.pathname === path ? "#60a5fa" : "white",
    textDecoration: "none",
    display: "block",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "14px",
    background: location.pathname === path ? "rgba(255,255,255,0.1)" : "transparent",
  });

  const sectionLabel = (text) => ({
    fontSize: "10px",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontWeight: "700",
    padding: "16px 12px 4px",
    display: "block",
  });

  return (
    <div
      style={{
        width: "220px",
        minWidth: "220px",
        background: "#1e293b",
        color: "white",
        padding: "16px 12px",
        overflowY: "auto",
      }}
    >
      <h2 style={{ fontSize: "16px", fontWeight: "700", padding: "0 12px 8px", borderBottom: "1px solid #334155", marginBottom: "8px" }}>
        {isAdmin ? "Admin Panel" : "Employee Panel"}
      </h2>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>

        {isAdmin && (
          <>
            <span style={sectionLabel("Overview")}>Overview</span>
            <li><Link to="/admin" style={linkStyle("/admin")}>Dashboard</Link></li>
            <li><Link to="/admin/employees" style={linkStyle("/admin/employees")}>Employees</Link></li>

            <span style={sectionLabel("Work")}>Work</span>
            <li><Link to="/admin/assign-task" style={linkStyle("/admin/assign-task")}>Tasks</Link></li>
            <li><Link to="/admin/attendance" style={linkStyle("/admin/attendance")}>Attendance</Link></li>
            <li><Link to="/admin/leaves" style={linkStyle("/admin/leaves")}>Leaves</Link></li>

            <span style={sectionLabel("Finance")}>Finance</span>
            <li><Link to="/admin/payroll" style={linkStyle("/admin/payroll")}>Payroll</Link></li>
            <li><Link to="/admin/metals" style={linkStyle("/admin/metals")}>Metal Prices</Link></li>

            <span style={sectionLabel("Admin")}>Admin</span>
            <li><Link to="/admin/reports" style={linkStyle("/admin/reports")}>Reports</Link></li>
            <li><Link to="/admin/password-resets" style={linkStyle("/admin/password-resets")}>Password Resets</Link></li>

            {isSuperAdmin && (
              <li><Link to="/admin/system-logs" style={linkStyle("/admin/system-logs")}>System Logs</Link></li>
            )}
          </>
        )}

        {!isAdmin && (
          <>
            <li style={{ marginBottom: "10px" }}>
              <Link to="/employee" style={linkStyle("/employee")}>Dashboard</Link>
            </li>
          </>
        )}

      </ul>
    </div>
  );
};

export default Sidebar;
