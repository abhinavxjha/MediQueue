let temporaryAppointmentTimer = null;

function startTemporaryAppointmentTimer(appointments) {
  if (temporaryAppointmentTimer || !appointments.some((appointment) => appointment.status !== "completed" && appointment.status !== "cancelled")) return;
  temporaryAppointmentTimer = setInterval(async () => {
    const appointment = appointments.find((item) => item.status !== "completed" && item.status !== "cancelled");
    if (!appointment) {
      clearInterval(temporaryAppointmentTimer);
      temporaryAppointmentTimer = null;
      return;
    }
    try {
      await api(`/patient/appointments/${appointment.id}/temporary-complete`, { method: "POST" });
      toast("Temporary demo appointment moved to History");
      if (window.renderPatientView) window.renderPatientView();
    } catch (e) {
      // Ignored if already completed or unavailable
    }
  }, 45000);
}

function clearTemporaryAppointmentTimer() {
  if (temporaryAppointmentTimer) {
    clearInterval(temporaryAppointmentTimer);
    temporaryAppointmentTimer = null;
  }
}

async function renderAppointments(c) {
  clearTemporaryAppointmentTimer();
  c.innerHTML = '<div class="section-title"><i class="bi bi-calendar-check"></i> My Appointments</div><div class="empty">Loading appointments...</div>';
  try {
    const d = await api("/patient/home");
    const activeApps = d.appointments.filter((a) => a.status !== "completed" && a.status !== "cancelled");

    c.innerHTML = `
      <div class="section-title"><i class="bi bi-calendar-check"></i> My Appointments</div>
      <div class="panel">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>OPD</th>
                <th>Date & Time</th>
                <th>Token</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${activeApps.map((a) => {
                const isRemovable = !["checked_in", "called", "ongoing", "in_consultation", "serving", "completed"].includes(a.status);
                return `
                  <tr>
                    <td>
                      <b>${esc(a.doctor)}</b><br>
                      <small class="text-muted">${esc(a.specialization)}</small>
                    </td>
                    <td>${esc(a.department)}</td>
                    <td>${a.date} · ${a.time}</td>
                    <td><b class="token-pill">${esc(a.token || "—")}</b></td>
                    <td>
                      <span class="pill ${a.status === "checked_in" ? "purple" : "orange"}">
                        ${esc(a.status.replace("_", " "))}
                      </span>
                    </td>
                    <td class="appointment-actions">
                      <button class="btn btn-sm btn-outline-primary" onclick="openAppointmentDetails(${a.id})">
                        <i class="bi bi-eye"></i> Details
                      </button>
                      <button class="btn btn-sm btn-outline-primary" onclick="downloadSlip(${a.id})">
                        <i class="bi bi-download"></i> Slip
                      </button>
                      ${a.status === "booked" ? `
                        <button class="btn btn-sm btn-teal" onclick="checkIn(${a.id})">
                          <i class="bi bi-qr-code-scan"></i> Check In
                        </button>
                      ` : ''}
                      ${isRemovable ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="cancelAppointment(${a.id}, '${a.status}')">
                          <i class="bi bi-trash"></i> Cancel
                        </button>
                      ` : `
                        <button class="btn btn-sm btn-outline-secondary" disabled title="Ongoing/Completed visits cannot be removed">
                          <i class="bi bi-lock"></i> Locked
                        </button>
                      `}
                    </td>
                  </tr>
                `;
              }).join("") || '<tr><td colspan="6" class="empty">No active appointments. Completed consultations appear in Medical History.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      <div class="temporary-notice">
        <i class="bi bi-hourglass-split"></i> Temporary Feature: demo appointments move to Medical History after 45 seconds for testing.
      </div>
    `;

    startTemporaryAppointmentTimer(d.appointments);
  } catch (e) {
    c.innerHTML = `<div class="panel empty">${esc(e.message)}</div>`;
  }
}

async function renderHistory(c) {
  clearTemporaryAppointmentTimer();
  c.innerHTML = '<div class="section-title"><i class="bi bi-clock-history"></i> Medical History</div><div class="empty">Loading records...</div>';
  try {
    const d = await api("/patient/home");
    const history = d.appointments.filter((appointment) => appointment.status === "completed");

    c.innerHTML = `
      <div class="section-title"><i class="bi bi-clock-history"></i> Medical History</div>
      <div class="history-intro">Your completed OPD visits and doctor clinical records in one secure location.</div>
      <div class="history-list">
        ${history.map((a) => `
          <article class="history-card">
            <div class="history-card-head">
              <div>
                <span class="eyebrow">${a.date} · ${a.time}</span>
                <h3>${esc(a.doctor)}</h3>
                <p>${esc(a.specialization)} · ${esc(a.department)}</p>
              </div>
              <span class="pill green"><i class="bi bi-check-circle-fill"></i> Completed</span>
            </div>
            <div class="history-grid">
              <div>
                <small>Hospital</small>
                <strong>${esc(a.hospital)}</strong>
              </div>
              <div>
                <small>Token / Fee</small>
                <strong>${esc(a.token || "—")} · ₹${a.fee}</strong>
              </div>
              <div>
                <small>Symptoms</small>
                <strong>${esc(a.symptoms || "Not provided")}</strong>
              </div>
              <div>
                <small>Diagnosis</small>
                <strong>${esc(a.consultation?.diagnosis || "Not recorded")}</strong>
              </div>
              <div>
                <small>Doctor Notes</small>
                <strong>${esc(a.consultation?.notes || "Not recorded")}</strong>
              </div>
              <div>
                <small>Prescription</small>
                <strong>${esc(a.consultation?.prescription || "Not recorded")}</strong>
              </div>
            </div>
            ${a.consultation?.followup_date ? `
              <div class="history-followup">
                <i class="bi bi-calendar2-check"></i> Recommended Follow-up: <b>${esc(a.consultation.followup_date)}</b>
              </div>
            ` : ""}
            <div class="history-actions">
              <button class="btn btn-sm btn-outline-primary" onclick="openReport(${a.id})">
                <i class="bi bi-file-earmark-medical"></i> View Report
              </button>
              <button class="btn btn-sm btn-outline-primary" onclick="downloadReport(${a.id})">
                <i class="bi bi-download"></i> Download PDF
              </button>
            </div>
          </article>
        `).join("") || '<div class="panel empty">No completed medical consultation history recorded yet.</div>'}
      </div>
    `;
  } catch (e) {
    c.innerHTML = `<div class="panel empty">${esc(e.message)}</div>`;
  }
}

async function checkIn(id) {
  try {
    const r = await api("/patient/check-in", {
      method: "POST",
      body: JSON.stringify({ appointment_id: id }),
    });
    toast(`Checked in successfully! Token ${r.token}`);
    if (window.setActivePage) {
      window.setActivePage("dashboard");
    }
  } catch (e) {
    toast(e.message);
  }
}

async function openAppointmentDetails(id) {
  try {
    const data = await api("/patient/home");
    const appointment = data.appointments.find((item) => item.id === id);
    if (!appointment) return toast("Appointment not found");
    const isRemovable = !["checked_in", "called", "ongoing", "in_consultation", "serving", "completed"].includes(appointment.status);

    showModal(`
      <button class="close" onclick="closeModal()">×</button>
      <div class="detail-modal">
        <span class="eyebrow">APPOINTMENT DETAILS</span>
        <h3>${esc(appointment.doctor)}</h3>
        <p>${esc(appointment.specialization)} · ${esc(appointment.department)}</p>
        <div class="detail-list">
          <div><small>Hospital</small><strong>${esc(appointment.hospital)}</strong></div>
          <div><small>Date & Time</small><strong>${appointment.date} · ${appointment.time}</strong></div>
          <div><small>Token & Fee</small><strong>${esc(appointment.token || "—")} · ₹${appointment.fee}</strong></div>
          <div><small>Symptoms</small><strong>${esc(appointment.symptoms || "Not provided")}</strong></div>
          <div><small>Status</small><strong>${esc(appointment.status)}</strong></div>
        </div>
        <div class="d-flex gap-2 mt-3">
          <button class="primary-btn flex-grow-1" onclick="downloadSlip(${id})">
            <i class="bi bi-download"></i> Download E-Slip
          </button>
          <button class="btn btn-outline-primary" onclick="openSlip(${id})">
            <i class="bi bi-qr-code"></i> View QR
          </button>
          ${isRemovable ? `
            <button class="btn btn-outline-danger" onclick="cancelAppointment(${id}, '${appointment.status}')">
              <i class="bi bi-trash"></i> Cancel
            </button>
          ` : `
            <button class="btn btn-outline-secondary" disabled title="Ongoing and completed visits cannot be removed">
              <i class="bi bi-lock"></i> Locked
            </button>
          `}
        </div>
      </div>
    `);
  } catch (e) {
    toast(e.message);
  }
}

async function openSlip(id) {
  try {
    const d = await api("/patient/eslip/" + id);
    showModal(`
      <button class="close" onclick="closeModal()">×</button>
      <div class="eslip">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <span class="eyebrow">QUERLY DIGITAL E-SLIP</span>
            <h3 class="my-1">${esc(d.token)}</h3>
            <p class="text-muted small m-0">${esc(d.patient)} · ${esc(d.doctor)}</p>
          </div>
          <img class="qr" src="${d.qr}" alt="Check-in QR code">
        </div>
        <hr class="my-3">
        <div class="row g-3 small">
          <div class="col-6"><b>Hospital:</b><br>${esc(d.hospital)}</div>
          <div class="col-6"><b>OPD:</b><br>${esc(d.department)}</div>
          <div class="col-6"><b>Date:</b><br>${d.date}</div>
          <div class="col-6"><b>Time:</b><br>${d.time}</div>
          <div class="col-6"><b>Fee:</b><br>₹${d.fee}</div>
          <div class="col-6"><b>Status:</b><br><span class="pill purple">${esc(d.status)}</span></div>
        </div>
        <button class="primary-btn w-100 mt-4" onclick="downloadSlip(${id})">
          <i class="bi bi-download"></i> Download PDF E-Slip
        </button>
      </div>
    `);
  } catch (e) {
    toast(e.message);
  }
}

async function downloadSlip(id) {
  try {
    const response = await fetch(API_BASE + `/slips/${id}/pdf`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) return toast("Could not download E-Slip");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `querly-eslip-${id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    toast(e.message);
  }
}

async function openReport(id) {
  try {
    const report = await api(`/patient/report/${id}`);
    showModal(`
      <button class="close" onclick="closeModal()">×</button>
      <div class="detail-modal">
        <span class="eyebrow">CONSULTATION REPORT</span>
        <h3>${esc(report.doctor)}</h3>
        <p>${esc(report.specialization)} · ${esc(report.hospital)}</p>
        <div class="detail-list">
          <div><small>Symptoms</small><strong>${esc(report.symptoms || "Not provided")}</strong></div>
          <div><small>Diagnosis</small><strong>${esc(report.diagnosis || "Not recorded")}</strong></div>
          <div><small>Doctor Notes</small><strong>${esc(report.notes || "Not recorded")}</strong></div>
          <div><small>Prescription</small><strong>${esc(report.prescription || "Not recorded")}</strong></div>
          <div><small>Follow-up</small><strong>${esc(report.followup_date || "Not scheduled")}</strong></div>
        </div>
        <button class="primary-btn w-100 mt-3" onclick="downloadReport(${id})">
          <i class="bi bi-download"></i> Download Full Consultation PDF
        </button>
      </div>
    `);
  } catch (e) {
    toast(e.message);
  }
}

async function downloadReport(id) {
  try {
    const response = await fetch(API_BASE + `/slips/${id}/report.pdf`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) return toast("Could not download report");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `querly-report-${id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    toast(e.message);
  }
}

async function cancelAppointment(id, status) {
  const nonRemovable = ["checked_in", "called", "ongoing", "in_consultation", "serving", "completed"];
  if (nonRemovable.includes(status)) {
    return toast("Ongoing and completed appointments cannot be removed.");
  }
  if (!confirm("Are you sure you want to cancel this appointment?")) return;
  try {
    const r = await api(`/patient/appointments/${id}`, { method: "DELETE" });
    toast(r.message || "Appointment removed successfully");
    closeModal();
    if (window.renderPatientView) window.renderPatientView();
  } catch (e) {
    toast(e.message);
  }
}

window.renderAppointments = renderAppointments;
window.renderHistory = renderHistory;
window.checkIn = checkIn;
window.openAppointmentDetails = openAppointmentDetails;
window.openSlip = openSlip;
window.downloadSlip = downloadSlip;
window.openReport = openReport;
window.downloadReport = downloadReport;
window.cancelAppointment = cancelAppointment;
window.clearTemporaryAppointmentTimer = clearTemporaryAppointmentTimer;
