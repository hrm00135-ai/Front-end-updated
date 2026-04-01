import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { apiCall, getUser, BASE_URL } from "../../utils/api";
import AdminTopBar from "../../components/AdminTopBar";

function fmt(iso) {
  if (!iso) return "—";
  // Backend stores UTC — append Z if missing so JS parses as UTC
  const raw = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  const d = new Date(raw);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
    " · " + d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

const LoginActivity = () => {
  const user = getUser();
  const isSuperAdmin = user?.role === "super_admin";

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchSessions();
  }, [selectedDate]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/auth/sessions?date=${selectedDate}`);
      const data = await res.json();
      if (data.status === "success") {
        setSessions(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkLogout = async (target) => {
    const labels = { employees: "all employees", admins: "all admins", all: "all users" };
    if (!window.confirm(`Are you sure you want to logout ${labels[target]}?`)) return;
    setBulkLoading(true);
    try {
      const res = await apiCall("/auth/logout/bulk", {
        method: "POST",
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: data.message, type: "success" });
        fetchSessions();
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    } finally {
      setBulkLoading(false);
      setTimeout(() => setMsg({ text: "", type: "" }), 4000);
    }
  };

  const onlineSessions = sessions.filter((s) => !s.logout_time);
  const offlineSessions = sessions.filter((s) => s.logout_time);

  return (
    <Layout topBar={<AdminTopBar />}>
      <div className="flex justify-between items-center mb-6" style={{ flexWrap: "wrap", gap: "12px" }}>
        <h1 className="text-2xl font-bold">Login Activity</h1>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px" }}
          />
          {/* Bulk Logout Buttons */}
          <button
            onClick={() => handleBulkLogout("employees")}
            disabled={bulkLoading}
            style={{ background: "#dc2626", color: "white", padding: "8px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600", opacity: bulkLoading ? 0.6 : 1 }}
          >
            Logout All Employees
          </button>
          {isSuperAdmin && (
            <>
              <button
                onClick={() => handleBulkLogout("admins")}
                disabled={bulkLoading}
                style={{ background: "#ea580c", color: "white", padding: "8px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600", opacity: bulkLoading ? 0.6 : 1 }}
              >
                Logout All Admins
              </button>
              <button
                onClick={() => handleBulkLogout("all")}
                disabled={bulkLoading}
                style={{ background: "#7c3aed", color: "white", padding: "8px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600", opacity: bulkLoading ? 0.6 : 1 }}
              >
                Logout Everyone
              </button>
            </>
          )}
        </div>
      </div>

      {msg.text && (
        <div style={{ background: msg.type === "error" ? "#fee2e2" : "#dcfce7", color: msg.type === "error" ? "#dc2626" : "#16a34a", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {msg.text}
          <button onClick={() => setMsg({ text: "", type: "" })} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button>
        </div>
      )}

      {/* Summary chips */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <SummaryChip label="Online now" value={onlineSessions.length} color="#16a34a" bg="#dcfce7" />
        <SummaryChip label="Logged out" value={offlineSessions.length} color="#64748b" bg="#f1f5f9" />
        <SummaryChip label="Total sessions" value={sessions.length} color="#2563eb" bg="#dbeafe" />
      </div>

      {/* Sessions Table */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white p-10 rounded-xl shadow text-center" style={{ color: "#94a3b8" }}>
          No login activity for {selectedDate}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={th}>User</th>
                {isSuperAdmin && <th style={th}>Role</th>}
                <th style={th}>Login Time</th>
                <th style={th}>Logout Time</th>
                <th style={th}>IP Address</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img
                        src={s.photo_url ? `${BASE_URL}/${s.photo_url}` : `https://ui-avatars.com/api/?name=${s.first_name || "U"}+${s.last_name || ""}&background=3b82f6&color=fff&size=36`}
                        alt=""
                        style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                      />
                      <div>
                        <div style={{ fontWeight: "600" }}>{s.first_name} {s.last_name}</div>
                        <div style={{ color: "#94a3b8", fontSize: "11px" }}>{s.employee_id}</div>
                      </div>
                    </div>
                  </td>
                  {isSuperAdmin && (
                    <td style={td}>
                      <span style={{
                        fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "4px",
                        background: s.role === "admin" ? "#dcfce7" : s.role === "super_admin" ? "#fef3c7" : "#dbeafe",
                        color: s.role === "admin" ? "#16a34a" : s.role === "super_admin" ? "#92400e" : "#2563eb",
                      }}>
                        {s.role?.replace("_", " ")}
                      </span>
                    </td>
                  )}
                  <td style={td}>
                    <span style={{ color: "#16a34a", fontWeight: "600" }}>{fmt(s.login_time)}</span>
                  </td>
                  <td style={td}>
                    <span style={{ color: s.logout_time ? "#dc2626" : "#94a3b8", fontWeight: s.logout_time ? "600" : "400" }}>
                      {fmt(s.logout_time)}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>{s.ip_address || "—"}</span>
                  </td>
                  <td style={td}>
                    {!s.logout_time ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: "#16a34a" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a" }} />
                        Online
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>Offline</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

const th = { padding: "10px 12px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#64748b" };
const td = { padding: "10px 12px" };

const SummaryChip = ({ label, value, color, bg }) => (
  <div style={{ background: bg, color, padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
    {label}: {value}
  </div>
);

export default LoginActivity;
