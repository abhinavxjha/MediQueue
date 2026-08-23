const API_BASE = "http://127.0.0.1:8000/api";
let token = localStorage.getItem("mq_token");
let currentUser = JSON.parse(localStorage.getItem("mq_user") || "null");
let active = "dashboard";
let chart;
let temporaryAppointmentTimer;
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      m
      ],
  );
function getLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
async function api(path, opts = {}) {
  opts.headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  let r = await fetch(API_BASE + path, opts);
  let data = await r
    .json()
    .catch(() => ({ detail: "Server returned an invalid response" }));
  if (r.status === 401 || r.status === 403) {
    localStorage.clear();
    token = null;
    currentUser = null;
    boot();
    toast(data.detail || "Session expired or access denied. Please sign in again.");
    throw new Error(data.detail || "Session expired. Please sign in again.");
  }
  if (!r.ok) throw new Error(data.detail || "Request failed");
  return data;
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 2800);
}
function boot() {
  if (token && currentUser) {
    showApp();
    renderNav();
    render();
  } else {
    $("#authView").classList.remove("hidden");
    $("#appView").classList.add("hidden");
  }
}
function showApp() {
  $("#authView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  $("#userName").textContent = currentUser.name;
  $("#userRole").textContent =
    currentUser.role[0].toUpperCase() + currentUser.role.slice(1);
  $("#avatar").textContent = currentUser.name[0].toUpperCase();
}
function renderNav() {
  const items =
    currentUser.role === "patient"
      ? [
        ["dashboard", "grid-1x2", "Dashboard"],
        ["appointments", "calendar-check", "My Appointments"],
        ["doctors", "person-badge", "Doctors"],
        ["hospitals", "hospital", "Hospitals"],
        ["history", "clock-history", "History"],
      ]
      : currentUser.role === "doctor"
        ? [
          ["dashboard", "speedometer2", "Dashboard"],
          ["appointments", "calendar-check", "Appointments"],
          ["slots", "clock", "Manage Slots"],
        ]
        : currentUser.role === "hospital"
          ? [
            ["dashboard", "speedometer2", "Hospital Console"],
            ["doctors", "calendar3", "Doctor Schedule"],
            ["timelogs", "stopwatch", "Patient Timestamps"],
          ]
          : [
            ["dashboard", "grid-1x2", "Dashboard"],
            ["hospital_desk", "hospital", "Hospital Desk"],
            ["doctors", "person-badge", "Doctors"],
            ["analytics", "bar-chart-line", "Analytics"],
            ["appointments", "calendar-check", "Appointments"],
          ];
  $("#nav").innerHTML = items
    .map(
      ([id, icon, label]) =>
        `<button class="nav-btn ${active === id ? "active" : ""}" data-page="${id}"><i class="bi bi-${icon}"></i><span>${label}</span></button>`,
    )
    .join("");
  document.querySelectorAll(".nav-btn").forEach(
    (b) =>
    (b.onclick = () => {
      if (b.dataset.page === "profile") {
        openProfileModal("edit");
        return;
      }
      active = b.dataset.page;
      renderNav();
      render();
    }),
  );
}
let selectedAuthRole = "patient";

function selectAuthRole(role) {
  selectedAuthRole = role;
  const regRole = $("#regRole");
  if (regRole) regRole.value = role;
  const loginRole = $("#loginRole");
  if (loginRole) loginRole.value = role;
}
window.selectAuthRole = selectAuthRole;

async function renderTopAppointmentsBanner() {
  const container = $("#topAppointmentsBanner");
  if (!container) return;
  if (!currentUser) {
    container.innerHTML = "";
    return;
  }

  try {
    if (currentUser.role === "patient") {
      const d = await api("/patient/home");
      const activeApps = d.appointments.filter((a) => a.status !== "completed");
      const nextApp = activeApps[0];

      if (nextApp) {
        container.innerHTML = `
          <div class="top-app-card">
            <div class="top-app-header">
              <div class="top-app-title">
                <i class="bi bi-calendar-check-fill"></i>
                <span>New & Active Appointments</span>
              </div>
              <span class="top-app-badge"><i class="bi bi-bell-fill"></i> ${activeApps.length} Active ${activeApps.length === 1 ? 'Appointment' : 'Appointments'}</span>
            </div>
            <div class="top-app-body">
              <div class="top-app-details">
                <div class="top-app-item">
                  <label>Consulting Specialist</label>
                  <strong>${esc(nextApp.doctor)} (${esc(nextApp.specialization)})</strong>
                </div>
                <div class="top-app-item">
                  <label>Department & Hospital</label>
                  <strong>${esc(nextApp.department)} · ${esc(nextApp.hospital)}</strong>
                </div>
                <div class="top-app-item">
                  <label>Scheduled Slot</label>
                  <strong>${esc(nextApp.date)} at ${esc(nextApp.time)}</strong>
                </div>
                <div class="top-app-item">
                  <label>Token & Status</label>
                  <div>
                    <b class="token-pill me-2">${esc(nextApp.token || "—")}</b>
                    <span class="pill ${nextApp.status === "checked_in" ? "purple" : "orange"}">${esc(nextApp.status)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="top-app-card">
            <div class="top-app-header">
              <div class="top-app-title">
                <i class="bi bi-calendar-plus-fill"></i>
                <span>New OPD Appointments</span>
              </div>
              <span class="top-app-badge text-muted">0 Active Visits</span>
            </div>
            <div class="top-app-body">
              <div class="top-app-details">
                <span class="text-muted small"><i class="bi bi-info-circle me-1"></i> You currently have no upcoming OPD appointments scheduled.</span>
              </div>
            </div>
          </div>
        `;
      }
    } else if (currentUser.role === "doctor") {
      const d = await api("/doctor/dashboard");
      const waitingCount = d.stats.waiting || 0;
      const bookedCount = d.stats.booked || 0;
      const nextQ = d.queue ? d.queue[0] : null;

      container.innerHTML = `
        <div class="top-app-card">
          <div class="top-app-header">
            <div class="top-app-title">
              <i class="bi bi-person-workspace"></i>
              <span>Today's OPD Patient Appointments</span>
            </div>
            <span class="top-app-badge"><i class="bi bi-calendar-event"></i> ${bookedCount} Appointments Today (${waitingCount} Waiting)</span>
          </div>
          <div class="top-app-body">
            <div class="top-app-details">
              <div class="top-app-item">
                <label>Next Patient Ticket</label>
                <strong>${nextQ ? `Token ${esc(nextQ.token)} (Position #${nextQ.position})` : 'No patients currently waiting'}</strong>
              </div>
              <div class="top-app-item">
                <label>Queue Status</label>
                <strong>${d.stats.checked_in} Checked In · ${d.stats.completed} Completed</strong>
              </div>
            </div>
            <div class="top-app-actions">
              <button class="btn btn-sm btn-teal" onclick="nextPatient()"><i class="bi bi-telephone-outbound"></i> Call Next Patient</button>
              <button class="btn btn-sm btn-outline-primary" onclick="go('appointments')"><i class="bi bi-list-task"></i> View Appointments</button>
              <button class="btn btn-sm btn-outline-secondary" onclick="go('slots')"><i class="bi bi-clock"></i> Manage Slots</button>
            </div>
          </div>
        </div>
      `;
    } else if (currentUser.role === "hospital") {
      const overview = await api("/hospital/overview");
      container.innerHTML = `
        <div class="top-app-card">
          <div class="top-app-header">
            <div class="top-app-title">
              <i class="bi bi-hospital-fill"></i>
              <span>Hospital OPD Desk & New Appointments</span>
            </div>
            <span class="top-app-badge"><i class="bi bi-people-fill"></i> ${overview.queue_stats.waiting} Waiting · ${overview.queue_stats.ongoing} Ongoing</span>
          </div>
          <div class="top-app-body">
            <div class="top-app-details">
              <div class="top-app-item">
                <label>Today's Completed</label>
                <strong>${overview.queue_stats.completed} Patient Consultations</strong>
              </div>
              <div class="top-app-item">
                <label>Real-Time OPD Wait</label>
                <strong>~${overview.queue_stats.avg_duration_minutes} min / consultation</strong>
              </div>
            </div>
            <div class="top-app-actions">
              <button class="btn btn-sm btn-teal" onclick="go('dashboard')"><i class="bi bi-speedometer2"></i> Live OPD Console</button>
              <button class="btn btn-sm btn-outline-primary" onclick="go('doctors')"><i class="bi bi-calendar3"></i> Doctor Availability</button>
              <button class="btn btn-sm btn-outline-secondary" onclick="go('timelogs')"><i class="bi bi-stopwatch"></i> Timestamps</button>
            </div>
          </div>
        </div>
      `;
    } else if (currentUser.role === "admin") {
      const d = await api("/admin/dashboard");
      container.innerHTML = `
        <div class="top-app-card">
          <div class="top-app-header">
            <div class="top-app-title">
              <i class="bi bi-shield-check-fill"></i>
              <span>System New Appointments & OPD Overview</span>
            </div>
            <span class="top-app-badge"><i class="bi bi-activity"></i> ${d.kpis.patients_today} Total Patients Today</span>
          </div>
          <div class="top-app-body">
            <div class="top-app-details">
              <div class="top-app-item">
                <label>Completed Consultations</label>
                <strong>${d.kpis.completed} Completed</strong>
              </div>
              <div class="top-app-item">
                <label>Waiting Queue</label>
                <strong>${d.kpis.waiting} Patients Waiting</strong>
              </div>
              <div class="top-app-item">
                <label>No-Show Rate</label>
                <strong>${d.kpis.no_show_rate}%</strong>
              </div>
            </div>
            <div class="top-app-actions">
              <button class="btn btn-sm btn-teal" onclick="go('analytics')"><i class="bi bi-bar-chart-line"></i> Analytics</button>
              <button class="btn btn-sm btn-outline-primary" onclick="go('doctors')"><i class="bi bi-person-badge"></i> Doctors Catalog</button>
            </div>
          </div>
        </div>
      `;
    }
  } catch (e) {
    container.innerHTML = "";
  }
}

async function render() {
  await renderTopAppointmentsBanner();
  const c = $("#content");
  clearInterval(temporaryAppointmentTimer);
  temporaryAppointmentTimer = null;
  c.innerHTML = '<div class="empty">Loading Querly...</div>';
  try {
    if (currentUser.role === "patient") await patientPage(c);
    else if (currentUser.role === "doctor") await doctorPage(c);
    else if (currentUser.role === "hospital" || active === "hospital_desk") await hospitalPage(c);
    else await adminPage(c);
  } catch (e) {
    const isNetwork = e.message.toLowerCase().includes("failed to fetch") || e.message.toLowerCase().includes("networkerror");
    c.innerHTML = `
      <div class="panel empty flex-column align-items-center justify-content-center p-5 text-center">
        <i class="bi bi-${isNetwork ? 'wifi-off' : 'exclamation-triangle'} text-teal display-4 mb-3"></i>
        <h4>${isNetwork ? "Connection Error" : "Unable to Load Data"}</h4>
        <p class="text-muted small max-w-md mb-3">${esc(e.message)}</p>
        <div class="d-flex gap-2 justify-content-center">
          <button class="btn btn-teal" onclick="render()"><i class="bi bi-arrow-clockwise me-1"></i> Retry Connection</button>
          <button class="btn btn-outline-secondary" onclick="doLogout()"><i class="bi bi-box-arrow-left me-1"></i> Sign In Again</button>
        </div>
      </div>
    `;
  }
}
function startTemporaryAppointmentTimer(appointments) {
  if (temporaryAppointmentTimer || !appointments.some((appointment) => appointment.status !== "completed")) return;
  temporaryAppointmentTimer = setInterval(async () => {
    const appointment = appointments.find((item) => item.status !== "completed");
    if (!appointment) return;
    try {
      await api(`/patient/appointments/${appointment.id}/temporary-complete`, { method: "POST" });
      toast("Temporary demo appointment moved to History");
      render();
    } catch (e) {
      toast(e.message);
    }
  }, 45000);
}
async function openAppointmentDetails(id) {
  const data = await api("/patient/home");
  const appointment = data.appointments.find((item) => item.id === id);
  if (!appointment) return toast("Appointment not found");
  const isRemovable = !["checked_in", "called", "ongoing", "in_consultation", "serving", "completed"].includes(appointment.status);
  showModal(`<button class="close" onclick="closeModal()">×</button><div class="detail-modal"><span class="eyebrow">APPOINTMENT DETAILS</span><h3>${esc(appointment.doctor)}</h3><p>${esc(appointment.specialization)} · ${esc(appointment.department)}</p><div class="detail-list"><div><small>Hospital</small><strong>${esc(appointment.hospital)}</strong></div><div><small>Date and time</small><strong>${appointment.date} · ${appointment.time}</strong></div><div><small>Token and fee</small><strong>${esc(appointment.token || "—")} · ₹${appointment.fee}</strong></div><div><small>Symptoms</small><strong>${esc(appointment.symptoms || "Not provided")}</strong></div><div><small>Status</small><strong>${esc(appointment.status)}</strong></div></div><div class="d-flex gap-2 mt-3"><button class="primary-btn flex-grow-1" onclick="downloadSlip(${id})"><i class="bi bi-download"></i> Download E-Slip</button>${isRemovable ? `<button class="btn btn-outline-danger" onclick="cancelAppointment(${id}, '${appointment.status}')"><i class="bi bi-trash"></i> Remove</button>` : `<button class="btn btn-outline-secondary" disabled title="Ongoing and completed visits cannot be removed"><i class="bi bi-lock"></i> Locked</button>`}</div></div>`);
}
async function openReport(id) {
  try {
    const report = await api(`/patient/report/${id}`);
    showModal(`<button class="close" onclick="closeModal()">×</button><div class="detail-modal"><span class="eyebrow">CONSULTATION REPORT</span><h3>${esc(report.doctor)}</h3><p>${esc(report.specialization)} · ${esc(report.hospital)}</p><div class="detail-list"><div><small>Symptoms</small><strong>${esc(report.symptoms || "Not provided")}</strong></div><div><small>Diagnosis</small><strong>${esc(report.diagnosis || "Not recorded")}</strong></div><div><small>Doctor notes</small><strong>${esc(report.notes || "Not recorded")}</strong></div><div><small>Prescription</small><strong>${esc(report.prescription || "Not recorded")}</strong></div><div><small>Follow-up</small><strong>${esc(report.followup_date || "Not scheduled")}</strong></div></div><button class="primary-btn" onclick="downloadReport(${id})"><i class="bi bi-download"></i> Download Full Report</button></div>`);
  } catch (e) {
    toast(e.message);
  }
}
async function downloadReport(id) {
  const response = await fetch(API_BASE + `/slips/${id}/report.pdf`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return toast("Could not download report");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `querly-report-${id}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
function renderSineWaveQueueHTML(queue, next) {
  if (!queue && !next) return '<div class="sine-queue-card"><div class="empty">No active queue. Book an appointment first.</div></div>';

  const token = queue?.token || next?.token || "T-001";
  const nowServing = queue?.now_serving || (next?.status === 'called' ? token : null) || "—";
  const pos = queue?.position ?? 1;
  const status = queue?.status || next?.status || "booked";
  const waitMin = queue?.waiting_minutes ?? next?.waiting_minutes ?? "—";
  const dept = esc(next?.department || "General OPD");
  const doctor = esc(next?.doctor || "Attending Specialist");

  const userIndex = Math.max(1, pos);
  let servingIndex = 1;
  if (nowServing !== "—" && token.includes("-") && nowServing.includes("-")) {
    const userNum = parseInt(token.split("-")[1], 10) || pos;
    const servNum = parseInt(nowServing.split("-")[1], 10) || 1;
    servingIndex = Math.max(1, userIndex - (userNum - servNum));
  } else if (status === "called") {
    servingIndex = userIndex;
  } else if (userIndex > 1) {
    servingIndex = userIndex - 1;
  }

  // Both crests and troughs represent tickets before and up to user appointment
  const totalTickets = Math.max(7, userIndex + 2);
  const width = 840;
  const height = 160;
  const cy = 80;        // center horizontal axis
  const amplitude = 28; // low amplitude for sleek executive presentation
  const startX = 45;
  const endX = width - 45;
  const ticketStep = (endX - startX) / (totalTickets - 1);

  // Generate a mathematically perfect continuous sine wave path
  let pathD = `M 0,${(cy - amplitude).toFixed(1)} `;
  for (let px = 0; px <= width; px += 4) {
    const angle = ((px - startX) / ticketStep) * Math.PI;
    const py = cy - amplitude * Math.cos(angle);
    pathD += `L ${px.toFixed(1)},${py.toFixed(1)} `;
  }

  let nodes = [];
  for (let i = 0; i < totalTickets; i++) {
    const ticketIdx = i + 1;
    const xNode = startX + i * ticketStep;
    const isCrest = i % 2 === 0;
    const yNode = isCrest ? (cy - amplitude) : (cy + amplitude);

    let ticketTokenNum = `T-0${ticketIdx}`;
    if (token.includes("-")) {
      const parts = token.split("-");
      const prefix = parts[0];
      const baseNum = parseInt(parts[1], 10) || pos;
      const calcNum = baseNum - (userIndex - ticketIdx);
      if (calcNum > 0) {
        ticketTokenNum = `${prefix}-${String(calcNum).padStart(3, '0')}`;
      }
    }

    const state = (ticketIdx < servingIndex)
      ? "completed"
      : (ticketIdx === servingIndex)
        ? "blinking"
        : (ticketIdx === userIndex)
          ? "user"
          : "upcoming";

    nodes.push({
      index: ticketIdx,
      x: xNode,
      y: yNode,
      isCrest,
      token: ticketTokenNum,
      state
    });
  }

  let svgNodes = "";
  let overlayBadges = "";

  nodes.forEach(pt => {
    const xPct = (pt.x / width) * 100;
    const labelY = pt.isCrest ? (pt.y - 16) : (pt.y + 24);
    const labelColor = pt.state === "completed" ? "#045e6b" : (pt.state === "blinking" ? "#068394" : (pt.state === "user" ? "#068394" : "#94a3b8"));
    const labelWeight = pt.state === "user" ? "800" : "700";

    if (pt.state === "completed") {
      svgNodes += `
        <circle cx="${pt.x}" cy="${pt.y}" r="11" fill="#068394" stroke="#ffffff" stroke-width="3" filter="drop-shadow(0 2px 6px rgba(6,131,148,0.4))" />
        <path d="M ${pt.x - 4} ${pt.y} L ${pt.x - 1} ${pt.y + 3} L ${pt.x + 5} ${pt.y - 3}" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <text x="${pt.x}" y="${labelY}" text-anchor="middle" fill="${labelColor}" font-size="11" font-weight="${labelWeight}">${pt.token}</text>
      `;
    } else if (pt.state === "blinking") {
      svgNodes += `
        <circle cx="${pt.x}" cy="${pt.y}" r="18" fill="none" stroke="#0ab8d0" stroke-width="2">
          <animate attributeName="r" values="12;28;12" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${pt.x}" cy="${pt.y}" r="12" fill="#0ab8d0" stroke="#045e6b" stroke-width="3.5" filter="drop-shadow(0 0 12px #068394)">
          <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <text x="${pt.x}" y="${labelY}" text-anchor="middle" fill="${labelColor}" font-size="11" font-weight="800">${pt.token}</text>
      `;
      const badgeTop = pt.isCrest ? ((pt.y / height) * 100 - 22) : ((pt.y / height) * 100 - 22);
      overlayBadges += `
        <div class="token-floating-badge" style="left:${xPct}%; top:${badgeTop}%;">
          <span class="token-lbl">NOW SERVING</span>
          <span class="token-num">${pt.token}</span>
        </div>
      `;
    } else if (pt.state === "user") {
      svgNodes += `
        <circle cx="${pt.x}" cy="${pt.y}" r="12" fill="#08a2b7" stroke="#ffffff" stroke-width="3.5" filter="drop-shadow(0 4px 10px rgba(8,162,183,0.6))" />
        <text x="${pt.x}" y="${labelY}" text-anchor="middle" fill="${labelColor}" font-size="11" font-weight="800">${pt.token}</text>
      `;
      const badgeTop = pt.isCrest ? ((pt.y / height) * 100 + 16) : ((pt.y / height) * 100 - 26);
      overlayBadges += `
        <div class="user-token-floating-badge" style="left:${xPct}%; top:${badgeTop}%;">
          <i class="bi bi-person-fill"></i> YOUR TOKEN (${token})
        </div>
      `;
    } else {
      svgNodes += `
        <circle cx="${pt.x}" cy="${pt.y}" r="8" fill="#ffffff" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3,3" />
        <text x="${pt.x}" y="${labelY}" text-anchor="middle" fill="${labelColor}" font-size="10" font-weight="600">${pt.token}</text>
      `;
    }
  });

  return `
    <div class="sine-queue-card">
      <div class="sine-header">
        <div class="sine-title-wrap">
          <h4><i class="bi bi-activity"></i> Live Sine-Wave Queue Tracker</h4>
          <p>${dept} · ${doctor}</p>
        </div>
        <div class="sine-badge-now">
          <i class="bi bi-broadcast"></i> Live Updates
        </div>
      </div>

      <div class="sine-wave-wrapper">
        <svg class="sine-wave-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="sineTealGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#068394" />
              <stop offset="50%" stop-color="#0ab8d0" />
              <stop offset="100%" stop-color="#94a3b8" />
            </linearGradient>
            <filter id="sineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          <path d="${pathD}" fill="none" stroke="rgba(13,148,136,0.15)" stroke-width="8" stroke-linecap="round" />
          <path d="${pathD}" fill="none" stroke="url(#sineTealGradient)" stroke-width="4" stroke-linecap="round" filter="url(#sineGlow)" />
          ${svgNodes}
        </svg>
        ${overlayBadges}
      </div>

      <div class="sine-legend">
        <div class="sine-legend-item">
          <div class="sine-legend-dot completed"></div>
          <span>Completed Tickets</span>
        </div>
        <div class="sine-legend-item">
          <div class="sine-legend-dot blinking"></div>
          <span>Currently Serving (In Progress)</span>
        </div>
        <div class="sine-legend-item">
          <div class="sine-legend-dot user"></div>
          <span>Your Ticket</span>
        </div>
        <div class="sine-legend-item">
          <div class="sine-legend-dot upcoming"></div>
          <span>Upcoming Tickets</span>
        </div>
      </div>

      <div class="prediction-info-box mt-3 p-3 rounded" style="background: rgba(6, 131, 148, 0.04); border: 1px solid rgba(6, 131, 148, 0.15); font-size: 13px;">
        <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <span><i class="bi bi-people-fill text-teal me-1"></i> Position in line: <b style="color:var(--primary-dark)">${pos === 1 ? "Next in line!" : (pos - 1) + " patients ahead"}</b></span>
          <span><i class="bi bi-clock-history text-teal me-1"></i> Predicted Wait Time: <b style="color:var(--primary-dark); font-size: 15px;">${waitMin} min</b></span>
          <span><i class="bi bi-ticket-perforated-fill text-teal me-1"></i> Your Token: <b style="color:var(--primary-dark)">${esc(token)}</b></span>
        </div>
        ${queue?.prediction ? `
          <div class="pt-2 border-top text-muted small d-flex justify-content-between flex-wrap gap-2" style="font-size: 11px;">
            <span><i class="bi bi-stopwatch me-1"></i> Avg Consultation Duration: <b>${queue.prediction.avg_consultation_time} min/patient</b> (${queue.prediction.samples_count} sessions analyzed)</span>
            <span><i class="bi bi-person-workspace me-1"></i> Patient Inside: <b>${queue.prediction.ongoing_remaining_minutes > 0 ? `~${queue.prediction.ongoing_remaining_minutes} min remaining` : 'Calling next'}</b></span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}
async function patientPage(c) {
  if (active === "dashboard") {
    const d = await api("/patient/home");
    const next = d.appointments.find((x) =>
      ["booked", "checked_in", "called"].includes(x.status),
    );
    const queue = next ? await api("/patient/queue/" + next.id) : null;
    c.innerHTML = `<div class="hero"><div><h1>Good Morning, ${esc(d.patient.name)}! 👋</h1><p>We're here to make your visit smooth and hassle-free.</p></div><div class="hero-art"><i class="bi bi-hospital"></i></div></div><div class="cards"><div class="action-card" onclick="go('appointments')"><i class="bi bi-clock-history"></i><h3>My Appointments</h3><p>See your upcoming visits</p></div><div class="action-card" onclick="go('book')"><i class="bi bi-calendar-plus"></i><h3>Book Appointment</h3><p>Find doctors & book your slot</p></div><div class="action-card" onclick="go('history')"><i class="bi bi-clock-history"></i><h3>Medical History</h3><p>Review completed consultations</p></div></div><div class="section-title">Today's Overview</div><div class="stats"><div class="stat-card"><span>Your Token Number</span><strong>${next?.token || "—"}</strong><div class="trend">Smart queue</div></div><div class="stat-card"><span>Estimated Waiting Time</span><strong>${next?.waiting_minutes ?? "—"} ${next ? "min" : ""}</strong><div class="trend">Updated live</div></div><div class="stat-card"><span>Appointment Status</span><strong style="font-size:18px;margin-top:12px">${next ? next.status.replace("_", " ") : "No visit"}</strong><div class="trend">Digital check-in</div></div><div class="stat-card"><span>Appointments</span><strong>${d.appointments.length}</strong><div class="trend">History & upcoming</div></div></div><div class="section-title">Live Queue</div>${renderSineWaveQueueHTML(queue, next)}`;
  } else if (active === "book" || active === "doctors") {
    await renderBooking(c);
  } else if (active === "hospitals") {
    await renderHospitals(c);
  } else if (active === "appointments") {
    const d = await api("/patient/home");
    const activeApps = d.appointments.filter((a) => a.status !== "completed" && a.status !== "cancelled");
    c.innerHTML = `<div class="section-title">My Appointments</div><div class="panel"><table class="table"><thead><tr><th>Doctor</th><th>OPD</th><th>Date</th><th>Token</th><th>Status</th><th>Actions</th></tr></thead><tbody>${activeApps.map((a) => {
      const isRemovable = !["checked_in", "called", "ongoing", "in_consultation", "serving", "completed"].includes(a.status);
      return `<tr><td><b>${esc(a.doctor)}</b><br><small>${esc(a.specialization)}</small></td><td>${esc(a.department)}</td><td>${a.date} · ${a.time}</td><td><b>${esc(a.token || "—")}</b></td><td><span class="pill ${a.status === "checked_in" ? "purple" : "orange"}">${esc(a.status)}</span></td><td class="appointment-actions"><button class="btn btn-sm btn-outline-primary" onclick="openAppointmentDetails(${a.id})">View details</button><button class="btn btn-sm btn-outline-primary" onclick="downloadSlip(${a.id})"><i class="bi bi-download"></i> Download</button>${isRemovable ? `<button class="btn btn-sm btn-outline-danger" onclick="cancelAppointment(${a.id}, '${a.status}')"><i class="bi bi-trash"></i> Remove</button>` : `<button class="btn btn-sm btn-outline-secondary" disabled title="Ongoing/Completed visits cannot be removed"><i class="bi bi-lock"></i> Locked</button>`}</td></tr>`;
    }).join("") || '<tr><td colspan="6" class="empty">No active appointments. Completed visits appear in History.</td></tr>'}</tbody></table></div><div class="temporary-notice"><i class="bi bi-hourglass-split"></i> Temporary Feature: demo appointments are moved to History after 45 seconds.</div>`;
    startTemporaryAppointmentTimer(d.appointments);
  } else if (active === "history") {
    const d = await api("/patient/home");
    const history = d.appointments.filter((appointment) => appointment.status === "completed");
    c.innerHTML = `<div class="section-title">Medical History</div><div class="history-intro">Your completed appointments and consultation records in one place.</div><div class="history-list">${history.map((a) => `<article class="history-card"><div class="history-card-head"><div><span class="eyebrow">${a.date} · ${a.time}</span><h3>${esc(a.doctor)}</h3><p>${esc(a.specialization)} · ${esc(a.department)}</p></div><span class="pill green">Completed</span></div><div class="history-grid"><div><small>Hospital</small><strong>${esc(a.hospital)}</strong></div><div><small>Token / fee</small><strong>${esc(a.token || "—")} · ₹${a.fee}</strong></div><div><small>Symptoms</small><strong>${esc(a.symptoms || "Not provided")}</strong></div><div><small>Diagnosis</small><strong>${esc(a.consultation?.diagnosis || "Not recorded")}</strong></div><div><small>Doctor notes</small><strong>${esc(a.consultation?.notes || "Not recorded")}</strong></div><div><small>Prescription</small><strong>${esc(a.consultation?.prescription || "Not recorded")}</strong></div></div>${a.consultation?.followup_date ? `<div class="history-followup"><i class="bi bi-calendar2-check"></i> Follow-up recommended: ${esc(a.consultation.followup_date)}</div>` : ""}<div class="history-actions"><button class="btn btn-sm btn-outline-primary" onclick="openReport(${a.id})"><i class="bi bi-file-earmark-medical"></i> View Report</button><button class="btn btn-sm btn-outline-primary" onclick="downloadReport(${a.id})"><i class="bi bi-download"></i> Download</button></div></article>`).join("") || '<div class="panel empty">Completed appointment history will appear here after a consultation.</div>'}</div>`;
  } else if (active === "queue") {
    const d = await api("/patient/home");
    const a = d.appointments.find((x) =>
      ["checked_in", "called", "booked"].includes(x.status),
    );
    if (!a) {
      c.innerHTML =
        '<div class="panel empty">No active queue. Book an appointment first.</div>';
      return;
    }
    const q = await api("/patient/queue/" + a.id);
    c.innerHTML = `<div class="section-title">Live Queue</div>${renderSineWaveQueueHTML(q, a)}${a.status === "booked" ? `<button class="primary-btn mt-3" style="max-width:250px" onclick="checkIn(${a.id})">Check In</button>` : ""}`;
  } else {
    c.innerHTML = `<div class="panel empty">${esc(active)} is ready for the next module.</div>`;
  }
}
async function renderBooking(c, departmentId = null) {
  const docs = await api(`/patient/doctors${departmentId ? `?department_id=${departmentId}` : ""}`);
  c.innerHTML = `<div class="section-title">Find a Doctor</div><div class="doctor-grid">${docs.map((d) => {
    const initial = esc((d.name || "").replace(/^Dr\.\s*/i, "").trim()[0] || "D");
    return `<div class="doctor-card"><div class="doctor-head"><div class="doc-avatar">${initial}</div><div><h3>${esc(d.name)}</h3><p>${esc(d.specialization)}</p><p>${esc(d.department)} · ${esc(d.hospital)}</p></div></div><div class="d-flex justify-content-between mt-3"><small>Consultation</small><b>₹${d.fee}</b></div><button class="book" onclick="chooseDoctor(${d.id},'${esc(d.name)}')">View Availability</button></div>`;
  }).join("")}</div>`;
}
async function renderHospitals(c) {
  c.innerHTML = '<div class="section-title">Hospitals Near You</div><div class="panel empty">Finding hospitals near your location...</div>';
  const hospitals = await api("/patient/hospitals");
  c.innerHTML = `<div class="section-title">Hospitals Near You</div><div class="hospital-toolbar"><div><h2>Find trusted care nearby</h2><p>Browse departments and doctors connected to the Querly catalog.</p></div></div><div class="hospital-grid">${hospitals.map((hospital) => { const doctorCount = hospital.departments.reduce((count, department) => count + department.doctors.length, 0); return `<article class="hospital-card"><div class="hospital-icon"><i class="bi bi-hospital"></i></div><div class="hospital-card-body"><div class="hospital-card-heading"><h3>${esc(hospital.name)}</h3><span class="hospital-rating">${esc(hospital.city)}</span></div><p class="hospital-address"><i class="bi bi-geo-alt"></i> ${esc(hospital.address)}</p><div class="hospital-meta"><span><i class="bi bi-people"></i> ${doctorCount} doctors</span><span>${hospital.departments.length} departments</span></div><div class="hospital-departments">${hospital.departments.map((department) => `<button class="btn btn-sm btn-outline-primary" onclick="goToDepartment(${department.id})">${esc(department.name)} (${department.doctors.length})</button>`).join("")}</div><a class="hospital-directions" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + " " + hospital.address)}" target="_blank" rel="noopener"><i class="bi bi-arrow-up-right"></i> Get directions</a><small>${esc(hospital.phone || "")} · ${esc(hospital.email || "")}</small></div></article>`; }).join("")}</div>`;
}
function goToDepartment(departmentId) {
  active = "doctors";
  renderNav();
  renderBooking($("#content"), departmentId);
}
async function chooseDoctor(id, name) {
  const dateStr = getLocalDateStr();
  const slots = await api(
    `/patient/slots?doctor_id=${id}&selected_date=${dateStr}`,
  );
  showModal(
    `<button class="close" onclick="closeModal()">×</button><h3>Book with ${esc(name)}</h3><p class="text-muted small">Today · Tell the doctor briefly what you are experiencing</p><label class="small fw-bold" for="symptoms">Symptoms</label><textarea id="symptoms" class="form-control my-2" maxlength="2000" rows="3" placeholder="Example: headache and mild fever since yesterday"></textarea><div class="slot-list">${slots.map((s) => `<button class="slot ${s.available ? "" : "disabled"}" ${s.available ? "" : "disabled"} onclick="book(${id},${s.id})">${s.start_time} · ${s.booked_count}/${s.max_patients}</button>`).join("") || '<div class="empty">No slots available today.</div>'}</div>`,
  );
}
async function book(doctorId, slotId) {
  try {
    const r = await api("/patient/appointments", {
      method: "POST",
      body: JSON.stringify({ doctor_id: doctorId, slot_id: slotId, symptoms: $("#symptoms")?.value.trim() || null }),
    });
    closeModal();
    toast(`Appointment booked. Token ${r.token}`);
    active = "appointments";
    renderNav();
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function checkIn(id) {
  try {
    const r = await api("/patient/check-in", {
      method: "POST",
      body: JSON.stringify({ appointment_id: id }),
    });
    toast(`Checked in. Token ${r.token}`);
    active = "queue";
    renderNav();
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function openSlip(id) {
  const d = await api("/patient/eslip/" + id);
  showModal(
    `<button class="close" onclick="closeModal()">×</button><div class="eslip"><div class="d-flex justify-content-between"><div><span class="eyebrow">QUERLY E-SLIP</span><h3>${esc(d.token)}</h3><p>${esc(d.patient)} · ${esc(d.doctor)}</p></div><img class="qr" src="${d.qr}" alt="QR code"></div><hr><div class="row g-3 small"><div class="col-6"><b>Hospital</b><br>${esc(d.hospital)}</div><div class="col-6"><b>OPD</b><br>${esc(d.department)}</div><div class="col-6"><b>Date</b><br>${d.date}</div><div class="col-6"><b>Time</b><br>${d.time}</div><div class="col-6"><b>Consultation Fee</b><br>₹${d.fee}</div><div class="col-6"><b>Status</b><br>${d.status}</div></div><button class="primary-btn" onclick="downloadSlip(${id})">Download PDF E-Slip</button></div>`,
  );
}
async function downloadSlip(id) {
  const r = await fetch(API_BASE + `/slips/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    toast("Could not download E-Slip");
    return;
  }
  const blob = await r.blob(),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `querly-eslip-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
async function doctorPage(c) {
  if (active === "dashboard") {
    const d = await api("/doctor/dashboard");
    const isAvail = d.doctor.is_available;
    c.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3 p-3 rounded shadow-sm" style="background:var(--panel-bg,#ffffff); border:1px solid var(--border-color,#e2e8f0);">
        <div>
          <h4 class="m-0 text-teal"><i class="bi bi-person-badge me-2"></i>Dr. ${esc(d.doctor.name)}</h4>
          <small class="text-muted">${esc(d.doctor.specialization)} · Status: 
            <b class="${isAvail ? 'text-success' : 'text-danger'}">
              ${isAvail ? '🟢 Free / Available' : '🔴 Busy / Unavailable'}
            </b>
          </small>
        </div>
        <button class="btn btn-sm ${isAvail ? 'btn-outline-danger' : 'btn-success'}" onclick="toggleDoctorAvailability(${!isAvail})">
          <i class="bi bi-${isAvail ? 'dash-circle' : 'check-circle'} me-1"></i>
          ${isAvail ? 'Mark as Busy' : 'Mark as Free / Available'}
        </button>
      </div>

      <div class="section-title">Today's Overview</div>
      <div class="stats">
        <div class="stat-card"><span>Booked</span><strong>${d.stats.booked}</strong></div>
        <div class="stat-card"><span>Checked In / Ongoing</span><strong>${d.stats.checked_in}</strong></div>
        <div class="stat-card"><span>Completed</span><strong>${d.stats.completed}</strong></div>
        <div class="stat-card"><span>Waiting</span><strong>${d.stats.waiting}</strong></div>
      </div>

      <div class="section-title">Today's Patient Queue & Appointments</div>
      <div class="panel">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="fw-bold"><i class="bi bi-people-fill text-teal me-1"></i> Patients</span>
          <button class="btn btn-sm btn-teal" onclick="nextPatient()"><i class="bi bi-person-plus-fill me-1"></i> Call Next Patient</button>
        </div>
        ${queueTable(d.queue.length ? d.queue : d.today_appointments, true)}
      </div>
    `;
  } else if (active === "queue") {
    const d = await api("/doctor/dashboard");
    c.innerHTML = `<div class="section-title">Live OPD Queue</div><div class="panel">${queueTable(d.queue, true)}</div>`;
  } else if (active === "appointments") {
    const a = await api("/doctor/appointments");
    c.innerHTML = `<div class="section-title">All Doctor Appointments</div><div class="panel">${queueTable(a, false)}</div>`;
  } else if (active === "slots") {
    c.innerHTML = `<div class="section-title">Manage Slots</div><div class="panel"><div class="row g-3"><div class="col-md-4"><label class="small fw-bold">Date</label><input id="slotDate" class="form-control" type="date" value="${getLocalDateStr()}"></div><div class="col-md-3"><label class="small fw-bold">Start</label><input id="slotStart" class="form-control" type="time" value="10:00"></div><div class="col-md-3"><label class="small fw-bold">End</label><input id="slotEnd" class="form-control" type="time" value="10:30"></div><div class="col-md-2"><label class="small fw-bold">Capacity</label><input id="slotCap" class="form-control" type="number" value="10"></div></div><button class="primary-btn mt-3" style="width:auto" onclick="addSlot()">Create Slot</button></div>`;
  } else {
    c.innerHTML = '<div class="panel empty">Profile management module.</div>';
  }
}

function queueTable(rows, isQueue) {
  if (!rows || !rows.length) return '<div class="empty">No active patient appointments found.</div>';
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Token</th>
          <th>Patient Name</th>
          <th>Phone</th>
          <th>Symptoms</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((r) => {
          const status = r.status || "booked";
          const isOngoing = status === "called" || status === "ongoing";
          const isDone = status === "completed";
          const targetId = r.id || r.queue_id || r.appointment_id;
          return `
            <tr>
              <td><b class="token-pill">${esc(r.token || r.token_no || "—")}</b></td>
              <td><b>${esc(r.patient_name || "Patient")}</b></td>
              <td>${esc(r.patient_phone || "—")}</td>
              <td><small>${esc(r.symptoms || "Routine Consultation")}</small></td>
              <td>
                <span class="pill ${isOngoing ? "purple" : isDone ? "green" : "orange"}">
                  ${esc(status.replace("_", " "))}
                </span>
              </td>
              <td class="appointment-actions">
                ${!isDone && !isOngoing ? `
                  <button class="btn btn-sm btn-teal" onclick="markDoctorOngoing(${targetId})">
                    <i class="bi bi-play-circle me-1"></i> Mark Ongoing
                  </button>
                ` : ''}
                ${isOngoing ? `
                  <button class="btn btn-sm btn-success" onclick="completePatient(${targetId})">
                    <i class="bi bi-check-circle me-1"></i> Complete
                  </button>
                ` : ''}
                ${isDone ? `
                  <span class="text-success small fw-bold"><i class="bi bi-check-all me-1"></i> Completed</span>
                ` : ''}
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

async function toggleDoctorAvailability(status) {
  try {
    const r = await api(`/doctor/availability?is_available=${status}`, { method: "POST" });
    toast(r.message);
    render();
  } catch (e) {
    toast(e.message);
  }
}
window.toggleDoctorAvailability = toggleDoctorAvailability;

async function markDoctorOngoing(id) {
  try {
    const r = await api(`/doctor/queue/${id}/ongoing`, { method: "POST" });
    toast(r.message || "Patient marked as ONGOING");
    render();
  } catch (e) {
    toast(e.message);
  }
}
window.markDoctorOngoing = markDoctorOngoing;
async function nextPatient() {
  try {
    const r = await api("/doctor/queue/next", { method: "POST" });
    toast(`Now serving ${r.token}`);
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function completePatient(id) {
  showModal(
    `<button class="close" onclick="closeModal()">×</button><h3>Complete Consultation</h3><textarea id="notes" class="form-control my-2" placeholder="Consultation notes"></textarea><textarea id="diagnosis" class="form-control my-2" placeholder="Diagnosis"></textarea><textarea id="prescription" class="form-control my-2" placeholder="Prescription"></textarea><button class="primary-btn" onclick="finishConsult(${id})">Complete Consultation</button>`,
  );
}
async function finishConsult(id) {
  try {
    await api("/doctor/queue/" + id + "/complete", {
      method: "POST",
      body: JSON.stringify({
        notes: $("#notes").value,
        diagnosis: $("#diagnosis").value,
        prescription: $("#prescription").value,
      }),
    });
    closeModal();
    toast("Consultation completed");
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function addSlot() {
  try {
    await api("/doctor/slots", {
      method: "POST",
      body: JSON.stringify({
        date: $("#slotDate").value,
        start_time: $("#slotStart").value,
        end_time: $("#slotEnd").value,
        max_patients: Number($("#slotCap").value),
      }),
    });
    toast("Slot created");
  } catch (e) {
    toast(e.message);
  }
}
async function adminPage(c) {
  if (active === "dashboard" || active === "analytics") {
    const d = await api("/admin/dashboard");
    c.innerHTML = `<div class="hero"><h1>Hospital Analytics</h1><p>OPD reports, queue performance and operational insights.</p></div><div class="section-title">Today's Overview</div><div class="stats"><div class="stat-card"><span>Today's Patients</span><strong>${d.kpis.patients_today}</strong><div class="trend">Live OPD count</div></div><div class="stat-card"><span>Completed</span><strong>${d.kpis.completed}</strong><div class="trend">Consultations</div></div><div class="stat-card"><span>Waiting</span><strong>${d.kpis.waiting}</strong><div class="trend">Current queue</div></div><div class="stat-card"><span>No-show Rate</span><strong>${d.kpis.no_show_rate}%</strong><div class="trend">Operational metric</div></div></div><div class="section-title">Model Snapshot</div><div class="panel"><div class="stats"><div class="stat-card" style="box-shadow:none"><span>Waiting-time model</span><strong>Random Forest</strong><div class="trend">Queue size · hour · consultation duration · doctors</div></div><div class="stat-card" style="box-shadow:none"><span>No-show model</span><strong>Random Forest</strong><div class="trend">Lead time · history · cancellations</div></div></div></div>`;
  } else if (active === "doctors") {
    const ds = await api("/admin/doctors");
    c.innerHTML = `<div class="section-title">Manage Doctors</div><div class="panel">${queueTable(ds, false)}</div>`;
  } else
    c.innerHTML =
      '<div class="panel empty">Administrative management screen.</div>';
}
const SEX_LABELS = {
  female: "Female",
  male: "Male",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const PHONE_RE = /^[0-9+\-\s]{7,15}$/;
async function openProfileModal(mode = "edit") {
  let p = {};
  try {
    p = await api("/patient/profile");
  } catch (e) {
    p = {};
  }
  showModal(profileModalHTML(mode, p));
}
function profileModalHTML(mode, p) {
  if (mode === "view") return profileViewHTML(p);
  const title =
    mode === "onboarding" ? "Complete Your Profile" : "Edit Profile";
  const sub =
    mode === "onboarding"
      ? "Help us keep your Querly profile up to date."
      : "Update your personal and contact information.";
  const closeBtn =
    mode === "onboarding"
      ? ""
      : `<button class="close" onclick="closeModal()">&times;</button>`;
  return `${closeBtn}<h3>${title}</h3><p class="text-muted small">${sub}</p><div class="section-title" style="margin:18px 0 10px">Personal Information</div><div class="row g-3"><div class="col-md-6"><label class="small fw-bold">Full Name</label><input id="pfName" class="form-control" value="${esc(p.full_name || currentUser.name || "")}" required></div><div class="col-md-6"><label class="small fw-bold">Date of Birth</label><input id="pfDob" type="date" class="form-control" max="${new Date().toISOString().slice(0, 10)}" value="${esc(p.date_of_birth || "")}" required></div><div class="col-md-6"><label class="small fw-bold">Sex</label><select id="pfSex" class="form-control" required><option value="">Select</option>${Object.entries(SEX_LABELS).map(([v, l]) => `<option value="${v}" ${p.sex === v ? "selected" : ""}>${l}</option>`).join("")}</select></div><div class="col-md-6"><label class="small fw-bold">Blood Group</label><select id="pfBlood" class="form-control"><option value="">Unknown / Not specified</option>${BLOOD_GROUPS.map((v) => `<option value="${v}" ${p.blood_group === v ? "selected" : ""}>${v}</option>`).join("")}</select></div></div><div class="section-title" style="margin:18px 0 10px">Contact Information</div><div class="row g-3"><div class="col-12"><label class="small fw-bold">Phone Number</label><input id="pfPhone" class="form-control" value="${esc(p.phone || currentUser.phone || "")}" required></div><div class="col-12"><label class="small fw-bold">Address</label><input id="pfAddress" class="form-control" value="${esc(p.address || "")}"></div><div class="col-md-6"><label class="small fw-bold">City</label><input id="pfCity" class="form-control" value="${esc(p.city || "")}"></div></div><div class="section-title" style="margin:18px 0 10px">Emergency Contact</div><div class="row g-3"><div class="col-md-6"><label class="small fw-bold">Name</label><input id="pfEmName" class="form-control" value="${esc(p.emergency_contact_name || "")}"></div><div class="col-md-6"><label class="small fw-bold">Phone</label><input id="pfEmPhone" class="form-control" value="${esc(p.emergency_contact_phone || "")}"></div></div><button class="primary-btn mt-3" onclick="saveProfile('${mode}')">${mode === "onboarding" ? "Save &amp; Continue" : "Save Changes"}</button>`;
}
function profileViewHTML(p) {
  const field = (label, value, wide) =>
    `<div class="${wide ? "col-12" : "col-md-6"}"><label class="small fw-bold">${label}</label><div class="form-control profile-view-field" style="background:#f4f5f9;color:#3a3a4d;cursor:default;">${esc(value || "—")}</div></div>`;
  return `<button class="close" onclick="closeModal()">&times;</button><h3>My Profile</h3><p class="text-muted small">Your saved personal and contact information.</p><div class="section-title" style="margin:18px 0 10px">Personal Information</div><div class="row g-3">${field("Full Name", p.full_name || currentUser.name)}${field("Date of Birth", p.date_of_birth)}${field("Sex", SEX_LABELS[p.sex] || p.sex)}${field("Blood Group", p.blood_group)}</div><div class="section-title" style="margin:18px 0 10px">Contact Information</div><div class="row g-3">${field("Phone Number", p.phone || currentUser.phone, true)}${field("Address", p.address, true)}${field("City", p.city)}</div><div class="section-title" style="margin:18px 0 10px">Emergency Contact</div><div class="row g-3">${field("Name", p.emergency_contact_name)}${field("Phone", p.emergency_contact_phone)}</div><button class="primary-btn mt-3" onclick="closeModal(); openProfileModal('edit')">Edit Profile</button>`;
}
async function saveProfile(mode) {
  const name = $("#pfName").value.trim();
  const dob = $("#pfDob").value;
  const sex = $("#pfSex").value;
  const phone = $("#pfPhone").value.trim();
  const emPhone = $("#pfEmPhone").value.trim();
  if (!name) return toast("Full name is required");
  if (!dob) return toast("Date of birth is required");
  if (new Date(dob) > new Date())
    return toast("Date of birth cannot be in the future");
  if (!sex) return toast("Please select your sex");
  if (!PHONE_RE.test(phone)) return toast("Enter a valid phone number");
  if (emPhone && !PHONE_RE.test(emPhone))
    return toast("Enter a valid emergency contact phone");
  const payload = {
    full_name: name,
    date_of_birth: dob,
    sex,
    blood_group: $("#pfBlood").value || null,
    phone,
    address: $("#pfAddress").value.trim() || null,
    city: $("#pfCity").value.trim() || null,
    emergency_contact_name: $("#pfEmName").value.trim() || null,
    emergency_contact_phone: emPhone || null,
  };
  try {
    await api("/patient/profile", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (currentUser.name !== name || currentUser.phone !== phone) {
      currentUser.name = name;
      currentUser.phone = phone;
      localStorage.setItem("mq_user", JSON.stringify(currentUser));
      $("#userName").textContent = name;
      $("#avatar").textContent = name[0].toUpperCase();
    }
    closeModal();
    toast(mode === "onboarding" ? "Profile completed" : "Profile updated");
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function openDoctorProfileModal(mode = "edit") {
  let p = {};
  let hospitals = [];
  try {
    p = await api("/doctor/profile");
  } catch (e) {
    p = {};
  }
  try {
    hospitals = await api("/patient/hospitals");
  } catch (e) {
    hospitals = [];
  }
  showModal(doctorProfileModalHTML(mode, p, hospitals));
}

function doctorProfileModalHTML(mode, p, hospitals) {
  if (mode === "view") return doctorProfileViewHTML(p);
  const title = mode === "onboarding" ? "Complete Your Doctor Profile" : "Edit Doctor Profile";
  const sub = mode === "onboarding"
    ? "Welcome to Querly! Please specify your practice details, hospital, department, and consultation fee."
    : "Update your medical practice information shown to patients.";
  const closeBtn = mode === "onboarding" ? "" : `<button class="close" onclick="closeModal()">&times;</button>`;

  const defaultDepts = [
    { id: 1, name: "General Medicine" },
    { id: 2, name: "Cardiology" },
    { id: 3, name: "Orthopedics" },
    { id: 4, name: "Pediatrics" },
    { id: 5, name: "Neurology" },
    { id: 6, name: "Dermatology" },
    { id: 7, name: "ENT" },
    { id: 8, name: "Gynecology" }
  ];

  let deptOptions = [];
  if (hospitals && hospitals.length) {
    hospitals.forEach(h => {
      if (h.departments) {
        h.departments.forEach(d => {
          deptOptions.push({ id: d.id, name: `${d.name} (${h.name})` });
        });
      }
    });
  }
  if (!deptOptions.length) deptOptions = defaultDepts;

  return `
    ${closeBtn}
    <h3><i class="bi bi-person-badge-fill text-teal me-2"></i>${title}</h3>
    <p class="text-muted small">${sub}</p>
    
    <div class="section-title" style="margin:18px 0 10px">Doctor Information</div>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="small fw-bold">Full Name</label>
        <input id="docPfName" class="form-control" value="${esc(p.name || currentUser.name || "")}" required>
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Phone Number</label>
        <input id="docPfPhone" class="form-control" value="${esc(p.phone || currentUser.phone || "")}" placeholder="+91 9876543210" required>
      </div>
    </div>

    <div class="section-title" style="margin:18px 0 10px">Hospital &amp; Department</div>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="small fw-bold">Affiliated Hospital</label>
        <select id="docPfHospital" class="form-control" required>
          ${hospitals && hospitals.length ? hospitals.map(h => `<option value="${h.id}" ${p.hospital_id === h.id ? 'selected' : ''}>${esc(h.name)} - ${esc(h.city)}</option>`).join("") : '<option value="1">City Care Hospital - Metro</option>'}
        </select>
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Department</label>
        <select id="docPfDept" class="form-control" required>
          ${deptOptions.map(d => `<option value="${d.id}" ${p.department_id === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join("")}
        </select>
      </div>
    </div>

    <div class="section-title" style="margin:18px 0 10px">Practice &amp; Fee Details</div>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="small fw-bold">Specialization</label>
        <input id="docPfSpec" class="form-control" value="${esc(p.specialization || "General Medicine")}" placeholder="e.g. Cardiology, Neurology, Pediatrics" required>
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Consultation Fee (₹)</label>
        <input id="docPfFee" type="number" class="form-control" value="${p.consultation_fee || 500}" min="0" required>
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Qualifications / Degrees</label>
        <input id="docPfQual" class="form-control" value="${esc(p.qualification || "MBBS, MD")}" placeholder="e.g. MBBS, MD - General Medicine">
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Years of Experience</label>
        <input id="docPfExp" type="number" class="form-control" value="${p.experience_years || 5}" min="0" max="70">
      </div>
      <div class="col-12">
        <label class="small fw-bold">Bio / Practice Summary</label>
        <textarea id="docPfBio" class="form-control" rows="2" placeholder="Brief description of clinical expertise, consultation hours, etc.">${esc(p.bio || "")}</textarea>
      </div>
    </div>

    <button class="primary-btn mt-3" onclick="saveDoctorProfile('${mode}')">${mode === "onboarding" ? "Save &amp; Open Dashboard" : "Save Changes"}</button>
  `;
}

function doctorProfileViewHTML(p) {
  const field = (label, value, wide) =>
    `<div class="${wide ? "col-12" : "col-md-6"}"><label class="small fw-bold">${label}</label><div class="form-control profile-view-field" style="background:#f4f5f9;color:#3a3a4d;cursor:default;">${esc(value || "—")}</div></div>`;
  return `
    <button class="close" onclick="closeModal()">&times;</button>
    <h3><i class="bi bi-person-badge-fill text-teal me-2"></i>Doctor Profile</h3>
    <p class="text-muted small">Your medical practice and affiliation details.</p>
    <div class="section-title" style="margin:18px 0 10px">Doctor Information</div>
    <div class="row g-3">
      ${field("Full Name", p.name || currentUser.name)}
      ${field("Phone Number", p.phone || currentUser.phone)}
    </div>
    <div class="section-title" style="margin:18px 0 10px">Hospital &amp; Department</div>
    <div class="row g-3">
      ${field("Hospital", p.hospital_name)}
      ${field("Department", p.department_name)}
    </div>
    <div class="section-title" style="margin:18px 0 10px">Practice Details</div>
    <div class="row g-3">
      ${field("Specialization", p.specialization)}
      ${field("Consultation Fee", "₹" + (p.consultation_fee || 500))}
      ${field("Qualifications", p.qualification)}
      ${field("Experience", (p.experience_years || 5) + " Years")}
      ${field("Bio Summary", p.bio, true)}
    </div>
    <button class="primary-btn mt-3" onclick="closeModal(); openDoctorProfileModal('edit')">Edit Profile</button>
  `;
}

async function saveDoctorProfile(mode) {
  const name = $("#docPfName").value.trim();
  const phone = $("#docPfPhone").value.trim();
  const hospId = parseInt($("#docPfHospital").value, 10);
  const deptId = parseInt($("#docPfDept").value, 10);
  const spec = $("#docPfSpec").value.trim();
  const fee = parseFloat($("#docPfFee").value);

  if (!name) return toast("Full name is required");
  if (!phone) return toast("Phone number is required");
  if (!spec) return toast("Specialization is required");
  if (isNaN(fee) || fee < 0) return toast("Enter a valid consultation fee");

  const payload = {
    name,
    phone,
    hospital_id: hospId || 1,
    department_id: deptId || 1,
    specialization: spec,
    consultation_fee: fee,
    qualification: $("#docPfQual").value.trim() || null,
    experience_years: parseInt($("#docPfExp").value, 10) || 5,
    bio: $("#docPfBio").value.trim() || null,
  };

  try {
    await api("/doctor/profile", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    currentUser.name = name;
    currentUser.phone = phone;
    localStorage.setItem("mq_user", JSON.stringify(currentUser));
    $("#userName").textContent = name;
    $("#avatar").textContent = name[0].toUpperCase();

    closeModal();
    toast(mode === "onboarding" ? "Welcome Doctor! Profile completed." : "Doctor Profile updated.");
    active = "dashboard";
    render();
  } catch (e) {
    toast(e.message);
  }
}
window.openDoctorProfileModal = openDoctorProfileModal;
window.saveDoctorProfile = saveDoctorProfile;

function toggleUserMenu(e) {
  e.stopPropagation();
  const existing = document.getElementById("userMenu");
  if (existing) {
    existing.remove();
    return;
  }
  const menu = document.createElement("div");
  menu.id = "userMenu";
  menu.className = "user-menu";
  const openProfFn = currentUser.role === "doctor" ? "openDoctorProfileModal('view')" : "openProfileModal('view')";
  menu.innerHTML = `<div class="user-menu-head"><div class="avatar">${esc(currentUser.name[0].toUpperCase())}</div><div><b>${esc(currentUser.name)}</b><small>${esc(currentUser.role[0].toUpperCase() + currentUser.role.slice(1))}</small></div></div><div class="user-menu-divider"></div><button class="user-menu-item" onclick="closeUserMenuAnd(function(){${openProfFn}})"><i class="bi bi-person"></i> My Profile</button><div class="user-menu-divider"></div><button class="user-menu-item danger" onclick="doLogout()"><i class="bi bi-box-arrow-left"></i> Logout</button>`;
  $(".profile").appendChild(menu);
  document.addEventListener("click", closeUserMenuOnce, { once: true });
}
function closeUserMenuOnce() {
  document.getElementById("userMenu")?.remove();
}
function closeUserMenuAnd(fn) {
  document.getElementById("userMenu")?.remove();
  fn();
}
function doLogout() {
  localStorage.clear();
  location.reload();
}
function showModal(html) {
  let x = document.createElement("div");
  x.id = "modal";
  x.className = "modal-backdrop-custom";
  x.innerHTML = `<div class="modal-box">${html}</div>`;
  document.body.appendChild(x);
}
function closeModal() {
  $("#modal")?.remove();
}
function go(p) {
  active = p;
  renderNav();
  render();
}
window.go = go;
window.goToDepartment = goToDepartment;
window.chooseDoctor = chooseDoctor;
window.book = book;
window.checkIn = checkIn;
window.openAppointmentDetails = openAppointmentDetails;
window.openSlip = openSlip;
window.downloadSlip = downloadSlip;
window.openReport = openReport;
window.downloadReport = downloadReport;
window.nextPatient = nextPatient;
window.completePatient = completePatient;
window.finishConsult = finishConsult;
window.addSlot = addSlot;
window.closeModal = closeModal;
window.openProfileModal = openProfileModal;
async function cancelAppointment(id, status) {
  const nonRemovable = ["checked_in", "called", "ongoing", "in_consultation", "serving", "completed"];
  if (nonRemovable.includes(status)) {
    return toast("Ongoing and completed appointments cannot be removed.");
  }
  if (!confirm("Are you sure you want to remove this appointment?")) return;
  try {
    const r = await api(`/patient/appointments/${id}`, { method: "DELETE" });
    toast(r.message || "Appointment removed successfully");
    closeModal();
    renderNav();
    render();
  } catch (e) {
    toast(e.message);
  }
}
window.cancelAppointment = cancelAppointment;
window.saveProfile = saveProfile;
window.toggleUserMenu = toggleUserMenu;
window.closeUserMenuAnd = closeUserMenuAnd;
window.doLogout = doLogout;
window.renderHospitalFilteredQueue = renderHospitalFilteredQueue;
window.markOngoing = markOngoing;
window.markCompleted = markCompleted;
window.cancelQueue = cancelQueue;
window.saveDoctorSchedule = saveDoctorSchedule;
window.toggleDoctorDay = toggleDoctorDay;
window.toggleDoctorMaster = toggleDoctorMaster;
$("#logout").onclick = () => {
  localStorage.clear();
  location.reload();
};
$(".profile").onclick = toggleUserMenu;
document.querySelectorAll(".tabs button").forEach(
  (b) =>
  (b.onclick = () => {
    document
      .querySelectorAll(".tabs button")
      .forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    $("#loginForm").classList.toggle("hidden", b.dataset.auth !== "login");
    $("#registerForm").classList.toggle(
      "hidden",
      b.dataset.auth !== "register",
    );
  }),
);
$("#loginForm").onsubmit = async (e) => {
  e.preventDefault();
  try {
    const r = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: $("#loginEmail").value,
        password: $("#loginPassword").value,
      }),
    });
    token = r.access_token;
    currentUser = r.user;
    localStorage.setItem("mq_token", token);
    localStorage.setItem("mq_user", JSON.stringify(currentUser));
    showApp();
    renderNav();
    render();
  } catch (e) {
    toast(e.message);
  }
};
$("#registerForm").onsubmit = async (e) => {
  e.preventDefault();
  try {
    const selectedRole = $("#regRole")?.value || selectedAuthRole || "patient";
    const r = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: $("#regName").value,
        email: $("#regEmail").value,
        phone: $("#regPhone").value,
        role: selectedRole,
        password: $("#regPassword").value,
      }),
    });
    token = r.access_token;
    currentUser = r.user;
    localStorage.setItem("mq_token", token);
    localStorage.setItem("mq_user", JSON.stringify(currentUser));
    showApp();
    renderNav();
    render();
    if (currentUser.role === "patient") openProfileModal("onboarding");
    else if (currentUser.role === "doctor") openDoctorProfileModal("onboarding");
  } catch (e) {
    toast(e.message);
  }
};
window.cachedHospitalDoctors = [];

async function hospitalPage(c) {
  if (active === "dashboard" || active === "queue" || active === "hospital_desk") {
    const overview = await api("/hospital/overview");
    const queue = await api("/hospital/queue");
    const doctors = await api("/hospital/doctors");
    window.cachedHospitalDoctors = doctors;

    c.innerHTML = `
      <div class="hero">
        <h1><i class="bi bi-hospital"></i> Hospital Management & OPD Console</h1>
        <p>Manage live OPD patient queues, record ongoing and completed consultation timestamps, and control doctor weekly availability.</p>
      </div>

      <div class="stats mb-4">
        <div class="stat-card">
          <span>Patients Waiting</span>
          <strong style="color:var(--orange)">${overview.queue_stats.waiting}</strong>
        </div>
        <div class="stat-card">
          <span>Ongoing Consultations</span>
          <strong style="color:var(--primary)" class="blinking-text">${overview.queue_stats.ongoing}</strong>
        </div>
        <div class="stat-card">
          <span>Completed Today</span>
          <strong style="color:var(--green)">${overview.queue_stats.completed}</strong>
        </div>
        <div class="stat-card">
          <span>Real-time Avg Consultation</span>
          <strong style="color:var(--primary-dark)">${overview.queue_stats.avg_duration_minutes} min</strong>
        </div>
      </div>

      <div class="section-title">Live OPD Patient Queue Management</div>
      <div class="panel">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="d-flex gap-2 align-items-center">
            <label class="small fw-bold me-1">Filter Doctor:</label>
            <select id="hospFilterDoctor" class="form-select form-select-sm" style="width:220px;display:inline-block" onchange="renderHospitalFilteredQueue()">
              <option value="">All Doctors</option>
              ${doctors.map(d => `<option value="${d.id}">${esc(d.name)} (${esc(d.department_name)})</option>`).join("")}
            </select>
          </div>
          <button class="primary-btn" style="width:auto;margin:0;padding:8px 16px;font-size:13px" onclick="render()"><i class="bi bi-arrow-clockwise"></i> Refresh OPD Status</button>
        </div>

        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Checked In</th>
                <th>Ongoing Start</th>
                <th>Completed Finish</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="hospQueueTbody">
              ${renderHospTableRows(queue)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (active === "doctors") {
    const doctors = await api("/hospital/doctors");
    window.cachedHospitalDoctors = doctors;

    const dayLabels = {
      monday: "Mon", tuesday: "Tue", wednesday: "Wed",
      thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun"
    };

    c.innerHTML = `
      <div class="section-title"><i class="bi bi-calendar3"></i> Doctor Availability & Weekly Working Schedule</div>
      <div class="panel">
        <p class="text-muted small mb-4">Set which days of the week each doctor is available for appointments. Changes dynamically update appointment slot availability for patients.</p>
        <div class="row g-4">
          ${doctors.map(d => {
      const sched = d.weekly_schedule || { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false };
      return `
              <div class="col-md-6">
                <div class="card p-3 shadow-sm border-0" style="border-radius:16px;background:var(--surface);border:1px solid var(--line)!important">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <h5 class="mb-0 fw-bold" style="color:var(--primary-dark)">${esc(d.name)}</h5>
                      <small class="text-muted">${esc(d.specialization)} · ${esc(d.department_name)}</small>
                    </div>
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" id="avail_${d.id}" ${d.is_available ? 'checked' : ''} onchange="toggleDoctorMaster(${d.id})">
                      <label class="form-check-label fw-bold small ms-1" for="avail_${d.id}">${d.is_available ? '<span class="text-success">Available</span>' : '<span class="text-danger">Off-Duty</span>'}</label>
                    </div>
                  </div>
                  <div class="mb-3 p-2 rounded" style="background:var(--surface-soft);font-size:12px">
                    <span class="text-muted">Avg OPD Consultation Duration:</span> <b style="color:var(--primary-dark)">${d.avg_consultation_time_min} mins/patient</b>
                  </div>
                  <label class="small fw-bold mb-2">Working Days Schedule</label>
                  <div class="d-flex flex-wrap gap-1 mb-3">
                    ${Object.keys(dayLabels).map(day => `
                      <button class="btn btn-sm ${sched[day] ? 'btn-teal' : 'btn-outline-secondary'}" style="font-size:12px;padding:4px 10px;border-radius:8px" onclick="toggleDoctorDay(${d.id}, '${day}')">
                        ${dayLabels[day]} ${sched[day] ? '✓' : '✗'}
                      </button>
                    `).join("")}
                  </div>
                  <button class="primary-btn mt-2" style="padding:10px 16px;font-size:13px;width:100%" onclick="saveDoctorSchedule(${d.id})">Save Schedule & Availability</button>
                </div>
              </div>
            `;
    }).join("")}
        </div>
      </div>
    `;
  } else if (active === "timelogs") {
    const logs = await api("/hospital/logs");
    c.innerHTML = `
      <div class="section-title"><i class="bi bi-stopwatch"></i> Patient Consultation Timestamps & Duration Logs</div>
      <div class="panel">
        <p class="text-muted small mb-3">Exact check-in, ongoing consultation start times, and completed finish times recorded by hospital desk staff.</p>
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Check-In Time</th>
                <th>Ongoing Start Time</th>
                <th>Completed Finish Time</th>
                <th>Wait Time</th>
                <th>Consultation Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td><b class="token-pill">${esc(l.token_no)}</b></td>
                  <td><b>${esc(l.patient_name)}</b></td>
                  <td>${esc(l.doctor_name)}</td>
                  <td><small>${l.checked_in_time}</small></td>
                  <td><small class="fw-bold" style="color:var(--primary)">${l.ongoing_start_time}</small></td>
                  <td><small class="text-success">${l.completed_end_time}</small></td>
                  <td><span class="badge bg-light text-dark">${l.total_wait_minutes !== "—" ? l.total_wait_minutes + " mins" : "—"}</span></td>
                  <td><b style="color:var(--primary-dark)">${l.consultation_duration_minutes !== "—" ? l.consultation_duration_minutes + " mins" : "—"}</b></td>
                  <td><span class="pill ${l.status === 'completed' ? 'green' : (l.status === 'called' ? 'green blinking' : 'orange')}">${l.status.toUpperCase()}</span></td>
                </tr>
              `).join("") || '<tr><td colspan="9" class="text-center text-muted py-4">No timestamp records found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

function renderHospTableRows(queue) {
  return queue.map(q => {
    const isOngoing = q.status === "called";
    const isCompleted = q.status === "completed";
    const isWaiting = q.status === "waiting";

    let durText = "—";
    if (q.duration_seconds) {
      const m = Math.floor(q.duration_seconds / 60);
      const s = q.duration_seconds % 60;
      durText = `${m}m ${s}s`;
    } else if (q.elapsed_ongoing_seconds) {
      const m = Math.floor(q.elapsed_ongoing_seconds / 60);
      durText = `${m}m ongoing`;
    }

    return `
      <tr class="${isOngoing ? 'table-active-row' : ''}">
        <td><b class="token-pill">${esc(q.token_no)}</b></td>
        <td>
          <div><b>${esc(q.patient_name)}</b></div>
          <small class="text-muted">${esc(q.symptoms || "No symptoms specified")}</small>
        </td>
        <td>${esc(q.doctor_name)} <br><small class="text-muted">${esc(q.department_name)}</small></td>
        <td><small>${q.checked_in_time || '—'}</small></td>
        <td><small class="${isOngoing ? 'fw-bold text-teal' : ''}">${q.called_time || '—'}</small></td>
        <td><small>${q.completed_time || '—'}</small></td>
        <td><span class="badge bg-light text-dark">${durText}</span></td>
        <td>
          ${isOngoing ? '<span class="pill green blinking"><i class="bi bi-broadcast"></i> ONGOING</span>' :
        isCompleted ? '<span class="pill green">COMPLETED</span>' :
          '<span class="pill orange">WAITING</span>'}
        </td>
        <td>
          <div class="d-flex gap-1">
            ${isWaiting ? `<button class="btn btn-sm btn-teal" style="font-size:11px;padding:4px 8px" onclick="markOngoing(${q.queue_id})"><i class="bi bi-play-fill"></i> Mark Ongoing</button>` : ''}
            ${isOngoing ? `<button class="btn btn-sm btn-success" style="font-size:11px;padding:4px 8px" onclick="markCompleted(${q.queue_id})"><i class="bi bi-check-circle-fill"></i> Mark Complete</button>` : ''}
            ${!isCompleted ? `<button class="btn btn-sm btn-outline-danger" style="font-size:11px;padding:4px 6px" onclick="cancelQueue(${q.queue_id})"><i class="bi bi-x-lg"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join("") || '<tr><td colspan="9" class="text-center py-4 text-muted">No patient tickets currently in queue.</td></tr>';
}

async function renderHospitalFilteredQueue() {
  const docId = $("#hospFilterDoctor")?.value;
  const path = docId ? `/hospital/queue?doctor_id=${docId}` : "/hospital/queue";
  const queue = await api(path);
  const tbody = $("#hospQueueTbody");
  if (tbody) tbody.innerHTML = renderHospTableRows(queue);
}

async function markOngoing(queueId) {
  try {
    const res = await api(`/hospital/queue/${queueId}/ongoing`, { method: "POST" });
    toast(`Ticket ${res.token_no} marked ONGOING at ${res.called_time.slice(11, 19)}`);
    render();
  } catch (e) {
    toast(e.message);
  }
}

async function markCompleted(queueId) {
  try {
    const res = await api(`/hospital/queue/${queueId}/complete`, { method: "POST" });
    toast(`Ticket ${res.token_no} marked COMPLETED (Duration: ${res.duration_minutes} mins)`);
    render();
  } catch (e) {
    toast(e.message);
  }
}

async function cancelQueue(queueId) {
  if (!confirm("Are you sure you want to cancel this ticket?")) return;
  try {
    await api(`/hospital/queue/${queueId}/cancel`, { method: "POST" });
    toast("Queue ticket cancelled");
    render();
  } catch (e) {
    toast(e.message);
  }
}

async function saveDoctorSchedule(doctorId) {
  const doctor = (window.cachedHospitalDoctors || []).find(d => d.id === doctorId);
  const isAvailable = $(`#avail_${doctorId}`)?.checked ?? true;
  const weekly_schedule = doctor ? doctor.weekly_schedule : {
    monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false
  };

  try {
    await api(`/hospital/doctors/${doctorId}/schedule`, {
      method: "POST",
      body: JSON.stringify({ is_available: isAvailable, weekly_schedule })
    });
    toast("Doctor schedule and day availability saved!");
    render();
  } catch (e) {
    toast(e.message);
  }
}

function toggleDoctorDay(doctorId, day) {
  const doctor = (window.cachedHospitalDoctors || []).find(d => d.id === doctorId);
  if (doctor) {
    if (!doctor.weekly_schedule) doctor.weekly_schedule = { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false };
    doctor.weekly_schedule[day] = !doctor.weekly_schedule[day];
    render();
  }
}

function toggleDoctorMaster(doctorId) {
  const doctor = (window.cachedHospitalDoctors || []).find(d => d.id === doctorId);
  if (doctor) {
    doctor.is_available = $(`#avail_${doctorId}`)?.checked ?? !doctor.is_available;
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = '<i class="bi bi-eye-slash"></i>';
  } else {
    input.type = "password";
    btn.innerHTML = '<i class="bi bi-eye"></i>';
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;

boot();
