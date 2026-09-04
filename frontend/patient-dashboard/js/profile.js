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
  const user = getCurrentUser() || {};
  const title = mode === "onboarding" ? "Complete Your Profile" : "Edit Profile";
  const sub = mode === "onboarding" ? "Help us keep your Querly patient profile up to date." : "Update your personal and emergency contact information.";
  const closeBtn = mode === "onboarding" ? "" : `<button class="close" onclick="closeModal()">&times;</button>`;

  return `
    ${closeBtn}
    <h3><i class="bi bi-person-fill text-teal me-2"></i>${title}</h3>
    <p class="text-muted small">${sub}</p>
    
    <div class="section-title" style="margin:18px 0 10px">Personal Information</div>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="small fw-bold">Full Name</label>
        <input id="pfName" class="form-control" value="${esc(p.full_name || user.name || "")}" required>
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Date of Birth</label>
        <input id="pfDob" type="date" class="form-control" max="${new Date().toISOString().slice(0, 10)}" value="${esc(p.date_of_birth || "")}" required>
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Sex</label>
        <select id="pfSex" class="form-control" required>
          <option value="">Select</option>
          ${Object.entries(SEX_LABELS).map(([v, l]) => `<option value="${v}" ${p.sex === v ? "selected" : ""}>${l}</option>`).join("")}
        </select>
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Blood Group</label>
        <select id="pfBlood" class="form-control">
          <option value="">Unknown / Not specified</option>
          ${BLOOD_GROUPS.map((v) => `<option value="${v}" ${p.blood_group === v ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </div>
    </div>

    <div class="section-title" style="margin:18px 0 10px">Contact Information</div>
    <div class="row g-3">
      <div class="col-12">
        <label class="small fw-bold">Phone Number</label>
        <input id="pfPhone" class="form-control" value="${esc(p.phone || user.phone || "")}" placeholder="+91 9876543210" required>
      </div>
      <div class="col-12">
        <label class="small fw-bold">Address</label>
        <input id="pfAddress" class="form-control" value="${esc(p.address || "")}" placeholder="Street, Apartment / House No.">
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">City</label>
        <input id="pfCity" class="form-control" value="${esc(p.city || "")}" placeholder="City">
      </div>
    </div>

    <div class="section-title" style="margin:18px 0 10px">Emergency Contact</div>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="small fw-bold">Contact Name</label>
        <input id="pfEmName" class="form-control" value="${esc(p.emergency_contact_name || "")}">
      </div>
      <div class="col-md-6">
        <label class="small fw-bold">Contact Phone</label>
        <input id="pfEmPhone" class="form-control" value="${esc(p.emergency_contact_phone || "")}">
      </div>
    </div>

    <button class="primary-btn mt-4 w-100" onclick="saveProfile('${mode}')">
      ${mode === "onboarding" ? "Save &amp; Continue" : "Save Changes"}
    </button>
  `;
}

function profileViewHTML(p) {
  const user = getCurrentUser() || {};
  const field = (label, value, wide) => `
    <div class="${wide ? "col-12" : "col-md-6"}">
      <label class="small fw-bold text-muted">${label}</label>
      <div class="form-control" style="background:#f1f5f9;color:var(--ink);cursor:default;font-weight:600">${esc(value || "—")}</div>
    </div>
  `;

  return `
    <button class="close" onclick="closeModal()">&times;</button>
    <h3><i class="bi bi-person-circle text-teal me-2"></i>My Health Profile</h3>
    <p class="text-muted small">Your registered patient details and emergency contact.</p>
    
    <div class="section-title" style="margin:18px 0 10px">Personal Information</div>
    <div class="row g-3">
      ${field("Full Name", p.full_name || user.name)}
      ${field("Date of Birth", p.date_of_birth)}
      ${field("Sex", SEX_LABELS[p.sex] || p.sex)}
      ${field("Blood Group", p.blood_group)}
    </div>

    <div class="section-title" style="margin:18px 0 10px">Contact Information</div>
    <div class="row g-3">
      ${field("Phone Number", p.phone || user.phone, true)}
      ${field("Address", p.address, true)}
      ${field("City", p.city)}
    </div>

    <div class="section-title" style="margin:18px 0 10px">Emergency Contact</div>
    <div class="row g-3">
      ${field("Contact Name", p.emergency_contact_name)}
      ${field("Contact Phone", p.emergency_contact_phone)}
    </div>

    <button class="primary-btn mt-4 w-100" onclick="closeModal(); openProfileModal('edit')">
      <i class="bi bi-pencil-square me-1"></i> Edit Profile
    </button>
  `;
}

async function saveProfile(mode) {
  const name = $("#pfName").value.trim();
  const dob = $("#pfDob").value;
  const sex = $("#pfSex").value;
  const phone = $("#pfPhone").value.trim();
  const emPhone = $("#pfEmPhone").value.trim();

  if (!name) return toast("Full name is required");
  if (!dob) return toast("Date of birth is required");
  if (new Date(dob) > new Date()) return toast("Date of birth cannot be in the future");
  if (!sex) return toast("Please select your sex");
  if (!PHONE_RE.test(phone)) return toast("Enter a valid phone number");
  if (emPhone && !PHONE_RE.test(emPhone)) return toast("Enter a valid emergency contact phone");

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

    const user = getCurrentUser() || {};
    user.name = name;
    user.phone = phone;
    setCurrentUser(user);

    const userNameEl = $("#userName");
    const avatarEl = $("#avatar");
    if (userNameEl) userNameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = name[0].toUpperCase();

    closeModal();
    toast(mode === "onboarding" ? "Profile setup complete!" : "Profile updated successfully");
    if (window.renderPatientView) window.renderPatientView();
  } catch (e) {
    toast(e.message);
  }
}

window.openProfileModal = openProfileModal;
window.saveProfile = saveProfile;
