# AGENTS.md — Feature 2: Emergency Response & Incident Reporting

AI handoff guide for this feature only. Shared rules (stack, commands, conventions,
cross-feature decisions) are in the root [AGENTS.md](../../../AGENTS.md). Read both.
Full human spec: [docs/features/emergency.md](../../../docs/features/emergency.md).

## What it is
SOS button, incident reports with location, trusted contacts, emergency service
directory and nearby services, automatic routing to the right organization
(police, hospital, ambulance, fire, rescue), report tracking, public alerts, and
admin-approved news releases.

## Status
| Part | Status |
|---|---|
| Types, mock data, mock API, tests | Done |
| Screens | Built by Smey (routes in `src/app/(app)/emergency/`, `sos/`, `org/`, `me/contacts/`). Aligned with the shared model: design tokens only, lucide icons (no emoji), shared `HotlineStrip`, data through `api.*` (`useLocations`, `useIncidentTypes` in `meta.tsx`). Admin and news screens remain |
| Real channels (Telegram, SMS, APIs) | Future plan. Mock delivers to an in-app organization inbox only |

## Files
| What | Path |
|---|---|
| Types (`Em*`, `EM_RULES`) | `src/types/emergency.ts` |
| Seed (incident types + routing, 12 organizations, 8 incidents, dispatches, contacts, news) | `src/lib/mock/emergency.ts` |
| Hotlines 117/118/119 (shared) | `EMERGENCY_HOTLINES` in `src/lib/mock/data.ts` |
| Mock API (`api.em.*`) | `src/lib/api/emergency-api.ts` |
| Tests | `scripts/test/emergency.test.mjs` → `npm run test:mock emergency` |
| UI | Shared pieces in `src/features/emergency/` (`meta.tsx`: `HotlineStrip`, `IncidentIcon`, `useLocations`, `useIncidentTypes`; `EmergencyProfileCard` on `/dashboard/profile`). Routes in `src/app/(app)/sos`, `emergency/`, `org/`, `me/contacts` |

## Status flow
```
SUBMITTED → RECEIVED → UNDER_REVIEW → ACKNOWLEDGED → RESPONDING → RESOLVED
    ├─► REJECTED (admin, reason)   ├─► CANCELLED (reporter, reason)   └─► DUPLICATE (admin)
```
- Each incident has one **dispatch** per organization: `SENT → RECEIVED → … → RESOLVED` or `DECLINED`.
- Incident status = furthest non-declined dispatch status. Never goes back.
- `RECEIVED` = organization staff **opened** it (`getOrgIncident`).
- Admin `verified` is separate and never delays delivery; it's needed for public alerts and news.

## API cheat sheet
| Need | Call |
|---|---|
| Hotlines, types | `api.em.getHotlines()`, `listIncidentTypes()` |
| Directory / nearby | `listServices({ type, provinceId, near, radiusKm, openNow })`, `nearbyServices(location, { type })`, `getService(id)` |
| SOS | `sendSos({ type, location, locationSource, provinceId, cityId, note })` → `{ incident, hotline, notifiedInApp, smsLinks }` |
| Report | `createIncident({ type, severity, description, photoUrls, location, locationSource, provinceId, cityId, occurredAt, consent })` |
| Track / cancel | `myIncidents()`, `getMyIncident(id)`, `cancelIncident(id, reason)` |
| Trusted contacts (max 5) | `listTrustedContacts`, `addTrustedContact`, `updateTrustedContact`, `removeTrustedContact` |
| Organization staff | `orgInbox()`, `getOrgIncident(id)` (confirms receipt), `updateDispatch(id, status, { note, responseInfo })` |
| Admin | `adminListIncidents`, `verifyIncident`, `assignOrganization`, `rejectIncident`, `markDuplicate`, `publishAlert`, `createNewsRelease` |
| Reporter / public | `listNewsReleases()` (REPORTER), `listPublicIncidents()` (verified, redacted) |
| Routing helper | `routeOrganizations(type, { location, provinceId, cityId })` |

## Rules you must keep
- **SOS screen shows the Call 117/118/119 button first.** The app never replaces calling. Visitors can call without logging in.
- **"Submitted" ≠ help is coming.** Show the real dispatch status and which organization confirmed.
- Ask permission before reading location; fall back to a map pin. GPS needs HTTPS.
- Consent defaults to **off** for reports (`shareContactWithResponders`, `shareWithNews`); SOS shares contact by default.
- **Nothing goes to news automatically:** consent + admin verification + admin-written release, only photos from the incident.
- Public view: no description, photos, reporter, or exact location (rounded ~100 m).
- Limits (`EM_RULES`): 5 trusted contacts, 3 SOS/hour (then show hotline only), 10 reports/day, 3 rejections in 30 days → held for admin review.
- Red (`danger` token) is reserved for this feature's emergency UI.

## Screens to build
| Route | Who |
|---|---|
| `/sos` (call first → type → location → send → trusted contacts / sms links) | all (send needs login) |
| `/emergency/report`, `/emergency/[id]` (tracking timeline + dispatches) | citizen |
| `/emergency/nearby`, `/emergency/services` | all |
| `/me/contacts` | citizen |
| `/org/inbox`, `/org/incidents/[id]` | ORGANIZATION |
| `/admin/emergency` | ADMIN |
| `/news` | REPORTER |

## Demo accounts (password `demo1234`)
012000001 citizen with open SOS em-3 and 2 trusted contacts · 012000004 trusted contact (gets SOS alert) ·
012000005 reporter of fire em-4 (responding, public alert an-7) · 012000003 admin ·
012000010 police · 012000011 Calmette ER · 012000012 fire · 012000014 119 ambulance · 012000013 news reporter.

## Boundaries
- Hospitals / police / ambulance / fire / rescue belong **here** (organizations = directory). Civic offices are in Community & Services.
- Public alerts go through **Community & Services announcements** (`publishAlert` → `api.cs.createAnnouncement`, `announcement.incidentId`). Don't build a second alert system.
- Civic problems (drains, potholes…) are Government Reporting (`api.gr`), not incidents.
- Notifications: `EM_*` types, field `incidentId`.

## Open questions
Real organization numbers and coverage · can verified organizations publish alerts themselves · notify trusted contacts when an SOS is cancelled.
