import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { apiCall, getUser } from "../../utils/api";

const EmployeeDashboard = () => {
  const user = getUser();
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [metals, setMetals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

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
  }, [user.id]);

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
        alert(data.message);
      }
    } catch {
      alert("Check-in failed");
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
        alert(data.message);
      }
    } catch {
      alert("Check-out failed");
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
        alert(data.message);
      }
    } catch {
      alert("Update failed");
    }
  };

  if (loading) {
    return <Layout><div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading...</div></Layout>;
  }

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
          src={profile?.photo_url ? `http://127.0.0.1:5000/${profile.photo_url}` : `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=3b82f6&color=fff&size=80`}
          alt="photo"
          style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "3px solid #e2e8f0" }}
        />
        <div>
          <h1 className="text-2xl font-bold">{user.first_name} {user.last_name}</h1>
          <p style={{ color: "#64748b", fontSize: "14px" }}>{user.employee_id} • {user.designation || user.department || "Employee"}</p>
        </div>
      </div>

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

    </Layout>
  );
};

const MiniStat = ({ label, value, bg, color }) => (
  <div style={{ background: bg, color, padding: "8px 14px", borderRadius: "8px", textAlign: "center" }}>
    <div style={{ fontSize: "11px" }}>{label}</div>
    <div style={{ fontWeight: "bold", fontSize: "14px" }}>{value}</div>
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