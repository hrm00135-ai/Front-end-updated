const API_BASE = "https://temp-backend-production-2b8a.up.railway.app/api";

export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");

  const headers = { ...options.headers };

  // Don't set Content-Type for FormData (file uploads)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401
  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${refreshToken}` },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        localStorage.setItem("access_token", refreshData.data.access_token);
        headers["Authorization"] = `Bearer ${refreshData.data.access_token}`;
        response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
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

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

export function getRole() {
  const user = getUser();
  return user?.role || null;
}

export function logout() {
  apiCall("/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  }).catch(() => {});
  localStorage.clear();
  window.location.href = "/";
}

export function isLoggedIn() {
  return !!localStorage.getItem("access_token");
}