import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall } from "./utils/api";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Popup State
  const [showPopup, setShowPopup] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userString = localStorage.getItem("user");
    if (token && userString) {
      try {
        const user = JSON.parse(userString);
        if (user.role === "super_admin" || user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/employee");
        }
      } catch {
        localStorage.clear();
      }
    }
  }, [navigate]);

const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiCall("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        localStorage.setItem("access_token", data.data.access_token);
        localStorage.setItem("refresh_token", data.data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.data.user));

        const role = data.data.user.role;
        if (role === "admin" || role === "super_admin") {
          navigate("/admin");
        } else {
          navigate("/employee");
        }
      } else {
        setError(data.message || "Login failed");
      }
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetMessage("Sending...");
    try {
      const res = await apiCall("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      setResetMessage(data.message || "If the email exists, an OTP has been sent.");
    } catch {
      setResetMessage("Network error.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 p-4">

      {/* Login Card */}
      <div className="bg-white p-8 rounded-2xl shadow-lg w-80">
        <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email Address"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-100"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-100"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white p-3 rounded-lg ${loading ? "bg-blue-300" : "bg-blue-500 hover:bg-blue-600"}`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p
            onClick={() => { setShowPopup(true); setResetMessage(""); }}
            className="text-sm text-gray-500 mt-3 text-right cursor-pointer hover:underline"
          >
            Forgot Password?
          </p>
        </form>
      </div>

      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-80 relative">
            <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter your email. An OTP will be sent and your admin will reset your password.
            </p>

            <form onSubmit={handlePasswordReset}>
              <input
                type="email"
                placeholder="Enter Email"
                className="w-full p-3 mb-3 border rounded-lg bg-gray-100"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
              >
                Request OTP
              </button>
            </form>

            {resetMessage && (
              <p className="text-sm text-center mt-3 text-blue-600 font-medium">
                {resetMessage}
              </p>
            )}

            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-2 right-4 text-gray-500 hover:text-black text-2xl font-bold"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;