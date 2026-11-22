# Prompt: Community & Services wireframes (for Claude Design)

Copy everything below the line into Claude Design. When it's done, export the
project as a zip and hand it to the developer (or to Claude Code) to build.

---

## Role
You are a senior product designer with experience in government and civic-tech
products for Southeast Asian, mobile-first audiences. Design **mid-fidelity
wireframes for the Community & Services section** of the app below. Decide the
information hierarchy, show it in layout, and explain why.

## Product context
**CityVoice (សំឡេងក្រុង)** is a citizen services platform for Cambodia, starting
in Phnom Penh and covering all 25 provinces. Hackathon project, theme "Smart City
& Urban Services". It has four features: Lost & Found, Emergency (SOS),
Government reporting, and **Community & Services** (this brief).

The Home page is already built. Your screens must look like they belong to it
(see "Existing design system" below). This is a **working app, not a marketing
site**: people open it to get something done. No hero sections on these screens.

Community & Services has five parts:
- **A. Service directory:** civic offices only (sangkat/khan offices, one-window
  offices, water and electricity offices, post offices, waste drop-off points),
  with opening hours, "open now", distance, call and directions. Also the user's
  rubbish pickup schedule. Hospitals and police are **not** here (they're in Emergency).
- **B. Paperwork guides:** step-by-step "how to" for National ID, birth
  certificate, residence/family book, motorbike plate. Steps, required documents
  checklist, fee (always with "check at the office"), processing time, which
  offices do it, "Was this helpful?", and Q&A comments.
- **C. Announcements:** official notices from local officials only. Levels:
  Info, Warning, Alert (red, emergencies only). Area-based. Comments optional.
- **D. Community board:** posts by residents and officials in their area. Four
  post types: **Discussion**, **Question** (asker can mark a best answer),
  **Event** (date, place, capacity, RSVP "I'm going" / "Interested"),
  **Poll** (one vote, results shown only after voting or when closed).
  Comments (one level of replies), reactions (Like, Helpful), report content.
  Official posts have a verified badge and can be pinned.
- **E. Groups:** area groups and interest groups (e.g. a canal clean-up group,
  a parents' group, market vendors). Join/leave, group feed, members, moderators.

## Users
| User | Situation | What they need here |
|---|---|---|
| Resident (primary) | Android phone, outdoors, sometimes slow data. Reads Khmer first. Mixed digital literacy, from students to older parents | Find an office and whether it's open, know which documents to bring, see what's happening in their sangkat, ask neighbours, join an event |
| Visitor (not logged in) | Opened a shared link | Read everything. Posting, voting, RSVP and comments ask them to log in |
| Local official (`OFFICER`) | Sangkat/khan staff on desktop or phone | Post announcements and official posts, pin, see edit suggestions for office info |

## Screens to design (mobile 375 × 812 first)
Priority order. Design P0 fully; P1 can be lighter.

| # | Route | Screen | Priority |
|---|---|---|---|
| 1 | `/community` | **Community hub**, Board tab: filter chips (All · Events · Questions · Polls · Discussions), pinned official post, post cards, "New post" button. Sub-navigation to **Board · Groups · News** at the top | P0 |
| 2 | `/community/posts/[id]` | **Post detail** in all four types (show the Event and Poll versions in full; Question and Discussion can be smaller) | P0 |
| 3 | `/community/new` | **Create post**: pick a type first (big choice cards), then a form that changes by type. Area defaults to the user's sangkat | P0 |
| 4 | `/announcements`, `/announcements/[id]` | **News** list and detail. Alerts on top. Official source and time on each | P0 |
| 5 | `/services` | **Directory**: search, "Open now" toggle, type filter, nearest first, rubbish pickup card at top, office cards with Call / Directions. Optional map preview that never blocks the list | P0 |
| 6 | `/services/[id]` | **Office detail**: hours for the week with today highlighted, address, phone, which guides are handled here, "Suggest an edit" | P0 |
| 7 | `/guides`, `/guides/[id]` | **Guide list** (search + categories) and **guide detail** (numbered steps, documents checklist, fee, time, where to go, helpful, Q&A) | P0 |
| 8 | `/community/groups`, `/community/groups/[id]` | **Groups** list (My groups / Near me / Interests) and group page (about, Join, feed, members) | P1 |
| 9 | `/admin/announcements` | **Official: new announcement** form (level, category, area, valid from/to, pin) | P1 |

For each P0 screen show these states where they apply: **loading** (skeletons),
**empty** (says what will appear + one next step), **visitor** (actions lead to
log in), and **error/offline**.

Also show a **desktop adaptation at 1280–1440 px** for screens 1, 2 and 5:
main column + right column (e.g. on the Board: feed on the left, "Upcoming
events" and "Your groups" on the right).

## Realistic content (use this, not lorem ipsum)
- **User:** សុខ ដារ៉ា, Boeng Kak 2 sangkat, Tuol Kouk khan, Phnom Penh.
- **Board posts:**
  - Event (official, pinned): "Free dengue prevention talk", Wed 26 Nov 15:00–16:30, Boeng Kak 2 Sangkat office, 12 going.
  - Event: "Sunday clean-up at the Sen Sok canal", Sun 29 Nov 07:00, Sen Sok pagoda gate, capacity 30, 2 going. Group: Sen Sok canal clean-up.
  - Poll: "Best day for the monthly market clean-up?" Options: Saturday morning · Sunday morning · Weekday evening.
  - Question: "Where do I renew my National ID in Chamkar Mon?" (has a best answer).
  - Discussion: "Traffic at the school gate at 7am".
  - Discussion (group): "Vendor meeting about new bins".
- **Groups:** Sen Sok canal clean-up · Tuol Kouk parents · Psar Thmei vendors · Siem Reap volunteers.
- **Announcements:** Alert "Heavy rain expected: avoid low roads and report blocked drains" · Warning "St. 289 partly closed, 22–25 Nov, use St. 315" · Info "Waste pickup time change" · Info "Dengue prevention week" · Warning "Planned power cut".
- **Offices:** Boeng Kak 2 Sangkat office (St. 289, 0.2 km, closed now, opens 07:30) · Tuol Kouk Khan hall · Phnom Penh One Window Service Office · Water utility customer office · Central Post Office · Sen Sok waste drop-off point.
- **Rubbish pickup (Tuol Kouk):** every day 18:00–22:00, "Put bags out before 18:00".
- **Guides:** Get or renew a Khmer National ID card (steps: Prepare documents → Go to the office that handles ID cards → Photo and fingerprints → Collect the card) · Register a birth and get a birth certificate · Get a residence book / family book · Register a motorbike and get a plate.

## Existing design system (must match)
The app already uses this. Wireframes can be grayscale but keep these shapes,
sizes and semantic colors so the build is a straight translation.

- **Style:** "refined civic". Warm sand page background `#FAF8F4`, white cards
  with **16 px radius and a soft shadow** (no heavy black borders), 12 px radius
  on buttons and inputs, pill-shaped status chips.
- **Colors (semantic only):**
  - Primary flag blue `#032EA1`: main buttons, links, active tab.
  - Gold `#C99A2E`: thin accents only (active tab underline). Never text.
  - Danger red `#C8102E`: **only** SOS, hotlines and Alert-level announcements.
  - Status chips use a tint background + dark text of the same hue: waiting/reported orange, in progress amber, done/open green, closed/expired grey. Always icon + label.
  - Feature accent for icon tiles: **Community = orange**, Services = green, Reporting = blue, Lost & Found = gold, Emergency = red.
- **Type scale** (Kantumruy Pro for Khmer, Inter for Latin; 13 px minimum anywhere):
  page title 30 px (36 px desktop) · section heading 22 px · card/row title 18 px semibold · body and buttons 17 px · secondary text 15 px · captions 13 px.
- **Components that already exist** (reuse, don't reinvent): Button (primary / secondary / ghost / danger; 44–56 px tall), Card, ListRow (icon tile + title + subtitle + chips + chevron), IconTile, Section header with "See all", PageHeader (back, title, actions), EmptyState, skeleton rows, TextField / TextArea / SelectField, ChoiceCard (big radio card), bottom Sheet, StatusChip, CountBadge, Carousel, Marquee news ticker.
- **App shell (already built, show it but don't redesign it):** blue top navbar (logo · Home · Reports · Lost items · Community · language · bell · avatar · SOS on desktop; logo · language · bell on mobile), 5 bottom tabs on mobile (Home · Reports · Lost items · Community · Me) and a floating red SOS button bottom-right. Don't add items to the navbar; sub-navigation lives inside the screen.

## Language rule (important)
The app shows **one language at a time**, Khmer by default, with a toggle in the
navbar. **Do not stack Khmer over English** on labels or buttons. Design each
screen in Khmer, and show one key screen (the Board) again in English to prove
the layout survives both. Khmer is wider and taller than Latin: allow about 20–30%
more width on labels, line-height ~1.6–1.7, no all-caps, no thin weights.
User-written content (post titles, comments) appears in whatever language it was
written in.

## Constraints
- Touch targets at least 48 × 48 px; main actions in the thumb zone. "New post" as a clear button (bottom-right is taken by SOS: put it above SOS or in the screen header).
- Bright sunlight: strong contrast, meaning never carried by pale color alone.
- Low data: text and icons first; images and maps optional and never blocking.
- **Privacy:** show names only. Never phone numbers of residents, National ID numbers or exact home locations. Events use public places only. Offices show their official phone.
- **Trust and safety:** official badge on officials' posts; "Report" on every post and comment; reported content hidden after enough reports; no follower counts, likes leaderboards or gamification.
- Accessibility: WCAG AA, logical reading order, icons always paired with labels.

## What to deliver
1. **Information architecture** of the section on one board: how Board, Groups, News, Services and Guides connect, and entry points from Home (feature tile, "See all" links, ticker, hero carousel).
2. **Two layout options for the Community hub** (e.g. A: filter chips + single feed; B: segmented "For you / Events / Questions" with an events strip on top), side by side, and a **recommendation** in 3–5 bullets.
3. **All P0 screens** for the recommended option, with the states listed above.
4. **Numbered annotations** next to each frame: purpose, data shown, tap targets, priority.
5. **Desktop adaptations** for screens 1, 2 and 5.
6. A short **component inventory**: which existing components each screen uses, and any **new** components needed (e.g. post card, poll option bar, RSVP block, comment thread, filter chip row, opening-hours table, document checklist). For each new one: purpose, states (default / selected / disabled), and sizes.

## Design principles to apply
- **One primary action per screen region.** On a post, the primary action depends on type: RSVP for events, Vote for polls, Answer for questions.
- **Progressive disclosure:** 3–5 items then "See all"; collapse long comment threads.
- **Local first:** default to the user's sangkat, with an obvious way to widen to khan / city.
- **Explain in plain words:** "Results show after you vote", "Check the fee at the office", "Opens 07:30 tomorrow" rather than codes.
- **Official vs resident must be obvious** at a glance (badge + label, not color alone).

## Avoid
- Social-media patterns: infinite scroll with no end, stories, follower counts, like counters as the headline.
- Red for anything that isn't an Alert, SOS or hotline.
- Stacked Khmer/English labels.
- Hero banners or marketing carousels on these screens.
- A map that blocks the directory when it fails to load.
- Tiny icon-only buttons without labels.

## Output format
Wireframe frames with clear labels, numbered annotations next to each frame, a
short written rationale for the recommendation, the IA board, and the component
inventory. Use the realistic content above.
