import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div
      style={{
        width: "250px",
        background: "#1e293b",
        color: "white",
        padding: "20px",
      }}
    >
      {/* ✅ ADD THIS TITLE */}
      <h2 style={{ marginBottom: "20px" }}>Admin Panel</h2>

      <ul style={{ listStyle: "none", padding: 0 }}>
        <li style={{ marginBottom: "15px" }}>
          <Link to="/admin" style={{ color: "white", textDecoration: "none" }}>
            Dashboard
          </Link>
        </li>

        <li style={{ marginBottom: "15px" }}>
          <Link
            to="/admin/employees"
            style={{ color: "white", textDecoration: "none" }}
          >
            Employee List
          </Link>
        </li>

        <li style={{ marginBottom: "15px" }}>
          <Link
            to="/admin/assign-task"
            style={{ color: "white", textDecoration: "none" }}
          >
            Assign Task
          </Link>
        </li>

        <li>
          <Link
            to="/admin/manage"
            style={{ color: "white", textDecoration: "none" }}
          >
            Add/Delete Employee
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;