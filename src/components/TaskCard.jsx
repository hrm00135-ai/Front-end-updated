import { Trash2, ArrowRight, ArrowLeft } from "lucide-react";

const prioColor = (p) => {
  const c = { low: "#6b7280", medium: "#3b82f6", high: "#ea580c", urgent: "#dc2626" };
  return c[p] || "#6b7280";
};

const prioBg = (p) => {
  const c = { low: "#f3f4f6", medium: "#eff6ff", high: "#fff7ed", urgent: "#fef2f2" };
  return c[p] || "#f3f4f6";
};

const TaskCard = ({
  title,
  assignee_name,
  assignee_employee_id,
  priority,
  due_date,
  category,
  status,
  description,
  onDelete,
  onMove,
  onClick,
}) => {
  const isOverdue = due_date && new Date(due_date) < new Date() && status !== "completed";

  return (
    <div
      style={{
        background: "white",
        padding: "12px 14px",
        borderRadius: "10px",
        marginBottom: "10px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
        cursor: onClick ? "pointer" : "default",
        border: "1px solid #f1f5f9",
        transition: "box-shadow 0.15s, transform 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.07)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Clickable body */}
      <div onClick={onClick}>
        <h3
          style={{
            fontWeight: "700",
            fontSize: "13px",
            color: "#1e293b",
            margin: "0 0 4px",
            lineHeight: "1.4",
          }}
        >
          {title}
        </h3>

        <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 2px" }}>
          {assignee_name}
          {assignee_employee_id ? (
            <span style={{ color: "#94a3b8", marginLeft: "4px" }}>
              ({assignee_employee_id})
            </span>
          ) : null}
        </p>

        {category && (
          <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>
            {category}
          </p>
        )}

        {description && (
          <p
            style={{
              fontSize: "12px",
              color: "#94a3b8",
              margin: "6px 0 0",
              lineHeight: "1.4",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Footer row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "10px",
          paddingTop: "8px",
          borderTop: "1px solid #f8fafc",
        }}
      >
        {/* Left: date + priority */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {due_date && (
            <span
              style={{
                fontSize: "11px",
                padding: "2px 7px",
                borderRadius: "6px",
                border: `1px solid ${isOverdue ? "#fca5a5" : "#e2e8f0"}`,
                color: isOverdue ? "#dc2626" : "#64748b",
                background: isOverdue ? "#fef2f2" : "transparent",
                fontWeight: isOverdue ? "600" : "400",
              }}
            >
              {isOverdue ? "⚠ " : ""}{due_date}
            </span>
          )}
          {priority && (
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "6px",
                background: prioBg(priority),
                color: prioColor(priority),
                fontWeight: "700",
                textTransform: "capitalize",
              }}
            >
              {priority}
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {status !== "pending" && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove("back"); }}
              title="Move back"
              style={{
                background: "none",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <ArrowLeft size={13} color="#64748b" />
            </button>
          )}

          {status !== "completed" && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove("forward"); }}
              title="Move forward"
              style={{
                background: "none",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <ArrowRight size={13} color="#64748b" />
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete task"
            style={{
              background: "none",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          >
            <Trash2 size={13} color="#f87171" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
