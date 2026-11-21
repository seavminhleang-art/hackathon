# Community & Services — Core Feature 4

_Status: foundation built (types, mock data, mock API). Screens not built yet._

| Code | Path |
|---|---|
| Types | `src/types/community.ts` |
| Seed data | `src/lib/mock/community.ts` |
| Mock API | `src/lib/api/community-api.ts` (used as `api.cs.*`) |

Where residents find **civic services**, learn **how to get government
paperwork done**, read **official announcements**, and **organise with
neighbours** through posts, events, polls and groups.

Coverage: national (all 25 provinces). Mock data is mostly Phnom Penh.

## Scope decisions

| Decision | Choice |
|---|---|
| Parts | Service directory, government service guides, announcements and alerts, community board (posts, events, polls), comments, community groups |
| Who posts | Officials **and** residents. Official content gets a verified badge. Resident content can be reported and auto-hidden |
| Coverage | National data shapes, Phnom Penh-heavy mock data |
| Hospitals and police | **Owned by feature 2 (Emergency).** This feature covers civic services only |

## Modules at a glance

| # | Module | Who creates | Residents can |
|---|---|---|---|
| A | Service directory | Officials (residents suggest edits) | Search, view on map, suggest an edit |
| B | Government service guides | Officials | Read, mark "helpful", ask questions in comments |
| C | Announcements and alerts | Officials only | Read, get notified for their area, comment (if allowed) |
| D | Community board | Residents and officials | Post, comment, react, RSVP to events, vote in polls, report |
| E | Community groups | Residents and officials | Join or leave, post inside groups, moderate own group |

---

## Roles

| Role | Can do |
|---|---|
| Visitor | Read directory, guides, announcements, public posts and groups |
| Resident (CITIZEN) | Everything a visitor can + post, comment, react, RSVP, vote, join groups, create groups, report content, suggest directory edits |
| Group owner / moderator | Edit the group, remove posts and comments in the group, add moderators |
| Official (OFFICER) | Post announcements and alerts **for their own area**, post official board posts and events, edit directory entries in their area, answer guide questions |
| Admin | Everything, any area. Manage guides. Review suggested edits and hidden content |

---

## A. Service directory (civic services)

Find nearby offices with phone, opening hours and a map pin.

**Place types** (hospitals and police belong to feature 2):

| Type | Example |
|---|---|
| `SANGKAT_OFFICE` | Sangkat Boeng Kak 2 office |
| `KHAN_OFFICE` | Khan / district hall |
| `PROVINCIAL_HALL` | City Hall / provincial hall |
| `ONE_WINDOW_OFFICE` | One Window Service Office (business licences, permits) |
| `WATER_OFFICE` | Water utility customer office |
| `ELECTRICITY_OFFICE` | Electricity utility customer office |
| `POST_OFFICE` | Cambodia Post branch |
| `WASTE_POINT` | Waste collection point / drop-off |
| `PUBLIC_LIBRARY`, `COMMUNITY_CENTER`, `OTHER` | |

**Place fields:** name (km/en), type, province, city, sangkat, address, map pin,
phone, opening hours per weekday, list of guides served here, verified flag,
last-updated date.

**Waste pickup schedule:** per city (or sangkat): days, time window, "put bags
out before" note, collector contact.

**Suggest an edit:** residents report wrong phone, hours or location. Officials
or admins accept or dismiss.

Search: keyword, type, province, city, "open now", nearest first (with location).

## B. Government service guides

Step-by-step how-tos for common paperwork.

**Guide fields:** title (km/en), category, summary, numbered steps, required
documents, fee (riel, with "verify at office" note), processing time, where to go
(place types; links into the directory), official source link, last-verified date,
"helpful" count.

**Categories:** identity (National ID, passport), civil registration (birth,
marriage, family book, residence book), vehicles (plate, driving licence),
business (licence, One Window), property, utilities (new water or electricity
connection), social support.

**Comments as Q&A:** residents ask, officials answer (official answers are
badged and pinned).

> Mock fees and steps are illustrative. Every guide shows its last-verified date
> and a link to the official source.

## C. Announcements and alerts

Official news targeted to an area.

**Fields:** title and body (km/en), level (`INFO`, `WARNING`, `ALERT`), category
(flood, road closure, waste, health, utility outage, event, general), scope
(national, province, city or sangkat), valid from/to, pinned, author (official),
image, comments on or off.

**Rules:**
- Only OFFICER/ADMIN can create. An officer can only target their own area.
- `ALERT` shows as a banner and sends a notification to users in the scope area.
- Expired announcements leave the feed but stay in the archive.

## D. Community board

Neighbourhood feed. Each post belongs to an **area** and optionally a **group**.

**Post types:**

| Type | Extra fields |
|---|---|
| `DISCUSSION` | — |
| `QUESTION` | Can mark one answer as accepted |
| `EVENT` | Start, end, place, map pin, capacity; RSVP **going** or **interested** |
| `POLL` | 2–6 options, closes at a date, one vote per user, results after voting |

**Common:** title, body, photos, area (province, city, optional sangkat), group,
author, official badge, reactions (like and helpful), comment count, report count.

**Comments:** one level of replies, reactions, delete by author / post author /
group moderator, report and auto-hide.

**Feed order:** pinned official posts → user's own area → newest.

## E. Community groups

Two kinds:
- **Area groups:** created automatically for each city or khan ("Tuol Kouk
  neighbours"). Everyone in that area can join.
- **Interest groups:** created by residents or officials ("Sen Sok clean-up
  volunteers", "Russey Keo parents", "Psar Thmei vendors").

**Fields:** name, description, cover image, type (area or interest), area,
visibility (public), members, roles (owner, moderator, member), rules text.

**Rules:**
- Anyone can read public groups. Only members can post in a group.
- Owner and moderators can remove posts and comments, and members, in their group.

## Shared with other features

| Shared piece | Used by |
|---|---|
| Comments + reactions | Board posts, guides (Q&A), announcements. Same pattern as Lost & Found comments |
| Report and auto-hide (3 reports) | Same rule as Lost & Found (`LF_RULES.autoHideReports`) |
| Notifications | New `CS_*` types (below) in the shared notification list |
| Provinces and cities | `src/lib/mock/locations.ts` |

### Notifications

| Type | Sent to |
|---|---|
| `CS_ALERT` | Users in the alert's area |
| `CS_ANNOUNCEMENT` | Users who follow the area (INFO and WARNING) |
| `CS_COMMENT` / `CS_REPLY` | Post author / comment author |
| `CS_ANSWER_ACCEPTED` | Answer author |
| `CS_EVENT_REMINDER` | Users who RSVP'd going (1 day before) |
| `CS_GROUP_POST` | Group members (optional per group) |
| `CS_EDIT_REVIEWED` | Resident who suggested a directory edit |
| `CS_CONTENT_HIDDEN` | Content author |

## Safety rules
- Report and auto-hide after 3 distinct reports.
- Officials can only post official content for their own area.
- No phone numbers or National ID numbers in resident posts (same check as Lost & Found).
- Events must have a public place (no private home addresses on the map).

## Suggested priority

| Priority | Items |
|---|---|
| P0 (demo) | Directory search + map, 4–5 guides, announcements with alert banner, board posts + comments, events with RSVP |
| P1 | Groups (join, post in group), polls, question/accepted answer, suggest an edit |
| P2 | Event reminders, follow an area, group moderation tools, open-now filter |

## API (mock)

| Module | Functions |
|---|---|
| A. Directory | `listPlaces(filter)` (keyword, type, province, city, `openNow`, `near` = nearest first), `getPlace`, `getWasteSchedules`, `suggestEdit`, `listEditSuggestions` (official), `reviewEdit` (official; accepting PHONE/ADDRESS applies it), `createPlace`, `updatePlace` (official) |
| B. Guides | `listGuides({ q, category })`, `getGuide` (guide + places that handle it), `toggleGuideHelpful` |
| C. Announcements | `listAnnouncements` (viewer's area by default), `activeAlerts` (banner), `getAnnouncement`, `createAnnouncement` (official, own area; ALERT notifies the area), `deleteAnnouncement` |
| D. Board | `listPosts(filter)`, `getPost`, `createPost`, `deletePost`, `rsvp(postId, "GOING" \| "INTERESTED" \| null)`, `votePoll`, `acceptAnswer`, `toggleReaction` |
| Comments | `listComments(target, id)` (threaded), `addComment(target, id, { body, parentId })`, `deleteComment` |
| E. Groups | `listGroups`, `getGroup`, `listMembers`, `createGroup`, `joinGroup`, `leaveGroup`, `setMemberRole`, `removeMember` |
| Safety | `reportContent({ targetType, targetId, reason })` |

Behaviour worth knowing:
- Opening hours are checked in Cambodia time (UTC+7).
- Poll results are hidden until the viewer votes or the poll closes. Votes can't be changed.
- An event's author is automatically "going". RSVP "going" fails when the event is full.
- Announcement comments are off by default for ALERTs.
- Group notifications (`CS_GROUP_POST`), event reminders and "follow an area" are not built (P2).
- Comments here are separate from Lost & Found comments. Merging both into one shared comment module is a possible later refactor.

## Mock data (for the demo)

- 12 civic places (Phnom Penh, Siem Reap, Battambang, Kampot), 4 waste schedules, 2 pending edit suggestions.
- 6 guides: National ID, birth certificate, residence/family book, moto plate, small business licence, water connection. **Steps are illustrative and fees are not filled in** (`feeRiel: null`, "check at the office"). Verify with the official source before real use.
- 7 announcements: Russey Keo market fire ALERT (published from Emergency incident em-4), Phnom Penh rain ALERT, Tuol Kouk road closure, Chamkar Mon waste time change, national info, Boeng Kak 2 dengue week, an expired Kampot power cut.
- 42 groups: one area group per city/khan (38) + 4 interest groups.
- 8 board posts: upcoming clean-up event, poll, answered question, discussion, official pinned event, Siem Reap discussion, past event, auto-hidden spam.

| Phone | Useful for |
|---|---|
| 012000001 (citizen, Tuol Kouk, Boeng Kak 2) | Sees the rain alert, road closure and dengue notice; owns the parents group; voted in the poll |
| 012000002 (officer, Tuol Kouk) | Posts announcements and reviews edits for Tuol Kouk only |
| 012000003 (admin) | Posts anywhere, deletes anything |
| 012000004 (citizen, Chamkar Mon) | Asked the National ID question (answered by an officer) |
| 012000005 (citizen, Sen Sok) | Owns the Sen Sok clean-up group |
| 012000006 (officer, Chamkar Mon) | Officer for Chamkar Mon |
| 012000007 (citizen, Siem Reap) | Owns the Siem Reap volunteers group |

## Removed from shared code
- The old `SERVICES` and `ANNOUNCEMENTS` lists in `src/lib/mock/data.ts` (and `getServices` / `getAnnouncements`) were replaced by this module.
- The hospital and police entries in that old list were dropped. Feature 2 (Emergency) owns hospitals and police posts.

## Links with Emergency (feature 2)
- Emergency publishes public alerts as announcements here (`api.em.publishAlert`). Such announcements have `incidentId`.
- Announcement categories include `FIRE` and `ROAD_ACCIDENT` for that reason.
- Tests: `scripts/test/community.test.mjs`.
