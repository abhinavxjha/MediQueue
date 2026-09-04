async function openDoctorProfileModal(mode = "edit") {
  let p = {};
  let hospitals = [];
  try {
    p = await api("/doctor/profile");
  } catch (e) {
    p = {};
  }
  try {
    hospitals = await api("/patient/hospitals");
  } catch (e) {
    hospitals = [];
  }
  showModal(doctorProfileModalHTML(mode, p, hospitals));
}

function doctorProfileModalHTML(mode, p, hospitals) {
  if (mode === "view") return doctorProfileViewHTML(p);
  const user = getCurrentUser() || {};
  const title = mode === "onboarding" ? "Complete Your Doctor Profile" : "Edit Doctor Profile";
  const sub = mode === "onboarding"
    ? "Welcome to Querly! Please specify your practice details, hospital, department, and consultation fee."
    : "Update your clinical practice information shown to patients.";
  const closeBtn = mode === "onboarding" ? "" : `<button class="close" onclick="closeModal()">&times;</button>`;

  let deptOptions = [];
  if (hospitals && hospitals.length) {
    hospitals.forEach(h => {
      if (h.departments) {
        h.departments.forEach(d => {
          deptOptions.push({ id: d.id, name: `${d.name} (${h.name})` });
        });
      }
    });
  }
  if (!deptOptions.length) {
    deptOptions = [
      { id: 1, name: "General Medicine" },
      { id: 2, name: "Cardiology" },
      { id: 3, name: "Orthopedics" },
      { id: 4, name: "Pediatrics" },
    ];
  }

  return `
    ${closeBtn}
    <span class="eyebrow">DOCTOR CREDENTIALS</span>
    <h3><i class="bi bi-person-badge-fill text-teal me-2"></i>${title}</h3>
    <p class="text-muted small">${sub}</p>
    
    <div class="section-title" style="margin:18px 0 10px">Doctor Information</div>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="small fw-bold">Full Name</label>
        <input id="docPfName" class="form-control" value="${esc(p.name || user.name || "")}" required>
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Phone Number</label>
        <input id="docPfPhone" class="form-control" value="${esc(p.phone || user.phone || "")}" placeholder="+91 9876543210" required>
      </div>
    </div>

    <div class="section-title" style="margin:18px 0 10px">Hospital &amp; Department</div>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="small fw-bold">Affiliated Hospital</label>
        <select id="docPfHospital" class="form-control" required>
          ${hospitals && hospitals.length ? hospitals.map(h => `<option value="${h.id}" ${p.hospital_id === h.id ? 'selected' : ''}>${esc(h.name)} - ${esc(h.city)}</option>`).join("") : '<option value="1">City Care Hospital - Metro</option>'}
        </select>
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Department</label>
        <select id="docPfDept" class="form-control" required>
          ${deptOptions.map(d => `<option value="${d.id}" ${p.department_id === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join("")}
        </select>
      </div>
    </div>

    <div class="section-title" style="margin:18px 0 10px">Practice &amp; Fee Details</div>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="small fw-bold">Specialization</label>
        <input id="docPfSpec" class="form-control" value="${esc(p.specialization || "General Medicine")}" placeholder="e.g. Cardiology, Neurology" required>
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Consultation Fee (₹)</label>
        <input id="docPfFee" type="number" class="form-control" value="${p.consultation_fee || 500}" min="0" required>
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Qualifications</label>
        <input id="docPfQual" class="form-control" value="${esc(p.qualification || "MBBS, MD")}" placeholder="e.g. MBBS, MD - Internal Medicine">
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Years of Experience</label>
        <input id="docPfExp" type="number" class="form-control" value="${p.experience_years || 5}" min="0" max="70">
      </div>
      <div class="col-12">
        <label class="small fw-bold">Bio / Practice Summary</label>
        <textarea id="docPfBio" class="form-control" rows="2" placeholder="Brief clinical background and focus areas...">${esc(p.bio || "")}</textarea>
      </div>
    </div>

    <button class="primary-btn mt-4 w-100" onclick="saveDoctorProfile('${mode}')">
      ${mode === "onboarding" ? "Save &amp; Continue" : "Save Changes"}
    </button>
  `;
}

function doctorProfileViewHTML(p) {
  const user = getCurrentUser() || {};
  const field = (label, value, wide) => `
    <div class="${wide ? "col-12" : "col-md-6"}">
      <label class="small fw-bold text-muted">${label}</label>
      <div class="form-control" style="background:#f1f5f9;color:var(--ink);cursor:default;font-weight:600">${esc(value || "—")}</div>
    </div>
  `;

  return `
    <button class="close" onclick="closeModal()">&times;</button>
    <span class="eyebrow">DOCTOR CREDENTIALS</span>
    <h3><i class="bi bi-person-badge-fill text-teal me-2"></i>Doctor Profile</h3>
    <p class="text-muted small">Your medical practice and hospital affiliation details.</p>
    
    <div class="section-title" style="margin:18px 0 10px">Doctor Information</div>
    <div class="row g-3">
      ${field("Full Name", p.name || user.name)}
      ${field("Phone Number", p.phone || user.phone)}
    </div>
    
    <div class="section-title" style="margin:18px 0 10px">Hospital &amp; Department</div>
    <div class="row g-3">
      ${field("Hospital", p.hospital_name)}
      ${field("Department", p.department_name)}
    </div>

    <div class="section-title" style="margin:18px 0 10px">Practice Details</div>
    <div class="row g-3">
      ${field("Specialization", p.specialization)}
      ${field("Consultation Fee", "₹" + (p.consultation_fee || 500))}
      ${field("Qualifications", p.qualification)}
      ${field("Experience", (p.experience_years || 5) + " Years")}
      ${field("Bio Summary", p.bio, true)}
    </div>
    
    <button class="primary-btn mt-4 w-100" onclick="closeModal(); openDoctorProfileModal('edit')">
      <i class="bi bi-pencil-square me-1"></i> Edit Profile
    </button>
  `;
}

async function saveDoctorProfile(mode) {
  const name = $("#docPfName").value.trim();
  const phone = $("#docPfPhone").value.trim();
  const hospId = parseInt($("#docPfHospital").value, 10);
  const deptId = parseInt($("#docPfDept").value, 10);
  const spec = $("#docPfSpec").value.trim();
  const fee = parseFloat($("#docPfFee").value);

  if (!name) return toast("Full name is required");
  if (!phone) return toast("Phone number is required");
  if (!spec) return toast("Specialization is required");
  if (isNaN(fee) || fee < 0) return toast("Enter a valid consultation fee");

  const payload = {
    name,
    phone,
    hospital_id: hospId || 1,
    department_id: deptId || 1,
    specialization: spec,
    consultation_fee: fee,
    qualification: $("#docPfQual").value.trim() || null,
    experience_years: parseInt($("#docPfExp").value, 10) || 5,
    bio: $("#docPfBio").value.trim() || null,
  };

  try {
    await api("/doctor/profile", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const user = getCurrentUser() || {};
    user.name = name;
    user.phone = phone;
    setCurrentUser(user);

    const userNameEl = $("#userName");
    const avatarEl = $("#avatar");
    if (userNameEl) userNameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = (name || "D")[0].toUpperCase();

    closeModal();
    toast(mode === "onboarding" ? "Doctor profile completed!" : "Profile updated successfully");
    if (window.renderDoctorView) window.renderDoctorView();
  } catch (e) {
    toast(e.message);
  }
}

window.openDoctorProfileModal = openDoctorProfileModal;
window.saveDoctorProfile = saveDoctorProfile;
