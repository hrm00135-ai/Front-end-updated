import { Trash2, ArrowRight, ArrowLeft } from "lucide-react";

const prioColor = (p) => {
  const c = { low: "#6b7280", medium: "#3b82f6", high: "#ea580c", urgent: "#dc2626" };
  return c[p] || "#6b7280";
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
  return (
    <div
      className="bg-white p-4 rounded-xl shadow mb-3"
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div onClick={onClick}>
        <h3 className="font-semibold text-gray-800 text-sm">
          {title}
        </h3>

        <p className="text-xs text-gray-500 mt-1">
          {assignee_name} {assignee_employee_id ? `(${assignee_employee_id})` : ""}
        </p>

        {category && (
          <p className="text-xs text-gray-400 mt-0.5">{category}</p>
        )}

        {description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{description.slice(0, 80)}{description.length > 80 ? "..." : ""}</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">

        <div className="flex items-center gap-2">
          {due_date && (
            <span className="text-xs border px-2 py-0.5 rounded" style={{ borderColor: "#cbd5e1", color: "#64748b" }}>
              {due_date}
            </span>
          )}
          {priority && (
            <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: `${prioColor(priority)}15`, color: prioColor(priority) }}>
              {priority}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">

          {/* Back */}
          {status !== "pending" && (
            <button onClick={(e) => { e.stopPropagation(); onMove("back"); }} className="hover:bg-gray-100 p-1 rounded" title="Move back">
              <ArrowLeft size={14} className="text-gray-500" />
            </button>
          )}

          {/* Forward */}
          {status !== "completed" && (
            <button onClick={(e) => { e.stopPropagation(); onMove("forward"); }} className="hover:bg-gray-100 p-1 rounded" title="Move forward">
              <ArrowRight size={14} className="text-gray-500" />
            </button>
          )}

          {/* Delete */}
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="hover:bg-red-50 p-1 rounded" title="Delete">
            <Trash2 size={14} className="text-red-400" />
          </button>

        </div>

      </div>

    </div>
  );
};

export default TaskCard;
