/* ============================================================
   CMP Camp Management — UI / Application
   A small hash-router driven single-page app. Each route renders
   into #view. Mutations go through CampData (js/data.js).
   ============================================================ */
(function (global) {
  "use strict";

  const D = global.CampData;
  const view = () => document.getElementById("view");
  const titleEl = () => document.getElementById("pageTitle");
  const actionsEl = () => document.getElementById("topbarActions");

  /* ---------- Small helpers ---------- */
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );
  const money = (n) => "$" + (Number(n) || 0).toFixed(2);
  // Builds <option> tags; marks `current` selected. Empty string -> a "—" placeholder.
  const selOpts = (values, current) =>
    values.map((v) =>
      `<option value="${esc(v)}" ${v === (current || "") ? "selected" : ""}>${v === "" ? "—" : esc(v)}</option>`
    ).join("");
  const initials = (c) => ((c.firstName || "?")[0] + (c.lastName || "")[0] || "?").toUpperCase();
  const fullName = (c) => `${c.firstName} ${c.lastName}`.trim();
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };
  const avatarColor = (c) => {
    const colors = ["#0d9488", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0891b2", "#16a34a"];
    let h = 0;
    for (const ch of fullName(c)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return colors[h % colors.length];
  };
  // Renders a camper's photo if uploaded, otherwise colored initials.
  function avatarHTML(c, size, inline) {
    const s = size || 56;
    const inlineCss = inline ? "display:inline-grid;vertical-align:middle;margin-right:8px;" : "";
    if (c.photo) {
      return `<div class="avatar" style="width:${s}px;height:${s}px;background-image:url('${c.photo}');background-size:cover;background-position:center;${inlineCss}"></div>`;
    }
    return `<div class="avatar" style="width:${s}px;height:${s}px;font-size:${Math.round(s / 2.5)}px;background:${avatarColor(c)};${inlineCss}">${initials(c)}</div>`;
  }
  // Start date + length-of-stay + end date. Used in register & edit forms.
  function attendanceFieldsHTML(d) {
    const session = D.getState().config.session;
    const start = d.startDate || session.start;
    const dur = (d.startDate && d.endDate) ? D.daysBetween(d.startDate, d.endDate) : 0;
    const days = dur || 7;
    const isPreset = D.STAY_PRESETS.includes(days);
    const endDate = d.endDate || D.computeEndDate(start, days);
    return `
      <div class="field"><label>Start date</label>
        <input type="date" id="stayStart" name="startDate" value="${esc(start)}"
          min="${esc(session.start)}" max="${esc(session.end)}" onchange="App.recalcStay()"></div>
      <div class="field"><label>Length of stay</label>
        <select id="stayDays" onchange="App.recalcStay()">
          ${D.STAY_PRESETS.map((p) => `<option value="${p}" ${isPreset && days === p ? "selected" : ""}>${p} days</option>`).join("")}
          <option value="custom" ${!isPreset ? "selected" : ""}>Custom…</option>
        </select></div>
      <div class="field"><label>End date</label>
        <input type="date" id="stayEnd" name="endDate" value="${esc(endDate)}"
          min="${esc(session.start)}" max="${esc(session.end)}" ${isPreset ? "readonly" : ""}></div>`;
  }

  // Reusable photo-upload field for camper forms.
  function photoFieldHTML(currentPhoto) {
    const has = currentPhoto && currentPhoto.length;
    return `<div class="field full">
      <label>Camper photo (for identification)</label>
      <div style="display:flex;align-items:center;gap:14px;">
        <div id="photoPreview" class="avatar" style="width:64px;height:64px;${has
          ? `background-image:url('${currentPhoto}');background-size:cover;background-position:center;`
          : "background:#e2e8f0;color:#94a3b8;font-size:24px;"}">${has ? "" : "📷"}</div>
        <div>
          <input type="file" accept="image/*" onchange="App.previewPhoto(this)">
          <input type="hidden" name="photo" id="photoData" value="${esc(currentPhoto || "")}">
          <div class="muted" style="font-size:12px;margin-top:4px;">JPG or PNG. Stored locally and shown on the roster, profile, and bunk.</div>
        </div>
      </div>
    </div>`;
  }

  function toast(msg, kind) {
    const host = document.getElementById("toastHost");
    const el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 200); }, 2600);
  }

  /* ---------- Modal ---------- */
  function openModal(html, large) {
    const overlay = document.getElementById("modalOverlay");
    const modal = document.getElementById("modal");
    modal.className = "modal" + (large ? " modal-lg" : "");
    modal.innerHTML = html;
    overlay.hidden = false;
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
  }
  function closeModal() {
    document.getElementById("modalOverlay").hidden = true;
    document.getElementById("modal").innerHTML = "";
  }
  global.closeModal = closeModal;

  /* ---------- Router ---------- */
  const routes = {};
  function navigate(route) { global.location.hash = "#" + route; }
  global.navigate = navigate;

  function render() {
    const hash = global.location.hash.slice(1) || "dashboard";
    const [name, arg] = hash.split("/");
    const route = routes[name] || routes.dashboard;
    // highlight nav
    document.querySelectorAll(".nav-item").forEach((a) =>
      a.classList.toggle("active", a.dataset.route === name)
    );
    actionsEl().innerHTML = "";
    route(arg);
  }

  /* ============================================================
     DASHBOARD
     ============================================================ */
  routes.dashboard = function () {
    titleEl().textContent = "Dashboard";
    const s = D.stats();
    const st = D.getState();
    const recentLogs = D.allLogs().slice(0, 6);

    view().innerHTML = `
      <div class="grid stat-grid">
        ${stat("Campers Registered", `${s.totalCampers}`, `of ${s.totalCapacity} beds`, "good")}
        ${stat("Open Incidents", `${s.openIncidents}`, "injuries + incidents", s.openIncidents ? "alert" : "")}
        ${stat("Medical / Allergy Flags", `${s.medicalAlerts}`, "campers with needs", s.medicalAlerts ? "warn" : "")}
        ${stat("Store Revenue", money(s.storeRevenue), "spent to date", "")}
        ${stat("Funds on Account", money(s.totalBalance), "across all campers", "")}
        ${stat("Low Balance", `${s.lowBalance}`, "under $5", s.lowBalance ? "warn" : "")}
      </div>

      <div class="row" style="margin-top:24px;">
        <div class="card">
          <h3>Occupancy by Side</h3>
          ${st.config.sides.map((side) => {
            const bunks = D.bunksForSide(side.id);
            const filled = bunks.reduce((a, b) => a + D.bunkOccupancy(b.id), 0);
            const cap = bunks.reduce((a, b) => a + b.capacity, 0);
            const pct = cap ? Math.round((filled / cap) * 100) : 0;
            return `<div style="margin-bottom:14px;">
              <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px;">
                <span><span class="side-dot" style="background:${side.color}"></span> ${esc(side.name)}</span>
                <strong>${filled}/${cap}</strong>
              </div>
              <div style="background:var(--line);border-radius:6px;height:10px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${side.color};"></div>
              </div>
            </div>`;
          }).join("")}
          <button class="btn btn-secondary btn-sm" onclick="navigate('map')">Open Bunk Map →</button>
        </div>

        <div class="card">
          <h3>Recent Activity</h3>
          ${recentLogs.length ? `<ul class="log-list">${recentLogs.map(logItemHTML).join("")}</ul>`
            : `<p class="empty">No activity yet.</p>`}
        </div>
      </div>
    `;
  };

  function stat(label, value, sub, kind) {
    return `<div class="stat ${kind || ""}">
      <div class="label">${esc(label)}</div>
      <div class="value">${esc(value)}</div>
      <div class="sub">${esc(sub)}</div>
    </div>`;
  }

  /* ============================================================
     BUNK MAP
     ============================================================ */
  routes.map = function () {
    titleEl().textContent = "Bunk Map";
    actionsEl().innerHTML = `<button class="btn btn-accent" onclick="navigate('register')">+ Register Camper</button>`;
    view().innerHTML = bunkMapHTML({ onClickRoute: true });
  };

  // options.selectId -> radio-style selection; options.onClickRoute -> open bunk detail
  function bunkMapHTML(options) {
    options = options || {};
    const st = D.getState();
    const sidesHTML = st.config.sides.map((side) => {
      const bunks = D.bunksForSide(side.id);
      return `<div class="map-side">
        <h3><span class="side-dot" style="background:${side.color}"></span> ${esc(side.name)}</h3>
        <div class="bunk-grid">
          ${bunks.map((b) => bunkCellHTML(b, options)).join("")}
        </div>
      </div>`;
    });
    return `<div class="map-wrap">
      ${sidesHTML[0]}
      <div class="gym">
        <div class="gym-icon">🏀</div>
        <div>GYM</div>
        <small>Shared activity center</small>
      </div>
      ${sidesHTML[1]}
    </div>
    <p class="muted" style="margin-top:14px;font-size:13px;">
      ● ${options.selectMode ? "Click an open bunk to assign this camper." : "Click a bunk to view its cabin, campers, and logs."}
      &nbsp; <span class="badge">3 beds each</span></p>`;
  }

  function bunkCellHTML(b, options) {
    const occ = D.bunkOccupancy(b.id);
    const full = occ >= b.capacity;
    const campers = D.campersInBunk(b.id);
    const hasAlert =
      b.logs.some((l) => !l.resolved && (l.type === "incident" || l.type === "injury")) ||
      campers.some((c) => c.logs.some((l) => !l.resolved && (l.type === "injury" || l.type === "incident" || l.type === "allergy")));
    const pips = Array.from({ length: b.capacity })
      .map((_, i) => `<span class="pip ${i < occ ? "filled" : ""}"></span>`).join("");
    const cls = [
      "bunk-cell",
      full ? "full" : "available",
      hasAlert ? "has-alert" : "",
      options.selectMode ? "selectable" : "",
      options.selectedBunk === b.id ? "selected" : "",
    ].join(" ");
    let onclick;
    if (options.selectMode) {
      onclick = full ? "" : `App.selectBunk('${b.id}')`;
    } else {
      onclick = `navigate('bunk/${b.id}')`;
    }
    return `<div class="${cls}" ${onclick ? `onclick="${onclick}"` : ""} ${full && options.selectMode ? 'title="Full"' : ""}>
      <div class="bunk-name">${esc(b.name)}</div>
      <div class="occ">${occ}/${b.capacity}</div>
      <div class="pips">${pips}</div>
    </div>`;
  }

  /* ============================================================
     BUNK DETAIL
     ============================================================ */
  routes.bunk = function (bunkId) {
    const b = D.getBunk(bunkId);
    if (!b) { view().innerHTML = `<p class="empty">Bunk not found.</p>`; return; }
    const side = D.getSide(b.sideId);
    titleEl().textContent = `Bunk ${b.name}`;
    actionsEl().innerHTML = `<button class="btn btn-secondary" onclick="navigate('map')">← Map</button>`;
    const campers = D.campersInBunk(b.id);

    // Aggregate medical/allergy alerts of every kid in the cabin.
    const careFlags = [];
    campers.forEach((c) => {
      if (c.allergies && c.allergies.trim()) careFlags.push(`${fullName(c)}: allergy — ${c.allergies}`);
      if (c.medicalNeeds && c.medicalNeeds.trim()) careFlags.push(`${fullName(c)}: medical — ${c.medicalNeeds}`);
      if (c.dietary && c.dietary.trim()) careFlags.push(`${fullName(c)}: dietary — ${c.dietary}`);
    });

    view().innerHTML = `
      <div class="row">
        <div class="card" style="flex:2;">
          <div class="detail-head">
            <div class="avatar" style="background:${side.color}">${esc(b.name)}</div>
            <div>
              <h2>Bunk ${esc(b.name)}</h2>
              <div class="detail-meta">
                <span class="badge side-${side.id}">${esc(side.name)}</span>
                ${D.bunkOccupancy(b.id)}/${b.capacity} beds filled
              </div>
            </div>
          </div>
          <div class="field" style="max-width:320px;margin-top:8px;">
            <label>Counselor</label>
            <input id="counselorInput" value="${esc(b.counselor)}" placeholder="Assign counselor…" />
          </div>

          <h3 class="section-title">Campers in this bunk</h3>
          ${campers.length ? campers.map((c) => `
            <div class="cart-line" style="cursor:pointer;" onclick="navigate('camper/${c.id}')">
              <span>${avatarHTML(c, 30, true)}${esc(fullName(c))}, ${esc(c.age)}</span>
              <span class="muted">${money(c.balance)} ${c.allergies ? "🥜" : ""} ${c.medicalNeeds ? "🏥" : ""}</span>
            </div>`).join("")
            : `<p class="empty">No campers assigned yet. <a href="#register">Register one →</a></p>`}
        </div>

        <div class="card" style="flex:1;">
          <h3>⚠️ Care Flags (whole cabin)</h3>
          ${careFlags.length ? `<ul class="log-list">${careFlags.map((f) =>
            `<li class="chip" style="display:block;">${esc(f)}</li>`).join("")}</ul>`
            : `<p class="muted">No medical, allergy, or dietary flags.</p>`}
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;">Bunk Log <span class="muted">(cabin-wide incidents &amp; notes)</span></h3>
          <button class="btn btn-sm" onclick="App.openLogModal('bunk','${b.id}')">+ Add Log</button>
        </div>
        ${b.logs.length ? `<ul class="log-list" style="margin-top:12px;">${b.logs.map((l) =>
          logItemHTML({ ...l, ownerType: "bunk", ownerId: b.id })).join("")}</ul>`
          : `<p class="empty">No bunk logs yet.</p>`}
      </div>
    `;

    document.getElementById("counselorInput").addEventListener("change", (e) => {
      D.setBunkCounselor(b.id, e.target.value);
      toast("Counselor saved", "success");
    });
  };

  /* ============================================================
     REGISTER CAMPER (wizard: profile -> pick bunk on map)
     ============================================================ */
  let regDraft = null;
  routes.register = function () {
    titleEl().textContent = "Register Camper";
    regDraft = regDraft || {};
    renderRegStep1();
  };

  function renderRegStep1() {
    actionsEl().innerHTML = "";
    const d = regDraft;
    view().innerHTML = `
      <div class="card" style="max-width:900px;">
        <h3>Step 1 of 2 — Camper Profile</h3>
        <form id="regForm">
          ${photoFieldHTML(d.photo)}

          <h4 class="section-title" style="margin-top:8px;">Camper</h4>
          <div class="form-grid">
            <div class="field"><label>First name *</label><input name="firstName" required value="${esc(d.firstName || "")}"></div>
            <div class="field"><label>Last name *</label><input name="lastName" required value="${esc(d.lastName || "")}"></div>
            <div class="field"><label>Age</label><input name="age" type="number" min="3" max="18" value="${esc(d.age || "")}"></div>
            <div class="field"><label>Grade</label><input name="grade" value="${esc(d.grade || "")}"></div>
            <div class="field"><label>Gender</label>
              <select name="gender">${selOpts(["", "Female", "Male", "Non-binary", "Prefer not to say"], d.gender)}</select></div>
            <div class="field"><label>T-shirt size</label>
              <select name="shirtSize">${selOpts(["", "YXS", "YS", "YM", "YL", "AS", "AM", "AL", "AXL"], d.shirtSize)}</select></div>
            <div class="field full"><label>Home address</label><input name="address" value="${esc(d.address || "")}"></div>
            <div class="field"><label>Opening balance ($)</label><input name="balance" type="number" min="0" step="1" value="${esc(d.balance || 0)}"></div>
          </div>

          <h4 class="section-title">Attendance</h4>
          <div class="form-grid">
            ${attendanceFieldsHTML(d)}
          </div>

          <h4 class="section-title">Parent / Guardian</h4>
          <div class="form-grid">
            <div class="field"><label>Guardian name</label><input name="guardianName" value="${esc(d.guardianName || "")}"></div>
            <div class="field"><label>Relationship</label><input name="guardianRelationship" placeholder="Mother, Father…" value="${esc(d.guardianRelationship || "")}"></div>
            <div class="field"><label>Guardian phone</label><input name="guardianPhone" value="${esc(d.guardianPhone || "")}"></div>
            <div class="field"><label>Guardian email</label><input name="guardianEmail" type="email" value="${esc(d.guardianEmail || "")}"></div>
          </div>

          <h4 class="section-title">Emergency & Pickup</h4>
          <div class="form-grid">
            <div class="field full"><label>Emergency contact #1</label><input name="emergencyContact" placeholder="Name — relationship — phone" value="${esc(d.emergencyContact || "")}"></div>
            <div class="field full"><label>Emergency contact #2</label><input name="emergencyContact2" placeholder="Name — relationship — phone" value="${esc(d.emergencyContact2 || "")}"></div>
            <div class="field full"><label>Authorized for pickup</label><input name="authorizedPickup" placeholder="People allowed to pick up this camper" value="${esc(d.authorizedPickup || "")}"></div>
          </div>

          <h4 class="section-title">Medical & Health</h4>
          <div class="form-grid">
            <div class="field"><label>Allergies</label><input name="allergies" placeholder="e.g. Peanuts" value="${esc(d.allergies || "")}"></div>
            <div class="field"><label>Dietary needs</label><input name="dietary" placeholder="e.g. Vegetarian" value="${esc(d.dietary || "")}"></div>
            <div class="field full"><label>Medical needs / conditions</label><input name="medicalNeeds" placeholder="e.g. Asthma — inhaler" value="${esc(d.medicalNeeds || "")}"></div>
            <div class="field full"><label>Medications (name, dose, schedule)</label><input name="medications" value="${esc(d.medications || "")}"></div>
            <div class="field"><label>Physician (name & phone)</label><input name="physician" value="${esc(d.physician || "")}"></div>
            <div class="field"><label>Insurance (provider & policy #)</label><input name="insurance" value="${esc(d.insurance || "")}"></div>
            <div class="field"><label>Swim level</label>
              <select name="swimLevel">${selOpts(["", "Non-swimmer", "Beginner", "Intermediate", "Swimmer"], d.swimLevel)}</select></div>
            <div class="field"><label>Photo/media consent</label>
              <select name="photoConsent">${selOpts(["", "Yes", "No"], d.photoConsent)}</select></div>
            <div class="field full"><label>Notes</label><textarea name="notes">${esc(d.notes || "")}</textarea></div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-accent">Next: Choose Bunk →</button>
          </div>
        </form>
      </div>`;
    document.getElementById("regForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      regDraft = Object.fromEntries(fd.entries());
      renderRegStep2();
    });
  }

  function renderRegStep2() {
    titleEl().textContent = "Register Camper";
    view().innerHTML = `
      <div class="card" style="margin-bottom:16px;">
        <h3 style="margin:0;">Step 2 of 2 — Choose a Bunk for ${esc(regDraft.firstName)} ${esc(regDraft.lastName)}</h3>
        <p class="muted" style="margin:6px 0 0;">Pick an open bunk on the map. West and East sides flank the gym.</p>
      </div>
      <div id="mapHost">${bunkMapHTML({ selectMode: true, selectedBunk: regDraft.bunkId })}</div>
      <div class="form-actions" style="max-width:none;">
        <button class="btn btn-secondary" onclick="App.regBack()">← Back</button>
        <button class="btn btn-accent" id="finishReg" ${regDraft.bunkId ? "" : "disabled"}>Complete Registration</button>
      </div>`;
    const fin = document.getElementById("finishReg");
    fin.addEventListener("click", finishRegistration);
  }

  function selectBunk(bunkId) {
    regDraft.bunkId = bunkId;
    const b = D.getBunk(bunkId);
    regDraft.sideId = b.sideId;
    document.getElementById("mapHost").innerHTML = bunkMapHTML({ selectMode: true, selectedBunk: bunkId });
    const fin = document.getElementById("finishReg");
    if (fin) fin.disabled = false;
    toast(`Bunk ${b.name} selected`, "success");
  }

  function finishRegistration() {
    const c = D.addCamper(regDraft);
    regDraft = null;
    toast(`${fullName(c)} registered!`, "success");
    navigate("camper/" + c.id);
  }

  /* ============================================================
     CAMPERS LIST
     ============================================================ */
  routes.campers = function () {
    titleEl().textContent = "Campers";
    actionsEl().innerHTML = `<button class="btn btn-accent" onclick="navigate('register')">+ Register Camper</button>`;
    const st = D.getState();

    view().innerHTML = `
      <div class="toolbar">
        <input type="search" id="camperSearch" placeholder="Search campers…" style="min-width:240px;">
        <select id="sideFilter">
          <option value="">All sides</option>
          ${st.config.sides.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}
        </select>
        <select id="flagFilter">
          <option value="">All campers</option>
          <option value="medical">Medical / allergy flags</option>
          <option value="low">Low balance (&lt;$5)</option>
        </select>
        <div class="spacer"></div>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        <table class="table">
          <thead><tr>
            <th>Camper</th><th>Age</th><th>Side</th><th>Bunk</th><th>Flags</th><th class="num">Balance</th>
          </tr></thead>
          <tbody id="camperRows"></tbody>
        </table>
      </div>`;

    function draw() {
      const q = (document.getElementById("camperSearch").value || "").toLowerCase();
      const side = document.getElementById("sideFilter").value;
      const flag = document.getElementById("flagFilter").value;
      let list = D.getState().campers.slice();
      if (q) list = list.filter((c) => fullName(c).toLowerCase().includes(q));
      if (side) list = list.filter((c) => c.sideId === side);
      if (flag === "medical") list = list.filter((c) => (c.allergies && c.allergies.trim()) || (c.medicalNeeds && c.medicalNeeds.trim()));
      if (flag === "low") list = list.filter((c) => c.balance < 5);
      list.sort((a, b) => fullName(a).localeCompare(fullName(b)));

      const rows = document.getElementById("camperRows");
      if (!list.length) { rows.innerHTML = `<tr><td colspan="6"><p class="empty">No campers match.</p></td></tr>`; return; }
      rows.innerHTML = list.map((c) => {
        const bunk = D.getBunk(c.bunkId);
        const side = D.getSide(c.sideId);
        const flags = [c.allergies ? "🥜" : "", c.medicalNeeds ? "🏥" : "",
          c.logs.some((l) => !l.resolved && (l.type === "injury" || l.type === "incident")) ? "⚠️" : ""].filter(Boolean).join(" ");
        return `<tr onclick="navigate('camper/${c.id}')">
          <td>${avatarHTML(c, 28, true)}${esc(fullName(c))}</td>
          <td>${esc(c.age)}</td>
          <td>${side ? `<span class="badge side-${side.id}">${esc(side.name)}</span>` : "—"}</td>
          <td>${bunk ? esc(bunk.name) : "—"}</td>
          <td>${flags || "—"}</td>
          <td class="num">${money(c.balance)}</td>
        </tr>`;
      }).join("");
    }

    ["camperSearch", "sideFilter", "flagFilter"].forEach((id) =>
      document.getElementById(id).addEventListener("input", draw));
    draw();
  };

  /* ============================================================
     CAMPER DETAIL / PROFILE
     ============================================================ */
  routes.camper = function (kidId) {
    const c = D.getCamper(kidId);
    if (!c) { view().innerHTML = `<p class="empty">Camper not found.</p>`; return; }
    const bunk = D.getBunk(c.bunkId);
    const side = D.getSide(c.sideId);
    titleEl().textContent = fullName(c);
    actionsEl().innerHTML = `
      <button class="btn btn-secondary" onclick="App.openEditCamper('${c.id}')">✏️ Edit</button>
      <button class="btn btn-secondary" onclick="navigate('campers')">← All Campers</button>`;

    view().innerHTML = `
      <div class="row">
        <div class="card" style="flex:1.2;">
          <div class="detail-head">
            ${avatarHTML(c, 64)}
            <div>
              <h2>${esc(fullName(c))}</h2>
              <div class="detail-meta">
                Age ${esc(c.age || "—")}${c.grade ? ` · Grade ${esc(c.grade)}` : ""} ·
                ${side ? `<span class="badge side-${side.id}">${esc(side.name)}</span>` : ""}
                ${bunk ? `Bunk <a href="#bunk/${bunk.id}">${esc(bunk.name)}</a>` : `<span class="muted">No bunk</span>`}
              </div>
            </div>
          </div>
          <dl class="kv" style="margin-top:14px;">
            <dt>Attendance</dt><dd>${c.startDate && c.endDate
              ? `${esc(c.startDate)} → ${esc(c.endDate)} <span class="badge">${D.camperDuration(c)} days</span>`
              : "—"}</dd>
            <dt>Gender</dt><dd>${esc(c.gender) || "—"}</dd>
            <dt>Shirt size</dt><dd>${esc(c.shirtSize) || "—"}</dd>
            <dt>Address</dt><dd>${esc(c.address) || "—"}</dd>
            <dt>Guardian</dt><dd>${esc(c.guardianName) || "—"}${c.guardianRelationship ? ` (${esc(c.guardianRelationship)})` : ""}</dd>
            <dt>Guardian phone</dt><dd>${esc(c.guardianPhone) || "—"}</dd>
            <dt>Guardian email</dt><dd>${esc(c.guardianEmail) || "—"}</dd>
            <dt>Emergency #1</dt><dd>${esc(c.emergencyContact) || "—"}</dd>
            <dt>Emergency #2</dt><dd>${esc(c.emergencyContact2) || "—"}</dd>
            <dt>Authorized pickup</dt><dd>${esc(c.authorizedPickup) || "—"}</dd>
            <dt>Allergies</dt><dd>${c.allergies ? `<span class="badge high">🥜 ${esc(c.allergies)}</span>` : "—"}</dd>
            <dt>Medical needs</dt><dd>${c.medicalNeeds ? `<span class="badge high">🏥 ${esc(c.medicalNeeds)}</span>` : "—"}</dd>
            <dt>Medications</dt><dd>${esc(c.medications) || "—"}</dd>
            <dt>Dietary</dt><dd>${esc(c.dietary) || "—"}</dd>
            <dt>Physician</dt><dd>${esc(c.physician) || "—"}</dd>
            <dt>Insurance</dt><dd>${esc(c.insurance) || "—"}</dd>
            <dt>Swim level</dt><dd>${esc(c.swimLevel) || "—"}</dd>
            <dt>Photo consent</dt><dd>${esc(c.photoConsent) || "—"}</dd>
            <dt>Notes</dt><dd>${esc(c.notes) || "—"}</dd>
          </dl>
          <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-sm btn-secondary" onclick="App.openReassign('${c.id}')">🏕️ Change Bunk</button>
            <button class="btn btn-sm btn-danger" onclick="App.confirmDeleteCamper('${c.id}')">Remove Camper</button>
          </div>
        </div>

        <div class="card" style="flex:1;">
          <h3>💳 Camp Bank</h3>
          <div class="stat" style="box-shadow:none;border:none;padding:0;">
            <div class="label">Current balance</div>
            <div class="value ${c.balance < 5 ? "" : "good"}" style="color:${c.balance < 5 ? "var(--danger)" : "var(--accent)"}">${money(c.balance)}</div>
          </div>
          <div style="display:flex;gap:8px;margin:12px 0;">
            <button class="btn btn-sm" onclick="App.openFunds('${c.id}','add')">+ Add Funds</button>
            <button class="btn btn-sm btn-secondary" onclick="App.openFunds('${c.id}','adjust')">Adjust</button>
            <button class="btn btn-sm btn-secondary" onclick="navigate('store')">Store →</button>
          </div>
          <h3 style="margin-top:14px;">Transactions</h3>
          ${c.transactions.length ? `<div>${c.transactions.slice(0, 12).map((t) => `
            <div class="cart-line">
              <span>${esc(t.memo)}<br><span class="muted" style="font-size:12px;">${fmtDate(t.date)}</span></span>
              <strong class="${t.type === "credit" ? "pos" : "neg"}">${t.type === "credit" ? "+" : "−"}${money(t.amount)}</strong>
            </div>`).join("")}</div>`
            : `<p class="muted">No transactions yet.</p>`}
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;">Logs — injuries, medical, incidents, deliveries, food</h3>
          <button class="btn btn-sm" onclick="App.openLogModal('camper','${c.id}')">+ Add Log</button>
        </div>
        ${c.logs.length ? `<ul class="log-list" style="margin-top:12px;">${c.logs.map((l) =>
          logItemHTML({ ...l, ownerType: "camper", ownerId: c.id })).join("")}</ul>`
          : `<p class="empty">No logs yet. Use “Add Log” to record an injury, medical event, incident, delivery, or food note.</p>`}
      </div>
    `;
  };

  function logItemHTML(l) {
    const t = D.LOG_TYPES[l.type] || D.LOG_TYPES.note;
    const ownerLink = l.ownerType === "camper" ? `camper/${l.ownerId}`
      : l.ownerType === "bunk" ? `bunk/${l.ownerId}` : null;
    return `<li class="log-item ${l.resolved ? "resolved" : ""}">
      <span class="log-icon" title="${esc(t.label)}">${t.icon}</span>
      <div class="log-body">
        <div class="log-text">${esc(l.text)}</div>
        <div class="log-meta">
          <span class="badge" style="background:${t.color}1a;color:${t.color};">${esc(t.label)}</span>
          ${l.severity === "high" ? `<span class="badge high">High</span>` : ""}
          ${l.resolved ? `<span class="badge resolved">Resolved</span>` : ""}
          <span>${fmtDate(l.date)}</span>
          <span>· ${esc(l.author || "Staff")}</span>
          ${l.owner ? `<span>· <a href="#${ownerLink}">${esc(l.owner)}</a></span>` : ""}
        </div>
      </div>
      ${l.ownerType ? `<button class="btn btn-sm btn-secondary" onclick="App.toggleResolved('${l.ownerType}','${l.ownerId}','${l.id}')">${l.resolved ? "Reopen" : "Resolve"}</button>` : ""}
    </li>`;
  }

  /* ============================================================
     HEALTH & SAFETY (all logs)
     ============================================================ */
  routes.health = function () {
    titleEl().textContent = "Health & Safety";
    const typesOpts = Object.entries(D.LOG_TYPES)
      .map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join("");
    view().innerHTML = `
      <div class="toolbar">
        <select id="typeFilter"><option value="">All types</option>${typesOpts}</select>
        <select id="statusFilter">
          <option value="open">Open only</option>
          <option value="">All</option>
          <option value="resolved">Resolved only</option>
        </select>
        <div class="spacer"></div>
      </div>
      <div class="card"><ul class="log-list" id="healthList"></ul></div>`;

    function draw() {
      const type = document.getElementById("typeFilter").value;
      const status = document.getElementById("statusFilter").value;
      let logs = D.allLogs();
      if (type) logs = logs.filter((l) => l.type === type);
      if (status === "open") logs = logs.filter((l) => !l.resolved);
      if (status === "resolved") logs = logs.filter((l) => l.resolved);
      const host = document.getElementById("healthList");
      host.innerHTML = logs.length ? logs.map(logItemHTML).join("")
        : `<p class="empty">No matching logs.</p>`;
    }
    document.getElementById("typeFilter").addEventListener("change", draw);
    document.getElementById("statusFilter").addEventListener("change", draw);
    draw();
  };

  /* ============================================================
     CALENDAR — month grid across the camp session
     ============================================================ */
  routes.calendar = function () {
    titleEl().textContent = "Camp Calendar";
    const session = D.getSession();
    const today = D.ymd(new Date());
    actionsEl().innerHTML = `<button class="btn btn-secondary" onclick="navigate('day/${today}')">Today's Roster →</button>`;

    // Build the list of months the session spans.
    const start = new Date(session.start + "T00:00:00");
    const end = new Date(session.end + "T00:00:00");
    const months = [];
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      months.push(new Date(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
    const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    view().innerHTML = `
      <p class="muted" style="margin-top:0;">Session: <strong>${esc(session.start)}</strong> → <strong>${esc(session.end)}</strong>.
        Each cell shows how many campers are at camp that day — click a day for its roster.</p>
      <div class="cal-months">
      ${months.map((m) => {
        const y = m.getFullYear(), mon = m.getMonth();
        const first = new Date(y, mon, 1);
        const daysInMonth = new Date(y, mon + 1, 0).getDate();
        const lead = first.getDay();
        const cells = [];
        for (let i = 0; i < lead; i++) cells.push(`<div class="cal-cell empty"></div>`);
        for (let d = 1; d <= daysInMonth; d++) {
          const ds = `${y}-${String(mon + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const inSession = ds >= session.start && ds <= session.end;
          const count = inSession ? D.campersOnDate(ds).length : 0;
          const isToday = ds === today;
          cells.push(`<div class="cal-cell ${inSession ? "" : "off"} ${isToday ? "today" : ""}"
              ${inSession ? `onclick="navigate('day/${ds}')"` : ""}>
            <span class="cal-day">${d}</span>
            ${inSession ? `<span class="cal-count ${count ? "" : "zero"}">${count}</span>` : ""}
          </div>`);
        }
        return `<div class="card cal-month">
          <h3>${m.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
          <div class="cal-grid">
            ${dow.map((d) => `<div class="cal-dow">${d}</div>`).join("")}
            ${cells.join("")}
          </div>
        </div>`;
      }).join("")}
      </div>`;
  };

  /* ============================================================
     DAY ROSTER — everyone at camp on a given date
     ============================================================ */
  routes.day = function (dateStr) {
    if (!dateStr) { navigate("calendar"); return; }
    const present = D.campersOnDate(dateStr).slice()
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
    const d = new Date(dateStr + "T00:00:00");
    const pretty = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    titleEl().textContent = "Daily Roster";
    actionsEl().innerHTML = `
      <button class="btn btn-secondary" onclick="window.print()">🖨️ Print</button>
      <button class="btn btn-secondary" onclick="navigate('calendar')">← Calendar</button>`;

    // Quick day stepper
    const prev = D.ymd(new Date(d.getTime() - 86400000));
    const next = D.ymd(new Date(d.getTime() + 86400000));

    view().innerHTML = `
      <div class="toolbar">
        <button class="btn btn-sm btn-secondary" onclick="navigate('day/${prev}')">← Prev day</button>
        <strong style="font-size:16px;">${esc(pretty)}</strong>
        <button class="btn btn-sm btn-secondary" onclick="navigate('day/${next}')">Next day →</button>
        <div class="spacer"></div>
        <span class="badge">${present.length} campers present</span>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        <table class="table">
          <thead><tr><th>Camper</th><th>Side</th><th>Bunk</th><th>Day of stay</th><th>Departs</th><th>Flags</th></tr></thead>
          <tbody>
          ${present.length ? present.map((c) => {
            const bunk = D.getBunk(c.bunkId);
            const side = D.getSide(c.sideId);
            const dayN = D.dayOfStay(c, dateStr);
            const total = D.camperDuration(c);
            const leaving = c.endDate === dateStr;
            const flags = [c.allergies ? "🥜" : "", c.medicalNeeds ? "🏥" : ""].filter(Boolean).join(" ");
            return `<tr onclick="navigate('camper/${c.id}')">
              <td>${avatarHTML(c, 28, true)}${esc(fullName(c))}</td>
              <td>${side ? `<span class="badge side-${side.id}">${esc(side.name)}</span>` : "—"}</td>
              <td>${bunk ? esc(bunk.name) : "—"}</td>
              <td>Day ${dayN} of ${total}</td>
              <td>${esc(c.endDate)}${leaving ? ` <span class="badge high">leaves today</span>` : ""}</td>
              <td>${flags || "—"}</td>
            </tr>`;
          }).join("") : `<tr><td colspan="6"><p class="empty">No campers at camp on this day.</p></td></tr>`}
          </tbody>
        </table>
      </div>`;
  };

  /* ============================================================
     ATTENDANCE — length-of-stay buckets + timeline
     ============================================================ */
  let attSort = "duration"; // duration | name | start
  let attFilter = null;     // null | "7" | "15" | "20" | "30" | "other"
  routes.attendance = function () {
    titleEl().textContent = "Attendance";
    const buckets = D.attendanceBuckets();
    const session = D.getSession();
    const totalDays = D.daysBetween(session.start, session.end);

    const bucketCard = (label, list, accent) => `
      <div class="stat ${accent || ""} ${attFilter === label ? "selected-bucket" : ""}" style="cursor:pointer;" onclick="App.filterStay('${label}')">
        <div class="label">${label === "other" ? "Custom length" : label + "-day campers"}</div>
        <div class="value">${list.length}</div>
        <div class="sub">${list.length ? esc(list.slice(0, 2).map(fullName).join(", ")) + (list.length > 2 ? "…" : "") : "none"}</div>
      </div>`;

    view().innerHTML = `
      <div class="grid stat-grid" style="margin-bottom:8px;">
        ${D.STAY_PRESETS.slice().reverse().map((p) => bucketCard(String(p), buckets[p], "good")).join("")}
        ${bucketCard("other", buckets.other, "warn")}
      </div>

      <h3 class="section-title">Stay Timeline <span class="muted">(${esc(session.start)} → ${esc(session.end)}, ${totalDays} days)</span></h3>
      <div class="card">
        <div id="timeline"></div>
      </div>

      <h3 class="section-title">All Campers
        <span class="muted" style="font-weight:400;">— sort:</span>
        <select id="attSort" style="padding:4px 8px;border-radius:6px;border:1px solid var(--line);">
          <option value="duration">Longest stay first</option>
          <option value="start">Start date</option>
          <option value="name">Name</option>
        </select>
      </h3>
      <div class="card" style="padding:0;overflow:hidden;">
        <table class="table">
          <thead><tr><th>Camper</th><th>Side / Bunk</th><th>Start</th><th>End</th><th class="num">Days</th></tr></thead>
          <tbody id="attRows"></tbody>
        </table>
      </div>`;

    document.getElementById("attSort").value = attSort;
    document.getElementById("attSort").addEventListener("change", (e) => { attSort = e.target.value; drawAttendance(); });
    drawAttendance();
  };

  function drawAttendance() {
    const session = D.getSession();
    const totalDays = D.daysBetween(session.start, session.end);
    let list = D.getState().campers.filter((c) => c.startDate && c.endDate);
    if (attFilter) {
      list = list.filter((c) => {
        const dur = D.camperDuration(c);
        return attFilter === "other" ? !D.STAY_PRESETS.includes(dur) : dur === Number(attFilter);
      });
    }
    const sorters = {
      duration: (a, b) => D.camperDuration(b) - D.camperDuration(a) || fullName(a).localeCompare(fullName(b)),
      start: (a, b) => a.startDate.localeCompare(b.startDate) || fullName(a).localeCompare(fullName(b)),
      name: (a, b) => fullName(a).localeCompare(fullName(b)),
    };
    list.sort(sorters[attSort] || sorters.duration);

    // Timeline (Gantt-style bars across the session).
    const tl = document.getElementById("timeline");
    if (tl) {
      tl.innerHTML = list.length ? list.map((c) => {
        const offset = D.daysBetween(session.start, c.startDate) - 1;
        const dur = D.camperDuration(c);
        const left = (offset / totalDays) * 100;
        const width = (dur / totalDays) * 100;
        const side = D.getSide(c.sideId);
        const color = side ? side.color : "var(--accent)";
        return `<div class="tl-row" onclick="navigate('camper/${c.id}')" title="${esc(fullName(c))}: ${esc(c.startDate)}→${esc(c.endDate)} (${dur}d)">
          <div class="tl-label">${esc(fullName(c))}</div>
          <div class="tl-track">
            <div class="tl-bar" style="left:${left}%;width:${width}%;background:${color};">${dur}d</div>
          </div>
        </div>`;
      }).join("") : `<p class="empty">No campers have attendance dates yet.</p>`;
    }

    const rows = document.getElementById("attRows");
    if (rows) {
      rows.innerHTML = list.length ? list.map((c) => {
        const bunk = D.getBunk(c.bunkId);
        const side = D.getSide(c.sideId);
        return `<tr onclick="navigate('camper/${c.id}')">
          <td>${avatarHTML(c, 28, true)}${esc(fullName(c))}</td>
          <td>${side ? `<span class="badge side-${side.id}">${esc(side.name)}</span>` : ""} ${bunk ? esc(bunk.name) : ""}</td>
          <td>${esc(c.startDate)}</td>
          <td>${esc(c.endDate)}</td>
          <td class="num"><strong>${D.camperDuration(c)}</strong></td>
        </tr>`;
      }).join("") : `<tr><td colspan="5"><p class="empty">No campers with attendance dates.</p></td></tr>`;
    }
  }

  /* ============================================================
     STORE
     ============================================================ */
  let cart = {}; // itemId -> qty
  let storeCamperId = "";
  routes.store = function () {
    titleEl().textContent = "Camp Store";
    actionsEl().innerHTML = `<button class="btn btn-secondary" onclick="App.openItemModal()">+ Add Item</button>`;
    drawStore();
  };

  function drawStore() {
    const st = D.getState();
    const campers = st.campers.slice().sort((a, b) => fullName(a).localeCompare(fullName(b)));
    view().innerHTML = `
      <div class="store-layout">
        <div>
          <div class="toolbar">
            <select id="catFilter">
              <option value="">All categories</option>
              ${D.STORE_CATEGORIES.map((c) => `<option>${c}</option>`).join("")}
            </select>
          </div>
          <div class="store-grid" id="storeGrid"></div>
        </div>
        <div class="card cart">
          <h3>🛒 Checkout</h3>
          <div class="field">
            <label>Charge to camper</label>
            <select id="storeCamper">
              <option value="">Select camper…</option>
              ${campers.map((c) => `<option value="${c.id}" ${c.id === storeCamperId ? "selected" : ""}>${esc(fullName(c))} — ${money(c.balance)}</option>`).join("")}
            </select>
          </div>
          <div id="cartLines" style="margin-top:12px;"></div>
          <div class="cart-total"><span>Total</span><span id="cartTotal">$0.00</span></div>
          <div id="balanceNote" class="muted" style="font-size:13px;margin-bottom:10px;"></div>
          <button class="btn" id="checkoutBtn" style="width:100%;" disabled>Complete Purchase</button>
        </div>
      </div>`;

    const grid = document.getElementById("storeGrid");
    function drawGrid() {
      const cat = document.getElementById("catFilter").value;
      let items = D.getState().store.slice();
      if (cat) items = items.filter((i) => i.category === cat);
      grid.innerHTML = items.length ? items.map((i) => `
        <div class="store-item">
          <div class="cat">${esc(i.category)}</div>
          <div class="name">${esc(i.name)}</div>
          <div class="price">${money(i.price)}</div>
          <div class="stock">${i.stock} in stock</div>
          <button class="btn btn-sm" style="width:100%;" onclick="App.addToCart('${i.id}')">Add</button>
          <button class="btn btn-sm btn-secondary" style="width:100%;margin-top:4px;" onclick="App.openItemModal('${i.id}')">Edit</button>
        </div>`).join("") : `<p class="empty">No items in this category.</p>`;
    }
    document.getElementById("catFilter").addEventListener("change", drawGrid);
    document.getElementById("storeCamper").addEventListener("change", (e) => { storeCamperId = e.target.value; drawCart(); });
    document.getElementById("checkoutBtn").addEventListener("click", doCheckout);
    drawGrid();
    drawCart();
  }

  function drawCart() {
    const lines = document.getElementById("cartLines");
    const totalEl = document.getElementById("cartTotal");
    const note = document.getElementById("balanceNote");
    const btn = document.getElementById("checkoutBtn");
    const st = D.getState();
    const entries = Object.entries(cart).filter(([, q]) => q > 0);
    let total = 0;
    lines.innerHTML = entries.length ? entries.map(([itemId, qty]) => {
      const item = st.store.find((i) => i.id === itemId);
      if (!item) return "";
      total += item.price * qty;
      return `<div class="cart-line">
        <span>${esc(item.name)}<br><span class="muted" style="font-size:12px;">${money(item.price)} each</span></span>
        <span class="qty">
          <button onclick="App.cartQty('${itemId}',-1)">−</button>
          <strong>${qty}</strong>
          <button onclick="App.cartQty('${itemId}',1)">+</button>
        </span>
      </div>`;
    }).join("") : `<p class="muted">Cart is empty. Add items from the left.</p>`;
    totalEl.textContent = money(total);

    const camper = storeCamperId ? D.getCamper(storeCamperId) : null;
    if (camper) {
      const after = camper.balance - total;
      note.innerHTML = `Balance: <strong>${money(camper.balance)}</strong> → after: <strong class="${after < 0 ? "neg" : "pos"}">${money(after)}</strong>`;
      btn.disabled = !(entries.length && after >= 0);
    } else {
      note.textContent = "Select a camper to charge.";
      btn.disabled = true;
    }
  }

  function doCheckout() {
    const res = D.checkout(storeCamperId, Object.entries(cart).map(([itemId, qty]) => ({ itemId, qty })));
    if (!res.ok) { toast(res.error, "error"); return; }
    toast(`Purchase complete — ${money(res.total)} charged`, "success");
    cart = {};
    drawStore();
  }

  /* ============================================================
     CAMP BANK
     ============================================================ */
  routes.bank = function () {
    titleEl().textContent = "Camp Bank";
    const st = D.getState();
    const campers = st.campers.slice().sort((a, b) => a.balance - b.balance);
    const total = campers.reduce((s, c) => s + c.balance, 0);
    view().innerHTML = `
      <div class="grid stat-grid" style="margin-bottom:18px;">
        ${stat("Total on Account", money(total), "all campers", "good")}
        ${stat("Avg Balance", money(campers.length ? total / campers.length : 0), "per camper", "")}
        ${stat("Low Balance", `${campers.filter((c) => c.balance < 5).length}`, "under $5", "warn")}
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        <table class="table">
          <thead><tr><th>Camper</th><th>Bunk</th><th class="num">Balance</th><th class="num">Actions</th></tr></thead>
          <tbody>
            ${campers.map((c) => {
              const bunk = D.getBunk(c.bunkId);
              return `<tr>
                <td onclick="navigate('camper/${c.id}')">${esc(fullName(c))}</td>
                <td onclick="navigate('camper/${c.id}')">${bunk ? esc(bunk.name) : "—"}</td>
                <td class="num ${c.balance < 5 ? "neg" : ""}">${money(c.balance)}</td>
                <td class="num"><button class="btn btn-sm" onclick="App.openFunds('${c.id}','add')">+ Funds</button></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  };

  /* ============================================================
     MODALS / ACTIONS
     ============================================================ */
  const App = {};

  App.selectBunk = selectBunk;
  App.regBack = function () { renderRegStep1(); };
  App.filterStay = function (label) {
    attFilter = attFilter === label ? null : label;
    routes.attendance();
  };

  // Keeps the start date / length-of-stay / end date fields in sync.
  App.recalcStay = function () {
    const start = document.getElementById("stayStart");
    const daysSel = document.getElementById("stayDays");
    const end = document.getElementById("stayEnd");
    if (!start || !daysSel || !end) return;
    if (daysSel.value === "custom") { end.removeAttribute("readonly"); return; }
    const days = Number(daysSel.value);
    if (start.value && days) {
      end.value = D.computeEndDate(start.value, days);
      end.setAttribute("readonly", "readonly");
    }
  };

  // Reads a chosen image, downscales it to <=400px, and stashes the data URL
  // in the form's hidden #photoData input while updating the preview.
  App.previewPhoto = function (input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 400;
        let { width, height } = img;
        if (width > height && width > max) { height = Math.round(height * max / width); width = max; }
        else if (height > max) { width = Math.round(width * max / height); height = max; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        const hidden = document.getElementById("photoData");
        if (hidden) hidden.value = dataUrl;
        const prev = document.getElementById("photoPreview");
        if (prev) {
          prev.style.backgroundImage = `url('${dataUrl}')`;
          prev.style.backgroundSize = "cover";
          prev.style.backgroundPosition = "center";
          prev.textContent = "";
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  App.openLogModal = function (target, id) {
    const opts = Object.entries(D.LOG_TYPES)
      .map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join("");
    openModal(`
      <h2>Add Log</h2>
      <form id="logForm">
        <div class="form-grid">
          <div class="field"><label>Type</label><select name="type">${opts}</select></div>
          <div class="field"><label>Severity</label>
            <select name="severity"><option value="normal">Normal</option><option value="high">High</option></select></div>
          <div class="field full"><label>Details *</label><textarea name="text" required placeholder="What happened?"></textarea></div>
          <div class="field full"><label>Logged by</label><input name="author" placeholder="Your name" value="Staff"></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn">Save Log</button>
        </div>
      </form>`);
    document.getElementById("logForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      D.addLog(target, id, data);
      closeModal();
      toast("Log saved", "success");
      render();
    });
  };

  App.toggleResolved = function (target, ownerId, logId) {
    D.toggleLogResolved(target, ownerId, logId);
    render();
  };

  App.openFunds = function (kidId, mode) {
    const c = D.getCamper(kidId);
    openModal(`
      <h2>${mode === "add" ? "Add Funds" : "Adjust Balance"} — ${esc(fullName(c))}</h2>
      <p class="muted">Current balance: <strong>${money(c.balance)}</strong></p>
      <form id="fundsForm">
        <div class="field"><label>Amount ($)${mode === "adjust" ? " — use negative to deduct" : ""}</label>
          <input name="amount" type="number" step="0.01" ${mode === "add" ? 'min="0"' : ""} required autofocus></div>
        <div class="field"><label>Memo</label><input name="memo" placeholder="${mode === "add" ? "Parent deposit" : "Adjustment"}"></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>`);
    document.getElementById("fundsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      let amount = Number(fd.get("amount"));
      if (mode === "add") amount = Math.abs(amount);
      D.addFunds(kidId, amount, fd.get("memo"));
      closeModal();
      toast("Balance updated", "success");
      render();
    });
  };

  App.openEditCamper = function (kidId) {
    const c = D.getCamper(kidId);
    openModal(`
      <h2>Edit Camper</h2>
      <form id="editForm">
        ${photoFieldHTML(c.photo)}
        <div class="form-grid">
          <div class="field"><label>First name</label><input name="firstName" value="${esc(c.firstName)}"></div>
          <div class="field"><label>Last name</label><input name="lastName" value="${esc(c.lastName)}"></div>
          <div class="field"><label>Age</label><input name="age" type="number" value="${esc(c.age)}"></div>
          <div class="field"><label>Grade</label><input name="grade" value="${esc(c.grade)}"></div>
          <div class="field"><label>Gender</label>
            <select name="gender">${selOpts(["", "Female", "Male", "Non-binary", "Prefer not to say"], c.gender)}</select></div>
          <div class="field"><label>T-shirt size</label>
            <select name="shirtSize">${selOpts(["", "YXS", "YS", "YM", "YL", "AS", "AM", "AL", "AXL"], c.shirtSize)}</select></div>
          <div class="field full"><label>Home address</label><input name="address" value="${esc(c.address)}"></div>
          ${attendanceFieldsHTML(c)}
          <div class="field"><label>Guardian name</label><input name="guardianName" value="${esc(c.guardianName)}"></div>
          <div class="field"><label>Relationship</label><input name="guardianRelationship" value="${esc(c.guardianRelationship)}"></div>
          <div class="field"><label>Guardian phone</label><input name="guardianPhone" value="${esc(c.guardianPhone)}"></div>
          <div class="field"><label>Guardian email</label><input name="guardianEmail" type="email" value="${esc(c.guardianEmail)}"></div>
          <div class="field full"><label>Emergency contact #1</label><input name="emergencyContact" value="${esc(c.emergencyContact)}"></div>
          <div class="field full"><label>Emergency contact #2</label><input name="emergencyContact2" value="${esc(c.emergencyContact2)}"></div>
          <div class="field full"><label>Authorized for pickup</label><input name="authorizedPickup" value="${esc(c.authorizedPickup)}"></div>
          <div class="field"><label>Allergies</label><input name="allergies" value="${esc(c.allergies)}"></div>
          <div class="field"><label>Dietary</label><input name="dietary" value="${esc(c.dietary)}"></div>
          <div class="field full"><label>Medical needs</label><input name="medicalNeeds" value="${esc(c.medicalNeeds)}"></div>
          <div class="field full"><label>Medications</label><input name="medications" value="${esc(c.medications)}"></div>
          <div class="field"><label>Physician</label><input name="physician" value="${esc(c.physician)}"></div>
          <div class="field"><label>Insurance</label><input name="insurance" value="${esc(c.insurance)}"></div>
          <div class="field"><label>Swim level</label>
            <select name="swimLevel">${selOpts(["", "Non-swimmer", "Beginner", "Intermediate", "Swimmer"], c.swimLevel)}</select></div>
          <div class="field"><label>Photo/media consent</label>
            <select name="photoConsent">${selOpts(["", "Yes", "No"], c.photoConsent)}</select></div>
          <div class="field full"><label>Notes</label><textarea name="notes">${esc(c.notes)}</textarea></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn">Save Changes</button>
        </div>
      </form>`, true);
    document.getElementById("editForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      D.updateCamper(kidId, data);
      closeModal();
      toast("Camper updated", "success");
      render();
    });
  };

  App.openReassign = function (kidId) {
    const c = D.getCamper(kidId);
    regDraft = null; // not in registration flow
    openModal(`
      <h2>Change Bunk — ${esc(fullName(c))}</h2>
      <div id="reassignMap">${bunkMapHTML({ selectMode: true, selectedBunk: c.bunkId })}</div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
      </div>`, true);
    // Override selectBunk behavior within modal via a temporary handler.
    App._reassignKid = kidId;
  };

  // When reassigning, App.selectBunk is used by the map cells. Detect context.
  const _origSelect = App.selectBunk;
  App.selectBunk = function (bunkId) {
    if (App._reassignKid) {
      const ok = D.assignBunk(App._reassignKid, bunkId);
      const b = D.getBunk(bunkId);
      if (ok) {
        toast(`Moved to bunk ${b.name}`, "success");
        App._reassignKid = null;
        closeModal();
        render();
      } else {
        toast("That bunk is full", "error");
      }
      return;
    }
    _origSelect(bunkId);
  };

  App.confirmDeleteCamper = function (kidId) {
    const c = D.getCamper(kidId);
    openModal(`
      <h2>Remove ${esc(fullName(c))}?</h2>
      <p>This permanently deletes the camper profile, logs, and transaction history.</p>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="App.doDeleteCamper('${kidId}')">Remove</button>
      </div>`);
  };
  App.doDeleteCamper = function (kidId) {
    D.deleteCamper(kidId);
    closeModal();
    toast("Camper removed");
    navigate("campers");
  };

  /* Store cart actions */
  App.addToCart = function (itemId) { cart[itemId] = (cart[itemId] || 0) + 1; drawCart(); };
  App.cartQty = function (itemId, delta) {
    cart[itemId] = Math.max(0, (cart[itemId] || 0) + delta);
    if (cart[itemId] === 0) delete cart[itemId];
    drawCart();
  };

  App.openItemModal = function (itemId) {
    const item = itemId ? D.getState().store.find((i) => i.id === itemId) : null;
    openModal(`
      <h2>${item ? "Edit Item" : "Add Store Item"}</h2>
      <form id="itemForm">
        <div class="form-grid">
          <div class="field full"><label>Name</label><input name="name" required value="${esc(item ? item.name : "")}"></div>
          <div class="field"><label>Category</label>
            <select name="category">${D.STORE_CATEGORIES.map((c) =>
              `<option ${item && item.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="field"><label>Price ($)</label><input name="price" type="number" step="0.01" min="0" required value="${item ? item.price : ""}"></div>
          <div class="field"><label>Stock</label><input name="stock" type="number" min="0" value="${item ? item.stock : 0}"></div>
        </div>
        <div class="form-actions">
          ${item ? `<button type="button" class="btn btn-danger" style="margin-right:auto;" onclick="App.deleteItem('${item.id}')">Delete</button>` : ""}
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>`);
    document.getElementById("itemForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      if (item) D.updateStoreItem(item.id, data); else D.addStoreItem(data);
      closeModal();
      toast("Item saved", "success");
      drawStore();
    });
  };
  App.deleteItem = function (itemId) {
    D.deleteStoreItem(itemId);
    delete cart[itemId];
    closeModal();
    toast("Item deleted");
    drawStore();
  };

  global.App = App;

  /* ============================================================
     DATA MANAGEMENT (export / import / reset)
     ============================================================ */
  function wireDataButtons() {
    document.getElementById("exportBtn").addEventListener("click", () => {
      const blob = new Blob([D.exportJSON()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cmp-camp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Backup downloaded", "success");
    });
    const fileInput = document.getElementById("importFile");
    document.getElementById("importBtn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { D.importJSON(reader.result); toast("Camp data imported", "success"); render(); }
        catch (err) { toast("Import failed: " + err.message, "error"); }
      };
      reader.readAsText(file);
      fileInput.value = "";
    });
    document.getElementById("resetBtn").addEventListener("click", () => {
      openModal(`
        <h2>Reset all camp data?</h2>
        <p>This restores the starter data and erases everything you've entered. Consider exporting a backup first.</p>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-danger" onclick="App.doReset()">Reset Everything</button>
        </div>`);
    });
  }
  App.doReset = function () {
    D.resetAll();
    closeModal();
    cart = {}; storeCamperId = ""; regDraft = null;
    toast("Camp data reset");
    navigate("dashboard");
    render();
  };

  /* ---------- Boot ---------- */
  function boot() {
    D.load();
    document.querySelectorAll(".nav-item").forEach((a) =>
      a.addEventListener("click", () => navigate(a.dataset.route)));
    wireDataButtons();
    global.addEventListener("hashchange", render);
    if (!global.location.hash) global.location.hash = "#dashboard";
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
