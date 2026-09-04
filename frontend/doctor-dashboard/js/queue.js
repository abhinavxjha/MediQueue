function queueTable(rows, isQueue) {
  if (!rows || !rows.length) {
    return '<div class="empty py-4">No active patient appointments found in this section.</div>';
  }

  return `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Patient Name</th>
            <th>Phone</th>
            <th>Symptoms / Chief Complaint</th>
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
              <tr class="${isOngoing ? 'table-active-row' : ''}">
                <td><b class="token-pill">${esc(r.token || r.token_no)}</b></td>
                <td>
                  <b>${esc(r.patient_name || r.name)}</b>
                  ${isOngoing ? '<span class="badge bg-primary ms-2">IN CONSULTATION</span>' : ''}
                </td>
                <td>${esc(r.patient_phone || "—")}</td>
                <td><small class="text-muted">${esc(r.symptoms || "Standard OPD Consultation")}</small></td>
                <td>
                  <span class="pill ${status === 'completed' ? 'green' : (status === 'called' ? 'orange blinking' : (status === 'ongoing' ? 'orange' : 'purple'))}">
                    ${status.replace("_", " ")}
                  </span>
                </td>
                <td>
                  ${!isDone && !isOngoing ? `
                    <button class="btn btn-sm btn-teal me-1" onclick="markDoctorOngoing(${targetId})">
                      <i class="bi bi-play-circle me-1"></i> Start
                    </button>
                  ` : ''}
                  ${isOngoing ? `
                    <button class="btn btn-sm btn-success" onclick="completePatient(${targetId})">
                      <i class="bi bi-check-circle-fill me-1"></i> Complete
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
    </div>
  `;
}

async function markDoctorOngoing(id) {
  try {
    const r = await api(`/doctor/queue/${id}/ongoing`, { method: "POST" });
    toast(r.message || "Patient marked as ONGOING");
    if (window.renderDoctorView) window.renderDoctorView();
  } catch (e) {
    toast(e.message);
  }
}

async function nextPatient() {
  try {
    const r = await api("/doctor/queue/next", { method: "POST" });
    toast(`Now serving ${r.token}`);
    if (window.renderDoctorView) window.renderDoctorView();
  } catch (e) {
    toast(e.message);
  }
}

async function completePatient(id) {
  showModal(`
    <button class="close" onclick="closeModal()">×</button>
    <span class="eyebrow">CONSULTATION COMPLETION</span>
    <h3>Complete Patient Consultation</h3>
    <p class="text-muted small">Record diagnosis, clinical notes, and medication prescription for patient E-Slip & Report.</p>
    
    <div class="form-group mb-2">
      <label class="small fw-bold">Primary Diagnosis</label>
      <input id="diagnosis" class="form-control" placeholder="e.g. Acute viral rhinitis, essential hypertension" required />
    </div>

    <div class="form-group mb-2">
      <label class="small fw-bold">Clinical Notes / Observations</label>
      <textarea id="notes" class="form-control consult-modal-textarea" rows="3" placeholder="Clinical summary, vitals, test observations..."></textarea>
    </div>

    <div class="form-group mb-2">
      <label class="small fw-bold">Prescription / Medication Advice</label>
      <textarea id="prescription" class="form-control consult-modal-textarea" rows="3" placeholder="Medications, dosage, diet, and rest recommendations..."></textarea>
    </div>

    <div class="form-group mb-3">
      <label class="small fw-bold">Recommended Follow-up Date (Optional)</label>
      <input id="followupDate" type="date" class="form-control" min="${new Date().toISOString().slice(0, 10)}" />
    </div>

    <button class="primary-btn w-100" onclick="finishConsult(${id})">
      <i class="bi bi-check2-circle me-1"></i> Finalize & Complete Consultation
    </button>
  `);
}

async function finishConsult(id) {
  try {
    const diagnosis = $("#diagnosis")?.value.trim() || "Routine OPD checkup";
    const notes = $("#notes")?.value.trim() || "Consultation completed.";
    const prescription = $("#prescription")?.value.trim() || "Follow doctor advice.";
    const followupDate = $("#followupDate")?.value || null;

    await api("/doctor/queue/" + id + "/complete", {
      method: "POST",
      body: JSON.stringify({
        notes,
        diagnosis,
        prescription,
        followup_date: followupDate,
      }),
    });
    closeModal();
    toast("Consultation completed and report issued!");
    if (window.renderDoctorView) window.renderDoctorView();
  } catch (e) {
    toast(e.message);
  }
}

window.queueTable = queueTable;
window.markDoctorOngoing = markDoctorOngoing;
window.nextPatient = nextPatient;
window.completePatient = completePatient;
window.finishConsult = finishConsult;
