import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { apiCall, getUser } from "../../utils/api";
import AdminTopBar from "../../components/AdminTopBar";

const Attendance = () => {
  const user = getUser();
  const isSuperAdmin = user?.role === "super_admin";
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("records");
  const [config, setConfig] = useState(null);
  const [configForm, setConfigForm] = useState({});
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Override modal
  const [overrideModal, setOverrideModal] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ check_in_time: "", check_out_time: "", status: "present", reason: "" });

  // Mark absent modal
  const [absentModal, setAbsentModal] = useState(false);
  const [absentForm, setAbsentForm] = useState({ user_id: "", date: "", notes: "" });

  useEffect(() => {
    fetchEmployees();
    fetchConfig();
  }, []);

  useEffect(() => {
    if (selectedEmp) {
      fetchAttendance();
      fetchSummary();
    }
  }, [selectedEmp, month]);

  const fetchEmployees = async () => {
    try {
      const res = await apiCall("/users/?per_page=100");
      const data = await res.json();
      if (data.status === "success") setEmployees(data.data?.users?.filter(u => u.role === "employee") || []);
    } catch {}
  };

  const fetchAttendance = async () => {
    if (!selectedEmp) return;
    setLoading(true);
    try {
      const res = await apiCall(`/attendance/employee/${selectedEmp}?month=${month}`);
      const data = await res.json();
      if (data.status === "success") setRecords(data.data || []);
    } catch {} finally { setLoading(false); }
  };

  const fetchSummary = async () => {
    if (!selectedEmp) return;
    try {
      const res = await apiCall(`/attendance/summary/${selectedEmp}?month=${month}`);
      const data = await res.json();
      if (data.status === "success") setSummary(data.data);
    } catch {}
  };

  const fetchConfig = async () => {
    try {
      const res = await apiCall("/attendance/config");
      const data = await res.json();
      if (data.status === "success") {
        setConfig(data.data);
        setConfigForm(data.data || {});
      }
    } catch {}
  };

  const handleOverride = async () => {
    if (!overrideForm.reason) { setMsg({ text: "Reason is required", type: "error" }); return; }
    try {
      const res = await apiCall(`/attendance/override/${overrideModal}`, {
        method: "PUT",
        body: JSON.stringify(overrideForm),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Attendance overridden", type: "success" });
        setOverrideModal(null);
        fetchAttendance();
        fetchSummary();
      } else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  const handleMarkAbsent = async () => {
    if (!absentForm.user_id || !absentForm.date) { setMsg({ text: "Employee and date required", type: "error" }); return; }
    try {
      const res = await apiCall("/attendance/mark-absent", {
        method: "POST",
        body: JSON.stringify(absentForm),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Marked absent", type: "success" });
        setAbsentModal(false);
        setAbsentForm({ user_id: "", date: "", notes: "" });
        if (selectedEmp == absentForm.user_id) { fetchAttendance(); fetchSummary(); }
      } else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  const handleUpdateConfig = async () => {
    try {
      const res = await apiCall("/attendance/config", {
        method: "PUT",
        body: JSON.stringify(configForm),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Config updated", type: "success" });
        fetchConfig();
      } else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  const statusColor = (s) => {
    const c = { present: "#16a34a", absent: "#dc2626", half_day: "#f59e0b", on_leave: "#8b5cf6", holiday: "#3b82f6" };
    return c[s] || "#6b7280";
  };

  return (
    <Layout topBar={<AdminTopBar />} >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <button onClick={() => setAbsentModal(true)} style={{ background: "#dc2626", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
          Mark Absent
        </button>
      </div>

      {msg.text && (
        <div style={{ background: msg.type === "error" ? "#fee2e2" : "#dcfce7", color: msg.type === "error" ? "#dc2626" : "#16a34a", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {msg.text}
          <button onClick={() => setMsg({ text: "", type: "" })} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {["records", ...(isSuperAdmin ? ["config"] : [])].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", cursor: "pointer",
            background: tab === t ? "#1e293b" : "white", color: tab === t ? "white" : "#1e293b",
          }}>{t === "records" ? "Employee Records" : "Shift Config"}</button>
        ))}
      </div>

      {tab === "records" && (
        <>
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow mb-6" style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Employee</label>
              <select value={selectedEmp || ""} onChange={e => setSelectedEmp(e.target.value)}
                style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", minWidth: "200px" }}>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Month</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }} />
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
              <SumCard label="Present" value={summary.present} color="#16a34a" />
              <SumCard label="Absent" value={summary.absent} color="#dc2626" />
              <SumCard label="Half Days" value={summary.half_days} color="#f59e0b" />
              <SumCard label="Late" value={summary.late_days} color="#ea580c" />
              <SumCard label="Total Hours" value={summary.total_hours?.toFixed(1)} color="#3b82f6" />
              <SumCard label="Overtime" value={summary.overtime_hours?.toFixed(1)} color="#8b5cf6" />
              <SumCard label="Working Days" value={summary.working_days} color="#1e293b" />
            </div>
          )}

          {/* Records Table */}
          {selectedEmp ? (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {loading ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>
              ) : records.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No records for this month</div>
              ) : (
                <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f8fafc" }}>
                    <tr>
                      <th style={th}>Date</th>
                      <th style={th}>Check In</th>
                      <th style={th}>Check Out</th>
                      <th style={th}>Hours</th>
                      <th style={th}>OT</th>
                      <th style={th}>Status</th>
                      <th style={th}>Late</th>
                      <th style={th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={td}>{r.date}</td>
                        <td style={td}>{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : "—"}</td>
                        <td style={td}>{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : "—"}</td>
                        <td style={td}>{r.total_hours?.toFixed(1) || "—"}</td>
                        <td style={td}>{r.overtime_hours?.toFixed(1) || "0"}</td>
                        <td style={td}>
                          <span style={{ background: `${statusColor(r.status)}20`, color: statusColor(r.status), padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                            {r.status?.replace("_", " ")}
                          </span>
                        </td>
                        <td style={td}>{r.is_late ? `${r.late_minutes}m` : "—"}</td>
                        <td style={td}>
                          <button onClick={() => { setOverrideModal(r.id); setOverrideForm({ check_in_time: r.check_in_time || "", check_out_time: r.check_out_time || "", status: r.status || "present", reason: "" }); }}
                            style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>
                            Override
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="bg-white p-10 rounded-xl shadow text-center" style={{ color: "#94a3b8" }}>
              Select an employee to view attendance records
            </div>
          )}
        </>
      )}

      {tab === "config" && isSuperAdmin && (
        <div className="bg-white p-6 rounded-xl shadow" style={{ maxWidth: "500px" }}>
          <h3 style={{ fontWeight: "600", marginBottom: "16px" }}>Shift Configuration</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <FormInput label="Shift Start" type="time" value={configForm.shift_start || ""} onChange={v => setConfigForm({ ...configForm, shift_start: v })} />
            <FormInput label="Shift End" type="time" value={configForm.shift_end || ""} onChange={v => setConfigForm({ ...configForm, shift_end: v })} />
            <FormInput label="Late Threshold (mins)" type="number" value={configForm.late_threshold_minutes || ""} onChange={v => setConfigForm({ ...configForm, late_threshold_minutes: parseInt(v) })} />
            <FormInput label="Full Day Hours" type="number" value={configForm.full_day_hours || ""} onChange={v => setConfigForm({ ...configForm, full_day_hours: parseInt(v) })} />
            <FormInput label="Overtime After (hours)" type="number" value={configForm.overtime_after_hours || ""} onChange={v => setConfigForm({ ...configForm, overtime_after_hours: parseInt(v) })} />
            <button onClick={handleUpdateConfig} style={{ background: "#2563eb", color: "white", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", marginTop: "8px" }}>
              Save Config
            </button>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideModal && (
        <Modal title="Override Attendance" onClose={() => setOverrideModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <FormInput label="Check In Time" type="datetime-local" value={overrideForm.check_in_time?.slice(0, 16) || ""} onChange={v => setOverrideForm({ ...overrideForm, check_in_time: v })} />
            <FormInput label="Check Out Time" type="datetime-local" value={overrideForm.check_out_time?.slice(0, 16) || ""} onChange={v => setOverrideForm({ ...overrideForm, check_out_time: v })} />
            <div>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Status</label>
              <select value={overrideForm.status} onChange={e => setOverrideForm({ ...overrideForm, status: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half Day</option>
              </select>
            </div>
            <FormInput label="Reason *" value={overrideForm.reason} onChange={v => setOverrideForm({ ...overrideForm, reason: v })} />
            <button onClick={handleOverride} style={{ background: "#2563eb", color: "white", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>
              Apply Override
            </button>
          </div>
        </Modal>
      )}

      {/* Mark Absent Modal */}
      {absentModal && (
        <Modal title="Mark Absent" onClose={() => setAbsentModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Employee</label>
              <select value={absentForm.user_id} onChange={e => setAbsentForm({ ...absentForm, user_id: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <FormInput label="Date" type="date" value={absentForm.date} onChange={v => setAbsentForm({ ...absentForm, date: v })} />
            <FormInput label="Notes" value={absentForm.notes} onChange={v => setAbsentForm({ ...absentForm, notes: v })} />
            <button onClick={handleMarkAbsent} style={{ background: "#dc2626", color: "white", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>
              Mark Absent
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
};

const th = { padding: "10px 12px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#64748b" };
const td = { padding: "10px 12px" };

const SumCard = ({ label, value, color }) => (
  <div className="bg-white p-3 rounded-xl shadow text-center">
    <p style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>{label}</p>
    <p style={{ fontSize: "20px", fontWeight: "bold", color }}>{value ?? "—"}</p>
  </div>
);

const FormInput = ({ label, value, onChange, type = "text" }) => (
  <div>
    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }} />
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
    <div style={{ background: "white", borderRadius: "12px", padding: "24px", width: "400px", maxWidth: "90vw", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ fontWeight: "600", fontSize: "16px" }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#64748b" }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

export default Attendance;
