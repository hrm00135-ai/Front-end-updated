import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { apiCall, getUser } from "../../utils/api";
import { Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EmployeeList = () => {
  const currentUser = getUser();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registerRole, setRegisterRole] = useState("employee");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "", password: "", first_name: "", last_name: "",
    phone: "", department: "", designation: "",
    date_of_joining: "", location_of_work: "",
  });

  const fetchEmployees = async () => {
    try {
      const res = await apiCall("/users/?per_page=100");
      const data = await res.json();
      if (data.status === "success") {
        setEmployees(data.data?.users || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleRegister = async () => {
    setError(""); setSuccess("");
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name || !formData.phone) {
      setError("Email, password, first name, last name, and phone are required");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      const endpoint = registerRole === "admin" ? "/users/register/admin" : "/users/register/employee";
      const res = await apiCall(endpoint, {
        method: "POST",
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.status === "success") {
        setSuccess(`${registerRole === "admin" ? "Admin" : "Employee"} ${data.data.employee_id} registered successfully`);
        setFormData({ email: "", password: "", first_name: "", last_name: "", phone: "", department: "", designation: "", date_of_joining: "", location_of_work: "" });
        setShowForm(false);
        fetchEmployees();
      } else {
        setError(data.message || "Registration failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id, empId) => {
    if (!window.confirm(`Deactivate ${empId}?`)) return;
    try {
      const res = await apiCall(`/users/${id}/deactivate`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        fetchEmployees();
        setSuccess(`${empId} deactivated`);
      } else {
        setError(data.message);
      }
    } catch {
      setError("Network error");
    }
  };

  if (loading) {
    return <Layout><div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading...</div></Layout>;
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg">
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {/* Messages */}
      {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>{error}</div>}
      {success && <div style={{ background: "#dcfce7", color: "#16a34a", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>{success}</div>}

      {/* Registration Form */}
      {showForm && (
        <div className="bg-white p-5 rounded-xl shadow mb-6">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontWeight: "600" }}>Register New {registerRole === "admin" ? "Admin" : "Employee"}</h3>
            {isSuperAdmin && (
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setRegisterRole("employee")} style={{
                  padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", border: "1px solid #cbd5e1",
                  background: registerRole === "employee" ? "#1e293b" : "white", color: registerRole === "employee" ? "white" : "#1e293b",
                }}>Employee</button>
                <button onClick={() => setRegisterRole("admin")} style={{
                  padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", border: "1px solid #cbd5e1",
                  background: registerRole === "admin" ? "#1e293b" : "white", color: registerRole === "admin" ? "white" : "#1e293b",
                }}>Admin</button>
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Input label="First Name *" value={formData.first_name} onChange={v => setFormData({ ...formData, first_name: v })} />
            <Input label="Last Name *" value={formData.last_name} onChange={v => setFormData({ ...formData, last_name: v })} />
            <Input label="Email *" type="email" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} />
            <Input label="Password *" type="password" value={formData.password} onChange={v => setFormData({ ...formData, password: v })} />
            <Input label="Phone *" value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} />
            <Input label="Department" value={formData.department} onChange={v => setFormData({ ...formData, department: v })} />
            <Input label="Designation" value={formData.designation} onChange={v => setFormData({ ...formData, designation: v })} />
            <Input label="Date of Joining" type="date" value={formData.date_of_joining} onChange={v => setFormData({ ...formData, date_of_joining: v })} />
            <Input label="Work Location" value={formData.location_of_work} onChange={v => setFormData({ ...formData, location_of_work: v })} span2 />
          </div>
          <button onClick={handleRegister} disabled={saving}
            style={{ marginTop: "16px", background: saving ? "#93c5fd" : "#2563eb", color: "white", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>
            {saving ? "Registering..." : `Register ${registerRole === "admin" ? "Admin" : "Employee"}`}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table style={{ width: "100%", textAlign: "left", fontSize: "14px", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr>
              <th style={{ padding: "12px" }}>Emp ID</th>
              <th style={{ padding: "12px" }}>Name</th>
              <th style={{ padding: "12px" }}>Email</th>
              <th style={{ padding: "12px" }}>Role</th>
              <th style={{ padding: "12px" }}>Department</th>
              <th style={{ padding: "12px" }}>Status</th>
              <th style={{ padding: "12px" }}>Joined</th>
              <th style={{ padding: "12px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.filter(e => e.role !== "super_admin").length === 0 ? (
              <tr><td colSpan="8" style={{ padding: "20px", color: "#94a3b8", textAlign: "center" }}>No users registered yet</td></tr>
            ) : (
              employees.filter(e => e.role !== "super_admin").map(emp => (
                <tr key={emp.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "12px", fontWeight: "600" }}>{emp.employee_id}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <img src={emp.photo_url || `https://ui-avatars.com/api/?name=${emp.first_name}+${emp.last_name}&size=32&background=${emp.role === "admin" ? "8b5cf6" : "3b82f6"}&color=fff`}
                        alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
                      {emp.first_name} {emp.last_name}
                    </div>
                  </td>
                  <td style={{ padding: "12px", color: "#64748b" }}>{emp.email}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      background: emp.role === "admin" ? "#f3e8ff" : "#dbeafe",
                      color: emp.role === "admin" ? "#7c3aed" : "#2563eb",
                      padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", textTransform: "capitalize"
                    }}>
                      {emp.role}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>{emp.department || "—"}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ background: emp.is_active ? "#dcfce7" : "#fee2e2", color: emp.is_active ? "#16a34a" : "#dc2626", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>
                      {emp.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "12px", color: "#64748b", fontSize: "13px" }}>{emp.date_of_joining}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <button 
                        onClick={() => navigate(`/admin/employees/${emp.id}`)}
                        style={{ padding: "4px 12px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px", background: "white", cursor: "pointer", fontWeight: "500" }}
                      >
                        Profile
                      </button>
                      {emp.is_active && (
                        <button onClick={() => handleDeactivate(emp.id, emp.employee_id)} style={{ background: "none", border: "none", cursor: "pointer" }} title="Deactivate">
                          <Trash2 className="text-red-500" size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

const Input = ({ label, value, onChange, type = "text", span2 }) => (
  <div style={{ gridColumn: span2 ? "1 / -1" : undefined }}>
    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      autoComplete={type === "email" ? "new-email" : type === "password" ? "new-password" : "off"}
      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }} />
  </div>
);

export default EmployeeList;