import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./login";
import EmployeeList from "./pages/Admin/EmployeeList";
import AdminDashboard from "./pages/Admin/Dashboard";
import EmployeeDashboard from "./pages/Employee/Dashboard";
import AssignTask from "./pages/Admin/AssignTask";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/admin/assign-task" element={<AssignTask />} />
        <Route path="/admin/employees" element={<EmployeeList />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;