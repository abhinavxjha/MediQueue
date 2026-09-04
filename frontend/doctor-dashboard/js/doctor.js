let activePage = "dashboard";
let currentSearchQuery = "";
let searchDebounceTimer = null;

function setActivePage(page) {
  activePage = page;
  renderNav();
  renderDoctorView();
}

function renderNav() {
  const items = [
    ["dashboard", "speedometer2", "OPD Dashboard"],
    ["appointments", "calendar-check", "Appointments Roster"],
    ["slots", "clock", "Manage Slots"],
  ];

  const nav = $("#nav");
  if (!nav) return;

  nav.innerHTML = items
    .map(
      ([id, icon, label]) => `
        <button class="nav-btn ${activePage === id ? "active" : ""}" data-page="${id}">
          <i class="bi bi-${icon}"></i>
          <span>${label}</span>
        </button>
      `
    )
    .join("");

  nav.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.onclick = () => {
      setActivePage(btn.dataset.page);
    };
  });
}

async function renderTopAppointmentsBanner() {
  const container = $("#topAppointmentsBanner");
  if (!container) return;

  try {
    const d = await api("/doctor/dashboard");
    const waitingCount = d.stats.waiting || 0;
    const bookedCount = d.stats.booked || 0;
    const nextQ = d.queue ? d.queue[0] : null;

    container.innerHTML = `
      <div class="top-app-card">
        <div class="top-app-header">
          <div class="top-app-title">
            <i class="bi bi-person-workspace"></i>
            <span>Today's OPD Patient Consultation Roster</span>
          </div>
          <span class="top-app-badge">
            <i class="bi bi-calendar-event me-1"></i> ${bookedCount} Booked Today · (${waitingCount} In Queue)
          </span>
        </div>
        <div class="top-app-body">
          <div class="top-app-details">
            <div class="top-app-item">
              <label>Next Patient Ticket</label>
              <strong>${nextQ ? `Token ${esc(nextQ.token)} (Queue #${nextQ.position})` : 'No patients currently waiting in line'}</strong>
            </div>
            <div class="top-app-item">
              <label>Queue Breakdown</label>
              <strong>${d.stats.checked_in} In-Consultation / Checked In · ${d.stats.completed} Completed</strong>
            </div>
          </div>
          <div class="top-app-actions">
            <button class="btn btn-sm btn-teal" onclick="nextPatient()">
              <i class="bi bi-telephone-outbound me-1"></i> Call Next Patient
            </button>
            <button class="btn btn-sm btn-outline-primary" onclick="setActivePage('appointments')">
              <i class="bi bi-list-task me-1"></i> All Appointments
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="setActivePage('slots')">
              <i class="bi bi-clock me-1"></i> Manage Slots
            </button>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = "";
  }
}

async function toggleDoctorAvailability(status) {
  try {
    const r = await api(`/doctor/availability?is_available=${status}`, { method: "POST" });
    toast(r.message);
    renderDoctorView();
  } catch (e) {
    toast(e.message);
  }
}

async function renderDoctorView() {
  await renderTopAppointmentsBanner();
  const c = $("#content");
  if (!c) return;

  c.innerHTML = '<div class="empty">Loading doctor OPD portal...</div>';

  try {
    if (activePage === "dashboard") {
      const d = await api("/doctor/dashboard");
      const isAvail = d.doctor.is_available;

      let patientRows = d.queue.length ? d.queue : d.today_appointments;
      if (currentSearchQuery) {
        const qLower = currentSearchQuery.toLowerCase();
        patientRows = patientRows.filter((r) =>
          (r.patient_name || "").toLowerCase().includes(qLower) ||
          (r.token || r.token_no || "").toLowerCase().includes(qLower) ||
          (r.patient_phone || "").toLowerCase().includes(qLower)
        );
      }

      c.innerHTML = `
        <div class="doctor-avail-banner">
          <div class="doctor-avail-info">
            <h4><i class="bi bi-person-badge me-2"></i>Dr. ${esc(d.doctor.name)}</h4>
            <small>
              Specialization: <b>${esc(d.doctor.specialization)}</b> · Practice Status: 
              <b class="${isAvail ? 'text-success' : 'text-danger'}">
                ${isAvail ? '🟢 Available / Accepting Patients' : '🔴 Busy / Unavailable'}
              </b>
            </small>
          </div>
          <button class="btn btn-sm ${isAvail ? 'btn-outline-danger' : 'btn-success'}" onclick="toggleDoctorAvailability(${!isAvail})">
            <i class="bi bi-${isAvail ? 'dash-circle' : 'check-circle'} me-1"></i>
            ${isAvail ? 'Set to Busy' : 'Set to Available'}
          </button>
        </div>

        <div class="section-title"><i class="bi bi-speedometer2"></i> Today's Consultation Metrics</div>
        <div class="stats">
          <div class="stat-card">
            <span>Total Booked Today</span>
            <strong>${d.stats.booked}</strong>
            <div class="trend">Patient bookings</div>
          </div>
          <div class="stat-card">
            <span>Checked In / Ongoing</span>
            <strong style="color:var(--primary)">${d.stats.checked_in}</strong>
            <div class="trend">In clinic</div>
          </div>
          <div class="stat-card">
            <span>Completed</span>
            <strong style="color:var(--green)">${d.stats.completed}</strong>
            <div class="trend">Consultations finished</div>
          </div>
          <div class="stat-card">
            <span>Waiting in Line</span>
            <strong style="color:var(--orange)">${d.stats.waiting}</strong>
            <div class="trend">Next in queue</div>
          </div>
        </div>

        <div class="doctor-queue-header">
          <div class="section-title m-0"><i class="bi bi-people-fill"></i> Today's Patient Queue & Consultations</div>
          <button class="primary-btn" style="padding:8px 16px;font-size:13px" onclick="nextPatient()">
            <i class="bi bi-telephone-outbound me-1"></i> Call Next Patient
          </button>
        </div>
        
        <div class="panel">
          ${queueTable(patientRows, true)}
        </div>
      `;
    } else if (activePage === "appointments") {
      const appointments = await api("/doctor/appointments");
      let filtered = appointments;
      if (currentSearchQuery) {
        const qLower = currentSearchQuery.toLowerCase();
        filtered = filtered.filter((r) =>
          (r.patient_name || "").toLowerCase().includes(qLower) ||
          (r.token || "").toLowerCase().includes(qLower) ||
          (r.patient_phone || "").toLowerCase().includes(qLower)
        );
      }
      c.innerHTML = `
        <div class="section-title"><i class="bi bi-calendar-check"></i> All Doctor Appointments</div>
        <div class="panel">
          ${queueTable(filtered, false)}
        </div>
      `;
    } else if (activePage === "slots") {
      await renderSlots(c);
    }
  } catch (e) {
    c.innerHTML = `
      <div class="panel empty text-center py-5">
        <i class="bi bi-exclamation-triangle text-teal display-4 mb-3 d-block"></i>
        <h4>Unable to Load Data</h4>
        <p class="text-muted small">${esc(e.message)}</p>
        <button class="primary-btn mt-2" onclick="renderDoctorView()">
          <i class="bi bi-arrow-clockwise"></i> Retry
        </button>
      </div>
    `;
  }
}

function setupSearch() {
  const searchInput = $("#globalSearch");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentSearchQuery = e.target.value.trim();
      renderDoctorView();
    }, 300);
  });
}

function initDoctorDashboard() {
  const user = requireAuth(["doctor"]);
  if (!user) return;

  $("#userName").textContent = user.name;
  $("#userRole").textContent = "Doctor";
  $("#avatar").textContent = (user.name || "D")[0].toUpperCase();

  $(".profile").onclick = (e) => toggleUserMenu(e, user, () => openDoctorProfileModal("view"));
  $("#logout").onclick = doLogout;

  setupSearch();
  renderNav();
  renderDoctorView();
}

window.setActivePage = setActivePage;
window.renderDoctorView = renderDoctorView;
window.toggleDoctorAvailability = toggleDoctorAvailability;

document.addEventListener("DOMContentLoaded", initDoctorDashboard);
