import { useState, useEffect } from "react";
import { apiCall, getUser, BASE_URL } from "../../utils/api";
import Layout from "../../components/Layout";

const inp = { width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" };
const inpDisabled = { ...{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }, background: "#f8fafc", color: "#94a3b8", cursor: "not-allowed" };
const lbl = { fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: "600" };

const EmployeeProfile = () => {
  const authUser = getUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const [form, setForm] = useState({
    phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    address: "",
  });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/profiles/${authUser.id}`);
      const data = await res.json();
      if (data.status === "success") {
        const p = data.data;
        setProfile(p);
        setForm({
          phone: p.phone || "",
          emergency_contact_name: p.emergency_contact_name || "",
          emergency_contact_phone: p.emergency_contact_phone || "",
          address: p.address || "",
        });
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiCall(`/profiles/${authUser.id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Profile updated successfully!", type: "success" });
        fetchProfile();
      } else {
        setMsg({ text: data.message || "Update failed.", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await apiCall(`/profiles/${authUser.id}/photo`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Photo updated!", type: "success" });
        // Update localStorage so navbar/sidebar show new photo immediately
        if (data.data?.photo_url) {
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          storedUser.photo_url = data.data.photo_url;
          localStorage.setItem("user", JSON.stringify(storedUser));
        }
        fetchProfile();
      } else {
        setMsg({ text: data.message || "Photo upload failed.", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error.", type: "error" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const photoUrl = profile?.photo_url
    ? profile.photo_url.startsWith("http")
      ? profile.photo_url
      : `${BASE_URL}/${profile.photo_url}`
    : null;

  const initials = `${authUser.first_name?.[0] || ""}${authUser.last_name?.[0] || ""}`.toUpperCase();

  return (
    <Layout>
      <div style={{ padding: "16px", width: "100%" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "20px" }}>My Profile</h1>

        {msg.text && (
          <div style={{ background: msg.type === "error" ? "#fee2e2" : "#dcfce7", color: msg.type === "error" ? "#dc2626" : "#16a34a", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg({ text: "", type: "" })} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>x</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>Loading...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "720px" }}>

            {/* Photo + Identity Card */}
            <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>

              {/* Photo */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                {photoUrl ? (
                  <img src={photoUrl} alt="profile" style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", border: "3px solid #e2e8f0" }} />
                ) : (
                  <div style={{ width: "90px", height: "90px", borderRadius: "50%", background: "#2563eb", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "bold", border: "3px solid #e2e8f0" }}>
                    {initials}
                  </div>
                )}

                <label style={{ position: "absolute", bottom: 0, right: 0, background: "#1e293b", color: "white", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px", border: "2px solid white" }}>
                  {uploadingPhoto ? "..." : "📷"}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
                </label>
              </div>

              {/* Identity Info */}
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
                  {authUser.first_name} {authUser.last_name}
                </h2>
                <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                  {authUser.employee_id} &bull; {authUser.designation || authUser.department || "Employee"}
                </p>
                <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                  <span style={{ background: "#dbeafe", color: "#2563eb", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
                    {authUser.role?.replace("_", " ")}
                  </span>
                  {authUser.department && (
                    <span style={{ background: "#f1f5f9", color: "#475569", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
                      {authUser.department}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Read-only Account Info */}
            <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", marginBottom: "16px" }}>Account Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={lbl}>First Name</label>
                  <input value={authUser.first_name || ""} disabled style={inpDisabled} />
                </div>
                <div>
                  <label style={lbl}>Last Name</label>
                  <input value={authUser.last_name || ""} disabled style={inpDisabled} />
                </div>
                <div>
                  <label style={lbl}>Email</label>
                  <input value={authUser.email || ""} disabled style={inpDisabled} />
                </div>
                <div>
                  <label style={lbl}>Employee ID</label>
                  <input value={authUser.employee_id || ""} disabled style={inpDisabled} />
                </div>
              </div>
            </div>

            {/* Editable Contact Info */}
            <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", marginBottom: "16px" }}>Contact Details</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={lbl}>Phone Number</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXXXXXXX" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Emergency Contact Name</label>
                  <input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} placeholder="Contact name" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Emergency Contact Phone</label>
                  <input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} placeholder="+91 XXXXXXXXXX" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Address</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Your address" style={inp} />
                </div>
              </div>

              <button onClick={handleSave} disabled={saving} style={{ marginTop: "16px", background: saving ? "#93c5fd" : "#2563eb", color: "white", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: saving ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "14px" }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* Extra Profile Info from API */}
            {profile && (
              <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", marginBottom: "16px" }}>Employment Details</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  {[
                    { label: "Date of Joining", value: profile.date_of_joining },
                    { label: "Date of Birth", value: profile.date_of_birth },
                    { label: "Gender", value: profile.gender },
                    { label: "Blood Group", value: profile.blood_group },
                  ].map((item) => item.value ? (
                    <div key={item.label}>
                      <label style={lbl}>{item.label}</label>
                      <input value={item.value} disabled style={inpDisabled} />
                    </div>
                  ) : null)}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </Layout>
  );
};

export default EmployeeProfile;