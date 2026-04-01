/**
 * Employee Payments Page
 * Shows task-based payment details, earnings summary, and payment history.
 * Employee can only VIEW — no editing.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { apiCall, getUser } from "../../utils/api";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n ?? 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const METHOD_LABELS = { cash: "💵 Cash", bank: "🏦 Bank", upi: "📱 UPI" };

const STATUS_STYLES = {
  pending:  { bg: "#fef3c7", color: "#d97706", label: "Pending" },
  partial:  { bg: "#dbeafe", color: "#2563eb", label: "Partial" },
  paid:     { bg: "#dcfce7", color: "#16a34a", label: "Paid" },
};

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function SummaryCard({ label, value, color = "#1e293b", sub, icon }) {
  return (
    <div style={{
      background: color, color: "#fff", borderRadius: 14, padding: "20px 22px",
      flex: 1, minWidth: 170, boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
    }}>
      <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function PaymentStatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span style={{
      background: s.bg, color: s.color, padding: "3px 12px",
      borderRadius: 20, fontSize: 11, fontWeight: 700,
    }}>
      {s.label}
    </span>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

const EmployeePayments = () => {
  const user = getUser();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview | tasks | history

  // Task payment detail modal
  const [selectedTaskPayment, setSelectedTaskPayment] = useState(null);
  const [taskPaymentHistory, setTaskPaymentHistory] = useState([]);
  const [loadingTaskPayment, setLoadingTaskPayment] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTasks(),
        fetchSummary(),
        fetchHistory(1),
      ]);
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await apiCall("/tasks/?per_page=200");
      const data = await res.json();
      if (data.status === "success") {
        setTasks(data.data?.tasks || data.data || []);
      }
    } catch {}
  };

  const fetchSummary = async () => {
    try {
      const res = await apiCall(`/payments/summary/${user?.id}`);
      const data = await res.json();
      if (data.status === "success") setSummary(data.data);
    } catch {}
  };

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      const res = await apiCall(`/payments/history/${user?.id}?page=${page}&per_page=15`);
      const data = await res.json();
      if (data.status === "success") {
        setHistory(data.data.transactions || []);
        setHistoryTotal(data.data.total || 0);
        setHistoryPage(page);
      }
    } catch {}
  }, [user?.id]);

  const openTaskPayment = async (task) => {
    setSelectedTaskPayment(task);
    setLoadingTaskPayment(true);
    setTaskPaymentHistory([]);
    try {
      const res = await apiCall(`/payments/task/${task.id}`);
      const data = await res.json();
      if (data.status === "success") {
        setTaskPaymentHistory(data.data?.payments || []);
        // Update task with detailed payment info if available
        if (data.data?.task_payment) {
          setSelectedTaskPayment(prev => ({ ...prev, ...data.data.task_payment }));
        }
      }
    } catch {
      // If the endpoint doesn't exist yet, show what we have
    } finally {
      setLoadingTaskPayment(false);
    }
  };

  // ── Compute task-level payment stats from available data ──
  const tasksWithPayment = tasks.filter(t => t.payment_amount > 0);
  const totalTaskPayable = tasksWithPayment.reduce((sum, t) => sum + (parseFloat(t.payment_amount) || 0), 0);
  const completedTasks = tasksWithPayment.filter(t => t.status === "completed");
  const pendingTaskPayable = completedTasks.reduce((sum, t) => sum + (parseFloat(t.payment_amount) || 0), 0);

  const S = styles;

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading payments…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={S.page}>

        {/* ── Header ── */}
        <div>
          <h2 style={S.pageTitle}>💰 My Payments</h2>
          <p style={S.sub}>Track your earnings, task payments, and payment history</p>
        </div>

        {/* ── Summary Cards ── */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <SummaryCard
            icon="📊" label="Total Earned"
            value={fmt(summary?.total_earned ?? totalTaskPayable)}
            color="#1e293b"
            sub={`${tasksWithPayment.length} tasks with payment`}
          />
          <SummaryCard
            icon="✅" label="Total Paid"
            value={fmt(summary?.total_paid ?? 0)}
            color="#0f766e"
          />
          <SummaryCard
            icon="⏳" label="Remaining"
            value={fmt(summary?.remaining ?? (totalTaskPayable - (summary?.total_paid ?? 0)))}
            color={(summary?.remaining ?? totalTaskPayable) > 0 ? "#b45309" : "#166534"}
            sub={(summary?.remaining ?? totalTaskPayable) > 0 ? "Amount due" : "All settled"}
          />
          <SummaryCard
            icon="📋" label="Completed Tasks"
            value={completedTasks.length}
            color="#6366f1"
            sub={`Payable: ${fmt(pendingTaskPayable)}`}
          />
        </div>

        {/* ── Tab Navigation ── */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0" }}>
          {[
            { key: "overview", label: "📋 Task Payments" },
            { key: "history", label: "🧾 Payment History" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 20px", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 600,
                background: "transparent",
                color: activeTab === tab.key ? "#1e293b" : "#94a3b8",
                borderBottom: activeTab === tab.key ? "2px solid #2563eb" : "2px solid transparent",
                marginBottom: -2,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: Task Payments
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div style={S.card}>
            <h3 style={S.sectionTitle}>Task-wise Payment Breakdown</h3>

            {tasksWithPayment.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>💳</div>
                <p style={{ fontWeight: 600, color: "#64748b" }}>No task payments yet</p>
                <p style={{ fontSize: 13 }}>Payments will appear here once admin assigns them to your tasks</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr style={S.thead}>
                      <th style={S.th}>Task</th>
                      <th style={S.th}>Category</th>
                      <th style={S.th}>Task Status</th>
                      <th style={S.th}>Total Payment</th>
                      <th style={S.th}>Advance Paid</th>
                      <th style={S.th}>Total Paid</th>
                      <th style={S.th}>Remaining</th>
                      <th style={S.th}>Payment Status</th>
                      <th style={S.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksWithPayment.map((task, i) => {
                      const total = parseFloat(task.payment_amount) || 0;
                      const advance = parseFloat(task.advance_paid) || 0;
                      const paid = parseFloat(task.total_paid) || advance;
                      const remaining = total - paid;
                      const payStatus = paid >= total ? "paid" : paid > 0 ? "partial" : "pending";

                      return (
                        <tr key={task.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <td style={{ ...S.td, fontWeight: 600, maxWidth: 200 }}>{task.title}</td>
                          <td style={S.td}>{task.category || "—"}</td>
                          <td style={S.td}>
                            <span style={{
                              padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                              background: task.status === "completed" ? "#dcfce7" :
                                         task.status === "in_progress" ? "#dbeafe" :
                                         task.status === "on_hold" ? "#fef3c7" : "#f1f5f9",
                              color: task.status === "completed" ? "#16a34a" :
                                     task.status === "in_progress" ? "#2563eb" :
                                     task.status === "on_hold" ? "#d97706" : "#64748b",
                            }}>
                              {task.status?.replace("_", " ")}
                            </span>
                          </td>
                          <td style={{ ...S.td, fontWeight: 700 }}>{fmt(total)}</td>
                          <td style={{ ...S.td, color: "#7c3aed" }}>{advance > 0 ? fmt(advance) : "—"}</td>
                          <td style={{ ...S.td, color: "#0f766e" }}>{fmt(paid)}</td>
                          <td style={{ ...S.td, fontWeight: 700, color: remaining > 0 ? "#b45309" : "#166534" }}>
                            {fmt(remaining)}
                          </td>
                          <td style={S.td}><PaymentStatusBadge status={payStatus} /></td>
                          <td style={S.td}>
                            <button
                              onClick={() => openTaskPayment(task)}
                              style={S.btnSecondary}
                            >
                              👁 View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Totals Row */}
                <div style={{
                  display: "flex", justifyContent: "flex-end", gap: 24,
                  padding: "14px 12px", borderTop: "2px solid #e2e8f0",
                  fontSize: 14, fontWeight: 700,
                }}>
                  <span>Total Payable: <span style={{ color: "#1e293b" }}>{fmt(totalTaskPayable)}</span></span>
                  <span>Completed Task Payable: <span style={{ color: "#16a34a" }}>{fmt(pendingTaskPayable)}</span></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: Payment History
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "history" && (
          <div style={S.card}>
            <h3 style={S.sectionTitle}>
              Payment History
              <span style={{ color: "#64748b", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                ({historyTotal} records)
              </span>
            </h3>

            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🧾</div>
                <p style={{ fontWeight: 600, color: "#64748b" }}>No payment history</p>
                <p style={{ fontSize: 13 }}>Payment entries will appear here as admin records them</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr style={S.thead}>
                      <th style={S.th}>#</th>
                      <th style={S.th}>Date</th>
                      <th style={S.th}>Amount</th>
                      <th style={S.th}>Method</th>
                      <th style={S.th}>Reference</th>
                      <th style={S.th}>Task</th>
                      <th style={S.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((tx, i) => (
                      <tr key={tx.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td style={S.td}>{tx.id}</td>
                        <td style={S.td}>{fmtDate(tx.payment_date)}</td>
                        <td style={{
                          ...S.td, fontWeight: 700,
                          color: tx.status === "reversed" ? "#94a3b8" : "#0f766e",
                          textDecoration: tx.status === "reversed" ? "line-through" : "none",
                        }}>
                          {fmt(tx.amount)}
                        </td>
                        <td style={S.td}>{METHOD_LABELS[tx.payment_method] || tx.payment_method || "—"}</td>
                        <td style={{ ...S.td, color: "#64748b", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {tx.reference_note || "—"}
                        </td>
                        <td style={{ ...S.td, fontSize: 12 }}>{tx.task_title || "—"}</td>
                        <td style={S.td}>
                          <span style={{
                            background: tx.status === "completed" ? "#dcfce7" : "#fee2e2",
                            color: tx.status === "completed" ? "#166534" : "#991b1b",
                            padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                          }}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                  {historyPage > 1 && (
                    <button style={S.btnSecondary} onClick={() => fetchHistory(historyPage - 1)}>← Prev</button>
                  )}
                  <span style={{ padding: "6px 12px", fontSize: 13, color: "#64748b" }}>Page {historyPage}</span>
                  {history.length === 15 && (
                    <button style={S.btnSecondary} onClick={() => fetchHistory(historyPage + 1)}>Next →</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TASK PAYMENT DETAIL MODAL
        ══════════════════════════════════════════════════════════════════ */}
        {selectedTaskPayment && (
          <div style={S.overlay} onClick={e => e.target === e.currentTarget && setSelectedTaskPayment(null)}>
            <div style={S.modal}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  💳 Payment Details
                </h3>
                <button
                  onClick={() => setSelectedTaskPayment(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#94a3b8" }}
                >
                  ×
                </button>
              </div>

              {/* Task Info */}
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <h4 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "#1e293b" }}>
                  {selectedTaskPayment.title}
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Category: </span>
                    <strong>{selectedTaskPayment.category || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Status: </span>
                    <strong>{selectedTaskPayment.status?.replace("_", " ")}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Due: </span>
                    <strong>{fmtDate(selectedTaskPayment.due_date)}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Assigned: </span>
                    <strong>{fmtDate(selectedTaskPayment.created_at)}</strong>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              {(() => {
                const total = parseFloat(selectedTaskPayment.payment_amount) || 0;
                const advance = parseFloat(selectedTaskPayment.advance_paid) || 0;
                const paid = parseFloat(selectedTaskPayment.total_paid) || advance;
                const remaining = total - paid;
                const payStatus = paid >= total ? "paid" : paid > 0 ? "partial" : "pending";

                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    <div style={S.statBox}>
                      <div style={S.statLabel}>Total Payment</div>
                      <div style={{ ...S.statValue, color: "#1e293b" }}>{fmt(total)}</div>
                    </div>
                    <div style={S.statBox}>
                      <div style={S.statLabel}>Advance Paid</div>
                      <div style={{ ...S.statValue, color: "#7c3aed" }}>{fmt(advance)}</div>
                    </div>
                    <div style={S.statBox}>
                      <div style={S.statLabel}>Total Paid</div>
                      <div style={{ ...S.statValue, color: "#0f766e" }}>{fmt(paid)}</div>
                    </div>
                    <div style={S.statBox}>
                      <div style={S.statLabel}>Remaining</div>
                      <div style={{ ...S.statValue, color: remaining > 0 ? "#b45309" : "#166534" }}>
                        {fmt(remaining)}
                      </div>
                    </div>
                    <div style={{ ...S.statBox, gridColumn: "1 / -1", display: "flex", justifyContent: "center" }}>
                      <div>
                        <div style={S.statLabel}>Payment Status</div>
                        <div style={{ marginTop: 4 }}><PaymentStatusBadge status={payStatus} /></div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Payment History for this task */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                <h4 style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: "#1e293b" }}>
                  Payment History for this Task
                </h4>

                {loadingTaskPayment ? (
                  <div style={{ textAlign: "center", padding: 20, color: "#94a3b8" }}>Loading…</div>
                ) : taskPaymentHistory.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
                    No individual payment entries yet
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                    {taskPaymentHistory.map((tx, i) => (
                      <div key={tx.id || i} style={{
                        background: "#f8fafc", borderRadius: 8, padding: "10px 14px",
                        border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                            {fmt(tx.amount)}
                            <span style={{ marginLeft: 8, fontSize: 11, color: "#64748b" }}>
                              {METHOD_LABELS[tx.payment_method] || ""}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            {fmtDate(tx.payment_date)} {tx.reference_note ? ` • ${tx.reference_note}` : ""}
                          </div>
                        </div>
                        <span style={{
                          background: tx.is_advance ? "#ede9fe" : "#dcfce7",
                          color: tx.is_advance ? "#7c3aed" : "#16a34a",
                          padding: "2px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                        }}>
                          {tx.is_advance ? "Advance" : "Payment"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Go to Task */}
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  onClick={() => {
                    setSelectedTaskPayment(null);
                    navigate(`/employee/tasks?taskId=${selectedTaskPayment.id}`);
                  }}
                  style={S.btnSecondary}
                >
                  📋 View Task
                </button>
                <button
                  onClick={() => setSelectedTaskPayment(null)}
                  style={S.btnPrimary}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

/* ─── Styles ──────────────────────────────────────────────────────────────── */

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 16, padding: "4px" },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b" },
  sub: { margin: "4px 0 0", fontSize: 13, color: "#64748b" },
  card: { background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
  sectionTitle: { margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#1e293b" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  thead: { background: "#f8fafc" },
  th: { padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e2e8f0" },
  td: { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#334155" },
  btnPrimary: { padding: "9px 18px", background: "#1e293b", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  btnSecondary: { padding: "7px 14px", background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modal: { background: "#fff", borderRadius: 16, padding: "24px 28px", width: 520, maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" },
  statBox: { background: "#f8fafc", borderRadius: 10, padding: "12px 16px", textAlign: "center" },
  statLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 },
  statValue: { fontSize: 20, fontWeight: 800, marginTop: 4 },
};

export default EmployeePayments;
