# Emergency Response & Incident Reporting — Core Feature 2

_Status: foundation built (types, mock data, mock API, tests). Screens not built yet._
_Original analysis by the Emergency feature owner; integrated and reconciled with the other features._

| Code | Path |
|---|---|
| Types | `src/types/emergency.ts` |
| Seed data | `src/lib/mock/emergency.ts` (organizations, incident types, incidents, dispatches, trusted contacts, news releases) |
| Mock API | `src/lib/api/emergency-api.ts` (used as `api.em.*`) |
| Tests | `scripts/test/emergency.test.mjs` (`npm run test:mock emergency`) |

**Process:** user presses SOS or reports an incident → app gets the location (with
permission) → user adds details → system picks the right organizations → sends
through an approved channel → organization confirms receipt → user tracks status.

## Key rules (from the spec, enforced in the mock)

| Rule | How the mock enforces it |
|---|---|
| SOS never depends on the app | `sendSos` returns `hotline`; the UI must show a **Call 117/118/119** button before anything else. Visitors can call without logging in. After 3 SOS in an hour, `LIMIT` error tells the UI to show only the hotline |
| Location permission | API takes `locationSource: GPS \| MAP \| TEXT`. UI asks permission, falls back to a map pin. HTTPS needed for GPS |
| Correct organization | `EM_INCIDENT_TYPES[].routesTo` (e.g. crash → ambulance + police, fire → fire dept). Nearest covering org in the province, else nearest anywhere |
| News privacy | Nothing is sent to news automatically. A news release needs: reporter consent (`consent.shareWithNews`) + admin verification + an admin-written redacted release |
| Report confirmation | `SUBMITTED` means "sent, not confirmed". Only organization actions move the status forward |
| Victim protection | Public view (`listPublicIncidents`) has no description, photos, or reporter; location rounded to ~100 m. Organizations see reporter contact only with consent |

## Roles

| Role (`Role`) | Can do |
|---|---|
| Visitor | Hotlines, emergency directory, nearby services, public (verified) incidents, public alerts |
| `CITIZEN` | SOS, incident reports, trusted contacts, track and cancel own reports |
| `ADMIN` | See all incidents, verify, reject (reason), mark duplicate, re-assign to an organization, publish public alerts, create news releases |
| `ORGANIZATION` (user has `organizationId`) | Inbox of dispatched incidents, open (= confirm receipt), move status forward, decline with reason, add response info |
| `REPORTER` (news, has `organizationId`) | Read admin-approved news releases only |

## Status flow

```
SUBMITTED ─► RECEIVED ─► UNDER_REVIEW ─► ACKNOWLEDGED ─► RESPONDING ─► RESOLVED
    │
    ├─► REJECTED   (admin, reason required)
    ├─► CANCELLED  (reporter: "I'm safe" / false alarm, reason required)
    └─► DUPLICATE  (admin, linked to the original incident)
```

- Each incident is sent to one or more organizations. Each **dispatch** has its own
  status: `SENT → RECEIVED → UNDER_REVIEW → ACKNOWLEDGED → RESPONDING → RESOLVED`, or `DECLINED`.
- **Incident status = furthest status of any non-declined dispatch.** It never goes back.
- `RECEIVED` happens when organization staff **open** the incident (`getOrgIncident`).
- `DECLINED` (wrong area/type, reason required) → admin re-assigns with `assignOrganization`.
- **Admin verification is separate from delivery.** It never delays an SOS. It's only
  required for public alerts and news releases.

### Decisions made while integrating (the original spec left these open)
1. Who does "Under review"? → the **organization** (it comes after Received). Admin verification is a separate `verified` flag.
2. Added `CANCELLED` and `DUPLICATE` (not in the original list).
3. Severity is `LOW | MEDIUM | HIGH | CRITICAL` (SOS is always `CRITICAL`).
4. "Approved channels" = **in-app organization inbox only** in the mock (`channel: "IN_APP"`). Telegram, SMS, API are the future plan.
5. Trusted contacts: app users get an in-app alert; others get a ready `sms:` link the user taps (a website can't send SMS by itself).
6. Coverage is **national** data shapes (like the other features), mock data mostly Phnom Penh.

## The 10 core features

| # | Feature | API |
|---|---|---|
| 1 | Emergency SOS | `sendSos({ type, location, locationSource, provinceId, cityId, note? })` → `{ incident, hotline, notifiedInApp, smsLinks }` |
| 2 | GPS location sharing | `location` + `locationSource` + `accuracyM` on SOS and reports |
| 3 | Trusted contacts (max 5) | `listTrustedContacts`, `addTrustedContact`, `updateTrustedContact`, `removeTrustedContact` |
| 4 | Incident reporting | `createIncident({ type, severity?, description, photoUrls, location, occurredAt, peopleAffected, consent })` |
| 5 | Emergency service directory | `listServices(filter)`, `getService`, `getHotlines` |
| 6 | Organization report distribution | automatic on submit (`routeOrganizations`), `orgInbox`, `getOrgIncident`, `updateDispatch`, admin `assignOrganization` |
| 7 | Nearby emergency services | `nearbyServices(location, { type?, radiusKm = 10 })` |
| 8 | Report tracking | `myIncidents`, `getMyIncident` (status history + every dispatch with org name and response info), `cancelIncident` |
| 9 | Public incident alerts | `publishAlert(incidentId, …)` → creates an **ALERT announcement in Community & Services** (one alert system for the whole app; `announcement.incidentId` links back). `listPublicIncidents` for the map |
| 10 | Safety, verification & privacy | `verifyIncident`, `rejectIncident`, `markDuplicate`, `createNewsRelease`, `listNewsReleases`; limits in `EM_RULES` |

### Limits (`EM_RULES` in `src/types/emergency.ts`)

| Rule | Value |
|---|---|
| Trusted contacts | 5 per user |
| SOS per hour | 3 (then: call the hotline directly) |
| Reports per day | 10 |
| Rejected reports (30 days) before new reports are held for admin review | 3 |
| Nearby radius | 10 km |
| Public location rounding | 3 decimals (~100 m) |

### Incident types and routing (`EM_INCIDENT_TYPES`)

| Type | Hotline | Routed to |
|---|---|---|
| ROAD_CRASH | 119 | Ambulance, Police |
| FIRE | 118 | Fire |
| MEDICAL | 119 | Ambulance, Hospital |
| CRIME | 117 | Police |
| VIOLENCE | 117 | Police |
| FLOOD_DANGER | 117 | Rescue, Police |
| DROWNING | 119 | Rescue, Ambulance |
| BUILDING_COLLAPSE | 118 | Fire, Rescue, Ambulance |
| ELECTRICAL_HAZARD | 118 | Fire |
| MISSING_PERSON | 117 | Police |
| OTHER | 117 | Police |

## Boundaries with other features

| Topic | Owner | Notes |
|---|---|---|
| Hospitals, police, ambulance, fire, rescue directory | **Emergency** | Organizations double as directory entries |
| Civic problems (drains, waste, potholes, streetlights, traffic jams, standing water) | Government reporting (feature 3) | `ROAD_CRASH` and `NEED_POLICE` were removed from feature 3's categories |
| Public alerts / banners | Community & Services announcements | Emergency publishes into them via `publishAlert`; categories `FIRE`, `ROAD_ACCIDENT`, `FLOOD`, `ROAD_CLOSURE` exist |
| Hotline numbers 117/118/119 | Shared (`EMERGENCY_HOTLINES` in `src/lib/mock/data.ts`) | Renamed from `EMERGENCY_CONTACTS` to avoid confusion with trusted contacts |
| Notifications | Shared list | Types `EM_STATUS`, `EM_NEW_INCIDENT`, `EM_SOS_CONTACT`, `EM_VERIFIED`, `EM_NEWS_RELEASE`; field `incidentId` |

## Mock data (for the demo)

Password for every account: `demo1234`.

| Phone | Account | Useful for |
|---|---|---|
| 012000001 | Citizen, Tuol Kouk | Has an open SOS (em-3, medical), 2 trusted contacts (one app user, one SMS) |
| 012000004 | Citizen, Chamkar Mon | Trusted contact of 012000001 (gets SOS alerts); reported em-1 (resolved crash) and em-5 (flood rescue, under review) |
| 012000005 | Citizen, Sen Sok | Reported em-4 (market fire, responding, public alert an-7, news-consent yes) |
| 012000003 | Admin | Verify, reject, duplicate, re-assign, publish alert, news release |
| 012000010 | Municipal Police | Organization inbox (em-5) |
| 012000011 | Calmette Hospital ER | Inbox: SOS em-3 |
| 012000012 | Fire Department | Inbox: em-4 (responding) |
| 012000014 | 119 ambulance dispatch | Inbox: SOS em-3 |
| 012000013 | News reporter | Sees news release nr-1 only |

Seed incidents: em-1 resolved crash · em-2 resolved fight · em-3 open SOS · em-4 fire responding (verified, public alert) · em-5 flood under review · em-6 rejected fake · em-7 duplicate of em-4 · em-8 cancelled SOS.

Phone numbers of organizations are placeholders (`023 000 3xx`). Only 117/118/119 are real.

## Suggested priority
- **P0:** SOS screen (call first, then send + trusted contacts), incident report, org inbox + status updates, report tracking, nearby services.
- **P1:** directory search, trusted contacts screen, admin verify + public alert, decline/re-assign.
- **P2:** news reporter portal, false-report review queue, everything in the future plan.

## Future plan (one slide)
Direct API integration with police and hospitals · Telegram and SMS notifications ·
real-time location sharing with consent · AI incident classification · duplicate
detection · automatic nearby recommendations · heatmap and analytics · voice
reporting · offline hotline info and low-data mode · verified organization
accounts and a national dashboard.

## Open questions for the feature owner
- Real organization contact numbers and coverage areas (currently placeholders).
- Should verified organizations be able to publish public alerts themselves, or only admins?
- Should a cancelled SOS still notify trusted contacts ("I'm safe now")? Not built yet.
