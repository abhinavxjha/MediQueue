async function renderSlots(c) {
  c.innerHTML = '<div class="section-title"><i class="bi bi-clock"></i> Manage Consultation Slots</div><div class="empty">Loading slots...</div>';
  
  const todayStr = getLocalDateStr();
  
  c.innerHTML = `
    <div class="section-title"><i class="bi bi-clock"></i> Manage Consultation Slots</div>
    <div class="slot-create-panel">
      <h5 class="fw-bold mb-3"><i class="bi bi-plus-circle text-teal me-2"></i>Create New OPD Time Slot</h5>
      <div class="row g-3">
        <div class="col-md-3">
          <label class="small fw-bold">Date</label>
          <input id="slotDate" class="form-control" type="date" value="${todayStr}" min="${todayStr}">
        </div>
        <div class="col-md-3">
          <label class="small fw-bold">Start Time</label>
          <input id="slotStart" class="form-control" type="time" value="10:00">
        </div>
        <div class="col-md-3">
          <label class="small fw-bold">End Time</label>
          <input id="slotEnd" class="form-control" type="time" value="10:30">
        </div>
        <div class="col-md-3">
          <label class="small fw-bold">Patient Capacity</label>
          <input id="slotCap" class="form-control" type="number" value="10" min="1" max="50">
        </div>
      </div>
      <button class="primary-btn mt-3" onclick="addSlot()">
        <i class="bi bi-plus-lg me-1"></i> Create Time Slot
      </button>
    </div>
  `;
}

async function addSlot() {
  const date = $("#slotDate")?.value;
  const startTime = $("#slotStart")?.value;
  const endTime = $("#slotEnd")?.value;
  const maxPatients = Number($("#slotCap")?.value || 10);

  if (!date || !startTime || !endTime) {
    return toast("Please select date, start time, and end time");
  }

  try {
    await api("/doctor/slots", {
      method: "POST",
      body: JSON.stringify({
        date,
        start_time: startTime,
        end_time: endTime,
        max_patients: maxPatients,
      }),
    });
    toast("OPD Slot created successfully!");
    if (window.renderDoctorView) window.renderDoctorView();
  } catch (e) {
    toast(e.message);
  }
}

window.renderSlots = renderSlots;
window.addSlot = addSlot;
