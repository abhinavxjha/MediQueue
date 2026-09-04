function getDashboardPath(role) {
  if (role === "doctor") return "doctor-dashboard/";
  if (role === "hospital" || role === "admin") return "admin-dashboard/";
  return "patient-dashboard/";
}

function requireAuth(allowedRoles = []) {
  const token = getToken();
  const user = getCurrentUser();

  if (!token || !user) {
    localStorage.clear();
    const isInsideSubdir = window.location.pathname.includes("-dashboard");
    window.location.href = isInsideSubdir ? "../index.html" : "index.html";
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If authenticated user tries to open a dashboard for a different role, redirect to their own
    const correctPath = getDashboardPath(user.role);
    const isInsideSubdir = window.location.pathname.includes("-dashboard");
    window.location.href = isInsideSubdir ? `../${correctPath}` : correctPath;
    return null;
  }

  return user;
}

async function loginUser(email, password) {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  setCurrentUser(data.user);
  return data.user;
}

async function registerUser({ name, email, phone, role, password }) {
  const data = await api("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, phone, role, password }),
  });
  setToken(data.access_token);
  setCurrentUser(data.user);
  return data.user;
}

window.getDashboardPath = getDashboardPath;
window.requireAuth = requireAuth;
window.loginUser = loginUser;
window.registerUser = registerUser;
