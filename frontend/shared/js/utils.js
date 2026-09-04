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
  }, 2800);
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
  if (m) m.remove();
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
  
  menu.innerHTML = `
    <div class="user-menu-head">
      <div class="avatar">${esc(userInit)}</div>
      <div>
        <b>${esc(user?.name || "User")}</b>
        <small>${esc(roleTitle)}</small>
      </div>
    </div>
    <div class="user-menu-divider"></div>
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
  localStorage.clear();
  window.location.href = "../index.html";
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

// Immediately apply theme to avoid flash of light mode if dark mode is preferred
initTheme();
document.addEventListener("DOMContentLoaded", initTheme);

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

window.$ = $;
window.$$ = $$;
window.esc = esc;
window.getLocalDateStr = getLocalDateStr;
window.toast = toast;
window.showModal = showModal;
window.closeModal = closeModal;
window.togglePasswordVisibility = togglePasswordVisibility;
window.toggleUserMenu = toggleUserMenu;
window.doLogout = doLogout;
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

