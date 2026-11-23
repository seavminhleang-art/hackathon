# CityVoice (សំឡេងក្រុង)

Citizen services platform for Cambodia. Khmer-first, mobile-friendly web app.
Hackathon theme: Smart City & Urban Services.

> Status: **foundation only.** Design tokens, fonts, i18n, auth session, data
> types, mock data, a mock API and its tests are ready for all four main features.
> Screens are not built yet.
>
> AI assistants: start with [AGENTS.md](AGENTS.md).

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Requires **Node 22.18+** (the mock API tests run TypeScript directly).

```bash
npm run test:mock            # test the whole mock API (5 suites)
npm run test:mock emergency  # one suite: core | lost-found | community | emergency | gov
```

## Project structure

```
AGENTS.md                     Shared handoff guide for AI assistants (links to the 4 feature guides)
docs/
  FEATURES.md                 Index: the 4 features, cross-feature decisions, roles, screens
  features/
    lost-and-found.md         1. Lost & Found (api.lf)
    emergency.md              2. Emergency response & incidents (api.em)
    gov-reporting.md          3. Government reporting (api.gr)
    community-services.md     4. Community & Services (api.cs)
scripts/test/                 Mock API tests (npm run test:mock)
src/
  app/
    globals.css               Design tokens (colors, font) — Tailwind v4 @theme
    layout.tsx                Fonts (Kantumruy Pro + Inter), <Providers>
    providers.tsx             LocaleProvider + AuthProvider
  components/ui, layout/      Shared components (empty, to build)
  features/                   One folder per main feature: UI (to build) + AGENTS.md guide for AI
    lost-found/ emergency/ gov-reporting/ community/
  lib/
    api/                      Mock API — swap for Spring Boot client later
    auth/AuthProvider.tsx     useAuth(): user, login, register, logout
    i18n/                     useLocale(): t (strings), tx (bilingual values), setLocale
    mock/                     Seed data: data.ts (users, hotlines), locations.ts,
                              lost-found.ts, emergency.ts, gov-reporting.ts, community.ts
  types/                      Shared types — mirror these in Spring Boot DTOs
```

## Design tokens

Palette "Royal Angkor", defined in `src/app/globals.css`. Use them as Tailwind
classes: `bg-primary`, `text-ink-muted`, `border-line`, `bg-fixed-tint`, etc.

| Token | Hex | Use |
|---|---|---|
| `primary` | `#032EA1` | Cambodian flag blue. Main buttons, header, links |
| `primary-hover` / `primary-tint` | `#1E47B5` / `#EAF0FC` | Hover, selected backgrounds |
| `gold` | `#C99A2E` | Angkor gold. **Decoration only** (borders, focus ring); too light for text |
| `gold-ink` / `gold-tint` | `#8A6512` / `#FBF4E2` | Gold text / gold background |
| `danger` | `#C8102E` | **Emergency / SOS / HIGH urgency only** |
| `danger-ink` / `danger-tint` | `#8F0B21` / `#FDECEE` | Error text / alert background |
| `reported` (+`-ink`, `-tint`) | `#C2410C` | Status: reported |
| `progress` (+`-ink`, `-tint`) | `#F2B01E` | Status: assigned / in progress |
| `fixed` (+`-ink`, `-tint`) | `#157347` | Status: fixed / returned |
| `rejected` | `#7A7468` | Status: rejected / expired |
| `sand` | `#FAF8F4` | Page background |
| `surface` | `#FFFFFF` | Cards |
| `line` | `#E6E0D6` | Borders |
| `ink` / `ink-muted` | `#1C1A17` / `#6B6457` | Text / secondary text |

Rules:
- All text pairs meet WCAG AA (4.5:1).
- Always show status with an **icon and a label**, not color alone.
- Red means emergency. Don't use `danger` for normal buttons.
- Khmer needs room: body `line-height` is 1.7. Don't use thin or light-grey body text.
- Light mode only for now.

## Language

Khmer is the default; English is the second language.

```tsx
const { t, tx, locale, setLocale } = useLocale();
t.login;                  // string from src/lib/i18n/dictionary.ts
tx({ km: "…", en: "…" }); // bilingual value from data
```

Add every new string to **both** `km` and `en` in `dictionary.ts` (TypeScript
enforces matching keys).

## Mock API

The frontend works without a backend. Data is kept in memory and saved to
`localStorage`, so it survives reloads.

```ts
import { api, ApiError } from "@/lib/api";

await api.login({ identifier: "012000001", password: "demo1234" }); // or "dara@example.com" or "dara"
await api.gr.listPublicReports({ category: ["WASTE"] });        // Government reporting
await api.gr.createReport({ category: "DRAINAGE_FLOODING", title, description, location, locationSource: "GPS", provinceId, cityId });
await api.lf.listPosts({ provinceId: "siem-reap", q: "bag" });   // Lost & Found
await api.lf.claimPost("lf-2", { description: "…", answer: "…" });
await api.cs.listPlaces({ type: ["SANGKAT_OFFICE"], openNow: true }); // Community & Services
await api.cs.listPosts({ upcomingEvents: true });
await api.em.sendSos({ type: "MEDICAL", location, locationSource: "GPS", provinceId, cityId }); // Emergency
await api.em.nearbyServices(location, { type: ["HOSPITAL"] });
```

- Errors throw `ApiError` with `code` (`VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`,
  `NOT_FOUND`, `CONFLICT`, `LIMIT`) and optional `field`.
- Reset to seed data: `localStorage.clear()` in the browser console, then reload.
- When the Spring Boot API is ready, add a real client in `src/lib/api/` with the
  same function names and switch in `src/lib/api/index.ts`.

### Demo accounts

Password for all: `demo1234`. Log in with the phone, the email (`<username>@example.com`, citizen 012000001 is `dara@example.com`) or the username.

| Phone | Role | Location |
|---|---|---|
| 012000001 | Citizen | Tuol Kouk, Phnom Penh |
| 012000002 | Officer (local official) | Tuol Kouk, Phnom Penh |
| 012000003 | Admin | Doun Penh, Phnom Penh |
| 012000004 | Citizen | Chamkar Mon, Phnom Penh |
| 012000005 | Citizen | Sen Sok, Phnom Penh |
| 012000006 | Officer (local official) | Chamkar Mon, Phnom Penh |
| 012000007 | Citizen | Siem Reap |
| 012000008 | Citizen | Battambang |
| 012000009 | Citizen | Sen Sok, Phnom Penh |
| 012000010 | Organization: Phnom Penh Municipal Police | Doun Penh |
| 012000011 | Organization: Calmette Hospital ER | Doun Penh |
| 012000012 | Organization: Phnom Penh Fire Department | Prampir Makara |
| 012000013 | News reporter (Demo News Cambodia) | Doun Penh |
| 012000014 | Organization: 119 ambulance dispatch | Doun Penh |
| 012000015 | Department staff: Road Maintenance | Phnom Penh |
| 012000016 | Department staff: Drainage | Phnom Penh |
| 012000017 | Department staff: Waste Management | Phnom Penh |

Each feature spec in `docs/features/` says which account is useful for which demo step.

## Conventions

- Put components that use hooks or `localStorage` in files starting with `"use client"`.
- Import with the `@/` alias (`@/lib/api`, `@/types`).
- Never show National ID numbers or document photos publicly (see Lost & Found safety rules).
- Emergency screens show the hotline call button before anything else.
- New feature data follows the same pattern: `src/types/<feature>.ts`, `src/lib/mock/<feature>.ts`,
  `src/lib/api/<feature>-api.ts` (namespace in `src/lib/api/index.ts`), `scripts/test/<feature>.test.mjs`.
