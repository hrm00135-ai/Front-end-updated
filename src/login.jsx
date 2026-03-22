import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";


function Login() {
  const [showPopup, setShowPopup] = useState(false);
  const [role, setRole] = useState("employee");
  const navigate = useNavigate();

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
  e.preventDefault();

  if (password === "admin") {
    navigate("/admin");
  } else if (password === "employee") {
    navigate("/employee");
  } else {
    alert("Invalid Password");
  }};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 p-4">

      {/* Role Selector (Top Right) */}
      <div className="absolute top-5 right-5">
        <select 
          className="border p-2 rounded"
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Login Card */}
      <div className="bg-white p-8 rounded-2xl shadow-lg w-80">
        <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>

        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            placeholder="ID"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-100"
            onChange={(e) => setId(e.target.value)}
            required
          />

          <input 
            type="password"  
            placeholder="Password"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-100"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded-lg">
            Login
          </button>

          <p 
            onClick={() => setShowPopup(true)}
            className="text-sm text-gray-500 mt-3 text-right cursor-pointer hover:underline"
          >
            Forgot Password?
          </p>
        </form>
      </div>

      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">

          <div className="bg-white p-6 rounded-2xl shadow-2xl w-80 relative">
            <h2 className="text-xl font-semibold mb-4">Reset Password</h2>

            {role === "admin" ? (
              <div>
                <input
                  type="password"
                  placeholder="New Password"
                  className="w-full p-3 mb-3 border rounded-lg"
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  className="w-full p-3 mb-3 border rounded-lg"
                />
                <button className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600">
                  Reset Password
                </button>
              </div>
            ) : (
              <p className="text-gray-600">
                Please contact your administrator to reset your password.
              </p>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-2 right-3 text-xl"
            >
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

export default Login;