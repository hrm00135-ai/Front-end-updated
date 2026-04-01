import { useState, useEffect } from "react";
import { apiCall } from "../../utils/api";
import Layout from "../../components/Layout";

const EmployeeLeaves = () => {
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: "",
    from_date: "",
    to_date: "",
    reason: "",
    is_half_day: false,
    half_day_period: "first_half",
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [balRes, typesRes, myRes] = await Promise.allSettled([
        apiCall("/leaves/balance"),
        apiCall("/leaves/types"),
        apiCall("/leaves/my-requests"),
      ]);

      if (balRes.status === "fulfilled") {
        const data = await balRes.value.json();
        if (data.status === "success") setLeaveBalance(data.data?.balances || []);
      }
      if (typesRes.status === "fulfilled") {
        const data = await typesRes.value.json();
        if (data.status === "success") setLeaveTypes(data.data || []);
      }
      if (myRes.status === "fulfilled") {
        const data = await myRes.value.json();
        if (data.status === "success") setMyLeaves(data.data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyLeaves = async () => {
    try {
      const res = await apiCall("/leaves/my-requests");
      const data = await res.json();
      if (data.status === "success") setMyLeaves(data.data || []);
    } catch {}
  };

  const handleApply = async () => {
    if (!leaveForm.leave_type_id || !leaveForm.from_date || !leaveForm.reason) {
      setMsg({ text: "Leave type, from date, and reason are required.", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        ...leaveForm,
        leave_type_id: parseInt(leaveForm.leave_type_id),
        to_date: leaveForm.to_date || leaveForm.from_date,
      };
      const res = await apiCall("/leaves/apply", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: data.message || "Leave applied successfully!", type: "success" });
        setLeaveForm({ leave_type_id: "", from_date: "", to_date: "", reason: "", is_half_day: false, half_day_period: "first_half" });
        fetchAll();
      } else {
        setMsg({ text: data.message || "Failed to apply leave.", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this leave request?")) return;
    try {
      const res = await apiCall(`/leaves/${id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Leave cancelled.", type: "success" });
        fetchMyLeaves();
      } else {
        setMsg({ text: data.message || "Failed to cancel.", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error.", type: "error" });
    }
  };

  const statusStyle = (status) => {
    const map = {
      approved:  { background: "#dcfce7", color: "#16a34a" },
      pending:   { background: "#fef3c7", color: "#d97706" },
      rejected:  { background: "#fee2e2", color: "#dc2626" },
      cancelled: { background: "#f1f5f9", color: "#6b7280" },
    };
    return map[status] || { background: "#f1f5f9", color: "#6b7280" };
  };

  const inp = {
    width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1",
    borderRadius: "6px", fontSize: "14px", boxSizing: "border-box",
  };
  const lbl = { fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: "600" };

  return (
    <Layout>
      <div style={{ padding: "16px", width: "100%" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "20px" }}>Leaves</h1>

        {/* Message */}
        {msg.text && (
          <div style={{
            background: msg.type === "error" ? "#fee2e2" : "#dcfce7",
            color: msg.type === "error" ? "#dc2626" : "#16a34a",
            padding: "10px 14px", borderRadius: "8px", marginBottom: "16px",
            fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            {msg.text}
            <button onClick={() => setMsg({ text: "", type: "" })}
              style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>Loading...</div>
        ) : (
          <>
            {/* Leave Balance Cards */}
            {leaveBalance.length > 0 && (
              <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", marginBottom: "20px" }}>
                {leaveBalance.map((lb, i) => (
                  <div key={i} style={{
                    background: "white", borderRadius: "12px", border: "1px solid #e2e8f0",
                    padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}>
                    <p style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>{lb.leave_type_name}</p>
                    <p style={{ fontSize: "26px", fontWeight: "bold", color: "#1e293b", marginTop: "4px" }}>{lb.available}</p>
                    <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                      Used {lb.used} of {lb.total_quota}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Apply Leave Form */}
            <div style={{
              background: "white", borderRadius: "12px", border: "1px solid #e2e8f0",
              padding: "20px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b", marginBottom: "16px" }}>
                Apply for Leave
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", maxWidth: "600px" }}>
                <div>
                  <label style={lbl}>Leave Type *</label>
                  <select value={leaveForm.leave_type_id}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })}
                    style={inp}>
                    <option value="">Select...</option>
                    {leaveTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>{lt.name} (Max: {lt.max_days}d)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={lbl}>From Date *</label>
                  <input type="date" value={leaveForm.from_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                    style={inp} />
                </div>

                <div>
                  <label style={lbl}>To Date</label>
                  <input type="date" value={leaveForm.to_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                    style={inp} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <label style={{ ...lbl, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input type="checkbox" checked={leaveForm.is_half_day}
                      onChange={(e) => setLeaveForm({ ...leaveForm, is_half_day: e.target.checked })} />
                    Half Day
                  </label>
                  {leaveForm.is_half_day && (
                    <select value={leaveForm.half_day_period}
                      onChange={(e) => setLeaveForm({ ...leaveForm, half_day_period: e.target.value })}
                      style={{ ...inp, marginTop: "6px" }}>
                      <option value="first_half">First Half</option>
                      <option value="second_half">Second Half</option>
                    </select>
                  )}
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={lbl}>Reason *</label>
                  <textarea value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    rows={3} placeholder="Reason for leave..."
                    style={{ ...inp, resize: "vertical" }} />
                </div>
              </div>

              <button onClick={handleApply} disabled={submitting} style={{
                marginTop: "16px", background: submitting ? "#93c5fd" : "#2563eb",
                color: "white", padding: "10px 24px", borderRadius: "8px",
                border: "none", cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: "600", fontSize: "14px",
              }}>
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>

            {/* Leave History */}
            <div style={{
              background: "white", borderRadius: "12px", border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden",
            }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
                <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>Leave History</h2>
              </div>

              {myLeaves.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: "36px", marginBottom: "10px" }}>🗓️</div>
                  <p style={{ fontWeight: "600", color: "#64748b" }}>No leave requests yet</p>
                </div>
              ) : (
                <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f8fafc" }}>
                    <tr>
                      {["Type", "From", "To", "Days", "Reason", "Status", ""].map((h) => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#64748b" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.map((l, i) => (
                      <tr key={l.id || i} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px", fontWeight: "600", color: "#1e293b" }}>{l.leave_type_name}</td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{l.from_date}</td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{l.to_date}</td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{l.total_days}d</td>
                        <td style={{ padding: "12px 16px", color: "#94a3b8", maxWidth: "200px" }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                            {l.reason || "—"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            ...statusStyle(l.status),
                            padding: "3px 10px", borderRadius: "6px",
                            fontSize: "11px", fontWeight: "600",
                          }}>
                            {l.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {l.status === "pending" && (
                            <button onClick={() => handleCancel(l.id)} style={{
                              background: "#fee2e2", color: "#dc2626", padding: "4px 12px",
                              borderRadius: "6px", border: "none", cursor: "pointer",
                              fontSize: "11px", fontWeight: "600",
                            }}>
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default EmployeeLeaves;