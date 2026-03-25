import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { apiCall } from "../../utils/api";

const Payroll = () => {
  const [tab, setTab] = useState("salary");
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Salary
  const [salary, setSalary] = useState(null);
  const [salaryForm, setSalaryForm] = useState({
    basic_salary: "", hra: "", da: "", conveyance: "", medical_allowance: "", special_allowance: "",
    pf_employee: "", pf_employer: "", esi_employee: "", esi_employer: "", professional_tax: "", tds: "",
    effective_from: "",
  });

  // Payslip
  const [payslipForm, setPayslipForm] = useState({ user_id: "", month: new Date().getMonth() + 1, year: new Date().getFullYear(), bonus: 0 });
  const [payslips, setPayslips] = useState([]);

  // Daily Wage
  const [wageForm, setWageForm] = useState({ user_id: "", date: "", per_day_rate: "", overtime_hours: 0, overtime_rate: 1.5, notes: "" });
  const [wages, setWages] = useState([]);

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      const res = await apiCall("/users/?per_page=100");
      const data = await res.json();
      if (data.status === "success") setEmployees(data.data?.users?.filter(u => u.role === "employee") || []);
    } catch {}
  };

  const fetchSalary = async (empId) => {
    try {
      const res = await apiCall(`/payroll/salary/${empId}`);
      const data = await res.json();
      if (data.status === "success" && data.data) {
        setSalary(data.data);
        setSalaryForm({ ...data.data, effective_from: data.data.effective_from || "" });
      } else { setSalary(null); }
    } catch { setSalary(null); }
  };

  const fetchPayslips = async (empId) => {
    try {
      const res = await apiCall(`/payroll/payslips/${empId}`);
      const data = await res.json();
      if (data.status === "success") setPayslips(data.data || []);
    } catch {}
  };

  const fetchWages = async (empId) => {
    try {
      const res = await apiCall(`/payroll/daily-wage/${empId}`);
      const data = await res.json();
      if (data.status === "success") setWages(data.data || []);
    } catch {}
  };

  const handleEmpSelect = (empId) => {
    setSelectedEmp(empId);
    if (empId) {
      fetchSalary(empId);
      fetchPayslips(empId);
      fetchWages(empId);
    }
  };

  const handleSetSalary = async () => {
    if (!selectedEmp) return;
    try {
      const res = await apiCall(`/payroll/salary/${selectedEmp}`, { method: "POST", body: JSON.stringify(salaryForm) });
      const data = await res.json();
      if (data.status === "success") { setMsg({ text: "Salary set", type: "success" }); fetchSalary(selectedEmp); }
      else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  const handleGeneratePayslip = async () => {
    try {
      const res = await apiCall("/payroll/generate", { method: "POST", body: JSON.stringify({ ...payslipForm, user_id: parseInt(payslipForm.user_id) }) });
      const data = await res.json();
      if (data.status === "success") { setMsg({ text: "Payslip generated", type: "success" }); if (payslipForm.user_id) fetchPayslips(payslipForm.user_id); }
      else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  const handleAddWage = async () => {
    try {
      const res = await apiCall("/payroll/daily-wage", { method: "POST", body: JSON.stringify(wageForm) });
      const data = await res.json();
      if (data.status === "success") { setMsg({ text: "Wage added", type: "success" }); if (wageForm.user_id) fetchWages(wageForm.user_id); }
      else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  const handleMarkPaid = async (payslipId) => {
    const ref = prompt("Transaction reference:");
    if (ref === null) return;
    try {
      const res = await apiCall(`/payroll/payslip/${payslipId}/payment`, {
        method: "PUT",
        body: JSON.stringify({ status: "paid", payment_mode: "bank_transfer", transaction_ref: ref, payment_date: new Date().toISOString().split("T")[0] }),
      });
      const data = await res.json();
      if (data.status === "success") { setMsg({ text: "Marked paid", type: "success" }); if (selectedEmp) fetchPayslips(selectedEmp); }
      else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  const tabs = ["salary", "payslips", "daily wages"];

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Payroll</h1>

      {msg.text && (
        <div style={{ background: msg.type === "error" ? "#fee2e2" : "#dcfce7", color: msg.type === "error" ? "#dc2626" : "#16a34a", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {msg.text}
          <button onClick={() => setMsg({ text: "", type: "" })} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", cursor: "pointer", textTransform: "capitalize",
            background: tab === t ? "#1e293b" : "white", color: tab === t ? "white" : "#1e293b",
          }}>{t}</button>
        ))}
      </div>

      {/* SALARY TAB */}
      {tab === "salary" && (
        <>
          <div className="bg-white p-4 rounded-xl shadow mb-6">
            <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Select Employee</label>
            <select value={selectedEmp} onChange={e => handleEmpSelect(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", minWidth: "250px" }}>
              <option value="">Choose...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>)}
            </select>
          </div>

          {selectedEmp && (
            <div className="bg-white p-5 rounded-xl shadow">
              <h3 style={{ fontWeight: "600", marginBottom: "16px" }}>
                {salary ? "Update Salary Structure" : "Set Salary Structure"}
              </h3>

              <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", fontWeight: "600" }}>Earnings</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                {["basic_salary", "hra", "da", "conveyance", "medical_allowance", "special_allowance"].map(f => (
                  <FI key={f} label={f.replace(/_/g, " ")} type="number" value={salaryForm[f] || ""} onChange={v => setSalaryForm({ ...salaryForm, [f]: parseFloat(v) || "" })} />
                ))}
              </div>

              <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", fontWeight: "600" }}>Deductions</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                {["pf_employee", "pf_employer", "esi_employee", "esi_employer", "professional_tax", "tds"].map(f => (
                  <FI key={f} label={f.replace(/_/g, " ")} type="number" value={salaryForm[f] || ""} onChange={v => setSalaryForm({ ...salaryForm, [f]: parseFloat(v) || "" })} />
                ))}
              </div>

              <FI label="Effective From" type="date" value={salaryForm.effective_from || ""} onChange={v => setSalaryForm({ ...salaryForm, effective_from: v })} />

              {salary && (
                <div style={{ display: "flex", gap: "16px", marginTop: "16px", padding: "12px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
                  <span>Gross: <b>₹{salary.gross_salary}</b></span>
                  <span>Deductions: <b>₹{salary.total_deductions}</b></span>
                  <span>Net: <b style={{ color: "#16a34a" }}>₹{salary.net_salary}</b></span>
                  <span>CTC: <b>₹{salary.ctc}</b></span>
                </div>
              )}

              <button onClick={handleSetSalary} style={{ marginTop: "16px", background: "#2563eb", color: "white", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>
                Save Salary
              </button>
            </div>
          )}
        </>
      )}

      {/* PAYSLIPS TAB */}
      {tab === "payslips" && (
        <>
          <div className="bg-white p-5 rounded-xl shadow mb-6">
            <h3 style={{ fontWeight: "600", marginBottom: "12px" }}>Generate Payslip</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label style={lbl}>Employee</label>
                <select value={payslipForm.user_id} onChange={e => { setPayslipForm({ ...payslipForm, user_id: e.target.value }); if (e.target.value) fetchPayslips(e.target.value); }}
                  style={inp}>
                  <option value="">Choose...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <FI label="Month" type="number" value={payslipForm.month} onChange={v => setPayslipForm({ ...payslipForm, month: parseInt(v) })} />
              <FI label="Year" type="number" value={payslipForm.year} onChange={v => setPayslipForm({ ...payslipForm, year: parseInt(v) })} />
              <FI label="Bonus" type="number" value={payslipForm.bonus} onChange={v => setPayslipForm({ ...payslipForm, bonus: parseFloat(v) })} />
            </div>
            <button onClick={handleGeneratePayslip} style={{ marginTop: "12px", background: "#2563eb", color: "white", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
              Generate
            </button>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={th}>Month/Year</th>
                  <th style={th}>Gross</th>
                  <th style={th}>Deductions</th>
                  <th style={th}>Net</th>
                  <th style={th}>Status</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payslips.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No payslips</td></tr>
                ) : payslips.map(p => (
                  <tr key={p.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={td}>{p.month}/{p.year}</td>
                    <td style={td}>₹{p.gross_salary}</td>
                    <td style={td}>₹{p.total_deductions}</td>
                    <td style={{ ...td, fontWeight: "600", color: "#16a34a" }}>₹{p.net_salary}</td>
                    <td style={td}>
                      <span style={{ background: p.payment_status === "paid" ? "#dcfce7" : "#fef3c7", color: p.payment_status === "paid" ? "#16a34a" : "#d97706", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td style={td}>
                      {p.payment_status !== "paid" && (
                        <button onClick={() => handleMarkPaid(p.id)} style={{ background: "#16a34a", color: "white", padding: "4px 12px", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: "600" }}>
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* DAILY WAGES TAB */}
      {tab === "daily wages" && (
        <>
          <div className="bg-white p-5 rounded-xl shadow mb-6">
            <h3 style={{ fontWeight: "600", marginBottom: "12px" }}>Add Daily Wage</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label style={lbl}>Employee</label>
                <select value={wageForm.user_id} onChange={e => { setWageForm({ ...wageForm, user_id: e.target.value }); if (e.target.value) fetchWages(e.target.value); }}
                  style={inp}>
                  <option value="">Choose...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <FI label="Date" type="date" value={wageForm.date} onChange={v => setWageForm({ ...wageForm, date: v })} />
              <FI label="Per Day Rate (₹)" type="number" value={wageForm.per_day_rate} onChange={v => setWageForm({ ...wageForm, per_day_rate: parseFloat(v) })} />
              <FI label="OT Hours" type="number" value={wageForm.overtime_hours} onChange={v => setWageForm({ ...wageForm, overtime_hours: parseFloat(v) })} />
              <FI label="OT Rate (x)" type="number" value={wageForm.overtime_rate} onChange={v => setWageForm({ ...wageForm, overtime_rate: parseFloat(v) })} />
              <FI label="Notes" value={wageForm.notes} onChange={v => setWageForm({ ...wageForm, notes: v })} />
            </div>
            <button onClick={handleAddWage} style={{ marginTop: "12px", background: "#2563eb", color: "white", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
              Add Wage
            </button>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Rate</th>
                  <th style={th}>OT</th>
                  <th style={th}>Total</th>
                  <th style={th}>Status</th>
                  <th style={th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {wages.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No wage records</td></tr>
                ) : wages.map(w => (
                  <tr key={w.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={td}>{w.date}</td>
                    <td style={td}>₹{w.per_day_rate || w.per_hour_rate || w.per_piece_rate || "—"}</td>
                    <td style={td}>{w.overtime_hours || 0}h</td>
                    <td style={{ ...td, fontWeight: "600" }}>₹{w.total_earned}</td>
                    <td style={td}>
                      <span style={{ background: w.is_paid ? "#dcfce7" : "#fef3c7", color: w.is_paid ? "#16a34a" : "#d97706", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                        {w.is_paid ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td style={{ ...td, color: "#94a3b8", fontSize: "12px" }}>{w.notes || "—"}</td>
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
const lbl = { fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px", textTransform: "capitalize" };
const inp = { width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" };

const FI = ({ label, value, onChange, type = "text" }) => (
  <div>
    <label style={lbl}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inp} />
  </div>
);

export default Payroll;
