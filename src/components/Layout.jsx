import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useEffect } from "react";
import { getUser } from "../utils/api";

const Layout = ({ children, topBar }) => {
  const user = getUser();

  useEffect(() => {
    if (user) {
      const roleName =
        user.role === "super_admin"
          ? "Super Admin"
          : user.role === "admin"
          ? "Admin"
          : "Employee";

      document.title = `Shikha Jewellery - ${roleName}`;
    } else {
      document.title = "Shikha Jewellery";
    }
  }, [user]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Navbar (Top) */}
      <div style={{ padding: "16px 20px" }}>
        <Navbar />
      </div>

      {/* Main Layout */}
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: "0 20px 20px 20px",
          gap: "20px",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: "240px",
            background: "#1e293b",
            borderRadius: "12px",
            padding: "16px 0",
            height: "fit-content",
          }}
        >
          <Sidebar />
        </div>

        {/* Right Section */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Top Bar (Metal Bar FIXED spacing) */}
          {topBar && (
            <div
              style={{
                background: "#0f172a",
                color: "white",
                padding: "12px 16px",
                borderRadius: "10px",
              }}
            >
              {topBar}
            </div>
          )}

          {/* Main Content */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              minHeight: "70vh",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;