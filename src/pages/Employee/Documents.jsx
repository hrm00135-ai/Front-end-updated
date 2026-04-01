import { useState, useEffect } from "react";
import { apiCall, getUser, BASE_URL } from "../../utils/api";
import Layout from "../../components/Layout";

const DOC_TYPES = [
  "Aadhar Card", "PAN Card", "Passport", "Driving License",
  "10th Marksheet", "12th Marksheet", "Degree Certificate",
  "Offer Letter", "Experience Letter", "Bank Passbook", "Other",
];

const inp = { width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" };
const lbl = { fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: "600" };

function getDocIcon(type) {
  if (!type) return "📄";
  const t = type.toLowerCase();
  if (t.includes("pan")) return "💳";
  if (t.includes("aadhar")) return "🪪";
  if (t.includes("passport")) return "📗";
  if (t.includes("degree") || t.includes("marksheet") || t.includes("certificate")) return "🎓";
  if (t.includes("bank")) return "🏦";
  if (t.includes("driving")) return "🚗";
  return "📄";
}

function getFileUrl(path) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${BASE_URL}/${path}`;
}

const EmployeeDocuments = () => {
  const user = getUser();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState("");
  const [editingDoc, setEditingDoc] = useState(null);

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/profiles/${user.id}/documents`);
      const data = await res.json();
      if (data.status === "success") setDocuments(data.data || []);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) { setMsg({ text: "Please select a file.", type: "error" }); return; }
    if (!docType) { setMsg({ text: "Please select a document type.", type: "error" }); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("doc_type", docType);
      const res = await apiCall(`/profiles/${user.id}/documents`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Document uploaded successfully!", type: "success" });
        setSelectedFile(null);
        setDocType("");
        document.getElementById("doc-file-input").value = "";
        fetchDocuments();
      } else {
        setMsg({ text: data.message || "Upload failed.", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error during upload.", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (docId) => {
    if (!editingDoc?.doc_type) { setMsg({ text: "Please select a document type.", type: "error" }); return; }
    try {
      const res = await apiCall(`/profiles/${user.id}/documents/${docId}`, {
        method: "PUT",
        body: JSON.stringify({ doc_type: editingDoc.doc_type }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Document updated.", type: "success" });
        setEditingDoc(null);
        fetchDocuments();
      } else {
        setMsg({ text: data.message || "Update failed.", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error.", type: "error" });
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    try {
      const res = await apiCall(`/profiles/${user.id}/documents/${docId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Document deleted.", type: "success" });
        fetchDocuments();
      } else {
        setMsg({ text: data.message || "Delete failed.", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error.", type: "error" });
    }
  };

  return (
    <Layout>
      <div style={{ padding: "16px", width: "100%" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "20px" }}>Documents</h1>

        {msg.text && (
          <div style={{ background: msg.type === "error" ? "#fee2e2" : "#dcfce7", color: msg.type === "error" ? "#dc2626" : "#16a34a", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg({ text: "", type: "" })} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>x</button>
          </div>
        )}

        {/* Upload Section */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b", marginBottom: "16px" }}>Upload New Document</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", maxWidth: "600px" }}>
            <div>
              <label style={lbl}>Document Type *</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} style={inp}>
                <option value="">Select type...</option>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>File * (PDF, JPG, PNG)</label>
              <input id="doc-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSelectedFile(e.target.files[0] || null)} style={{ ...inp, padding: "6px 12px" }} />
            </div>
          </div>

          {selectedFile && (
            <p style={{ fontSize: "12px", color: "#16a34a", marginTop: "8px" }}>
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}

          <button onClick={handleUpload} disabled={uploading} style={{ marginTop: "16px", background: uploading ? "#93c5fd" : "#2563eb", color: "white", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: uploading ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "14px" }}>
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>Loading...</div>
        ) : documents.length === 0 ? (
          <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📂</div>
            <p style={{ fontWeight: "600", color: "#64748b", fontSize: "16px" }}>No documents uploaded yet</p>
            <p style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>Upload your first document using the form above</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {documents.map((doc) => (
              <div key={doc.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: "14px" }}>

                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "26px", background: "#f1f5f9", borderRadius: "10px", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {getDocIcon(doc.doc_type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingDoc?.id === doc.id ? (
                      <select value={editingDoc.doc_type} onChange={(e) => setEditingDoc({ ...editingDoc, doc_type: e.target.value })} style={{ ...inp, marginBottom: "4px" }}>
                        <option value="">Select type...</option>
                        {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <p style={{ fontWeight: "700", fontSize: "15px", color: "#1e293b" }}>{doc.doc_type || "Document"}</p>
                    )}
                    <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.file_name || doc.file_path?.split("/").pop() || "file"}
                    </p>
                    {doc.uploaded_at && (
                      <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px" }}>{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                {editingDoc?.id === doc.id ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleUpdate(doc.id)} style={{ flex: 1, background: "#dcfce7", color: "#16a34a", padding: "8px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>Save</button>
                    <button onClick={() => setEditingDoc(null)} style={{ flex: 1, background: "#f1f5f9", color: "#475569", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "8px" }}>
                    {getFileUrl(doc.file_path) && (
                      <a href={getFileUrl(doc.file_path)} target="_blank" rel="noreferrer" style={{ flex: 1, background: "#f1f5f9", color: "#475569", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", fontWeight: "600", textAlign: "center", textDecoration: "none" }}>View</a>
                    )}
                    {getFileUrl(doc.file_path) && (
                      <a href={getFileUrl(doc.file_path)} download style={{ flex: 1, background: "#dbeafe", color: "#2563eb", padding: "8px", borderRadius: "6px", border: "none", fontSize: "13px", fontWeight: "600", textAlign: "center", textDecoration: "none" }}>Download</a>
                    )}
                    <button onClick={() => setEditingDoc({ id: doc.id, doc_type: doc.doc_type || "" })} style={{ background: "#fef3c7", color: "#d97706", padding: "8px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>Edit</button>
                    <button onClick={() => handleDelete(doc.id)} style={{ background: "#fee2e2", color: "#dc2626", padding: "8px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>Del</button>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
};

export default EmployeeDocuments;