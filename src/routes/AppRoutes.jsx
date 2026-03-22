import { BrowserRouter, Routes, Route } from "react-router-dom";
import EmployeeList from "../pages/Admin/EmployeeList";
import Login from "../pages/Login";
import AdminDashboard from "../pages/Admin/Dashboard";
import EmployeeDashboard from "../pages/Employee/Dashboard";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Employee */}
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />

        
        <Route path="/admin/employees" element={<EmployeeList />} />
        
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;