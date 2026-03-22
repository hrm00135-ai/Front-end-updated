import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const Layout = ({ children }) => {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Navbar */}
      <Navbar />

      {/* Sidebar + Content */}
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />

        <div
          style={{
            flex: 1,
            padding: "20px",
            background: "#f1f5f9",
            overflowY: "auto",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;