import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { apiCall } from "../../utils/api";

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [verifyResult, setVerifyResult] = useState(null);
  const [msg, setMsg] = useState("");

  // Filters
  const [filters, setFilters] = useState({ action: "", user_id: "", resource: "", from_date: "", page: 1, per_page: 50 });

  useEffect(() => { fetchLogs(); }, [filters.page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.set("action", filters.action);
      if (filters.user_id) params.set("user_id", filters.user_id);
      if (filters.resource) params.set("resource", filters.resource);
      if (filters.from_date) params.set("from_date", filters.from_date);
      params.set("page", filters.page);
      params.set("per_page", filters.per_page);

      const res = await apiCall(`/reports/system-logs?${params.toString()}`);
      const data = await res.json();
      if (data.status === "success") {
        setLogs(data.data?.logs || data.data || []);
        setPagination({
          page: data.data?.page || filters.page,
          total: data.data?.total || 0,
          pages: data.data?.pages || 1,
        });
      }
    } catch {} finally { setLoading(false); }
  };

  const handleVerify = async () => {
    try {
      const res = await apiCall("/reports/system-logs/verify");
      const data = await res.json();
      if (data.status === "success") {
        setVerifyResult(data.data);
      } else { setMsg(data.message); }
    } catch { setMsg("Network error"); }
  };

  const handleSearch = () => {
    setFilters({ ...filters, page: 1 });
    fetchLogs();
  };

  const actionColor = (action) => {
    if (action?.includes("LOGIN")) return "#16a34a";
    if (action?.includes("LOCKED") || action?.includes("FAILED")) return "#dc2626";
    if (action?.includes("DELETE") || action?.includes("DEACTIVATE")) return "#ea580c";
    return "#3b82f6";
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Logs</h1>
        <button onClick={handleVerify} style={{ background: "#1e293b", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
          Verify Integrity
        </button>
      </div>

      {msg && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {msg} <button onClick={() => setMsg("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button>
        </div>
      )}

      {verifyResult && (
        <div style={{
          background: verifyResult.status === "INTACT" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${verifyResult.status === "INTACT" ? "#bbf7d0" : "#fecaca"}`,
          color: verifyResult.status === "INTACT" ? "#16a34a" : "#dc2626",
          padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", display: "flex", justifyContent: "space-between"
        }}>
          <span style={{ fontWeight: "600" }}>Integrity: {verifyResult.status}</span>
          <span>Checked: {verifyResult.total_checked} logs</span>
          <button onClick={() => setVerifyResult(null)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow mb-6" style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <FI label="Action" value={filters.action} onChange={v => setFilters({ ...filters, action: v })} placeholder="e.g. LOGIN" />
        <FI label="User ID" value={filters.user_id} onChange={v => setFilters({ ...filters, user_id: v })} placeholder="e.g. 3" />
        <FI label="Resource" value={filters.resource} onChange={v => setFilters({ ...filters, resource: v })} placeholder="e.g. auth" />
        <FI label="From Date" type="date" value={filters.from_date} onChange={v => setFilters({ ...filters, from_date: v })} />
        <button onClick={handleSearch} style={{ background: "#1e293b", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", height: "fit-content" }}>
          Search
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No logs found</div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", minWidth: "800px" }}>
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <th style={th}>ID</th>
                    <th style={th}>Timestamp</th>
                    <th style={th}>User</th>
                    <th style={th}>Action</th>
                    <th style={th}>Resource</th>
                    <th style={th}>IP</th>
                    <th style={th}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={td}>{log.id}</td>
                      <td style={{ ...td, whiteSpace: "nowrap", fontSize: "11px" }}>{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td>
                      <td style={td}>{log.user_id || "—"}</td>
                      <td style={td}>
                        <span style={{ color: actionColor(log.action), fontWeight: "600", fontSize: "11px" }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={td}>{log.resource || "—"}</td>
                      <td style={{ ...td, fontSize: "11px", color: "#94a3b8" }}>{log.ip_address || "—"}</td>
                      <td style={{ ...td, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "11px", color: "#64748b" }}>
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Total: {pagination.total} logs</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  style={{ ...pgBtn, opacity: filters.page <= 1 ? 0.4 : 1 }}>← Prev</button>
                <span style={{ padding: "4px 12px", color: "#64748b" }}>Page {filters.page} of {pagination.pages}</span>
                <button disabled={filters.page >= pagination.pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  style={{ ...pgBtn, opacity: filters.page >= pagination.pages ? 0.4 : 1 }}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

const th = { padding: "10px 12px", textAlign: "left", fontWeight: "600", fontSize: "11px", color: "#64748b", textTransform: "uppercase" };
const td = { padding: "10px 12px" };
const pgBtn = { background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "4px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" };

const FI = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div>
    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", width: "150px" }} />
  </div>
);

export default SystemLogs;
