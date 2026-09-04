function renderSineWaveQueueHTML(queue, next) {
  if (!queue && !next) {
    return '<div class="sine-queue-card"><div class="empty">No active queue. Book an appointment first.</div></div>';
  }

  const token = queue?.token || next?.token || "T-001";
  const nowServing = queue?.now_serving || (next?.status === 'called' ? token : null) || "—";
  const pos = queue?.position ?? 1;
  const status = queue?.status || next?.status || "booked";
  const waitMin = queue?.waiting_minutes ?? next?.waiting_minutes ?? "—";
  const dept = esc(next?.department || "General OPD");
  const doctor = esc(next?.doctor || "Attending Specialist");

  const userIndex = Math.max(1, pos);
  let servingIndex = 1;
  if (nowServing !== "—" && token.includes("-") && nowServing.includes("-")) {
    const userNum = parseInt(token.split("-")[1], 10) || pos;
    const servNum = parseInt(nowServing.split("-")[1], 10) || 1;
    servingIndex = Math.max(1, userIndex - (userNum - servNum));
  } else if (status === "called") {
    servingIndex = userIndex;
  } else if (userIndex > 1) {
    servingIndex = userIndex - 1;
  }

  const totalTickets = Math.max(7, userIndex + 2);
  const width = 840;
  const height = 160;
  const cy = 80;
  const amplitude = 28;
  const startX = 45;
  const endX = width - 45;
  const ticketStep = (endX - startX) / (totalTickets - 1);

  let pathD = `M 0,${(cy - amplitude).toFixed(1)} `;
  for (let px = 0; px <= width; px += 4) {
    const angle = ((px - startX) / ticketStep) * Math.PI;
    const py = cy - amplitude * Math.cos(angle);
    pathD += `L ${px.toFixed(1)},${py.toFixed(1)} `;
  }

  let nodes = [];
  for (let i = 0; i < totalTickets; i++) {
    const ticketIdx = i + 1;
    const xNode = startX + i * ticketStep;
    const isCrest = i % 2 === 0;
    const yNode = isCrest ? (cy - amplitude) : (cy + amplitude);

    let ticketTokenNum = `T-0${ticketIdx}`;
    if (token.includes("-")) {
      const parts = token.split("-");
      const prefix = parts[0];
      const baseNum = parseInt(parts[1], 10) || pos;
      const calcNum = baseNum - (userIndex - ticketIdx);
      if (calcNum > 0) {
        ticketTokenNum = `${prefix}-${String(calcNum).padStart(3, '0')}`;
      }
    }

    const state = (ticketIdx < servingIndex)
      ? "completed"
      : (ticketIdx === servingIndex)
        ? "blinking"
        : (ticketIdx === userIndex)
          ? "user"
          : "upcoming";

    nodes.push({
      index: ticketIdx,
      x: xNode,
      y: yNode,
      isCrest,
      token: ticketTokenNum,
      state
    });
  }

  let svgNodes = "";
  let overlayBadges = "";

  nodes.forEach(pt => {
    const xPct = (pt.x / width) * 100;
    const labelY = pt.isCrest ? (pt.y - 16) : (pt.y + 24);
    const labelColor = pt.state === "completed" ? "#045e6b" : (pt.state === "blinking" ? "#068394" : (pt.state === "user" ? "#08707c" : "#94a3b8"));
    const labelWeight = pt.state === "user" ? "800" : "700";

    if (pt.state === "completed") {
      svgNodes += `
        <circle cx="${pt.x}" cy="${pt.y}" r="11" fill="#068394" stroke="#ffffff" stroke-width="3" filter="drop-shadow(0 2px 6px rgba(6,131,148,0.4))" />
        <path d="M ${pt.x - 4} ${pt.y} L ${pt.x - 1} ${pt.y + 3} L ${pt.x + 5} ${pt.y - 3}" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <text x="${pt.x}" y="${labelY}" text-anchor="middle" fill="${labelColor}" font-size="11" font-weight="${labelWeight}">${pt.token}</text>
      `;
    } else if (pt.state === "blinking") {
      svgNodes += `
        <circle cx="${pt.x}" cy="${pt.y}" r="18" fill="none" stroke="#0ab8d0" stroke-width="2">
          <animate attributeName="r" values="12;28;12" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${pt.x}" cy="${pt.y}" r="12" fill="#0ab8d0" stroke="#045e6b" stroke-width="3.5" filter="drop-shadow(0 0 12px #068394)">
          <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <text x="${pt.x}" y="${labelY}" text-anchor="middle" fill="${labelColor}" font-size="11" font-weight="800">${pt.token}</text>
      `;
      const badgeTop = pt.isCrest ? ((pt.y / height) * 100 - 22) : ((pt.y / height) * 100 - 22);
      overlayBadges += `
        <div class="token-floating-badge" style="left:${xPct}%; top:${badgeTop}%;">
          <span class="token-lbl">NOW SERVING</span>
          <span class="token-num">${pt.token}</span>
        </div>
      `;
    } else if (pt.state === "user") {
      svgNodes += `
        <circle cx="${pt.x}" cy="${pt.y}" r="12" fill="#08707c" stroke="#ffffff" stroke-width="3.5" filter="drop-shadow(0 4px 10px rgba(8,112,124,0.6))" />
        <text x="${pt.x}" y="${labelY}" text-anchor="middle" fill="${labelColor}" font-size="11" font-weight="800">${pt.token}</text>
      `;
      const badgeTop = pt.isCrest ? ((pt.y / height) * 100 + 16) : ((pt.y / height) * 100 - 26);
      overlayBadges += `
        <div class="user-token-floating-badge" style="left:${xPct}%; top:${badgeTop}%;">
          <i class="bi bi-person-fill"></i> YOUR TOKEN (${token})
        </div>
      `;
    } else {
      svgNodes += `
        <circle cx="${pt.x}" cy="${pt.y}" r="8" fill="#ffffff" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3,3" />
        <text x="${pt.x}" y="${labelY}" text-anchor="middle" fill="${labelColor}" font-size="10" font-weight="600">${pt.token}</text>
      `;
    }
  });

  return `
    <div class="sine-queue-card">
      <div class="sine-header">
        <div class="sine-title-wrap">
          <h4><i class="bi bi-activity"></i> Live Sine-Wave Queue Tracker</h4>
          <p>${dept} · ${doctor}</p>
        </div>
        <div class="sine-badge-now">
          <i class="bi bi-broadcast"></i> Live Updates
        </div>
      </div>

      <div class="sine-wave-wrapper">
        <svg class="sine-wave-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="sineTealGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#068394" />
              <stop offset="50%" stop-color="#0ab8d0" />
              <stop offset="100%" stop-color="#94a3b8" />
            </linearGradient>
            <filter id="sineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          <path d="${pathD}" fill="none" stroke="rgba(13,148,136,0.15)" stroke-width="8" stroke-linecap="round" />
          <path d="${pathD}" fill="none" stroke="url(#sineTealGradient)" stroke-width="4" stroke-linecap="round" filter="url(#sineGlow)" />
          ${svgNodes}
        </svg>
        ${overlayBadges}
      </div>

      <div class="sine-legend">
        <div class="sine-legend-item">
          <div class="sine-legend-dot completed"></div>
          <span>Completed Tickets</span>
        </div>
        <div class="sine-legend-item">
          <div class="sine-legend-dot blinking"></div>
          <span>Currently Serving (In Progress)</span>
        </div>
        <div class="sine-legend-item">
          <div class="sine-legend-dot user"></div>
          <span>Your Ticket</span>
        </div>
        <div class="sine-legend-item">
          <div class="sine-legend-dot upcoming"></div>
          <span>Upcoming Tickets</span>
        </div>
      </div>

      <div class="prediction-info-box">
        <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <span><i class="bi bi-people-fill text-teal me-1"></i> Position in line: <b style="color:var(--primary-dark)">${pos === 1 ? "Next in line!" : (pos - 1) + " patients ahead"}</b></span>
          <span><i class="bi bi-clock-history text-teal me-1"></i> Predicted Wait Time: <b style="color:var(--primary-dark); font-size: 15px;">${waitMin} min</b></span>
          <span><i class="bi bi-ticket-perforated-fill text-teal me-1"></i> Your Token: <b style="color:var(--primary-dark)">${esc(token)}</b></span>
        </div>
        ${queue?.prediction ? `
          <div class="pt-2 border-top text-muted small d-flex justify-content-between flex-wrap gap-2" style="font-size: 11px;">
            <span><i class="bi bi-stopwatch me-1"></i> Avg Consultation Duration: <b>${queue.prediction.avg_consultation_time} min/patient</b> (${queue.prediction.samples_count} sessions analyzed)</span>
            <span><i class="bi bi-person-workspace me-1"></i> Patient Inside: <b>${queue.prediction.ongoing_remaining_minutes > 0 ? `~${queue.prediction.ongoing_remaining_minutes} min remaining` : 'Calling next'}</b></span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

window.renderSineWaveQueueHTML = renderSineWaveQueueHTML;
