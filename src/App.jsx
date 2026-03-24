import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./login";
import EmployeeList from "./pages/Admin/EmployeeList";
import AdminDashboard from "./pages/Admin/Dashboard";
import EmployeeDashboard from "./pages/Employee/Dashboard";
import AssignTask from "./pages/Admin/AssignTask";
import EmployeeProfile from "./pages/Admin/EmployeeProfile";

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("access_token");
  const userStr = localStorage.getItem("user");

  if (!token || !userStr) {
    return <Navigate to="/" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
    return children;
  } catch {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/admin/assign-task" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <AssignTask />
          </ProtectedRoute>
        } />

        <Route path="/admin/employees" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <EmployeeList />
          </ProtectedRoute>
        } />

        <Route path="/employee" element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeDashboard />
          </ProtectedRoute>
        } />

        <Route 
          path="/admin/employees/:id" 
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
              <EmployeeProfile />
            </ProtectedRoute>
          } 
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;