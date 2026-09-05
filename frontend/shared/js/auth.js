function getDashboardPath(role) {
  if (role === "doctor") return "doctor-dashboard/";
  if (role === "hospital" || role === "admin") return "admin-dashboard/";
  return "patient-dashboard/";
}

function clearAuthSession() {
  setToken(null);
  setCurrentUser(null);
}

function requireAuth(allowedRoles = []) {
  const token = getToken();
  const user = getCurrentUser();

  if (!token || !user) {
    clearAuthSession();
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

async function loginUser(email, password, role = "patient") {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
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

async function loginAsDemo(role = "patient") {
  setDemoMode(true);
  const demoUsers = {
    patient: { id: 1, name: "Rahul Sharma", email: "patient@mediqueue.org", role: "patient", phone: "+91 98765 43210" },
    doctor: { id: 1, name: "Dr. Ananya Roy", email: "doctor@mediqueue.org", role: "doctor", specialization: "Cardiology" },
    hospital: { id: 1, name: "Hospital OPD Desk", email: "desk@mediqueue.org", role: "hospital" },
    admin: { id: 1, name: "System Administrator", email: "admin@mediqueue.org", role: "admin" },
  };
  const selected = demoUsers[role] || demoUsers.patient;
  setToken("demo_token_" + Date.now());
  setCurrentUser(selected);
  return selected;
}

window.getDashboardPath = getDashboardPath;
window.clearAuthSession = clearAuthSession;
window.requireAuth = requireAuth;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.loginAsDemo = loginAsDemo;
