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
        : [
            ["dashboard", "grid-1x2", "Dashboard"],
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
async function render() {
  const c = $("#content");
  clearInterval(temporaryAppointmentTimer);
  temporaryAppointmentTimer = null;
  c.innerHTML = '<div class="empty">Loading MediQueue...</div>';
  try {
    if (currentUser.role === "patient") await patientPage(c);
    else if (currentUser.role === "doctor") await doctorPage(c);
    else await adminPage(c);
  } catch (e) {
    c.innerHTML = `<div class="panel empty"><i class="bi bi-exclamation-triangle"></i><br>${esc(e.message)}</div>`;
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
  showModal(`<button class="close" onclick="closeModal()">×</button><div class="detail-modal"><span class="eyebrow">APPOINTMENT DETAILS</span><h3>${esc(appointment.doctor)}</h3><p>${esc(appointment.specialization)} · ${esc(appointment.department)}</p><div class="detail-list"><div><small>Hospital</small><strong>${esc(appointment.hospital)}</strong></div><div><small>Date and time</small><strong>${appointment.date} · ${appointment.time}</strong></div><div><small>Token and fee</small><strong>${esc(appointment.token || "—")} · ₹${appointment.fee}</strong></div><div><small>Symptoms</small><strong>${esc(appointment.symptoms || "Not provided")}</strong></div><div><small>Status</small><strong>${esc(appointment.status)}</strong></div></div><button class="primary-btn" onclick="downloadSlip(${id})"><i class="bi bi-download"></i> Download E-Slip</button></div>`);
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
  link.download = `mediqueue-report-${id}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
async function patientPage(c) {
  if (active === "dashboard") {
    const d = await api("/patient/home");
    const next = d.appointments.find((x) =>
      ["booked", "checked_in", "called"].includes(x.status),
    );
    const queue = next ? await api("/patient/queue/" + next.id) : null;
    c.innerHTML = `<div class="hero"><div><h1>Good Morning, ${esc(d.patient.name)}! 👋</h1><p>We're here to make your visit smooth and hassle-free.</p></div><div class="hero-art"><i class="bi bi-hospital"></i></div></div><div class="cards"><div class="action-card" onclick="go('appointments')"><i class="bi bi-clock-history"></i><h3>My Appointments</h3><p>See your upcoming visits</p></div><div class="action-card" onclick="go('book')"><i class="bi bi-calendar-plus"></i><h3>Book Appointment</h3><p>Find doctors & book your slot</p></div><div class="action-card" onclick="go('history')"><i class="bi bi-clock-history"></i><h3>Medical History</h3><p>Review completed consultations</p></div></div><div class="section-title">Today's Overview</div><div class="stats"><div class="stat-card"><span>Your Token Number</span><strong>${next?.token || "—"}</strong><div class="trend">Smart queue</div></div><div class="stat-card"><span>Estimated Waiting Time</span><strong>${next?.waiting_minutes ?? "—"} ${next ? "min" : ""}</strong><div class="trend">Updated live</div></div><div class="stat-card"><span>Appointment Status</span><strong style="font-size:18px;margin-top:12px">${next ? next.status.replace("_", " ") : "No visit"}</strong><div class="trend">Digital check-in</div></div><div class="stat-card"><span>Appointments</span><strong>${d.appointments.length}</strong><div class="trend">History & upcoming</div></div></div><div class="section-title">Live Queue</div><div class="queue-live">${queue ? `<div style="color:var(--muted);font-size:12px">${esc(next.department)} · ${esc(next.doctor)}</div><div class="queue-number">${esc(queue.token || next.token)}</div><div style="margin:10px 0 20px">${queue.position ?? "—"} patients position · ${queue.waiting_minutes ?? "—"} min estimated wait</div><div class="progress-line"><span style="width:${Math.max(8, 100 - Math.min((queue.position || 1) * 8, 92))}%"></span></div><div class="d-flex justify-content-between mt-3" style="font-size:11px;color:var(--muted)"><span>Now serving: <b>${queue.now_serving || "—"}</b></span><span>Status: <b>${queue.status}</b></span></div>` : "No active queue. Book an appointment first."}</div>`;
  } else if (active === "book" || active === "doctors") {
    await renderBooking(c);
  } else if (active === "hospitals") {
    await renderHospitals(c);
  } else if (active === "appointments") {
    const d = await api("/patient/home");
    c.innerHTML = `<div class="section-title">My Appointments</div><div class="panel"><table class="table"><thead><tr><th>Doctor</th><th>OPD</th><th>Date</th><th>Token</th><th>Status</th><th>Actions</th></tr></thead><tbody>${d.appointments.filter((a) => a.status !== "completed").map((a) => `<tr><td><b>${esc(a.doctor)}</b><br><small>${esc(a.specialization)}</small></td><td>${esc(a.department)}</td><td>${a.date} · ${a.time}</td><td><b>${esc(a.token || "—")}</b></td><td><span class="pill ${a.status === "checked_in" ? "purple" : "orange"}">${esc(a.status)}</span></td><td class="appointment-actions"><button class="btn btn-sm btn-outline-primary" onclick="openAppointmentDetails(${a.id})">View details</button><button class="btn btn-sm btn-outline-primary" onclick="downloadSlip(${a.id})"><i class="bi bi-download"></i> Download</button></td></tr>`).join("") || '<tr><td colspan="6" class="empty">No active appointments. Completed visits appear in History.</td></tr>'}</tbody></table></div><div class="temporary-notice"><i class="bi bi-hourglass-split"></i> Temporary Feature: demo appointments are moved to History after 45 seconds.</div>`;
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
    c.innerHTML = `<div class="section-title">Live Queue</div><div class="queue-live"><div style="color:var(--muted);font-size:12px">${esc(a.department)} · ${esc(a.doctor)}</div><div class="queue-number">${esc(q.token || a.token)}</div><div style="margin:10px 0 20px">${q.position ?? "—"} patients position · ${q.waiting_minutes ?? "—"} min estimated wait</div><div class="progress-line"><span style="width:${Math.max(8, 100 - Math.min((q.position || 1) * 8, 92))}%"></span></div><div class="d-flex justify-content-between mt-3" style="font-size:11px;color:var(--muted)"><span>Now serving: <b>${q.now_serving || "—"}</b></span><span>Status: <b>${q.status}</b></span></div>${a.status === "booked" ? `<button class="primary-btn" style="max-width:250px" onclick="checkIn(${a.id})">Check In</button>` : ""}</div>`;
  } else {
    c.innerHTML = `<div class="panel empty">${esc(active)} is ready for the next module.</div>`;
  }
}
async function renderBooking(c, departmentId = null) {
  const docs = await api(`/patient/doctors${departmentId ? `?department_id=${departmentId}` : ""}`);
  c.innerHTML = `<div class="section-title">Find a Doctor</div><div class="doctor-grid">${docs.map((d) => `<div class="doctor-card"><div class="doctor-head"><div class="doc-avatar">${esc(d.name.replace("Dr. ", "")[0])}</div><div><h3>${esc(d.name)}</h3><p>${esc(d.specialization)}</p><p>${esc(d.department)} · ${esc(d.hospital)}</p></div></div><div class="d-flex justify-content-between mt-3"><small>Consultation</small><b>₹${d.fee}</b></div><button class="book" onclick="chooseDoctor(${d.id},'${esc(d.name)}')">View Availability</button></div>`).join("")}</div>`;
}
async function renderHospitals(c) {
  c.innerHTML = '<div class="section-title">Hospitals Near You</div><div class="panel empty">Finding hospitals near your location...</div>';
  const hospitals = await api("/patient/hospitals");
  c.innerHTML = `<div class="section-title">Hospitals Near You</div><div class="hospital-toolbar"><div><h2>Find trusted care nearby</h2><p>Browse departments and doctors connected to the MediQueue catalog.</p></div></div><div class="hospital-grid">${hospitals.map((hospital) => { const doctorCount = hospital.departments.reduce((count, department) => count + department.doctors.length, 0); return `<article class="hospital-card"><div class="hospital-icon"><i class="bi bi-hospital"></i></div><div class="hospital-card-body"><div class="hospital-card-heading"><h3>${esc(hospital.name)}</h3><span class="hospital-rating">${esc(hospital.city)}</span></div><p class="hospital-address"><i class="bi bi-geo-alt"></i> ${esc(hospital.address)}</p><div class="hospital-meta"><span><i class="bi bi-people"></i> ${doctorCount} doctors</span><span>${hospital.departments.length} departments</span></div><div class="hospital-departments">${hospital.departments.map((department) => `<button class="btn btn-sm btn-outline-primary" onclick="goToDepartment(${department.id})">${esc(department.name)} (${department.doctors.length})</button>`).join("")}</div><a class="hospital-directions" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + " " + hospital.address)}" target="_blank" rel="noopener"><i class="bi bi-arrow-up-right"></i> Get directions</a><small>${esc(hospital.phone || "")} · ${esc(hospital.email || "")}</small></div></article>`; }).join("")}</div>`;
}
function goToDepartment(departmentId) {
  active = "doctors";
  renderNav();
  renderBooking($("#content"), departmentId);
}
async function chooseDoctor(id, name) {
  const dateStr = new Date().toISOString().slice(0, 10);
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
    `<button class="close" onclick="closeModal()">×</button><div class="eslip"><div class="d-flex justify-content-between"><div><span class="eyebrow">MEDIQUEUE E-SLIP</span><h3>${esc(d.token)}</h3><p>${esc(d.patient)} · ${esc(d.doctor)}</p></div><img class="qr" src="${d.qr}" alt="QR code"></div><hr><div class="row g-3 small"><div class="col-6"><b>Hospital</b><br>${esc(d.hospital)}</div><div class="col-6"><b>OPD</b><br>${esc(d.department)}</div><div class="col-6"><b>Date</b><br>${d.date}</div><div class="col-6"><b>Time</b><br>${d.time}</div><div class="col-6"><b>Consultation Fee</b><br>₹${d.fee}</div><div class="col-6"><b>Status</b><br>${d.status}</div></div><button class="primary-btn" onclick="downloadSlip(${id})">Download PDF E-Slip</button></div>`,
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
  a.download = `mediqueue-eslip-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
async function doctorPage(c) {
  if (active === "dashboard") {
    const d = await api("/doctor/dashboard");
    c.innerHTML = `<div class="hero"><h1>Doctor Dashboard</h1><p>Manage today's appointments, queue and consultations.</p></div><div class="section-title">Today's Overview</div><div class="stats"><div class="stat-card"><span>Booked</span><strong>${d.stats.booked}</strong></div><div class="stat-card"><span>Checked In</span><strong>${d.stats.checked_in}</strong></div><div class="stat-card"><span>Completed</span><strong>${d.stats.completed}</strong></div><div class="stat-card"><span>Waiting</span><strong>${d.stats.waiting}</strong></div></div><div class="section-title">Current Queue</div><div class="panel"><button class="primary-btn" style="width:auto;padding:10px 20px;margin:0 0 15px" onclick="nextPatient()">Call Next Patient</button>${queueTable(d.queue, true)}</div>`;
  } else if (active === "queue") {
    const d = await api("/doctor/dashboard");
    c.innerHTML = `<div class="section-title">Live OPD Queue</div><div class="panel">${queueTable(d.queue, true)}</div>`;
  } else if (active === "appointments") {
    const a = await api("/doctor/appointments");
    c.innerHTML = `<div class="section-title">Appointments</div><div class="panel">${queueTable(a, false)}</div>`;
  } else if (active === "slots") {
    c.innerHTML = `<div class="section-title">Manage Slots</div><div class="panel"><div class="row g-3"><div class="col-md-4"><label class="small fw-bold">Date</label><input id="slotDate" class="form-control" type="date" value="${new Date().toISOString().slice(0, 10)}"></div><div class="col-md-3"><label class="small fw-bold">Start</label><input id="slotStart" class="form-control" type="time" value="10:00"></div><div class="col-md-3"><label class="small fw-bold">End</label><input id="slotEnd" class="form-control" type="time" value="10:30"></div><div class="col-md-2"><label class="small fw-bold">Capacity</label><input id="slotCap" class="form-control" type="number" value="10"></div></div><button class="primary-btn" style="width:auto" onclick="addSlot()">Create Slot</button></div>`;
  } else
    c.innerHTML = '<div class="panel empty">Profile management module.</div>';
}
function queueTable(rows, doctor) {
  if (!rows.length) return '<div class="empty">No records.</div>';
  return `<table class="table"><thead><tr><th>Token</th><th>${doctor ? "Patient" : "Date"}</th><th>${doctor ? "Position" : "Time"}</th>${doctor ? "" : "<th>Symptoms</th>"}<th>Status</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${esc(r.token || r.token_no || "—")}</b></td><td>${doctor ? esc(r.patient_id || "Patient") : esc(r.date)}</td><td>${doctor ? esc(r.position || "—") : esc(r.time)}</td>${doctor ? "" : `<td>${esc(r.symptoms || "Not provided")}</td>`}<td><span class="pill purple">${esc(r.status)}</span></td><td>${doctor && r.status === "called" ? `<button class="btn btn-sm btn-success" onclick="completePatient(${r.id})">Complete</button>` : ""}</td></tr>`).join("")}</tbody></table>`;
}
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
      ? "Help us keep your MediQueue profile up to date."
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
  menu.innerHTML = `<div class="user-menu-head"><div class="avatar">${esc(currentUser.name[0].toUpperCase())}</div><div><b>${esc(currentUser.name)}</b><small>${esc(currentUser.role[0].toUpperCase() + currentUser.role.slice(1))}</small></div></div><div class="user-menu-divider"></div><button class="user-menu-item" onclick="closeUserMenuAnd(function(){openProfileModal('view')})"><i class="bi bi-person"></i> My Profile</button><div class="user-menu-divider"></div><button class="user-menu-item danger" onclick="doLogout()"><i class="bi bi-box-arrow-left"></i> Logout</button>`;
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
window.saveProfile = saveProfile;
window.toggleUserMenu = toggleUserMenu;
window.closeUserMenuAnd = closeUserMenuAnd;
window.doLogout = doLogout;
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
    const r = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: $("#regName").value,
        email: $("#regEmail").value,
        phone: $("#regPhone").value,
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
  } catch (e) {
    toast(e.message);
  }
};
boot();
