import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { apiCall, getUser } from "../../utils/api";
import { Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminTopBar from "../../components/AdminTopBar";

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
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    alt_phone: "",
    location_of_work: "",
    photo: null,
  });

  const fetchEmployees = async () => {
    try {
      const res = await apiCall("/users/?per_page=100");
      const data = await res.json();
      if (data.status === "success") {
        setEmployees(data.data?.users || []);
      }
    } catch (err) {
      console.error("FETCH EMPLOYEE ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleRegister = async () => {
    setError("");
    setSuccess("");

    if (!formData.email || !formData.password || !formData.first_name || !formData.phone) {
      setError("Email, password, first name and phone are required");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSaving(true);

    try {
      const endpoint = registerRole === "admin"
        ? "/users/register/admin"
        : "/users/register/employee";

      // ✅ Send as JSON — photo upload is handled separately on the profile page
      const { photo, ...fields } = formData;

      const res = await apiCall(endpoint, {
        method: "POST",
        body: JSON.stringify(fields),
        // apiCall automatically sets Content-Type: application/json
        // when body is not a FormData instance
      });

      const data = await res.json();

      if (data.status === "success") {
        setSuccess(`${registerRole} registered successfully`);

        setFormData({
          email: "",
          password: "",
          first_name: "",
          last_name: "",
          phone: "",
          alt_phone: "",
          location_of_work: "",
          photo: null,
        });

        setShowForm(false);
        fetchEmployees();

        setTimeout(() => {
          navigate(`/admin/employees/${data.data.id}`);
        }, 800);

      } else {
        setError(data.message || "Registration failed");
      }

    } catch (err) {
      console.error("REGISTER ERROR:", err);
      setError("Error: " + err.message);
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
    } catch (err) {
      console.error("DEACTIVATE ERROR:", err);
      setError("Network error");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout topBar={<AdminTopBar />}>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-600 p-2 rounded mb-4">{success}</div>}

      {showForm && (
        <div className="bg-white p-5 rounded-xl shadow mb-6">

          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Register {registerRole}</h3>

            {/* Role Toggle — only super_admin can register admins */}
            {isSuperAdmin && (
              <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
                <button
                  onClick={() => setRegisterRole("employee")}
                  style={{
                    padding: "5px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: "600",
                    cursor: "pointer", border: "none",
                    background: registerRole === "employee" ? "#1e293b" : "transparent",
                    color: registerRole === "employee" ? "white" : "#64748b",
                  }}
                >
                  Employee
                </button>
                <button
                  onClick={() => setRegisterRole("admin")}
                  style={{
                    padding: "5px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: "600",
                    cursor: "pointer", border: "none",
                    background: registerRole === "admin" ? "#1e293b" : "transparent",
                    color: registerRole === "admin" ? "white" : "#64748b",
                  }}
                >
                  Admin
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name *" value={formData.first_name}
              onChange={v => setFormData({ ...formData, first_name: v })} />

            <Input label="Last Name (Optional)" value={formData.last_name}
              onChange={v => setFormData({ ...formData, last_name: v })} />

            <Input label="Email *" type="email"
              value={formData.email}
              onChange={v => setFormData({ ...formData, email: v })} />

            <Input label="Password *" type="password"
              value={formData.password}
              onChange={v => setFormData({ ...formData, password: v })} />

            <Input label="Phone *"
              value={formData.phone}
              onChange={v => setFormData({ ...formData, phone: v })} />

            <Input label="Alternate Phone"
              value={formData.alt_phone}
              onChange={v => setFormData({ ...formData, alt_phone: v })} />

            <Input label="Work Location"
              value={formData.location_of_work}
              onChange={v => setFormData({ ...formData, location_of_work: v })}
              span2 />
          </div>

          {/* Note about photo */}
          <p className="text-xs text-gray-400 mt-3">
            📷 Photo can be uploaded from the employee's profile page after registration.
          </p>

          <button
            onClick={handleRegister}
            disabled={saving}
            className="mt-4 bg-blue-600 text-white px-5 py-2 rounded"
          >
            {saving ? "Registering..." : "Register"}
          </button>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Emp ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Department</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Joined</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-t hover:bg-gray-50">

                <td className="p-3 font-semibold">{emp.employee_id}</td>

                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={emp.photo_url || `https://ui-avatars.com/api/?name=${emp.first_name}`}
                      className="w-8 h-8 rounded-full object-cover"
                      alt={emp.first_name}
                    />
                    {emp.first_name} {emp.last_name || ""}
                  </div>
                </td>

                <td className="p-3">{emp.email}</td>

                <td className="p-3">
                  <span style={{
                    background: emp.role === "super_admin" ? "#fce7f3" : emp.role === "admin" ? "#dbeafe" : "#f1f5f9",
                    color: emp.role === "super_admin" ? "#be185d" : emp.role === "admin" ? "#2563eb" : "#475569",
                    padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600",
                  }}>
                    {emp.role?.replace("_", " ")}
                  </span>
                </td>

                <td className="p-3">{emp.department || "NA"}</td>
                <td className="p-3">{emp.is_active ? "Active" : "Inactive"}</td>
                <td className="p-3">{emp.date_of_joining || "NA"}</td>

                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/admin/employees/${emp.id}`)}
                      className="border px-2 py-1 rounded text-xs hover:bg-gray-100"
                    >
                      Profile
                    </button>

                    {emp.is_active && (
                      <button onClick={() => handleDeactivate(emp.id, emp.employee_id)}>
                        <Trash2 className="text-red-500" size={18} />
                      </button>
                    )}
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </Layout>
  );
};

const Input = ({ label, value, onChange, type = "text", span2 }) => (
  <div style={{ gridColumn: span2 ? "1 / -1" : undefined }}>
    <label className="text-xs text-gray-500">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border px-2 py-1 rounded"
    />
  </div>
);

export default EmployeeList;