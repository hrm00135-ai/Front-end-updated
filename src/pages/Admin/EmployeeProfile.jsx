import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  X, User, Building2, FileText, 
  Download, Mail, Phone, MapPin, Activity 
} from "lucide-react";

// Helper component to keep our data rows clean and consistent
const InfoItem = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
    {Icon && <Icon className="w-5 h-5 text-gray-400 mt-0.5" />}
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-1">{value || "N/A"}</p>
    </div>
  </div>
);

// 1. ADDED PROPS HERE
const EmployeeProfile = ({ employeeId, onClose }) => {
  // 2. SUPPORT BOTH URL AND PROPS
  const { id: routeId } = useParams();
  const id = employeeId || routeId; 
  const navigate = useNavigate();

  // State to hold our API data
  const [profile, setProfile] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [documents, setDocuments] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const baseUrl = "http://127.0.0.1:5000";

  useEffect(() => {
    // If we don't have an ID yet, don't fetch
    if (!id) return;

    const fetchEmployeeData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("access_token");
        if (!token) {
          navigate("/"); // Kick back to login if no token
          return;
        }

        const headers = {
          "Authorization": `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true", // Required for ngrok
          "Content-Type": "application/json"
        };

        // Hit all three endpoints concurrently 
        const [profileRes, bankRes, docsRes] = await Promise.all([
          fetch(`${baseUrl}/api/profiles/${id}`, { headers }),
          fetch(`${baseUrl}/api/profiles/${id}/bank`, { headers }),
          fetch(`${baseUrl}/api/profiles/${id}/documents`, { headers })
        ]);

        // Check if any of the requests failed
        if (!profileRes.ok || !bankRes.ok || !docsRes.ok) {
          throw new Error("Failed to fetch some employee data. Please try again.");
        }

        const profileData = await profileRes.json();
        const bankData = await bankRes.json();
        const docsData = await docsRes.json();

        // Assuming your backend wraps responses in a { data: ... } object
        setProfile(profileData.data || profileData);
        setBankDetails(bankData.data || bankData);
        setDocuments(docsData.data || docsData);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [id, navigate]);

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

  return (
    <div className="bg-gray-50 py-4 px-2 sm:px-4 lg:px-6 font-sans rounded-xl w-full">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* ENHANCED HEADER SECTION */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          <div className="px-6 pb-6 relative flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="flex items-end gap-5">
              <div className="-mt-12 relative shrink-0">
                <div className="w-24 h-24 bg-white rounded-full p-1 border-4 border-white shadow-sm flex items-center justify-center text-3xl font-bold text-blue-600">
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </div>
                <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full" title="Active"></div>
              </div>
              
              <div className="mb-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm font-medium text-gray-500">
                  <span className="text-gray-700">{profile.designation}</span>
                  <span>•</span>
                  <span>{profile.department}</span>
                  <span>•</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs font-mono text-gray-600">
                    ID: {profile.employee_id}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 3. NEW CROSS (X) BUTTON */}
            <button 
              onClick={onClose ? onClose : () => navigate(-1)} 
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
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem label="Email" value={profile.email} icon={Mail} />
              <InfoItem label="Phone" value={profile.phone} icon={Phone} />
              <InfoItem label="Date of Birth" value={profile.date_of_birth} />
              <InfoItem label="Blood Group" value={profile.blood_group} />
              <div className="col-span-1 sm:col-span-2">
                <InfoItem 
                  label="Address" 
                  value={profile.address_line1 ? `${profile.address_line1}, ${profile.city || ""}` : "N/A"} 
                  icon={MapPin} 
                />
              </div>
              <div className="col-span-1 sm:col-span-2 border-t pt-4 mt-2">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Emergency Contact</p>
                <p className="text-sm font-medium text-gray-900">
                  {profile.emergency_contact_name || "N/A"} 
                  {profile.emergency_contact_phone && (
                    <span className="text-gray-500 ml-2 font-normal">({profile.emergency_contact_phone})</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Bank & Statutory Details Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-800">Bank & Statutory</h2>
            </div>
            <div className="p-6">
              {bankDetails ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1 sm:col-span-2">
                    <InfoItem 
                      label="Bank Name" 
                      value={bankDetails.bank_name ? `${bankDetails.bank_name} (${bankDetails.branch_name || "Main"})` : "N/A"} 
                    />
                  </div>
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
                </div>
              )}
            </div>
          </div>

          {/* Documents Card */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-800">Uploaded Documents</h2>
              </div>
              <span className="bg-blue-100 text-blue-700 py-0.5 px-2.5 rounded-full text-xs font-semibold">
                {documents?.length || 0} Files
              </span>
            </div>
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
                      <a 
                        href={`${baseUrl}/api/profiles/${id}/documents/${doc.id}/download`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
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

export default EmployeeProfile;