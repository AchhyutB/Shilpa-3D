const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8081/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // sends the refreshtoken cookie
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export const authService = {
  signup: (name, email, password) =>
    request("/register", {
      method: "POST",
      body: JSON.stringify({ username: name, email, password }),
    }),

  login: async (username, password) => {
    const data = await request("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem("accessToken", data.userData.accessToken);
    localStorage.setItem("username", data.userData.username);
    return data;
  },

  logout: async () => {
    await request("/logout", { method: "POST" });
    localStorage.removeItem("accessToken");
    localStorage.removeItem("username");
  },

  me: () => request("/profile"),

  saveGoogleToken: (token) => {
    localStorage.setItem("accessToken", token);
  },

  uploadImages: async (files) => {
    const token = localStorage.getItem("accessToken");
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // NOTE: no Content-Type here — browser sets the correct
        // multipart boundary automatically for FormData
      },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Upload failed");
    return data; // { session_id }
  },

  getStatus: (sessionId) => request(`/status/${sessionId}`),

  reconstruct: (sessionId, statueName, method) =>
    request("/reconstruct", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        statue_name: statueName,
        method,
      }),
    }),
getResults: (sessionId) => request(`/results/${sessionId}`),
  googleLoginUrl: `${API_BASE}/auth/google`,
};
