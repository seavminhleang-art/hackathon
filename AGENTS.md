# AGENTS.md — handoff guide for AI assistants (shared)

Read this first. It covers what every feature shares: stack, commands, conventions
and cross-feature decisions. **Each main feature has its own guide** — read the one
for the feature you're working on as well:

| Feature | Agent guide | Human spec |
|---|---|---|
| 1. Lost & Found | [src/features/lost-found/AGENTS.md](src/features/lost-found/AGENTS.md) | docs/features/lost-and-found.md |
| 2. Emergency response | [src/features/emergency/AGENTS.md](src/features/emergency/AGENTS.md) | docs/features/emergency.md |
| 3. Government reporting | [src/features/gov-reporting/AGENTS.md](src/features/gov-reporting/AGENTS.md) | docs/features/gov-reporting.md |
| 4. Community & Services | [src/features/community/AGENTS.md](src/features/community/AGENTS.md) | docs/features/community-services.md |

Each feature folder also has a `CLAUDE.md` (`@AGENTS.md`), so Claude Code loads the
feature guide automatically when it works in that folder. Keep the feature guide's
"Status" and "Screens to build" sections up to date when you finish work there.

## Project
**CityVoice (សំឡេងក្រុង)** — citizen services platform for Cambodia (hackathon,
theme "Smart City & Urban Services"). Khmer-first, mobile-friendly web app.
Student team; each main feature has a different owner.

| Item | Value |
|---|---|
| Frontend | Next.js 16 (App Router, `cacheComponents: true`), React 19, Tailwind v4, TypeScript |
| Backend | Spring Boot + PostgreSQL planned, **not started**. The frontend uses a mock API |
| Node | 22.18+ |

## Current status (update this table when you finish work)

| Area | Status | Details |
|---|---|---|
| Design tokens, fonts, i18n, auth session | Done | README.md |
| 1. Lost & Found | Browse and lost/found post flows built; standalone and dashboard workspace | src/features/lost-found/AGENTS.md |
| 2. Emergency response | Citizen + organization screens built (SOS, report, tracking, directory, nearby, trusted contacts, org inbox). Admin/news remain. `/me` redirects to `/dashboard/profile` | src/features/emergency/AGENTS.md |
| 3. Government reporting | Citizen screens built (static UI) | src/features/gov-reporting/AGENTS.md |
| 4. Community & Services | P0 screens built (Board, posts, News, Services, Guides) | src/features/community/AGENTS.md |
| UI kit (Button, Card, ListRow, Section, fields, Sheet, StatusChip, Thumb/Photo…) | Done. `Thumb` / `Photo` show a photo with the category icon as fallback; `ListRow media={…}`. Live demo at `/design` (dev only) | src/components/ui/ |
| App shell (blue navbar on all sizes; bottom tabs + floating SOS on phone; feature links + SOS in navbar on desktop) | Done | src/components/layout/AppShell.tsx, src/app/(app)/layout.tsx |
| Home `/` dashboard | Done | src/features/home/ |
| Government Reporting citizen screens | Report form, submitted, My reports, detail, public feed on the mock API + shared shell; admin, staff and map remain | `src/app/(app)/report/`, `reports/`, `me/reports/` |
| Login / register, Me area, Lost & Found browse + post | Built. Login = email, phone or username + password, Google, or a 6-digit code by email or Telegram. Sign-up = username, last + first name, email, phone (optional, needed for Telegram), password → area → code by email or Telegram (Google sign-up skips password and code). `User` has `username`, `firstName`, `lastName`, `authProvider`; `fullName` is "Last First" (Khmer order); `phone` is optional. The mock returns codes as `demoCode` and offers sample Google accounts (`DEMO_GOOGLE_ACCOUNTS`); the Spring Boot API must send real emails / Telegram bot messages, verify Google ID tokens, and never return the code (`login`, `requestLoginCode`, `loginWithCode`, `requestSignupCode`, `registerWithCode`, `loginWithGoogle` in `mock-api.ts`). Forms use React Hook Form + zod (`src/features/auth/schemas.ts`, each step checked with `trigger`). "Me" = `/dashboard` (Overview · Activity · Profile tabs inside the shared shell; navbar avatar and Me tab go there) | `src/app/(app)/login`, `register`, `dashboard`, `lost-found`; `src/features/auth/`, `src/features/dashboard/userDashboard/`, `src/features/lost-found/` |
| Notifications | Built | Bilingual notification center at `/notifications` with unread/read filters, mark-read actions, and navbar badge updates; persisted light/dark theme toggle in the shared navbar | `src/features/notifications/`, `src/components/layout/ThemeToggle.tsx` |
| Other screens | **Not started** for remaining Emergency flows, additional Me pages, gov-reporting admin/staff. Build only when the team asks | docs/FEATURES.md (screen list) |
| Spring Boot backend | Not started | — |

## Commands
```bash
npm run dev                  # http://localhost:3000
npm run test:mock            # mock API tests (all 5 suites, must stay green)
npm run test:mock community  # one suite: core | lost-found | community | emergency | gov
npx tsc --noEmit -p .        # type-check (run `npx next typegen` first if route types are stale)
npx eslint src scripts
npm run build
```

## Where things are
```
src/types/index.ts              Shared: users, roles, locations, notifications, hotlines
src/types/lost-found.ts         Lf*  (feature 1)
src/types/emergency.ts          Em*  (feature 2)
src/types/gov-reporting.ts      Gr*  (feature 3)
src/types/community.ts          Cs*  (feature 4)
src/lib/mock/data.ts            Users (all roles), hotlines
src/lib/mock/locations.ts       25 provinces, 38 cities/khans, distanceKm()
src/lib/mock/{lost-found,emergency,gov-reporting,community}.ts   Feature seed data
public/mock/                    Demo stock photos (Wikimedia Commons, see CREDITS.md)
src/lib/api/mock-db.ts          In-memory DB + localStorage, session, ApiError, notify()
src/lib/api/mock-api.ts         Auth, notifications, provinces/cities, hotlines
src/lib/api/{lost-found,emergency,gov-reporting,community}-api.ts
src/lib/api/index.ts            `api` = core + api.lf + api.em + api.gr + api.cs
src/lib/i18n/                   useLocale(): t, tx, setLocale (km default, en)
src/lib/auth/AuthProvider.tsx   useAuth(): user, ready, login, register, logout
src/app/globals.css             Royal Angkor color tokens (Tailwind @theme)
scripts/test/                   setup.mjs (TS loader + fake localStorage), helpers.mjs, *.test.mjs
src/features/<feature>/         UI for each feature (to build) + AGENTS.md / CLAUDE.md feature guide
docs/                           FEATURES.md (index) + features/*.md (one human spec per main feature)
```

## Building screens (read before any UI work)
- **Routes** for citizen screens go in `src/app/(app)/<route>/page.tsx`: the `(app)` layout adds the shell (nav + SOS) for free. Full-screen flows that should hide nav (login, SOS steps) go outside `(app)`.
- **Start every screen** with `<PageContainer>` + `<PageHeader>` (see the copy-paste skeleton on `/design`).
- **Use the kit**, import from `@/components/ui`. Don't hand-roll buttons, cards or chips. If you need a new shared piece, add it to the kit and to `/design`.
- **Style:** "refined civic". Rounded (12px controls, 16px cards), `shadow-card` instead of heavy borders, white cards on sand background. No marketing hero sections: the app opens straight on tools.
- **Feature accents** (`IconTile accent`): reporting = `primary`, Lost & Found = `gold`, services = `fixed`, community = `reported`, emergency = `danger`.
- **Text sizes:** use the type scale tokens, never `text-xs`/`text-[13px]`: `text-page` (30px, `lg:text-display` 36px) page title · `text-title` (22px) section heading · `text-row` (18px) card/row title · `text-body` (17px) paragraphs, buttons, inputs · `text-meta` (15px) subtitles, hints · `text-caption` (13px, the minimum) tab labels, timestamps.
- **Touch targets** ≥ 48px (`Button size="sm"` = 40px, dense rows only). One primary button per screen.
- **Navbar stays minimal:** logo, the 4 feature links (desktop), language, bell, avatar, SOS. Don't add items to it; link to sub-pages from the feature's own screen. UI kit lives at `/design` (not in the nav).
- **SOS:** call `useSos().openSos()` to open the call-first sheet from anywhere.

## Rules to follow
1. **Pattern for feature code:** `src/types/<feature>.ts` → `src/lib/mock/<feature>.ts` → `src/lib/api/<feature>-api.ts` → add namespace in `src/lib/api/index.ts` → `scripts/test/<feature>.test.mjs` → `docs/features/<feature>.md` → `src/features/<feature>/AGENTS.md` (+ `CLAUDE.md` with `@AGENTS.md`). Feature UI components go in `src/features/<feature>/`, routes in `src/app/`.
2. **Prefixes:** types `Lf*` / `Em*` / `Gr*` / `Cs*`; notification types `LF_*` / `EM_*` / `GR_*` / `CS_*`; seed ids `lf-`, `em-`, `gr-`, `cp-`, `pl-`…
3. **Mock DB shape changes:** add the collection to `MockDb` + `freshDb()` in `mock-db.ts` and **bump `STORAGE_KEY`** (`cityvoice.mockdb.vN`) so browsers drop old data.
4. **API functions** are `async`, return `delay(value)`, throw `ApiError(code, message, field?)`. Check permissions with `requireUser([...roles])`. Public views must strip private fields (see `toPublic*` / `*View` helpers).
5. **Privacy is a feature requirement:** never expose phone numbers, National ID numbers, document photos, reporter identity or exact locations in public views. Emergency data goes to news only with consent + admin verification.
6. **Bilingual data:** user-facing seed text uses `I18nText { km, en }`. UI strings go in `src/lib/i18n/dictionary.ts` (both languages). Show **one language at a time** (`t` / `tx`), never Khmer stacked over English; the user switches with `LanguageToggle`. Use `fmt()` for `{placeholders}` and `formatDateParts()` for dates (browsers often lack Khmer locale data). Status = `<StatusChip>` (src/components/ui).
7. **Colors:** use tokens (`bg-primary`, `text-danger`…). Red (`danger`) is for emergencies only. Status always shows icon + label.
8. **Next.js 16** differs from older versions. Read the docs in `node_modules/next/dist/docs/` before using a Next API you aren't sure about. Client components that use hooks or `localStorage` need `"use client"`.
9. Don't use real phone numbers in seed data, except the hotlines 117 / 118 / 119.
10. Keep `npm run test:mock`, type-check, lint and build green. Add tests for new API behaviour.

## Cross-feature decisions (don't undo without asking the team)
- Emergencies (crash, fire, crime, medical, people in danger) live in **Emergency** (`api.em`). Civic problems live in **Government reporting** (`api.gr`).
- Hospitals / police / ambulance / fire / rescue belong to **Emergency** (organizations = emergency directory). Community & Services lists civic offices only.
- **One alert system:** Community & Services announcements. Emergency publishes into it with `api.em.publishAlert` (sets `announcement.incidentId`).
- Hotlines are `EMERGENCY_HOTLINES` (renamed from `EMERGENCY_CONTACTS`). "Trusted contacts" are the user's people (`api.em.*TrustedContact*`).
- Coverage is national (provinces → cities). Mock data is mostly Phnom Penh.
- Government reporting: `RESOLVED` = department says fixed, `CLOSED` = admin verified. Only admins assign, prioritise and close; `DEPARTMENT_STAFF` only touch their department's reports. `OFFICER` is the Community & Services local official, not a report worker.
- Emergency status only moves forward when an **organization** acts. `SUBMITTED` ≠ help is coming.

## Next steps (suggested)
1. Build screens per feature from `docs/FEATURES.md` (only when the team asks).
2. Open questions listed at the end of each feature spec.
3. Start the Spring Boot API: mirror `src/types/*` as DTOs and keep the function names in `src/lib/api/*` so the frontend switch is one file.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
