/**
 * Querly API Client & Environment Configuration
 * Supports Local Development, Deployed Production Servers, and Offline Demo Mode
 */

// Determine appropriate default API Base
function getDefaultApiBase() {
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]" ||
    window.location.protocol === "file:";

  if (isLocal) {
    return "http://127.0.0.1:8000/api";
  }

  // Deployed environment: check if relative /api is available (reverse proxy), otherwise use configured or local fallback
  return "http://127.0.0.1:8000/api";
}

function getApiBase() {
  const custom = localStorage.getItem("mq_api_base");
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, "");
  }
  return getDefaultApiBase();
}

function setApiBase(url) {
  if (url && url.trim()) {
    localStorage.setItem("mq_api_base", url.trim().replace(/\/+$/, ""));
  } else {
    localStorage.removeItem("mq_api_base");
  }
  window.dispatchEvent(new CustomEvent("mq_api_base_changed", { detail: getApiBase() }));
}

function isDemoMode() {
  return localStorage.getItem("mq_demo_mode") === "true";
}

function setDemoMode(enabled) {
  if (enabled) {
    localStorage.setItem("mq_demo_mode", "true");
  } else {
    localStorage.removeItem("mq_demo_mode");
  }
  window.dispatchEvent(new CustomEvent("mq_demo_mode_changed", { detail: !!enabled }));
}

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

async function checkServerHealth(customUrl = null) {
  const base = (customUrl || getApiBase()).replace(/\/api\/?$/, "");
  const testUrl = `${base}/health`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(testUrl, {
      method: "GET",
      signal: controller.signal,
      mode: "cors",
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return { ok: true, status: "Connected", url: base };
    }
    return { ok: false, status: `HTTP ${res.status}`, url: base };
  } catch (err) {
    clearTimeout(timeoutId);
    let reason = "Server Unreachable";
    if (window.location.protocol === "https:" && base.startsWith("http://")) {
      reason = "Mixed Content (HTTPS site cannot call HTTP API)";
    } else if (err.name === "AbortError") {
      reason = "Connection Timeout (3.5s)";
    }
    return { ok: false, status: reason, error: err.message, url: base };
  }
}

// ==========================================
// Offline Demo Mock Engine
// Allows full interactive demo on deployed sites when backend is not running
// ==========================================
const DEMO_STORE_KEY = "mq_demo_data_v2";

function getDemoStore() {
  let store = null;
  try {
    store = JSON.parse(localStorage.getItem(DEMO_STORE_KEY) || "null");
  } catch (e) {}

  if (!store) {
    store = {
      patients: [
        { id: 1, name: "Rahul Sharma", email: "patient@mediqueue.org", phone: "+91 98765 43210", role: "patient" },
      ],
      doctors: [
        { id: 1, name: "Dr. Ananya Roy", email: "doctor@mediqueue.org", specialization: "Cardiology", department_name: "Cardiology", hospital_name: "City Central Hospital", is_available: true, experience_years: 12, qualification: "MD, DM (Cardiology)" },
        { id: 2, name: "Dr. Vikram Sethi", email: "vikram@mediqueue.org", specialization: "Orthopedics", department_name: "Orthopedics", hospital_name: "Metro Health Super Specialty", is_available: true, experience_years: 9, qualification: "MS (Ortho), Fellowship AIIMS" },
        { id: 3, name: "Dr. Priya Menon", email: "priya@mediqueue.org", specialization: "Pediatrics", department_name: "Pediatrics", hospital_name: "Apollo Care Center", is_available: true, experience_years: 7, qualification: "MD (Pediatrics), DCH" },
      ],
      hospitals: [
        { id: 1, name: "City Central Hospital", city: "New Delhi", address: "14 Hospital Road, Sector 5", departments_count: 8, doctors_count: 24 },
        { id: 2, name: "Metro Health Super Specialty", city: "Mumbai", address: "88 Marine Drive Extension", departments_count: 12, doctors_count: 36 },
        { id: 3, name: "Apollo Care Center", city: "Bangalore", address: "45 Tech Health Ring Road", departments_count: 6, doctors_count: 18 },
      ],
      appointments: [
        {
          id: 101,
          doctor_id: 1,
          doctor: "Dr. Ananya Roy",
          specialization: "Cardiology",
          department: "Cardiology",
          hospital: "City Central Hospital",
          date: new Date().toISOString().split("T")[0],
          time: "10:30 AM",
          token: "A-12",
          token_no: "A-12",
          patient_name: "Rahul Sharma",
          patient_phone: "+91 98765 43210",
          status: "checked_in",
          position: 2,
          waiting_minutes: 15,
          symptoms: "Mild chest tightness and routine consultation",
        },
        {
          id: 102,
          doctor_id: 2,
          doctor: "Dr. Vikram Sethi",
          specialization: "Orthopedics",
          department: "Orthopedics",
          hospital: "Metro Health Super Specialty",
          date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          time: "02:15 PM",
          token: "B-04",
          token_no: "B-04",
          patient_name: "Rahul Sharma",
          patient_phone: "+91 98765 43210",
          status: "booked",
          position: 4,
          waiting_minutes: 35,
          symptoms: "Knee joint stiffness after running",
        },
      ],
      history: [
        {
          id: 99,
          date: "2026-08-14",
          doctor_name: "Dr. Ananya Roy",
          department: "Cardiology",
          diagnosis: "Normal sinus rhythm, mild muscular strain. Advised hydration and follow-up.",
          prescription: "Tab Pantocid 40mg (OD), Tab Paracetamol 650mg SOS",
        },
      ],
    };
    saveDemoStore(store);
  }
  return store;
}

function saveDemoStore(store) {
  try {
    localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store));
  } catch (e) {}
}

async function handleDemoRequest(path, opts = {}) {
  // Simulate natural network latency
  await new Promise((r) => setTimeout(r, 120));
  const method = (opts.method || "GET").toUpperCase();
  let body = {};
  try {
    body = opts.body ? JSON.parse(opts.body) : {};
  } catch (e) {}

  const store = getDemoStore();
  const currentUser = getCurrentUser() || store.patients[0];

  // Auth: Login
  if (path === "/auth/login") {
    const role = body.role || "patient";
    let user;
    if (role === "doctor") {
      user = { id: 1, name: "Dr. Ananya Roy", email: body.email || "doctor@mediqueue.org", role: "doctor", specialization: "Cardiology" };
    } else if (role === "admin" || role === "hospital") {
      user = { id: 1, name: "Desk Administrator", email: body.email || "admin@mediqueue.org", role: role };
    } else {
      user = { id: 1, name: "Rahul Sharma (Demo)", email: body.email || "patient@mediqueue.org", role: "patient" };
    }
    return { access_token: "demo_jwt_token_" + Date.now(), user };
  }

  // Auth: Register
  if (path === "/auth/register") {
    const role = body.role || "patient";
    const user = {
      id: Date.now(),
      name: body.name || "Demo User",
      email: body.email || "demo@mediqueue.org",
      role: role,
      phone: body.phone || "+91 98765 00000",
    };
    return { access_token: "demo_jwt_token_" + Date.now(), user };
  }

  // Patient Home
  if (path === "/patient/home") {
    return {
      patient: currentUser,
      appointments: store.appointments,
    };
  }

  // Patient Queue
  if (path.startsWith("/patient/queue/")) {
    const apptId = parseInt(path.split("/").pop(), 10);
    const appt = store.appointments.find((a) => a.id === apptId) || store.appointments[0];
    return {
      appointment_id: appt?.id || 101,
      token: appt?.token || "A-12",
      current_token: "A-10",
      your_position: appt?.position || 2,
      total_waiting: 5,
      estimated_wait_minutes: appt?.waiting_minutes || 15,
      doctor_name: appt?.doctor || "Dr. Ananya Roy",
      department_name: appt?.department || "Cardiology",
      ahead_tokens: ["A-10", "A-11"],
      status: appt?.status || "checked_in",
    };
  }

  // Patient Appointments
  if (path === "/patient/appointments") {
    return store.appointments;
  }

  // Patient Doctors
  if (path.startsWith("/patient/doctors") || path === "/doctors") {
    return store.doctors;
  }

  // Patient Hospitals
  if (path.startsWith("/patient/hospitals") || path === "/hospitals") {
    return store.hospitals;
  }

  // Patient Medical History
  if (path === "/patient/history") {
    return store.history;
  }

  // Check In
  if (path.includes("/checkin") || path.includes("/check-in")) {
    const parts = path.split("/");
    const id = parseInt(parts[parts.length - 1], 10) || 101;
    const item = store.appointments.find((a) => a.id === id);
    if (item) {
      item.status = "checked_in";
      item.position = 1;
      saveDemoStore(store);
    }
    return { message: "Check-in successful! Token activated in live OPD queue." };
  }

  // Book Appointment
  if (path === "/patient/book" || path === "/appointments/book") {
    const newId = Date.now();
    const doc = store.doctors.find((d) => d.id == body.doctor_id) || store.doctors[0];
    const newAppt = {
      id: newId,
      doctor_id: doc.id,
      doctor: doc.name,
      specialization: doc.specialization,
      department: doc.department_name,
      hospital: doc.hospital_name,
      date: body.date || new Date().toISOString().split("T")[0],
      time: body.time || "11:00 AM",
      token: "T-" + Math.floor(10 + Math.random() * 89),
      token_no: "T-" + Math.floor(10 + Math.random() * 89),
      patient_name: currentUser.name || "Rahul Sharma",
      patient_phone: currentUser.phone || "+91 98765 43210",
      status: "booked",
      position: 3,
      waiting_minutes: 25,
      symptoms: body.symptoms || "General checkup",
    };
    store.appointments.unshift(newAppt);
    saveDemoStore(store);
    return { message: "Appointment booked successfully!", appointment: newAppt };
  }

  // Doctor Dashboard
  if (path === "/doctor/dashboard") {
    return {
      doctor: {
        id: 1,
        name: currentUser.name || "Dr. Ananya Roy",
        specialization: "Cardiology",
        is_available: true,
      },
      stats: {
        booked: store.appointments.length + 3,
        checked_in: 2,
        completed: 14,
        waiting: 2,
      },
      queue: store.appointments.map((a, i) => ({
        ...a,
        token_no: a.token,
        position: i + 1,
      })),
      today_appointments: store.appointments,
    };
  }

  // Doctor Appointments
  if (path === "/doctor/appointments") {
    return store.appointments;
  }

  // Doctor Availability
  if (path.startsWith("/doctor/availability")) {
    return { message: "Availability updated successfully." };
  }

  // Hospital Overview
  if (path === "/hospital/overview") {
    return {
      queue_stats: {
        waiting: 5,
        ongoing: 3,
        completed: 38,
        avg_duration_minutes: 12,
      },
      doctors: {
        available: 18,
        total: 24,
      },
    };
  }

  // Analytics
  if (path === "/analytics" || path === "/admin/analytics") {
    return {
      total_patients_today: 46,
      avg_waiting_time: 14.5,
      peak_hours: "10:00 AM - 12:30 PM",
      department_breakdown: [
        { name: "Cardiology", count: 18 },
        { name: "Orthopedics", count: 14 },
        { name: "Pediatrics", count: 10 },
        { name: "General Medicine", count: 4 },
      ],
    };
  }

  // Default fallback response
  return { success: true, message: "Demo mode simulated response", data: [] };
}

// ==========================================
// Main Unified API Executor
// ==========================================
async function api(path, opts = {}) {
  // If Demo Mode is active, handle locally without network failure
  if (isDemoMode()) {
    return await handleDemoRequest(path, opts);
  }

  const token = getToken();
  opts.headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (token) {
    opts.headers.Authorization = `Bearer ${token}`;
  }

  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path}`;

  let response;
  try {
    response = await fetch(url, opts);
  } catch (netErr) {
    // Check if this is a mixed content security block
    if (window.location.protocol === "https:" && url.startsWith("http://")) {
      const msg = `Security Block (Mixed Content): Your deployed HTTPS site cannot connect to insecure '${base}'. Please configure a secure HTTPS backend endpoint in Server Settings or use Demo Mode.`;
      if (window.toast) window.toast(msg);
      throw new Error(msg);
    }

    const errorMsg = `Cannot connect to server at ${base}. Please verify backend is running, configure the API URL in Server Settings, or switch to Demo Mode.`;
    if (window.toast) window.toast(errorMsg);
    throw new Error(errorMsg);
  }

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

// Backward-compatible API_BASE getter
Object.defineProperty(window, "API_BASE", {
  get: () => getApiBase(),
  configurable: true,
});

window.getApiBase = getApiBase;
window.setApiBase = setApiBase;
window.isDemoMode = isDemoMode;
window.setDemoMode = setDemoMode;
window.checkServerHealth = checkServerHealth;
window.getToken = getToken;
window.setToken = setToken;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.api = api;
