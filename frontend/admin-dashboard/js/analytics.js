async function renderAnalytics(c) {
  c.innerHTML = '<div class="section-title"><i class="bi bi-bar-chart-line"></i> OPD Operational Analytics</div><div class="empty">Loading analytics...</div>';
  try {
    const d = await api("/admin/dashboard");
    const maxDept = Math.max(...(d.department_breakdown || []).map((x) => x.count), 1);

    c.innerHTML = `
      <div class="hero">
        <div>
          <h1 class="hero-title"><i class="bi bi-bar-chart-line-fill"></i> OPD Performance</h1>
          <p>Real-time outpatient department KPIs, patient throughput volume, and predictive machine learning models.</p>
        </div>
      </div>

      <div class="section-title"><i class="bi bi-speedometer2"></i> Key Operational Metrics Today</div>
      <div class="admin-kpi-grid">
        <div class="stat-card">
          <span>Today's Total OPD Patients</span>
          <strong>${d.kpis.patients_today}</strong>
          <div class="trend">Hospital-wide total</div>
        </div>
        <div class="stat-card">
          <span>Completed Consultations</span>
          <strong style="color:var(--green)">${d.kpis.completed}</strong>
          <div class="trend">Doctor consultations done</div>
        </div>
        <div class="stat-card">
          <span>Patients In Waiting Queue</span>
          <strong style="color:var(--orange)">${d.kpis.waiting}</strong>
          <div class="trend">Current hospital backlog</div>
        </div>
        <div class="stat-card">
          <span>Calculated No-Show Rate</span>
          <strong style="color:var(--red)">${d.kpis.no_show_rate}%</strong>
          <div class="trend">Operational efficiency metric</div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-lg-6">
          <div class="panel h-100">
            <h5 class="fw-bold mb-3"><i class="bi bi-pie-chart text-teal me-2"></i>Patient Volume by Department</h5>
            <div class="dept-bar-list">
              ${(d.department_breakdown || []).map((item) => {
                const pct = Math.round((item.count / maxDept) * 100);
                return `
                  <div class="dept-bar-item">
                    <span class="dept-bar-label">${esc(item.department)}</span>
                    <div class="dept-bar-track">
                      <div class="dept-bar-fill" style="width:${pct}%"></div>
                    </div>
                    <span class="dept-bar-count">${item.count}</span>
                  </div>
                `;
              }).join("") || '<div class="empty py-3">No department consultation records logged today.</div>'}
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="panel h-100">
            <h5 class="fw-bold mb-3"><i class="bi bi-cpu text-teal me-2"></i>Active Machine Learning Models</h5>
            <div class="d-flex flex-column gap-3">
              <div class="p-3 rounded" style="background:var(--surface-soft);border:1px solid var(--line)">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <b>Wait-Time Prediction Engine</b>
                  <span class="badge bg-success">Active</span>
                </div>
                <small class="text-muted d-block mb-2">Algorithm: <b>Random Forest Regressor</b> (120 estimators)</small>
                <div class="small text-muted">
                  Input features: <code>queue_size</code>, <code>hour</code>, <code>avg_consultation</code>, <code>available_doctors</code>.
                </div>
              </div>

              <div class="p-3 rounded" style="background:var(--surface-soft);border:1px solid var(--line)">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <b>Patient No-Show Probability Engine</b>
                  <span class="badge bg-success">Active</span>
                </div>
                <small class="text-muted d-block mb-2">Algorithm: <b>Random Forest Classifier</b> (120 estimators)</small>
                <div class="small text-muted">
                  Input features: <code>lead_time_days</code>, <code>hour</code>, <code>previous_no_show</code>, <code>cancellation_history</code>.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    c.innerHTML = `<div class="panel empty">${esc(e.message)}</div>`;
  }
}

window.renderAnalytics = renderAnalytics;
