# AGENTS.md — Feature 3: Government Reporting System

AI handoff guide for this feature only. Shared rules (stack, commands, conventions,
cross-feature decisions) are in the root [AGENTS.md](../../../AGENTS.md). Read both.
Full human spec: [docs/features/gov-reporting.md](../../../docs/features/gov-reporting.md).

## What it is
Citizens report civic problems (roads, waste, drainage, lighting, water, public
infrastructure). Lifecycle: **Citizen reports → Admin reviews → Department
assignment → Staff resolves → Admin verifies → Report closes.** Not a simple CRUD:
transparency, accountability and full history are the point.

## Status
| Part | Status |
|---|---|
| Types, mock data, mock API, tests (phase 1 + phase 2 logic) | Done |
| Citizen screens | Built on the mock API with the shared UI kit and app shell: report form (location + duplicate check inside the form), submitted page, My reports, report detail (timeline, comments, actions from `can`), public feed. Admin, staff and the full map remain |
| Phase 3 (auto routing, AI, push, heatmap) | Not started |

## Files
| What | Path |
|---|---|
| Types (`Gr*`, `GR_RULES`, `GR_PUBLIC_STATUSES`) | `src/types/gov-reporting.ts` |
| Seed (7 categories, 8 departments, 15 reports, comments) | `src/lib/mock/gov-reporting.ts`. Demo photos in `public/mock/gov/` (credits: `public/mock/CREDITS.md`) |
| Mock API (`api.gr.*`) | `src/lib/api/gov-reporting-api.ts` |
| Tests | `scripts/test/gov-reporting.test.mjs` → `npm run test:mock gov` |
| UI | `src/features/gov-reporting/`: `ReportForm` (+ `ReportSubmitted`), `ReportLists` (`MyReports`, `PublicReports`), `ReportDetail`, `meta` (category icons, plain-words status line). Routes in `src/app/(app)/report/…`, `reports/…`, `me/reports` |

## Status flow
```
SUBMITTED → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
side paths: NEED_MORE_INFO, REJECTED, DUPLICATE, REOPENED, CANCELLED
```
- `RESOLVED` = department says fixed. `CLOSED` = admin verified. Never merge them.
- Allowed moves are listed in the spec's transition table and enforced in the API.
- Every report view has `can: GrPermissions` — **drive the UI buttons from it**, don't re-implement permission logic.

## API cheat sheet
| Who | Calls |
|---|---|
| Citizen | `createReport`, `findPossibleDuplicates` (show before submit), `updateReport`, `cancelReport`, `respondToInfoRequest`, `requestReopen`, `myReports`, `getReport(idOrCode)`, `supportReport`, `confirmIssue` |
| Public | `listPublicReports({ q, category, status, priority, provinceId, cityId, dateFrom, dateTo, near })`, `getReport`, `listComments` |
| Admin | `adminListReports`, `startReview`, `requestInfo`, `approveAndAssign({ departmentId?, priority? })`, `reassign`, `rejectReport`, `markDuplicate`, `changeCategory`, `setPriority`, `closeReport`, `sendBack`, `dashboard` |
| Staff | `staffTasks`, `acceptTask`, `startWork`, `addProgress({ note, photos, internal })`, `resolveReport({ note, photos })` |
| Anyone allowed | `addComment(id, { body, internal })` |
| Reference | `listCategories`, `listDepartments`, `suggestDepartment(category, provinceId, cityId)` |

## Rules you must keep
- Public feed shows **approved reports only** (`GR_PUBLIC_STATUSES`). Never show reporter identity, phone, email or ID.
- Internal notes / internal history: admins and the assigned department only.
- Only admins assign, change priority, reject, close. Staff only touch **their department's** reports.
- Photos: JPG/PNG/WebP, ≤ 5 MB, ≤ 5 evidence photos per report (repair photos separate). Compress on the client.
- Title 5–120, description 10–2000, category + location required.
- Priority SLA: CRITICAL 1 day, HIGH 3, MEDIUM 7, LOW 14 → `dueAt`, `overdue`.
- One support per account, not on your own report. Reopen: owner only, 30 days, max 2.
- Emergencies (people in danger, crashes, fire) → link to SOS (`api.em`), don't accept them here.

## Screens to build
| Phase | Page | Route idea | Who |
|---|---|---|---|
| 1 | Create report (location + duplicate suggestions in the same page) ✅ | `/report/new` | citizen |
| 1 | Submission confirmation ✅ | `/report/submitted?code=` | citizen |
| 1 | My reports ✅ | `/me/reports` | citizen |
| 1 | Report detail ✅ (evidence + repair photo gallery; upload in the form is still mocked) | `/reports/[code]` | all |
| 1 | Admin management + review | `/admin/reports`, `/admin/reports/[code]` | admin |
| 1 | Department task dashboard | `/staff/tasks` | staff |
| 1 | Notifications | `/notifications` (shared) | logged in |
| 2 | Public reports feed ✅ (list; map not built) | `/reports` | all |
| 2 | Full public reports map | `/reports/map` | all |
| 2 | Admin statistics | `/admin/stats` | admin |

Status colors: `reported` (submitted/review), `progress` (assigned/in progress), `fixed` (resolved/closed), `rejected` (rejected/duplicate/cancelled). Always icon + label.

## Demo accounts (password `demo1234`)
012000001 citizen (gr-1 closed, gr-7 in progress, gr-9 resolved) · 012000004 citizen (gr-5 overdue) ·
012000005 citizen (gr-6 needs info, gr-10 reopened) · 012000003 admin ·
012000015 road staff · 012000016 drainage staff · 012000017 waste staff.

## Boundaries
- `OFFICER` is **not** used here (it's the Community & Services local official). Workers are `DEPARTMENT_STAFF` with `departmentId`.
- Notifications: `GR_*` types, field `reportId`.
- The admin dashboard folder `src/features/dashboard/admindashboard/` was created by a teammate; coordinate before putting gov-reporting stats there.

## Open questions
SLA days per priority · public comments by other citizens · split Phnom Penh departments by khan.
