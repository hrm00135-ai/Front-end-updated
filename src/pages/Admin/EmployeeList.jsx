import { useState } from "react";
import Layout from "../../components/Layout";
import { Plus, Trash2 } from "lucide-react";

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    designation: "",
    address: "",
    monthlySalary: "",
    weeklySalary: "",
    dailySalary: "",
    aadhar: null,
    photo: null,
  });

  // Add Employee
  const handleAddEmployee = () => {
    if (!formData.name) return;

    const newEmployee = {
      ...formData,
      id: Date.now(),
    };

    setEmployees([...employees, newEmployee]);

    setFormData({
      name: "",
      role: "",
      designation: "",
      address: "",
      monthlySalary: "",
      weeklySalary: "",
      dailySalary: "",
      aadhar: null,
      photo: null,
    });

    setShowForm(false);
  };

  // Delete Employee
  const deleteEmployee = (id) => {
    setEmployees(employees.filter((emp) => emp.id !== id));
  };

  return (
    <Layout>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee List</h1>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg"
        >
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-4 rounded-xl shadow mb-6 space-y-3">

          <input
            type="text"
            placeholder="Employee Name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full border p-2 rounded"
          />

          <input
            type="text"
            placeholder="Role"
            value={formData.role}
            onChange={(e) =>
              setFormData({ ...formData, role: e.target.value })
            }
            className="w-full border p-2 rounded"
          />

          <input
            type="text"
            placeholder="Designation"
            value={formData.designation}
            onChange={(e) =>
              setFormData({ ...formData, designation: e.target.value })
            }
            className="w-full border p-2 rounded"
          />

          <input
            type="text"
            placeholder="Address"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            className="w-full border p-2 rounded"
          />

          <input
            type="number"
            placeholder="Monthly Salary"
            value={formData.monthlySalary}
            onChange={(e) =>
              setFormData({ ...formData, monthlySalary: e.target.value })
            }
            className="w-full border p-2 rounded"
          />

          <input
            type="number"
            placeholder="Weekly Salary"
            value={formData.weeklySalary}
            onChange={(e) =>
              setFormData({ ...formData, weeklySalary: e.target.value })
            }
            className="w-full border p-2 rounded"
          />

          <input
            type="number"
            placeholder="Daily Salary"
            value={formData.dailySalary}
            onChange={(e) =>
              setFormData({ ...formData, dailySalary: e.target.value })
            }
            className="w-full border p-2 rounded"
          />

          {/* File Uploads */}
          <input
            type="file"
            onChange={(e) =>
              setFormData({ ...formData, aadhar: e.target.files[0] })
            }
          />

          <input
            type="file"
            onChange={(e) =>
              setFormData({ ...formData, photo: e.target.files[0] })
            }
          />

          <button
            onClick={handleAddEmployee}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Save
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-600 text-sm">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Designation</th>
              <th className="p-3">Salary</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td className="p-4 text-gray-400" colSpan="4">
                  No employees added yet
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="border-t">
                  <td className="p-3">{emp.name}</td>
                  <td className="p-3">{emp.designation || "-"}</td>
                  <td className="p-3">
                    ₹{emp.monthlySalary || 0}/month
                  </td>
                  <td className="p-3">
                    <button onClick={() => deleteEmployee(emp.id)}>
                      <Trash2 className="text-red-500" size={18} />
                    </button>
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

export default EmployeeList;