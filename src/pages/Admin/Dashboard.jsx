import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { apiCall, getUser, BASE_URL } from "../../utils/api";
import AdminTopBar from "../../components/AdminTopBar";

function fmt(iso) {
  if (!iso) return "—";
  // Backend stores UTC — append Z if missing so JS parses as UTC
  const raw = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(raw).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const Dashboard = () => {
  const user = getUser();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === "super_admin";

  const [stats, setStats]               = useState(null);
  const [employees, setEmployees]       = useState([]);
  const [metals, setMetals]             = useState([]);
  const [tasks, setTasks]               = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [sessions, setSessions]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [expandedEmp, setExpandedEmp]   = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [empDetails, setEmpDetails]     = useState({});
  const [showAdminList, setShowAdminList] = useState(false);
  const [showEmpList, setShowEmpList]   = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, empRes, metalRes, taskRes, leaveRes] = await Promise.allSettled([
          apiCall("/reports/dashboard"),
          apiCall("/users/?per_page=100"),
          apiCall("/metals/prices"),
          apiCall("/tasks/?per_page=100"),
          apiCall("/leaves/pending"),
        ]);

        const dashData  = dashRes.status  === "fulfilled" ? await dashRes.value.json()  : null;
        const empData   = empRes.status   === "fulfilled" ? await empRes.value.json()   : null;
        const metalData = metalRes.status === "fulfilled" ? await metalRes.value.json() : null;
        const taskData  = taskRes.status  === "fulfilled" ? await taskRes.value.json()  : null;
        const leaveData = leaveRes.status === "fulfilled" ? await leaveRes.value.json() : null;

        if (dashData?.status  === "success") setStats(dashData.data);
        if (empData?.status   === "success") setEmployees(empData.data?.users || []);
        if (metalData?.status === "success") setMetals(metalData.data || []);
        if (taskData?.status  === "success") setTasks(taskData.data?.tasks || []);
        if (leaveData?.status === "success") setPendingLeaves(leaveData.data || []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    fetchSessions();
  }, []);

const fetchSessions = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const res = await apiCall(`/auth/sessions?date=${today}`);
    const data = await res.json();

    if (data.status === "success") {
      setSessions(data.data || []);
    } else {
      console.error("Failed to fetch sessions");
    }
  } catch (err) {
    console.error("Sessions fetch error:", err);
  }
};

  const fetchEmpDetails = async (empId) => {
    if (empDetails[empId]) return;
    try {
      const [profileRes, bankRes, docsRes] = await Promise.allSettled([
        apiCall(`/profiles/${empId}`),
        apiCall(`/profiles/${empId}/bank`),
        apiCall(`/profiles/${empId}/documents`),
      ]);
      const profile = profileRes.status === "fulfilled" ? await profileRes.value.json() : null;
      const bank    = bankRes.status    === "fulfilled" ? await bankRes.value.json()    : null;
      const docs    = docsRes.status    === "fulfilled" ? await docsRes.value.json()    : null;
      setEmpDetails((prev) => ({
        ...prev,
        [empId]: {
          profile: profile?.data,
          bank:    bank?.data,
          documents: docs?.data || [],
        },
      }));
    } catch (err) {
      console.error("Detail fetch error:", err);
    }
  };

  const toggleExpand = (empId, section) => {
    if (expandedEmp === empId && expandedSection === section) {
      setExpandedEmp(null);
      setExpandedSection(null);
    } else {
      setExpandedEmp(empId);
      setExpandedSection(section);
      fetchEmpDetails(empId);
    }
  };

  if (loading) {
    return <Layout><div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading dashboard...</div></Layout>;
  }

  const onlineSessions  = sessions.filter((s) => !s.logout_time);
  const offlineSessions = sessions.filter((s) =>  s.logout_time);

  return (
    <Layout topBar={<AdminTopBar />}>

      <h1 className="text-2xl font-bold mb-6">Welcome, {user?.first_name} {user?.last_name}</h1>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div onClick={() => setShowEmpList(!showEmpList)} style={{ cursor: "pointer" }}>
          <StatCard label="Total Employees" value={stats?.employees?.total || 0} color="#3b82f6" clickable />
        </div>
        <StatCard label="Checked In Today" value={stats?.attendance_today?.checked_in || 0} color="#16a34a" />
        <StatCard label="Late Today"       value={stats?.attendance_today?.late        || 0} color="#ea580c" />
        {isSuperAdmin ? (
          <div onClick={() => setShowAdminList(!showAdminList)} style={{ cursor: "pointer" }}>
            <StatCard label="Total Admins" value={stats?.employees?.admins || 0} color="#8b5cf6" clickable />
          </div>
        ) : (
          <StatCard label="On Leave" value={stats?.attendance_today?.on_leave || 0} color="#8b5cf6" />
        )}
      </div>

      {/* Expanded Employee List */}
      {showEmpList && (
        <div className="bg-white p-4 rounded-xl shadow mb-6" style={{ maxHeight: "300px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontWeight: "600", fontSize: "15px" }}>Employees ({employees.filter(e => e.role === "employee").length})</h3>
            <button onClick={() => setShowEmpList(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#94a3b8" }}>×</button>
          </div>
          {employees.filter(e => e.role === "employee").map(emp => (
            <div key={emp.id} onClick={() => navigate(`/admin/employees/${emp.id}`)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 4px", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}>
              <img
                src={emp.photo_url ? `${BASE_URL}/${emp.photo_url}` : `https://ui-avatars.com/api/?name=${emp.first_name}+${emp.last_name}&background=3b82f6&color=fff&size=32`}
                alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600", fontSize: "13px" }}>{emp.first_name} {emp.last_name}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{emp.employee_id} • {emp.designation || emp.department || "Employee"}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded Admin List */}
      {showAdminList && isSuperAdmin && (
        <div className="bg-white p-4 rounded-xl shadow mb-6" style={{ maxHeight: "300px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontWeight: "600", fontSize: "15px" }}>Admins ({employees.filter(e => e.role === "admin").length})</h3>
            <button onClick={() => setShowAdminList(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#94a3b8" }}>×</button>
          </div>
          {employees.filter(e => e.role === "admin").map(adm => (
            <div key={adm.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 4px", borderBottom: "1px solid #f1f5f9" }}>
              <img
                src={adm.photo_url ? `${BASE_URL}/${adm.photo_url}` : `https://ui-avatars.com/api/?name=${adm.first_name}+${adm.last_name}&background=8b5cf6&color=fff&size=32`}
                alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600", fontSize: "13px" }}>{adm.first_name} {adm.last_name}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{adm.employee_id} • {adm.designation || "Admin"}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Row 2 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tasks Pending"    value={stats?.tasks?.pending         || 0} color="#f59e0b" />
        <StatCard label="In Progress"      value={stats?.tasks?.in_progress     || 0} color="#3b82f6" />
        <StatCard label="Completed Today"  value={stats?.tasks?.completed_today || 0} color="#16a34a" />
        <StatCard label="Overdue"          value={stats?.tasks?.overdue         || 0} color="#dc2626" />
      </div>

      {/* ── LOGIN ACTIVITY SUMMARY ── */}
      <div className="bg-white p-5 rounded-xl shadow mb-6">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 className="text-lg font-semibold">Today's Login Activity</h2>
          <button
            onClick={() => navigate("/admin/login-activity")}
            style={{ fontSize: "12px", color: "#2563eb", background: "#eff6ff", border: "none", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
          >
            View All
          </button>
        </div>

        {/* Summary chips */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <SummaryChip label="Online now" value={onlineSessions.length}  color="#16a34a" bg="#dcfce7" />
          <SummaryChip label="Logged out" value={offlineSessions.length} color="#64748b" bg="#f1f5f9" />
          <SummaryChip label="Total today" value={sessions.length}       color="#2563eb" bg="#dbeafe" />
        </div>

        {/* Mini table — show max 5 rows */}
        {sessions.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "13px" }}>No login activity today</p>
        ) : (
          <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={miniTh}>Name</th>
                {isSuperAdmin && <th style={miniTh}>Role</th>}
                <th style={miniTh}>Login</th>
                <th style={miniTh}>Logout</th>
                <th style={miniTh}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 5).map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={miniTd}>
                    <span style={{ fontWeight: "600" }}>{s.first_name} {s.last_name}</span>
                    <span style={{ color: "#94a3b8", fontSize: "11px", marginLeft: "6px" }}>{s.employee_id}</span>
                  </td>
                  {isSuperAdmin && (
                    <td style={miniTd}>
                      <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "4px", background: s.role === "admin" ? "#dcfce7" : "#dbeafe", color: s.role === "admin" ? "#16a34a" : "#2563eb" }}>
                        {s.role?.replace("_", " ")}
                      </span>
                    </td>
                  )}
                  <td style={miniTd}>
                    <span style={{ color: "#16a34a", fontWeight: "600" }}>{fmt(s.login_time)}</span>
                  </td>
                  <td style={miniTd}>
                    <span style={{ color: s.logout_time ? "#dc2626" : "#94a3b8", fontWeight: s.logout_time ? "600" : "400" }}>
                      {fmt(s.logout_time)}
                    </span>
                  </td>
                  <td style={miniTd}>
                    {!s.logout_time ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: "#16a34a" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a" }} />
                        Online
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>Offline</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {sessions.length > 5 && (
          <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "10px", textAlign: "center" }}>
            +{sessions.length - 5} more — <span onClick={() => navigate("/admin/login-activity")} style={{ color: "#2563eb", cursor: "pointer", fontWeight: "600" }}>View all</span>
          </p>
        )}
      </div>

      {/* Leaves & Payroll Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-3">Leave Overview</h2>
          <InfoRow label="Pending Approval" value={stats?.leaves?.pending_approval || 0} />
          <InfoRow label="On Leave Today"   value={stats?.leaves?.on_leave_today   || 0} />
          {pendingLeaves.length > 0 && (
            <div style={{ marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Pending Requests:</p>
              {pendingLeaves.map((l) => (
                <div key={l.id} style={{ fontSize: "12px", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontWeight: "600" }}>{l.employee_name}</span> — {l.leave_type_name} ({l.total_days}d) — {l.from_date} to {l.to_date}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-3">Payroll — {getMonthName(stats?.payroll?.month)} {stats?.payroll?.year}</h2>
          <InfoRow label="Payslips Generated" value={stats?.payroll?.payslips_generated || 0} />
          <InfoRow label="Paid"               value={stats?.payroll?.paid               || 0} />
          <InfoRow label="Pending Payment"      value={`${stats?.payroll?.pending_daily_wages || 0} (Rs.${stats?.payroll?.pending_wages_amount || 0})`} />
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white p-5 rounded-xl shadow mb-6">
        <h2 className="text-lg font-semibold mb-3">Tasks You Assigned</h2>
        {tasks.length === 0 ? (
          <p className="text-gray-400 text-sm">No tasks yet</p>
        ) : (
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  <th style={{ padding: "8px" }}>Task</th>
                  <th style={{ padding: "8px" }}>Assigned To</th>
                  <th style={{ padding: "8px" }}>Priority</th>
                  <th style={{ padding: "8px" }}>Status</th>
                  <th style={{ padding: "8px" }}>Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px", fontWeight: "500" }}>{t.title}</td>
                    <td style={{ padding: "8px" }}>{t.assignee_name} ({t.assignee_employee_id})</td>
                    <td style={{ padding: "8px" }}><PriorityBadge priority={t.priority} /></td>
                    <td style={{ padding: "8px" }}><StatusBadge status={t.status} /></td>
                    <td style={{ padding: "8px" }}>{t.due_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Cards */}
      <div className="bg-white p-5 rounded-xl shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Employees</h2>
        <div className="space-y-4">
          {employees.filter((e) => e.role === "employee").map((emp) => (
            <div key={emp.id} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px" }}>
                <img
                  src={emp.photo_url ? `${BASE_URL}/${emp.photo_url}` : `https://ui-avatars.com/api/?name=${emp.first_name}+${emp.last_name}&background=3b82f6&color=fff&size=80`}
                  alt="photo"
                  style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: "16px" }}>{emp.first_name} {emp.last_name}</div>
                  <div style={{ color: "#64748b", fontSize: "13px" }}>{emp.employee_id} • {emp.designation || emp.department || "Employee"}</div>
                  <div style={{ color: "#94a3b8", fontSize: "12px" }}>{emp.email} • {emp.phone}</div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <SmallBtn label="Profile" active={false} onClick={() => navigate(`/admin/employees/${emp.id}`)} />
                  <SmallBtn label="Bank"    active={expandedEmp === emp.id && expandedSection === "bank"} onClick={() => toggleExpand(emp.id, "bank")} />
                  <SmallBtn label="Docs"    active={expandedEmp === emp.id && expandedSection === "docs"} onClick={() => toggleExpand(emp.id, "docs")} />
                </div>
              </div>

              {expandedEmp === emp.id && expandedSection === "bank" && (
                <ExpandPanel>
                  {empDetails[emp.id]?.bank ? (
                    <DetailGrid data={{
                      "Bank":          empDetails[emp.id].bank.bank_name,
                      "Branch":        empDetails[emp.id].bank.branch_name,
                      "Account No":    empDetails[emp.id].bank.account_number,
                      "IFSC":          empDetails[emp.id].bank.ifsc_code,
                      "Holder Name":   empDetails[emp.id].bank.account_holder_name,
                      "PAN":           empDetails[emp.id].bank.pan_number,
                      "UAN":           empDetails[emp.id].bank.uan_number,
                    }} />
                  ) : <p style={{ color: "#94a3b8", fontSize: "13px" }}>No bank details yet</p>}
                </ExpandPanel>
              )}

              {expandedEmp === emp.id && expandedSection === "docs" && (
                <ExpandPanel>
                  {empDetails[emp.id]?.documents?.length > 0 ? (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {empDetails[emp.id].documents.map((doc, i) => (
                        <a key={i} href={`${BASE_URL}/${doc.file_path}`} target="_blank" rel="noreferrer"
                          style={{ background: "#eff6ff", color: "#2563eb", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", textDecoration: "none" }}>
                          {doc.doc_type?.toUpperCase()} — {doc.doc_name}
                        </a>
                      ))}
                    </div>
                  ) : <p style={{ color: "#94a3b8", fontSize: "13px" }}>No documents uploaded</p>}
                </ExpandPanel>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Departments */}
      <div className="bg-white p-5 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-3">Departments</h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {stats?.employees?.departments && Object.entries(stats.employees.departments).map(([dept, count]) => (
            <div key={dept} style={{ background: "#f1f5f9", padding: "8px 16px", borderRadius: "8px" }}>
              <span style={{ fontWeight: "600" }}>{dept}</span>
              <span style={{ color: "#64748b", marginLeft: "6px" }}>({count})</span>
            </div>
          ))}
        </div>
      </div>

    </Layout>
  );
};

// ── helper styles ──────────────────────────────────────────────────────────
const miniTh = { padding: "8px 12px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#64748b" };
const miniTd = { padding: "10px 12px" };

// ── helper components ──────────────────────────────────────────────────────
const SummaryChip = ({ label, value, color, bg }) => (
  <div style={{ background: bg, color, padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
    {label}: {value}
  </div>
);

const StatCard = ({ label, value, color, clickable }) => (
  <div className="bg-white p-4 rounded-xl shadow" style={{ position: "relative" }}>
    <p className="text-gray-500 text-sm">{label}</p>
    <h2 className="text-2xl font-bold" style={{ color }}>{value}</h2>
    {clickable && <span style={{ position: "absolute", top: "8px", right: "10px", fontSize: "10px", color: "#94a3b8" }}>Click to view ▸</span>}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "14px" }}>
    <span style={{ color: "#64748b" }}>{label}</span>
    <span style={{ fontWeight: "600" }}>{value}</span>
  </div>
);

const SmallBtn = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", border: "1px solid #cbd5e1", background: active ? "#1e293b" : "white", color: active ? "white" : "#1e293b" }}>
    {label}
  </button>
);

const ExpandPanel = ({ children }) => (
  <div style={{ padding: "16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>{children}</div>
);

const DetailGrid = ({ data }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
    {Object.entries(data).map(([k, v]) => (
      <div key={k} style={{ fontSize: "13px" }}>
        <span style={{ color: "#94a3b8" }}>{k}: </span>
        <span style={{ fontWeight: "500" }}>{v || "—"}</span>
      </div>
    ))}
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = { pending: "#f59e0b", in_progress: "#3b82f6", completed: "#16a34a", cancelled: "#6b7280", on_hold: "#8b5cf6" };
  return <span style={{ background: `${colors[status] || "#6b7280"}20`, color: colors[status] || "#6b7280", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>{status?.replace("_", " ")}</span>;
};

const PriorityBadge = ({ priority }) => {
  const colors = { low: "#6b7280", medium: "#3b82f6", high: "#ea580c", urgent: "#dc2626" };
  return <span style={{ background: `${colors[priority] || "#6b7280"}20`, color: colors[priority] || "#6b7280", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>{priority}</span>;
};

const getMonthName = (m) => ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m] || "";

export default Dashboard;