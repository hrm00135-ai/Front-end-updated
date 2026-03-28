import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { apiCall } from "../../utils/api";
import AdminTopBar from "../../components/AdminTopBar";

const PasswordResets = () => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [approving, setApproving] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await apiCall("/auth/password-reset/pending");
      const data = await res.json();
      if (data.status === "success") setPending(data.data || []);
    } catch {} finally { setLoading(false); }
  };

  const handleApprove = async (otpRequestId) => {
    if (!newPassword || newPassword.length < 8) {
      setMsg({ text: "Password must be at least 8 characters", type: "error" });
      return;
    }
    try {
      const res = await apiCall("/auth/password-reset/approve", {
        method: "POST",
        body: JSON.stringify({ otp_request_id: otpRequestId, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Password reset approved", type: "success" });
        setApproving(null);
        setNewPassword("");
        fetchPending();
      } else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  return (
    <Layout topBar={<AdminTopBar />} >
      <h1 className="text-2xl font-bold mb-6">Password Reset Requests</h1>

      {msg.text && (
        <div style={{ background: msg.type === "error" ? "#fee2e2" : "#dcfce7", color: msg.type === "error" ? "#dc2626" : "#16a34a", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {msg.text}
          <button onClick={() => setMsg({ text: "", type: "" })} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>
        ) : pending.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No pending password reset requests</div>
        ) : (
          <div>
            {pending.map(req => (
              <div key={req.otp_request_id} style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "15px" }}>{req.name}</div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                      {req.employee_id} • {req.email} • <span style={{ textTransform: "capitalize" }}>{req.role}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                      Requested: {new Date(req.requested_at).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    {approving === req.otp_request_id ? (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input
                          type="password"
                          placeholder="New password (min 8 chars)"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", width: "220px" }}
                        />
                        <button onClick={() => handleApprove(req.otp_request_id)}
                          style={{ background: "#16a34a", color: "white", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                          Confirm
                        </button>
                        <button onClick={() => { setApproving(null); setNewPassword(""); }}
                          style={{ background: "#f1f5f9", color: "#64748b", padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", cursor: "pointer", fontSize: "13px" }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setApproving(req.otp_request_id)}
                        style={{ background: "#2563eb", color: "white", padding: "8px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                        Approve Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PasswordResets;
