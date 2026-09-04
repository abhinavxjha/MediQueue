let activePage = "dashboard";
let currentSearchQuery = "";
let searchDebounceTimer = null;

function setActivePage(page) {
  activePage = page;
  renderNav();
  renderAdminView();
}

function renderNav() {
  const items = [
    ["dashboard", "grid-1x2", "Executive Dashboard"],
    ["hospital_desk", "hospital", "OPD Queue Console"],
    ["schedule", "calendar3", "Doctor Working Schedules"],
    ["timelogs", "stopwatch", "Patient Timestamps"],
    ["doctors", "person-badge", "Doctor Catalog"],
    ["analytics", "bar-chart-line", "Analytics & Models"],
    ["appointments", "calendar-check", "All Appointments"],
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
    const overview = await api("/hospital/overview");
    container.innerHTML = `
      <div class="top-app-card">
        <div class="top-app-header">
          <div class="top-app-title">
            <i class="bi bi-hospital-fill"></i>
            <span>Hospital OPD Operations &amp; Real-Time Throughput</span>
          </div>
          <span class="top-app-badge">
            <i class="bi bi-people-fill me-1"></i> ${overview.queue_stats.waiting} Waiting · ${overview.queue_stats.ongoing} Ongoing
          </span>
        </div>
        <div class="top-app-body">
          <div class="top-app-details">
            <div class="top-app-item">
              <label>Consultations Completed Today</label>
              <strong>${overview.queue_stats.completed} Patients Consulted</strong>
            </div>
            <div class="top-app-item">
              <label>Real-Time Average Duration</label>
              <strong>~${overview.queue_stats.avg_duration_minutes} min / consultation</strong>
            </div>
            <div class="top-app-item">
              <label>Doctor Workforce</label>
              <strong>${overview.doctors.available} Available / ${overview.doctors.total} Total Registered</strong>
            </div>
          </div>
          <div class="top-app-actions">
            <button class="btn btn-sm btn-teal" onclick="setActivePage('hospital_desk')">
              <i class="bi bi-speedometer2 me-1"></i> Live OPD Console
            </button>
            <button class="btn btn-sm btn-outline-primary" onclick="setActivePage('schedule')">
              <i class="bi bi-calendar3 me-1"></i> Doctor Working Schedules
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="setActivePage('timelogs')">
              <i class="bi bi-stopwatch me-1"></i> Timestamps &amp; Logs
            </button>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = "";
  }
}

async function renderAdminView() {
  await renderTopAppointmentsBanner();
  const c = $("#content");
  if (!c) return;

  if (activePage === "dashboard") {
    await renderAnalytics(c);
  } else if (activePage === "hospital_desk") {
    await renderHospitalConsole(c);
  } else if (activePage === "schedule") {
    await renderDoctorSchedules(c);
  } else if (activePage === "timelogs") {
    await renderTimeLogs(c);
  } else if (activePage === "doctors") {
    await renderAdminDoctors(c);
  } else if (activePage === "analytics") {
    await renderAnalytics(c);
  } else if (activePage === "appointments") {
    await renderAdminAppointments(c);
  }
}

function setupSearch() {
  const searchInput = $("#globalSearch");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentSearchQuery = e.target.value.trim();
      const qLower = currentSearchQuery.toLowerCase();
      
      // Filter visible table rows across whichever view is active
      const rows = document.querySelectorAll("#content tbody tr");
      rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(qLower) ? "" : "none";
      });
    }, 250);
  });
}

function initAdminDashboard() {
  const user = requireAuth(["admin", "hospital"]);
  if (!user) return;

  $("#userName").textContent = user.name;
  $("#userRole").textContent = user.role === "admin" ? "Hospital Administrator" : "OPD Desk Staff";
  $("#avatar").textContent = (user.name || "A")[0].toUpperCase();

  $(".profile").onclick = (e) => toggleUserMenu(e, user, () => {
    toast("Administrator account managed by hospital system security.");
  });
  $("#logout").onclick = doLogout;

  setupSearch();
  renderNav();
  renderAdminView();
}

window.setActivePage = setActivePage;
window.renderAdminView = renderAdminView;

document.addEventListener("DOMContentLoaded", initAdminDashboard);
