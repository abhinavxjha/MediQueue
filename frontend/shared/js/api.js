const API_BASE = "http://127.0.0.1:8000/api";

function getToken() {
  return localStorage.getItem("mq_token");
}

function setToken(token) {
  if (token) localStorage.setItem("mq_token", token);
  else localStorage.removeItem("mq_token");
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("mq_user") || "null");
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) localStorage.setItem("mq_user", JSON.stringify(user));
  else localStorage.removeItem("mq_user");
}

async function api(path, opts = {}) {
  const token = getToken();
  opts.headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (token) {
    opts.headers.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const response = await fetch(url, opts);

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { detail: "Server returned an unreadable response" };
  }

  if (response.status === 401 || response.status === 403) {
    // If forbidden or unauthorized, clear and return to login
    setToken(null);
    setCurrentUser(null);
    if (window.toast) {
      window.toast(data.detail || "Session expired or access denied. Please sign in.");
    }
    setTimeout(() => {
      // Determine relative path to root index.html
      if (window.location.pathname.includes("-dashboard")) {
        window.location.href = "../index.html";
      } else {
        window.location.href = "index.html";
      }
    }, 800);
    throw new Error(data.detail || "Session expired. Please sign in.");
  }

  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }

  return data;
}

window.API_BASE = API_BASE;
window.getToken = getToken;
window.setToken = setToken;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.api = api;
