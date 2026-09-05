// DOM Helpers
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => root.querySelectorAll(s);

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
  );

function getLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toast(msg) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast-box";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.display = "none";
  }, 3200);
}

function showModal(html) {
  closeModal();
  const modal = document.createElement("div");
  modal.id = "modal";
  modal.className = "modal-backdrop-custom";
  modal.innerHTML = `<div class="modal-box">${html}</div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.body.appendChild(modal);
}

function closeModal() {
  const m = $("#modal");
  if (!m) return;
  m.classList.add("closing");
  const box = m.querySelector(".modal-box");
  if (box) box.classList.add("closing");
  setTimeout(() => {
    if (m && m.parentNode) m.parentNode.removeChild(m);
  }, 190);
}

// Smooth view switcher for seamless page transitions
async function smoothSwitchView(container, renderCallback) {
  if (!container) {
    if (renderCallback) await renderCallback();
    return;
  }

  if (container.children.length > 0) {
    container.classList.remove("view-transition-enter");
    container.classList.add("view-transition-exit");
    await new Promise((r) => setTimeout(r, 120));
  }

  if (renderCallback) {
    await renderCallback();
  }

  container.classList.remove("view-transition-exit");
  container.classList.add("view-transition-enter");
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = '<i class="bi bi-eye-slash"></i>';
    btn.setAttribute("aria-label", "Hide password");
  } else {
    input.type = "password";
    btn.innerHTML = '<i class="bi bi-eye"></i>';
    btn.setAttribute("aria-label", "Show password");
  }
}

function toggleUserMenu(e, user, openProfileFn) {
  e.stopPropagation();
  const existing = document.getElementById("userMenu");
  if (existing) {
    existing.remove();
    return;
  }
  const menu = document.createElement("div");
  menu.id = "userMenu";
  menu.className = "user-menu";
  const userInit = (user?.name || "U")[0].toUpperCase();
  const roleTitle = (user?.role || "user")[0].toUpperCase() + (user?.role || "user").slice(1);
  const inDemo = window.isDemoMode ? window.isDemoMode() : false;

  menu.innerHTML = `
    <div class="user-menu-head">
      <div class="avatar">${esc(userInit)}</div>
      <div>
        <b>${esc(user?.name || "User")}</b>
        <small>${esc(roleTitle)} ${inDemo ? '· (Demo Mode)' : ''}</small>
      </div>
    </div>
    <div class="user-menu-divider"></div>
    <button class="user-menu-item" id="menuServerBtn">
      <i class="bi bi-hdd-network"></i> Server Settings
    </button>
    <button class="user-menu-item" id="menuProfileBtn">
      <i class="bi bi-person"></i> My Profile
    </button>
    <div class="user-menu-divider"></div>
    <button class="user-menu-item danger" id="menuLogoutBtn">
      <i class="bi bi-box-arrow-left"></i> Logout
    </button>
  `;

  const profileElem = $(".profile");
  if (profileElem) profileElem.appendChild(menu);

  $("#menuServerBtn")?.addEventListener("click", (evt) => {
    evt.stopPropagation();
    menu.remove();
    openServerConfigModal();
  });

  $("#menuProfileBtn")?.addEventListener("click", (evt) => {
    evt.stopPropagation();
    menu.remove();
    if (openProfileFn) openProfileFn();
  });

  $("#menuLogoutBtn")?.addEventListener("click", (evt) => {
    evt.stopPropagation();
    menu.remove();
    doLogout();
  });

  const closeHandler = (evt) => {
    if (!menu.contains(evt.target)) {
      menu.remove();
      document.removeEventListener("click", closeHandler);
    }
  };
  setTimeout(() => document.addEventListener("click", closeHandler), 50);
}

function doLogout() {
  if (window.clearAuthSession) {
    window.clearAuthSession();
  } else {
    localStorage.removeItem("mq_token");
    localStorage.removeItem("mq_user");
  }
  document.body.style.transition = "opacity 0.2s ease";
  document.body.style.opacity = "0";
  setTimeout(() => {
    const isInsideSubdir = window.location.pathname.includes("-dashboard");
    window.location.href = isInsideSubdir ? "../index.html" : "index.html";
  }, 200);
}

function initTheme() {
  const saved = localStorage.getItem("mq_theme");
  const isDark = saved === "dark";
  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  updateThemeToggleButtons(isDark);
}

function updateThemeToggleButtons(isDark) {
  const btns = document.querySelectorAll(".theme-toggle-btn");
  btns.forEach((btn) => {
    btn.innerHTML = isDark
      ? '<i class="bi bi-sun-fill" title="Switch to Light Mode"></i>'
      : '<i class="bi bi-moon-stars-fill" title="Switch to Dark Mode"></i>';
    btn.setAttribute("aria-label", isDark ? "Switch to Light Mode" : "Switch to Dark Mode");
  });
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("mq_theme", "light");
    updateThemeToggleButtons(false);
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("mq_theme", "dark");
    updateThemeToggleButtons(true);
  }
}

// Responsive Mobile Sidebar Toggle
function toggleSidebar(forceState) {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  let backdrop = document.getElementById("sidebarBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "sidebarBackdrop";
    backdrop.className = "sidebar-backdrop";
    backdrop.onclick = () => closeSidebar();
    document.body.appendChild(backdrop);
  }

  const shouldOpen = typeof forceState === "boolean" ? forceState : !sidebar.classList.contains("open");
  if (shouldOpen) {
    sidebar.classList.add("open");
    backdrop.classList.add("show");
    document.body.classList.add("sidebar-locked");
  } else {
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
    document.body.classList.remove("sidebar-locked");
  }
}

function closeSidebar() {
  toggleSidebar(false);
}

// Auto-close sidebar when clicking navigation button on mobile
document.addEventListener("click", (e) => {
  const navBtn = e.target.closest(".nav-btn");
  if (navBtn && window.innerWidth < 992) {
    closeSidebar();
  }
});

// ==========================================
// Server Configuration Modal & Status Management
// ==========================================
function openServerConfigModal() {
  const currentApi = window.getApiBase ? window.getApiBase() : "http://127.0.0.1:8000/api";
  const inDemo = window.isDemoMode ? window.isDemoMode() : false;
  const isHttps = window.location.protocol === "https:";

  const html = `
    <div class="server-config-dialog">
      <button type="button" class="close" onclick="closeModal()" aria-label="Close">
        <i class="bi bi-x"></i>
      </button>
      
      <div class="server-config-header">
        <h4><i class="bi bi-hdd-network-fill"></i> Backend Server Configuration</h4>
        <p>Manage and test your API endpoint connection for deployed environments.</p>
      </div>

      <div class="server-status-card" id="serverModalStatusCard">
        <div class="status-indicator">
          <span class="server-dot ${inDemo ? 'demo' : 'connected'}" id="modalServerDot"></span>
          <div>
            <b id="modalServerStatusText">${inDemo ? 'Demo Mode Active (Offline Preview)' : 'Checking Server...'}</b>
            <small style="display:block;color:var(--text-muted);font-size:11px" id="modalServerSubText">
              ${inDemo ? 'Simulating backend with sample data' : currentApi}
            </small>
          </div>
        </div>
        <button class="btn btn-sm btn-outline-primary" id="modalPingBtn" onclick="testModalServerConnection()">
          <i class="bi bi-broadcast"></i> Test Ping
        </button>
      </div>

      <div class="server-input-group">
        <label for="cfgApiBase">FastAPI Backend URL</label>
        <input id="cfgApiBase" type="url" value="${esc(currentApi)}" placeholder="https://your-mediqueue-api.onrender.com/api" />
        <small style="color:var(--text-muted);font-size:11px">
          Must point to your running FastAPI backend and end in <code>/api</code>.
        </small>
      </div>

      ${isHttps ? `
        <div class="server-help-box">
          <i class="bi bi-shield-lock-fill"></i>
          <b>HTTPS Security Requirement:</b> This website is served securely over HTTPS. Modern browsers strictly block connecting to plain <code>http://...</code> API endpoints due to Mixed Content security rules. Please provide an <b>https://</b> backend URL or use Demo Mode.
        </div>
      ` : ''}

      <div class="d-flex justify-content-between align-items-center gap-2 mt-2 pt-2" style="border-top:1px solid var(--line)">
        <button type="button" class="btn btn-sm ${inDemo ? 'btn-teal' : 'btn-outline-primary'}" onclick="toggleModalDemoMode()">
          <i class="bi bi-${inDemo ? 'cloud-check' : 'laptop'} me-1"></i>
          ${inDemo ? 'Switch to Live API Mode' : 'Explore in Demo Mode'}
        </button>
        
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="resetModalApiBase()">
            Reset
          </button>
          <button type="button" class="primary-btn" style="padding:8px 18px;font-size:13px" onclick="saveModalApiBase()">
            Save &amp; Connect
          </button>
        </div>
      </div>
    </div>
  `;
  showModal(html);
  if (!inDemo) {
    testModalServerConnection();
  }
}

async function testModalServerConnection() {
  const input = $("#cfgApiBase");
  const url = input ? input.value.trim() : (window.getApiBase ? window.getApiBase() : "");
  const dot = $("#modalServerDot");
  const text = $("#modalServerStatusText");
  const sub = $("#modalServerSubText");
  const btn = $("#modalPingBtn");

  if (btn) btn.disabled = true;
  if (text) text.textContent = "Pinging server...";

  if (window.checkServerHealth) {
    const res = await window.checkServerHealth(url);
    if (btn) btn.disabled = false;
    if (res.ok) {
      if (dot) dot.className = "server-dot connected";
      if (text) text.textContent = "🟢 Server Online & Reachable";
      if (sub) sub.textContent = `200 OK from ${res.url}`;
    } else {
      if (dot) dot.className = "server-dot error";
      if (text) text.textContent = `🔴 ${res.status}`;
      if (sub) sub.textContent = res.error || "Cannot reach backend. Check URL & HTTPS.";
    }
  }
}

function saveModalApiBase() {
  const input = $("#cfgApiBase");
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    toast("Please enter a valid API URL");
    return;
  }
  if (window.setApiBase) window.setApiBase(val);
  if (window.setDemoMode) window.setDemoMode(false);
  toast("Backend API URL saved!");
  updateServerStatusBadges();
  closeModal();
  setTimeout(() => {
    if (window.renderPatientView) window.renderPatientView();
    else if (window.renderDoctorView) window.renderDoctorView();
    else if (window.renderAdminView) window.renderAdminView();
  }, 200);
}

function resetModalApiBase() {
  if (window.setApiBase) window.setApiBase(null);
  toast("Reset API URL to default");
  const input = $("#cfgApiBase");
  if (input && window.getApiBase) input.value = window.getApiBase();
  testModalServerConnection();
  updateServerStatusBadges();
}

function toggleModalDemoMode() {
  const current = window.isDemoMode ? window.isDemoMode() : false;
  if (window.setDemoMode) window.setDemoMode(!current);
  toast(!current ? "Activated Instant Demo Mode!" : "Switched to Live API Mode");
  updateServerStatusBadges();
  closeModal();
  setTimeout(() => {
    if (window.renderPatientView) window.renderPatientView();
    else if (window.renderDoctorView) window.renderDoctorView();
    else if (window.renderAdminView) window.renderAdminView();
    else window.location.reload();
  }, 250);
}

async function updateServerStatusBadges() {
  const pills = document.querySelectorAll(".server-status-pill");
  if (pills.length === 0) return;

  const inDemo = window.isDemoMode ? window.isDemoMode() : false;
  if (inDemo) {
    pills.forEach((p) => {
      p.innerHTML = '<span class="server-dot demo"></span><span>Demo Mode (Offline)</span>';
      p.title = "Operating with simulated sample data. Click to configure server.";
    });
    return;
  }

  if (window.checkServerHealth) {
    const health = await window.checkServerHealth();
    pills.forEach((p) => {
      if (health.ok) {
        p.innerHTML = '<span class="server-dot connected"></span><span>Server Online</span>';
        p.title = `Connected to ${health.url}. Click to configure.`;
      } else {
        p.innerHTML = `<span class="server-dot error"></span><span>Server Offline</span>`;
        p.title = `${health.status}. Click to configure.`;
      }
    });
  }
}

// Initializations
initTheme();
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  updateServerStatusBadges();
});

window.$ = $;
window.$$ = $$;
window.esc = esc;
window.getLocalDateStr = getLocalDateStr;
window.toast = toast;
window.showModal = showModal;
window.closeModal = closeModal;
window.smoothSwitchView = smoothSwitchView;
window.togglePasswordVisibility = togglePasswordVisibility;
window.toggleUserMenu = toggleUserMenu;
window.doLogout = doLogout;
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.openServerConfigModal = openServerConfigModal;
window.testModalServerConnection = testModalServerConnection;
window.saveModalApiBase = saveModalApiBase;
window.resetModalApiBase = resetModalApiBase;
window.toggleModalDemoMode = toggleModalDemoMode;
window.updateServerStatusBadges = updateServerStatusBadges;
