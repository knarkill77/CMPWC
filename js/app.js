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

  // Structured contact (name / relationship / phone) inputs for a form.
  function contactFieldsHTML(label, keys, d) {
    return `<div class="field full"><label>${label}</label>
      <div class="contact-grid">
        <input name="${keys.name}" placeholder="Name" value="${esc(d[keys.name] || "")}">
        <input name="${keys.rel}" placeholder="Relationship" value="${esc(d[keys.rel] || "")}">
        <input name="${keys.phone}" placeholder="Phone" value="${esc(d[keys.phone] || "")}">
      </div></div>`;
  }
  // Read-only one-line rendering of a structured contact.
  function contactDisplay(name, rel, phone) {
    if (!name && !rel && !phone) return "—";
    return `${esc(name || "")}${rel ? ` <span class="muted">(${esc(rel)})</span>` : ""}${phone ? ` — ${esc(phone)}` : ""}`;
  }
  // "Jun 15 – Jun 19"
  function fmtRange(s, e) {
    if (!s || !e) return "";
    const o = { month: "short", day: "numeric" };
    return new Date(s + "T00:00:00").toLocaleDateString(undefined, o) + " – " + new Date(e + "T00:00:00").toLocaleDateString(undefined, o);
  }
  // Top/Middle/Bottom bed chooser for a bunk; `onpick` is an App.* fn name.
  function bedPickerHTML(bunk, chosen, onpick) {
    const avail = D.availableBeds(bunk.id);
    return `<div class="card bed-card">
      <h4 style="margin:0 0 10px;">Choose a bed in Bunk ${esc(bunk.name)} <span class="muted">(top / middle / bottom)</span></h4>
      <div class="bed-opts">
        ${D.BED_POSITIONS.slice().reverse().map((pos) => {
          const taken = !avail.includes(pos);
          const sel = chosen === pos;
          return `<button type="button" class="bed-opt ${sel ? "sel" : ""} ${taken ? "taken" : ""}" ${taken ? "disabled" : `onclick="${onpick}('${pos}')"`}>${pos}${taken ? " · taken" : ""}</button>`;
        }).join("")}
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
    // The parent-facing enrollment route takes over the whole screen.
    document.body.classList.toggle("kiosk", name === "enroll");
    if (name !== "enroll") App._enrollMode = false;
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

  // Three bunkhouses side by side (Girls is half-width, on the left). No gym.
  function bunkMapHTML(options) {
    options = options || {};
    const st = D.getState();
    const sidesHTML = st.config.sides.map((side) => {
      const bunks = D.bunksForSide(side.id);
      return `<div class="map-side" style="flex:${side.bunkCount || bunks.length || 1};">
        <h3><span class="side-dot" style="background:${side.color}"></span> ${esc(side.name)}</h3>
        <div class="bunk-grid">
          ${bunks.map((b) => bunkCellHTML(b, options)).join("")}
        </div>
      </div>`;
    }).join("");
    return `<div class="map-wrap">${sidesHTML}</div>
    <p class="muted" style="margin-top:14px;font-size:13px;">
      ● ${options.selectMode ? "Click an open bunk, then pick a bed. Full bunks show a 🔒." : "Click a bunk to view its cabin, campers, and logs."}
      &nbsp; <span class="badge">3 beds each</span></p>`;
  }

  function bunkCellHTML(b, options) {
    const occ = D.bunkOccupancy(b.id);
    const full = occ >= b.capacity;
    const campers = D.campersInBunk(b.id);
    // Medical/incident alert flag only on the admin map (not the parent select view).
    const hasAlert = !options.selectMode && (
      b.logs.some((l) => !l.resolved && (l.type === "incident" || l.type === "injury")) ||
      campers.some((c) => c.logs.some((l) => !l.resolved && (l.type === "injury" || l.type === "incident" || l.type === "behavior" || l.type === "allergy"))));
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
      ${full ? `<span class="bunk-lock" title="Full">🔒</span>` : ""}
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
            <input id="counselorInput" list="counselorNames" value="${esc(b.counselor)}" placeholder="Assign counselor…" />
            <datalist id="counselorNames">${D.getState().counselors.map((x) => `<option value="${esc(x.name)}"></option>`).join("")}</datalist>
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
            <div class="field"><label>Grade</label>
              <select name="grade">${selOpts([""].concat(D.GRADES), d.grade)}</select></div>
            <div class="field"><label>Gender</label>
              <select name="gender">${selOpts(["", "Female", "Male", "Non-binary", "Prefer not to say"], d.gender)}</select></div>
            <div class="field"><label>T-shirt size</label>
              <select name="shirtSize">${selOpts([""].concat(D.SHIRT_SIZES), d.shirtSize)}</select></div>
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
            ${contactFieldsHTML("Emergency contact #1", { name: "emergencyName", rel: "emergencyRel", phone: "emergencyPhone" }, d)}
            ${contactFieldsHTML("Emergency contact #2", { name: "emergency2Name", rel: "emergency2Rel", phone: "emergency2Phone" }, d)}
            ${contactFieldsHTML("Authorized for pickup", { name: "pickupName", rel: "pickupRel", phone: "pickupPhone" }, d)}
          </div>

          <h4 class="section-title">Medical & Health</h4>
          <div class="form-grid">
            <div class="field"><label>Allergies</label><input name="allergies" placeholder="e.g. Peanuts" value="${esc(d.allergies || "")}"></div>
            <div class="field"><label>Dietary needs</label><input name="dietary" placeholder="e.g. Vegetarian" value="${esc(d.dietary || "")}"></div>
            <div class="field full"><label>Medical needs / conditions</label><input name="medicalNeeds" placeholder="e.g. Asthma — inhaler" value="${esc(d.medicalNeeds || "")}"></div>
            <div class="field full"><label>Medications (name, dose, schedule)</label><input name="medications" value="${esc(d.medications || "")}"></div>
            <div class="field"><label>Physician (name & phone)</label><input name="physician" value="${esc(d.physician || "")}"></div>
            <div class="field"><label>Insurance (provider & policy #)</label><input name="insurance" value="${esc(d.insurance || "")}"></div>
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
    const bunk = regDraft.bunkId ? D.getBunk(regDraft.bunkId) : null;
    view().innerHTML = `
      <div class="card" style="margin-bottom:16px;">
        <h3 style="margin:0;">Step 2 of 2 — Choose a Bunk &amp; Bed for ${esc(regDraft.firstName)} ${esc(regDraft.lastName)}</h3>
        <p class="muted" style="margin:6px 0 0;">Pick an open bunk, then choose a bed. Girls, West, and East bunkhouses.</p>
      </div>
      <div id="mapHost">${bunkMapHTML({ selectMode: true, selectedBunk: regDraft.bunkId })}</div>
      <div id="regBedHost">${bunk ? bedPickerHTML(bunk, regDraft.bed, "App.regPickBed") : ""}</div>
      <div class="form-actions" style="max-width:none;">
        <button class="btn btn-secondary" onclick="App.regBack()">← Back</button>
        <button class="btn btn-accent" id="finishReg" ${regDraft.bunkId && regDraft.bed ? "" : "disabled"}>Complete Registration</button>
      </div>`;
    const fin = document.getElementById("finishReg");
    fin.addEventListener("click", finishRegistration);
  }

  function selectBunk(bunkId) {
    const b = D.getBunk(bunkId);
    regDraft.bunkId = bunkId;
    regDraft.sideId = b.sideId;
    regDraft.bed = "";          // reset bed when bunk changes
    renderRegStep2();           // re-render so the bed picker appears
    toast(`Bunk ${b.name} selected — pick a bed`, "success");
  }

  function finishRegistration() {
    const c = D.addCamper(regDraft);
    regDraft = null;
    toast(`${fullName(c)} registered!`, "success");
    navigate("camper/" + c.id);
  }

  /* ============================================================
     CAMPERS LIST (admin) — sortable, with a flags/incidents column
     ============================================================ */
  let camperSort = { key: "name", dir: 1 };
  let camperDraw = null;

  // Natural bunk ordering: side order (Girls, West, East) then bunk number.
  function bunkSortKey(c) {
    const sideOrder = D.getState().config.sides.map((s) => s.id);
    const si = sideOrder.indexOf(c.sideId);
    const bunk = D.getBunk(c.bunkId);
    const num = bunk ? parseInt(bunk.name.replace(/\D/g, ""), 10) || 0 : 0;
    return [si < 0 ? 99 : si, num];
  }

  routes.campers = function () {
    titleEl().textContent = "Campers";
    actionsEl().innerHTML = `<button class="btn btn-accent" onclick="navigate('register')">+ Register Camper</button>`;
    const st = D.getState();

    const arrow = (key) => camperSort.key === key ? (camperSort.dir > 0 ? " ▲" : " ▼") : "";
    const th = (key, label, cls) => `<th class="${cls || ""} sortable" onclick="App.sortCampers('${key}')">${label}${arrow(key)}</th>`;

    view().innerHTML = `
      <div class="toolbar">
        <input type="search" id="camperSearch" placeholder="Search campers…" style="min-width:240px;">
        <select id="sideFilter">
          <option value="">All sides</option>
          ${st.config.sides.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}
        </select>
        <select id="flagFilter">
          <option value="">All campers</option>
          <option value="flags">Any flag / incident</option>
          <option value="incident">Open incidents</option>
          <option value="behavior">Behavior incidents</option>
          <option value="medical">Medical / allergy</option>
          <option value="low">Low balance (&lt;$5)</option>
        </select>
        <div class="spacer"></div>
        <span class="muted" style="font-size:13px;">Click a column to sort</span>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        <table class="table">
          <thead><tr>
            ${th("name", "Camper")}${th("age", "Age")}${th("side", "Side")}${th("bunk", "Bunk / Bed")}
            <th>Flags &amp; Incidents</th>${th("balance", "Balance", "num")}
          </tr></thead>
          <tbody id="camperRows"></tbody>
        </table>
      </div>`;

    camperDraw = function () {
      const q = (document.getElementById("camperSearch").value || "").toLowerCase();
      const side = document.getElementById("sideFilter").value;
      const flag = document.getElementById("flagFilter").value;
      let list = D.getState().campers.slice();
      if (q) list = list.filter((c) => fullName(c).toLowerCase().includes(q));
      if (side) list = list.filter((c) => c.sideId === side);
      if (flag === "flags") list = list.filter((c) => D.camperFlags(c).length);
      if (flag === "incident") list = list.filter((c) => c.logs.some((l) => !l.resolved && (l.type === "injury" || l.type === "incident")));
      if (flag === "behavior") list = list.filter((c) => c.logs.some((l) => !l.resolved && l.type === "behavior"));
      if (flag === "medical") list = list.filter((c) => (c.allergies && c.allergies.trim()) || (c.medicalNeeds && c.medicalNeeds.trim()));
      if (flag === "low") list = list.filter((c) => c.balance < 5);

      const dir = camperSort.dir;
      const sorters = {
        name: (a, b) => fullName(a).localeCompare(fullName(b)),
        age: (a, b) => (Number(a.age) || 0) - (Number(b.age) || 0),
        side: (a, b) => { const ka = bunkSortKey(a), kb = bunkSortKey(b); return ka[0] - kb[0] || ka[1] - kb[1]; },
        bunk: (a, b) => { const ka = bunkSortKey(a), kb = bunkSortKey(b); return ka[0] - kb[0] || ka[1] - kb[1]; },
        balance: (a, b) => a.balance - b.balance,
      };
      list.sort((a, b) => (sorters[camperSort.key] || sorters.name)(a, b) * dir || fullName(a).localeCompare(fullName(b)));

      const rows = document.getElementById("camperRows");
      if (!list.length) { rows.innerHTML = `<tr><td colspan="6"><p class="empty">No campers match.</p></td></tr>`; return; }
      rows.innerHTML = list.map((c) => {
        const bunk = D.getBunk(c.bunkId);
        const side = D.getSide(c.sideId);
        const flags = D.camperFlags(c);
        const flagHTML = flags.length
          ? flags.map((f) => `<span class="flag-chip flag-${f.kind}" title="${esc(f.label)}">${f.icon} ${esc(f.label)}</span>`).join(" ")
          : `<span class="muted">—</span>`;
        return `<tr onclick="navigate('camper/${c.id}')">
          <td>${avatarHTML(c, 28, true)}${esc(fullName(c))}</td>
          <td>${esc(c.age)}</td>
          <td>${side ? `<span class="badge side-${side.id}">${esc(side.name)}</span>` : "—"}</td>
          <td>${bunk ? esc(bunk.name) : "—"}${c.bed ? ` <span class="muted">· ${esc(c.bed)}</span>` : ""}</td>
          <td>${flagHTML}</td>
          <td class="num">${money(c.balance)}</td>
        </tr>`;
      }).join("");
    };

    ["camperSearch", "sideFilter", "flagFilter"].forEach((id) =>
      document.getElementById(id).addEventListener("input", camperDraw));
    camperDraw();
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
                Age ${esc(c.age || "—")}${c.grade ? ` · ${esc(c.grade)}` : ""} ·
                ${side ? `<span class="badge side-${side.id}">${esc(side.name)}</span>` : ""}
                ${bunk ? `Bunk <a href="#bunk/${bunk.id}">${esc(bunk.name)}</a>${c.bed ? ` · ${esc(c.bed)} bed` : ""}` : `<span class="muted">No bunk</span>`}
              </div>
            </div>
          </div>
          <dl class="kv" style="margin-top:14px;">
            <dt>Camp</dt><dd>${esc(c.campName) || "—"}${c.campFee ? ` <span class="badge">${money(c.campFee)}</span>` : ""}</dd>
            <dt>Attendance</dt><dd>${c.startDate && c.endDate
              ? `${esc(c.startDate)} → ${esc(c.endDate)} <span class="badge">${D.camperDuration(c)} days</span>`
              : "—"}</dd>
            <dt>Bunk / Bed</dt><dd>${bunk ? `${esc(bunk.name)}${c.bed ? ` · ${esc(c.bed)}` : ""}` : "—"}</dd>
            <dt>Gender</dt><dd>${esc(c.gender) || "—"}</dd>
            <dt>Shirt size</dt><dd>${esc(c.shirtSize) || "—"}</dd>
            <dt>Address</dt><dd>${esc(c.address) || "—"}</dd>
            <dt>Counselor</dt><dd>${c.counselor ? esc(c.counselor) : (bunk && bunk.counselor ? `${esc(bunk.counselor)} <span class="muted">(via bunk)</span>` : "—")}</dd>
            <dt>Guardian</dt><dd>${esc(c.guardianName) || "—"}${c.guardianRelationship ? ` (${esc(c.guardianRelationship)})` : ""}</dd>
            <dt>Guardian phone</dt><dd>${esc(c.guardianPhone) || "—"}</dd>
            <dt>Guardian email</dt><dd>${esc(c.guardianEmail) || "—"}</dd>
            <dt>Emergency #1</dt><dd>${contactDisplay(c.emergencyName, c.emergencyRel, c.emergencyPhone)}</dd>
            <dt>Emergency #2</dt><dd>${contactDisplay(c.emergency2Name, c.emergency2Rel, c.emergency2Phone)}</dd>
            <dt>Authorized pickup</dt><dd>${contactDisplay(c.pickupName, c.pickupRel, c.pickupPhone)}</dd>
            <dt>Allergies</dt><dd>${c.allergies ? `<span class="badge high">🥜 ${esc(c.allergies)}</span>` : "—"}</dd>
            <dt>Medical needs</dt><dd>${c.medicalNeeds ? `<span class="badge high">🏥 ${esc(c.medicalNeeds)}</span>` : "—"}</dd>
            <dt>Medications</dt><dd>${esc(c.medications) || "—"}</dd>
            <dt>Dietary</dt><dd>${esc(c.dietary) || "—"}</dd>
            <dt>Physician</dt><dd>${esc(c.physician) || "—"}</dd>
            <dt>Insurance</dt><dd>${esc(c.insurance) || "—"}</dd>
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
          <h3 style="margin:0;">🎒 Pre-Purchased Gear <span class="muted">(waiting on the bunk)</span></h3>
          <button class="btn btn-sm" onclick="App.openPrepurchase('${c.id}')">+ Add Gear</button>
        </div>
        ${gearListHTML(c)}
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

  /* ---------- Shared helpers for the new modules ---------- */
  // Pre-purchased gear list shown on a camper profile.
  function gearListHTML(c) {
    const pp = c.prepurchases || [];
    if (!pp.length) return `<p class="empty">No gear pre-purchased. Use “Add Gear”, or sell a package during enrollment.</p>`;
    return `<ul class="log-list" style="margin-top:12px;">${pp.map((p) => `
      <li class="log-item ${p.fulfilled ? "resolved" : ""}">
        <span class="log-icon">${p.kind === "package" ? "🎁" : "🎽"}</span>
        <div class="log-body">
          <div class="log-text">${esc(p.name)}${p.qty > 1 ? ` ×${p.qty}` : ""}</div>
          <div class="log-meta">
            <span class="badge">${p.kind === "package" ? "Package" : "Item"}</span>
            <span>${money(p.price * p.qty)}</span>
            ${p.fulfilled ? `<span class="badge resolved">Delivered to bunk</span>` : `<span class="badge high">Awaiting delivery</span>`}
          </div>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="App.toggleGear('${c.id}','${p.id}')">${p.fulfilled ? "Mark waiting" : "Mark delivered"}</button>
      </li>`).join("")}</ul>`;
  }

  // Short, chip-friendly clinician name ("Coach Dan “Tank” Rivera" -> "Tank").
  function shortName(n) {
    const m = n.match(/[“"]([^”"]+)[”"]/);
    if (m) return m[1];
    const parts = n.replace(/^(Coach|Dr\.?)\s+/i, "").split(" ");
    return parts[parts.length - 1];
  }
  function clinInitials(cl) {
    const p = cl.name.replace(/^(Coach|Dr\.?)\s+/i, "").replace(/[“”"]/g, "").split(" ");
    return ((p[0] || "?")[0] + ((p[1] || "")[0] || "")).toUpperCase();
  }
  function clinAvatar(cl, size) {
    const s = size || 52;
    if (cl.photo) return `<div class="avatar" style="width:${s}px;height:${s}px;background-image:url('${cl.photo}');background-size:cover;background-position:center;"></div>`;
    return `<div class="avatar" style="width:${s}px;height:${s}px;font-size:${Math.round(s / 2.6)}px;background:var(--brand);">${clinInitials(cl)}</div>`;
  }
  function packetLogo() {
    const img = document.querySelector(".brand-logo");
    return img ? img.src : "";
  }

  function initialsFromName(n) {
    const p = String(n || "?").replace(/^(Coach|Dr\.?)\s+/i, "").split(" ");
    return ((p[0] || "?")[0] + ((p[1] || "")[0] || "")).toUpperCase();
  }

  /* ============================================================
     COUNSELORS — roster + assign to bunks (individual / group / side)
     ============================================================ */
  let counselorPick = "";    // counselor name selected for assignment
  let bunkSelection = {};     // bunkId -> true (multi-select for bulk assign)

  routes.counselors = function () {
    titleEl().textContent = "Counselors";
    actionsEl().innerHTML = `<button class="btn btn-accent" onclick="App.openCounselor()">+ Add Counselor</button>`;
    drawCounselors();
  };

  function drawCounselors() {
    const st = D.getState();
    const selIds = Object.keys(bunkSelection);
    view().innerHTML = `
      <h3 class="section-title" style="margin-top:0;">Assign Counselors to Bunks <span class="muted">— one bunk, a group, or a whole side</span></h3>
      <div class="card">
        <div class="assign-bar">
          <div class="field" style="margin:0;min-width:200px;">
            <label>Counselor to assign</label>
            <select id="assignCounselor">
              <option value="">— choose counselor —</option>
              ${st.counselors.map((c) => `<option ${c.name === counselorPick ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
              <option value="__clear__" ${counselorPick === "__clear__" ? "selected" : ""}>(Unassign / clear)</option>
            </select>
          </div>
          <div class="assign-quick">
            <span class="muted" style="font-size:13px;">Quick select:</span>
            ${st.config.sides.map((s) => `<button class="btn btn-sm btn-secondary" onclick="App.selectSideBunks('${s.id}')">All ${esc(s.name)}</button>`).join("")}
            <button class="btn btn-sm btn-secondary" onclick="App.selectAllBunks()">All bunks</button>
            <button class="btn btn-sm btn-secondary" onclick="App.clearBunkSel()">Clear</button>
          </div>
          <div class="spacer"></div>
          <button class="btn btn-accent" onclick="App.applyAssign()" ${selIds.length && counselorPick ? "" : "disabled"}>
            Apply to ${selIds.length} bunk(s)
          </button>
        </div>
        <div class="assign-map">
          ${st.config.sides.map((side) => `
            <div class="map-side">
              <h3><span class="side-dot" style="background:${side.color}"></span> ${esc(side.name)}</h3>
              <div class="bunk-grid">
                ${D.bunksForSide(side.id).map((b) => {
                  const sel = !!bunkSelection[b.id];
                  return `<div class="bunk-cell selectable ${sel ? "selected" : ""}" onclick="App.toggleBunkSel('${b.id}')">
                    <div class="bunk-name">${esc(b.name)}</div>
                    <div class="occ">${D.bunkOccupancy(b.id)}/${b.capacity}</div>
                    <div class="bunk-coach">${b.counselor ? esc(b.counselor) : "<span class='muted'>—</span>"}</div>
                  </div>`;
                }).join("")}
              </div>
            </div>`).join("")}
        </div>
      </div>

      <h3 class="section-title">Counselor Roster <span class="muted">(${st.counselors.length})</span></h3>
      <div class="clin-grid">
        ${st.counselors.length ? st.counselors.map(counselorCardHTML).join("") : `<p class="empty">No counselors yet.</p>`}
      </div>`;
    document.getElementById("assignCounselor").addEventListener("change", (e) => { counselorPick = e.target.value; drawCounselors(); });
  }

  function counselorCardHTML(c) {
    const load = D.counselorLoad(c.name);
    return `<div class="card clin-card">
      <div class="detail-head" style="margin-bottom:6px;cursor:pointer;" onclick="navigate('counselor/${c.id}')">
        <div class="avatar" style="background:var(--accent);">${esc(initialsFromName(c.name))}</div>
        <div><h3 style="margin:0;">${esc(c.name)}</h3><div class="detail-meta">${esc(c.role || "")}</div></div>
      </div>
      ${c.phone ? `<div class="muted" style="font-size:13px;">📞 ${esc(c.phone)}</div>` : ""}
      <div class="muted" style="font-size:13px;margin-top:8px;">🏕️ <strong>${load.bunks}</strong> bunk(s) · 🧒 <strong>${load.bunkCampers + load.directCampers}</strong> camper(s)</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
        <button class="btn btn-sm" onclick="navigate('counselor/${c.id}')">View athletes</button>
        <button class="btn btn-sm btn-secondary" onclick="App.openCounselor('${c.id}')">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" onclick="App.deleteCounselor('${c.id}')">Remove</button>
      </div>
    </div>`;
  }

  /* Counselor detail — every athlete under this counselor (by bunk + direct). */
  routes.counselor = function (id) {
    const c = D.getCounselor(id);
    if (!c) { view().innerHTML = `<p class="empty">Counselor not found.</p>`; return; }
    titleEl().textContent = c.name;
    actionsEl().innerHTML = `
      <button class="btn btn-secondary" onclick="App.openCounselor('${c.id}')">✏️ Edit</button>
      <button class="btn btn-secondary" onclick="navigate('counselors')">← Counselors</button>`;
    const bunks = D.getState().bunks.filter((b) => b.counselor === c.name);
    // Athletes via the counselor's bunks, plus any assigned individually.
    const byBunk = {};
    let total = 0;
    bunks.forEach((b) => { byBunk[b.id] = D.campersInBunk(b.id); total += byBunk[b.id].length; });
    const direct = D.getState().campers.filter((k) => k.counselor === c.name && !bunks.some((b) => b.id === k.bunkId));
    total += direct.length;

    const camperRow = (k) => {
      const bunk = D.getBunk(k.bunkId);
      const flags = D.camperFlags(k).map((f) => f.icon).join(" ");
      return `<div class="cart-line" style="cursor:pointer;" onclick="navigate('camper/${k.id}')">
        <span>${avatarHTML(k, 28, true)}${esc(fullName(k))} <span class="muted">· ${esc(k.age)}</span></span>
        <span class="muted">${bunk ? esc(bunk.name) : "—"}${k.bed ? " · " + esc(k.bed) : ""} ${flags}</span>
      </div>`;
    };

    view().innerHTML = `
      <div class="row">
        <div class="card" style="flex:1;">
          <div class="detail-head">
            <div class="avatar" style="background:var(--accent);">${esc(initialsFromName(c.name))}</div>
            <div><h2>${esc(c.name)}</h2><div class="detail-meta">${esc(c.role || "Counselor")}${c.phone ? ` · 📞 ${esc(c.phone)}` : ""}</div></div>
          </div>
          <div class="muted" style="margin-top:10px;">Covering <strong>${bunks.length}</strong> bunk(s) and <strong>${total}</strong> athlete(s).</div>
        </div>
      </div>
      ${bunks.length ? bunks.map((b) => `
        <div class="card" style="margin-top:16px;">
          <h3 style="margin:0 0 8px;">🏕️ Bunk ${esc(b.name)} <span class="muted">(${byBunk[b.id].length}/${b.capacity})</span></h3>
          ${byBunk[b.id].length ? byBunk[b.id].map(camperRow).join("") : `<p class="muted">No campers in this bunk yet.</p>`}
        </div>`).join("") : ""}
      ${direct.length ? `<div class="card" style="margin-top:16px;">
        <h3 style="margin:0 0 8px;">🧒 Individually assigned</h3>
        ${direct.map(camperRow).join("")}</div>` : ""}
      ${!bunks.length && !direct.length ? `<div class="card" style="margin-top:16px;"><p class="empty">No athletes assigned yet. Assign bunks on the Counselors page.</p></div>` : ""}`;
  };

  /* ============================================================
     CLINICIANS
     ============================================================ */
  routes.clinicians = function () {
    titleEl().textContent = "Camp Clinicians";
    actionsEl().innerHTML = `<button class="btn btn-accent" onclick="App.openClinician()">+ Add Clinician</button>`;
    const st = D.getState();
    const dates = D.sessionDates();
    const today = D.ymd(new Date());

    view().innerHTML = `
      <h3 class="section-title" style="margin-top:0;">Daily Schedule <span class="muted">— who's coming in each day</span></h3>
      <div class="card" style="overflow-x:auto;">
        <div class="clin-days">
          ${dates.map((ds) => {
            const list = D.cliniciansOnDate(ds);
            const d = new Date(ds + "T00:00:00");
            return `<div class="clin-day ${ds === today ? "today" : ""}">
              <div class="clin-day-date"><span>${d.toLocaleDateString(undefined, { weekday: "short" })}</span><strong>${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</strong></div>
              <div class="clin-day-list">
                ${list.length ? list.map((cl) => `<span class="chip clin-chip" title="${esc(cl.name)} — ${esc(cl.specialty)}">${esc(shortName(cl.name))}</span>`).join("")
                  : `<span class="muted" style="font-size:12px;">—</span>`}
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>

      <h3 class="section-title">Clinician Roster <span class="muted">(${st.clinicians.length})</span></h3>
      <div class="clin-grid">
        ${st.clinicians.length ? st.clinicians.map(clinicianCardHTML).join("") : `<p class="empty">No clinicians yet. Add one to start scheduling.</p>`}
      </div>`;
  };

  function clinicianCardHTML(cl) {
    const days = (cl.schedule || []).length;
    return `<div class="card clin-card">
      <div class="detail-head" style="margin-bottom:6px;">
        ${clinAvatar(cl, 52)}
        <div><h3 style="margin:0;">${esc(cl.name)}</h3>
          <div class="detail-meta">${esc(cl.specialty || "")}</div></div>
      </div>
      ${cl.accolades ? `<div class="badge" style="margin-bottom:8px;">🏅 ${esc(cl.accolades)}</div>` : ""}
      <p class="muted" style="font-size:13px;margin:6px 0 12px;">${esc(cl.bio || "")}</p>
      <div class="muted" style="font-size:13px;">📅 <strong>${days}</strong> day${days === 1 ? "" : "s"} scheduled</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
        <button class="btn btn-sm" onclick="App.openClinicianSchedule('${cl.id}')">📅 Schedule</button>
        <button class="btn btn-sm btn-secondary" onclick="App.openClinician('${cl.id}')">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" onclick="App.deleteClinician('${cl.id}')">Remove</button>
      </div>
    </div>`;
  }

  /* ============================================================
     MEALS & MENU
     ============================================================ */
  let menuDate = null;
  routes.menu = function () {
    titleEl().textContent = "Meals & Menu";
    const dates = D.sessionDates();
    const today = D.ymd(new Date());
    if (!menuDate || !dates.includes(menuDate)) {
      // Prefer today; if today's menu is empty, jump to the first day that has one.
      const planned = Object.keys(D.getState().menus).filter((d) => dates.includes(d)).sort();
      const todayHasMenu = D.MEALS.some((m) => (D.getMenu(today)[m.key] || []).length);
      menuDate = (dates.includes(today) && todayHasMenu) ? today : (planned[0] || (dates.includes(today) ? today : dates[0]));
    }
    actionsEl().innerHTML = "";
    drawMenu();
  };

  function drawMenu() {
    const dates = D.sessionDates();
    const menu = D.getMenu(menuDate);
    const present = D.campersOnDate(menuDate).length;
    const alerts = D.menuAllergyAlerts(menuDate);
    view().innerHTML = `
      <div class="toolbar">
        <label class="muted">Menu for</label>
        <select id="menuDateSel">${dates.map((ds) => `<option value="${ds}" ${ds === menuDate ? "selected" : ""}>${new Date(ds + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</option>`).join("")}</select>
        <span class="badge">${present} campers at camp</span>
        <div class="spacer"></div>
      </div>
      <div class="menu-layout">
        <div class="menu-meals">
          ${D.MEALS.map((m) => mealCardHTML(m, menu[m.key] || [])).join("")}
        </div>
        <div class="card menu-alerts ${alerts.length ? "has-alerts" : ""}">
          <h3>${alerts.length ? "⚠️ Allergy Alerts" : "✅ Allergy Cross-Check"}</h3>
          ${alerts.length
            ? `<p class="muted" style="font-size:13px;">${alerts.length} potential conflict${alerts.length === 1 ? "" : "s"} between today's menu and campers present. Flag with the kitchen and these athletes.</p>
               <ul class="log-list">${alerts.map(alertItemHTML).join("")}</ul>`
            : `<p class="muted">No allergy conflicts detected between this day's menu and the campers present. 🎉</p>`}
        </div>
      </div>`;
    document.getElementById("menuDateSel").addEventListener("change", (e) => { menuDate = e.target.value; drawMenu(); });
    D.MEALS.forEach((m) => {
      const inp = document.getElementById("add_" + m.key);
      if (inp) inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); App.addDish(m.key); } });
    });
  }

  function mealCardHTML(m, dishes) {
    const present = D.campersOnDate(menuDate);
    return `<div class="card meal-card">
      <h3>${m.icon} ${m.label}</h3>
      <div class="meal-dishes">
        ${dishes.length ? dishes.map((dish, i) => {
          const da = D.dishAllergens(dish);
          const conflict = da.length && present.some((c) => D.camperAllergens(c).some((a) => da.includes(a)));
          return `<span class="chip dish ${conflict ? "dish-flag" : ""}" title="${da.length ? "Contains: " + da.join(", ") : "No allergens tagged"}">${esc(D.dishName(dish))}${da.length ? ` <span class="dish-alg">${da.map(esc).join(", ")}</span>` : ""}${conflict ? " ⚠️" : ""}<button onclick="App.editDish('${m.key}',${i})" title="Edit allergens">✎</button><button onclick="App.removeDish('${m.key}',${i})" title="Remove">×</button></span>`;
        }).join("") : `<span class="muted" style="font-size:13px;">No dishes yet.</span>`}
      </div>
      <div style="display:flex;gap:6px;margin-top:12px;">
        <input id="add_${m.key}" placeholder="Add a dish…" style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-family:inherit;">
        <button class="btn btn-sm" onclick="App.addDish('${m.key}')">Add</button>
      </div>
    </div>`;
  }

  // Modal to name a dish and tag the allergens it contains (common + camper customs).
  function openDishModal(mealKey, idx, presetName) {
    const menu = D.getMenu(menuDate);
    const existing = idx != null ? menu[mealKey][idx] : null;
    const name = existing ? D.dishName(existing) : (presetName || "");
    const current = existing ? D.dishAllergens(existing) : D.dishAllergens(name);
    const opts = D.allergenOptions();
    const checkbox = (o) => `<label class="alg-check"><input type="checkbox" value="${esc(o.value)}" ${current.includes(o.value) ? "checked" : ""}> ${esc(o.label)}</label>`;
    const mealLabel = (D.MEALS.find((m) => m.key === mealKey) || {}).label || "";
    openModal(`
      <h2>${existing ? "Edit dish" : "Add dish"} — ${esc(mealLabel)}</h2>
      <form id="dishForm">
        <div class="field"><label>Dish name *</label><input name="name" required value="${esc(name)}" autofocus></div>
        <div class="field"><label>Allergens in this dish</label>
          <div class="alg-grid">
            <div class="alg-group"><div class="alg-head">Common allergens</div>${opts.common.map(checkbox).join("")}</div>
            ${opts.custom.length ? `<div class="alg-group"><div class="alg-head">From campers' profiles</div>${opts.custom.map(checkbox).join("")}</div>` : ""}
          </div>
          <div class="muted" style="font-size:12px;margin-top:6px;">Anything checked here triggers an allergy alert for campers present that day. Custom allergens from campers' files appear automatically.</div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn">${existing ? "Save" : "Add dish"}</button>
        </div>
      </form>`, true);
    document.getElementById("dishForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const nm = (fd.get("name") || "").trim();
      if (!nm) return;
      const allergens = [...e.target.querySelectorAll('input[type="checkbox"]:checked')].map((x) => x.value);
      const dishes = (D.getMenu(menuDate)[mealKey] || []).slice();
      if (idx != null) dishes[idx] = { name: nm, allergens };
      else dishes.push({ name: nm, allergens });
      D.setMenu(menuDate, mealKey, dishes);
      closeModal();
      drawMenu();
    });
  }

  function alertItemHTML(a) {
    return `<li class="log-item">
      <span class="log-icon">🥜</span>
      <div class="log-body">
        <div class="log-text"><strong>${esc(a.camper)}</strong> — ${esc(a.allergens.join(", "))}</div>
        <div class="log-meta"><span class="badge high">${a.mealIcon} ${esc(a.mealLabel)}</span><span>${esc(a.dish)}</span></div>
      </div>
      <button class="btn btn-sm btn-secondary" onclick="navigate('camper/${a.camperId}')">Profile →</button>
    </li>`;
  }

  /* ============================================================
     PRO SHOP & GEAR FULFILLMENT
     ============================================================ */
  routes.gear = function () {
    titleEl().textContent = "Pro Shop & Gear";
    actionsEl().innerHTML = `<button class="btn btn-accent" onclick="App.openPackage()">+ Add Package</button>`;
    const st = D.getState();
    const pps = D.allPrepurchases();
    const pending = pps.filter((p) => !p.fulfilled);
    const delivered = pps.filter((p) => p.fulfilled);

    view().innerHTML = `
      <div class="grid stat-grid" style="margin-bottom:18px;">
        ${stat("Gear Orders", String(pps.length), "pre-purchased", "")}
        ${stat("Awaiting Delivery", String(pending.length), "to place on bunks", pending.length ? "warn" : "good")}
        ${stat("Delivered", String(delivered.length), "on the bunk", "good")}
        ${stat("Pre-Sale Value", money(pps.reduce((s, p) => s + p.price * p.qty, 0)), "gear revenue", "")}
      </div>

      <h3 class="section-title" style="margin-top:0;">Gear Packages</h3>
      <div class="pkg-grid">
        ${st.gearPackages.map(packageCardHTML).join("")}
      </div>

      <h3 class="section-title">Fulfillment — gear waiting to hit the bunks</h3>
      <div class="toolbar">
        <select id="fulFilter">
          <option value="pending">Awaiting delivery</option>
          <option value="all">All orders</option>
          <option value="done">Delivered</option>
        </select>
        <div class="spacer"></div>
      </div>
      <div class="card" style="padding:0;overflow:hidden;"><table class="table">
        <thead><tr><th>Camper</th><th>Bunk</th><th>Gear</th><th class="num">Value</th><th>Status</th></tr></thead>
        <tbody id="fulRows"></tbody>
      </table></div>`;

    function draw() {
      const f = document.getElementById("fulFilter").value;
      let list = D.allPrepurchases();
      if (f === "pending") list = list.filter((p) => !p.fulfilled);
      if (f === "done") list = list.filter((p) => p.fulfilled);
      list.sort((a, b) => {
        const ba = D.getBunk(a.bunkId), bb = D.getBunk(b.bunkId);
        return (ba ? ba.name : "~").localeCompare(bb ? bb.name : "~", undefined, { numeric: true });
      });
      const rows = document.getElementById("fulRows");
      rows.innerHTML = list.length ? list.map((p) => {
        const bunk = D.getBunk(p.bunkId);
        return `<tr>
          <td onclick="navigate('camper/${p.camperId}')" style="cursor:pointer;">${esc(p.camper)}</td>
          <td>${bunk ? `<a href="#bunk/${bunk.id}">${esc(bunk.name)}</a>` : "—"}</td>
          <td>${p.kind === "package" ? "🎁" : "🎽"} ${esc(p.name)}${p.qty > 1 ? ` ×${p.qty}` : ""}</td>
          <td class="num">${money(p.price * p.qty)}</td>
          <td><button class="btn btn-sm ${p.fulfilled ? "btn-secondary" : ""}" onclick="App.toggleGearFul('${p.camperId}','${p.id}')">${p.fulfilled ? "✓ Delivered" : "Mark delivered"}</button></td>
        </tr>`;
      }).join("") : `<tr><td colspan="5"><p class="empty">No gear orders here.</p></td></tr>`;
    }
    document.getElementById("fulFilter").addEventListener("change", draw);
    draw();
  };

  function packageCardHTML(pkg) {
    return `<div class="card pkg-card ${pkg.popular ? "popular" : ""}">
      ${pkg.popular ? `<span class="pkg-flag">★ Most Popular</span>` : ""}
      <h3 style="margin-bottom:4px;">${esc(pkg.name)}</h3>
      <div class="pkg-price">${money(pkg.price)}</div>
      <p class="muted" style="font-size:13px;">${esc(pkg.description || "")}</p>
      <ul class="pkg-items">${(pkg.items || []).map((i) => `<li>✓ ${esc(i)}</li>`).join("")}</ul>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-sm btn-secondary" onclick="App.openPackage('${pkg.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="App.deletePackage('${pkg.id}')">Delete</button>
      </div>
    </div>`;
  }

  /* ============================================================
     CAMP PACKETS (branded, printable / downloadable)
     ============================================================ */
  let packetKid = null;
  routes.packets = function () {
    titleEl().textContent = "Camp Packets";
    const campers = D.getState().campers.slice().sort((a, b) => fullName(a).localeCompare(fullName(b)));
    if ((!packetKid || !D.getCamper(packetKid)) && campers.length) packetKid = campers[0].id;
    actionsEl().innerHTML = `
      <button class="btn btn-secondary no-print" onclick="window.print()">🖨️ Print / Save PDF</button>
      <button class="btn btn-accent no-print" onclick="App.downloadPacket()">⬇️ Download to Phone</button>`;
    view().innerHTML = `
      <div class="toolbar no-print">
        <label class="muted">Generate packet for</label>
        <select id="packetKid">${campers.map((c) => `<option value="${c.id}" ${c.id === packetKid ? "selected" : ""}>${esc(fullName(c))}</option>`).join("")}</select>
        <div class="spacer"></div>
        <span class="muted" style="font-size:13px;">Young Guns–branded · schedule, clinicians, gear &amp; more</span>
      </div>
      <div id="packetHost">${campers.length ? packetHTML(packetKid) : `<p class="empty">Register a camper first.</p>`}</div>`;
    const sel = document.getElementById("packetKid");
    if (sel) sel.addEventListener("change", (e) => { packetKid = e.target.value; document.getElementById("packetHost").innerHTML = packetHTML(packetKid); });
  };

  function packetHTML(kidId) {
    const c = D.getCamper(kidId);
    if (!c) return `<p class="empty">No camper selected.</p>`;
    const bunk = D.getBunk(c.bunkId), side = D.getSide(c.sideId);
    const logo = packetLogo();
    const dates = D.sessionDates().filter((ds) => D.isPresentOn(c, ds));
    const clinSet = {};
    dates.forEach((ds) => D.cliniciansOnDate(ds).forEach((cl) => { clinSet[cl.id] = cl; }));
    const clinicians = Object.values(clinSet);
    const gear = c.prepurchases || [];
    const bring = ["Wrestling shoes & headgear", "Athletic clothes for 2 sessions/day", "Water bottle (labeled)", "Toiletries & towel", "Sleeping bag & pillow", "Medications in original packaging", "A great attitude!"];
    return `<div class="packet" id="packetSheet">
      <div class="packet-head">
        ${logo ? `<img src="${logo}" class="packet-logo" alt="">` : ""}
        <div><div class="packet-camp">Young Guns Wrestling Camp</div>
          <div class="packet-sub">Official Camper Packet · Summer 2026</div></div>
      </div>

      <div class="packet-hero">
        <h1>${esc(fullName(c))}</h1>
        ${c.campName ? `<div class="packet-camp-name">${esc(c.campName)}</div>` : ""}
        <div class="packet-meta">
          ${side ? `<span class="badge side-${side.id}">${esc(side.name)}</span>` : ""}
          ${bunk ? `<span class="badge">Bunk ${esc(bunk.name)}${c.bed ? ` · ${esc(c.bed)} bed` : ""}</span>` : ""}
          <span class="badge">${esc(c.startDate)} → ${esc(c.endDate)} · ${D.camperDuration(c)} days</span>
          ${(c.counselor || (bunk && bunk.counselor)) ? `<span class="badge">Counselor: ${esc(c.counselor || bunk.counselor)}</span>` : ""}
        </div>
      </div>

      <div class="packet-cols">
        <div class="packet-section">
          <h2>🩺 Clinicians During Your Stay</h2>
          ${clinicians.length ? clinicians.map((cl) => `
            <div class="packet-clin">
              <strong>${esc(cl.name)}</strong> — <span class="muted">${esc(cl.specialty)}</span>
              ${cl.accolades ? `<div class="packet-acc">🏅 ${esc(cl.accolades)}</div>` : ""}
              <p>${esc(cl.bio)}</p>
            </div>`).join("") : `<p class="muted">Clinician schedule to be announced.</p>`}
        </div>

        <div class="packet-section">
          <h2>📅 Daily Clinician Schedule</h2>
          <table class="packet-table"><tbody>
            ${dates.map((ds) => {
              const list = D.cliniciansOnDate(ds);
              const d = new Date(ds + "T00:00:00");
              return `<tr><td>${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</td>
                <td>${list.length ? list.map((cl) => esc(shortName(cl.name))).join(", ") : "—"}</td></tr>`;
            }).join("")}
          </tbody></table>
        </div>
      </div>

      <div class="packet-cols">
        <div class="packet-section">
          <h2>🎒 Your Gear (waiting on your bunk)</h2>
          ${gear.length ? `<ul class="packet-list">${gear.map((p) => `<li>${p.kind === "package" ? "🎁" : "🎽"} ${esc(p.name)}${p.qty > 1 ? ` ×${p.qty}` : ""}</li>`).join("")}</ul>` : `<p class="muted">No gear pre-purchased — visit the Pro Shop at camp!</p>`}
          <div class="packet-balance">Camp store balance: <strong>${money(c.balance)}</strong></div>
        </div>
        <div class="packet-section">
          <h2>🎽 What to Bring</h2>
          <ul class="packet-list">${bring.map((b) => `<li>☐ ${esc(b)}</li>`).join("")}</ul>
        </div>
      </div>

      ${(c.allergies || c.medications || c.medicalNeeds || c.dietary) ? `<div class="packet-section packet-medical">
        <h2>⚕️ Health Notes (for parents &amp; staff)</h2>
        <ul class="packet-list">
          ${c.allergies ? `<li><strong>Allergies:</strong> ${esc(c.allergies)}</li>` : ""}
          ${c.medications ? `<li><strong>Medications:</strong> ${esc(c.medications)}</li>` : ""}
          ${c.medicalNeeds ? `<li><strong>Medical:</strong> ${esc(c.medicalNeeds)}</li>` : ""}
          ${c.dietary ? `<li><strong>Dietary:</strong> ${esc(c.dietary)}</li>` : ""}
        </ul></div>` : ""}

      <div class="packet-foot">Young Guns Wrestling Camp · Questions? Call the front desk · See you on the mat! 🤼</div>
    </div>`;
  }

  // Compact styles embedded in the downloadable packet so it stands alone.
  const PACKET_DOC_CSS = `
    body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#17191f;margin:0;background:#f1f1ee;padding:20px;}
    .packet{max-width:820px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.12);}
    .packet-head{display:flex;align-items:center;gap:14px;background:#121316;color:#fff;padding:20px 26px;}
    .packet-logo{width:54px;height:54px;border-radius:8px;object-fit:cover;}
    .packet-camp{font-size:20px;font-weight:800;letter-spacing:.5px;}
    .packet-sub{font-size:13px;color:#f4a51b;}
    .packet-hero{padding:22px 26px;border-bottom:1px solid #ececeb;}
    .packet-hero h1{margin:0 0 10px;font-size:26px;}
    .packet-meta{display:flex;gap:8px;flex-wrap:wrap;}
    .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#f1f5f9;color:#334155;}
    .badge.side-west{background:#dbeafe;color:#1d4ed8;}.badge.side-east{background:#dcfce7;color:#15803d;}
    .packet-cols{display:flex;gap:20px;flex-wrap:wrap;padding:0 26px;}
    .packet-section{flex:1;min-width:240px;padding:18px 0;}
    .packet-section h2{font-size:15px;margin:0 0 10px;border-bottom:2px solid #f4a51b;padding-bottom:6px;display:inline-block;}
    .packet-clin{margin-bottom:12px;font-size:13px;}.packet-clin p{margin:4px 0 0;color:#475569;font-size:13px;}
    .packet-acc{font-size:12px;color:#8b8f98;margin-top:2px;}
    .packet-table{width:100%;border-collapse:collapse;font-size:13px;}
    .packet-table td{padding:5px 8px;border-bottom:1px solid #f0f0ef;}.packet-table td:first-child{color:#8b8f98;white-space:nowrap;width:42%;}
    .packet-list{list-style:none;padding:0;margin:0;font-size:13px;line-height:1.9;}
    .packet-balance{margin-top:10px;font-size:14px;}
    .packet-medical{padding:18px 26px;background:#fff7ed;border-top:1px solid #ececeb;}
    .packet-foot{background:#121316;color:#cbd5e1;text-align:center;padding:16px;font-size:13px;margin-top:10px;}
    @media print{body{background:#fff;padding:0;}.packet{box-shadow:none;}}`;

  /* ============================================================
     PARENT-FACING ENROLLMENT (kiosk wizard)
     ============================================================ */
  let enrollDraft = null;
  let enrollStep = 1;
  routes.enroll = function () {
    if (!enrollDraft) enrollDraft = { gearCart: [], deposit: 0 };
    titleEl().textContent = "Enrollment";
    actionsEl().innerHTML = "";
    renderEnroll();
  };

  function enrollShell(inner) {
    const logo = packetLogo();
    const steps = ["Camper Info", "Choose Bunk", "Gear & Wallet", "Review"];
    return `
      <div class="enroll-wrap">
        <div class="enroll-header">
          ${logo ? `<img src="${logo}" class="enroll-logo" alt="">` : ""}
          <div class="enroll-head-text"><div class="enroll-title">Young Guns Wrestling Camp</div>
            <div class="enroll-sub">Camper Registration · Summer 2026</div></div>
          <button class="btn btn-secondary btn-sm enroll-exit" onclick="App.exitEnroll()">Staff View ✕</button>
        </div>
        <div class="enroll-steps">
          ${steps.map((s, i) => `<div class="estep ${i + 1 === enrollStep ? "active" : ""} ${i + 1 < enrollStep ? "done" : ""}"><span class="estep-n">${i + 1 < enrollStep ? "✓" : i + 1}</span>${s}</div>`).join("")}
        </div>
        <div class="enroll-body">${inner}</div>
      </div>`;
  }

  function renderEnroll() {
    App._enrollMode = (enrollStep === 2);
    if (enrollStep === 1) renderEnrollInfo();
    else if (enrollStep === 2) renderEnrollBunk();
    else if (enrollStep === 3) renderEnrollGear();
    else if (enrollStep === 4) renderEnrollReview();
    else renderEnrollDone();
  }

  function renderEnrollInfo() {
    const d = enrollDraft;
    view().innerHTML = enrollShell(`
      <p class="enroll-lead">Welcome! Let's get your wrestler signed up. Fields marked * are required.</p>
      <form id="enrollForm" class="enroll-card">
        ${photoFieldHTML(d.photo)}
        <h4 class="section-title" style="margin-top:8px;">Camper</h4>
        <div class="form-grid">
          <div class="field"><label>First name *</label><input name="firstName" required value="${esc(d.firstName || "")}"></div>
          <div class="field"><label>Last name *</label><input name="lastName" required value="${esc(d.lastName || "")}"></div>
          <div class="field"><label>Age</label><input name="age" type="number" min="3" max="18" value="${esc(d.age || "")}"></div>
          <div class="field"><label>Grade</label><select name="grade">${selOpts([""].concat(D.GRADES), d.grade)}</select></div>
          <div class="field"><label>Gender</label><select name="gender">${selOpts(["", "Female", "Male", "Non-binary", "Prefer not to say"], d.gender)}</select></div>
          <div class="field"><label>T-shirt size</label><select name="shirtSize">${selOpts([""].concat(D.SHIRT_SIZES), d.shirtSize)}</select></div>
          <div class="field full"><label>Home address</label><input name="address" value="${esc(d.address || "")}"></div>
        </div>

        <h4 class="section-title">Dates at Camp *</h4>
        <div class="form-grid">
          <div class="field full"><label>Which 2026 camp are you registering for?</label>
            <select name="campName" required onchange="App.enrollPickCamp(this.value)">
              <option value="">— choose a camp —</option>
              ${D.CAMPS_2026.map((cp) => `<option value="${esc(cp.name)}" ${d.campName === cp.name ? "selected" : ""}>${esc(cp.name)} · ${fmtRange(cp.start, cp.end)} · ${money(cp.fee)}</option>`).join("")}
            </select>
          </div>
          <div class="field full"><div class="muted" id="enrollCampInfo">${d.startDate ? `Dates: <strong>${esc(d.startDate)} → ${esc(d.endDate)}</strong> · Camp fee <strong>${money(d.campFee || 0)}</strong>` : "Camp fee is added to your total at checkout."}</div></div>
        </div>

        <h4 class="section-title">Parent / Guardian</h4>
        <div class="form-grid">
          <div class="field"><label>Guardian name *</label><input name="guardianName" required value="${esc(d.guardianName || "")}"></div>
          <div class="field"><label>Relationship</label><input name="guardianRelationship" placeholder="Mother, Father…" value="${esc(d.guardianRelationship || "")}"></div>
          <div class="field"><label>Phone *</label><input name="guardianPhone" required value="${esc(d.guardianPhone || "")}"></div>
          <div class="field"><label>Email</label><input name="guardianEmail" type="email" value="${esc(d.guardianEmail || "")}"></div>
        </div>

        <h4 class="section-title">Emergency &amp; Pickup</h4>
        <div class="form-grid">
          ${contactFieldsHTML("Emergency contact #1", { name: "emergencyName", rel: "emergencyRel", phone: "emergencyPhone" }, d)}
          ${contactFieldsHTML("Emergency contact #2", { name: "emergency2Name", rel: "emergency2Rel", phone: "emergency2Phone" }, d)}
          ${contactFieldsHTML("Authorized for pickup", { name: "pickupName", rel: "pickupRel", phone: "pickupPhone" }, d)}
        </div>

        <h4 class="section-title">Medical &amp; Health</h4>
        <div class="form-grid">
          <div class="field"><label>Allergies</label><input name="allergies" placeholder="e.g. Peanuts, Dairy" value="${esc(d.allergies || "")}"></div>
          <div class="field"><label>Dietary needs</label><input name="dietary" placeholder="e.g. Vegetarian" value="${esc(d.dietary || "")}"></div>
          <div class="field full"><label>Medical needs / conditions</label><input name="medicalNeeds" placeholder="e.g. Asthma — inhaler" value="${esc(d.medicalNeeds || "")}"></div>
          <div class="field full"><label>Medications (name, dose, schedule)</label><input name="medications" value="${esc(d.medications || "")}"></div>
          <div class="field"><label>Physician (name &amp; phone)</label><input name="physician" value="${esc(d.physician || "")}"></div>
          <div class="field"><label>Insurance (provider &amp; policy #)</label><input name="insurance" value="${esc(d.insurance || "")}"></div>
          <div class="field"><label>Photo/media consent</label><select name="photoConsent">${selOpts(["", "Yes", "No"], d.photoConsent)}</select></div>
          <div class="field full"><label>Anything else we should know?</label><textarea name="notes">${esc(d.notes || "")}</textarea></div>
        </div>

        <div class="form-actions"><button type="submit" class="btn btn-accent btn-lg">Next: Choose a Bunk →</button></div>
      </form>`);
    document.getElementById("enrollForm").addEventListener("submit", (e) => {
      e.preventDefault();
      Object.assign(enrollDraft, Object.fromEntries(new FormData(e.target).entries()));
      // Make sure camp dates/fee are captured even if onchange didn't fire.
      const cp = D.CAMPS_2026.find((x) => x.name === enrollDraft.campName);
      if (cp) { enrollDraft.startDate = cp.start; enrollDraft.endDate = cp.end; enrollDraft.campFee = cp.fee; }
      enrollStep = 2; renderEnroll();
      window.scrollTo(0, 0);
    });
  }

  function renderEnrollBunk() {
    const d = enrollDraft;
    const bunk = d.bunkId ? D.getBunk(d.bunkId) : null;
    view().innerHTML = enrollShell(`
      <p class="enroll-lead">Pick a bunk for <strong>${esc(d.firstName || "your camper")}</strong>, then choose a bed. Girls, West, and East bunkhouses — full bunks show a 🔒.</p>
      <div id="enrollMapHost">${bunkMapHTML({ selectMode: true, selectedBunk: d.bunkId })}</div>
      <div id="enrollBedHost">${bunk ? bedPickerHTML(bunk, d.bed, "App.enrollPickBed") : ""}</div>
      <div class="form-actions" style="justify-content:space-between;">
        <button class="btn btn-secondary" onclick="App.enrollGoto(1)">← Back</button>
        <button class="btn btn-accent btn-lg" id="enrollBunkNext" ${d.bunkId && d.bed ? "" : "disabled"} onclick="App.enrollGoto(3)">Next: Gear &amp; Wallet →</button>
      </div>`);
  }

  function renderEnrollGear() {
    const st = D.getState();
    const cartTotal = enrollDraft.gearCart.reduce((s, g) => s + g.price * g.qty, 0);
    const campFee = Number(enrollDraft.campFee || 0);
    const grand = campFee + cartTotal + Number(enrollDraft.deposit || 0);
    view().innerHTML = enrollShell(`
      <p class="enroll-lead">Gear up before day one — pre-purchased items are <strong>waiting on the bunk</strong> when ${esc(enrollDraft.firstName || "your camper")} arrives. Then load the camp store wallet so there's no scrambling for cash all summer.</p>

      <h4 class="section-title" style="margin-top:6px;">🎁 Gear Packages <span class="muted">— best value</span></h4>
      <div class="pkg-grid">
        ${st.gearPackages.map((pkg) => {
          const inCart = enrollDraft.gearCart.some((g) => g.kind === "package" && g.refId === pkg.id);
          return `<div class="card pkg-card ${pkg.popular ? "popular" : ""} ${inCart ? "selected" : ""}">
            ${pkg.popular ? `<span class="pkg-flag">★ Most Popular</span>` : ""}
            <h3 style="margin-bottom:4px;">${esc(pkg.name)}</h3>
            <div class="pkg-price">${money(pkg.price)}</div>
            <p class="muted" style="font-size:13px;">${esc(pkg.description || "")}</p>
            <ul class="pkg-items">${(pkg.items || []).map((i) => `<li>✓ ${esc(i)}</li>`).join("")}</ul>
            <button class="btn btn-sm ${inCart ? "btn-secondary" : "btn-accent"}" style="width:100%;margin-top:10px;" onclick="App.enrollTogglePackage('${pkg.id}')">${inCart ? "✓ Added — remove" : "Add to order"}</button>
          </div>`;
        }).join("")}
      </div>

      <h4 class="section-title">🎽 Individual Gear</h4>
      <div class="store-grid">
        ${st.store.filter((i) => i.category === "Gear" || i.category === "Apparel").map((i) => {
          const line = enrollDraft.gearCart.find((g) => g.kind === "item" && g.refId === i.id);
          const qty = line ? line.qty : 0;
          return `<div class="store-item">
            <div class="cat">${esc(i.category)}</div>
            <div class="name">${esc(i.name)}</div>
            <div class="price">${money(i.price)}</div>
            <div class="qty" style="justify-content:center;display:flex;align-items:center;gap:8px;margin:8px 0;">
              <button class="qbtn" onclick="App.enrollItemQty('${i.id}',-1)">−</button>
              <strong>${qty}</strong>
              <button class="qbtn" onclick="App.enrollItemQty('${i.id}',1)">+</button>
            </div>
          </div>`;
        }).join("")}
      </div>

      <h4 class="section-title">💳 Load the Camp Store Wallet</h4>
      <div class="card">
        <p class="muted" style="font-size:13px;margin-top:0;">Campers use this balance for snacks, drinks, ice cream and extra gear all summer. Add as much as you'd like — leftover funds are refundable.</p>
        <div class="deposit-row">
          ${[25, 50, 100, 150].map((amt) => `<button class="btn ${Number(enrollDraft.deposit) === amt ? "btn-accent" : "btn-secondary"}" onclick="App.enrollSetDeposit(${amt})">$${amt}</button>`).join("")}
          <div class="field" style="margin:0;">
            <input id="enrollDepositInput" type="number" min="0" step="5" placeholder="Custom $" value="${enrollDraft.deposit || ""}" style="width:120px;" onchange="App.enrollSetDeposit(this.value)">
          </div>
        </div>
      </div>

      <div class="enroll-summary">
        <div>${esc(enrollDraft.campName || "Camp")}: <strong>${money(campFee)}</strong> &nbsp;·&nbsp; Gear: <strong>${money(cartTotal)}</strong> &nbsp;·&nbsp; Wallet: <strong>${money(enrollDraft.deposit || 0)}</strong></div>
        <div class="enroll-grand">Total today: ${money(grand)}</div>
      </div>
      <div class="form-actions" style="justify-content:space-between;">
        <button class="btn btn-secondary" onclick="App.enrollGoto(2)">← Back</button>
        <button class="btn btn-accent btn-lg" onclick="App.enrollGoto(4)">Next: Review →</button>
      </div>`);
    const di = document.getElementById("enrollDepositInput");
    if (di) di.addEventListener("input", (e) => { enrollDraft.deposit = Number(e.target.value) || 0; });
  }

  function renderEnrollReview() {
    const d = enrollDraft;
    const bunk = D.getBunk(d.bunkId);
    const cartTotal = d.gearCart.reduce((s, g) => s + g.price * g.qty, 0);
    const campFee = Number(d.campFee || 0);
    const grand = campFee + cartTotal + Number(d.deposit || 0);
    view().innerHTML = enrollShell(`
      <p class="enroll-lead">Almost done — please review and confirm.</p>
      <div class="enroll-card">
        <h4 class="section-title" style="margin-top:0;">Camper</h4>
        <dl class="kv">
          <dt>Name</dt><dd>${esc(d.firstName || "")} ${esc(d.lastName || "")}</dd>
          <dt>Age / Grade</dt><dd>${esc(d.age || "—")} · ${esc(d.grade || "—")}</dd>
          <dt>Camp</dt><dd>${esc(d.campName || "—")}</dd>
          <dt>Dates</dt><dd>${esc(d.startDate || "—")} → ${esc(d.endDate || "—")}</dd>
          <dt>Bunk / Bed</dt><dd>${bunk ? esc(bunk.name) : "—"}${d.bed ? ` · <strong>${esc(d.bed)}</strong>` : ""} <span class="muted">— where your gear will be waiting</span></dd>
          <dt>Guardian</dt><dd>${esc(d.guardianName || "—")} · ${esc(d.guardianPhone || "")}</dd>
          <dt>Allergies</dt><dd>${esc(d.allergies || "None")}</dd>
          <dt>Medications</dt><dd>${esc(d.medications || "None")}</dd>
        </dl>

        <h4 class="section-title">Gear Order ${bunk ? `(waiting on Bunk ${esc(bunk.name)}${d.bed ? `, ${esc(d.bed)} bed` : ""})` : "(waiting on the bunk)"}</h4>
        ${d.gearCart.length ? `<ul class="packet-list">${d.gearCart.map((g) => `<li>${g.kind === "package" ? "🎁" : "🎽"} ${esc(g.name)}${g.qty > 1 ? ` ×${g.qty}` : ""} — ${money(g.price * g.qty)}</li>`).join("")}</ul>` : `<p class="muted">No gear added.</p>`}

        <div class="enroll-summary" style="margin-top:14px;">
          <div>${esc(d.campName || "Camp")}: <strong>${money(campFee)}</strong> &nbsp;·&nbsp; Gear: <strong>${money(cartTotal)}</strong> &nbsp;·&nbsp; Wallet: <strong>${money(d.deposit || 0)}</strong></div>
          <div class="enroll-grand">Total: ${money(grand)}</div>
        </div>
      </div>
      <div class="form-actions" style="justify-content:space-between;">
        <button class="btn btn-secondary" onclick="App.enrollGoto(3)">← Back</button>
        <button class="btn btn-accent btn-lg" onclick="App.enrollFinish()">✓ Complete Registration</button>
      </div>`);
  }

  function renderEnrollDone() {
    const c = enrollDraft._created;
    view().innerHTML = enrollShell(`
      <div class="enroll-done">
        <div class="enroll-check">🎉</div>
        <h2>You're all set${c ? `, ${esc(c.firstName)}` : ""}!</h2>
        <p class="muted">Registration is complete and the profile is in the system. Gear is queued to be placed on the bunk, and the camp wallet is loaded.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px;">
          ${c ? `<button class="btn btn-accent" onclick="App.exitEnroll();navigate('packets')">📦 View Camp Packet</button>` : ""}
          ${c ? `<button class="btn btn-secondary" onclick="App.exitEnroll();navigate('camper/${c.id}')">Open Profile</button>` : ""}
          <button class="btn btn-secondary" onclick="App.enrollRestart()">Register Another Camper</button>
        </div>
      </div>`);
  }

  /* ============================================================
     MODALS / ACTIONS
     ============================================================ */
  const App = {};

  App.selectBunk = selectBunk;
  App.regBack = function () { renderRegStep1(); };
  App.regPickBed = function (pos) { regDraft.bed = pos; renderRegStep2(); };
  App.sortCampers = function (key) {
    if (camperSort.key === key) camperSort.dir *= -1; else camperSort = { key, dir: 1 };
    render();
  };
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
          <div class="field"><label>Grade</label>
            <select name="grade">${selOpts([""].concat(D.GRADES), c.grade)}</select></div>
          <div class="field"><label>Gender</label>
            <select name="gender">${selOpts(["", "Female", "Male", "Non-binary", "Prefer not to say"], c.gender)}</select></div>
          <div class="field"><label>T-shirt size</label>
            <select name="shirtSize">${selOpts([""].concat(D.SHIRT_SIZES), c.shirtSize)}</select></div>
          <div class="field full"><label>Home address</label><input name="address" value="${esc(c.address)}"></div>
          ${attendanceFieldsHTML(c)}
          <div class="field"><label>Guardian name</label><input name="guardianName" value="${esc(c.guardianName)}"></div>
          <div class="field"><label>Relationship</label><input name="guardianRelationship" value="${esc(c.guardianRelationship)}"></div>
          <div class="field"><label>Guardian phone</label><input name="guardianPhone" value="${esc(c.guardianPhone)}"></div>
          <div class="field"><label>Guardian email</label><input name="guardianEmail" type="email" value="${esc(c.guardianEmail)}"></div>
          ${contactFieldsHTML("Emergency contact #1", { name: "emergencyName", rel: "emergencyRel", phone: "emergencyPhone" }, c)}
          ${contactFieldsHTML("Emergency contact #2", { name: "emergency2Name", rel: "emergency2Rel", phone: "emergency2Phone" }, c)}
          ${contactFieldsHTML("Authorized for pickup", { name: "pickupName", rel: "pickupRel", phone: "pickupPhone" }, c)}
          <div class="field"><label>Allergies</label><input name="allergies" value="${esc(c.allergies)}"></div>
          <div class="field"><label>Dietary</label><input name="dietary" value="${esc(c.dietary)}"></div>
          <div class="field full"><label>Medical needs</label><input name="medicalNeeds" value="${esc(c.medicalNeeds)}"></div>
          <div class="field full"><label>Medications</label><input name="medications" value="${esc(c.medications)}"></div>
          <div class="field"><label>Physician</label><input name="physician" value="${esc(c.physician)}"></div>
          <div class="field"><label>Insurance</label><input name="insurance" value="${esc(c.insurance)}"></div>
          <div class="field"><label>Photo/media consent</label>
            <select name="photoConsent">${selOpts(["", "Yes", "No"], c.photoConsent)}</select></div>
          <div class="field"><label>Counselor (individual)</label>
            <select name="counselor">${selOpts([""].concat(D.getState().counselors.map((x) => x.name)), c.counselor)}</select></div>
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

  /* ---------- Counselor actions ---------- */
  App.toggleBunkSel = function (id) {
    if (bunkSelection[id]) delete bunkSelection[id]; else bunkSelection[id] = true;
    drawCounselors();
  };
  App.selectSideBunks = function (sideId) {
    D.bunksForSide(sideId).forEach((b) => { bunkSelection[b.id] = true; });
    drawCounselors();
  };
  App.selectAllBunks = function () {
    D.getState().bunks.forEach((b) => { bunkSelection[b.id] = true; });
    drawCounselors();
  };
  App.clearBunkSel = function () { bunkSelection = {}; drawCounselors(); };
  App.applyAssign = function () {
    const ids = Object.keys(bunkSelection);
    if (!ids.length || !counselorPick) return;
    const name = counselorPick === "__clear__" ? "" : counselorPick;
    D.assignCounselorToBunks(name, ids);
    bunkSelection = {};
    toast(name ? `Assigned ${name} to ${ids.length} bunk(s)` : `Cleared ${ids.length} bunk(s)`, "success");
    drawCounselors();
  };
  App.openCounselor = function (id) {
    const c = id ? D.getCounselor(id) : null;
    openModal(`
      <h2>${c ? "Edit" : "Add"} Counselor</h2>
      <form id="couForm">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input name="name" required value="${esc(c ? c.name : "")}"></div>
          <div class="field"><label>Role</label><input name="role" placeholder="Counselor" value="${esc(c ? c.role : "Counselor")}"></div>
          <div class="field"><label>Phone</label><input name="phone" value="${esc(c ? c.phone : "")}"></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>`);
    document.getElementById("couForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      if (c) D.updateCounselor(c.id, data); else D.addCounselor(data);
      closeModal(); toast("Counselor saved", "success"); drawCounselors();
    });
  };
  App.deleteCounselor = function (id) {
    const c = D.getCounselor(id);
    openModal(`<h2>Remove ${esc(c.name)}?</h2><p>This unassigns them from any bunks and campers.</p>
      <div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="App.doDeleteCounselor('${id}')">Remove</button></div>`);
  };
  App.doDeleteCounselor = function (id) { D.deleteCounselor(id); closeModal(); toast("Counselor removed"); drawCounselors(); };

  /* ---------- Clinician actions ---------- */
  App.openClinician = function (id) {
    const cl = id ? D.getClinician(id) : null;
    openModal(`
      <h2>${cl ? "Edit" : "Add"} Clinician</h2>
      <form id="clinForm">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input name="name" required value="${esc(cl ? cl.name : "")}"></div>
          <div class="field full"><label>Specialty</label><input name="specialty" placeholder="e.g. Takedowns & Hand Fighting" value="${esc(cl ? cl.specialty : "")}"></div>
          <div class="field full"><label>Accolades</label><input name="accolades" placeholder="e.g. 2× NCAA All-American" value="${esc(cl ? cl.accolades : "")}"></div>
          <div class="field full"><label>Background / Bio</label><textarea name="bio" placeholder="Coaching background, style, what they teach…">${esc(cl ? cl.bio : "")}</textarea></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>`);
    document.getElementById("clinForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      if (cl) D.updateClinician(cl.id, data); else D.addClinician(data);
      closeModal(); toast("Clinician saved", "success"); render();
    });
  };

  function scheduleModalHTML(cl) {
    const dates = D.sessionDates();
    return `<h2>Schedule — ${esc(cl.name)}</h2>
      <p class="muted" style="font-size:13px;">Click the days this clinician is on-site. <strong>${(cl.schedule || []).length}</strong> day(s) selected.</p>
      <div class="sched-grid">
        ${dates.map((ds) => {
          const on = (cl.schedule || []).includes(ds);
          const d = new Date(ds + "T00:00:00");
          return `<button type="button" class="sched-day ${on ? "on" : ""}" onclick="App.toggleClinDay('${cl.id}','${ds}')">${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</button>`;
        }).join("")}
      </div>
      <div class="form-actions"><button class="btn" onclick="closeModal();render();">Done</button></div>`;
  }
  App.openClinicianSchedule = function (id) {
    const cl = D.getClinician(id);
    if (!cl) return;
    openModal(scheduleModalHTML(cl), true);
  };
  App.toggleClinDay = function (id, ds) {
    D.toggleClinicianDay(id, ds);
    document.getElementById("modal").innerHTML = scheduleModalHTML(D.getClinician(id));
  };
  App.deleteClinician = function (id) {
    const cl = D.getClinician(id);
    openModal(`<h2>Remove ${esc(cl.name)}?</h2><p>This removes the clinician and their schedule.</p>
      <div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="App.doDeleteClinician('${id}')">Remove</button></div>`);
  };
  App.doDeleteClinician = function (id) { D.deleteClinician(id); closeModal(); toast("Clinician removed"); render(); };

  /* ---------- Menu actions ---------- */
  App.addDish = function (mealKey) {
    const inp = document.getElementById("add_" + mealKey);
    const name = inp ? inp.value.trim() : "";
    if (!name) { if (inp) inp.focus(); return; }
    openDishModal(mealKey, null, name);
  };
  App.editDish = function (mealKey, idx) { openDishModal(mealKey, idx); };
  App.removeDish = function (mealKey, idx) {
    const dishes = (D.getMenu(menuDate)[mealKey] || []).slice();
    dishes.splice(idx, 1);
    D.setMenu(menuDate, mealKey, dishes);
    drawMenu();
  };

  /* ---------- Gear / pro-shop actions ---------- */
  App.openPackage = function (id) {
    const pkg = id ? D.getGearPackage(id) : null;
    openModal(`
      <h2>${pkg ? "Edit" : "Add"} Gear Package</h2>
      <form id="pkgForm">
        <div class="form-grid">
          <div class="field full"><label>Name *</label><input name="name" required value="${esc(pkg ? pkg.name : "")}"></div>
          <div class="field"><label>Price ($)</label><input name="price" type="number" min="0" step="1" value="${pkg ? pkg.price : ""}"></div>
          <div class="field"><label>Most popular?</label>
            <select name="popular"><option value="">No</option><option value="yes" ${pkg && pkg.popular ? "selected" : ""}>Yes</option></select></div>
          <div class="field full"><label>Description</label><input name="description" value="${esc(pkg ? pkg.description : "")}"></div>
          <div class="field full"><label>Items (comma separated)</label><input name="items" value="${esc(pkg ? (pkg.items || []).join(", ") : "")}"></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>`);
    document.getElementById("pkgForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      data.popular = data.popular === "yes";
      if (pkg) D.updateGearPackage(pkg.id, data); else D.addGearPackage(data);
      closeModal(); toast("Package saved", "success"); routes.gear();
    });
  };
  App.deletePackage = function (id) { D.deleteGearPackage(id); toast("Package deleted"); routes.gear(); };

  App.openPrepurchase = function (kidId) {
    const st = D.getState();
    openModal(`
      <h2>Add Gear</h2>
      <form id="ppForm">
        <div class="field"><label>Gear</label>
          <select id="ppSel" name="sel">
            <optgroup label="Packages">${st.gearPackages.map((p) => `<option value="pkg:${p.id}">${esc(p.name)} — ${money(p.price)}</option>`).join("")}</optgroup>
            <optgroup label="Items">${st.store.map((i) => `<option value="itm:${i.id}">${esc(i.name)} — ${money(i.price)}</option>`).join("")}</optgroup>
          </select></div>
        <div class="field"><label>Quantity</label><input name="qty" type="number" min="1" value="1"></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn">Add</button>
        </div>
      </form>`);
    document.getElementById("ppForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const sel = document.getElementById("ppSel").value;
      const qty = Number(new FormData(e.target).get("qty")) || 1;
      const [k, refId] = sel.split(":");
      let entry;
      if (k === "pkg") { const p = D.getGearPackage(refId); entry = { kind: "package", refId, name: p.name, price: p.price, qty }; }
      else { const i = D.getState().store.find((x) => x.id === refId); entry = { kind: "item", refId, name: i.name, price: i.price, qty }; }
      D.addPrepurchase(kidId, entry);
      closeModal(); toast("Gear added", "success"); render();
    });
  };
  App.toggleGear = function (kidId, ppId) { D.toggleFulfilled(kidId, ppId); render(); };
  App.toggleGearFul = function (kidId, ppId) { D.toggleFulfilled(kidId, ppId); routes.gear(); };

  /* ---------- Packet actions ---------- */
  App.downloadPacket = function () {
    const c = D.getCamper(packetKid);
    if (!c) { toast("Select a camper first", "error"); return; }
    const doc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(fullName(c))} — Young Guns Packet</title><style>${PACKET_DOC_CSS}</style></head><body>${packetHTML(c.id)}</body></html>`;
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `young-guns-packet-${(c.firstName + "-" + c.lastName).toLowerCase().replace(/[^a-z0-9-]/g, "")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Packet downloaded — open it on your phone", "success");
  };

  /* ---------- Enrollment (kiosk) actions ---------- */
  App.exitEnroll = function () { navigate("dashboard"); };
  App.enrollGoto = function (step) { enrollStep = step; renderEnroll(); global.scrollTo(0, 0); };
  App.enrollTogglePackage = function (pkgId) {
    const i = enrollDraft.gearCart.findIndex((g) => g.kind === "package" && g.refId === pkgId);
    if (i >= 0) enrollDraft.gearCart.splice(i, 1);
    else { const p = D.getGearPackage(pkgId); enrollDraft.gearCart.push({ kind: "package", refId: pkgId, name: p.name, price: p.price, qty: 1 }); }
    renderEnrollGear();
  };
  App.enrollItemQty = function (itemId, delta) {
    const cart = enrollDraft.gearCart;
    let line = cart.find((g) => g.kind === "item" && g.refId === itemId);
    if (!line) {
      if (delta < 0) return;
      const i = D.getState().store.find((x) => x.id === itemId);
      line = { kind: "item", refId: itemId, name: i.name, price: i.price, qty: 0 };
      cart.push(line);
    }
    line.qty += delta;
    if (line.qty <= 0) cart.splice(cart.indexOf(line), 1);
    renderEnrollGear();
  };
  App.enrollSetDeposit = function (amt) { enrollDraft.deposit = Number(amt) || 0; renderEnrollGear(); };
  App.enrollPickBed = function (pos) { enrollDraft.bed = pos; renderEnrollBunk(); };
  App.enrollPickCamp = function (name) {
    const cp = D.CAMPS_2026.find((x) => x.name === name);
    if (cp) { enrollDraft.campName = cp.name; enrollDraft.startDate = cp.start; enrollDraft.endDate = cp.end; enrollDraft.campFee = cp.fee; }
    else { enrollDraft.campName = ""; enrollDraft.startDate = ""; enrollDraft.endDate = ""; enrollDraft.campFee = 0; }
    const info = document.getElementById("enrollCampInfo");
    if (info) info.innerHTML = cp ? `Dates: <strong>${cp.start} → ${cp.end}</strong> · Camp fee <strong>${money(cp.fee)}</strong>` : "Camp fee is added to your total at checkout.";
  };
  App.enrollFinish = function () {
    const data = Object.assign({}, enrollDraft, { balance: Number(enrollDraft.deposit) || 0, prepurchases: enrollDraft.gearCart });
    const c = D.addCamper(data);
    enrollDraft = { gearCart: [], deposit: 0, _created: c };
    enrollStep = 5; renderEnroll(); global.scrollTo(0, 0);
    toast(`${fullName(c)} registered!`, "success");
  };
  App.enrollRestart = function () { enrollDraft = { gearCart: [], deposit: 0 }; enrollStep = 1; renderEnroll(); global.scrollTo(0, 0); };

  // Bunk-map selection inside the enrollment wizard.
  const _selBeforeEnroll = App.selectBunk;
  App.selectBunk = function (bunkId) {
    if (App._enrollMode) {
      const b = D.getBunk(bunkId);
      enrollDraft.bunkId = bunkId;
      enrollDraft.sideId = b.sideId;
      enrollDraft.bed = "";
      renderEnrollBunk();
      toast(`Bunk ${b.name} selected — pick a bed`, "success");
      return;
    }
    _selBeforeEnroll(bunkId);
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
