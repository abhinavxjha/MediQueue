let cachedDoctorSchedules = [];

async function renderDoctorSchedules(c) {
  c.innerHTML = '<div class="section-title"><i class="bi bi-calendar3"></i> Doctor Availability &amp; Weekly Working Schedule</div><div class="empty">Loading schedules...</div>';
  try {
    const doctors = await api("/hospital/doctors");
    cachedDoctorSchedules = doctors;

    const dayLabels = {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
    };

    c.innerHTML = `
      <div class="section-title"><i class="bi bi-calendar3"></i> Doctor Availability &amp; Weekly Working Schedule</div>
      <div class="panel">
        <p class="text-muted small mb-4">Manage the active working days and duty status of each physician. Updating working days dynamically controls patient slot booking in the OPD catalog.</p>
        <div class="row g-4">
          ${doctors.map((d) => {
            const sched = d.weekly_schedule || {
              monday: true,
              tuesday: true,
              wednesday: true,
              thursday: true,
              friday: true,
              saturday: true,
              sunday: false,
            };

            return `
              <div class="col-md-6">
                <div class="doctor-schedule-card">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <h5 class="mb-0 fw-bold" style="color:var(--primary-dark)">${esc(d.name)}</h5>
                      <small class="text-muted">${esc(d.specialization)} · ${esc(d.department_name)}</small>
                    </div>
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" id="avail_${d.id}" ${d.is_available ? 'checked' : ''} onchange="toggleDoctorMaster(${d.id})">
                      <label class="form-check-label fw-bold small ms-1" for="avail_${d.id}">
                        ${d.is_available ? '<span class="text-success">Available</span>' : '<span class="text-danger">Off-Duty</span>'}
                      </label>
                    </div>
                  </div>

                  <div class="mb-3 p-2 rounded" style="background:var(--surface-soft);font-size:12px">
                    <span class="text-muted">Avg OPD Consultation Duration:</span> <b style="color:var(--primary-dark)">${d.avg_consultation_time_min} mins/patient</b>
                  </div>

                  <label class="small fw-bold mb-1">Working Days Schedule</label>
                  <div class="day-btn-group">
                    ${Object.keys(dayLabels).map((day) => `
                      <button class="day-btn ${sched[day] ? 'active' : ''}" onclick="toggleDoctorDay(${d.id}, '${day}')">
                        ${dayLabels[day]} ${sched[day] ? '✓' : '✗'}
                      </button>
                    `).join("")}
                  </div>

                  <button class="primary-btn mt-2 w-100" onclick="saveDoctorSchedule(${d.id})">
                    <i class="bi bi-check2-circle me-1"></i> Save Schedule &amp; Availability
                  </button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  } catch (e) {
    c.innerHTML = `<div class="panel empty">${esc(e.message)}</div>`;
  }
}

function toggleDoctorDay(doctorId, day) {
  const doc = (cachedDoctorSchedules || []).find((d) => d.id === doctorId);
  if (doc) {
    if (!doc.weekly_schedule) {
      doc.weekly_schedule = {
        monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false
      };
    }
    doc.weekly_schedule[day] = !doc.weekly_schedule[day];
    renderDoctorSchedules($("#content"));
  }
}

function toggleDoctorMaster(doctorId) {
  const doc = (cachedDoctorSchedules || []).find((d) => d.id === doctorId);
  if (doc) {
    doc.is_available = $(`#avail_${doctorId}`)?.checked ?? !doc.is_available;
    const label = $(`label[for="avail_${doctorId}"]`);
    if (label) {
      label.innerHTML = doc.is_available ? '<span class="text-success">Available</span>' : '<span class="text-danger">Off-Duty</span>';
    }
  }
}

async function saveDoctorSchedule(doctorId) {
  const doctor = (cachedDoctorSchedules || []).find((d) => d.id === doctorId);
  const isAvailable = $(`#avail_${doctorId}`)?.checked ?? true;
  const weekly_schedule = doctor ? doctor.weekly_schedule : {
    monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false
  };

  try {
    await api(`/hospital/doctors/${doctorId}/schedule`, {
      method: "POST",
      body: JSON.stringify({ is_available: isAvailable, weekly_schedule }),
    });
    toast("Doctor schedule and working days saved!");
    if (window.renderAdminView) window.renderAdminView();
  } catch (e) {
    toast(e.message);
  }
}

window.renderDoctorSchedules = renderDoctorSchedules;
window.toggleDoctorDay = toggleDoctorDay;
window.toggleDoctorMaster = toggleDoctorMaster;
window.saveDoctorSchedule = saveDoctorSchedule;
