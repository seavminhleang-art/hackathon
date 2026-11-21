# CityVoice — Feature Specification

_Working name: CityVoice (សំឡេងក្រុង). Target: Phnom Penh. Khmer-first, mobile web._

This document describes each feature in depth: who uses it, the screens, the rules,
the data it touches, and what is in or out of the hackathon demo. Types live in
`src/types/index.ts`; mock data in `src/lib/mock/data.ts`; mock API in
`src/lib/api/mock-api.ts`.

Priority legend: **P0** = must work in the demo, **P1** = build if time allows, **P2** = roadmap / pitch only.

---

## 0. Accounts & Registration (P0)

### Roles
| Role | How they get it | Can do |
|---|---|---|
| Guest | Not logged in | View public map, Lost & Found list, emergency numbers, announcements |
| CITIZEN | Self-registration | Everything a guest can + submit reports, upvote, post lost/found items, claim items, get notifications |
| OFFICER | Created by admin (seeded in mock) | See work queue, change status of reports, add notes |
| ADMIN | Seeded | Everything an officer can + assign reports to officers, see all khans, review pending claims |

Self-registration always creates a CITIZEN. Officers and admins are never created from the public form.

### Register form
Fields:
- **Full name** (required, min 2 chars). Khmer or Latin script.
- **Phone** (required). Accepts `012345678`, `012 345 678`, `+85512345678`. Stored as local `0XXXXXXXX(X)`. Unique: used as the login ID because most Cambodians use phone, not email.
- **Password** (required, min 6 chars).
- **Khan** (required, dropdown of 14 Phnom Penh khans). Used to default the map view and filter announcements.
- **Sangkat** (optional, free text for now).
- **Email** (optional).
- **Language** (default Khmer).

Validation errors come back as `ApiError { code: "VALIDATION" | "CONFLICT", field }` so the form can show the message under the correct field.

After success: user is logged in immediately and redirected to the home/map.

### Login
Phone + password. Wrong credentials give one generic message ("Wrong phone or password"); never say which one is wrong.

### Demo accounts (mock only)
| Role | Phone | Password |
|---|---|---|
| Citizen | 012000001 | demo1234 |
| Officer | 012000002 | demo1234 |
| Admin | 012000003 | demo1234 |

### Real backend notes
- Hash passwords with BCrypt. Return JWT; frontend stores it and sends `Authorization: Bearer`.
- P2: phone OTP verification via SMS or Telegram.

---

## 1. Report & Track — includes Emergency (P0, the core loop)

Features 2 (Emergency) and 3 (Government reporting) are one flow with an urgency level.

### 1.1 Categories
| Category | Default urgency | Emergency screen first? | Handled by |
|---|---|---|---|
| Blocked drain | MEDIUM | No | Public Works |
| Flooding | HIGH | No | Public Works |
| Overflowing rubbish / no bins | MEDIUM | No | Khan admin / waste collector |
| Illegal dumping | LOW | No | Khan admin |
| Pothole / damaged road | LOW | No | Public Works |
| Broken streetlight | LOW | No | City Hall |
| Traffic jam | LOW | No | Traffic police |
| Road crash | HIGH | **Yes** | Traffic police / ambulance |
| Need police | HIGH | **Yes** | Police post |
| Other | LOW | No | Sangkat office |

Source: `CATEGORIES` in mock data.

### 1.2 Submit a report (citizen)
Steps on one mobile screen (or a short 3-step wizard):
1. **Pick category**: big icon grid.
   - If category is `emergency: true`, show the **Emergency screen first** (see 1.3). The user can still continue to file a report after calling.
2. **Photo**: `<input type="file" accept="image/*" capture="environment">`. Compress on the client to ~1 MB. Optional for traffic jam / police, recommended for others.
3. **Location**: auto-fill from browser GPS; show a Leaflet map with a draggable pin; fallback = tap on map. Auto-detect khan from nearest khan center (mock) or reverse geocode (real).
4. **Details**: short title (required), description (optional), address hint (optional, e.g. "St. 289 near market").
5. **Urgency**: pre-filled from category default; user can change LOW / MEDIUM / HIGH.
6. **Submit** → confirmation screen with report ID and "Track this report" button.

Rules:
- Must be logged in to submit (guests are prompted to register).
- Status starts as `REPORTED`; first history entry written automatically.

### 1.3 Emergency screen
Shown for Road crash, Need police, and from a permanent red "SOS" button in the header.
- Three big tap-to-call buttons: **117 Police**, **118 Fire**, **119 Ambulance** (`tel:` links).
- Message: "This app does not replace calling. Call first, then report."
- Button: "Also report this location" → continues into the report form with urgency HIGH.

### 1.4 Public map (everyone)
- Leaflet + OpenStreetMap, centered on the user's khan (or Phnom Penh center for guests).
- Marker colour by status: red = REPORTED, orange = ASSIGNED / IN_PROGRESS, green = FIXED, grey = REJECTED.
- Marker icon by category.
- Filters: category, status, khan. "Last 7 days" default.
- Tap a marker → bottom sheet: photo, title, category, status timeline, upvote button ("Me too", +1).
- **Privacy:** public view never shows reporter name or phone. `PublicReport` type removes `reporterId`, `assignedTo`, and `changedBy`.

### 1.5 Status lifecycle
```
REPORTED ──► ASSIGNED ──► IN_PROGRESS ──► FIXED
    │            │              │
    └────────────┴──────────────┴──► REJECTED (with reason)
```
- Every change writes a `StatusChange { from, to, changedBy, note, at }`.
- Every change sends the reporter a notification (Khmer + English text).
- REJECTED must have a note (e.g. "Private land: owner notified").

### 1.6 My reports (citizen)
- List of own reports, newest first, with status chip.
- Detail page: vertical timeline of history with notes and times.

### 1.7 Officer / Admin dashboard
- **Queue**: table/cards sorted HIGH urgency first, then oldest first. Filters: status, khan.
- **Actions per report**: Assign (admin picks officer), Start (IN_PROGRESS), Mark fixed (optional "after" photo — P1), Reject (note required).
- Officers see reports in their khan by default; admins see all.
- Counters at top: open, HIGH open, fixed today.

### 1.8 Notifications
- Demo: in-app bell with unread badge, polling every 15 s.
- P1: Web push. P2: Telegram bot (very popular in Cambodia, strong pitch point).

---

## 2. Lost & Found Community (P0 — core feature 1)

National (all 25 provinces). Full spec: **[docs/features/lost-and-found.md](features/lost-and-found.md)**.

Summary: finder posts with a secret detail → owner claims → finder approves →
pickup → finder marks Returned. Comments and sightings help find items but never
decide ownership. Safety: 3 wrong claims max, auto-hide after 3 reports, private
details hidden until approval, posts expire after 60 days.

---

## 3. Community & Services (P1)

### 3.1 Announcements
- City-wide or per khan. Levels: INFO (blue), WARNING (amber), ALERT (red banner on home).
- Example: rainy-season heavy rain alert → "Avoid low roads, report blocked drains".
- Created by admin (P1: simple form; demo: seeded).

### 3.2 Service directory
- Waste pickup schedule per khan (time window + "put bags out before 18:00").
- Hospitals, police posts, sangkat offices with phone, hours, map pin.
- Filter by user's khan.

### 3.3 Community (P2)
- Upvote ("me too") on reports already exists (P0) — this is the main community signal.
- P2: neighbourhood clean-up events, volunteer sign-up, comments on reports.

---

## 4. Public Dashboard (P1)
- Total reports, by status, by category, by khan.
- **Average hours from REPORTED to FIXED** (computed from status history).
- Top hotspots: khans with most open reports.
- Source: `statsSummary()` in mock API.

## 5. Roadmap only (P2, pitch slides)
- Crash hotspot map (from ROAD_CRASH reports + open data).
- AI photo classification to suggest category.
- Flood-risk alerts tied to weather API.
- Telegram bot for reporting and notifications.
- Integration with real ministry / City Hall ticket systems.

---

## Screen list (for the frontend team)
| Route | Who | Priority |
|---|---|---|
| `/` home: alert banner, SOS button, "Report a problem", mini map | all | P0 |
| `/register`, `/login` | guest | P0 |
| `/map` public reports map | all | P0 |
| `/report/new` report wizard | citizen | P0 |
| `/reports/[id]` report detail + timeline | all (PII hidden) | P0 |
| `/me/reports` my reports | citizen | P0 |
| `/notifications` | logged in | P0 |
| `/emergency` | all | P0 |
| `/admin` queue + actions | officer/admin | P0 |
| `/lost-found`, `/lost-found/new`, `/lost-found/[id]/claim` | all / citizen | P1 |
| `/services`, `/stats` | all | P1 |

## Demo script (2 minutes)
1. Register as a new citizen (show phone validation, Khmer UI).
2. Submit "Blocked drain" with photo + GPS pin. It appears on the public map as red.
3. Log in as officer (012000002) → queue shows it → Assign → In progress → Fixed with a note.
4. Back as the citizen → bell shows "Your report is fixed ✅" → timeline shows each step.
5. Quick tour: SOS screen, Lost & Found claim with privacy, dashboard numbers.
