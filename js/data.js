/* ============================================================
   CMP Camp Management — Data Layer
   Persists everything to the browser (localStorage). No server
   required. Provides the data model, seed data, and a small set
   of helper "actions" the UI calls to mutate state safely.
   ============================================================ */
(function (global) {
  "use strict";

  const STORAGE_KEY = "cmp_camp_state_v2";

  /* ---------- Configuration ---------- */
  const CONFIG = {
    campName: "Young Guns Wrestling Camp",
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

  // Coaching staff who run the bunks / mentor campers.
  const COUNSELOR_DEFS = [
    { name: "Coach Reed",   role: "Head Counselor",   phone: "555-0210" },
    { name: "Coach Tomlin", role: "Counselor",        phone: "555-0211" },
    { name: "Coach Vega",   role: "Counselor",        phone: "555-0212" },
    { name: "Coach Ellis",  role: "Counselor",        phone: "555-0213" },
    { name: "Coach Park",   role: "Counselor",        phone: "555-0214" },
    { name: "Coach Boone",  role: "Counselor",        phone: "555-0215" },
    { name: "Coach Hayes",  role: "Counselor",        phone: "555-0216" },
    { name: "Coach Nash",   role: "Counselor",        phone: "555-0217" },
    { name: "Coach Pratt",  role: "Counselor",        phone: "555-0218" },
    { name: "Coach Dunn",   role: "Counselor",        phone: "555-0219" },
  ];

  /* ---------- Meals ---------- */
  const MEALS = [
    { key: "breakfast", label: "Breakfast", icon: "🍳" },
    { key: "lunch",     label: "Lunch",     icon: "🥪" },
    { key: "dinner",    label: "Dinner",    icon: "🍽️" },
  ];

  /* ---------- Allergen detection ----------
     Maps a canonical allergen to words that imply it. Used to cross
     reference camper allergies against the day's menu. */
  const ALLERGEN_MAP = {
    peanut:      ["peanut", "pb&j", "pb ", "goober"],
    "tree nut":  ["tree nut", "almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "pesto"],
    dairy:       ["dairy", "milk", "cheese", "butter", "cream", "yogurt", "parfait", "alfredo", "queso", "mac &"],
    egg:         ["egg", "omelet", "mayo", "mayonnaise", "custard", "french toast"],
    gluten:      ["gluten", "wheat", "bread", "pasta", "spaghetti", "bun", "burger", "tortilla", "pancake", "waffle", "cracker", "cookie", "noodle", "flour", "pretzel", "bagel", "roll", "knot", "wrap", "sandwich", "mac &"],
    soy:         ["soy", "tofu", "edamame", "teriyaki"],
    shellfish:   ["shellfish", "shrimp", "crab", "lobster", "prawn"],
    fish:        ["fish", "salmon", "tuna", "cod", "tilapia"],
    sesame:      ["sesame", "tahini", "hummus"],
  };

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
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const chance = (p) => Math.random() < p;
  const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // All date strings across the camp session, in order.
  function buildSessionDates(cfg) {
    const out = [];
    let d = parseDate(cfg.session.start);
    const end = parseDate(cfg.session.end);
    while (d <= end) { out.push(ymd(d)); d.setDate(d.getDate() + 1); }
    return out;
  }

  /* ---------- Seed: bunks / store / packages ---------- */
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

  function buildStore() {
    return [
      { id: uid("itm"), name: "Camp T-Shirt",      category: "Apparel", price: 18, stock: 120 },
      { id: uid("itm"), name: "Camp Hoodie",       category: "Apparel", price: 35, stock: 80 },
      { id: uid("itm"), name: "Wrestling Singlet",  category: "Gear",    price: 42, stock: 60 },
      { id: uid("itm"), name: "Headgear",           category: "Gear",    price: 30, stock: 50 },
      { id: uid("itm"), name: "Knee Pad",           category: "Gear",    price: 22, stock: 70 },
      { id: uid("itm"), name: "Wrestling Shoes",    category: "Gear",    price: 55, stock: 40 },
      { id: uid("itm"), name: "Water Bottle",       category: "Gear",    price: 12, stock: 150 },
      { id: uid("itm"), name: "Drawstring Bag",     category: "Gear",    price: 10, stock: 100 },
      { id: uid("itm"), name: "Camp Cap",           category: "Apparel", price: 15, stock: 100 },
      { id: uid("itm"), name: "Mat Towel",          category: "Gear",    price: 14, stock: 90 },
      { id: uid("itm"), name: "Trail Mix",          category: "Snacks",  price: 3,  stock: 300 },
      { id: uid("itm"), name: "Protein Bar",        category: "Snacks",  price: 3,  stock: 250 },
      { id: uid("itm"), name: "Gatorade",           category: "Snacks",  price: 3,  stock: 300 },
      { id: uid("itm"), name: "Ice Cream",          category: "Food",    price: 4,  stock: 200 },
      { id: uid("itm"), name: "Hot Dog Combo",      category: "Food",    price: 6,  stock: 200 },
    ];
  }

  // Pre-built gear bundles parents can buy at registration — these land on
  // the camper's bunk waiting for them on arrival.
  function buildGearPackages() {
    return [
      { id: uid("pkg"), name: "Young Guns Starter Pack", price: 45,  popular: false,
        description: "Everything a first-year needs to hit the mat.",
        items: ["Camp T-Shirt", "Water Bottle", "Drawstring Bag", "Mat Towel"] },
      { id: uid("pkg"), name: "Champion Gear Package",   price: 95,  popular: true,
        description: "Our most popular bundle — gear up head to toe.",
        items: ["Camp Hoodie", "Camp T-Shirt", "Camp Cap", "Water Bottle", "Drawstring Bag"] },
      { id: uid("pkg"), name: "Mat Warrior Bundle",      price: 140, popular: false,
        description: "Competition-ready kit for serious wrestlers.",
        items: ["Wrestling Singlet", "Headgear", "Knee Pad", "Camp Hoodie", "Water Bottle"] },
      { id: uid("pkg"), name: "Snack & Hydrate Pack",    price: 30,  popular: false,
        description: "Two weeks of fuel — snacks and drinks waiting on the bunk.",
        items: ["Trail Mix ×7", "Protein Bar ×7", "Gatorade ×7"] },
    ];
  }

  function buildCounselors() {
    return COUNSELOR_DEFS.map((c) => ({ id: uid("cou"), name: c.name, role: c.role, phone: c.phone }));
  }

  /* ---------- Seed: clinicians ---------- */
  function buildClinicians(dates) {
    const defs = [
      { name: "Coach Dan “Tank” Rivera", specialty: "Takedowns & Hand Fighting", accolades: "2× NCAA All-American · 15 yrs coaching",
        bio: "Known for relentless hand-fighting drills, Coach Rivera builds tenacious neutral-position wrestlers. A former Big Ten standout who turns scrappy kids into finishers." },
      { name: "Coach Maria Alvarez", specialty: "Top Control & Riding", accolades: "World Team Trials placer · USAW certified",
        bio: "Maria specializes in mat returns and turning sequences. She coaches with patience and a sharp technical eye, and is a camp favorite for the younger groups." },
      { name: "Coach Jerome Banks", specialty: "Conditioning & Mindset", accolades: "Strength coach 20 yrs · M.S. Sport Psychology",
        bio: "Jerome runs morning conditioning and mental-toughness sessions. Big on goal-setting, recovery, and teaching athletes to compete with composure." },
      { name: "Dr. Lena Park, ATC", specialty: "Injury Prevention & Mobility", accolades: "Certified Athletic Trainer",
        bio: "Lena leads mobility warm-ups and teaches safe technique to keep athletes healthy all week. She also supports the camp nurse on the medical side." },
      { name: "Coach Sam Whitfield", specialty: "Leg Attacks & Scrambles", accolades: "Senior National medalist",
        bio: "Sam's scramble sessions are camp favorites — creative finishes and re-attacks from every angle. High energy, lots of live situations." },
      { name: "Coach Priya Nair", specialty: "Folkstyle Pinning", accolades: "State champion coach · 12 team titles",
        bio: "Priya drills high-percentage pinning combinations and the half-nelson series. Detail-oriented and great at fixing bad habits fast." },
      { name: "Coach “Big Mike” Donovan", specialty: "Heavyweight Technique", accolades: "Olympic Trials qualifier",
        bio: "Mike focuses on technique for the bigger athletes — footwork, ties, and short-offense that travels to any level." },
    ];
    return defs.map((d, i) => {
      const schedule = [];
      const stints = 2;
      for (let s = 0; s < stints; s++) {
        const startIdx = Math.floor(Math.random() * Math.max(1, dates.length - 4));
        const len = 2 + Math.floor(Math.random() * 3); // 2-4 days
        for (let k = 0; k < len && startIdx + k < dates.length; k++) {
          if (!schedule.includes(dates[startIdx + k])) schedule.push(dates[startIdx + k]);
        }
      }
      // Guarantee coverage on the opening days for a lively demo.
      if (i < 3) for (let k = 0; k < 4; k++) if (dates[k] && !schedule.includes(dates[k])) schedule.push(dates[k]);
      schedule.sort();
      return { id: uid("clin"), photo: "", schedule, ...d };
    });
  }

  /* ---------- Seed: menus ---------- */
  function buildMenus(dates) {
    const menus = {};
    const plan = [
      { breakfast: ["Scrambled Eggs", "Pancakes", "Fresh Fruit", "Orange Juice"],
        lunch:     ["Peanut Butter & Jelly", "Grilled Cheese", "Tomato Soup", "Apple Slices"],
        dinner:    ["Spaghetti & Meatballs", "Garlic Bread", "Caesar Salad"] },
      { breakfast: ["Oatmeal", "Yogurt Parfait", "Banana", "Milk"],
        lunch:     ["Turkey Sandwich", "Veggie Wrap", "Trail Mix", "Carrots"],
        dinner:    ["Grilled Chicken", "Rice", "Steamed Broccoli", "Dinner Rolls"] },
      { breakfast: ["French Toast", "Sausage", "Mixed Berries"],
        lunch:     ["Shrimp Stir-Fry", "Fried Rice", "Egg Roll"],
        dinner:    ["Cheeseburgers", "French Fries", "Side Salad"] },
      { breakfast: ["Bagels & Cream Cheese", "Scrambled Eggs", "Melon"],
        lunch:     ["Chicken Caesar Wrap", "Pasta Salad", "Cookies"],
        dinner:    ["Beef Tacos", "Spanish Rice", "Refried Beans"] },
      { breakfast: ["Waffles", "Bacon", "Fruit Smoothies"],
        lunch:     ["Mac & Cheese", "Garden Salad", "Garlic Knots"],
        dinner:    ["Baked Salmon", "Quinoa", "Roasted Vegetables"] },
    ];
    plan.forEach((day, i) => { if (dates[i]) menus[dates[i]] = day; });
    return menus;
  }

  /* ---------- Seed: campers ---------- */
  function generateCampers(bunks, gearPackages, store) {
    const firsts = ["Ava","Liam","Mia","Noah","Sophia","Ethan","Isabella","Mason","Olivia","Lucas","Emma","Jackson","Harper","Aiden","Charlotte","Caleb","Amelia","Logan","Ella","Owen","Layla","Carter","Aria","Wyatt","Scarlett","Hudson","Nora","Levi","Zoe","Gavin","Lily","Brody","Hazel","Cole","Aubrey","Eli","Stella","Maddox","Violet","Tyler","Hannah","Dominic","Paisley","Connor","Savannah","Diego","Ruby","Xavier","Naomi","Tristan"];
    const lasts = ["Mitchell","Foster","Reyes","Nguyen","Carter","Brooks","Patel","Sullivan","Ramirez","Bauer","Kowalski","Okafor","Delgado","Hughes","Romano","Park","Castillo","Schwartz","Abbott","Vance","Henderson","Lozano","Whitaker","Cho","Donovan","Becker","Marsh","Quinn","Ibrahim","Salazar","Tran","Pope","Maddox","Ferguson","Yamamoto","Crawford","Mendez","Stein","Burns","Acosta"];
    const allergiesPool = ["","","","","","Peanuts","Tree nuts","Dairy","Eggs","Gluten","Shellfish","Soy","Sesame","Peanuts, Dairy","Eggs, Gluten","Fish"];
    const dietaryPool = ["","","","","Vegetarian","No pork","Halal","Vegan","Lactose-free","Gluten-free"];
    const medsPool = ["","","","","Albuterol inhaler — as needed (asthma)","EpiPen — emergency use","Adderall 10mg — with breakfast","Insulin — per diabetic care plan","Claritin 10mg — once daily","Ibuprofen — as needed for soreness","Singulair — nightly"];
    const medicalPool = ["","","","","Asthma — carries inhaler","Type 1 diabetes — see care plan","ADHD","Prior concussion (cleared to compete)","ACL recovery — knee brace","Eczema","Seasonal allergies","Lactose intolerant"];
    const swimPool = ["","Non-swimmer","Beginner","Intermediate","Swimmer"];
    const notesPool = ["Loves takedowns.","Returning camper — 3rd year.","Was homesick the first night, settled in fast.","Team captain back home.","Needs encouragement during conditioning.","Strong on top, work on bottom escapes.","Coordinate vegetarian meals with kitchen.","Bunked with older sibling last year.","Very coachable — asks great questions.","Working toward first varsity season."];
    const genders = ["Male","Male","Male","Female","Female","Non-binary"];
    const startWaves = ["2026-06-15","2026-06-15","2026-06-22","2026-06-29","2026-07-06","2026-07-13"];
    const durations = [7,7,7,15,15,20,30,10,14,21];
    const counselors = COUNSELOR_DEFS.map((c) => c.name);
    const guardianFirsts = ["Sarah","Michael","Dana","Robert","Linda","Carlos","Amy","James","Nicole","David","Maria","Kevin","Tasha","Brian"];
    const relationships = ["Mother","Father","Guardian","Grandparent","Stepfather","Stepmother"];
    const session = CONFIG.session;

    // Shuffle bunks; fill to capacity so the map looks realistically partial.
    const shuffled = bunks.slice().sort(() => Math.random() - 0.5);
    let bunkIdx = 0, seatInBunk = 0;
    const usedBunks = new Set();

    const N = 45;
    const campers = [];
    const usedNames = new Set();

    for (let n = 0; n < N; n++) {
      let fn, ln, key, tries = 0;
      do { fn = pick(firsts); ln = pick(lasts); key = fn + ln; tries++; } while (usedNames.has(key) && tries < 25);
      usedNames.add(key);

      let bunk = null;
      if (bunkIdx < shuffled.length) {
        bunk = shuffled[bunkIdx];
        seatInBunk++;
        if (seatInBunk >= CONFIG.bunkCapacity) { bunkIdx++; seatInBunk = 0; }
        usedBunks.add(bunk.id);
      }

      const start = pick(startWaves);
      let dur = pick(durations);
      let end = computeEndDate(start, dur);
      if (end > session.end) { end = session.end; dur = daysBetween(start, end); }

      const allergies = pick(allergiesPool);
      const medications = pick(medsPool);
      const medicalNeeds = pick(medicalPool);
      const dietary = pick(dietaryPool);
      const balance = pick([0, 5, 10, 20, 25, 30, 40, 50, 60, 75, 100, 120]);
      const guardianName = pick(guardianFirsts) + " " + ln;

      // Transactions: opening deposit, sometimes a debit so balances look "used".
      const transactions = [];
      const spent = chance(0.5) ? pick([4, 6, 9, 12, 15, 21]) : 0;
      const opening = balance + spent;
      if (opening > 0) transactions.push({ id: uid("txn"), type: "credit", amount: opening, memo: "Opening deposit (registration)", date: nowISO() });
      if (spent > 0) transactions.push({ id: uid("txn"), type: "debit", amount: spent, memo: pick(["Camp T-Shirt","Ice Cream","Gatorade ×2","Protein Bar","Mat Towel","Camp Cap"]), date: nowISO() });

      // Logs
      const logs = [];
      if (allergies && allergies.trim()) {
        logs.push({ id: uid("log"), type: "allergy", text: "Allergy on file: " + allergies + ". Flagged to kitchen & nurse.", severity: "high", date: nowISO(), resolved: false, author: "Registration" });
      }
      if (chance(0.4)) logs.push({ id: uid("log"),
        type: pick(["injury","medical","incident","note","food","delivery"]),
        text: pick(["Rolled ankle during live wrestling — iced, monitoring.","Headache after practice — rested, fine by dinner.","Mat burn on elbow — cleaned and bandaged.","Great attitude in drills today.","Medication administered at breakfast per plan.","Care package delivered to bunk.","Skipped lunch — checked in, ate a snack later.","Won the bracket in afternoon live!"]),
        severity: chance(0.3) ? "high" : "normal", date: nowISO(), resolved: chance(0.5),
        author: pick(["Coach Reed","Nurse Kim","Coach Vega","Front Desk"]) });

      // Pre-purchased gear waiting on the bunk
      const prepurchases = [];
      if (chance(0.55)) {
        if (chance(0.6)) {
          const pkg = pick(gearPackages);
          prepurchases.push({ id: uid("pp"), kind: "package", refId: pkg.id, name: pkg.name, price: pkg.price, qty: 1, fulfilled: chance(0.5), date: nowISO() });
        } else {
          const it = pick(store);
          prepurchases.push({ id: uid("pp"), kind: "item", refId: it.id, name: it.name, price: it.price, qty: randInt(1, 2), fulfilled: chance(0.5), date: nowISO() });
        }
      }

      campers.push({
        id: uid("kid"), photo: "",
        firstName: fn, lastName: ln,
        age: randInt(8, 17), gender: pick(genders), grade: String(randInt(3, 12)),
        shirtSize: pick(["YS","YM","YL","AS","AM","AL"]),
        address: randInt(100, 999) + " " + pick(["Oak","Maple","Pine","Cedar","Main","Elm","Birch","Lake"]) + " " + pick(["St","Ave","Rd","Ln","Way"]) + ", " + pick(["Springfield","Riverton","Fairview","Lakeside","Clayton","Bedford"]),
        startDate: start, endDate: end,
        sideId: bunk ? bunk.sideId : "", bunkId: bunk ? bunk.id : "",
        guardianName,
        guardianPhone: "555-0" + randInt(100, 999),
        guardianEmail: fn.toLowerCase() + "." + ln.toLowerCase() + "@example.com",
        guardianRelationship: pick(relationships),
        emergencyContact: pick(guardianFirsts) + " " + ln + " — " + pick(relationships) + " — 555-0" + randInt(100, 999),
        emergencyContact2: chance(0.5) ? pick(guardianFirsts) + " " + pick(lasts) + " — " + pick(relationships) + " — 555-0" + randInt(100, 999) : "",
        authorizedPickup: guardianName + (chance(0.4) ? ", " + pick(guardianFirsts) + " " + ln : ""),
        allergies, medicalNeeds, medications, dietary,
        physician: "Dr. " + pick(lasts) + " — 555-0" + randInt(100, 999),
        insurance: pick(["BlueCross #","Aetna #","UnitedHealth #","Cigna #","Kaiser #"]) + randInt(100000, 999999),
        swimLevel: pick(swimPool),
        photoConsent: pick(["Yes","Yes","Yes","No"]),
        notes: chance(0.6) ? pick(notesPool) : "",
        counselor: "",
        balance,
        logs, transactions, prepurchases,
      });
    }

    bunks.forEach((b) => { if (usedBunks.has(b.id)) b.counselor = pick(counselors); });
    return campers;
  }

  function seedState() {
    const bunks = buildBunks();
    const store = buildStore();
    const gearPackages = buildGearPackages();
    const counselors = buildCounselors();
    const dates = buildSessionDates(CONFIG);
    const clinicians = buildClinicians(dates);
    const menus = buildMenus(dates);
    const campers = generateCampers(bunks, gearPackages, store);

    return {
      version: 2,
      config: CONFIG,
      bunks,
      campers,
      store,
      gearPackages,
      counselors,
      clinicians,
      menus,
      activity: [
        { id: uid("act"), text: "Camp database created", date: nowISO() },
      ],
    };
  }

  /* ---------- Persistence ---------- */
  let state = null;

  // Fill in any fields a loaded (or imported) state might be missing so older
  // saves don't crash the newer UI.
  function migrate(s) {
    if (!s.gearPackages) s.gearPackages = buildGearPackages();
    if (!s.counselors) s.counselors = buildCounselors();
    if (!s.clinicians) s.clinicians = buildClinicians(buildSessionDates(s.config || CONFIG));
    if (!s.menus) s.menus = {};
    (s.campers || []).forEach((c) => {
      if (!Array.isArray(c.prepurchases)) c.prepurchases = [];
      if (c.counselor == null) c.counselor = "";
    });
    return s;
  }

  function load() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = migrate(JSON.parse(raw));
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
    return buildSessionDates(state.config);
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
      counselor: data.counselor || "",
      notes: data.notes || "",
      balance: Number(data.balance) || 0,
      logs: [],
      transactions: [],
      prepurchases: [],
    };
    if (camper.balance > 0) {
      camper.transactions.push({
        id: uid("txn"), type: "credit", amount: camper.balance,
        memo: "Opening balance", date: nowISO(),
      });
    }
    // Gear pre-purchased at registration -> waiting on the bunk.
    if (Array.isArray(data.prepurchases)) {
      data.prepurchases.forEach((p) => {
        camper.prepurchases.push({
          id: uid("pp"),
          kind: p.kind || "item",
          refId: p.refId || "",
          name: p.name || "Gear",
          price: Number(p.price) || 0,
          qty: Number(p.qty) || 1,
          fulfilled: false,
          date: nowISO(),
        });
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
    if (camper.prepurchases.length) logActivity(`${camper.firstName} ${camper.lastName} pre-purchased ${camper.prepurchases.length} gear item(s)`);
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

  /* ---------- Actions: gear packages & pre-purchases ---------- */
  function getGearPackage(id) {
    return state.gearPackages.find((p) => p.id === id) || null;
  }
  function addGearPackage(data) {
    const pkg = {
      id: uid("pkg"),
      name: data.name || "New Package",
      price: Number(data.price) || 0,
      description: data.description || "",
      items: Array.isArray(data.items) ? data.items
        : String(data.items || "").split(",").map((s) => s.trim()).filter(Boolean),
      popular: !!data.popular,
    };
    state.gearPackages.push(pkg);
    save();
    return pkg;
  }
  function updateGearPackage(id, data) {
    const pkg = getGearPackage(id);
    if (!pkg) return;
    Object.assign(pkg, {
      name: data.name ?? pkg.name,
      price: data.price != null ? Number(data.price) : pkg.price,
      description: data.description ?? pkg.description,
      items: data.items != null
        ? (Array.isArray(data.items) ? data.items : String(data.items).split(",").map((s) => s.trim()).filter(Boolean))
        : pkg.items,
      popular: data.popular != null ? !!data.popular : pkg.popular,
    });
    save();
  }
  function deleteGearPackage(id) {
    state.gearPackages = state.gearPackages.filter((p) => p.id !== id);
    save();
  }

  function addPrepurchase(kidId, entry) {
    const c = getCamper(kidId);
    if (!c) return false;
    if (!Array.isArray(c.prepurchases)) c.prepurchases = [];
    c.prepurchases.push({
      id: uid("pp"),
      kind: entry.kind || "item",
      refId: entry.refId || "",
      name: entry.name || "Gear",
      price: Number(entry.price) || 0,
      qty: Number(entry.qty) || 1,
      fulfilled: false,
      date: nowISO(),
    });
    logActivity(`Added gear "${entry.name}" for ${c.firstName} ${c.lastName}`);
    save();
    return true;
  }
  function toggleFulfilled(kidId, ppId) {
    const c = getCamper(kidId);
    if (!c) return;
    const pp = (c.prepurchases || []).find((p) => p.id === ppId);
    if (pp) { pp.fulfilled = !pp.fulfilled; save(); }
  }
  function removePrepurchase(kidId, ppId) {
    const c = getCamper(kidId);
    if (!c) return;
    c.prepurchases = (c.prepurchases || []).filter((p) => p.id !== ppId);
    save();
  }
  // Flat list of every pre-purchase with camper + bunk attached.
  function allPrepurchases() {
    const out = [];
    state.campers.forEach((c) => {
      (c.prepurchases || []).forEach((p) =>
        out.push({ ...p, camperId: c.id, camper: `${c.firstName} ${c.lastName}`, bunkId: c.bunkId }));
    });
    return out;
  }

  /* ---------- Actions: clinicians ---------- */
  function getClinician(id) { return state.clinicians.find((c) => c.id === id) || null; }
  function cliniciansOnDate(dateStr) {
    return state.clinicians.filter((cl) => (cl.schedule || []).includes(dateStr));
  }
  function addClinician(data) {
    const cl = {
      id: uid("clin"),
      name: data.name || "New Clinician",
      specialty: data.specialty || "",
      accolades: data.accolades || "",
      bio: data.bio || "",
      photo: data.photo || "",
      schedule: Array.isArray(data.schedule) ? data.schedule : [],
    };
    state.clinicians.push(cl);
    logActivity(`Added clinician ${cl.name}`);
    save();
    return cl;
  }
  function updateClinician(id, data) {
    const cl = getClinician(id);
    if (!cl) return;
    Object.assign(cl, {
      name: data.name ?? cl.name,
      specialty: data.specialty ?? cl.specialty,
      accolades: data.accolades ?? cl.accolades,
      bio: data.bio ?? cl.bio,
      photo: data.photo ?? cl.photo,
    });
    save();
  }
  function deleteClinician(id) {
    state.clinicians = state.clinicians.filter((c) => c.id !== id);
    save();
  }
  function toggleClinicianDay(id, dateStr) {
    const cl = getClinician(id);
    if (!cl) return;
    if (!Array.isArray(cl.schedule)) cl.schedule = [];
    const i = cl.schedule.indexOf(dateStr);
    if (i >= 0) cl.schedule.splice(i, 1); else cl.schedule.push(dateStr);
    cl.schedule.sort();
    save();
  }

  /* ---------- Actions: menu ---------- */
  function getMenu(dateStr) {
    return state.menus[dateStr] || { breakfast: [], lunch: [], dinner: [] };
  }
  function setMenu(dateStr, meal, dishes) {
    if (!state.menus[dateStr]) state.menus[dateStr] = { breakfast: [], lunch: [], dinner: [] };
    state.menus[dateStr][meal] = dishes.filter((d) => d && d.trim());
    save();
  }
  // Canonical allergens implied by a free-text allergy/dietary string.
  function allergensFor(text) {
    const t = (text || "").toLowerCase();
    if (!t.trim()) return [];
    return Object.keys(ALLERGEN_MAP).filter((canon) =>
      [canon].concat(ALLERGEN_MAP[canon]).some((syn) => t.includes(syn.trim())));
  }
  function camperAllergens(c) {
    return allergensFor((c.allergies || "") + " " + (c.dietary || ""));
  }
  function dishAllergens(dish) {
    return allergensFor(dish);
  }
  // For a given date, find every clash between the day's menu and the
  // allergies of campers present that day.
  function menuAllergyAlerts(dateStr) {
    const menu = getMenu(dateStr);
    const present = campersOnDate(dateStr);
    const alerts = [];
    MEALS.forEach((m) => {
      (menu[m.key] || []).forEach((dish) => {
        const da = dishAllergens(dish);
        if (!da.length) return;
        present.forEach((c) => {
          const hits = camperAllergens(c).filter((a) => da.includes(a));
          if (hits.length) {
            alerts.push({
              meal: m.key, mealLabel: m.label, mealIcon: m.icon,
              dish, camperId: c.id, camper: `${c.firstName} ${c.lastName}`,
              bunkId: c.bunkId, allergens: hits,
            });
          }
        });
      });
    });
    return alerts;
  }

  /* ---------- Counselors ---------- */
  function getCounselor(id) { return state.counselors.find((c) => c.id === id) || null; }
  function addCounselor(data) {
    const c = { id: uid("cou"), name: data.name || "New Counselor", role: data.role || "Counselor", phone: data.phone || "" };
    state.counselors.push(c);
    logActivity(`Added counselor ${c.name}`);
    save();
    return c;
  }
  function updateCounselor(id, data) {
    const c = getCounselor(id);
    if (!c) return;
    const oldName = c.name;
    Object.assign(c, { name: data.name ?? c.name, role: data.role ?? c.role, phone: data.phone ?? c.phone });
    // Keep existing bunk/camper assignments in sync if the name changed.
    if (data.name && data.name !== oldName) {
      state.bunks.forEach((b) => { if (b.counselor === oldName) b.counselor = data.name; });
      state.campers.forEach((k) => { if (k.counselor === oldName) k.counselor = data.name; });
    }
    save();
  }
  function deleteCounselor(id) {
    const c = getCounselor(id);
    if (c) {
      state.bunks.forEach((b) => { if (b.counselor === c.name) b.counselor = ""; });
      state.campers.forEach((k) => { if (k.counselor === c.name) k.counselor = ""; });
    }
    state.counselors = state.counselors.filter((x) => x.id !== id);
    save();
  }
  // Assign one counselor to many bunks at once (individual, a group, or a whole side).
  function assignCounselorToBunks(name, bunkIds) {
    bunkIds.forEach((id) => { const b = getBunk(id); if (b) b.counselor = name; });
    logActivity(`Assigned ${name || "—"} to ${bunkIds.length} bunk(s)`);
    save();
  }
  function setCamperCounselor(kidId, name) {
    const c = getCamper(kidId);
    if (!c) return;
    c.counselor = name || "";
    save();
  }
  // How many bunks / campers each counselor currently covers.
  function counselorLoad(name) {
    const bunks = state.bunks.filter((b) => b.counselor === name);
    const bunkCampers = bunks.reduce((s, b) => s + bunkOccupancy(b.id), 0);
    const directCampers = state.campers.filter((c) => c.counselor === name).length;
    return { bunks: bunks.length, bunkCampers, directCampers };
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
    const gearPending = allPrepurchases().filter((p) => !p.fulfilled).length;
    return { totalCampers, totalCapacity, openIncidents, medicalAlerts, storeRevenue, totalBalance, lowBalance, gearPending };
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
    state = migrate(parsed);
    save();
  }

  /* ---------- Public API ---------- */
  global.CampData = {
    LOG_TYPES,
    STORE_CATEGORIES,
    STAY_PRESETS,
    MEALS,
    ALLERGEN_MAP,
    load, save, getState,
    getSide, getBunk, getCamper,
    campersInBunk, bunkOccupancy, bunksForSide,
    getSession, camperDuration, isPresentOn, campersOnDate, dayOfStay,
    attendanceBuckets, sessionDates, daysBetween, computeEndDate, ymd,
    addCamper, updateCamper, deleteCamper, assignBunk,
    addLog, toggleLogResolved, allLogs,
    addFunds, checkout,
    addStoreItem, updateStoreItem, deleteStoreItem,
    getGearPackage, addGearPackage, updateGearPackage, deleteGearPackage,
    addPrepurchase, toggleFulfilled, removePrepurchase, allPrepurchases,
    getClinician, cliniciansOnDate, addClinician, updateClinician, deleteClinician, toggleClinicianDay,
    getMenu, setMenu, menuAllergyAlerts, camperAllergens, dishAllergens,
    getCounselor, addCounselor, updateCounselor, deleteCounselor,
    assignCounselorToBunks, setCamperCounselor, counselorLoad,
    setBunkCounselor,
    stats, logActivity,
    resetAll, exportJSON, importJSON,
    uid,
  };
})(window);
