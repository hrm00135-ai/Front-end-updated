import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import TaskCard from "../../components/TaskCard";
import TaskColumn from "../../components/TaskColumn";
import { Plus, X } from "lucide-react";
import { apiCall } from "../../utils/api";

// API status → column mapping
const COLUMNS = [
  { key: "pending",     title: "New Tasks" },
  { key: "in_progress", title: "In Progress" },
  { key: "on_hold",     title: "Review" },
  { key: "completed",   title: "Completed" },
];

// Move forward/back status transitions
const FORWARD = { pending: "in_progress", in_progress: "on_hold", on_hold: "completed" };
const BACK    = { in_progress: "pending", on_hold: "in_progress", completed: "on_hold" };

const AssignTask = () => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    title: "", description: "", assigned_to: "", priority: "medium",
    due_date: "", category: "", estimated_hours: "",
    quantity: "", weight_grams: "", admin_notes: "",
  });

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await apiCall("/tasks/?per_page=200");
      const data = await res.json();
      if (data.status === "success") setTasks(data.data?.tasks || []);
    } catch {} finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await apiCall("/users/?per_page=100");
      const data = await res.json();
      if (data.status === "success") setEmployees(data.data?.users?.filter(u => u.role === "employee") || []);
    } catch {}
  };

  // Create task
  const handleAddTask = async () => {
    setError(""); setSuccess("");
    if (!formData.title || !formData.assigned_to) {
      setError("Title and assigned employee are required");
      return;
    }
    setSaving(true);
    try {
      const body = { ...formData, assigned_to: parseInt(formData.assigned_to) };
      if (body.estimated_hours) body.estimated_hours = parseFloat(body.estimated_hours);
      if (body.quantity) body.quantity = parseInt(body.quantity);
      if (body.weight_grams) body.weight_grams = parseFloat(body.weight_grams);
      Object.keys(body).forEach(k => { if (body[k] === "") delete body[k]; });

      const res = await apiCall("/tasks/", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (data.status === "success") {
        setSuccess("Task created!");
        setFormData({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "", category: "", estimated_hours: "", quantity: "", weight_grams: "", admin_notes: "" });
        setShowForm(false);
        fetchTasks();
        setTimeout(() => setSuccess(""), 3000);
      } else { setError(data.message || "Failed"); }
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  // Move task (change status)
  const moveTask = async (taskId, direction) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = direction === "forward" ? FORWARD[task.status] : BACK[task.status];
    if (!newStatus) return;

    try {
      const res = await apiCall(`/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.status === "success") {
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      } else { setError(data.message); }
    } catch { setError("Move failed"); }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const res = await apiCall(`/tasks/${taskId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status === "success") {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setSuccess("Task deleted");
        setTimeout(() => setSuccess(""), 3000);
      } else { setError(data.message); }
    } catch { setError("Delete failed"); }
  };

  if (loading) {
    return <Layout><div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading tasks...</div></Layout>;
  }

  return (
    <Layout>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Assign Tasks</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Cancel" : "Add Task"}
        </button>
      </div>

      {/* Messages */}
      {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>{error} <button onClick={() => setError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button></div>}
      {success && <div style={{ background: "#dcfce7", color: "#16a34a", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>{success}</div>}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white p-5 rounded-xl shadow mb-6">
          <h3 style={{ fontWeight: "600", marginBottom: "12px" }}>New Task</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

            <FI label="Title *" value={formData.title} onChange={v => setFormData({ ...formData, title: v })} span2 />

            <FI label="Description" value={formData.description} onChange={v => setFormData({ ...formData, description: v })} span2 />

            <div>
              <label style={lbl}>Assign To *</label>
              <select value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })} style={inp}>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>)}
              </select>
            </div>

            <div>
              <label style={lbl}>Priority</label>
              <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} style={inp}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <FI label="Due Date" type="date" value={formData.due_date} onChange={v => setFormData({ ...formData, due_date: v })} />
            <FI label="Category" value={formData.category} onChange={v => setFormData({ ...formData, category: v })} placeholder="e.g. Gold Ring" />
            <FI label="Estimated Hours" type="number" value={formData.estimated_hours} onChange={v => setFormData({ ...formData, estimated_hours: v })} />
            <FI label="Weight (grams)" type="number" value={formData.weight_grams} onChange={v => setFormData({ ...formData, weight_grams: v })} />
            <FI label="Admin Notes" value={formData.admin_notes} onChange={v => setFormData({ ...formData, admin_notes: v })} span2 />
          </div>

          <button
            onClick={handleAddTask}
            disabled={saving}
            className="mt-4 bg-green-600 text-white px-5 py-2 rounded-lg font-semibold"
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Creating..." : "Create Task"}
          </button>
        </div>
      )}

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {COLUMNS.map(col => (
          <TaskColumn key={col.key} title={`${col.title} (${tasks.filter(t => t.status === col.key).length})`}>
            {tasks
              .filter(t => t.status === col.key)
              .map(task => (
                <TaskCard
                  key={task.id}
                  {...task}
                  onDelete={() => deleteTask(task.id)}
                  onMove={(dir) => moveTask(task.id, dir)}
                />
              ))}
          </TaskColumn>
        ))}
      </div>

    </Layout>
  );
};

const lbl = { fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" };
const inp = { width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" };

const FI = ({ label, value, onChange, type = "text", span2 = false, placeholder = "" }) => (
  <div style={{ gridColumn: span2 ? "1 / -1" : undefined }}>
    <label style={lbl}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp} />
  </div>
);

export default AssignTask;
