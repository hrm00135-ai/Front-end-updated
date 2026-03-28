import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { apiCall, getUser, BASE_URL } from "../../utils/api";

const API_BASE_URL = BASE_URL;

const EmployeeDashboard = () => {
  const user = getUser();
  const [tab, setTab] = useState("home");
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [metals, setMetals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Leave apply
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ leave_type_id: "", from_date: "", to_date: "", reason: "", is_half_day: false, half_day_period: "first_half" });
  const [myLeaves, setMyLeaves] = useState([]);
  const [applyingLeave, setApplyingLeave] = useState(false);

  // Attendance history
  const [attHistory, setAttHistory] = useState([]);
  const [attMonth, setAttMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Payslip
  const [payslips, setPayslips] = useState([]);
  const [salaryStructure, setSalaryStructure] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, taskRes, attRes, leaveRes, metalRes] = await Promise.all([
          apiCall(`/profiles/${user.id}`),
          apiCall("/tasks/"),
          apiCall("/attendance/today"),
          apiCall("/leaves/balance"),
          apiCall("/metals/prices"),
        ]);
        const [profileData, taskData, attData, leaveData, metalData] = await Promise.all([
          profileRes.json(), taskRes.json(), attRes.json(), leaveRes.json(), metalRes.json(),
        ]);
        if (profileData.status === "success") setProfile(profileData.data);
        if (taskData.status === "success") setTasks(taskData.data?.tasks || []);
        if (attData.status === "success") setAttendance(attData.data);
        if (leaveData.status === "success") setLeaveBalance(leaveData.data?.balances || []);
        if (metalData.status === "success") setMetals(metalData.data || []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    fetchLeaveTypes();
  }, [user.id]);

  const fetchLeaveTypes = async () => {
    try {
      const res = await apiCall("/leaves/types");
      const data = await res.json();
      if (data.status === "success") setLeaveTypes(data.data || []);
    } catch {}
  };

  const fetchMyLeaves = async () => {
    try {
      const res = await apiCall("/leaves/my-requests");
      const data = await res.json();
      if (data.status === "success") setMyLeaves(data.data || []);
    } catch {}
  };

  const fetchAttHistory = async () => {
    setLoadingHistory(true);
    try {
      const [year, month] = attMonth.split("-");
      const from_date = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const to_date = `${year}-${month}-${lastDay}`;
      const res = await apiCall(`/attendance/my-history?from_date=${from_date}&to_date=${to_date}`);
      const data = await res.json();
      if (data.status === "success") setAttHistory(data.data?.records || data.data || []);
    } catch {} finally { setLoadingHistory(false); }
  };

  const fetchPayslips = async () => {
    try {
      const res = await apiCall(`/payroll/payslip/${user.id}`);
      const data = await res.json();
      if (data.status === "success") {
        setPayslips(Array.isArray(data.data) ? data.data : data.data ? [data.data] : []);
      }
    } catch {}
    try {
      const res2 = await apiCall(`/payroll/payslips/${user.id}`);
      const data2 = await res2.json();
      if (data2.status === "success" && Array.isArray(data2.data)) {
        setPayslips(data2.data);
      }
    } catch {}
  };

  const fetchSalaryStructure = async () => {
    try {
      const res = await apiCall(`/payroll/salary/${user.id}`);
      const data = await res.json();
      if (data.status === "success") setSalaryStructure(data.data);
    } catch {}
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      let body = {};
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        ).catch(() => null);
        if (pos) {
          body = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      }
      const res = await apiCall("/attendance/check-in", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === "success") {
        setAttendance(data.data);
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch {
      setMsg({ text: "Check-in failed", type: "error" });
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      let body = {};
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        ).catch(() => null);
        if (pos) {
          body = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      }
      const res = await apiCall("/attendance/check-out", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === "success") {
        setAttendance(data.data);
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch {
      setMsg({ text: "Check-out failed", type: "error" });
    } finally {
      setCheckingOut(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await apiCall(`/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch {
      setMsg({ text: "Update failed", type: "error" });
    }
  };

  // Leave apply
  const handleApplyLeave = async () => {
    if (!leaveForm.leave_type_id || !leaveForm.from_date || !leaveForm.reason) {
      setMsg({ text: "Leave type, from date, and reason are required", type: "error" });
      return;
    }
    setApplyingLeave(true);
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
        setMsg({ text: data.message || "Leave applied", type: "success" });
        setLeaveForm({ leave_type_id: "", from_date: "", to_date: "", reason: "", is_half_day: false, half_day_period: "first_half" });
        fetchMyLeaves();
        // refresh balance
        const balRes = await apiCall("/leaves/balance");
        const balData = await balRes.json();
        if (balData.status === "success") setLeaveBalance(balData.data?.balances || []);
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    } finally {
      setApplyingLeave(false);
    }
  };

  // Cancel leave
  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm("Cancel this leave request?")) return;
    try {
      const res = await apiCall(`/leaves/${leaveId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Leave cancelled", type: "success" });
        fetchMyLeaves();
      } else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  if (loading) {
    return <Layout><div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading...</div></Layout>;
  }

  const photoUrl = profile?.photo_url
    ? (profile.photo_url.startsWith("http") ? profile.photo_url : `${API_BASE_URL}/${profile.photo_url}`)
    : `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=3b82f6&color=fff&size=80`;

  return (
    <Layout>

      {/* Metal Prices Bar */}
      <div style={{ background: "#1e293b", color: "white", padding: "10px 16px", borderRadius: "10px", marginBottom: "20px", display: "flex", gap: "20px", overflowX: "auto", fontSize: "13px" }}>
        {metals.length > 0 ? metals.map((m, i) => (
          <div key={i} style={{ whiteSpace: "nowrap" }}>
            <span style={{ color: "#94a3b8" }}>{m.metal?.toUpperCase()} {m.purity}: </span>
            <span style={{ fontWeight: "bold", color: "#fbbf24" }}>Rs.{m.price_per_gram}/g</span>
          </div>
        )) : <span style={{ color: "#94a3b8" }}>No metal prices available</span>}
      </div>

      {/* Welcome + Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <img
          src={photoUrl}
          alt="photo"
          style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "3px solid #e2e8f0" }}
        />
        <div>
          <h1 className="text-2xl font-bold">{user.first_name} {user.last_name}</h1>
          <p style={{ color: "#64748b", fontSize: "14px" }}>{user.employee_id} • {user.designation || user.department || "Employee"}</p>
        </div>
      </div>

      {/* Messages */}
      {msg.text && (
        <div style={{ background: msg.type === "error" ? "#fee2e2" : "#dcfce7", color: msg.type === "error" ? "#dc2626" : "#16a34a", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {msg.text}
          <button onClick={() => setMsg({ text: "", type: "" })} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {["home", "apply leave", "my leaves", "attendance history", "payslip"].map(t => (
          <button key={t} onClick={() => {
            setTab(t);
            if (t === "my leaves") fetchMyLeaves();
            if (t === "attendance history") fetchAttHistory();
            if (t === "payslip") { fetchPayslips(); fetchSalaryStructure(); }
          }} style={{
            padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", cursor: "pointer", textTransform: "capitalize",
            background: tab === t ? "#1e293b" : "white", color: tab === t ? "white" : "#1e293b",
          }}>{t}</button>
        ))}
      </div>

      {/* HOME TAB */}
      {tab === "home" && (
        <>
          {/* Attendance Card */}
          <div className="bg-white p-5 rounded-xl shadow mb-6">
            <h2 className="text-lg font-semibold mb-3">Today's Attendance</h2>
            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
              {!attendance?.check_in_time ? (
                <button onClick={handleCheckIn} disabled={checkingIn}
                  style={{ background: checkingIn ? "#86efac" : "#16a34a", color: "white", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
                  {checkingIn ? "Checking in..." : "Check In"}
                </button>
              ) : !attendance?.check_out_time ? (
                <>
                  <div style={{ background: "#dcfce7", color: "#16a34a", padding: "8px 16px", borderRadius: "8px", fontSize: "13px" }}>
                    Checked in at {new Date(attendance.check_in_time).toLocaleTimeString()}
                    {attendance.is_late && <span style={{ color: "#ea580c", marginLeft: "8px" }}>(Late by {attendance.late_minutes} min)</span>}
                  </div>
                  <button onClick={handleCheckOut} disabled={checkingOut}
                    style={{ background: checkingOut ? "#fca5a5" : "#dc2626", color: "white", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
                    {checkingOut ? "Checking out..." : "Check Out"}
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <MiniStat label="Check In" value={new Date(attendance.check_in_time).toLocaleTimeString()} bg="#dcfce7" color="#16a34a" />
                  <MiniStat label="Check Out" value={new Date(attendance.check_out_time).toLocaleTimeString()} bg="#dbeafe" color="#2563eb" />
                  <MiniStat label="Total Hours" value={`${attendance.total_hours || 0}h`} bg="#f3e8ff" color="#7c3aed" />
                  <MiniStat label="Status" value={attendance.status?.replace("_", " ")} bg={attendance.status === "present" ? "#dcfce7" : "#fed7aa"} color={attendance.status === "present" ? "#16a34a" : "#ea580c"} />
                </div>
              )}
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white p-5 rounded-xl shadow mb-6">
            <h2 className="text-lg font-semibold mb-3">My Tasks</h2>
            {tasks.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "14px" }}>No tasks assigned</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {tasks.map(t => (
                  <div key={t.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div style={{ fontWeight: "600", fontSize: "15px" }}>{t.title}</div>
                      <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
                        {t.category && <span>{t.category} • </span>}
                        Due: {t.due_date || "No deadline"} • Priority: <PriorityBadge priority={t.priority} />
                      </div>
                      {t.description && <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>{t.description}</div>}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <StatusBadge status={t.status} />
                      {t.status === "pending" && (
                        <ActionBtn label="Start" color="#3b82f6" onClick={() => updateTaskStatus(t.id, "in_progress")} />
                      )}
                      {t.status === "in_progress" && (
                        <>
                          <ActionBtn label="Complete" color="#16a34a" onClick={() => updateTaskStatus(t.id, "completed")} />
                          <ActionBtn label="Hold" color="#8b5cf6" onClick={() => updateTaskStatus(t.id, "on_hold")} />
                        </>
                      )}
                      {t.status === "on_hold" && (
                        <ActionBtn label="Resume" color="#3b82f6" onClick={() => updateTaskStatus(t.id, "in_progress")} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Balance */}
          <div className="bg-white p-5 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-3">Leave Balance</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
              {leaveBalance.map((lb, i) => (
                <div key={i} style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>{lb.leave_type_name}</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", marginTop: "4px" }}>{lb.available}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Used: {lb.used} / {lb.total_quota}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* APPLY LEAVE TAB */}
      {tab === "apply leave" && (
        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Apply for Leave</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", maxWidth: "600px" }}>
            <div>
              <label style={lbl}>Leave Type *</label>
              <select value={leaveForm.leave_type_id} onChange={e => setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })} style={inp}>
                <option value="">Select...</option>
                {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} (Max: {lt.max_days}d)</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>From Date *</label>
              <input type="date" value={leaveForm.from_date} onChange={e => setLeaveForm({ ...leaveForm, from_date: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>To Date</label>
              <input type="date" value={leaveForm.to_date} onChange={e => setLeaveForm({ ...leaveForm, to_date: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={{ ...lbl, display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" checked={leaveForm.is_half_day} onChange={e => setLeaveForm({ ...leaveForm, is_half_day: e.target.checked })} />
                Half Day
              </label>
              {leaveForm.is_half_day && (
                <select value={leaveForm.half_day_period} onChange={e => setLeaveForm({ ...leaveForm, half_day_period: e.target.value })} style={inp}>
                  <option value="first_half">First Half</option>
                  <option value="second_half">Second Half</option>
                </select>
              )}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Reason *</label>
              <textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Reason for leave..." />
            </div>
          </div>
          <button onClick={handleApplyLeave} disabled={applyingLeave}
            style={{ marginTop: "16px", background: "#2563eb", color: "white", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", opacity: applyingLeave ? 0.6 : 1 }}>
            {applyingLeave ? "Applying..." : "Submit Leave"}
          </button>
        </div>
      )}

      {/* MY LEAVES TAB */}
      {tab === "my leaves" && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 style={{ fontWeight: "600" }}>My Leave Requests</h3>
          </div>
          {myLeaves.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No leave requests</div>
          ) : (
            <div>
              {myLeaves.map(l => (
                <div key={l.id} style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>{l.leave_type_name} — {l.total_days} day(s)</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{l.from_date} to {l.to_date}</div>
                    {l.reason && <div style={{ fontSize: "12px", color: "#94a3b8" }}>{l.reason}</div>}
                    {l.review_comment && <div style={{ fontSize: "12px", color: "#ea580c", marginTop: "2px" }}>Comment: {l.review_comment}</div>}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{
                      background: l.status === "approved" ? "#dcfce7" : l.status === "rejected" ? "#fee2e2" : l.status === "cancelled" ? "#f1f5f9" : "#fef3c7",
                      color: l.status === "approved" ? "#16a34a" : l.status === "rejected" ? "#dc2626" : l.status === "cancelled" ? "#6b7280" : "#d97706",
                      padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600",
                    }}>
                      {l.status}
                    </span>
                    {l.status === "pending" && (
                      <button onClick={() => handleCancelLeave(l.id)}
                        style={{ background: "#fee2e2", color: "#dc2626", padding: "4px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: "600" }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ATTENDANCE HISTORY TAB */}
      {tab === "attendance history" && (
        <>
          <div className="bg-white p-4 rounded-xl shadow mb-6" style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <div>
              <label style={lbl}>Month</label>
              <input type="month" value={attMonth} onChange={e => setAttMonth(e.target.value)} style={inp} />
            </div>
            <button onClick={fetchAttHistory}
              style={{ background: "#1e293b", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
              Load
            </button>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            {loadingHistory ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>
            ) : attHistory.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No records</div>
            ) : (
              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <th style={th}>Date</th>
                    <th style={th}>Check In</th>
                    <th style={th}>Check Out</th>
                    <th style={th}>Hours</th>
                    <th style={th}>Status</th>
                    <th style={th}>Late</th>
                  </tr>
                </thead>
                <tbody>
                  {attHistory.map((r, i) => (
                    <tr key={r.id || i} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={td}>{r.date}</td>
                      <td style={td}>{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : "—"}</td>
                      <td style={td}>{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : "—"}</td>
                      <td style={td}>{r.total_hours?.toFixed(1) || "—"}</td>
                      <td style={td}>
                        <span style={{ background: r.status === "present" ? "#dcfce7" : "#fee2e2", color: r.status === "present" ? "#16a34a" : "#dc2626", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                          {r.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td style={td}>{r.is_late ? `${r.late_minutes}m` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* PAYSLIP TAB */}
      {tab === "payslip" && (
        <>
          {/* Salary Structure */}
          {salaryStructure && (
            <div className="bg-white p-5 rounded-xl shadow mb-6">
              <h3 style={{ fontWeight: "600", marginBottom: "12px" }}>My Salary Structure</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                <SumCard label="Gross" value={`₹${salaryStructure.gross_salary || 0}`} color="#1e293b" />
                <SumCard label="Deductions" value={`₹${salaryStructure.total_deductions || 0}`} color="#dc2626" />
                <SumCard label="Net" value={`₹${salaryStructure.net_salary || 0}`} color="#16a34a" />
                <SumCard label="CTC" value={`₹${salaryStructure.ctc || 0}`} color="#3b82f6" />
              </div>
            </div>
          )}

          {/* Payslips */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ fontWeight: "600" }}>My Payslips</h3>
            </div>
            {payslips.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No payslips found</div>
            ) : (
              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <th style={th}>Month/Year</th>
                    <th style={th}>Gross</th>
                    <th style={th}>Deductions</th>
                    <th style={th}>Net</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((p, i) => (
                    <tr key={p.id || i} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={td}>{p.month}/{p.year}</td>
                      <td style={td}>₹{p.gross_salary}</td>
                      <td style={td}>₹{p.total_deductions}</td>
                      <td style={{ ...td, fontWeight: "600", color: "#16a34a" }}>₹{p.net_salary}</td>
                      <td style={td}>
                        <span style={{ background: p.payment_status === "paid" ? "#dcfce7" : "#fef3c7", color: p.payment_status === "paid" ? "#16a34a" : "#d97706", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                          {p.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

    </Layout>
  );
};

const th = { padding: "10px 12px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#64748b" };
const td = { padding: "10px 12px" };
const lbl = { fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" };
const inp = { width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" };

const MiniStat = ({ label, value, bg, color }) => (
  <div style={{ background: bg, color, padding: "8px 14px", borderRadius: "8px", textAlign: "center" }}>
    <div style={{ fontSize: "11px" }}>{label}</div>
    <div style={{ fontWeight: "bold", fontSize: "14px" }}>{value}</div>
  </div>
);

const SumCard = ({ label, value, color }) => (
  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
    <p style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>{label}</p>
    <p style={{ fontSize: "18px", fontWeight: "bold", color, marginTop: "4px" }}>{value}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = { pending: "#f59e0b", in_progress: "#3b82f6", completed: "#16a34a", cancelled: "#6b7280", on_hold: "#8b5cf6" };
  return <span style={{ background: `${colors[status] || "#6b7280"}20`, color: colors[status] || "#6b7280", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>{status?.replace("_", " ")}</span>;
};

const PriorityBadge = ({ priority }) => {
  const colors = { low: "#6b7280", medium: "#3b82f6", high: "#ea580c", urgent: "#dc2626" };
  return <span style={{ color: colors[priority] || "#6b7280", fontWeight: "600" }}>{priority}</span>;
};

const ActionBtn = ({ label, color, onClick }) => (
  <button onClick={onClick} style={{ background: color, color: "white", padding: "4px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>{label}</button>
);

export default EmployeeDashboard;
