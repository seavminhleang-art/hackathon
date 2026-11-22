# Prompt: Home page wireframe (for Claude Design)

Copy everything below the line into Claude Design.

---

## Role
You are a senior product designer with experience in government and civic-tech
products for Southeast Asian, mobile-first audiences. Design a **mid-fidelity
wireframe of the Home page** for the app described below. Think like a design
lead: decide the information hierarchy, show it in layout, and explain why.

## Product context
**CityVoice (សំឡេងក្រុង)** is a citizen services platform for Cambodia, starting in
Phnom Penh and covering all 25 provinces. It's one place where residents
connect with local authorities and each other. It's a hackathon project
(theme "Smart City & Urban Services"), so the home page must make the whole
product understandable in about 10 seconds during a pitch demo.

Four main features. The home page is the hub to all of them:

1. **Lost & Found**: post or search for lost/found items (National ID, keys, phones…). Ownership is proven with a secret detail. Items are listed by "near you".
2. **Emergency (SOS)**: SOS button, incident reports with location, nearby hospitals and police, report tracking. **Calling 117 (police), 118 (fire) or 119 (ambulance) always comes first.**
3. **Government reporting**: report civic problems (roads, waste, drainage, lighting, water, public infrastructure). Track status: Submitted → Under review → Assigned → In progress → Resolved → Closed. Citizens can "support" existing reports.
4. **Community & Services**: official announcements and alerts, a civic service directory (sangkat offices, utilities, waste pickup times), government paperwork guides, community events, polls and groups.

## Users
| User | Situation | What they need from Home |
|---|---|---|
| Resident (primary) | Android phone, often outdoors in bright sun, on a motorbike stop or market, sometimes slow mobile data. Reads Khmer first. Mixed digital literacy, from students to older parents | Report something fast, see what's happening in their area, check their reports, find a service |
| Visitor (not logged in) | Just opened the link | Understand what the app does, call an emergency number, browse public info, then register |
| Person in an emergency | Stressed, one hand, maybe shaking | Reach SOS / call 117 / 118 / 119 in **one tap** from anywhere |

Other roles (admin, department staff, organizations, news reporters) have their own dashboards. Don't design those, but leave a small entry point for staff.

## Goal of this page
1. Make **SOS / emergency calling** reachable in one tap, without making the page feel alarming.
2. Make **"Report a problem"** the main everyday action.
3. Show **what's happening near me** (alerts, nearby reports, lost items, events).
4. Show **my own activity** (status of my reports, claims, incidents) when logged in.
5. Give clear entry points to all four features.

## Content and data available (use realistic examples, not lorem ipsum)
- **Active alert** (only sometimes): "ប្រកាសអាសន្ន៖ ភ្លៀងធ្លាក់ខ្លាំង / Alert: heavy rain expected. Avoid low roads and report blocked drains." Or "Fire at Russey Keo market. Avoid the area."
- **User**: "សុខ ដារ៉ា", Tuol Kouk khan, Phnom Penh. 3 unread notifications.
- **My activity**:
  - Report RPT-2026-00007 "Traffic light off at Russian Blvd x Monivong": *In progress*, Road Maintenance.
  - Report RPT-2026-00009 "Drain cover broken": *Resolved, waiting for verification*.
  - Lost & Found claim on "National ID card found near Psar Thmei": *Pending*.
- **Near you**:
  - Public reports: blocked drain (Closed), overflowing rubbish (Assigned, 12 supports).
  - Lost & Found: "Honda moto key with red keychain, found at Aeon Sen Sok".
  - Event: "Free dengue prevention talk, Wed 26 Nov 15:00, Boeng Kak 2 Sangkat office (12 going)".
  - Service: "Boeng Kak 2 Sangkat office: open now, 0.4 km".
- **Hotlines**: 117 Police · 118 Fire · 119 Ambulance.
- **Popular guides**: Get or renew a National ID · Register a birth.

## Constraints (must follow)
- **Mobile first:** design at **375 × 812**. Also show one **desktop (1280 px)** adaptation of the chosen variant.
- **Khmer first:** all labels in Khmer with English in smaller text, or show a Khmer and an English version of the main screen. Khmer script is taller and wider than Latin, with stacked subscript letters, so:
  - Body line-height about 1.7.
  - Labels need about 20–30% more horizontal room than English.
  - No all-caps, no thin weights, no tight letter-spacing.
- **Touch targets:** at least 48 × 48 px. Primary actions reachable with the thumb (lower half of the screen).
- **Bright sunlight:** strong contrast, no meaning carried by pale colors alone.
- **Low data:** the home page must work if images and the map fail to load. Use text and icons first; the map is a preview, not required.
- **Navigation:** bottom tab bar with 5 tabs (e.g. Home · Reports · Lost & Found · Community · Me), plus a persistent SOS entry that isn't a sixth tab.
- **Accessibility:** WCAG AA contrast. Status always uses icon + label + color, never color alone. Logical reading order for screen readers.
- **Trust:** this is used alongside government. Calm, clear, official, but friendly. Not a social-media look, no dark patterns, no gamification.

## Visual language (wireframe level)
Mid-fidelity: grayscale layout with **only semantic color**, using these tokens:
- Primary (Cambodian flag blue) `#032EA1`: main buttons, header.
- Angkor gold `#C99A2E`: thin decorative accents only (e.g. header underline). Never text.
- Danger red `#C8102E`: **only** SOS, emergency and active alerts. Nothing else is red.
- Status colors:
  - Reported: orange `#C2410C`.
  - In progress: amber `#F2B01E`.
  - Fixed / closed: green `#157347`.
  - Rejected / expired: grey `#7A7468`.
- Background: warm sand `#FAF8F4`. Cards: white with `#E6E0D6` borders. Text: `#1C1A17`, secondary `#6B6457`.
- Font: Kantumruy Pro (Khmer) and Inter (Latin). Simple line icons.

## What to deliver
1. **Three layout variants** of the mobile home page, each with a different strategy, shown side by side:
   - **A. Action-first:** big quick-action grid at the top (Report · Lost & Found · Services · SOS), then my activity, then near you.
   - **B. Feed-first:** "What's happening near me" as the main content, with actions in a compact row and a floating "Report" button.
   - **C. Map-first:** a top map preview of nearby reports and services with a draggable bottom sheet for actions and activity.
2. **A recommendation:** which variant you'd ship for the hackathon demo, and why, in 3–5 bullets.
3. For the recommended variant:
   - **States:**
     - (a) visitor, not logged in;
     - (b) logged-in resident with an active alert;
     - (c) logged-in resident, nothing happening (empty states that invite action);
     - (d) location permission denied;
     - (e) offline / slow connection (skeletons).
   - **SOS flow entry:** show what happens on tap. The first screen shows three large call buttons (117 / 118 / 119) before anything else, then "Send SOS in app".
   - **Annotations** numbered on the frames: purpose of each section, the data it shows, the tap target, and the priority order.
   - **Desktop adaptation** at 1280 px: two or three columns, same priority order.
4. A short **component inventory** used on Home: alert banner, quick-action tile, status chip, report card, lost-item card, event card, service row, bottom nav, SOS button / sheet, section header with "See all".

## Design principles to apply
- **One primary action per screen region.** Don't make five things look equally important.
- **Progressive disclosure:** show 2–3 items per section with "See all", not long lists.
- **Show the status of my stuff before generic content** for logged-in users. That's what brings people back.
- **Make emergency obvious but not loud.** It's always one tap away, but red is used sparingly so it keeps its meaning.
- **Respect privacy:** never show other people's names, phone numbers or exact locations on Home. Lost items show the area, not the person.
- **Explain status in plain words**, e.g. "Resolved: waiting for verification", not just a coded label.

## Avoid
- A hero banner or marketing carousel taking the first screen.
- Red used for anything that isn't an emergency or an alert.
- More than 5 bottom tabs, or tiny icon-only buttons without labels.
- English-only placeholder text. English-width layouts that will break in Khmer.
- A map that blocks the page when it can't load.
- Dense dashboards with charts on the citizen home page.

## Output format
Wireframe frames with clear labels, numbered annotations next to each frame, a
short written rationale, and the component inventory. Use realistic Khmer and
English content from the data above.
