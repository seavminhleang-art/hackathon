# CityVoice — Features Overview

_Working name: CityVoice (សំឡេងក្រុង). Khmer-first, mobile web. National data shapes, Phnom Penh-heavy demo data._

This is the index. Each main feature has its own spec in `docs/features/`.

Priority legend: **P0** = must work in the demo, **P1** = if time allows, **P2** = roadmap / pitch only.

## The four main features

| # | Feature | Spec | API namespace | Status |
|---|---|---|---|---|
| 1 | Lost & Found (National ID, keys, …) | [lost-and-found.md](features/lost-and-found.md) | `api.lf.*` | Foundation done |
| 2 | Emergency response & incident reporting (SOS, location, routing to police / hospital / news) | [emergency.md](features/emergency.md) | `api.em.*` | Foundation done |
| 3 | Government reporting system (civic problems) | [gov-reporting.md](features/gov-reporting.md) | `api.gr.*` | Foundation done |
| 4 | Community & Services | [community-services.md](features/community-services.md) | `api.cs.*` | Foundation done |

"Foundation" = types, mock data, mock API and tests. **No screens are built yet.**

## Cross-feature decisions

| Topic | Decision |
|---|---|
| Emergencies vs civic problems | Crash, fire, crime, medical, people in danger → **Emergency** incidents. Drains, waste, potholes, lights, traffic jams, standing water → **Government reporting** |
| Hospitals and police | Owned by **Emergency** (organizations = emergency directory). Community & Services lists civic offices only |
| Alerts and banners | **One system**: Community & Services announcements. Emergency publishes alerts into it (`publishAlert`, `announcement.incidentId`) |
| Hotlines 117 / 118 / 119 | Shared `EMERGENCY_HOTLINES` in `src/lib/mock/data.ts` |
| Coverage | National (25 provinces, `src/lib/mock/locations.ts`). Mock data is mostly Phnom Penh |
| Report-and-hide | 3 distinct reports hide a post or comment (Lost & Found, Community) |
| Personal numbers | Phone / ID / card numbers blocked in public resident text |
| Notifications | One shared list. Types are prefixed: `GR_*`, `LF_*`, `CS_*`, `EM_*` |

## Accounts and roles (shared)

| Role | How they get it | Used by |
|---|---|---|
| Visitor | Not logged in | All features: read public content, call hotlines |
| `CITIZEN` | Self-registration (`api.register`) | All features |
| `OFFICER` | Seeded. Local government official tied to one city/khan | Community (announcements, directory edits) |
| `DEPARTMENT_STAFF` | Seeded. Has `departmentId` | Government reporting (department tasks) |
| `ADMIN` | Seeded | Everything (review and close civic reports, verify emergencies, …) |
| `ORGANIZATION` | Seeded. Has `organizationId` | Emergency (organization inbox) |
| `REPORTER` | Seeded. Has `organizationId` (news org) | Emergency (approved news releases) |

Registration: full name, phone (login id; accepts `012 345 678` and `+855…`, stored `0XXXXXXXX`),
password (6+), province + city/khan, optional sangkat and email, language. Self-registration is always `CITIZEN`.

Demo accounts: see the table in the [README](../README.md#demo-accounts). Password for all: `demo1234`.

## Screen list (to build)

| Route | Feature | Who | Priority |
|---|---|---|---|
| `/` home: alert banner, SOS button, shortcuts | shared | all | P0 |
| `/register`, `/login` | shared | guest | P0 |
| `/notifications` | shared | logged in | P0 |
| `/sos`, `/emergency/report`, `/emergency/[id]`, `/emergency/nearby` | Emergency | all / citizen | P0 |
| `/org/inbox`, `/org/incidents/[id]` | Emergency | organization | P0 |
| `/report/new`, `/me/reports`, `/reports/[code]`, `/admin/reports`, `/staff/tasks` | Gov reporting (phase 1) | citizen / admin / staff | P0 |
| `/reports`, `/reports/map`, `/admin/stats` | Gov reporting (phase 2) | all / admin | P1 |
| `/lost-found`, `/lost-found/new`, `/lost-found/[id]`, `/lost-found/[id]/claim` | Lost & Found | all / citizen | P0 |
| `/services`, `/guides/[id]`, `/announcements`, `/community`, `/community/groups/[id]` | Community | all / citizen | P0–P1 |
| `/me/contacts` (trusted contacts) | Emergency | citizen | P1 |
| `/stats`, `/admin/emergency`, `/news` | various | all / admin / reporter | P1–P2 |

## Demo script idea (3–4 minutes)
1. Register as a new citizen (Khmer UI, phone validation).
2. Report a blocked drain → admin (012000003) approves and assigns → drainage staff (012000016) starts work and resolves → admin closes → citizen gets each notification.
3. Press SOS → call screen first → trusted contact gets an alert → ambulance dispatch (012000014) opens it (Received) and marks Responding.
4. Lost & Found: a found ID is claimed with the secret detail, approved, pickup set.
5. Community: alert banner, service guide, clean-up event RSVP.
