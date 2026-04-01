export const API_BASE = "https://temp-backend-production-2b8a.up.railway.app/api";
export const BASE_URL = "https://temp-backend-production-2b8a.up.railway.app";

export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");

  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (fetchError) {
    console.error(`API call failed: ${endpoint}`, fetchError);
    throw new Error(`Cannot connect to server. Backend may be down.`);
  }

  if (response.status === 401 && !endpoint.includes("/auth/login")) {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${refreshToken}` },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        localStorage.setItem("access_token", refreshData.data.access_token);
        headers["Authorization"] = `Bearer ${refreshData.data.access_token}`;
        response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        localStorage.clear();
        window.location.href = "/";
        return response;
      }
    } else {
      localStorage.clear();
      window.location.href = "/";
      return response;
    }
  }

  return response;
}

/* ─── Robust file upload with retry + progress + compression ─────────────── */

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;

/**
 * Upload files to a task with retry logic, compression, and progress tracking.
 * @param {string|number} taskId
 * @param {File[]}        files
 * @param {function}      onProgress - (percent, message) => void
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
export async function uploadTaskFiles(taskId, files, onProgress = () => {}) {
  if (!files || files.length === 0)
    return { success: false, message: "No files selected" };

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE)
      return {
        success: false,
        message: `"${file.name}" exceeds 25 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
      };
  }

  onProgress(5, "Preparing files…");

  const processed = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type.startsWith("image/") && file.size > 500 * 1024) {
      onProgress(5 + Math.round((i / files.length) * 20), `Compressing ${file.name}…`);
      try {
        processed.push(await compressImageFile(file));
      } catch {
        processed.push(file);
      }
    } else {
      processed.push(file);
    }
  }

  onProgress(30, "Uploading…");

  let lastError = "";
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const fd = new FormData();
      for (const f of processed) fd.append("files", f);

      const res = await apiCall(`/tasks/${taskId}/attachments`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (data.status === "success") {
        onProgress(100, "Upload complete!");
        return { success: true, message: data.message || "Files uploaded", data: data.data };
      }
      lastError = data.message || "Upload failed";
    } catch (err) {
      lastError = err.message || "Network error during upload";
    }

    if (attempt < MAX_RETRIES) {
      onProgress(30, `Retrying (${attempt}/${MAX_RETRIES})…`);
      await sleep(RETRY_DELAY * attempt);
    }
  }

  onProgress(0, "Upload failed");
  return { success: false, message: lastError || "Upload failed after retries" };
}

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    img.onload = () => {
      const maxW = 1600;
      let w = img.width, h = img.height;
      if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => blob ? resolve(new File([blob], file.name, { type: "image/jpeg" })) : reject(),
        "image/jpeg",
        0.75
      );
    };
    img.onerror = () => reject();
    img.src = URL.createObjectURL(file);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ─── Existing helpers ───────────────────────────────────────────────────── */

export function getUser() {
  try { return JSON.parse(localStorage.getItem("user")); }
  catch { return null; }
}

export function getRole() {
  return getUser()?.role || null;
}

export function logout() {
  apiCall("/auth/logout", { method: "POST", body: JSON.stringify({}) }).catch(() => {});
  localStorage.clear();
  window.location.href = "/";
}

export function isLoggedIn() {
  return !!localStorage.getItem("access_token");
}
