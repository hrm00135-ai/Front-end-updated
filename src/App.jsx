import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./login";
import EmployeeList from "./pages/Admin/EmployeeList";
import AdminDashboard from "./pages/Admin/Dashboard";
import EmployeeDashboard from "./pages/Employee/Dashboard";
import AssignTask from "./pages/Admin/AssignTask";
import EmployeeProfile from "./pages/Admin/EmployeeProfile";
import Attendance from "./pages/Admin/Attendance";
import Leaves from "./pages/Admin/Leaves";
import Payroll from "./pages/Admin/Payroll";
import MetalPrices from "./pages/Admin/MetalPrices";
import Reports from "./pages/Admin/Reports";
import PasswordResets from "./pages/Admin/PasswordResets";
import SystemLogs from "./pages/Admin/SystemLogs";

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

        <Route path="/admin/employees" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <EmployeeList />
          </ProtectedRoute>
        } />

        <Route path="/admin/employees/:id" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <EmployeeProfile />
          </ProtectedRoute>
        } />

        <Route path="/admin/assign-task" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <AssignTask />
          </ProtectedRoute>
        } />

        <Route path="/admin/attendance" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <Attendance />
          </ProtectedRoute>
        } />

        <Route path="/admin/leaves" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <Leaves />
          </ProtectedRoute>
        } />

        <Route path="/admin/payroll" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <Payroll />
          </ProtectedRoute>
        } />

        <Route path="/admin/metals" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <MetalPrices />
          </ProtectedRoute>
        } />

        <Route path="/admin/reports" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <Reports />
          </ProtectedRoute>
        } />

        <Route path="/admin/password-resets" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <PasswordResets />
          </ProtectedRoute>
        } />

        <Route path="/admin/system-logs" element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <SystemLogs />
          </ProtectedRoute>
        } />

        <Route path="/employee" element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeDashboard />
          </ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
