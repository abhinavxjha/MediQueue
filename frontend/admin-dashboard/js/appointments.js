async function renderAdminAppointments(c) {
  c.innerHTML = '<div class="section-title"><i class="bi bi-calendar-check"></i> System Appointments Log</div><div class="empty">Loading appointments log...</div>';
  try {
    // Obtain queue records and logs to show all hospital appointments
    const logs = await api("/hospital/logs");
    c.innerHTML = `
      <div class="section-title"><i class="bi bi-calendar-check"></i> Hospital-Wide Appointments Log</div>
      <div class="panel">
        <p class="text-muted small mb-3">Complete overview of patient bookings, queue progression, and consultation statuses.</p>
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient Name</th>
                <th>Consulting Doctor</th>
                <th>Registered Check-In</th>
                <th>Consultation Started</th>
                <th>Consultation Finished</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map((item) => `
                <tr>
                  <td><b class="token-pill">${esc(item.token_no)}</b></td>
                  <td><b>${esc(item.patient_name)}</b></td>
                  <td>${esc(item.doctor_name)}</td>
                  <td><small>${item.checked_in_time}</small></td>
                  <td><small class="fw-semibold text-teal">${item.ongoing_start_time}</small></td>
                  <td><small class="text-success">${item.completed_end_time}</small></td>
                  <td>
                    <span class="pill ${item.status === 'completed' ? 'green' : (item.status === 'called' ? 'green blinking' : 'orange')}">
                      ${esc(item.status.toUpperCase())}
                    </span>
                  </td>
                </tr>
              `).join("") || '<tr><td colspan="7" class="text-center py-4 text-muted">No appointments found in the system log.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    c.innerHTML = `<div class="panel empty">${esc(e.message)}</div>`;
  }
}

window.renderAdminAppointments = renderAdminAppointments;
