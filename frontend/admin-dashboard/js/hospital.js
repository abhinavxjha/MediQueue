let cachedHospitalDoctors = [];

async function renderHospitalConsole(c) {
  c.innerHTML = '<div class="section-title"><i class="bi bi-hospital"></i> Live OPD Patient Queue Console</div><div class="empty">Loading console...</div>';
  try {
    const overview = await api("/hospital/overview");
    const queue = await api("/hospital/queue");
    const doctors = await api("/hospital/doctors");
    cachedHospitalDoctors = doctors;

    c.innerHTML = `
      <div class="hero">
        <div>
          <h1><i class="bi bi-hospital"></i> Hospital Management &amp; OPD Console</h1>
          <p>Live OPD patient queue orchestration, check-in timestamps, consultation duration tracking, and clinical status.</p>
        </div>
      </div>

      <div class="admin-kpi-grid">
        <div class="stat-card">
          <span>Patients Waiting in Line</span>
          <strong style="color:var(--orange)">${overview.queue_stats.waiting}</strong>
          <div class="trend">Pending consultation</div>
        </div>
        <div class="stat-card">
          <span>Ongoing Consultations</span>
          <strong style="color:var(--primary)" class="blinking-text">${overview.queue_stats.ongoing}</strong>
          <div class="trend">Currently in doctor room</div>
        </div>
        <div class="stat-card">
          <span>Completed Today</span>
          <strong style="color:var(--green)">${overview.queue_stats.completed}</strong>
          <div class="trend">Finished consultations</div>
        </div>
        <div class="stat-card">
          <span>Real-time Avg Consultation</span>
          <strong style="color:var(--primary-dark)">${overview.queue_stats.avg_duration_minutes} min</strong>
          <div class="trend">Per patient session</div>
        </div>
      </div>

      <div class="section-title"><i class="bi bi-list-task"></i> Live OPD Patient Queue Management</div>
      <div class="panel">
        <div class="hosp-desk-toolbar">
          <div class="hosp-filter-group">
            <label class="small fw-bold">Filter by Doctor:</label>
            <select id="hospFilterDoctor" class="form-select form-select-sm" style="width:230px" onchange="renderHospitalFilteredQueue()">
              <option value="">All Consulting Doctors</option>
              ${doctors.map((d) => `<option value="${d.id}">${esc(d.name)} (${esc(d.department_name)})</option>`).join("")}
            </select>
          </div>
          <button class="primary-btn" style="padding:8px 16px;font-size:13px" onclick="if (window.renderAdminView) window.renderAdminView()">
            <i class="bi bi-arrow-clockwise"></i> Refresh Status
          </button>
        </div>

        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient Details</th>
                <th>Doctor &amp; OPD</th>
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
  } catch (e) {
    c.innerHTML = `<div class="panel empty">${esc(e.message)}</div>`;
  }
}

function renderHospTableRows(queue) {
  if (!queue || !queue.length) {
    return '<tr><td colspan="9" class="text-center py-4 text-muted">No patient tickets currently in OPD queue.</td></tr>';
  }

  return queue.map((q) => {
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
          <small class="text-muted">${esc(q.symptoms || "Routine OPD checkup")}</small>
        </td>
        <td>
          <b>${esc(q.doctor_name)}</b><br>
          <small class="text-muted">${esc(q.department_name)}</small>
        </td>
        <td><small>${q.checked_in_time || '—'}</small></td>
        <td><small class="${isOngoing ? 'fw-bold text-teal' : ''}">${q.called_time || '—'}</small></td>
        <td><small>${q.completed_time || '—'}</small></td>
        <td><span class="badge bg-light text-dark">${durText}</span></td>
        <td>
          ${isOngoing ? '<span class="pill green blinking"><i class="bi bi-broadcast"></i> ONGOING</span>' :
            isCompleted ? '<span class="pill green"><i class="bi bi-check2"></i> COMPLETED</span>' :
            '<span class="pill orange">WAITING</span>'}
        </td>
        <td>
          <div class="d-flex gap-1">
            ${isWaiting ? `
              <button class="btn btn-sm btn-teal" style="font-size:11px;padding:4px 8px" onclick="markOngoing(${q.queue_id})">
                <i class="bi bi-play-fill"></i> Mark Ongoing
              </button>
            ` : ''}
            ${isOngoing ? `
              <button class="btn btn-sm btn-success" style="font-size:11px;padding:4px 8px" onclick="markCompleted(${q.queue_id})">
                <i class="bi bi-check-circle-fill"></i> Complete
              </button>
            ` : ''}
            ${!isCompleted ? `
              <button class="btn btn-sm btn-outline-danger" style="font-size:11px;padding:4px 6px" onclick="cancelQueue(${q.queue_id})" title="Cancel ticket">
                <i class="bi bi-x-lg"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function renderHospitalFilteredQueue() {
  const docId = $("#hospFilterDoctor")?.value;
  const path = docId ? `/hospital/queue?doctor_id=${docId}` : "/hospital/queue";
  try {
    const queue = await api(path);
    const tbody = $("#hospQueueTbody");
    if (tbody) tbody.innerHTML = renderHospTableRows(queue);
  } catch (e) {
    toast(e.message);
  }
}

async function markOngoing(queueId) {
  try {
    const res = await api(`/hospital/queue/${queueId}/ongoing`, { method: "POST" });
    toast(`Ticket ${res.token_no} marked ONGOING`);
    if (window.renderAdminView) window.renderAdminView();
  } catch (e) {
    toast(e.message);
  }
}

async function markCompleted(queueId) {
  try {
    const res = await api(`/hospital/queue/${queueId}/complete`, { method: "POST" });
    toast(`Ticket ${res.token_no} marked COMPLETED (Duration: ${res.duration_minutes} mins)`);
    if (window.renderAdminView) window.renderAdminView();
  } catch (e) {
    toast(e.message);
  }
}

async function cancelQueue(queueId) {
  if (!confirm("Are you sure you want to cancel this queue ticket?")) return;
  try {
    await api(`/hospital/queue/${queueId}/cancel`, { method: "POST" });
    toast("Queue ticket cancelled");
    if (window.renderAdminView) window.renderAdminView();
  } catch (e) {
    toast(e.message);
  }
}

async function renderTimeLogs(c) {
  c.innerHTML = '<div class="section-title"><i class="bi bi-stopwatch"></i> Patient Consultation Timestamps &amp; Duration Logs</div><div class="empty">Loading timestamps...</div>';
  try {
    const logs = await api("/hospital/logs");
    c.innerHTML = `
      <div class="section-title"><i class="bi bi-stopwatch"></i> Patient Consultation Timestamps &amp; Duration Logs</div>
      <div class="panel">
        <p class="text-muted small mb-3">Audit trail of exact patient check-in, ongoing consultation starts, and completed finish times recorded by clinical staff.</p>
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Check-In Time</th>
                <th>Ongoing Start</th>
                <th>Completed Finish</th>
                <th>Wait Time</th>
                <th>Consultation Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map((l) => `
                <tr>
                  <td><b class="token-pill">${esc(l.token_no)}</b></td>
                  <td><b>${esc(l.patient_name)}</b></td>
                  <td>${esc(l.doctor_name)}</td>
                  <td><small>${l.checked_in_time}</small></td>
                  <td><small class="fw-bold text-teal">${l.ongoing_start_time}</small></td>
                  <td><small class="text-success">${l.completed_end_time}</small></td>
                  <td><span class="badge bg-light text-dark">${l.total_wait_minutes !== "—" ? l.total_wait_minutes + " mins" : "—"}</span></td>
                  <td><b style="color:var(--primary-dark)">${l.consultation_duration_minutes !== "—" ? l.consultation_duration_minutes + " mins" : "—"}</b></td>
                  <td><span class="pill ${l.status === 'completed' ? 'green' : (l.status === 'called' ? 'green blinking' : 'orange')}">${esc(l.status.toUpperCase())}</span></td>
                </tr>
              `).join("") || '<tr><td colspan="9" class="text-center text-muted py-4">No timestamp records found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    c.innerHTML = `<div class="panel empty">${esc(e.message)}</div>`;
  }
}

window.renderHospitalConsole = renderHospitalConsole;
window.renderHospTableRows = renderHospTableRows;
window.renderHospitalFilteredQueue = renderHospitalFilteredQueue;
window.markOngoing = markOngoing;
window.markCompleted = markCompleted;
window.cancelQueue = cancelQueue;
window.renderTimeLogs = renderTimeLogs;
