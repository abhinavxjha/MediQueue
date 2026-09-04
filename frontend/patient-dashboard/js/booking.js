async function renderBooking(c, departmentId = null, query = null) {
  let url = "/patient/doctors";
  const params = [];
  if (departmentId) params.push(`department_id=${departmentId}`);
  if (query) params.push(`q=${encodeURIComponent(query)}`);
  if (params.length) url += `?${params.join("&")}`;

  c.innerHTML = '<div class="section-title"><i class="bi bi-search"></i> Find a Doctor</div><div class="empty">Searching doctor catalog...</div>';
  
  try {
    const docs = await api(url);
    if (!docs.length) {
      c.innerHTML = `
        <div class="section-title"><i class="bi bi-search"></i> Find a Doctor</div>
        <div class="panel empty">No doctors found matching your criteria. Try adjusting your search.</div>
      `;
      return;
    }

    c.innerHTML = `
      <div class="section-title"><i class="bi bi-person-badge"></i> Find a Doctor</div>
      <div class="doctor-grid">
        ${docs.map((d) => {
          const initial = esc((d.name || "").replace(/^Dr\.\s*/i, "").trim()[0] || "D");
          return `
            <div class="doctor-card">
              <div class="doctor-head">
                <div class="doc-avatar">${initial}</div>
                <div>
                  <h3>${esc(d.name)}</h3>
                  <p class="fw-semibold text-teal">${esc(d.specialization)}</p>
                  <p>${esc(d.department)} · ${esc(d.hospital)}</p>
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                <small class="text-muted">Consultation Fee</small>
                <b class="text-ink">₹${d.fee}</b>
              </div>
              <button class="book" onclick="chooseDoctor(${d.id}, '${esc(d.name)}')">
                <i class="bi bi-calendar-check me-1"></i> View Availability & Slots
              </button>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } catch (e) {
    c.innerHTML = `<div class="panel empty">${esc(e.message)}</div>`;
  }
}

async function renderHospitals(c) {
  c.innerHTML = '<div class="section-title"><i class="bi bi-hospital"></i> Hospitals Near You</div><div class="panel empty">Finding hospitals in network...</div>';
  try {
    const hospitals = await api("/patient/hospitals");
    c.innerHTML = `
      <div class="section-title"><i class="bi bi-hospital"></i> Hospitals & OPD Network</div>
      <div class="hospital-toolbar">
        <h2>Find trusted clinical care</h2>
        <p>Browse OPD departments and certified doctors connected to Querly.</p>
      </div>
      <div class="hospital-grid">
        ${hospitals.map((hospital) => {
          const doctorCount = hospital.departments.reduce((count, department) => count + department.doctors.length, 0);
          return `
            <article class="hospital-card">
              <div class="hospital-icon"><i class="bi bi-hospital"></i></div>
              <div class="hospital-card-body">
                <div class="hospital-card-heading">
                  <h3>${esc(hospital.name)}</h3>
                  <span class="hospital-rating">${esc(hospital.city)}</span>
                </div>
                <p class="hospital-address"><i class="bi bi-geo-alt"></i> ${esc(hospital.address)}</p>
                <div class="hospital-meta">
                  <span><i class="bi bi-people"></i> ${doctorCount} doctors</span>
                  <span><i class="bi bi-building"></i> ${hospital.departments.length} departments</span>
                </div>
                <div class="hospital-departments">
                  ${hospital.departments.map((department) => `
                    <button class="btn btn-sm btn-outline-primary" onclick="goToDepartment(${department.id})">
                      ${esc(department.name)} (${department.doctors.length})
                    </button>
                  `).join("")}
                </div>
                <div class="mt-2">
                  <a class="hospital-directions" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + " " + hospital.address)}" target="_blank" rel="noopener">
                    <i class="bi bi-arrow-up-right-circle"></i> Get directions
                  </a>
                  <div class="text-muted small mt-1">${esc(hospital.phone || "")} · ${esc(hospital.email || "")}</div>
                </div>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  } catch (e) {
    c.innerHTML = `<div class="panel empty">${esc(e.message)}</div>`;
  }
}

function goToDepartment(departmentId) {
  if (window.setActivePage) {
    window.setActivePage("doctors", departmentId);
  }
}

async function chooseDoctor(id, name) {
  const dateStr = getLocalDateStr();
  try {
    const slots = await api(`/patient/slots?doctor_id=${id}&selected_date=${dateStr}`);
    showModal(`
      <button class="close" onclick="closeModal()">×</button>
      <span class="eyebrow">SLOT BOOKING</span>
      <h3>Book with ${esc(name)}</h3>
      <p class="text-muted small">Date: ${dateStr} · Provide symptoms to assist your attending doctor</p>
      
      <div class="form-group my-3">
        <label for="symptoms" class="fw-bold small">Symptoms / Chief Complaint</label>
        <textarea id="symptoms" class="form-control" maxlength="2000" rows="3" placeholder="Example: headache, mild fever since yesterday..."></textarea>
      </div>
      
      <label class="fw-bold small mb-2 d-block">Available Time Slots</label>
      <div class="slot-list">
        ${slots.map((s) => `
          <button class="slot ${s.available ? "" : "disabled"}" ${s.available ? "" : "disabled"} onclick="book(${id}, ${s.id})">
            ${s.start_time} · ${s.booked_count}/${s.max_patients}
          </button>
        `).join("") || '<div class="empty py-2">No slots available today.</div>'}
      </div>
    `);
  } catch (e) {
    toast(e.message);
  }
}

async function book(doctorId, slotId) {
  try {
    const r = await api("/patient/appointments", {
      method: "POST",
      body: JSON.stringify({
        doctor_id: doctorId,
        slot_id: slotId,
        symptoms: $("#symptoms")?.value.trim() || null,
      }),
    });
    closeModal();
    toast(`Appointment booked! Your Token is ${r.token}`);
    if (window.setActivePage) {
      window.setActivePage("appointments");
    }
  } catch (e) {
    toast(e.message);
  }
}

window.renderBooking = renderBooking;
window.renderHospitals = renderHospitals;
window.goToDepartment = goToDepartment;
window.chooseDoctor = chooseDoctor;
window.book = book;
