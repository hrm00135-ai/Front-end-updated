import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { apiCall, getUser } from "../../utils/api";

const Dashboard = () => {
  const user = getUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [metals, setMetals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmp, setExpandedEmp] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [empDetails, setEmpDetails] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, empRes, metalRes, taskRes, leaveRes] = await Promise.all([
          apiCall("/reports/dashboard"),
          apiCall("/users/?per_page=100"),
          apiCall("/metals/prices"),
          apiCall("/tasks/?per_page=100"),
          apiCall("/leaves/pending"),
        ]);
        const [dashData, empData, metalData, taskData, leaveData] = await Promise.all([
          dashRes.json(), empRes.json(), metalRes.json(), taskRes.json(), leaveRes.json(),
        ]);
        if (dashData.status === "success") setStats(dashData.data);
        if (empData.status === "success") setEmployees(empData.data?.users || []);
        if (metalData.status === "success") setMetals(metalData.data || []);
        if (taskData.status === "success") setTasks(taskData.data?.tasks || []);
        if (leaveData.status === "success") setPendingLeaves(leaveData.data || []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const fetchEmpDetails = async (empId) => {
    if (empDetails[empId]) return;
    try {
      const [profileRes, bankRes, docsRes] = await Promise.all([
        apiCall(`/profiles/${empId}`),
        apiCall(`/profiles/${empId}/bank`),
        apiCall(`/profiles/${empId}/documents`),
      ]);
      const [profile, bank, docs] = await Promise.all([
        profileRes.json(), bankRes.json(), docsRes.json(),
      ]);
      setEmpDetails(prev => ({
        ...prev,
        [empId]: {
          profile: profile.data,
          bank: bank.data,
          documents: docs.data || [],
        }
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

  return (
    <Layout>

      {/* Metal Prices Top Bar */}
      <div style={{ 
        background: "#1e293b", 
        color: "white", 
        padding: "10px 16px", 
        borderRadius: "10px", 
        marginBottom: "20px", 
        display: "flex", 
        gap: "20px", 
        overflowX: "auto", 
        fontSize: "13px",
        // New properties for sticky positioning:
        position: "sticky",
        top: "10px", 
        zIndex: 40 
      }}>
        {metals.length > 0 ? metals.map((m, i) => (
          <div key={i} style={{ whiteSpace: "nowrap" }}>
            <span style={{ color: "#94a3b8" }}>{m.metal?.toUpperCase()} {m.purity}: </span>
            <span style={{ fontWeight: "bold", color: "#fbbf24" }}>Rs.{m.price_per_gram}/g</span>
          </div>
        )) : <span style={{ color: "#94a3b8" }}>No metal prices set. Add from API.</span>}
      </div>

      <h1 className="text-2xl font-bold mb-6">Welcome, {user?.first_name} {user?.last_name}</h1>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Employees" value={stats?.employees?.total || 0} color="#3b82f6" />
        <StatCard label="Checked In Today" value={stats?.attendance_today?.checked_in || 0} color="#16a34a" />
        <StatCard label="Late Today" value={stats?.attendance_today?.late || 0} color="#ea580c" />
        <StatCard label="On Leave" value={stats?.attendance_today?.on_leave || 0} color="#8b5cf6" />
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tasks Pending" value={stats?.tasks?.pending || 0} color="#f59e0b" />
        <StatCard label="In Progress" value={stats?.tasks?.in_progress || 0} color="#3b82f6" />
        <StatCard label="Completed Today" value={stats?.tasks?.completed_today || 0} color="#16a34a" />
        <StatCard label="Overdue" value={stats?.tasks?.overdue || 0} color="#dc2626" />
      </div>

      {/* Leaves & Payroll Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-3">Leave Overview</h2>
          <InfoRow label="Pending Approval" value={stats?.leaves?.pending_approval || 0} />
          <InfoRow label="On Leave Today" value={stats?.leaves?.on_leave_today || 0} />
          {pendingLeaves.length > 0 && (
            <div style={{ marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Pending Requests:</p>
              {pendingLeaves.map(l => (
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
          <InfoRow label="Paid" value={stats?.payroll?.paid || 0} />
          <InfoRow label="Pending Wages" value={`${stats?.payroll?.pending_daily_wages || 0} (Rs.${stats?.payroll?.pending_wages_amount || 0})`} />
        </div>
      </div>

      {/* Tasks Assigned by Admin */}
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
                {tasks.map(t => (
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
          {employees.filter(e => e.role === "employee").map(emp => (
            <div key={emp.id} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>

              {/* Employee Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px" }}>
                <img
                  src={emp.photo_url ? `http://127.0.0.1:5000/${emp.photo_url}` : `https://ui-avatars.com/api/?name=${emp.first_name}+${emp.last_name}&background=3b82f6&color=fff&size=80`}
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
                  <SmallBtn label="Bank" active={expandedEmp === emp.id && expandedSection === "bank"} onClick={() => toggleExpand(emp.id, "bank")} />
                  <SmallBtn label="Docs" active={expandedEmp === emp.id && expandedSection === "docs"} onClick={() => toggleExpand(emp.id, "docs")} />
                </div>

              </div>


              {/* Expandable Sections */}
              {expandedEmp === emp.id && expandedSection === "profile" && (
                <ExpandPanel>
                  {empDetails[emp.id]?.profile?.profile ? (
                    <DetailGrid data={{
                      "Date of Birth": empDetails[emp.id].profile.profile.date_of_birth,
                      "Gender": empDetails[emp.id].profile.profile.gender,
                      "Blood Group": empDetails[emp.id].profile.profile.blood_group,
                      "Marital Status": empDetails[emp.id].profile.profile.marital_status,
                      "Nationality": empDetails[emp.id].profile.profile.nationality,
                      "City": empDetails[emp.id].profile.profile.city,
                      "State": empDetails[emp.id].profile.profile.state,
                      "Pincode": empDetails[emp.id].profile.profile.pincode,
                      "Address": empDetails[emp.id].profile.profile.address_line1,
                      "Emergency Contact": empDetails[emp.id].profile.profile.emergency_contact_name,
                      "Emergency Phone": empDetails[emp.id].profile.profile.emergency_contact_phone,
                      "Father Name": empDetails[emp.id].profile.profile.father_name,
                    }} />
                  ) : <p style={{ color: "#94a3b8", fontSize: "13px" }}>No profile data yet</p>}
                </ExpandPanel>
              )}

              {expandedEmp === emp.id && expandedSection === "bank" && (
                <ExpandPanel>
                  {empDetails[emp.id]?.bank ? (
                    <DetailGrid data={{
                      "Bank": empDetails[emp.id].bank.bank_name,
                      "Branch": empDetails[emp.id].bank.branch_name,
                      "Account No": empDetails[emp.id].bank.account_number,
                      "IFSC": empDetails[emp.id].bank.ifsc_code,
                      "Holder Name": empDetails[emp.id].bank.account_holder_name,
                      "PAN": empDetails[emp.id].bank.pan_number,
                      "UAN": empDetails[emp.id].bank.uan_number,
                    }} />
                  ) : <p style={{ color: "#94a3b8", fontSize: "13px" }}>No bank details yet</p>}
                </ExpandPanel>
              )}

              {expandedEmp === emp.id && expandedSection === "docs" && (
                <ExpandPanel>
                  {empDetails[emp.id]?.documents?.length > 0 ? (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {empDetails[emp.id].documents.map((doc, i) => (
                        <a key={i} href={`http://127.0.0.1:5000/${doc.file_path}`} target="_blank" rel="noreferrer"
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

// === Helper Components ===

const StatCard = ({ label, value, color }) => (
  <div className="bg-white p-4 rounded-xl shadow">
    <p className="text-gray-500 text-sm">{label}</p>
    <h2 className="text-2xl font-bold" style={{ color }}>{value}</h2>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "14px" }}>
    <span style={{ color: "#64748b" }}>{label}</span>
    <span style={{ fontWeight: "600" }}>{value}</span>
  </div>
);

const SmallBtn = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", border: "1px solid #cbd5e1",
    background: active ? "#1e293b" : "white", color: active ? "white" : "#1e293b",
  }}>{label}</button>
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