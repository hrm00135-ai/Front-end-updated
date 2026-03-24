import { getUser, logout } from "../utils/api";

const Navbar = () => {
  const user = getUser();

  return (
    <div
      style={{
        height: "60px",
        background: "white",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        gap: "20px",
      }}
    >
      {/* Left */}
      <h1 style={{ fontSize: "18px", fontWeight: "bold" }}>
        {user?.role === "employee" ? "Employee Panel" : "Admin Panel"}
      </h1>

      {/* Center - Search */}
      <input
        type="text"
        placeholder="Search..."
        style={{
          flex: 1,
          maxWidth: "400px",
          padding: "8px 12px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />

      {/* Right - User Info + Logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ textAlign: "right", fontSize: "14px" }}>
          <div style={{ fontWeight: "600" }}>
            {user?.first_name} {user?.last_name}
          </div>
          <div style={{ color: "#64748b", fontSize: "12px" }}>
            {user?.employee_id} • {user?.role?.replace("_", " ")}
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            padding: "6px 14px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Navbar;