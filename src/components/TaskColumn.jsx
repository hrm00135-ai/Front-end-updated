const COLUMN_COLORS = {
  "New Tasks":   { accent: "#3b82f6", bg: "#eff6ff" },
  "In Progress": { accent: "#f59e0b", bg: "#fffbeb" },
  "Review":      { accent: "#8b5cf6", bg: "#f5f3ff" },
  "Completed":   { accent: "#10b981", bg: "#ecfdf5" },
};

function getColors(title) {
  for (const key of Object.keys(COLUMN_COLORS)) {
    if (title.startsWith(key)) return COLUMN_COLORS[key];
  }
  return { accent: "#64748b", bg: "#f8fafc" };
}

const TaskColumn = ({ title, children }) => {
  const { accent, bg } = getColors(title);

  // Split "New Tasks (3)" → label + count badge
  const match = title.match(/^(.+?)\s*\((\d+)\)$/);
  const label = match ? match[1] : title;
  const count = match ? match[2] : null;

  return (
    <div
      style={{
        background: "#f1f5f9",
        padding: "14px",
        borderRadius: "14px",
        minHeight: "500px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Column header — no + button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "white",
          padding: "10px 14px",
          borderRadius: "10px",
          marginBottom: "14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          borderTop: `3px solid ${accent}`,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: accent,
            flexShrink: 0,
          }}
        />
        <h2
          style={{
            fontWeight: "700",
            fontSize: "14px",
            color: "#1e293b",
            margin: 0,
            flex: 1,
          }}
        >
          {label}
        </h2>
        {count !== null && (
          <span
            style={{
              background: bg,
              color: accent,
              fontSize: "12px",
              fontWeight: "700",
              padding: "2px 9px",
              borderRadius: "20px",
              border: `1px solid ${accent}22`,
            }}
          >
            {count}
          </span>
        )}
      </div>

      {/* Task cards */}
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default TaskColumn;
