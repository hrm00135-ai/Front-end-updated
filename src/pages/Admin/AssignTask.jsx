import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import TaskCard from "../../components/TaskCard";
import TaskColumn from "../../components/TaskColumn";
import { Plus, X, Send, Edit3, Save } from "lucide-react";
import { apiCall } from "../../utils/api";
import AdminTopBar from "../../components/AdminTopBar";

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

  // Task detail modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [editingTask, setEditingTask] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  // Fetch task detail with comments
  const fetchTaskDetail = async (taskId) => {
    setLoadingDetail(true);
    try {
      const res = await apiCall(`/tasks/${taskId}`);
      const data = await res.json();
      if (data.status === "success") {
        setTaskDetail(data.data);
        setComments(data.data?.comments || []);
      }
    } catch {} finally { setLoadingDetail(false); }
  };

  const openTaskDetail = (task) => {
    setSelectedTask(task.id);
    setEditingTask(false);
    fetchTaskDetail(task.id);
  };

  const closeTaskDetail = () => {
    setSelectedTask(null);
    setTaskDetail(null);
    setComments([]);
    setNewComment("");
    setEditingTask(false);
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
        if (selectedTask === taskId) closeTaskDetail();
        setTimeout(() => setSuccess(""), 3000);
      } else { setError(data.message); }
    } catch { setError("Delete failed"); }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      const res = await apiCall(`/tasks/${selectedTask}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment: newComment.trim() }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setComments(prev => [...prev, data.data]);
        setNewComment("");
      } else { setError(data.message); }
    } catch { setError("Failed to add comment"); }
    finally { setSendingComment(false); }
  };

  // Edit task
  const startEditTask = () => {
    setEditForm({
      title: taskDetail?.title || "",
      description: taskDetail?.description || "",
      assigned_to: taskDetail?.assigned_to || "",
      priority: taskDetail?.priority || "medium",
      due_date: taskDetail?.due_date || "",
      category: taskDetail?.category || "",
      estimated_hours: taskDetail?.estimated_hours || "",
      quantity: taskDetail?.quantity || "",
      weight_grams: taskDetail?.weight_grams || "",
      admin_notes: taskDetail?.admin_notes || "",
      status: taskDetail?.status || "pending",
    });
    setEditingTask(true);
  };

  const saveTaskEdit = async () => {
    setSaving(true);
    try {
      const body = { ...editForm };
      if (body.assigned_to) body.assigned_to = parseInt(body.assigned_to);
      if (body.estimated_hours) body.estimated_hours = parseFloat(body.estimated_hours);
      if (body.quantity) body.quantity = parseInt(body.quantity);
      if (body.weight_grams) body.weight_grams = parseFloat(body.weight_grams);
      Object.keys(body).forEach(k => { if (body[k] === "") delete body[k]; });

      const res = await apiCall(`/tasks/${selectedTask}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === "success") {
        setSuccess("Task updated");
        setEditingTask(false);
        fetchTasks();
        fetchTaskDetail(selectedTask);
        setTimeout(() => setSuccess(""), 3000);
      } else { setError(data.message); }
    } catch { setError("Update failed"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <Layout><div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading tasks...</div></Layout>;
  }

  return (
    <Layout topBar={<AdminTopBar />}>

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
          <button onClick={handleAddTask} disabled={saving}
            className="mt-4 bg-green-600 text-white px-5 py-2 rounded-lg font-semibold"
            style={{ opacity: saving ? 0.6 : 1 }}>
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
                  onClick={() => openTaskDetail(task)}
                />
              ))}
          </TaskColumn>
        ))}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "700px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>

            {/* Modal Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: "700", fontSize: "18px" }}>Task Details</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                {!editingTask && (
                  <button onClick={startEditTask} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "6px", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Edit3 size={14} /> Edit
                  </button>
                )}
                <button onClick={closeTaskDetail} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "#64748b" }}>×</button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              {loadingDetail ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Loading...</div>
              ) : editingTask ? (
                /* Edit Form */
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FI label="Title" value={editForm.title} onChange={v => setEditForm({ ...editForm, title: v })} span2 />
                    <FI label="Description" value={editForm.description} onChange={v => setEditForm({ ...editForm, description: v })} span2 />
                    <div>
                      <label style={lbl}>Assign To</label>
                      <select value={editForm.assigned_to} onChange={e => setEditForm({ ...editForm, assigned_to: e.target.value })} style={inp}>
                        <option value="">Select</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Priority</label>
                      <select value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })} style={inp}>
                        <option value="low">Low</option><option value="medium">Medium</option>
                        <option value="high">High</option><option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Status</label>
                      <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={inp}>
                        <option value="pending">Pending</option><option value="in_progress">In Progress</option>
                        <option value="on_hold">On Hold</option><option value="completed">Completed</option>
                      </select>
                    </div>
                    <FI label="Due Date" type="date" value={editForm.due_date} onChange={v => setEditForm({ ...editForm, due_date: v })} />
                    <FI label="Category" value={editForm.category} onChange={v => setEditForm({ ...editForm, category: v })} />
                    <FI label="Estimated Hours" type="number" value={editForm.estimated_hours} onChange={v => setEditForm({ ...editForm, estimated_hours: v })} />
                    <FI label="Weight (grams)" type="number" value={editForm.weight_grams} onChange={v => setEditForm({ ...editForm, weight_grams: v })} />
                    <FI label="Admin Notes" value={editForm.admin_notes} onChange={v => setEditForm({ ...editForm, admin_notes: v })} span2 />
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    <button onClick={saveTaskEdit} disabled={saving} style={{ background: "#2563eb", color: "white", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                      <Save size={14} className="inline mr-1" /> {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setEditingTask(false)} style={{ background: "#f1f5f9", color: "#64748b", padding: "8px 20px", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer", fontSize: "13px" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : taskDetail ? (
                /* Detail View */
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>{taskDetail.title}</h2>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <StatusBadge status={taskDetail.status} />
                    <PriorityBadge priority={taskDetail.priority} />
                    {taskDetail.category && <span style={{ background: "#f1f5f9", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>{taskDetail.category}</span>}
                  </div>

                  {taskDetail.description && (
                    <p style={{ color: "#475569", fontSize: "14px", marginBottom: "16px", lineHeight: "1.5" }}>{taskDetail.description}</p>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                    <DetailItem label="Assigned To" value={`${taskDetail.assignee_name || "—"} (${taskDetail.assignee_employee_id || "—"})`} />
                    <DetailItem label="Due Date" value={taskDetail.due_date || "No deadline"} />
                    <DetailItem label="Estimated Hours" value={taskDetail.estimated_hours || "—"} />
                    <DetailItem label="Weight (grams)" value={taskDetail.weight_grams || "—"} />
                    <DetailItem label="Quantity" value={taskDetail.quantity || "—"} />
                    <DetailItem label="Created" value={taskDetail.created_at ? new Date(taskDetail.created_at).toLocaleDateString() : "—"} />
                  </div>

                  {taskDetail.admin_notes && (
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "12px", marginBottom: "20px" }}>
                      <p style={{ fontSize: "12px", color: "#92400e", fontWeight: "600", marginBottom: "4px" }}>Admin Notes</p>
                      <p style={{ fontSize: "13px", color: "#78350f" }}>{taskDetail.admin_notes}</p>
                    </div>
                  )}

                  {/* Comments */}
                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                    <h4 style={{ fontWeight: "600", fontSize: "15px", marginBottom: "12px" }}>
                      Comments ({comments.length})
                    </h4>

                    {comments.length === 0 ? (
                      <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "12px" }}>No comments yet</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", maxHeight: "250px", overflowY: "auto" }}>
                        {comments.map((c, i) => (
                          <div key={c.id || i} style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 14px", border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b" }}>{c.user_name || `User #${c.user_id}`}</span>
                              <span style={{ fontSize: "11px", color: "#94a3b8" }}>{c.created_at ? new Date(c.created_at).toLocaleString() : ""}</span>
                            </div>
                            <p style={{ fontSize: "13px", color: "#475569" }}>{c.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAddComment(); }}
                        placeholder="Add a comment..."
                        style={{ flex: 1, padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={sendingComment || !newComment.trim()}
                        style={{ background: "#2563eb", color: "white", padding: "10px 16px", borderRadius: "8px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", opacity: sendingComment ? 0.6 : 1 }}
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

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

const StatusBadge = ({ status }) => {
  const colors = { pending: "#f59e0b", in_progress: "#3b82f6", completed: "#16a34a", cancelled: "#6b7280", on_hold: "#8b5cf6" };
  return <span style={{ background: `${colors[status] || "#6b7280"}20`, color: colors[status] || "#6b7280", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>{status?.replace("_", " ")}</span>;
};

const PriorityBadge = ({ priority }) => {
  const colors = { low: "#6b7280", medium: "#3b82f6", high: "#ea580c", urgent: "#dc2626" };
  return <span style={{ background: `${colors[priority] || "#6b7280"}20`, color: colors[priority] || "#6b7280", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>{priority}</span>;
};

const DetailItem = ({ label, value }) => (
  <div>
    <p style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>{label}</p>
    <p style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500", marginTop: "2px" }}>{value}</p>
  </div>
);

export default AssignTask;
