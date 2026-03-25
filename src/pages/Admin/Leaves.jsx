import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { apiCall, getUser } from "../../utils/api";

const Leaves = () => {
  const user = getUser();
  const isSuperAdmin = user?.role === "super_admin";
  const [tab, setTab] = useState("pending");
  const [pending, setPending] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [processing, setProcessing] = useState(null);

  // Leave type form
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: "", max_days: 12, is_paid: true, carry_forward: false });

  // Holiday form
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "", is_optional: false });

  useEffect(() => {
    fetchPending();
    fetchLeaveTypes();
    fetchHolidays();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await apiCall("/leaves/pending");
      const data = await res.json();
      if (data.status === "success") setPending(data.data || []);
    } catch {} finally { setLoading(false); }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await apiCall("/leaves/types");
      const data = await res.json();
      if (data.status === "success") setLeaveTypes(data.data || []);
    } catch {}
  };

  const fetchHolidays = async () => {
    try {
      const res = await apiCall("/leaves/holidays");
      const data = await res.json();
      if (data.status === "success") setHolidays(data.data || []);
    } catch {}
  };

  const handleAction = async (id, action, comment = "") => {
    setProcessing(id);
    try {
      const res = await apiCall(`/leaves/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: `Leave ${action}ed`, type: "success" });
        fetchPending();
      } else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
    finally { setProcessing(null); }
  };

  const handleAddType = async () => {
    try {
      const res = await apiCall("/leaves/types", { method: "POST", body: JSON.stringify(typeForm) });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Leave type added", type: "success" });
        setShowTypeForm(false);
        setTypeForm({ name: "", max_days: 12, is_paid: true, carry_forward: false });
        fetchLeaveTypes();
      } else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  const handleAddHoliday = async () => {
    try {
      const res = await apiCall("/leaves/holidays", { method: "POST", body: JSON.stringify(holidayForm) });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Holiday added", type: "success" });
        setShowHolidayForm(false);
        setHolidayForm({ name: "", date: "", is_optional: false });
        fetchHolidays();
      } else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  const tabs = ["pending", "leave types", "holidays"];

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Leave Management</h1>

      {msg.text && (
        <div style={{ background: msg.type === "error" ? "#fee2e2" : "#dcfce7", color: msg.type === "error" ? "#dc2626" : "#16a34a", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {msg.text}
          <button onClick={() => setMsg({ text: "", type: "" })} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", cursor: "pointer", textTransform: "capitalize",
            background: tab === t ? "#1e293b" : "white", color: tab === t ? "white" : "#1e293b",
          }}>{t}</button>
        ))}
      </div>

      {/* PENDING */}
      {tab === "pending" && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>
          ) : pending.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No pending leave requests</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {pending.map(l => (
                <div key={l.id} style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: "250px" }}>
                    <div style={{ fontWeight: "600" }}>{l.employee_name} <span style={{ color: "#94a3b8", fontSize: "12px" }}>({l.employee_id})</span></div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                      {l.leave_type_name} • {l.total_days} day(s) • {l.from_date} to {l.to_date}
                    </div>
                    {l.reason && <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Reason: {l.reason}</div>}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleAction(l.id, "approve")} disabled={processing === l.id}
                      style={{ background: "#16a34a", color: "white", padding: "6px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                      Approve
                    </button>
                    <button onClick={() => { const comment = prompt("Rejection reason:"); if (comment !== null) handleAction(l.id, "reject", comment); }}
                      disabled={processing === l.id}
                      style={{ background: "#dc2626", color: "white", padding: "6px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LEAVE TYPES */}
      {tab === "leave types" && (
        <>
          {isSuperAdmin && (
            <div style={{ marginBottom: "16px" }}>
              <button onClick={() => setShowTypeForm(!showTypeForm)} style={{ background: "#1e293b", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                {showTypeForm ? "Cancel" : "+ Add Leave Type"}
              </button>
            </div>
          )}

          {showTypeForm && (
            <div className="bg-white p-5 rounded-xl shadow mb-6" style={{ maxWidth: "500px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <FI label="Name" value={typeForm.name} onChange={v => setTypeForm({ ...typeForm, name: v })} />
                <FI label="Max Days / Year" type="number" value={typeForm.max_days} onChange={v => setTypeForm({ ...typeForm, max_days: parseInt(v) })} />
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                  <input type="checkbox" checked={typeForm.is_paid} onChange={e => setTypeForm({ ...typeForm, is_paid: e.target.checked })} /> Paid Leave
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                  <input type="checkbox" checked={typeForm.carry_forward} onChange={e => setTypeForm({ ...typeForm, carry_forward: e.target.checked })} /> Carry Forward
                </label>
                <button onClick={handleAddType} style={{ background: "#2563eb", color: "white", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>Add</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Max Days</th>
                  <th style={th}>Paid</th>
                  <th style={th}>Carry Forward</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No leave types configured</td></tr>
                ) : leaveTypes.map(lt => (
                  <tr key={lt.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={td}>{lt.name}</td>
                    <td style={td}>{lt.max_days}</td>
                    <td style={td}>{lt.is_paid ? "Yes" : "No"}</td>
                    <td style={td}>{lt.carry_forward ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* HOLIDAYS */}
      {tab === "holidays" && (
        <>
          <div style={{ marginBottom: "16px" }}>
            <button onClick={() => setShowHolidayForm(!showHolidayForm)} style={{ background: "#1e293b", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
              {showHolidayForm ? "Cancel" : "+ Add Holiday"}
            </button>
          </div>

          {showHolidayForm && (
            <div className="bg-white p-5 rounded-xl shadow mb-6" style={{ maxWidth: "500px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <FI label="Holiday Name" value={holidayForm.name} onChange={v => setHolidayForm({ ...holidayForm, name: v })} />
                <FI label="Date" type="date" value={holidayForm.date} onChange={v => setHolidayForm({ ...holidayForm, date: v })} />
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                  <input type="checkbox" checked={holidayForm.is_optional} onChange={e => setHolidayForm({ ...holidayForm, is_optional: e.target.checked })} /> Optional Holiday
                </label>
                <button onClick={handleAddHoliday} style={{ background: "#2563eb", color: "white", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>Add Holiday</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={th}>Holiday</th>
                  <th style={th}>Date</th>
                  <th style={th}>Type</th>
                </tr>
              </thead>
              <tbody>
                {holidays.length === 0 ? (
                  <tr><td colSpan="3" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No holidays added</td></tr>
                ) : holidays.map((h, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={td}>{h.name}</td>
                    <td style={td}>{h.date}</td>
                    <td style={td}>
                      <span style={{ background: h.is_optional ? "#fef3c7" : "#dbeafe", color: h.is_optional ? "#d97706" : "#2563eb", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>
                        {h.is_optional ? "Optional" : "Mandatory"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
};

const th = { padding: "10px 12px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#64748b" };
const td = { padding: "10px 12px" };

const FI = ({ label, value, onChange, type = "text" }) => (
  <div>
    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }} />
  </div>
);

export default Leaves;
