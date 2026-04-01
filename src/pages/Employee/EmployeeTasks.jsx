import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiCall, BASE_URL } from "../../utils/api";
import Layout from "../../components/Layout";

// ── Date grouping helpers ─────────────────────────────────────────────────

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function groupTasksByDate(tasks) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const today = [], yesterdayArr = [], thisWeek = [], older = [];
  for (const t of tasks) {
    const d = new Date(t.created_at || t.assigned_at || 0);
    if (isSameDay(d, now)) today.push(t);
    else if (isSameDay(d, yesterday)) yesterdayArr.push(t);
    else if (d >= startOfWeek) thisWeek.push(t);
    else older.push(t);
  }
  return { today, yesterday: yesterdayArr, thisWeek, older };
}

// ── Section header component ──────────────────────────────────────────────

function SectionHeader({ label, count, accent = "#2563eb" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      marginBottom: "14px", marginTop: "8px",
    }}>
      <div style={{
        width: "3px", height: "18px", borderRadius: "2px",
        background: accent, flexShrink: 0,
      }} />
      <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", letterSpacing: "0.02em" }}>
        {label}
      </span>
      <span style={{
        background: accent + "18", color: accent,
        borderRadius: "12px", fontSize: "11px", fontWeight: "700",
        padding: "2px 9px",
      }}>
        {count}
      </span>
      <div style={{ flex: 1, height: "1px", background: "#f1f5f9" }} />
    </div>
  );
}

const EmployeeTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingFor, setUploadingFor] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(null);

  // View detail modal — stores FULL task fetched from API
  const [viewTask, setViewTask] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showOlder, setShowOlder] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchTasks();
  }, []);

  // Auto-open task if ?taskId=X is present in URL (e.g. from a notification)
  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (taskId) {
      openViewDetail(taskId);
      // Clean up the query param so Back/refresh doesn't re-open it
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await apiCall("/tasks/");
      const data = await res.json();
      if (data.status === "success") {
        setTasks(data.data?.tasks || data.data || []);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error(err);
      setTasks([]);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch full task detail (comments + attachments) ──
  const openViewDetail = async (taskId) => {
    setLoadingDetail(true);
    setViewTask(null);
    try {
      const res = await apiCall(`/tasks/${taskId}`);
      const data = await res.json();
      if (data.status === "success") {
        setViewTask(data.data);
      }
    } catch (err) {
      console.error("Fetch detail failed:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const startTask = async (id) => {
    try {
      await apiCall(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "in_progress" }),
      });
      fetchTasks();
    } catch (err) {
      console.error("Start failed:", err);
    }
  };

  // ── Actually upload files then submit for review ──
  const submitForReview = async (id) => {
    setSubmitting(id);
    try {
      // 1. Upload actual files via FormData
      if (selectedFiles.length > 0) {
        const fd = new FormData();
        for (const file of selectedFiles) {
          fd.append("files", file);
        }
        await apiCall(`/tasks/${id}/attachments`, {
          method: "POST",
          body: fd,
        });
      }

      // 2. Move status to on_hold (review)
      await apiCall(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "on_hold" }),
      });

      setSelectedFiles([]);
      setUploadingFor(null);
      fetchTasks();
    } catch (err) {
      console.error("Submit for review failed:", err);
    } finally {
      setSubmitting(null);
    }
  };

  // ── Build proper URL for uploaded files ──
  const fileUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    // path is like "uploads/tasks/5/file.jpg" → BASE_URL + "/" + path
    return `${BASE_URL}/${path}`;
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const prioColor = (p) => {
    const c = { low: "#6b7280", medium: "#3b82f6", high: "#ea580c", urgent: "#dc2626" };
    return c[p] || "#6b7280";
  };

  // ── Inner TaskCard component (closes over parent state/handlers) ──────────
  const TaskCard = ({ task }) => (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div>
        <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
          {task.title}
        </h3>
        <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4", marginBottom: "12px" }}>
          {task.description || "No description"}
        </p>
        <div style={{ fontSize: "12px", color: "#475569", marginBottom: "10px" }}>
          📅 Assigned: {fmtDate(task.created_at)}<br />
          ⏰ Due: {fmtDate(task.due_date)}<br />
          💰 Payment: ₹{task.payment_amount || 0}
        </div>
        {task.attachments && task.attachments.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
            {task.attachments.slice(0, 3).map((att) => (
              <div key={att.id} style={{ width: "48px", height: "48px", borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                {att.file_type === "video" ? (
                  <div style={{ width: "100%", height: "100%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "16px" }}>▶</div>
                ) : (
                  <img src={fileUrl(att.file_url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
            ))}
            {task.attachments.length > 3 && (
              <div style={{ width: "48px", height: "48px", borderRadius: "6px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                +{task.attachments.length - 3}
              </div>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          {task.category && (
            <span style={{ background: "#f1f5f9", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>
              {task.category}
            </span>
          )}
          <span style={{ background: `${prioColor(task.priority)}15`, color: prioColor(task.priority), padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
            {task.priority}
          </span>
        </div>
        <span style={{
          display: "inline-block", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600",
          background: task.status === "pending" ? "#fef3c7" : task.status === "in_progress" ? "#dbeafe" : task.status === "on_hold" ? "#fef9c3" : task.status === "completed" ? "#dcfce7" : "#f1f5f9",
          color: task.status === "pending" ? "#d97706" : task.status === "in_progress" ? "#2563eb" : task.status === "on_hold" ? "#a16207" : task.status === "completed" ? "#16a34a" : "#64748b",
        }}>
          {task.status === "pending" && "📌 Assigned"}
          {task.status === "in_progress" && "🔧 In Progress"}
          {task.status === "on_hold" && "👀 Under Review"}
          {task.status === "completed" && "✅ Completed"}
        </span>
      </div>

      <div style={{ marginTop: "16px" }}>
        <button
          onClick={() => openViewDetail(task.id)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", cursor: "pointer", marginBottom: "8px", fontSize: "14px" }}
        >
          👁 View Details
        </button>

        {task.status === "pending" && (
          <button
            onClick={() => startTask(task.id)}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px", background: "#3b82f6", color: "white" }}
          >
            ▶ Start Task
          </button>
        )}

        {task.status === "in_progress" && (
          <div>
            {uploadingFor !== task.id ? (
              <button
                onClick={() => { setUploadingFor(task.id); setSelectedFiles([]); }}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "2px dashed #cbd5e1", cursor: "pointer", fontWeight: "600", fontSize: "14px", background: "white", color: "#475569" }}
              >
                📸 Upload Images/Videos & Submit for Review
              </button>
            ) : (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", background: "#f8fafc" }}>
                <input type="file" accept="image/*,video/*" multiple onChange={(e) => setSelectedFiles([...e.target.files])} style={{ marginBottom: "10px", width: "100%" }} />
                {selectedFiles.length > 0 && (
                  <div style={{ fontSize: "12px", marginBottom: "10px", color: "#475569" }}>
                    {selectedFiles.map((file, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <span>{file.type.startsWith("video") ? "🎬" : "🖼"}</span>
                        <span>{file.name}</span>
                        <span style={{ color: "#94a3b8" }}>({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => submitForReview(task.id)}
                    disabled={selectedFiles.length === 0 || submitting === task.id}
                    style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px", background: selectedFiles.length === 0 ? "#94a3b8" : "#16a34a", color: "white", opacity: submitting === task.id ? 0.6 : 1 }}
                  >
                    {submitting === task.id ? "Uploading & Submitting..." : "✓ Submit for Review"}
                  </button>
                  <button
                    onClick={() => { setUploadingFor(null); setSelectedFiles([]); }}
                    style={{ padding: "10px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", cursor: "pointer", fontSize: "13px", background: "white", color: "#64748b" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {task.status === "on_hold" && (
          <div style={{ background: "#fef3c7", color: "#92400e", padding: "12px", borderRadius: "8px", textAlign: "center", fontSize: "13px", fontWeight: "600" }}>
            ⏳ Submitted — Waiting for admin approval
          </div>
        )}
        {task.status === "completed" && (
          <div style={{ background: "#dcfce7", color: "#166534", padding: "12px", borderRadius: "8px", textAlign: "center", fontSize: "13px", fontWeight: "600" }}>
            ✅ Task completed — Approved
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Layout>
      <div style={{ padding: "16px", width: "100%" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "20px" }}>
          My Tasks
        </h1>

        {loading && (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            Loading tasks...
          </div>
        )}

        {!loading && error && (
          <div style={{ background: "#fee2e2", color: "#dc2626", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
            <p style={{ fontSize: "18px", fontWeight: "600", color: "#64748b" }}>
              No tasks assigned
            </p>
            <p style={{ fontSize: "14px", marginTop: "4px" }}>
              You're all caught up
            </p>
          </div>
        )}

        {!loading && tasks.length > 0 && (() => {
          const sorted = [...tasks].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          const { today, yesterday, thisWeek, older } = groupTasksByDate(sorted);

          const TaskGrid = ({ items }) => (
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", marginBottom: "8px" }}>
              {items.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          );

          return (
            <div>
              {today.length > 0 && (
                <div style={{ marginBottom: "28px" }}>
                  <SectionHeader label="Today" count={today.length} accent="#2563eb" />
                  <TaskGrid items={today} />
                </div>
              )}
              {yesterday.length > 0 && (
                <div style={{ marginBottom: "28px" }}>
                  <SectionHeader label="Yesterday" count={yesterday.length} accent="#7c3aed" />
                  <TaskGrid items={yesterday} />
                </div>
              )}
              {thisWeek.length > 0 && (
                <div style={{ marginBottom: "28px" }}>
                  <SectionHeader label="This Week" count={thisWeek.length} accent="#0891b2" />
                  <TaskGrid items={thisWeek} />
                </div>
              )}
              {older.length > 0 && (
                <div style={{ marginBottom: "28px" }}>
                  <button
                    onClick={() => setShowOlder((v) => !v)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "10px",
                      marginBottom: "14px", padding: 0, width: "100%",
                    }}
                  >
                    <div style={{ width: "3px", height: "18px", borderRadius: "2px", background: "#94a3b8", flexShrink: 0 }} />
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#64748b", letterSpacing: "0.02em" }}>
                      Older Tasks
                    </span>
                    <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: "12px", fontSize: "11px", fontWeight: "700", padding: "2px 9px" }}>
                      {older.length}
                    </span>
                    <div style={{ flex: 1, height: "1px", background: "#f1f5f9" }} />
                    <span style={{
                      fontSize: "18px", color: "#94a3b8", lineHeight: 1,
                      transition: "transform 0.2s", display: "inline-block",
                      transform: showOlder ? "rotate(180deg)" : "rotate(0deg)",
                    }}>▾</span>
                  </button>
                  {showOlder && <TaskGrid items={older} />}
                </div>
              )}
              {today.length === 0 && yesterday.length === 0 && thisWeek.length === 0 && older.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
                  <p style={{ fontSize: "18px", fontWeight: "600", color: "#64748b" }}>No tasks assigned</p>
                </div>
              )}
            </div>
          );
        })()}
        {/* ── VIEW DETAILS MODAL ── */}
        {(viewTask || loadingDetail) && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              padding: "16px",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !loadingDetail) {
                setViewTask(null);
              }
            }}
          >
            <div style={{
              background: "white",
              padding: "24px",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "550px",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}>
              {loadingDetail ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  Loading task details...
                </div>
              ) : viewTask ? (
                <>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b", flex: 1 }}>
                      {viewTask.title}
                    </h2>
                    <button
                      onClick={() => setViewTask(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "#94a3b8", padding: "0 0 0 12px" }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Status + Priority */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <span style={{
                      padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600",
                      background: viewTask.status === "pending" ? "#fef3c7" : viewTask.status === "in_progress" ? "#dbeafe" : viewTask.status === "on_hold" ? "#fef9c3" : viewTask.status === "completed" ? "#dcfce7" : "#f1f5f9",
                      color: viewTask.status === "pending" ? "#d97706" : viewTask.status === "in_progress" ? "#2563eb" : viewTask.status === "on_hold" ? "#a16207" : viewTask.status === "completed" ? "#16a34a" : "#64748b",
                    }}>
                      {viewTask.status?.replace("_", " ")}
                    </span>
                    <span style={{
                      padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600",
                      background: `${prioColor(viewTask.priority)}15`, color: prioColor(viewTask.priority),
                    }}>
                      {viewTask.priority}
                    </span>
                    {viewTask.category && (
                      <span style={{ background: "#f1f5f9", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", color: "#475569" }}>
                        {viewTask.category}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {viewTask.description && (
                    <p style={{ color: "#475569", fontSize: "14px", lineHeight: "1.6", marginBottom: "16px" }}>
                      {viewTask.description}
                    </p>
                  )}

                  {/* Info grid */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
                    background: "#f8fafc", padding: "14px", borderRadius: "10px", marginBottom: "16px",
                    fontSize: "13px",
                  }}>
                    <div><span style={{ color: "#94a3b8" }}>Assigned:</span> <strong>{fmtDate(viewTask.created_at)}</strong></div>
                    <div><span style={{ color: "#94a3b8" }}>Due:</span> <strong>{fmtDate(viewTask.due_date)}</strong></div>
                    <div><span style={{ color: "#94a3b8" }}>Payment:</span> <strong style={{ color: "#16a34a" }}>₹{viewTask.payment_amount || 0}</strong></div>
                    <div><span style={{ color: "#94a3b8" }}>Weight:</span> <strong>{viewTask.weight_grams || "—"}g</strong></div>
                    <div><span style={{ color: "#94a3b8" }}>Qty:</span> <strong>{viewTask.quantity || "—"}</strong></div>
                    <div><span style={{ color: "#94a3b8" }}>Est Hours:</span> <strong>{viewTask.estimated_hours || "—"}</strong></div>
                  </div>

                  {/* Admin Notes */}
                  {viewTask.admin_notes && (
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
                      <p style={{ fontSize: "12px", color: "#92400e", fontWeight: "600", marginBottom: "4px" }}>Admin Notes</p>
                      <p style={{ fontSize: "13px", color: "#78350f" }}>{viewTask.admin_notes}</p>
                    </div>
                  )}

                  {/* ── ATTACHMENTS (images + videos) ── */}
                  {viewTask.attachments && viewTask.attachments.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <h4 style={{ fontWeight: "600", fontSize: "14px", marginBottom: "10px", color: "#1e293b" }}>
                        📎 Attachments ({viewTask.attachments.length})
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {viewTask.attachments.map((att) => (
                          <div key={att.id} style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0", position: "relative" }}>
                            {att.file_type === "video" ? (
                              <video
                                controls
                                style={{ width: "100%", maxHeight: "200px", objectFit: "cover", display: "block" }}
                              >
                                <source src={fileUrl(att.file_url)} />
                              </video>
                            ) : (
                              <img
                                src={fileUrl(att.file_url)}
                                alt={att.original_name || "attachment"}
                                style={{ width: "100%", maxHeight: "200px", objectFit: "cover", display: "block", cursor: "pointer" }}
                                onClick={() => window.open(fileUrl(att.file_url), "_blank")}
                              />
                            )}
                            <div style={{ padding: "4px 8px", fontSize: "11px", color: "#94a3b8", background: "#f8fafc" }}>
                              {att.user_role === "admin" || att.user_role === "super_admin" ? "👔 Admin" : "👷 Employee"} • {fmtDate(att.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── COMMENTS ── */}
                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
                    <h4 style={{ fontWeight: "600", fontSize: "14px", marginBottom: "10px", color: "#1e293b" }}>
                      💬 Comments ({viewTask.comments?.length || 0})
                    </h4>
                    {viewTask.comments?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                        {viewTask.comments.map((c, i) => (
                          <div key={c.id || i} style={{
                            background: "#f8fafc", borderRadius: "8px", padding: "10px 12px",
                            border: "1px solid #e2e8f0",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b" }}>
                                {c.user_name || "User"} {c.user_role === "admin" || c.user_role === "super_admin" ? "👔" : ""}
                              </span>
                              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                                {c.created_at ? fmtDate(c.created_at) : ""}
                              </span>
                            </div>
                            <p style={{ fontSize: "13px", color: "#475569" }}>{c.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: "#94a3b8", fontSize: "13px" }}>No comments yet</p>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => setViewTask(null)}
                    style={{
                      marginTop: "16px",
                      padding: "10px",
                      width: "100%",
                      borderRadius: "8px",
                      border: "none",
                      background: "#1e293b",
                      color: "white",
                      fontWeight: "600",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EmployeeTasks;