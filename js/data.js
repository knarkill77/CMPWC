/* ============================================================
   CMP Camp Management — Data Layer
   Persists everything to the browser (localStorage). No server
   required. Provides the data model, seed data, and a small set
   of helper "actions" the UI calls to mutate state safely.
   ============================================================ */
(function (global) {
  "use strict";

  const STORAGE_KEY = "cmp_camp_state_v1";

  /* ---------- Configuration ---------- */
  const CONFIG = {
    campName: "CMP Summer Camp",
    bunkCapacity: 3,        // each bunk sleeps/seats 3 kids
    bunksPerSide: 17,       // 17 bunks x 3 = 51 beds per side (~50 campers)
    sides: [
      { id: "west", name: "West Side", prefix: "W", color: "#2563eb" },
      { id: "east", name: "East Side", prefix: "E", color: "#16a34a" },
    ],
    // The overall camp session — bounds the calendar and attendance timeline.
    session: { start: "2026-06-15", end: "2026-07-31" },
  };

  // Common length-of-stay presets (days).
  const STAY_PRESETS = [7, 15, 20, 30];

  /* ---------- Log / incident categories ---------- */
  const LOG_TYPES = {
    injury:   { label: "Injury",   icon: "🩹", color: "#dc2626" },
    medical:  { label: "Medical",  icon: "🏥", color: "#7c3aed" },
    allergy:  { label: "Allergy",  icon: "🥜", color: "#d97706" },
    food:     { label: "Food",     icon: "🍽️", color: "#0891b2" },
    delivery: { label: "Delivery", icon: "📦", color: "#4f46e5" },
    incident: { label: "Incident", icon: "⚠️", color: "#ea580c" },
    note:     { label: "Note",     icon: "📝", color: "#475569" },
  };

  const STORE_CATEGORIES = ["Food", "Apparel", "Snacks", "Gear", "Other"];

  /* ---------- Utilities ---------- */
  function uid(prefix) {
    return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 9);
  }
  function nowISO() {
    return new Date().toISOString();
  }
  // Local-safe YYYY-MM-DD formatting (avoids UTC off-by-one from toISOString).
  function ymd(d) {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }
  function parseDate(str) { return new Date(str + "T00:00:00"); }
  // Inclusive day count between two YYYY-MM-DD strings.
  function daysBetween(a, b) {
    if (!a || !b) return 0;
    return Math.round((parseDate(b) - parseDate(a)) / 86400000) + 1;
  }
  function computeEndDate(start, days) {
    if (!start || !days) return "";
    const d = parseDate(start);
    d.setDate(d.getDate() + (Number(days) - 1));
    return ymd(d);
  }

  /* ---------- Seed data ---------- */
  function buildBunks() {
    const bunks = [];
    CONFIG.sides.forEach((side) => {
      for (let i = 1; i <= CONFIG.bunksPerSide; i++) {
        bunks.push({
          id: uid("bunk"),
          name: side.prefix + i,
          sideId: side.id,
          capacity: CONFIG.bunkCapacity,
          counselor: "",
          logs: [], // bunk-level incidents/notes that apply to the whole cabin
        });
      }
    });
    return bunks;
  }

  function seedState() {
    const bunks = buildBunks();
    const store = [
      { id: uid("itm"), name: "Camp T-Shirt",     category: "Apparel", price: 18, stock: 120 },
      { id: uid("itm"), name: "Camp Hoodie",      category: "Apparel", price: 35, stock: 80 },
      { id: uid("itm"), name: "Water Bottle",     category: "Gear",    price: 12, stock: 150 },
      { id: uid("itm"), name: "Trail Mix",        category: "Snacks",  price: 3,  stock: 300 },
      { id: uid("itm"), name: "Ice Cream",        category: "Food",    price: 4,  stock: 200 },
      { id: uid("itm"), name: "Hot Dog Combo",    category: "Food",    price: 6,  stock: 200 },
      { id: uid("itm"), name: "Bug Spray",        category: "Gear",    price: 8,  stock: 90 },
      { id: uid("itm"), name: "Camp Cap",         category: "Apparel", price: 15, stock: 100 },
    ];

    // A couple of sample campers so the dashboard isn't empty on first run.
    const westBunk = bunks.find((b) => b.sideId === "west");
    const eastBunk = bunks.find((b) => b.sideId === "east");
    const campers = [
      {
        id: uid("kid"),
        firstName: "Ava", lastName: "Mitchell", age: 10,
        startDate: "2026-06-15", endDate: "2026-07-14", // 30-day camper
        sideId: "west", bunkId: westBunk.id,
        guardianName: "Sarah Mitchell", guardianPhone: "555-0101",
        emergencyContact: "John Mitchell — 555-0102",
        allergies: "Peanuts", medicalNeeds: "Inhaler (asthma)", dietary: "No pork",
        notes: "",
        balance: 40,
        logs: [
          { id: uid("log"), type: "allergy", text: "Severe peanut allergy — EpiPen in nurse office.", severity: "high", date: nowISO(), resolved: false, author: "Intake" },
        ],
        transactions: [
          { id: uid("txn"), type: "credit", amount: 50, memo: "Opening balance", date: nowISO() },
          { id: uid("txn"), type: "debit", amount: 10, memo: "Camp T-Shirt", date: nowISO() },
        ],
      },
      {
        id: uid("kid"),
        firstName: "Liam", lastName: "Foster", age: 11,
        startDate: "2026-06-15", endDate: "2026-06-21", // 7-day camper
        sideId: "east", bunkId: eastBunk.id,
        guardianName: "Dana Foster", guardianPhone: "555-0144",
        emergencyContact: "Mike Foster — 555-0145",
        allergies: "", medicalNeeds: "", dietary: "Vegetarian",
        notes: "Loves archery.",
        balance: 25,
        logs: [],
        transactions: [
          { id: uid("txn"), type: "credit", amount: 25, memo: "Opening balance", date: nowISO() },
        ],
      },
    ];

    return {
      version: 1,
      config: CONFIG,
      bunks,
      campers,
      store,
      activity: [
        { id: uid("act"), text: "Camp database created", date: nowISO() },
      ],
    };
  }

  /* ---------- Persistence ---------- */
  let state = null;

  function load() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = JSON.parse(raw);
      } else {
        state = seedState();
        save();
      }
    } catch (e) {
      console.error("Failed to load state, reseeding.", e);
      state = seedState();
      save();
    }
    return state;
  }

  function save() {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state", e);
    }
  }

  function getState() {
    if (!state) load();
    return state;
  }

  function logActivity(text) {
    state.activity.unshift({ id: uid("act"), text, date: nowISO() });
    state.activity = state.activity.slice(0, 100);
  }

  /* ---------- Lookups ---------- */
  function getSide(sideId) {
    return state.config.sides.find((s) => s.id === sideId);
  }
  function getBunk(bunkId) {
    return state.bunks.find((b) => b.id === bunkId) || null;
  }
  function getCamper(kidId) {
    return state.campers.find((c) => c.id === kidId) || null;
  }
  function campersInBunk(bunkId) {
    return state.campers.filter((c) => c.bunkId === bunkId);
  }
  function bunkOccupancy(bunkId) {
    return campersInBunk(bunkId).length;
  }
  function bunksForSide(sideId) {
    return state.bunks.filter((b) => b.sideId === sideId);
  }

  /* ---------- Attendance ---------- */
  function getSession() { return state.config.session; }
  function camperDuration(c) { return daysBetween(c.startDate, c.endDate); }
  function isPresentOn(c, dateStr) {
    return c.startDate && c.endDate && c.startDate <= dateStr && dateStr <= c.endDate;
  }
  function campersOnDate(dateStr) {
    return state.campers.filter((c) => isPresentOn(c, dateStr));
  }
  // Which day of a camper's stay a given date is (1-based), or 0 if not present.
  function dayOfStay(c, dateStr) {
    if (!isPresentOn(c, dateStr)) return 0;
    return daysBetween(c.startDate, dateStr);
  }
  // Group campers by stay length: exact preset buckets + "other".
  function attendanceBuckets() {
    const buckets = {};
    STAY_PRESETS.forEach((p) => (buckets[p] = []));
    buckets.other = [];
    state.campers.forEach((c) => {
      const dur = camperDuration(c);
      if (STAY_PRESETS.includes(dur)) buckets[dur].push(c);
      else buckets.other.push(c);
    });
    return buckets;
  }
  // Every date string in the camp session, in order.
  function sessionDates() {
    const s = getSession();
    const out = [];
    let d = parseDate(s.start);
    const end = parseDate(s.end);
    while (d <= end) { out.push(ymd(d)); d.setDate(d.getDate() + 1); }
    return out;
  }

  /* ---------- Actions: campers ---------- */
  function addCamper(data) {
    const camper = {
      id: uid("kid"),
      photo: data.photo || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      age: data.age || "",
      gender: data.gender || "",
      grade: data.grade || "",
      shirtSize: data.shirtSize || "",
      address: data.address || "",
      // Attendance window
      startDate: data.startDate || "",
      endDate: data.endDate || (data.startDate && data.days ? computeEndDate(data.startDate, data.days) : ""),
      sideId: data.sideId || "",
      bunkId: data.bunkId || "",
      // Guardian
      guardianName: data.guardianName || "",
      guardianPhone: data.guardianPhone || "",
      guardianEmail: data.guardianEmail || "",
      guardianRelationship: data.guardianRelationship || "",
      // Emergency contacts
      emergencyContact: data.emergencyContact || "",
      emergencyContact2: data.emergencyContact2 || "",
      authorizedPickup: data.authorizedPickup || "",
      // Medical
      allergies: data.allergies || "",
      medicalNeeds: data.medicalNeeds || "",
      medications: data.medications || "",
      dietary: data.dietary || "",
      physician: data.physician || "",
      insurance: data.insurance || "",
      swimLevel: data.swimLevel || "",
      photoConsent: data.photoConsent || "",
      notes: data.notes || "",
      balance: Number(data.balance) || 0,
      logs: [],
      transactions: [],
    };
    if (camper.balance > 0) {
      camper.transactions.push({
        id: uid("txn"), type: "credit", amount: camper.balance,
        memo: "Opening balance", date: nowISO(),
      });
    }
    if (camper.allergies && camper.allergies.trim()) {
      camper.logs.push({
        id: uid("log"), type: "allergy",
        text: "Allergy on file: " + camper.allergies, severity: "high",
        date: nowISO(), resolved: false, author: "Registration",
      });
    }
    state.campers.push(camper);
    const bunk = getBunk(camper.bunkId);
    logActivity(`Registered ${camper.firstName} ${camper.lastName}` + (bunk ? ` to bunk ${bunk.name}` : ""));
    save();
    return camper;
  }

  function updateCamper(kidId, data) {
    const c = getCamper(kidId);
    if (!c) return null;
    Object.assign(c, data);
    save();
    return c;
  }

  function deleteCamper(kidId) {
    const c = getCamper(kidId);
    state.campers = state.campers.filter((x) => x.id !== kidId);
    if (c) logActivity(`Removed camper ${c.firstName} ${c.lastName}`);
    save();
  }

  function assignBunk(kidId, bunkId) {
    const c = getCamper(kidId);
    const bunk = getBunk(bunkId);
    if (!c || !bunk) return false;
    if (bunkOccupancy(bunkId) >= bunk.capacity && c.bunkId !== bunkId) return false;
    c.bunkId = bunkId;
    c.sideId = bunk.sideId;
    logActivity(`Assigned ${c.firstName} ${c.lastName} to bunk ${bunk.name}`);
    save();
    return true;
  }

  /* ---------- Actions: logs ---------- */
  function addLog(target, id, entry) {
    const log = {
      id: uid("log"),
      type: entry.type || "note",
      text: entry.text || "",
      severity: entry.severity || "normal",
      date: nowISO(),
      resolved: false,
      author: entry.author || "Staff",
    };
    if (target === "camper") {
      const c = getCamper(id);
      if (!c) return null;
      c.logs.unshift(log);
      logActivity(`${LOG_TYPES[log.type].label} logged for ${c.firstName} ${c.lastName}`);
    } else {
      const b = getBunk(id);
      if (!b) return null;
      b.logs.unshift(log);
      logActivity(`${LOG_TYPES[log.type].label} logged for bunk ${b.name}`);
    }
    save();
    return log;
  }

  function toggleLogResolved(target, ownerId, logId) {
    const owner = target === "camper" ? getCamper(ownerId) : getBunk(ownerId);
    if (!owner) return;
    const log = owner.logs.find((l) => l.id === logId);
    if (log) log.resolved = !log.resolved;
    save();
  }

  // All logs across the camp, newest first, with owner info attached.
  function allLogs() {
    const out = [];
    state.campers.forEach((c) => {
      c.logs.forEach((l) =>
        out.push({ ...l, owner: `${c.firstName} ${c.lastName}`, ownerType: "camper", ownerId: c.id })
      );
    });
    state.bunks.forEach((b) => {
      b.logs.forEach((l) =>
        out.push({ ...l, owner: `Bunk ${b.name}`, ownerType: "bunk", ownerId: b.id })
      );
    });
    return out.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /* ---------- Actions: banking ---------- */
  function addFunds(kidId, amount, memo) {
    const c = getCamper(kidId);
    if (!c) return false;
    amount = Number(amount);
    if (!amount) return false;
    c.balance += amount;
    c.transactions.unshift({
      id: uid("txn"),
      type: amount >= 0 ? "credit" : "debit",
      amount: Math.abs(amount),
      memo: memo || (amount >= 0 ? "Added funds" : "Adjustment"),
      date: nowISO(),
    });
    logActivity(`${amount >= 0 ? "Added" : "Removed"} $${Math.abs(amount)} ${amount >= 0 ? "to" : "from"} ${c.firstName} ${c.lastName}`);
    save();
    return true;
  }

  /* ---------- Actions: store / purchases ---------- */
  function checkout(kidId, cart) {
    // cart: [{ itemId, qty }]
    const c = getCamper(kidId);
    if (!c) return { ok: false, error: "No camper selected." };
    let total = 0;
    const lines = [];
    for (const line of cart) {
      const item = state.store.find((i) => i.id === line.itemId);
      if (!item) continue;
      const qty = Number(line.qty) || 0;
      if (qty <= 0) continue;
      total += item.price * qty;
      lines.push({ item, qty });
    }
    if (lines.length === 0) return { ok: false, error: "Cart is empty." };
    if (total > c.balance) {
      return { ok: false, error: `Insufficient funds. Balance $${c.balance.toFixed(2)}, total $${total.toFixed(2)}.` };
    }
    // Apply
    lines.forEach(({ item, qty }) => {
      item.stock = Math.max(0, (item.stock || 0) - qty);
      c.balance -= item.price * qty;
      c.transactions.unshift({
        id: uid("txn"), type: "debit", amount: item.price * qty,
        memo: `${item.name} ×${qty}`, date: nowISO(),
      });
    });
    logActivity(`${c.firstName} ${c.lastName} spent $${total.toFixed(2)} in the store`);
    save();
    return { ok: true, total };
  }

  function addStoreItem(data) {
    const item = {
      id: uid("itm"),
      name: data.name || "New Item",
      category: data.category || "Other",
      price: Number(data.price) || 0,
      stock: Number(data.stock) || 0,
    };
    state.store.push(item);
    save();
    return item;
  }
  function updateStoreItem(itemId, data) {
    const item = state.store.find((i) => i.id === itemId);
    if (!item) return;
    Object.assign(item, {
      name: data.name ?? item.name,
      category: data.category ?? item.category,
      price: data.price != null ? Number(data.price) : item.price,
      stock: data.stock != null ? Number(data.stock) : item.stock,
    });
    save();
  }
  function deleteStoreItem(itemId) {
    state.store = state.store.filter((i) => i.id !== itemId);
    save();
  }

  /* ---------- Bunk counselor ---------- */
  function setBunkCounselor(bunkId, name) {
    const b = getBunk(bunkId);
    if (b) { b.counselor = name; save(); }
  }

  /* ---------- Stats ---------- */
  function stats() {
    const totalCampers = state.campers.length;
    const totalCapacity = state.bunks.reduce((s, b) => s + b.capacity, 0);
    const openIncidents = allLogs().filter(
      (l) => !l.resolved && (l.type === "incident" || l.type === "injury")
    ).length;
    const medicalAlerts = state.campers.filter(
      (c) => (c.medicalNeeds && c.medicalNeeds.trim()) || (c.allergies && c.allergies.trim())
    ).length;
    const storeRevenue = state.campers.reduce(
      (s, c) => s + c.transactions.filter((t) => t.type === "debit").reduce((x, t) => x + t.amount, 0),
      0
    );
    const totalBalance = state.campers.reduce((s, c) => s + c.balance, 0);
    const lowBalance = state.campers.filter((c) => c.balance < 5).length;
    return { totalCampers, totalCapacity, openIncidents, medicalAlerts, storeRevenue, totalBalance, lowBalance };
  }

  /* ---------- Data management ---------- */
  function resetAll() {
    state = seedState();
    save();
  }
  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }
  function importJSON(json) {
    const parsed = JSON.parse(json);
    if (!parsed.bunks || !parsed.campers) throw new Error("Invalid camp file.");
    state = parsed;
    save();
  }

  /* ---------- Public API ---------- */
  global.CampData = {
    LOG_TYPES,
    STORE_CATEGORIES,
    STAY_PRESETS,
    load, save, getState,
    getSide, getBunk, getCamper,
    campersInBunk, bunkOccupancy, bunksForSide,
    getSession, camperDuration, isPresentOn, campersOnDate, dayOfStay,
    attendanceBuckets, sessionDates, daysBetween, computeEndDate, ymd,
    addCamper, updateCamper, deleteCamper, assignBunk,
    addLog, toggleLogResolved, allLogs,
    addFunds, checkout,
    addStoreItem, updateStoreItem, deleteStoreItem,
    setBunkCounselor,
    stats, logActivity,
    resetAll, exportJSON, importJSON,
    uid,
  };
})(window);
