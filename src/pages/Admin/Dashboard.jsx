import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { apiCall, getUser, BASE_URL } from "../../utils/api";
import AdminTopBar from "../../components/AdminTopBar";

function fmt(iso) {
  if (!iso) return "—";
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
      if (data.status === "success") setSessions(data.data || []);
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
    return (
      <Layout>
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Loading dashboard...
        </div>
      </Layout>
    );
  }

  const onlineSessions  = sessions.filter((s) => !s.logout_time);
  const offlineSessions = sessions.filter((s) =>  s.logout_time);

  return (
    <Layout topBar={<AdminTopBar />}>
      <style>{`
        /* ── Responsive table wrapper ── */
        .resp-table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 8px; }
        .resp-table-wrap table { min-width: 500px; width: 100%; font-size: 13px; border-collapse: collapse; }

        /* ── Login activity specific — fewer cols needed ── */
        .login-table { min-width: 360px !important; }

        /* ── Stat grids ── */
        .stat-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }

        @media (max-width: 900px) {
          .stat-grid-4 { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .stat-grid-4 { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .stat-grid-2 { grid-template-columns: 1fr; }
        }

        /* ── Employee card action buttons wrap ── */
        .emp-card-inner { display: flex; align-items: center; gap: 14px; padding: 14px; flex-wrap: wrap; }
        .emp-card-actions { display: flex; gap: 6px; flex-wrap: wrap; }

        @media (max-width: 520px) {
          .emp-card-inner { gap: 10px; }
          .emp-card-photo { width: 44px !important; height: 44px !important; }
        }

        /* ── Dashboard page title ── */
        .dash-title { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 18px; }
        @media (max-width: 480px) { .dash-title { font-size: 17px; } }
      `}</style>

      <h1 className="dash-title">Welcome, {user?.first_name} {user?.last_name} 👋</h1>

      {/* ── Stats Row 1 ── */}
      <div className="stat-grid-4">
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
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: "16px", marginBottom: "16px", maxHeight: "300px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontWeight: "700", fontSize: "14px", margin: 0 }}>
              Employees ({employees.filter(e => e.role === "employee").length})
            </h3>
            <button onClick={() => setShowEmpList(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#94a3b8", lineHeight: 1 }}>×</button>
          </div>
          {employees.filter(e => e.role === "employee").map(emp => (
            <div key={emp.id} onClick={() => navigate(`/admin/employees/${emp.id}`)}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 4px", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}>
              <img
                src={emp.photo_url ? `${BASE_URL}/${emp.photo_url}` : `https://ui-avatars.com/api/?name=${emp.first_name}+${emp.last_name}&background=3b82f6&color=fff&size=32`}
                alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.first_name} {emp.last_name}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{emp.employee_id} · {emp.designation || emp.department || "Employee"}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded Admin List */}
      {showAdminList && isSuperAdmin && (
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: "16px", marginBottom: "16px", maxHeight: "300px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontWeight: "700", fontSize: "14px", margin: 0 }}>
              Admins ({employees.filter(e => e.role === "admin").length})
            </h3>
            <button onClick={() => setShowAdminList(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#94a3b8", lineHeight: 1 }}>×</button>
          </div>
          {employees.filter(e => e.role === "admin").map(adm => (
            <div key={adm.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 4px", borderBottom: "1px solid #f1f5f9" }}>
              <img
                src={adm.photo_url ? `${BASE_URL}/${adm.photo_url}` : `https://ui-avatars.com/api/?name=${adm.first_name}+${adm.last_name}&background=8b5cf6&color=fff&size=32`}
                alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{adm.first_name} {adm.last_name}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{adm.employee_id} · {adm.designation || "Admin"}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Stats Row 2 ── */}
      <div className="stat-grid-4">
        <StatCard label="Tasks Pending"   value={stats?.tasks?.pending         || 0} color="#f59e0b" />
        <StatCard label="In Progress"     value={stats?.tasks?.in_progress     || 0} color="#3b82f6" />
        <StatCard label="Completed Today" value={stats?.tasks?.completed_today || 0} color="#16a34a" />
        <StatCard label="Overdue"         value={stats?.tasks?.overdue         || 0} color="#dc2626" />
      </div>

      {/* ── LOGIN ACTIVITY ── */}
      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: "18px 18px 14px", marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h2 style={{ fontWeight: "700", fontSize: "15px", margin: 0 }}>Today's Login Activity</h2>
          <button
            onClick={() => navigate("/admin/login-activity")}
            style={{ fontSize: "12px", color: "#2563eb", background: "#eff6ff", border: "none", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", whiteSpace: "nowrap" }}
          >
            View All
          </button>
        </div>

        {/* Summary chips */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
          <SummaryChip label="Online now"  value={onlineSessions.length}  color="#16a34a" bg="#dcfce7" />
          <SummaryChip label="Logged out"  value={offlineSessions.length} color="#64748b" bg="#f1f5f9" />
          <SummaryChip label="Total today" value={sessions.length}        color="#2563eb" bg="#dbeafe" />
        </div>

        {sessions.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "13px" }}>No login activity today</p>
        ) : (
          /* scrollable wrapper so table never breaks layout */
          <div className="resp-table-wrap">
            <table className="login-table">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={th}>Name</th>
                  {isSuperAdmin && <th style={th}>Role</th>}
                  <th style={th}>Login</th>
                  <th style={th}>Logout</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 5).map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={td}>
                      <div style={{ fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap" }}>{s.first_name} {s.last_name}</div>
                      <div style={{ color: "#94a3b8", fontSize: "11px" }}>{s.employee_id}</div>
                    </td>
                    {isSuperAdmin && (
                      <td style={td}>
                        <span style={{
                          fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "4px",
                          background: s.role === "super_admin" ? "#f5f3ff" : s.role === "admin" ? "#dcfce7" : "#dbeafe",
                          color:      s.role === "super_admin" ? "#7c3aed"  : s.role === "admin" ? "#16a34a"  : "#2563eb",
                          whiteSpace: "nowrap",
                        }}>
                          {s.role?.replace("_", " ")}
                        </span>
                      </td>
                    )}
                    <td style={td}>
                      <span style={{ color: "#16a34a", fontWeight: "600", whiteSpace: "nowrap" }}>{fmt(s.login_time)}</span>
                    </td>
                    <td style={td}>
                      <span style={{ color: s.logout_time ? "#dc2626" : "#94a3b8", fontWeight: s.logout_time ? "600" : "400", whiteSpace: "nowrap" }}>
                        {fmt(s.logout_time)}
                      </span>
                    </td>
                    <td style={td}>
                      {!s.logout_time ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: "#16a34a", whiteSpace: "nowrap" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a", flexShrink: 0 }} />
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
          </div>
        )}

        {sessions.length > 5 && (
          <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "10px", textAlign: "center" }}>
            +{sessions.length - 5} more —{" "}
            <span onClick={() => navigate("/admin/login-activity")} style={{ color: "#2563eb", cursor: "pointer", fontWeight: "600" }}>
              View all
            </span>
          </p>
        )}
      </div>

      {/* ── Leave & Payroll ── */}
      <div className="stat-grid-2">
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: "18px" }}>
          <h2 style={{ fontWeight: "700", fontSize: "15px", margin: "0 0 12px" }}>Leave Overview</h2>
          <InfoRow label="Pending Approval" value={stats?.leaves?.pending_approval || 0} />
          <InfoRow label="On Leave Today"   value={stats?.leaves?.on_leave_today   || 0} />
          {pendingLeaves.length > 0 && (
            <div style={{ marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <p style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Pending Requests
              </p>
              {pendingLeaves.map((l) => (
                <div key={l.id} style={{ fontSize: "12px", padding: "6px 0", borderBottom: "1px solid #f1f5f9", lineHeight: "1.5" }}>
                  <span style={{ fontWeight: "600" }}>{l.employee_name}</span>
                  <span style={{ color: "#64748b" }}> — {l.leave_type_name} ({l.total_days}d)</span>
                  <div style={{ color: "#94a3b8", fontSize: "11px" }}>{l.from_date} → {l.to_date}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: "18px" }}>
          <h2 style={{ fontWeight: "700", fontSize: "15px", margin: "0 0 12px" }}>
            Payroll — {getMonthName(stats?.payroll?.month)} {stats?.payroll?.year}
          </h2>
          <InfoRow label="Payslips Generated" value={stats?.payroll?.payslips_generated || 0} />
          <InfoRow label="Paid"               value={stats?.payroll?.paid               || 0} />
          <InfoRow label="Pending Wages"      value={`${stats?.payroll?.pending_daily_wages || 0} (₹${stats?.payroll?.pending_wages_amount || 0})`} />
        </div>
      </div>

      {/* ── Tasks Table ── */}
      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: "18px", marginBottom: "18px" }}>
        <h2 style={{ fontWeight: "700", fontSize: "15px", margin: "0 0 14px" }}>Tasks You Assigned</h2>
        {tasks.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "13px" }}>No tasks yet</p>
        ) : (
          <div className="resp-table-wrap" style={{ maxHeight: "300px", overflowY: "auto" }}>
            <table>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={th}>Task</th>
                  <th style={th}>Assigned To</th>
                  <th style={th}>Priority</th>
                  <th style={th}>Status</th>
                  <th style={th}>Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ ...td, fontWeight: "600", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</td>
                    <td style={td}>
                      <div style={{ whiteSpace: "nowrap" }}>{t.assignee_name}</div>
                      <div style={{ color: "#94a3b8", fontSize: "11px" }}>{t.assignee_employee_id}</div>
                    </td>
                    <td style={td}><PriorityBadge priority={t.priority} /></td>
                    <td style={td}><StatusBadge status={t.status} /></td>
                    <td style={{ ...td, whiteSpace: "nowrap", color: "#64748b" }}>{t.due_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Employee Cards ── */}
      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: "18px", marginBottom: "18px" }}>
        <h2 style={{ fontWeight: "700", fontSize: "15px", margin: "0 0 14px" }}>Employees</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {employees.filter((e) => e.role === "employee").map((emp) => (
            <div key={emp.id} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
              <div className="emp-card-inner">
                <img
                  className="emp-card-photo"
                  src={emp.photo_url ? `${BASE_URL}/${emp.photo_url}` : `https://ui-avatars.com/api/?name=${emp.first_name}+${emp.last_name}&background=3b82f6&color=fff&size=80`}
                  alt="photo"
                  style={{ width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "700", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.first_name} {emp.last_name}</div>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>{emp.employee_id} · {emp.designation || emp.department || "Employee"}</div>
                  <div style={{ color: "#94a3b8", fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.email}</div>
                </div>
                <div className="emp-card-actions">
                  <SmallBtn label="Profile" active={false}    onClick={() => navigate(`/admin/employees/${emp.id}`)} />
                  <SmallBtn label="Bank"    active={expandedEmp === emp.id && expandedSection === "bank"} onClick={() => toggleExpand(emp.id, "bank")} />
                  <SmallBtn label="Docs"    active={expandedEmp === emp.id && expandedSection === "docs"} onClick={() => toggleExpand(emp.id, "docs")} />
                </div>
              </div>

              {expandedEmp === emp.id && expandedSection === "bank" && (
                <ExpandPanel>
                  {empDetails[emp.id]?.bank ? (
                    <DetailGrid data={{
                      "Bank":        empDetails[emp.id].bank.bank_name,
                      "Branch":      empDetails[emp.id].bank.branch_name,
                      "Account No":  empDetails[emp.id].bank.account_number,
                      "IFSC":        empDetails[emp.id].bank.ifsc_code,
                      "Holder":      empDetails[emp.id].bank.account_holder_name,
                      "PAN":         empDetails[emp.id].bank.pan_number,
                      "UAN":         empDetails[emp.id].bank.uan_number,
                    }} />
                  ) : <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>No bank details yet</p>}
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
                  ) : <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>No documents uploaded</p>}
                </ExpandPanel>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Departments ── */}
      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: "18px" }}>
        <h2 style={{ fontWeight: "700", fontSize: "15px", margin: "0 0 12px" }}>Departments</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {stats?.employees?.departments && Object.entries(stats.employees.departments).map(([dept, count]) => (
            <div key={dept} style={{ background: "#f1f5f9", padding: "7px 14px", borderRadius: "8px", fontSize: "13px" }}>
              <span style={{ fontWeight: "600" }}>{dept}</span>
              <span style={{ color: "#64748b", marginLeft: "6px" }}>({count})</span>
            </div>
          ))}
        </div>
      </div>

    </Layout>
  );
};

// ── shared table cell styles ───────────────────────────────────────────────
const th = {
  padding: "9px 12px",
  textAlign: "left",
  fontWeight: "700",
  fontSize: "11px",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  whiteSpace: "nowrap",
  borderBottom: "1px solid #e2e8f0",
};
const td = { padding: "10px 12px", verticalAlign: "middle" };

// ── helper components ──────────────────────────────────────────────────────
const SummaryChip = ({ label, value, color, bg }) => (
  <div style={{ background: bg, color, padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}>
    {label}: <strong>{value}</strong>
  </div>
);

const StatCard = ({ label, value, color, clickable }) => (
  <div style={{ background: "white", borderRadius: "12px", padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", position: "relative", cursor: clickable ? "pointer" : "default" }}>
    <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 4px", fontWeight: "500" }}>{label}</p>
    <h2 style={{ fontSize: "26px", fontWeight: "800", color, margin: 0, lineHeight: 1 }}>{value}</h2>
    {clickable && <span style={{ position: "absolute", top: "10px", right: "10px", fontSize: "10px", color: "#cbd5e1" }}>tap ▸</span>}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: "13px", borderBottom: "1px solid #f8fafc" }}>
    <span style={{ color: "#64748b" }}>{label}</span>
    <span style={{ fontWeight: "700", color: "#1e293b" }}>{value}</span>
  </div>
);

const SmallBtn = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "5px 11px", borderRadius: "7px", fontSize: "12px", cursor: "pointer",
      border: `1px solid ${active ? "#1e293b" : "#e2e8f0"}`,
      background: active ? "#1e293b" : "white",
      color: active ? "white" : "#1e293b",
      fontWeight: "600",
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </button>
);

const ExpandPanel = ({ children }) => (
  <div style={{ padding: "14px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>{children}</div>
);

const DetailGrid = ({ data }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px" }}>
    {Object.entries(data).map(([k, v]) => (
      <div key={k} style={{ fontSize: "12px" }}>
        <span style={{ color: "#94a3b8", display: "block", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</span>
        <span style={{ fontWeight: "600", color: "#1e293b" }}>{v || "—"}</span>
      </div>
    ))}
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = { pending: "#f59e0b", in_progress: "#3b82f6", completed: "#16a34a", cancelled: "#6b7280", on_hold: "#8b5cf6" };
  const c = colors[status] || "#6b7280";
  return (
    <span style={{ background: `${c}18`, color: c, padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>
      {status?.replace("_", " ")}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const colors = { low: "#6b7280", medium: "#3b82f6", high: "#ea580c", urgent: "#dc2626" };
  const c = colors[priority] || "#6b7280";
  return (
    <span style={{ background: `${c}18`, color: c, padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>
      {priority}
    </span>
  );
};

const getMonthName = (m) => ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m] || "";

export default Dashboard;
