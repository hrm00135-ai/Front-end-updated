const Navbar = () => {
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
      <h1>Admin Panel</h1>

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

      {/* Right */}
      <div>Profile</div>
    </div>
  );
};

export default Navbar;