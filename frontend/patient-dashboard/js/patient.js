let activePage = "dashboard";
let selectedDepartmentId = null;
let currentSearchQuery = "";
let searchDebounceTimer = null;

function setActivePage(page, departmentId = null) {
  activePage = page;
  selectedDepartmentId = departmentId;
  renderNav();
  renderPatientView();
}

function renderNav() {
  const items = [
    ["dashboard", "grid-1x2", "Dashboard"],
    ["appointments", "calendar-check", "My Appointments"],
    ["doctors", "person-badge", "Doctors & OPD"],
    ["hospitals", "hospital", "Hospitals"],
    ["history", "clock-history", "Medical History"],
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
    const d = await api("/patient/home");
    const activeApps = d.appointments.filter((a) => a.status !== "completed" && a.status !== "cancelled");
    const nextApp = activeApps[0];

    if (nextApp) {
      container.innerHTML = `
        <div class="top-app-card">
          <div class="top-app-header">
            <div class="top-app-title">
              <i class="bi bi-calendar-check-fill"></i>
              <span>Next Upcoming OPD Consultation</span>
            </div>
            <span class="top-app-badge">
              <i class="bi bi-bell-fill me-1"></i> ${activeApps.length} Active ${activeApps.length === 1 ? 'Appointment' : 'Appointments'}
            </span>
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
            <div class="top-app-actions">
              <button class="btn btn-sm btn-outline-primary" onclick="openAppointmentDetails(${nextApp.id})">
                <i class="bi bi-eye"></i> View Details
              </button>
              <button class="btn btn-sm btn-outline-primary" onclick="downloadSlip(${nextApp.id})">
                <i class="bi bi-download"></i> Download E-Slip
              </button>
              ${nextApp.status === "booked" ? `
                <button class="btn btn-sm btn-teal" onclick="checkIn(${nextApp.id})">
                  <i class="bi bi-qr-code-scan"></i> QR Check-In
                </button>
              ` : ''}
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
              <span>Upcoming OPD Consultations</span>
            </div>
            <span class="top-app-badge text-muted">0 Active Visits</span>
          </div>
          <div class="top-app-body">
            <span class="text-muted small">
              <i class="bi bi-info-circle me-1"></i> You currently have no upcoming OPD appointments. Click <b>Doctors & OPD</b> to book a slot.
            </span>
          </div>
        </div>
      `;
    }
  } catch (e) {
    container.innerHTML = "";
  }
}

async function renderPatientView() {
  await renderTopAppointmentsBanner();
  const c = $("#content");
  if (!c) return;

  c.innerHTML = '<div class="empty">Loading patient portal...</div>';

  try {
    if (activePage === "dashboard") {
      const d = await api("/patient/home");
      const next = d.appointments.find((x) =>
        ["booked", "checked_in", "called"].includes(x.status),
      );
      const queue = next ? await api("/patient/queue/" + next.id) : null;

      c.innerHTML = `
        <div class="hero">
          <div>
            <h1>Good Day, ${esc(d.patient.name)}! 👋</h1>
            <p>Your digital OPD companion. Book slots, generate E-Slips, and track your queue in real time.</p>
          </div>
          <div class="hero-art"><i class="bi bi-hospital"></i></div>
        </div>

        <div class="cards">
          <div class="action-card" onclick="setActivePage('appointments')">
            <i class="bi bi-calendar-check"></i>
            <h3>My Appointments</h3>
            <p>Review and manage active visits</p>
          </div>
          <div class="action-card" onclick="setActivePage('doctors')">
            <i class="bi bi-calendar-plus"></i>
            <h3>Book Consultation</h3>
            <p>Search doctors and select slots</p>
          </div>
          <div class="action-card" onclick="setActivePage('history')">
            <i class="bi bi-clock-history"></i>
            <h3>Medical History</h3>
            <p>View diagnoses and prescriptions</p>
          </div>
        </div>

        <div class="section-title"><i class="bi bi-speedometer2"></i> Today's OPD Overview</div>
        <div class="stats">
          <div class="stat-card">
            <span>Your Token Number</span>
            <strong>${next?.token || "—"}</strong>
            <div class="trend">Smart token queue</div>
          </div>
          <div class="stat-card">
            <span>Estimated Waiting Time</span>
            <strong>${next?.waiting_minutes ?? "—"} ${next ? "min" : ""}</strong>
            <div class="trend">Updated real-time</div>
          </div>
          <div class="stat-card">
            <span>Appointment Status</span>
            <strong style="font-size:20px;margin-top:12px">${next ? next.status.replace("_", " ") : "No active visit"}</strong>
            <div class="trend">Digital Check-in</div>
          </div>
          <div class="stat-card">
            <span>Total Visits</span>
            <strong>${d.appointments.length}</strong>
            <div class="trend">Lifetime appointments</div>
          </div>
        </div>

        <div class="section-title"><i class="bi bi-broadcast"></i> Live Sine-Wave OPD Queue</div>
        ${renderSineWaveQueueHTML(queue, next)}
      `;
    } else if (activePage === "doctors") {
      await renderBooking(c, selectedDepartmentId, currentSearchQuery);
    } else if (activePage === "hospitals") {
      await renderHospitals(c);
    } else if (activePage === "appointments") {
      await renderAppointments(c);
    } else if (activePage === "history") {
      await renderHistory(c);
    } else {
      c.innerHTML = `<div class="panel empty">Page ready for next module.</div>`;
    }
  } catch (e) {
    c.innerHTML = `
      <div class="panel empty text-center py-5">
        <i class="bi bi-exclamation-triangle text-teal display-4 mb-3 d-block"></i>
        <h4>Unable to Load Data</h4>
        <p class="text-muted small">${esc(e.message)}</p>
        <button class="primary-btn mt-2" onclick="renderPatientView()">
          <i class="bi bi-arrow-clockwise"></i> Retry
        </button>
      </div>
    `;
  }
}

// Global search handling
function setupSearch() {
  const searchInput = $("#globalSearch");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentSearchQuery = e.target.value.trim();
      if (currentSearchQuery) {
        if (activePage !== "doctors") {
          activePage = "doctors";
          renderNav();
        }
        renderBooking($("#content"), selectedDepartmentId, currentSearchQuery);
      } else {
        renderPatientView();
      }
    }, 300);
  });
}

function initPatientDashboard() {
  const user = requireAuth(["patient"]);
  if (!user) return;

  $("#userName").textContent = user.name;
  $("#userRole").textContent = "Patient";
  $("#avatar").textContent = (user.name || "P")[0].toUpperCase();

  $(".profile").onclick = (e) => toggleUserMenu(e, user, () => openProfileModal("view"));
  $("#logout").onclick = doLogout;

  setupSearch();
  renderNav();
  renderPatientView();
}

window.setActivePage = setActivePage;
window.renderPatientView = renderPatientView;
window.go = (p) => setActivePage(p);

document.addEventListener("DOMContentLoaded", initPatientDashboard);
