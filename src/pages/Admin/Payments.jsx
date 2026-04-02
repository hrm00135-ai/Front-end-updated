/**
 * JewelCraft HRM — Admin Payments Page (v3)
 * Per-task payments, advance tracking, invoice upload, no-negative, auto-refresh
 */

import { useState, useEffect, useCallback, useRef } from "react";
import Layout from "../../components/Layout";
import AdminTopBar from "../../components/AdminTopBar";
import { apiCall, BASE_URL } from "../../utils/api";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Math.max(0, n ?? 0));

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const WAGE_LABELS = { monthly_salary: "Monthly Salary", daily_wage: "Daily Wage", per_task: "Per Task" };
const METHOD_LABELS = { cash: "💵 Cash", bank: "🏦 Bank", upi: "📱 UPI" };

// ── helpers ──────────────────────────────────────────────────────────────────
const invoiceUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}/${path}`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color = "#1e293b", sub }) {
  return (
    <div style={{ background: color, color: "#fff", borderRadius: 12, padding: "18px 22px", minWidth: 160, flex: 1, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function InvoiceThumb({ url }) {
  if (!url) return null;
  const full = invoiceUrl(url);
  const isPdf = url.toLowerCase().endsWith(".pdf");
  return (
    <a href={full} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "#f0fdf4", color: "#16a34a", borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: "none", border: "1px solid #bbf7d0" }}>
      {isPdf ? "📄 PDF" : "🧾 Invoice"}
    </a>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const Payments = () => {
  const [employees, setEmployees]     = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [summary, setSummary]         = useState(null);
  const [history, setHistory]         = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [overview, setOverview]       = useState([]);
  const [fromDate, setFromDate]       = useState("");
  const [toDate, setToDate]           = useState("");
  const [empTasks, setEmpTasks]       = useState([]);
  const [activeTab, setActiveTab]     = useState("summary");
  const [config, setConfig]           = useState(null);
  const [configForm, setConfigForm]   = useState({ wage_type: "monthly_salary", wage_amount: "", effective_from: "", notes: "" });
  const [showPayModal, setShowPayModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [taskBalance, setTaskBalance] = useState(null); // {task_total, total_paid, remaining}
  const [msg, setMsg]                 = useState({ text: "", type: "" });
  const [loading, setLoading]         = useState(false);

  // Invoice upload state
  const [invoiceFile, setInvoiceFile]               = useState(null);
  const [invoicePreview, setInvoicePreview]         = useState(null);
  const [confirmNoInvoice, setConfirmNoInvoice]     = useState(false);
  const [invoiceWarning, setInvoiceWarning]         = useState(false);
  const invoiceInputRef = useRef(null);

  const [payForm, setPayForm] = useState({
    amount: "", payment_date: new Date().toISOString().split("T")[0],
    payment_method: "cash", reference_note: "", task_id: "", is_advance: false,
  });

  const selectedEmpRef = useRef(selectedEmp);
  selectedEmpRef.current = selectedEmp;

  // ── Auto-refresh ─────────────────────────────────────────────────────────
  const refreshCurrentEmployee = useCallback(() => {
    const id = selectedEmpRef.current;
    if (id) {
      fetchSummaryFn(id, fromDate, toDate);
      fetchHistoryFn(id, historyPage);
      fetchEmpTasksFn(id);
    }
    fetchOverviewFn();
  }, []); // eslint-disable-line

  useEffect(() => {
    // Poll every 30 seconds
    const interval = setInterval(refreshCurrentEmployee, 30000);

    // Refresh on tab visibility
    const onVisible = () => { if (!document.hidden) refreshCurrentEmployee(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshCurrentEmployee]);

  useEffect(() => { fetchEmployeesFn(); fetchOverviewFn(); }, []);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchEmployeesFn = async () => {
    try {
      const res = await apiCall("/users/?per_page=200");
      const data = await res.json();
      if (data.status === "success")
        setEmployees(Array.isArray(data.data?.users) ? data.data.users.filter(u => u.role === "employee") : []);
    } catch {}
  };

  const fetchOverviewFn = useCallback(async () => {
    try {
      const res = await apiCall("/payments/overview");
      const data = await res.json();
      if (data.status === "success") setOverview(Array.isArray(data.data) ? data.data : []);
    } catch {}
  }, []);

  const fetchSummaryFn = useCallback(async (empId, fd, td) => {
    if (!empId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fd) params.set("from_date", fd);
      if (td) params.set("to_date", td);
      const res = await apiCall(`/payments/summary/${empId}?${params}`);
      const data = await res.json();
      if (data.status === "success") setSummary(data.data);
    } catch {} finally { setLoading(false); }
  }, []);

  const fetchHistoryFn = useCallback(async (empId, page = 1) => {
    if (!empId) return;
    try {
      const res = await apiCall(`/payments/history/${empId}?page=${page}&per_page=10`);
      const data = await res.json();
      if (data.status === "success") {
        setHistory(Array.isArray(data.data?.transactions) ? data.data.transactions : []);
        setHistoryTotal(data.data?.total || 0);
        setHistoryPage(page);
      }
    } catch {}
  }, []);

  const fetchConfigFn = useCallback(async (empId) => {
    if (!empId) return;
    try {
      const res = await apiCall(`/payments/config/${empId}`);
      const data = await res.json();
      if (data.status === "success" && data.data) {
        setConfig(data.data);
        setConfigForm({ wage_type: data.data.wage_type, wage_amount: data.data.wage_amount, effective_from: data.data.effective_from || "", notes: data.data.notes || "" });
      } else { setConfig(null); }
    } catch {}
  }, []);

  const fetchEmpTasksFn = useCallback(async (empId) => {
    if (!empId) return;
    try {
      const res = await apiCall(`/tasks/?assigned_to=${empId}&per_page=200`);
      const data = await res.json();
      if (data.status === "success")
        setEmpTasks(Array.isArray(data.data?.tasks) ? data.data.tasks : []);
    } catch {}
  }, []);

  // When task selected in pay modal, fetch its balance
  const fetchTaskBalance = useCallback(async (taskId) => {
    if (!taskId) { setTaskBalance(null); return; }
    try {
      const res = await apiCall(`/payments/task/${taskId}/balance`);
      const data = await res.json();
      if (data.status === "success") setTaskBalance(data.data);
    } catch {}
  }, []);

  const handleEmpSelect = (empId) => {
    setSelectedEmp(empId);
    setSummary(null); setHistory([]); setEmpTasks([]); setActiveTab("summary");
    if (empId) {
      fetchSummaryFn(empId, fromDate, toDate);
      fetchHistoryFn(empId);
      fetchConfigFn(empId);
      fetchEmpTasksFn(empId);
    }
  };

  // ── Invoice file handler ─────────────────────────────────────────────────
  const handleInvoiceChange = (file) => {
    if (!file) { setInvoiceFile(null); setInvoicePreview(null); return; }
    setInvoiceFile(file);
    setConfirmNoInvoice(false);
    setInvoiceWarning(false);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setInvoicePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setInvoicePreview(null); // PDF
    }
  };

  // ── Record Payment ────────────────────────────────────────────────────────
  const handleRecordPayment = async () => {
    if (!selectedEmp) return;

    const amt = parseFloat(payForm.amount);
    if (!payForm.amount || isNaN(amt) || amt <= 0) {
      setMsg({ text: "Enter a valid amount greater than zero", type: "error" }); return;
    }

    // Invoice gate: must have file OR confirmation checked
    if (!invoiceFile && !confirmNoInvoice) {
      setInvoiceWarning(true);
      setMsg({ text: "⚠️ Please upload an invoice slip, or confirm you're proceeding without one", type: "error" });
      return;
    }

    // Task-level cap check (client-side guard)
    if (payForm.task_id && taskBalance) {
      if (amt > taskBalance.remaining + 0.01) {
        setMsg({ text: `Amount exceeds task balance. Max payable: ${fmt(taskBalance.remaining)}`, type: "error" }); return;
      }
    }

    setLoading(true);
    setMsg({ text: "", type: "" });

    try {
      // Use FormData to support optional invoice file in single request
      const fd = new FormData();
      fd.append("employee_id", selectedEmp);
      fd.append("amount", String(amt));
      fd.append("payment_date", payForm.payment_date);
      fd.append("payment_method", payForm.payment_method);
      fd.append("reference_note", payForm.reference_note || "");
      if (payForm.task_id) fd.append("task_id", payForm.task_id);
      fd.append("is_advance", payForm.is_advance ? "true" : "false");
      if (invoiceFile) fd.append("invoice_file", invoiceFile);

      const res = await apiCall("/payments/pay", { method: "POST", body: fd });
      const data = await res.json();

      if (data.status === "success") {
        setMsg({ text: `Payment recorded${payForm.is_advance ? " (Advance)" : ""} successfully ✅`, type: "success" });
        closePayModal();
        // Refresh immediately
        fetchSummaryFn(selectedEmp, fromDate, toDate);
        fetchHistoryFn(selectedEmp);
        fetchOverviewFn();
        fetchEmpTasksFn(selectedEmp);
      } else {
        setMsg({ text: data.message || "Payment failed", type: "error" });
      }
    } catch { setMsg({ text: "Network error", type: "error" }); }
    finally { setLoading(false); setTimeout(() => setMsg({ text: "", type: "" }), 5000); }
  };

  const closePayModal = () => {
    setShowPayModal(false);
    setInvoiceFile(null); setInvoicePreview(null);
    setConfirmNoInvoice(false); setInvoiceWarning(false);
    setTaskBalance(null);
    setPayForm({ amount: "", payment_date: new Date().toISOString().split("T")[0], payment_method: "cash", reference_note: "", task_id: "", is_advance: false });
  };

  const handleSaveConfig = async () => {
    if (!selectedEmp) return;
    try {
      const res = await apiCall(`/payments/config/${selectedEmp}`, {
        method: "POST",
        body: JSON.stringify({ ...configForm, wage_amount: parseFloat(configForm.wage_amount) }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Config saved", type: "success" });
        setConfig(data.data);
        setShowConfigModal(false);
        fetchSummaryFn(selectedEmp, fromDate, toDate);
      } else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
    setTimeout(() => setMsg({ text: "", type: "" }), 4000);
  };

  const handleReverse = async (txId) => {
    if (!window.confirm("Reverse this payment?")) return;
    try {
      const res = await apiCall(`/payments/reverse/${txId}`, { method: "POST", body: JSON.stringify({ reason: "Admin reversal" }) });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Payment reversed", type: "success" });
        fetchHistoryFn(selectedEmp, historyPage);
        fetchSummaryFn(selectedEmp, fromDate, toDate);
        fetchOverviewFn();
        fetchEmpTasksFn(selectedEmp);
      } else { setMsg({ text: data.message, type: "error" }); }
    } catch {}
    setTimeout(() => setMsg({ text: "", type: "" }), 4000);
  };

  const openPayForTask = (task, isAdvance = false) => {
    setPayForm({
      amount: "", payment_date: new Date().toISOString().split("T")[0],
      payment_method: "cash",
      reference_note: isAdvance ? `Advance for: ${task.title}` : `Payment for: ${task.title}`,
      task_id: String(task.id), is_advance: isAdvance,
    });
    fetchTaskBalance(String(task.id));
    setShowPayModal(true);
  };

  // ── Computed ─────────────────────────────────────────────────────────────
  const tasksWithPayment = empTasks.filter(t => t.payment_amount > 0);
  const totalTaskPayable = tasksWithPayment.reduce((s, t) => s + (parseFloat(t.payment_amount) || 0), 0);
  const empName = (() => {
    const e = employees.find(e => String(e.id) === selectedEmp);
    return e ? `${e.first_name} ${e.last_name}` : "";
  })();

  const S = styles;

  return (
    <Layout topBar={<AdminTopBar />}>
      <div style={S.page}>

        <div style={S.pageHeader}>
          <div>
            <h2 style={S.pageTitle}>💳 Payment Management</h2>
            <p style={S.pageSubtitle}>Task payments, advances, invoice tracking — auto-refreshes every 30s</p>
          </div>
        </div>

        {msg.text && (
          <div style={{ ...S.flash, background: msg.type === "success" ? "#dcfce7" : "#fee2e2", color: msg.type === "success" ? "#166534" : "#991b1b" }}>
            {msg.text}
            <button onClick={() => setMsg({ text: "", type: "" })} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold", color: "inherit" }}>×</button>
          </div>
        )}

        {/* Employee Selector */}
        <div style={S.card}>
          <div style={S.filterRow}>
            <div style={{ flex: 2 }}>
              <label style={S.label}>Select Employee</label>
              <select style={S.select} value={selectedEmp} onChange={e => handleEmpSelect(e.target.value)}>
                <option value="">— Choose Employee —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>From Date</label>
              <input type="date" style={S.input} value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>To Date</label>
              <input type="date" style={S.input} value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div style={{ alignSelf: "flex-end" }}>
              <button style={S.btnSecondary} onClick={() => selectedEmp && fetchSummaryFn(selectedEmp, fromDate, toDate)}>🔍 Filter</button>
            </div>
          </div>
        </div>

        {/* ── Employee Section ── */}
        {selectedEmp && (
          <>
            {/* Wage Config & Actions */}
            <div style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <span style={S.label}>Wage Config: </span>
                {config ? (
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>
                    {WAGE_LABELS[config.wage_type] || config.wage_type} — {fmt(config.wage_amount)}
                    <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>(since {fmtDate(config.effective_from)})</span>
                  </span>
                ) : (
                  <span style={{ color: "#ef4444", fontSize: 13 }}>⚠️ No wage config set</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={S.btnSecondary} onClick={() => setShowConfigModal(true)}>⚙️ Set Wage Config</button>
                <button style={{ ...S.btnPrimary, background: "#7c3aed" }} onClick={() => {
                  setPayForm(f => ({ ...f, is_advance: true, task_id: "", reference_note: "Advance payment" }));
                  setTaskBalance(null); setShowPayModal(true);
                }}>🏷️ Advance Payment</button>
                <button style={S.btnPrimary} onClick={() => {
                  setPayForm(f => ({ ...f, is_advance: false, task_id: "", reference_note: "" }));
                  setTaskBalance(null); setShowPayModal(true);
                }}>💰 Record Payment</button>
              </div>
            </div>

            {/* Summary Cards */}
            {loading && <div style={{ color: "#64748b", padding: 8, fontSize: 13 }}>⟳ Calculating…</div>}
            {summary && (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <SummaryCard label="Total Earned" value={fmt(summary.total_earned)} color="#1e293b" sub={WAGE_LABELS[summary.wage_type] || "—"} />
                <SummaryCard label="Total Paid" value={fmt(summary.total_paid)} color="#0f766e" />
                <SummaryCard label="Remaining" value={fmt(Math.max(0, summary.remaining))} color={summary.remaining > 0 ? "#b45309" : "#166534"} sub={summary.remaining > 0 ? "Amount Owed" : "Settled"} />
                {totalTaskPayable > 0 && (
                  <SummaryCard label="Task Payments" value={fmt(totalTaskPayable)} color="#6366f1" sub={`${tasksWithPayment.length} tasks`} />
                )}
              </div>
            )}

            {/* Tab Nav */}
            <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0" }}>
              {[
                { key: "summary", label: "🧾 Payment History" },
                { key: "tasks", label: `📋 Task Payments (${tasksWithPayment.length})` },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: "transparent",
                  color: activeTab === tab.key ? "#1e293b" : "#94a3b8",
                  borderBottom: activeTab === tab.key ? "2px solid #2563eb" : "2px solid transparent",
                  marginBottom: -2,
                }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ═══ Payment History Tab ═══ */}
            {activeTab === "summary" && (
              <div style={S.card}>
                <h3 style={S.sectionTitle}>🧾 Payment History — {empName}
                  <span style={{ color: "#64748b", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({historyTotal} records)</span>
                </h3>
                {history.length === 0 ? (
                  <div style={{ color: "#64748b", padding: "20px 0", textAlign: "center" }}>No payments recorded yet</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={S.table}>
                      <thead>
                        <tr style={S.thead}>
                          <th style={S.th}>#</th>
                          <th style={S.th}>Date</th>
                          <th style={S.th}>Amount</th>
                          <th style={S.th}>Type</th>
                          <th style={S.th}>Method</th>
                          <th style={S.th}>Reference</th>
                          <th style={S.th}>Task</th>
                          <th style={S.th}>Invoice</th>
                          <th style={S.th}>Paid By</th>
                          <th style={S.th}>Status</th>
                          <th style={S.th}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((tx, i) => (
                          <tr key={tx.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                            <td style={S.td}>{tx.id}</td>
                            <td style={S.td}>{fmtDate(tx.payment_date)}</td>
                            <td style={{ ...S.td, fontWeight: 700, color: tx.status === "reversed" ? "#94a3b8" : "#0f766e", textDecoration: tx.status === "reversed" ? "line-through" : "none" }}>{fmt(tx.amount)}</td>
                            <td style={S.td}>
                              <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: tx.is_advance ? "#ede9fe" : "#f0fdf4", color: tx.is_advance ? "#7c3aed" : "#16a34a" }}>
                                {tx.is_advance ? "Advance" : "Payment"}
                              </span>
                            </td>
                            <td style={S.td}>{METHOD_LABELS[tx.payment_method] || tx.payment_method}</td>
                            <td style={{ ...S.td, color: "#64748b", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.reference_note || "—"}</td>
                            <td style={{ ...S.td, fontSize: 12, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.task_title || "—"}</td>
                            <td style={S.td}><InvoiceThumb url={tx.invoice_url} /></td>
                            <td style={S.td}>{tx.paid_by_name}</td>
                            <td style={S.td}>
                              <span style={{ background: tx.status === "completed" ? "#dcfce7" : "#fee2e2", color: tx.status === "completed" ? "#166534" : "#991b1b", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{tx.status}</span>
                            </td>
                            <td style={S.td}>
                              {tx.status === "completed" && (
                                <button style={S.btnDanger} onClick={() => handleReverse(tx.id)}>↩️</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                      {historyPage > 1 && <button style={S.btnSecondary} onClick={() => fetchHistoryFn(selectedEmp, historyPage - 1)}>← Prev</button>}
                      <span style={{ padding: "6px 12px", fontSize: 13, color: "#64748b" }}>Page {historyPage}</span>
                      {history.length === 10 && <button style={S.btnSecondary} onClick={() => fetchHistoryFn(selectedEmp, historyPage + 1)}>Next →</button>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ Task Payments Tab ═══ */}
            {activeTab === "tasks" && (
              <div style={S.card}>
                <h3 style={S.sectionTitle}>📋 Task-wise Payment — {empName}</h3>
                {tasksWithPayment.length === 0 ? (
                  <div style={{ color: "#64748b", padding: "30px 0", textAlign: "center" }}>
                    <p style={{ fontWeight: 600 }}>No tasks with payment amounts assigned</p>
                    <p style={{ fontSize: 13 }}>Set payment_amount when assigning tasks to see them here</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={S.table}>
                      <thead>
                        <tr style={S.thead}>
                          <th style={S.th}>Task</th>
                          <th style={S.th}>Category</th>
                          <th style={S.th}>Task Status</th>
                          <th style={S.th}>Total (₹)</th>
                          <th style={S.th}>Advance</th>
                          <th style={S.th}>Paid</th>
                          <th style={S.th}>Remaining</th>
                          <th style={S.th}>Pay Status</th>
                          <th style={S.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasksWithPayment.map((task, i) => {
                          const total   = parseFloat(task.payment_amount) || 0;
                          const advance = parseFloat(task.advance_paid) || 0;
                          const paid    = parseFloat(task.total_paid) || advance;
                          const remaining = Math.max(0, total - paid);
                          const payStatus = paid >= total ? "paid" : paid > 0 ? "partial" : "pending";

                          return (
                            <tr key={task.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                              <td style={{ ...S.td, fontWeight: 600, maxWidth: 200 }}>{task.title}</td>
                              <td style={S.td}>{task.category || "—"}</td>
                              <td style={S.td}>
                                <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                                  background: task.status === "completed" ? "#dcfce7" : task.status === "in_progress" ? "#dbeafe" : task.status === "on_hold" ? "#fef3c7" : "#f1f5f9",
                                  color: task.status === "completed" ? "#16a34a" : task.status === "in_progress" ? "#2563eb" : task.status === "on_hold" ? "#d97706" : "#64748b",
                                }}>
                                  {task.status?.replace("_", " ")}
                                </span>
                              </td>
                              <td style={{ ...S.td, fontWeight: 700 }}>{fmt(total)}</td>
                              <td style={{ ...S.td, color: "#7c3aed" }}>{advance > 0 ? fmt(advance) : "—"}</td>
                              <td style={{ ...S.td, color: "#0f766e" }}>{fmt(paid)}</td>
                              <td style={{ ...S.td, fontWeight: 700, color: remaining > 0 ? "#b45309" : "#166534" }}>{fmt(remaining)}</td>
                              <td style={S.td}>
                                <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                                  background: payStatus === "paid" ? "#dcfce7" : payStatus === "partial" ? "#dbeafe" : "#fef3c7",
                                  color: payStatus === "paid" ? "#16a34a" : payStatus === "partial" ? "#2563eb" : "#d97706",
                                }}>
                                  {payStatus === "paid" ? "✅ Paid" : payStatus === "partial" ? "⏳ Partial" : "🔴 Pending"}
                                </span>
                              </td>
                              <td style={S.td}>
                                {remaining > 0 && (
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button style={{ ...S.btnSecondary, fontSize: 11, padding: "4px 10px" }} onClick={() => openPayForTask(task, true)}>🏷️ Advance</button>
                                    <button style={{ ...S.btnPrimary, fontSize: 11, padding: "4px 10px" }} onClick={() => openPayForTask(task, false)}>💰 Pay</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, padding: "14px 12px", borderTop: "2px solid #e2e8f0", fontSize: 14, fontWeight: 700 }}>
                      <span>Total Task Payments: {fmt(totalTaskPayable)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Overview Table */}
        <div style={S.card}>
          <h3 style={S.sectionTitle}>👥 All Employees — Balance Overview</h3>
          {overview.length === 0 ? (
            <div style={{ color: "#64748b", padding: "16px 0", textAlign: "center" }}>No data yet</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr style={S.thead}>
                    <th style={S.th}>Employee</th>
                    <th style={S.th}>Wage Type</th>
                    <th style={S.th}>Total Earned</th>
                    <th style={S.th}>Total Paid</th>
                    <th style={S.th}>Remaining</th>
                    <th style={S.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.map((row, i) => (
                    <tr key={row.employee_id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{row.employee_name}</td>
                      <td style={S.td}>{WAGE_LABELS[row.wage_type] || "—"}</td>
                      <td style={S.td}>{fmt(row.total_earned)}</td>
                      <td style={{ ...S.td, color: "#0f766e" }}>{fmt(row.total_paid)}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: row.remaining > 0 ? "#b45309" : "#166534" }}>{fmt(row.remaining)}</td>
                      <td style={S.td}><button style={S.btnSecondary} onClick={() => handleEmpSelect(String(row.employee_id))}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          RECORD PAYMENT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showPayModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>
                {payForm.is_advance ? "🏷️ Record Advance Payment" : "💰 Record Payment"}
              </h3>
              <button onClick={closePayModal} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#94a3b8" }}>×</button>
            </div>

            {/* Advance toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", background: payForm.is_advance ? "#ede9fe" : "#f8fafc", borderRadius: 8, border: `1px solid ${payForm.is_advance ? "#c4b5fd" : "#e2e8f0"}` }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={payForm.is_advance} onChange={e => setPayForm(f => ({ ...f, is_advance: e.target.checked }))} />
                This is an advance payment
              </label>
            </div>

            {/* Task selector */}
            <label style={S.label}>For Task (optional)</label>
            <select style={S.select} value={payForm.task_id} onChange={e => {
              setPayForm(f => ({ ...f, task_id: e.target.value }));
              fetchTaskBalance(e.target.value);
            }}>
              <option value="">— General Payment —</option>
              {empTasks.filter(t => t.payment_amount > 0).map(t => (
                <option key={t.id} value={t.id}>{t.title} (Total: {fmt(t.payment_amount)})</option>
              ))}
            </select>

            {/* Task balance info */}
            {taskBalance && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Task Total</div>
                  <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>{fmt(taskBalance.task_total)}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Already Paid</div>
                  <div style={{ fontWeight: 700, color: "#0f766e", fontSize: 15 }}>{fmt(taskBalance.total_paid)}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Max Payable</div>
                  <div style={{ fontWeight: 700, color: taskBalance.remaining > 0 ? "#b45309" : "#166534", fontSize: 15 }}>{fmt(taskBalance.remaining)}</div>
                </div>
              </div>
            )}

            {/* Amount */}
            <label style={S.label}>Amount (₹) *</label>
            <input style={{ ...S.input, borderColor: payForm.amount && parseFloat(payForm.amount) <= 0 ? "#ef4444" : "#e2e8f0" }}
              type="number" min="1" step="0.01" placeholder="e.g. 5000"
              value={payForm.amount}
              onChange={e => {
                const val = e.target.value;
                // Block negative input at source
                if (val === "" || parseFloat(val) >= 0) setPayForm(f => ({ ...f, amount: val }));
              }}
            />
            {payForm.amount && parseFloat(payForm.amount) <= 0 && (
              <div style={{ color: "#ef4444", fontSize: 11, marginTop: 2 }}>⚠️ Amount must be greater than zero</div>
            )}
            {taskBalance && payForm.amount && parseFloat(payForm.amount) > taskBalance.remaining + 0.01 && (
              <div style={{ color: "#ef4444", fontSize: 11, marginTop: 2 }}>⚠️ Exceeds task balance of {fmt(taskBalance.remaining)}</div>
            )}

            <label style={S.label}>Payment Date *</label>
            <input style={S.input} type="date" value={payForm.payment_date}
              onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />

            <label style={S.label}>Payment Method *</label>
            <select style={S.select} value={payForm.payment_method}
              onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
              <option value="cash">💵 Cash</option>
              <option value="bank">🏦 Bank Transfer</option>
              <option value="upi">📱 UPI</option>
            </select>

            <label style={S.label}>Reference / Note</label>
            <input style={S.input} type="text" placeholder="e.g. March salary advance"
              value={payForm.reference_note}
              onChange={e => setPayForm(f => ({ ...f, reference_note: e.target.value }))} />

            {/* ── Invoice Upload ── */}
            <label style={{ ...S.label, marginTop: 14 }}>Invoice / Payment Slip</label>
            <div
              style={{
                border: `2px dashed ${invoiceWarning && !invoiceFile ? "#ef4444" : "#e2e8f0"}`,
                borderRadius: 10, padding: "14px 16px", background: invoiceFile ? "#f0fdf4" : "#f8fafc",
                cursor: "pointer", textAlign: "center", transition: "all 0.2s",
              }}
              onClick={() => invoiceInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleInvoiceChange(f); }}
            >
              <input
                ref={invoiceInputRef} type="file" style={{ display: "none" }}
                accept="image/*,.pdf"
                onChange={e => handleInvoiceChange(e.target.files[0])}
              />
              {invoiceFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                  {invoicePreview
                    ? <img src={invoicePreview} alt="preview" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #bbf7d0" }} />
                    : <div style={{ fontSize: 32 }}>📄</div>
                  }
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#16a34a" }}>{invoiceFile.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{(invoiceFile.size / 1024).toFixed(1)} KB</div>
                    <button onClick={e => { e.stopPropagation(); handleInvoiceChange(null); }}
                      style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ color: "#94a3b8" }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>📎</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Click or drag invoice/slip here</div>
                  <div style={{ fontSize: 11 }}>JPG, PNG, PDF — max 25MB</div>
                </div>
              )}
            </div>

            {/* No-invoice confirmation */}
            {!invoiceFile && (
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 8, marginTop: 10, padding: "10px 12px",
                background: invoiceWarning ? "#fff7ed" : "#f8fafc",
                border: `1px solid ${invoiceWarning ? "#fed7aa" : "#e2e8f0"}`,
                borderRadius: 8, cursor: "pointer", fontSize: 13,
              }}>
                <input type="checkbox" checked={confirmNoInvoice}
                  onChange={e => { setConfirmNoInvoice(e.target.checked); if (e.target.checked) setInvoiceWarning(false); }}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <span style={{ color: invoiceWarning ? "#92400e" : "#475569" }}>
                  {invoiceWarning
                    ? "⚠️ No invoice uploaded — check this box to proceed without one"
                    : "✓ Confirm proceeding without an invoice slip"}
                </span>
              </label>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={S.btnPrimary} onClick={handleRecordPayment} disabled={loading}>
                {loading ? "Saving…" : payForm.is_advance ? "🏷️ Record Advance" : "✅ Record Payment"}
              </button>
              <button style={S.btnSecondary} onClick={closePayModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Wage Config Modal */}
      {showConfigModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>⚙️ Wage Configuration</h3>
              <button onClick={() => setShowConfigModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#94a3b8" }}>×</button>
            </div>
            <label style={S.label}>Wage Type</label>
            <select style={S.select} value={configForm.wage_type} onChange={e => setConfigForm(f => ({ ...f, wage_type: e.target.value }))}>
              <option value="monthly_salary">Monthly Salary</option>
              <option value="daily_wage">Daily Wage</option>
              <option value="per_task">Per Task</option>
            </select>
            <label style={S.label}>{configForm.wage_type === "monthly_salary" ? "Monthly Amount (₹)" : configForm.wage_type === "daily_wage" ? "Per Day Rate (₹)" : "Per Task Rate (₹)"}</label>
            <input style={S.input} type="number" min="0" step="0.01" placeholder="e.g. 15000" value={configForm.wage_amount}
              onChange={e => setConfigForm(f => ({ ...f, wage_amount: e.target.value }))} />
            <label style={S.label}>Effective From</label>
            <input style={S.input} type="date" value={configForm.effective_from}
              onChange={e => setConfigForm(f => ({ ...f, effective_from: e.target.value }))} />
            <label style={S.label}>Notes (optional)</label>
            <input style={S.input} type="text" placeholder="Any notes…" value={configForm.notes}
              onChange={e => setConfigForm(f => ({ ...f, notes: e.target.value }))} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={S.btnPrimary} onClick={handleSaveConfig}>💾 Save Config</button>
              <button style={S.btnSecondary} onClick={() => setShowConfigModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const styles = {
  page:        { display: "flex", flexDirection: "column", gap: 16 },
  pageHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center" },
  pageTitle:   { margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b" },
  pageSubtitle:{ margin: "4px 0 0", fontSize: 13, color: "#64748b" },
  flash:       { padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 },
  card:        { background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
  sectionTitle:{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#1e293b" },
  filterRow:   { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" },
  label:       { display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.5px" },
  input:       { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" },
  select:      { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#fff" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  thead:       { background: "#f8fafc" },
  th:          { padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e2e8f0" },
  td:          { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#334155" },
  btnPrimary:  { padding: "9px 18px", background: "#1e293b", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" },
  btnSecondary:{ padding: "9px 18px", background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" },
  btnDanger:   { padding: "5px 10px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 },
  overlay:     { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
  modal:       { background: "#fff", borderRadius: 14, padding: "24px 28px", width: 500, maxWidth: "95vw", display: "flex", flexDirection: "column", gap: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", maxHeight: "92vh", overflowY: "auto" },
};

export default Payments;