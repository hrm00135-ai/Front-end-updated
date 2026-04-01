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
import LoginActivity from "./pages/Admin/LoginActivity";
import ErrorBoundary from "./components/ErrorBoundary";
import EmployeeTasks from "./pages/Employee/EmployeeTasks";
import EmployeeAttendance from "./pages/Employee/Attendance";
import EmployeeLeaves from "./pages/Employee/Leaves";
import EmployeeDocuments from "./pages/Employee/Documents";
import EmployeeProfilePage from "./pages/Employee/Profile";
import Payments from "./pages/Admin/Payments";
import EmployeePayments from "./pages/Employee/Payments";


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
    <ErrorBoundary>
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

        <Route path="/admin/login-activity" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <LoginActivity />
          </ProtectedRoute>
        } />

        <Route path="/employee" element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeDashboard />
          </ProtectedRoute>
        } />

        <Route path="/employee/tasks" element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeTasks />
          </ProtectedRoute>
        } />

        <Route path="/employee/attendance" element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeAttendance />
          </ProtectedRoute>
        } />

        <Route path="/employee/leaves" element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeLeaves />
          </ProtectedRoute>
        } />

        <Route path="/employee/documents" element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeDocuments />
          </ProtectedRoute>
        } />

        <Route path="/employee/profile" element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeProfilePage />
          </ProtectedRoute>
        } />

        <Route path="/admin/payments" element={
          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <Payments />
          </ProtectedRoute>
        } />

        <Route path="/employee/payments" element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeePayments />
          </ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
