import { Link, useLocation } from "react-router-dom";
import { getUser } from "../utils/api";

const Sidebar = () => {
  const user = getUser();
  const location = useLocation();
  const role = user?.role;
  const isAdmin = role === "admin" || role === "super_admin";

  const linkStyle = (path) => ({
    color: location.pathname === path ? "#60a5fa" : "white",
    textDecoration: "none",
    display: "block",
    padding: "8px 12px",
    borderRadius: "6px",
    background: location.pathname === path ? "rgba(255,255,255,0.1)" : "transparent",
  });

  return (
    <div
      style={{
        width: "250px",
        background: "#1e293b",
        color: "white",
        padding: "20px",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>
        {isAdmin ? "Admin Panel" : "Employee Panel"}
      </h2>

      <ul style={{ listStyle: "none", padding: 0 }}>

        {/* Admin Links */}
        {isAdmin && (
          <>
            <li style={{ marginBottom: "10px" }}>
              <Link to="/admin" style={linkStyle("/admin")}>
                Dashboard
              </Link>
            </li>
            <li style={{ marginBottom: "10px" }}>
              <Link to="/admin/employees" style={linkStyle("/admin/employees")}>
                Employee List
              </Link>
            </li>
            <li style={{ marginBottom: "10px" }}>
              <Link to="/admin/assign-task" style={linkStyle("/admin/assign-task")}>
                Assign Tasks
              </Link>
            </li>
          </>
        )}

        {/* Employee Links */}
        {!isAdmin && (
          <>
            <li style={{ marginBottom: "10px" }}>
              <Link to="/employee" style={linkStyle("/employee")}>
                Dashboard
              </Link>
            </li>
          </>
        )}

      </ul>
    </div>
  );
};

export default Sidebar;