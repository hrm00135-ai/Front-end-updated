import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  X, User, Building2, FileText,
  Download, Mail, Phone, MapPin, Activity,
  Edit3, Upload, Camera, Save, XCircle,
} from "lucide-react";
import { apiCall, BASE_URL } from "../../utils/api";

const API_BASE_URL = BASE_URL;

const InfoItem = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
    {Icon && <Icon className="w-5 h-5 text-gray-400 mt-0.5" />}
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-1">{value || "N/A"}</p>
    </div>
  </div>
);

const DOC_TYPES = [
  "aadhaar", "pan", "passport", "driving_license", "voter_id",
  "offer_letter", "experience_letter", "relieving_letter",
  "salary_slip", "bank_statement", "photo", "other",
];

const EmployeeProfile = ({ employeeId, onClose }) => {
  const { id: routeId } = useParams();
  const id = employeeId || routeId;
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Edit states
  const [editProfile, setEditProfile] = useState(false);
  const [editBank, setEditBank] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [bankForm, setBankForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Upload states
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [docType, setDocType] = useState("aadhaar");
  const [docNotes, setDocNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  // Photo upload
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchEmployeeData();
  }, [id]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);

      const userRes = await apiCall(`/users/${id}`);
      const userData = await userRes.json();

      if (!userRes.ok || userData.status !== "success") {
        throw new Error("Failed to fetch employee data.");
      }

      const userInfo = userData.data || {};
      setProfile(userInfo);

      try {
        const profileRes = await apiCall(`/profiles/${id}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const pData = profileData.data || {};
          setProfile(prev => ({ ...prev, ...pData, ...(pData.profile || {}) }));
        }
      } catch {}

      try {
        const bankRes = await apiCall(`/profiles/${id}/bank`);
        if (bankRes.ok) {
          const bankData = await bankRes.json();
          setBankDetails(bankData.data || null);
        }
      } catch {}

      try {
        const docsRes = await apiCall(`/profiles/${id}/documents`);
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments(docsData.data || []);
        }
      } catch {}

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // === Profile Edit ===
  const startEditProfile = () => {
    setProfileForm({
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
      alt_phone: profile?.alt_phone || "",
      department: profile?.department || "",
      designation: profile?.designation || "",
      location_of_work: profile?.location_of_work || "",
      date_of_birth: profile?.date_of_birth || "",
      gender: profile?.gender || "",
      blood_group: profile?.blood_group || "",
      marital_status: profile?.marital_status || "",
      nationality: profile?.nationality || "",
      address_line1: profile?.address_line1 || "",
      address_line2: profile?.address_line2 || "",
      city: profile?.city || "",
      state: profile?.state || "",
      pincode: profile?.pincode || "",
      emergency_contact_name: profile?.emergency_contact_name || "",
      emergency_contact_relation: profile?.emergency_contact_relation || "",
      emergency_contact_phone: profile?.emergency_contact_phone || "",
      father_name: profile?.father_name || "",
      spouse_name: profile?.spouse_name || "",
    });
    setEditProfile(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await apiCall(`/profiles/${id}`, {
        method: "PUT",
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Profile updated", type: "success" });
        setEditProfile(false);
        fetchEmployeeData();
      } else {
        setMsg({ text: data.message || "Update failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // === Bank Edit ===
  const startEditBank = () => {
    setBankForm({
      bank_name: bankDetails?.bank_name || "",
      branch_name: bankDetails?.branch_name || "",
      account_number: bankDetails?.account_number || "",
      account_holder_name: bankDetails?.account_holder_name || "",
      ifsc_code: bankDetails?.ifsc_code || "",
      pan_number: bankDetails?.pan_number || "",
      uan_number: bankDetails?.uan_number || "",
      esi_number: bankDetails?.esi_number || "",
    });
    setEditBank(true);
  };

  const saveBank = async () => {
    setSaving(true);
    try {
      const res = await apiCall(`/profiles/${id}/bank`, {
        method: "PUT",
        body: JSON.stringify(bankForm),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Bank details updated", type: "success" });
        setEditBank(false);
        fetchEmployeeData();
      } else {
        setMsg({ text: data.message || "Update failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // === Document Upload ===
  const handleDocUpload = async () => {
    if (!docFile) { setMsg({ text: "Select a file", type: "error" }); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", docFile);
      form.append("doc_type", docType);
      if (docNotes) form.append("notes", docNotes);

      const res = await apiCall(`/profiles/${id}/documents`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Document uploaded", type: "success" });
        setShowDocUpload(false);
        setDocFile(null);
        setDocNotes("");
        fetchEmployeeData();
      } else {
        setMsg({ text: data.message || "Upload failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  // === Photo Upload ===
  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("photo", file);

      const res = await apiCall(`/profiles/${id}/photo`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Photo updated", type: "success" });
        fetchEmployeeData();
      } else {
        setMsg({ text: data.message || "Photo upload failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // === Delete Document ===
  const handleDeleteDoc = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      const res = await apiCall(`/profiles/${id}/documents/${docId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Document deleted", type: "success" });
        setDocuments(prev => prev.filter(d => d.id !== docId));
      } else {
        setMsg({ text: data.message, type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
  };

  // SKELETON LOADING STATE
  if (loading) {
    return (
      <div className="bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 h-full w-full rounded-xl">
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-3 py-1">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-white rounded-2xl shadow-sm border border-gray-200"></div>
            <div className="h-64 bg-white rounded-2xl shadow-sm border border-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <div className="flex items-center justify-center bg-gray-50 p-4 w-full rounded-xl py-12">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 max-w-md text-center">
          <Activity className="w-8 h-8 mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-1">Something went wrong</h3>
          <p className="text-sm">{error}</p>
          <button onClick={onClose ? onClose : () => navigate(-1)} className="mt-4 text-sm font-medium underline">Go Back</button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const goBack = onClose ? onClose : () => navigate(-1);

  return (
    <div className="bg-gray-50 py-4 px-2 sm:px-4 lg:px-6 font-sans rounded-xl w-full">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Messages */}
        {msg.text && (
          <div style={{
            background: msg.type === "error" ? "#fee2e2" : "#dcfce7",
            color: msg.type === "error" ? "#dc2626" : "#16a34a",
            padding: "10px 16px", borderRadius: "8px", fontSize: "14px",
          }}>
            {msg.text}
            <button onClick={() => setMsg({ text: "", type: "" })} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button>
          </div>
        )}

        {/* HEADER SECTION */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

          <div className="px-6 pb-6 relative flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="flex items-end gap-5">
              <div className="-mt-12 relative shrink-0">
                <div className="w-24 h-24 bg-white rounded-full p-1 border-4 border-white shadow-sm flex items-center justify-center text-3xl font-bold text-blue-600 overflow-hidden">
                  {profile.photo_url ? (
                    <img
                      src={profile.photo_url.startsWith("http") ? profile.photo_url : `${API_BASE_URL}/${profile.photo_url}`}
                      alt="photo"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <>{profile.first_name?.[0]}{profile.last_name?.[0]}</>
                  )}
                </div>
                {/* Photo upload button */}
                <label className="absolute bottom-1 right-1 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow" title="Change Photo">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e.target.files[0])}
                    style={{ display: "none" }}
                  />
                </label>
                <div className="absolute bottom-2 right-10 w-4 h-4 bg-green-500 border-2 border-white rounded-full" title="Active"></div>
              </div>

              <div className="mb-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {profile.is_active !== false ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm font-medium text-gray-500">
                  <span className="text-gray-700">{profile.designation || "—"}</span>
                  <span>•</span>
                  <span>{profile.department || "—"}</span>
                  <span>•</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs font-mono text-gray-600">
                    ID: {profile.employee_id}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={goBack}
              className="mb-1 flex items-center justify-center p-2 bg-gray-100 border border-gray-200 rounded-full shadow-sm hover:bg-gray-200 text-gray-700 transition-all active:scale-95 absolute top-4 right-4 sm:relative sm:top-0 sm:right-0"
              title="Close Profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Personal Details Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
              </div>
              {!editProfile && (
                <button onClick={startEditProfile} className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline">
                  <Edit3 className="w-4 h-4" /> Edit
                </button>
              )}
            </div>

            {editProfile ? (
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FI label="First Name" value={profileForm.first_name} onChange={v => setProfileForm({ ...profileForm, first_name: v })} />
                  <FI label="Last Name" value={profileForm.last_name} onChange={v => setProfileForm({ ...profileForm, last_name: v })} />
                  <FI label="Phone" value={profileForm.phone} onChange={v => setProfileForm({ ...profileForm, phone: v })} />
                  <FI label="Alt Phone" value={profileForm.alt_phone} onChange={v => setProfileForm({ ...profileForm, alt_phone: v })} />
                  <FI label="Department" value={profileForm.department} onChange={v => setProfileForm({ ...profileForm, department: v })} />
                  <FI label="Designation" value={profileForm.designation} onChange={v => setProfileForm({ ...profileForm, designation: v })} />
                  <FI label="Work Location" value={profileForm.location_of_work} onChange={v => setProfileForm({ ...profileForm, location_of_work: v })} />
                  <FI label="Date of Birth" type="date" value={profileForm.date_of_birth} onChange={v => setProfileForm({ ...profileForm, date_of_birth: v })} />
                  <SelectField label="Gender" value={profileForm.gender} onChange={v => setProfileForm({ ...profileForm, gender: v })}
                    options={["", "male", "female", "other"]} />
                  <FI label="Blood Group" value={profileForm.blood_group} onChange={v => setProfileForm({ ...profileForm, blood_group: v })} />
                  <SelectField label="Marital Status" value={profileForm.marital_status} onChange={v => setProfileForm({ ...profileForm, marital_status: v })}
                    options={["", "single", "married", "divorced", "widowed"]} />
                  <FI label="Nationality" value={profileForm.nationality} onChange={v => setProfileForm({ ...profileForm, nationality: v })} />
                  <FI label="Address Line 1" value={profileForm.address_line1} onChange={v => setProfileForm({ ...profileForm, address_line1: v })} span2 />
                  <FI label="Address Line 2" value={profileForm.address_line2} onChange={v => setProfileForm({ ...profileForm, address_line2: v })} span2 />
                  <FI label="City" value={profileForm.city} onChange={v => setProfileForm({ ...profileForm, city: v })} />
                  <FI label="State" value={profileForm.state} onChange={v => setProfileForm({ ...profileForm, state: v })} />
                  <FI label="Pincode" value={profileForm.pincode} onChange={v => setProfileForm({ ...profileForm, pincode: v })} />
                  <FI label="Father Name" value={profileForm.father_name} onChange={v => setProfileForm({ ...profileForm, father_name: v })} />
                  <FI label="Spouse Name" value={profileForm.spouse_name} onChange={v => setProfileForm({ ...profileForm, spouse_name: v })} />
                  <FI label="Emergency Contact Name" value={profileForm.emergency_contact_name} onChange={v => setProfileForm({ ...profileForm, emergency_contact_name: v })} />
                  <FI label="Emergency Contact Relation" value={profileForm.emergency_contact_relation} onChange={v => setProfileForm({ ...profileForm, emergency_contact_relation: v })} />
                  <FI label="Emergency Contact Phone" value={profileForm.emergency_contact_phone} onChange={v => setProfileForm({ ...profileForm, emergency_contact_phone: v })} />
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={saveProfile} disabled={saving} style={{ background: "#2563eb", color: "white", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px", opacity: saving ? 0.6 : 1 }}>
                    <Save className="w-4 h-4 inline mr-1" /> {saving ? "Saving..." : "Save Profile"}
                  </button>
                  <button onClick={() => setEditProfile(false)} style={{ background: "#f1f5f9", color: "#64748b", padding: "8px 20px", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer", fontSize: "13px" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem label="Email" value={profile.email} icon={Mail} />
                <InfoItem label="Phone" value={profile.phone} icon={Phone} />
                <InfoItem label="Date of Birth" value={profile.date_of_birth} />
                <InfoItem label="Gender" value={profile.gender} />
                <InfoItem label="Blood Group" value={profile.blood_group} />
                <InfoItem label="Marital Status" value={profile.marital_status} />
                <InfoItem label="Father Name" value={profile.father_name} />
                <InfoItem label="Spouse Name" value={profile.spouse_name} />
                <div className="col-span-1 sm:col-span-2">
                  <InfoItem
                    label="Address"
                    value={profile.address_line1 ? `${profile.address_line1}${profile.address_line2 ? ", " + profile.address_line2 : ""}, ${profile.city || ""} ${profile.state || ""} ${profile.pincode || ""}` : "N/A"}
                    icon={MapPin}
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 border-t pt-4 mt-2">
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Emergency Contact</p>
                  <p className="text-sm font-medium text-gray-900">
                    {profile.emergency_contact_name || "N/A"}
                    {profile.emergency_contact_relation && <span className="text-gray-400 ml-1">({profile.emergency_contact_relation})</span>}
                    {profile.emergency_contact_phone && (
                      <span className="text-gray-500 ml-2 font-normal">{profile.emergency_contact_phone}</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bank & Statutory Details Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-800">Bank & Statutory</h2>
              </div>
              {!editBank && (
                <button onClick={startEditBank} className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline">
                  <Edit3 className="w-4 h-4" /> Edit
                </button>
              )}
            </div>

            {editBank ? (
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FI label="Bank Name" value={bankForm.bank_name} onChange={v => setBankForm({ ...bankForm, bank_name: v })} />
                  <FI label="Branch Name" value={bankForm.branch_name} onChange={v => setBankForm({ ...bankForm, branch_name: v })} />
                  <FI label="Account Holder Name" value={bankForm.account_holder_name} onChange={v => setBankForm({ ...bankForm, account_holder_name: v })} />
                  <FI label="Account Number" value={bankForm.account_number} onChange={v => setBankForm({ ...bankForm, account_number: v })} />
                  <FI label="IFSC Code" value={bankForm.ifsc_code} onChange={v => setBankForm({ ...bankForm, ifsc_code: v })} />
                  <FI label="PAN Number" value={bankForm.pan_number} onChange={v => setBankForm({ ...bankForm, pan_number: v })} />
                  <FI label="UAN Number" value={bankForm.uan_number} onChange={v => setBankForm({ ...bankForm, uan_number: v })} />
                  <FI label="ESI Number" value={bankForm.esi_number} onChange={v => setBankForm({ ...bankForm, esi_number: v })} />
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={saveBank} disabled={saving} style={{ background: "#2563eb", color: "white", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px", opacity: saving ? 0.6 : 1 }}>
                    <Save className="w-4 h-4 inline mr-1" /> {saving ? "Saving..." : "Save Bank Details"}
                  </button>
                  <button onClick={() => setEditBank(false)} style={{ background: "#f1f5f9", color: "#64748b", padding: "8px 20px", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer", fontSize: "13px" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {bankDetails ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <InfoItem
                        label="Bank Name"
                        value={bankDetails.bank_name ? `${bankDetails.bank_name} (${bankDetails.branch_name || "Main"})` : "N/A"}
                      />
                    </div>
                    <InfoItem label="Account Holder" value={bankDetails.account_holder_name} />
                    <InfoItem label="Account No" value={bankDetails.account_number} />
                    <InfoItem label="IFSC Code" value={bankDetails.ifsc_code} />
                    <InfoItem label="PAN Number" value={bankDetails.pan_number} />
                    <InfoItem label="UAN Number" value={bankDetails.uan_number} />
                    <InfoItem label="ESI Number" value={bankDetails.esi_number} />
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 flex flex-col items-center justify-center h-full">
                    <Building2 className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm">No bank details recorded yet.</p>
                    <button onClick={startEditBank} className="mt-2 text-blue-600 text-sm font-medium hover:underline">+ Add Bank Details</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Documents Card */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-800">Uploaded Documents</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-blue-100 text-blue-700 py-0.5 px-2.5 rounded-full text-xs font-semibold">
                  {documents?.length || 0} Files
                </span>
                <button
                  onClick={() => setShowDocUpload(!showDocUpload)}
                  style={{ background: "#2563eb", color: "white", padding: "5px 14px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1" />
                  {showDocUpload ? "Cancel" : "Upload"}
                </button>
              </div>
            </div>

            {/* Upload Form */}
            {showDocUpload && (
              <div style={{ padding: "16px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Document Type</label>
                    <select value={docType} onChange={e => setDocType(e.target.value)}
                      style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}>
                      {DOC_TYPES.map(dt => <option key={dt} value={dt}>{dt.replace(/_/g, " ").toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>File</label>
                    <input type="file" onChange={e => setDocFile(e.target.files[0])}
                      style={{ fontSize: "13px" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: "150px" }}>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Notes (optional)</label>
                    <input type="text" value={docNotes} onChange={e => setDocNotes(e.target.value)}
                      placeholder="Any notes..."
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }} />
                  </div>
                  <button onClick={handleDocUpload} disabled={uploading}
                    style={{ background: "#16a34a", color: "white", padding: "8px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", opacity: uploading ? 0.6 : 1 }}>
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </div>
            )}

            <div className="p-0">
              {documents && documents.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4 mb-4 sm:mb-0">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{doc.doc_type?.toUpperCase() || "DOCUMENT"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{doc.notes || "No additional notes provided"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`${API_BASE_URL}/api/profiles/${id}/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors shrink-0"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="flex items-center justify-center p-2 text-red-400 hover:bg-red-50 rounded-lg"
                          title="Delete document"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-900">No documents found</p>
                  <p className="text-xs mt-1">There are no files uploaded for this employee yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Form input helper
const FI = ({ label, value, onChange, type = "text", span2 }) => (
  <div style={{ gridColumn: span2 ? "1 / -1" : undefined }}>
    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>{label}</label>
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)}
      autoComplete="new-password"
      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }} />
  </div>
);

const SelectField = ({ label, value, onChange, options }) => (
  <div>
    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>{label}</label>
    <select value={value || ""} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}>
      {options.map(o => <option key={o} value={o}>{o ? o.charAt(0).toUpperCase() + o.slice(1) : "Select..."}</option>)}
    </select>
  </div>
);

export default EmployeeProfile;
