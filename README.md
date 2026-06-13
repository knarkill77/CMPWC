# CMP — Camp Management Dashboard

A complete, zero-install dashboard for running a summer camp: camper & bunk
profiles, a visual bunk map for registration, health/safety logging, a camp
store, and per-camper banking. Everything is tied together — a log or a
purchase on a camper shows up on their profile *and* rolls up to their bunk.

## Run it

No build step, no server, no accounts. Just open the app:

```bash
# from the repo folder
open index.html          # macOS
# or double-click index.html in your file browser
# or serve it:  python3 -m http.server 8000  ->  http://localhost:8000
```

Data is saved in your browser (localStorage). Use **Export** in the sidebar to
download a JSON backup, and **Import** to restore or move it to another machine.

## What's inside

| Area | What it does |
|------|--------------|
| **Dashboard** | Live stats — campers vs. beds, open incidents, medical/allergy flags, store revenue, funds on account, low balances — plus occupancy bars per side and a recent-activity feed. |
| **Bunk Map** | The camp laid out visually: **West Side** and **East Side** flanking the **Gym** in the middle. Each bunk shows 3 beds, occupancy, and a red `!` if a camper or the cabin has an open alert. Click a bunk to open it. |
| **Register Camper** | A 2-step flow: fill the camper's profile (**photo**, guardian, two emergency contacts, authorized pickup, allergies, medical, medications, physician, insurance, swim level, photo consent, dietary, shirt size, **attendance dates**, opening balance), then **pick an open bunk on the map**. Allergies automatically create a high-severity flag. |
| **Campers** | Searchable, filterable roster (by side, by medical/allergy flag, by low balance), with photo thumbnails. Click through to a full profile. |
| **Camper Profile** | Everything in one place: photo, full contact & care info, attendance window, camp-bank balance + transactions, and a full **log** (injuries, medical, incidents, deliveries, food, notes). Edit, change bunk, add funds, or remove the camper. |
| **Bunk Detail** | The 3 campers in the cabin, an assignable counselor, an aggregated **Care Flags** panel (every camper's allergy/medical/dietary need), and a cabin-wide **Bunk Log**. |
| **Calendar** | The whole camp session laid out month by month. Each day shows a live head-count of campers present; click any day for that day's roster. |
| **Daily Roster** | Every camper at camp on a chosen date — side, bunk, which day of their stay it is, who departs that day, and care flags. Step day-to-day and **print** the list. |
| **Attendance** | Length-of-stay tracking: summary cards for 30 / 20 / 15 / 7-day campers (click to filter), a **Gantt timeline** of every stay across the session, and a table sortable by longest stay, start date, or name. |
| **Health & Safety** | Every log across the whole camp in one feed, filterable by type and open/resolved status. Resolve or reopen any item. |
| **Store** | Catalog by category (Food, Apparel, Snacks, Gear, Other). Build a cart, charge it to a camper, and it deducts from their balance with stock tracking. Add/edit/delete items. |
| **Camp Bank** | All balances at a glance, average balance, low-balance count, and quick "+ Funds". Deposits and store charges form each camper's transaction history. |

## How things tie together (your requirement)

- A **camper profile** is linked to a **bunk** and a **side**.
- Adding an injury / medical / allergy / food / delivery / incident on a camper
  appears on their profile, in the camp-wide **Health & Safety** feed, and (via
  Care Flags / the alert dot) on their **bunk**.
- Store purchases and bank deposits both write to the camper's **transactions**
  and update their **balance**, which is enforced at checkout (no overspending).

## Configuration

Defaults live at the top of `js/data.js`:

```js
bunkCapacity: 3,     // beds per bunk
bunksPerSide: 17,    // 17 × 3 = 51 beds per side (~50 campers/side, 100 total)
sides: [ West Side (blue), East Side (green) ]
session: { start: "2026-06-15", end: "2026-07-31" },  // bounds calendar + timeline
```

Change these and **Reset** (sidebar) to regenerate the camp.

## Project layout

```
index.html      app shell + sidebar nav
css/styles.css  all styling
js/data.js      data model, persistence, business logic
js/app.js       hash-router, views, modals
young-guns-logo.jpeg   Young Guns Wrestling Camp logo
```
