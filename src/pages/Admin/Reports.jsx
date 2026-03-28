import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { apiCall } from "../../utils/api";
import AdminTopBar from "../../components/AdminTopBar";

const Reports = () => {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Dashboard
  const [dashboard, setDashboard] = useState(null);

  // Filters
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Report data
  const [attReport, setAttReport] = useState(null);
  const [leaveReport, setLeaveReport] = useState(null);
  const [payrollReport, setPayrollReport] = useState(null);

  // Employee report
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [empReport, setEmpReport] = useState(null);

  useEffect(() => {
    fetchDashboard();
    fetchEmployees();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiCall("/reports/dashboard");
      const data = await res.json();
      if (data.status === "success") setDashboard(data.data);
    } catch {} finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await apiCall("/users/?per_page=100");
      const data = await res.json();
      if (data.status === "success") setEmployees(data.data?.users?.filter(u => u.role === "employee") || []);
    } catch {}
  };

  const fetchAttendanceReport = async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/reports/attendance?month=${month}&year=${year}`);
      const data = await res.json();
      if (data.status === "success") setAttReport(data.data);
      else setMsg(data.message);
    } catch { setMsg("Network error"); } finally { setLoading(false); }
  };

  const fetchLeaveReport = async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/reports/leaves?year=${year}`);
      const data = await res.json();
      if (data.status === "success") setLeaveReport(data.data);
      else setMsg(data.message);
    } catch { setMsg("Network error"); } finally { setLoading(false); }
  };

  const fetchPayrollReport = async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/reports/payroll?month=${month}&year=${year}`);
      const data = await res.json();
      if (data.status === "success") setPayrollReport(data.data);
      else setMsg(data.message);
    } catch { setMsg("Network error"); } finally { setLoading(false); }
  };

  const fetchEmpReport = async () => {
    if (!selectedEmp) return;
    setLoading(true);
    try {
      const res = await apiCall(`/reports/employee/${selectedEmp}?month=${month}&year=${year}`);
      const data = await res.json();
      if (data.status === "success") setEmpReport(data.data);
      else setMsg(data.message);
    } catch { setMsg("Network error"); } finally { setLoading(false); }
  };

  const tabs = ["dashboard", "attendance", "leaves", "payroll", "employee"];

  return (
    <Layout topBar={<AdminTopBar />} >
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      {msg && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {msg} <button onClick={() => setMsg("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", cursor: "pointer", textTransform: "capitalize",
            background: tab === t ? "#1e293b" : "white", color: tab === t ? "white" : "#1e293b",
          }}>{t}</button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === "dashboard" && dashboard && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card label="Total Employees" value={dashboard.employees?.total} color="#3b82f6" />
            <Card label="Active" value={dashboard.employees?.active} color="#16a34a" />
            <Card label="Checked In" value={dashboard.attendance_today?.checked_in} color="#16a34a" />
            <Card label="On Leave" value={dashboard.attendance_today?.on_leave} color="#8b5cf6" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card label="Tasks Pending" value={dashboard.tasks?.pending} color="#f59e0b" />
            <Card label="In Progress" value={dashboard.tasks?.in_progress} color="#3b82f6" />
            <Card label="Completed" value={dashboard.tasks?.completed_today} color="#16a34a" />
            <Card label="Overdue" value={dashboard.tasks?.overdue} color="#dc2626" />
          </div>
          {dashboard.employees?.departments && (
            <div className="bg-white p-5 rounded-xl shadow">
              <h3 style={{ fontWeight: "600", marginBottom: "12px" }}>Departments</h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {Object.entries(dashboard.employees.departments).map(([d, c]) => (
                  <div key={d} style={{ background: "#f1f5f9", padding: "8px 16px", borderRadius: "8px", fontSize: "14px" }}>
                    <span style={{ fontWeight: "600" }}>{d}</span> <span style={{ color: "#64748b" }}>({c})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ATTENDANCE REPORT */}
      {tab === "attendance" && (
        <>
          <Filters month={month} setMonth={setMonth} year={year} setYear={setYear} onFetch={fetchAttendanceReport} loading={loading} />
          {attReport && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <th style={th}>Employee</th><th style={th}>Present</th><th style={th}>Absent</th><th style={th}>Late</th><th style={th}>Hours</th><th style={th}>OT</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(attReport) ? attReport : [attReport]).map((r, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={td}>{r.employee_name || r.employee_id || "All"}</td>
                      <td style={td}>{r.present}</td><td style={td}>{r.absent}</td>
                      <td style={td}>{r.late_days}</td><td style={td}>{r.total_hours?.toFixed(1)}</td>
                      <td style={td}>{r.overtime_hours?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* LEAVE REPORT */}
      {tab === "leaves" && (
        <>
          <div className="bg-white p-4 rounded-xl shadow mb-6" style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <FI label="Year" type="number" value={year} onChange={v => setYear(parseInt(v))} />
            <button onClick={fetchLeaveReport} disabled={loading} style={btnStyle}>{loading ? "Loading..." : "Generate"}</button>
          </div>
          {leaveReport && (
            <div className="bg-white p-5 rounded-xl shadow">
              <pre style={{ fontSize: "13px", whiteSpace: "pre-wrap", maxHeight: "500px", overflowY: "auto" }}>
                {JSON.stringify(leaveReport, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}

      {/* PAYROLL REPORT */}
      {tab === "payroll" && (
        <>
          <Filters month={month} setMonth={setMonth} year={year} setYear={setYear} onFetch={fetchPayrollReport} loading={loading} />
          {payrollReport && (
            <div className="bg-white p-5 rounded-xl shadow">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card label="Total Payslips" value={payrollReport.total_payslips || payrollReport.payslips_generated} color="#3b82f6" />
                <Card label="Total Gross" value={`₹${payrollReport.total_gross || 0}`} color="#1e293b" />
                <Card label="Total Net" value={`₹${payrollReport.total_net || 0}`} color="#16a34a" />
                <Card label="Paid" value={payrollReport.paid || 0} color="#16a34a" />
              </div>
              {payrollReport.details && (
                <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap", maxHeight: "400px", overflowY: "auto", background: "#f8fafc", padding: "16px", borderRadius: "8px" }}>
                  {JSON.stringify(payrollReport.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </>
      )}

      {/* EMPLOYEE REPORT */}
      {tab === "employee" && (
        <>
          <div className="bg-white p-4 rounded-xl shadow mb-6" style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={lbl}>Employee</label>
              <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} style={inp}>
                <option value="">Choose...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>)}
              </select>
            </div>
            <FI label="Month" type="number" value={month} onChange={v => setMonth(parseInt(v))} />
            <FI label="Year" type="number" value={year} onChange={v => setYear(parseInt(v))} />
            <button onClick={fetchEmpReport} disabled={loading || !selectedEmp} style={btnStyle}>{loading ? "Loading..." : "Generate"}</button>
          </div>
          {empReport && (
            <div className="bg-white p-5 rounded-xl shadow">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card label="Present" value={empReport.attendance?.present} color="#16a34a" />
                <Card label="Absent" value={empReport.attendance?.absent} color="#dc2626" />
                <Card label="Tasks Done" value={empReport.tasks?.completed} color="#3b82f6" />
                <Card label="Net Salary" value={empReport.payslip ? `₹${empReport.payslip.net_salary}` : "—"} color="#16a34a" />
              </div>
              <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap", maxHeight: "400px", overflowY: "auto", background: "#f8fafc", padding: "16px", borderRadius: "8px" }}>
                {JSON.stringify(empReport, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

const th = { padding: "10px 12px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#64748b" };
const td = { padding: "10px 12px" };
const lbl = { fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" };
const inp = { padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", minWidth: "180px" };
const btnStyle = { background: "#1e293b", color: "white", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", height: "fit-content" };

const Card = ({ label, value, color }) => (
  <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
    <p style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>{label}</p>
    <p style={{ fontSize: "22px", fontWeight: "bold", color, marginTop: "4px" }}>{value ?? "—"}</p>
  </div>
);

const FI = ({ label, value, onChange, type = "text" }) => (
  <div>
    <label style={lbl}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", width: "100px" }} />
  </div>
);

const Filters = ({ month, setMonth, year, setYear, onFetch, loading }) => (
  <div className="bg-white p-4 rounded-xl shadow mb-6" style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
    <FI label="Month" type="number" value={month} onChange={v => setMonth(parseInt(v))} />
    <FI label="Year" type="number" value={year} onChange={v => setYear(parseInt(v))} />
    <button onClick={onFetch} disabled={loading} style={btnStyle}>{loading ? "Loading..." : "Generate"}</button>
  </div>
);

export default Reports;
