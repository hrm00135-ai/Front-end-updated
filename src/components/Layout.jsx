import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useEffect, useState } from "react";
import { getUser } from "../utils/api";

const Layout = ({ children, topBar }) => {
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Close sidebar on route change (click away)
  useEffect(() => {
    const close = () => setSidebarOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", flexDirection: "column" }}>

      {/* ── Navbar ── */}
      <div style={{ padding: "10px 16px" }}>
        <Navbar onHamburgerClick={() => setSidebarOpen((v) => !v)} />
      </div>

      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            zIndex: 40, display: "none",
          }}
          className="mobile-overlay"
        />
      )}

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, padding: "0 16px 20px", gap: "16px" }}>

        {/* ── Sidebar (desktop: always visible; mobile: slide-in drawer) ── */}
        <div className={`sidebar-wrapper${sidebarOpen ? " sidebar-open" : ""}`}>
          <Sidebar onNavClick={() => setSidebarOpen(false)} />
        </div>

        {/* ── Content area ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>

          {topBar && (
            <div style={{ background: "#0f172a", color: "white", padding: "10px 16px", borderRadius: "10px" }}>
              {topBar}
            </div>
          )}

          <div style={{
            background: "white", borderRadius: "12px", padding: "16px",
            minHeight: "70vh", boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}>
            {children}
          </div>
        </div>
      </div>

      {/* ── Responsive CSS injected here so it lives in one file ── */}
      <style>{`
        /* ── Sidebar wrapper: desktop always visible ── */
        .sidebar-wrapper {
          width: 220px;
          min-width: 220px;
          flex-shrink: 0;
        }

        /* ── Mobile: hide sidebar off-screen, slide in on open ── */
        @media (max-width: 768px) {
          .mobile-overlay { display: block !important; }

          .sidebar-wrapper {
            position: fixed;
            top: 0;
            left: -260px;
            height: 100vh;
            width: 240px;
            z-index: 50;
            transition: left 0.25s ease;
            border-radius: 0 12px 12px 0;
            overflow-y: auto;
          }

          .sidebar-wrapper.sidebar-open {
            left: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
