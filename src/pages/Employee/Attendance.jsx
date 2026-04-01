import { useState, useEffect } from "react";
import { apiCall, getUser } from "../../utils/api";
import Layout from "../../components/Layout";

const EmployeeAttendance = () => {
  const user = getUser();
  const [todayAtt, setTodayAtt] = useState(null);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [attMonth, setAttMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    fetchToday();
    fetchHistory();
  }, []);

  const fetchToday = async () => {
    try {
      const res = await apiCall("/attendance/today");
      const data = await res.json();
      if (data.status === "success") setTodayAtt(data.data);
    } catch (err) {
      console.error("Failed to fetch today:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (month = attMonth) => {
    setLoadingHistory(true);
    try {
      const [year, mon] = month.split("-");
      const from_date = `${year}-${mon}-01`;
      const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
      const to_date = `${year}-${mon}-${lastDay}`;

      const [histRes, sumRes] = await Promise.allSettled([
        apiCall(`/attendance/my-history?from_date=${from_date}&to_date=${to_date}`),
        apiCall(`/attendance/summary?from_date=${from_date}&to_date=${to_date}`),
      ]);

      if (histRes.status === "fulfilled") {
        const data = await histRes.value.json();
        if (data.status === "success")
          setHistory(data.data?.records || data.data || []);
      }
      if (sumRes.status === "fulfilled") {
        const data = await sumRes.value.json();
        if (data.status === "success") setSummary(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      let body = {};
      if (navigator.geolocation) {
        const pos = await new Promise((resolve) =>
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000 })
        );
        if (pos) body = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      const res = await apiCall("/attendance/check-in", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === "success") {
        setTodayAtt(data.data);
        setMsg({ text: "Checked in successfully!", type: "success" });
      } else {
        setMsg({ text: data.message || "Check-in failed", type: "error" });
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
        const pos = await new Promise((resolve) =>
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000 })
        );
        if (pos) body = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      const res = await apiCall("/attendance/check-out", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === "success") {
        setTodayAtt(data.data);
        setMsg({ text: "Checked out successfully!", type: "success" });
      } else {
        setMsg({ text: data.message || "Check-out failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Check-out failed", type: "error" });
    } finally {
      setCheckingOut(false);
    }
  };

  const statusStyle = (status) => {
    const map = {
      present:      { background: "#dcfce7", color: "#16a34a" },
      absent:       { background: "#fee2e2", color: "#dc2626" },
      late:         { background: "#fef3c7", color: "#d97706" },
      half_day:     { background: "#dbeafe", color: "#2563eb" },
      on_leave:     { background: "#f3e8ff", color: "#7c3aed" },
    };
    return map[status] || { background: "#f1f5f9", color: "#64748b" };
  };

  return (
    <Layout>
      <div style={{ padding: "16px", width: "100%" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "20px" }}>
          Attendance
        </h1>

        {/* Message */}
        {msg.text && (
          <div style={{
            background: msg.type === "error" ? "#fee2e2" : "#dcfce7",
            color: msg.type === "error" ? "#dc2626" : "#16a34a",
            padding: "10px 14px", borderRadius: "8px", marginBottom: "16px",
            fontSize: "14px", display: "flex", justifyContent: "space-between",
          }}>
            {msg.text}
            <button onClick={() => setMsg({ text: "", type: "" })}
              style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>
              ×
            </button>
          </div>
        )}

        {/* Today's Card */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Loading...</div>
        ) : (
          <div style={{
            background: "white", borderRadius: "12px", border: "1px solid #e2e8f0",
            padding: "20px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b", marginBottom: "16px" }}>
              Today's Attendance
            </h2>

            {!todayAtt?.check_in_time ? (
              /* Not checked in yet */
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <span style={{ fontSize: "14px", color: "#94a3b8" }}>You haven't checked in yet</span>
                <button onClick={handleCheckIn} disabled={checkingIn} style={{
                  background: checkingIn ? "#86efac" : "#16a34a", color: "white",
                  padding: "10px 24px", borderRadius: "8px", border: "none",
                  cursor: "pointer", fontWeight: "600", fontSize: "14px",
                }}>
                  {checkingIn ? "Checking in..." : "✓ Check In"}
                </button>
              </div>
            ) : !todayAtt?.check_out_time ? (
              /* Checked in, not out */
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <StatChip label="Check In" value={new Date(todayAtt.check_in_time).toLocaleTimeString()} bg="#dcfce7" color="#16a34a" />
                  {todayAtt.is_late && (
                    <StatChip label="Late by" value={`${todayAtt.late_minutes} min`} bg="#fef3c7" color="#d97706" />
                  )}
                </div>
                <button onClick={handleCheckOut} disabled={checkingOut} style={{
                  background: checkingOut ? "#fca5a5" : "#dc2626", color: "white",
                  padding: "10px 24px", borderRadius: "8px", border: "none",
                  cursor: "pointer", fontWeight: "600", fontSize: "14px",
                }}>
                  {checkingOut ? "Checking out..." : "✕ Check Out"}
                </button>
              </div>
            ) : (
              /* Fully done */
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <StatChip label="Check In"    value={new Date(todayAtt.check_in_time).toLocaleTimeString()}  bg="#dcfce7" color="#16a34a" />
                <StatChip label="Check Out"   value={new Date(todayAtt.check_out_time).toLocaleTimeString()} bg="#dbeafe" color="#2563eb" />
                <StatChip label="Total Hours" value={`${todayAtt.total_hours || 0}h`}                        bg="#f3e8ff" color="#7c3aed" />
                <StatChip label="Status"      value={todayAtt.status?.replace("_", " ")}
                  bg={statusStyle(todayAtt.status).background}
                  color={statusStyle(todayAtt.status).color}
                />
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", marginBottom: "20px" }}>
            {[
              { label: "Present",      value: summary.present_days  || 0, color: "#16a34a" },
              { label: "Absent",       value: summary.absent_days   || 0, color: "#dc2626" },
              { label: "Late",         value: summary.late_days     || 0, color: "#d97706" },
              { label: "Attendance %", value: `${summary.attendance_percentage || 0}%`, color: "#2563eb" },
            ].map((s) => (
              <div key={s.label} style={{
                background: "white", borderRadius: "12px", border: "1px solid #e2e8f0",
                padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                <p style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>{s.label}</p>
                <p style={{ fontSize: "22px", fontWeight: "bold", color: s.color, marginTop: "4px" }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        <div style={{
          background: "white", borderRadius: "12px", border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden",
        }}>
          {/* Header with month picker */}
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid #e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px",
          }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>History</h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="month"
                value={attMonth}
                onChange={(e) => setAttMonth(e.target.value)}
                style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
              />
              <button
                onClick={() => fetchHistory(attMonth)}
                style={{
                  background: "#1e293b", color: "white", padding: "6px 14px",
                  borderRadius: "6px", border: "none", cursor: "pointer",
                  fontSize: "13px", fontWeight: "600",
                }}
              >
                Load
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>📅</div>
              <p style={{ fontWeight: "600", color: "#64748b" }}>No records for this month</p>
            </div>
          ) : (
            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  {["Date", "Check In", "Check Out", "Hours", "Status", "Late"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#64748b" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={r.id || i} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "600", color: "#1e293b" }}>{r.date}</td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>
                      {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>
                      {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>
                      {r.total_hours ? `${r.total_hours.toFixed(1)}h` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        ...statusStyle(r.status),
                        padding: "3px 10px", borderRadius: "6px",
                        fontSize: "11px", fontWeight: "600",
                      }}>
                        {r.status?.replace("_", " ") || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>
                      {r.is_late ? <span style={{ color: "#d97706", fontWeight: "600" }}>{r.late_minutes}m</span> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </Layout>
  );
};

const StatChip = ({ label, value, bg, color }) => (
  <div style={{ background: bg, color, padding: "8px 14px", borderRadius: "8px", textAlign: "center" }}>
    <div style={{ fontSize: "11px", opacity: 0.8 }}>{label}</div>
    <div style={{ fontWeight: "700", fontSize: "14px" }}>{value}</div>
  </div>
);

export default EmployeeAttendance;