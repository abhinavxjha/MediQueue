async function renderAdminDoctors(c) {
  c.innerHTML = '<div class="section-title"><i class="bi bi-person-badge"></i> Hospital Doctors Directory</div><div class="empty">Loading doctors catalog...</div>';
  try {
    const doctors = await api("/admin/doctors");
    if (!doctors.length) {
      c.innerHTML = `
        <div class="section-title"><i class="bi bi-person-badge"></i> Hospital Doctors Directory</div>
        <div class="panel empty">No doctors currently registered in the hospital network.</div>
      `;
      return;
    }

    c.innerHTML = `
      <div class="section-title"><i class="bi bi-person-badge"></i> Hospital Doctors Directory</div>
      <div class="panel">
        <p class="text-muted small mb-3">Comprehensive catalog of registered consulting physicians, departments, and consultation fees.</p>
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Doctor Name</th>
                <th>Specialization</th>
                <th>Department</th>
                <th>Hospital</th>
                <th>Fee</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${doctors.map((d) => `
                <tr>
                  <td>
                    <b>${esc(d.name)}</b>
                  </td>
                  <td><span class="text-teal fw-semibold">${esc(d.specialization)}</span></td>
                  <td>${esc(d.department)}</td>
                  <td>${esc(d.hospital)}</td>
                  <td><b>₹${d.fee}</b></td>
                  <td>
                    <span class="pill ${d.available ? 'green' : 'orange'}">
                      ${d.available ? 'Available' : 'Off-Duty'}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="if (window.setActivePage) window.setActivePage('schedule')">
                      <i class="bi bi-calendar3 me-1"></i> Edit Schedule
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    c.innerHTML = `<div class="panel empty">${esc(e.message)}</div>`;
  }
}

window.renderAdminDoctors = renderAdminDoctors;
