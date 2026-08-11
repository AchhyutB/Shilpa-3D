const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8081/api";

const SERVER_BASE =
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:8081";

// ==========================================
// HELPERS
// ==========================================

function normalizeAvatar(user) {
  if (!user) return "";

  // Backend already provides complete URL
  if (user.avatar_url) {
    return user.avatar_url;
  }

  if (user.avatar) {
    return user.avatar;
  }

  // Backend only provides filename
  if (user.avatar_filename) {
    return `${SERVER_BASE}/uploads/avatars/${user.avatar_filename}`;
  }

  return "";
}

function normalizeUser(user) {
  if (!user) return null;

  return {
    ...user,

    username: user.username || "",
    name: user.name || "",
    language: user.language || "English",
    country: user.country || "United States",
    quality: user.quality || "Standard",
    default_reconstruction:
      user.default_reconstruction || "Gaussian Splat",

    avatar_url: normalizeAvatar(user),
  };
}

// ==========================================
// REQUEST
// ==========================================

async function request(path, options = {}) {
  const token = localStorage.getItem("accessToken");

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",

    headers: {
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },

    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.message || "Request failed"
    );
  }

  return data;
}

// ==========================================
// AUTH SERVICE
// ==========================================

export const authService = {

  // ========================================
  // SIGNUP
  // ========================================

  signup: async (name, email, password) => {
    return request("/register", {
      method: "POST",

      body: JSON.stringify({
        username: name,
        email,
        password,
      }),
    });
  },

  // ========================================
  // LOGIN
  // ========================================

  login: async (username, password) => {
    const data = await request("/login", {
      method: "POST",

      body: JSON.stringify({
        username,
        password,
      }),
    });

    const userData = data.userData;

    localStorage.setItem(
      "accessToken",
      userData.accessToken
    );

    localStorage.setItem(
      "username",
      userData.username || username
    );

    return data;
  },

  // ========================================
  // LOGOUT
  // ========================================

  logout: async () => {
    try {
      await request("/logout", {
        method: "POST",
      });
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("username");
      localStorage.removeItem("displayName");
      localStorage.removeItem("avatar");
    }
  },

  // ========================================
  // PROFILE
  // ========================================

  getProfile: async () => {
    const data = await request("/profile");

    if (data.user) {
      data.user = normalizeUser(data.user);
    }

    return data;
  },

  // ========================================
  // UPDATE PROFILE
  // ========================================

  updateProfile: async (updates) => {
    const data = await request("/profile", {
      method: "PUT",

      body: JSON.stringify(updates),
    });

    if (data.user) {
      data.user = normalizeUser(data.user);
    }

    return data;
  },

  // ========================================
  // UPLOAD AVATAR
  // ========================================

  uploadAvatar: async (file) => {
    const token =
      localStorage.getItem("accessToken");

    const formData = new FormData();

    formData.append("avatar", file);

    const res = await fetch(
      `${API_BASE}/profile/avatar`,
      {
        method: "POST",

        credentials: "include",

        headers: {
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },

        body: formData,
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data.message || "Avatar upload failed"
      );
    }

    if (data.user) {
      data.user = normalizeUser(data.user);
    }

    if (data.avatar_url) {
      data.avatar_url = normalizeAvatar(data);
    }

    return data;
  },

  // ========================================
  // REMOVE AVATAR
  // ========================================

  removeAvatar: async () => {
    const data = await request(
      "/profile/avatar",
      {
        method: "DELETE",
      }
    );

    if (data.user) {
      data.user = normalizeUser(data.user);
    }

    return data;
  },

  // ========================================
  // DELETE ACCOUNT
  // ========================================

  deleteAccount: () =>
    request("/account", {
      method: "DELETE",
    }),

  // ========================================
  // UPLOAD IMAGES
  // ========================================

  uploadImages: async (files) => {
    const token =
      localStorage.getItem("accessToken");

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("images", file);
    });

    const res = await fetch(
      `${API_BASE}/upload`,
      {
        method: "POST",

        credentials: "include",

        headers: {
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },

        body: formData,
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data.message || "Upload failed"
      );
    }

    return data;
  },

  // ========================================
  // DELETE SESSION
  // ========================================

  deleteSession: (sessionId) =>
    request(`/history/${sessionId}`, {
      method: "DELETE",
    }),

  // ========================================
  // STATUS
  // ========================================

  getStatus: (sessionId) =>
    request(`/status/${sessionId}`),

  // ========================================
  // RECONSTRUCT
  // ========================================

  reconstruct: (
    sessionId,
    statueName,
    method
  ) =>
    request("/reconstruct", {
      method: "POST",

      body: JSON.stringify({
        session_id: sessionId,
        statue_name: statueName,
        method,
      }),
    }),

  // ========================================
  // RESULTS
  // ========================================

  getResults: (sessionId) =>
    request(`/results/${sessionId}`),

  // ========================================
  // HISTORY
  // ========================================

  getHistory: () =>
    request("/history"),

  // ========================================
  // GOOGLE
  // ========================================

  saveGoogleToken: (token) => {
    localStorage.setItem(
      "accessToken",
      token
    );
  },

  googleLoginUrl:
    `${API_BASE}/auth/google`,
};