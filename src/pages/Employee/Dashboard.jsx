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
  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: "",
    from_date: "",
    to_date: "",
    reason: "",
    is_half_day: false,
    half_day_period: "first_half",
  });
  const [myLeaves, setMyLeaves] = useState([]);
  const [applyingLeave, setApplyingLeave] = useState(false);

  // Attendance history
  const [attHistory, setAttHistory] = useState([]);
  const [attMonth, setAttMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Payslip (kept for backward compat)
  const [payslips, setPayslips] = useState([]);
  const [salaryStructure, setSalaryStructure] = useState(null);

  // Payments (new)
  const [paymentSummary, setPaymentSummary]   = useState(null);
  const [paymentHistory, setPaymentHistory]   = useState([]);
  const [payHistPage, setPayHistPage]         = useState(1);
  const [payHistTotal, setPayHistTotal]       = useState(0);
  const [expandedPayTx, setExpandedPayTx]     = useState(null); // tx id for full detail view

  // AUTO CHECK-IN
  useEffect(() => {
    const autoCheckIn = async () => {
      try {
        await apiCall("/attendance/check-in", { method: "POST" });
      } catch (e) {}
    };

    if (user?.id) {
      autoCheckIn();
    }
  }, [user?.id]);

  // FETCH DATA
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const fetchAll = async () => {
      try {
        const results = await Promise.allSettled([
          apiCall(`/profiles/${user.id}`),
          apiCall("/tasks/"),
          apiCall("/attendance/today"),
          apiCall("/leaves/balance"),
          apiCall("/metals/prices"),
        ]);
        for (let i = 0; i < results.length; i++) {
          if (results[i].status !== "fulfilled") continue;
          try {
            const data = await results[i].value.json();
            if (data.status !== "success") continue;
            if (i === 0) setProfile(data.data);
            if (i === 1) setTasks(data.data?.tasks || []);
            if (i === 2) setAttendance(data.data);
            if (i === 3) setLeaveBalance(data.data?.balances || []);
            if (i === 4) setMetals(data.data || []);
          } catch {}
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    fetchLeaveTypes();
  }, [user?.id]);

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
      const res = await apiCall(
        `/attendance/my-history?from_date=${from_date}&to_date=${to_date}`,
      );
      const data = await res.json();
      if (data.status === "success")
        setAttHistory(data.data?.records || data.data || []);
    } catch {
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchPayslips = async () => {
    try {
      const res = await apiCall(`/payroll/payslip/${user.id}`);
      const data = await res.json();
      if (data.status === "success") {
        setPayslips(
          Array.isArray(data.data) ? data.data : data.data ? [data.data] : [],
        );
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

  const fetchPayments = async (page = 1) => {
    try {
      // Try self-endpoint first
      const sumRes = await apiCall("/payments/my-summary");
      const sumData = await sumRes.json();
      if (sumData.status === "success") setPaymentSummary(sumData.data);
    } catch {}
    try {
      const histRes = await apiCall(`/payments/my-history?page=${page}&per_page=20`);
      const histData = await histRes.json();
      if (histData.status === "success") {
        setPaymentHistory(Array.isArray(histData.data?.transactions) ? histData.data.transactions : []);
        setPayHistTotal(histData.data?.total || 0);
        setPayHistPage(page);
      }
    } catch {}
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      let body = {};
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
          }),
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
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
          }),
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
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.data : t)));
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
      setMsg({
        text: "Leave type, from date, and reason are required",
        type: "error",
      });
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
        setLeaveForm({
          leave_type_id: "",
          from_date: "",
          to_date: "",
          reason: "",
          is_half_day: false,
          half_day_period: "first_half",
        });
        fetchMyLeaves();
        // refresh balance
        const balRes = await apiCall("/leaves/balance");
        const balData = await balRes.json();
        if (balData.status === "success")
          setLeaveBalance(balData.data?.balances || []);
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
      const res = await apiCall(`/leaves/${leaveId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Leave cancelled", type: "success" });
        fetchMyLeaves();
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Loading...
        </div>
      </Layout>
    );
  }

  const photoUrl = profile?.photo_url
    ? profile.photo_url.startsWith("http")
      ? profile.photo_url
      : `${API_BASE_URL}/${profile.photo_url}`
    : `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=3b82f6&color=fff&size=80`;

  return (
    <Layout>
      {/* Metal Prices Bar */}
      <div
        style={{
          background: "#1e293b",
          color: "white",
          padding: "10px 16px",
          borderRadius: "10px",
          marginBottom: "20px",
          display: "flex",
          gap: "20px",
          overflowX: "auto",
          fontSize: "13px",
        }}
      >
        {metals.length > 0 ? (
          metals.map((m, i) => (
            <div key={i} style={{ whiteSpace: "nowrap" }}>
              <span style={{ color: "#94a3b8" }}>
                {m.metal?.toUpperCase()} {m.purity}:{" "}
              </span>
              <span style={{ fontWeight: "bold", color: "#fbbf24" }}>
                Rs.{m.price_per_gram}/g
              </span>
            </div>
          ))
        ) : (
          <span style={{ color: "#94a3b8" }}>No metal prices available</span>
        )}
      </div>

      {/* Welcome + Profile */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <img
          src={photoUrl}
          alt="photo"
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid #e2e8f0",
          }}
        />
        <div>
          <h1 className="text-2xl font-bold">
            {user.first_name} {user.last_name}
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            {user.employee_id} •{" "}
            {user.designation || user.department || "Employee"}
          </p>
        </div>
      </div>

      {/* Messages */}
      {msg.text && (
        <div
          style={{
            background: msg.type === "error" ? "#fee2e2" : "#dcfce7",
            color: msg.type === "error" ? "#dc2626" : "#16a34a",
            padding: "10px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {msg.text}
          <button
            onClick={() => setMsg({ text: "", type: "" })}
            style={{
              float: "right",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        {[
          "home",
          "apply leave",
          "my leaves",
          "attendance history",
          "payments",
        ].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "my leaves") fetchMyLeaves();
              if (t === "attendance history") fetchAttHistory();
              if (t === "payments") {
                fetchPayments(1);
              }
            }}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              textTransform: "capitalize",
              background: tab === t ? "#1e293b" : "white",
              color: tab === t ? "white" : "#1e293b",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* HOME TAB */}
      {tab === "home" && (
        <>
          {/* Attendance Card */}
          <div className="bg-white p-5 rounded-xl shadow mb-6">
            <h2 className="text-lg font-semibold mb-3">Today's Attendance</h2>
            <div
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {!attendance?.check_in_time ? (
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  style={{
                    background: checkingIn ? "#86efac" : "#16a34a",
                    color: "white",
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  {checkingIn ? "Checking in..." : "Check In"}
                </button>
              ) : !attendance?.check_out_time ? (
                <>
                  <div
                    style={{
                      background: "#dcfce7",
                      color: "#16a34a",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  >
                    Checked in at{" "}
                    {new Date(attendance.check_in_time).toLocaleTimeString()}
                    {attendance.is_late && (
                      <span style={{ color: "#ea580c", marginLeft: "8px" }}>
                        (Late by {attendance.late_minutes} min)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleCheckOut}
                    disabled={checkingOut}
                    style={{
                      background: checkingOut ? "#fca5a5" : "#dc2626",
                      color: "white",
                      padding: "10px 24px",
                      borderRadius: "8px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    {checkingOut ? "Checking out..." : "Check Out"}
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <MiniStat
                    label="Check In"
                    value={new Date(
                      attendance.check_in_time,
                    ).toLocaleTimeString()}
                    bg="#dcfce7"
                    color="#16a34a"
                  />
                  <MiniStat
                    label="Check Out"
                    value={new Date(
                      attendance.check_out_time,
                    ).toLocaleTimeString()}
                    bg="#dbeafe"
                    color="#2563eb"
                  />
                  <MiniStat
                    label="Total Hours"
                    value={`${attendance.total_hours || 0}h`}
                    bg="#f3e8ff"
                    color="#7c3aed"
                  />
                  <MiniStat
                    label="Status"
                    value={attendance.status?.replace("_", " ")}
                    bg={attendance.status === "present" ? "#dcfce7" : "#fed7aa"}
                    color={
                      attendance.status === "present" ? "#16a34a" : "#ea580c"
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white p-5 rounded-xl shadow mb-6">
            <h2 className="text-lg font-semibold mb-3">My Tasks</h2>
            {tasks.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                No tasks assigned
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div style={{ fontWeight: "600", fontSize: "15px" }}>
                        {t.title}
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "12px",
                          marginTop: "2px",
                        }}
                      >
                        {t.category && <span>{t.category} • </span>}
                        Due: {t.due_date || "No deadline"} • Priority:{" "}
                        <PriorityBadge priority={t.priority} />
                      </div>
                      {t.description && (
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          {t.description}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "center",
                      }}
                    >
                      <StatusBadge status={t.status} />
                      {t.status === "pending" && (
                        <ActionBtn
                          label="Start"
                          color="#3b82f6"
                          onClick={() => updateTaskStatus(t.id, "in_progress")}
                        />
                      )}
                      {t.status === "in_progress" && (
                        <>
                          <ActionBtn
                            label="Complete"
                            color="#16a34a"
                            onClick={() => updateTaskStatus(t.id, "completed")}
                          />
                          <ActionBtn
                            label="Hold"
                            color="#8b5cf6"
                            onClick={() => updateTaskStatus(t.id, "on_hold")}
                          />
                        </>
                      )}
                      {t.status === "on_hold" && (
                        <ActionBtn
                          label="Resume"
                          color="#3b82f6"
                          onClick={() => updateTaskStatus(t.id, "in_progress")}
                        />
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              {leaveBalance.map((lb, i) => (
                <div
                  key={i}
                  style={{
                    background: "#f8fafc",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#64748b",
                      fontWeight: "600",
                    }}
                  >
                    {lb.leave_type_name}
                  </div>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#1e293b",
                      marginTop: "4px",
                    }}
                  >
                    {lb.available}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                    Used: {lb.used} / {lb.total_quota}
                  </div>
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              maxWidth: "600px",
            }}
          >
            <div>
              <label style={lbl}>Leave Type *</label>
              <select
                value={leaveForm.leave_type_id}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })
                }
                style={inp}
              >
                <option value="">Select...</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} (Max: {lt.max_days}d)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>From Date *</label>
              <input
                type="date"
                value={leaveForm.from_date}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, from_date: e.target.value })
                }
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>To Date</label>
              <input
                type="date"
                value={leaveForm.to_date}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, to_date: e.target.value })
                }
                style={inp}
              />
            </div>
            <div>
              <label
                style={{
                  ...lbl,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={leaveForm.is_half_day}
                  onChange={(e) =>
                    setLeaveForm({
                      ...leaveForm,
                      is_half_day: e.target.checked,
                    })
                  }
                />
                Half Day
              </label>
              {leaveForm.is_half_day && (
                <select
                  value={leaveForm.half_day_period}
                  onChange={(e) =>
                    setLeaveForm({
                      ...leaveForm,
                      half_day_period: e.target.value,
                    })
                  }
                  style={inp}
                >
                  <option value="first_half">First Half</option>
                  <option value="second_half">Second Half</option>
                </select>
              )}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Reason *</label>
              <textarea
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, reason: e.target.value })
                }
                rows={3}
                style={{ ...inp, resize: "vertical" }}
                placeholder="Reason for leave..."
              />
            </div>
          </div>
          <button
            onClick={handleApplyLeave}
            disabled={applyingLeave}
            style={{
              marginTop: "16px",
              background: "#2563eb",
              color: "white",
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              opacity: applyingLeave ? 0.6 : 1,
            }}
          >
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
            <div
              style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}
            >
              No leave requests
            </div>
          ) : (
            <div>
              {myLeaves.map((l) => (
                <div
                  key={l.id}
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>
                      {l.leave_type_name} — {l.total_days} day(s)
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {l.from_date} to {l.to_date}
                    </div>
                    {l.reason && (
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                        {l.reason}
                      </div>
                    )}
                    {l.review_comment && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#ea580c",
                          marginTop: "2px",
                        }}
                      >
                        Comment: {l.review_comment}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        background:
                          l.status === "approved"
                            ? "#dcfce7"
                            : l.status === "rejected"
                              ? "#fee2e2"
                              : l.status === "cancelled"
                                ? "#f1f5f9"
                                : "#fef3c7",
                        color:
                          l.status === "approved"
                            ? "#16a34a"
                            : l.status === "rejected"
                              ? "#dc2626"
                              : l.status === "cancelled"
                                ? "#6b7280"
                                : "#d97706",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {l.status}
                    </span>
                    {l.status === "pending" && (
                      <button
                        onClick={() => handleCancelLeave(l.id)}
                        style={{
                          background: "#fee2e2",
                          color: "#dc2626",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "11px",
                          fontWeight: "600",
                        }}
                      >
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
          <div
            className="bg-white p-4 rounded-xl shadow mb-6"
            style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}
          >
            <div>
              <label style={lbl}>Month</label>
              <input
                type="month"
                value={attMonth}
                onChange={(e) => setAttMonth(e.target.value)}
                style={inp}
              />
            </div>
            <button
              onClick={fetchAttHistory}
              style={{
                background: "#1e293b",
                color: "white",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Load
            </button>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            {loadingHistory ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                Loading...
              </div>
            ) : attHistory.length === 0 ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                No records
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  fontSize: "13px",
                  borderCollapse: "collapse",
                }}
              >
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
                    <tr
                      key={r.id || i}
                      style={{ borderTop: "1px solid #e2e8f0" }}
                    >
                      <td style={td}>{r.date}</td>
                      <td style={td}>
                        {r.check_in_time
                          ? new Date(r.check_in_time).toLocaleTimeString()
                          : "—"}
                      </td>
                      <td style={td}>
                        {r.check_out_time
                          ? new Date(r.check_out_time).toLocaleTimeString()
                          : "—"}
                      </td>
                      <td style={td}>{r.total_hours?.toFixed(1) || "—"}</td>
                      <td style={td}>
                        <span
                          style={{
                            background:
                              r.status === "present" ? "#dcfce7" : "#fee2e2",
                            color:
                              r.status === "present" ? "#16a34a" : "#dc2626",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                          }}
                        >
                          {r.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td style={td}>
                        {r.is_late ? `${r.late_minutes}m` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* PAYMENTS TAB */}
      {tab === "payments" && (
        <EmployeePaymentsTab
          summary={paymentSummary}
          history={paymentHistory}
          histPage={payHistPage}
          histTotal={payHistTotal}
          expanded={expandedPayTx}
          onExpand={setExpandedPayTx}
          onPage={fetchPayments}
        />
      )}
    </Layout>
  );
};

const th = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: "600",
  fontSize: "12px",
  color: "#64748b",
};
const td = { padding: "10px 12px" };
const lbl = {
  fontSize: "12px",
  color: "#64748b",
  display: "block",
  marginBottom: "4px",
};
const inp = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  fontSize: "14px",
};

const MiniStat = ({ label, value, bg, color }) => (
  <div
    style={{
      background: bg,
      color,
      padding: "8px 14px",
      borderRadius: "8px",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: "11px" }}>{label}</div>
    <div style={{ fontWeight: "bold", fontSize: "14px" }}>{value}</div>
  </div>
);

const SumCard = ({ label, value, color }) => (
  <div
    style={{
      background: "#f8fafc",
      padding: "12px",
      borderRadius: "8px",
      textAlign: "center",
      border: "1px solid #e2e8f0",
    }}
  >
    <p style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>
      {label}
    </p>
    <p
      style={{ fontSize: "18px", fontWeight: "bold", color, marginTop: "4px" }}
    >
      {value}
    </p>
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = {
    pending: "#f59e0b",
    in_progress: "#3b82f6",
    completed: "#16a34a",
    cancelled: "#6b7280",
    on_hold: "#8b5cf6",
  };
  return (
    <span
      style={{
        background: `${colors[status] || "#6b7280"}20`,
        color: colors[status] || "#6b7280",
        padding: "3px 10px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "600",
      }}
    >
      {status?.replace("_", " ")}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const colors = {
    low: "#6b7280",
    medium: "#3b82f6",
    high: "#ea580c",
    urgent: "#dc2626",
  };
  return (
    <span style={{ color: colors[priority] || "#6b7280", fontWeight: "600" }}>
      {priority}
    </span>
  );
};

const ActionBtn = ({ label, color, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: color,
      color: "white",
      padding: "4px 12px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "600",
    }}
  >
    {label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
//  EmployeePaymentsTab — used inside Employee Dashboard
// ─────────────────────────────────────────────────────────────────────────────
const fmtMoney = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Math.max(0, n ?? 0));

const fmtDT = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const METHOD_ICONS_EMP = { cash: "💵 Cash", bank: "🏦 Bank", upi: "📱 UPI" };

function EmployeePaymentsTab({ summary, history, histPage, histTotal, expanded, onExpand, onPage }) {
  const remaining = Math.max(0, summary?.remaining ?? 0);
  const totalEarned = summary?.total_earned ?? 0;
  const totalPaid   = summary?.total_paid   ?? 0;

  // Sort history by payment_date descending
  const sorted = [...history].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

  // Group paid ones by date for dropdown
  const [openGroup, setOpenGroup] = useState(null);

  // pending = no task completed or remaining > 0
  const unpaidEntries  = sorted.filter(tx => tx.status !== "reversed");
  const pendingAmount  = remaining;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        {[
          { label: "Total Earned", value: fmtMoney(totalEarned), color: "#1e293b" },
          { label: "Total Paid",   value: fmtMoney(totalPaid),   color: "#0f766e" },
          { label: "Pending",      value: fmtMoney(pendingAmount), color: pendingAmount > 0 ? "#b45309" : "#16a34a" },
        ].map(c => (
          <div key={c.label} style={{ background: c.color, color: "#fff", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Pending banner */}
      {pendingAmount > 0 && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>⏳</span>
          <div>
            <div style={{ fontWeight: 700, color: "#92400e", fontSize: 14 }}>
              {fmtMoney(pendingAmount)} pending from admin
            </div>
            <div style={{ fontSize: 12, color: "#b45309" }}>Your earnings are recorded — payment will arrive soon</div>
          </div>
        </div>
      )}

      {pendingAmount <= 0 && totalPaid > 0 && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div style={{ fontWeight: 700, color: "#166534", fontSize: 14 }}>All payments settled!</div>
        </div>
      )}

      {/* Payment History as collapsible groups */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>💳 My Payments ({histTotal})</h3>
        </div>

        {sorted.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
            <p style={{ fontWeight: 600 }}>No payments recorded yet</p>
          </div>
        ) : (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map((tx) => {
              const isOpen = expanded === tx.id;
              return (
                <div key={tx.id} style={{
                  border: `1px solid ${tx.is_advance ? "#e9d5ff" : "#bbf7d0"}`,
                  borderRadius: 10, overflow: "hidden",
                  opacity: tx.status === "reversed" ? 0.5 : 1,
                }}>
                  {/* Row header — click to expand */}
                  <button onClick={() => onExpand(isOpen ? null : tx.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "11px 14px", background: isOpen ? (tx.is_advance ? "#faf5ff" : "#f0fdf4") : "#f8fafc",
                      border: "none", cursor: "pointer", textAlign: "left",
                    }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{tx.is_advance ? "🏷️" : "💰"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: tx.status === "reversed" ? "#94a3b8" : "#0f766e", textDecoration: tx.status === "reversed" ? "line-through" : "none" }}>
                          {fmtMoney(tx.amount)}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                          background: tx.is_advance ? "#ede9fe" : "#dcfce7",
                          color: tx.is_advance ? "#7c3aed" : "#16a34a" }}>
                          {tx.is_advance ? "Advance" : "Full Payment"}
                        </span>
                        {tx.status === "reversed" && (
                          <span style={{ fontSize: 10, background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>Reversed</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        {fmtDT(tx.payment_date)} · {METHOD_ICONS_EMP[tx.payment_method] || tx.payment_method}
                        {tx.task_title ? ` · 📋 ${tx.task_title}` : ""}
                      </div>
                    </div>
                    <span style={{ color: "#94a3b8", fontSize: 14, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ padding: "12px 16px", background: "#fff", borderTop: "1px solid #f1f5f9" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                        <DetailRow k="Date"   v={fmtDT(tx.payment_date)} />
                        <DetailRow k="Method" v={METHOD_ICONS_EMP[tx.payment_method] || tx.payment_method} />
                        <DetailRow k="Type"   v={tx.is_advance ? "🏷️ Advance" : "💰 Full Payment"} />
                        <DetailRow k="Amount" v={fmtMoney(tx.amount)} bold color={tx.status === "reversed" ? "#94a3b8" : "#0f766e"} />
                        {tx.task_title && <DetailRow k="Task"     v={`${tx.task_title} (#${tx.task_id})`} span />}
                        {tx.reference_note && <DetailRow k="Note"  v={tx.reference_note} span />}
                        {tx.paid_by_name && <DetailRow k="Paid By" v={tx.paid_by_name} />}
                        {tx.status === "reversed" && <DetailRow k="Reversal" v={tx.reversal_reason || "—"} span color="#dc2626" />}
                      </div>
                      {tx.invoice_url && (
                        <div style={{ marginTop: 10 }}>
                          <a href={tx.invoice_url.startsWith("http") ? tx.invoice_url : `${BASE_URL}/${tx.invoice_url}`}
                            target="_blank" rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#eff6ff", color: "#2563eb", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none", border: "1px solid #bfdbfe" }}>
                            🧾 View Invoice / Slip
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
              {histPage > 1 && <button onClick={() => onPage(histPage - 1)} style={pgBtn}>← Prev</button>}
              <span style={{ fontSize: 12, color: "#64748b", padding: "6px 0" }}>Page {histPage}</span>
              {history.length === 20 && <button onClick={() => onPage(histPage + 1)} style={pgBtn}>Next →</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const pgBtn = { padding: "5px 12px", background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600 };

const DetailRow = ({ k, v, span, bold, color }) => (
  <div style={span ? { gridColumn: "1 / -1" } : {}}>
    <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{k}</div>
    <div style={{ fontWeight: bold ? 800 : 600, color: color || "#1e293b", fontSize: 13, marginTop: 1 }}>{v || "—"}</div>
  </div>
);

export default EmployeeDashboard;
