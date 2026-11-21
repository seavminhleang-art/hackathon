# Government Reporting System — Core Feature 3

_Status: foundation built (types, mock data, mock API, tests). Screens not built yet._
_Spec written by the Government Reporting feature owner; integrated and reconciled with the other features._

**Goal:** manage the full public-issue lifecycle, not just CRUD:
**Citizen reports → Admin reviews → Department assignment → Staff resolves → Admin verifies → Report closes.**
Focus: transparency, accountability, efficient issue management, citizen participation.

| Code | Path |
|---|---|
| Types | `src/types/gov-reporting.ts` (`Gr*`) |
| Seed data | `src/lib/mock/gov-reporting.ts` (categories, departments, 15 reports, comments) |
| Mock API | `src/lib/api/gov-reporting-api.ts` (used as `api.gr.*`) |
| Tests | `scripts/test/gov-reporting.test.mjs` (`npm run test:mock gov`) |

## Scope
**In:** civic problems: damaged roads, waste, drainage and flooding streets, public
lighting, water issues, public infrastructure (parks, sidewalks, benches, fallen trees).

**Out → Emergency (feature 2, `api.em`):** road crashes, fire, crime, medical, people in
danger (e.g. trapped by a flood). The create-report screen should link to SOS for those.

## Roles (`Role`)

| Role | Can do |
|---|---|
| Visitor | Public feed and map (approved reports only), report details, public comments |
| `CITIZEN` | Create reports, edit/cancel eligible ones, answer info requests, support and confirm reports, comment on own reports, request reopening |
| `ADMIN` | Review, request info, approve + assign (hybrid routing), reassign, reject, mark duplicate, change category, set priority, verify + close, send back, internal notes, dashboard |
| `DEPARTMENT_STAFF` (user has `departmentId`) | See own department's tasks, accept, start work, progress updates (with repair photos), mark RESOLVED, comment and internal notes on own department's reports |

`OFFICER` is not used here. It's the local government official role used by Community & Services.

## Categories → departments (hybrid routing)

| Category | Suggested department type | Examples |
|---|---|---|
| ROAD_TRANSPORT | ROAD_MAINTENANCE | Potholes, damaged roads, traffic lights, signs |
| WASTE | WASTE_MANAGEMENT | Overflowing rubbish, missing bins, illegal dumping |
| DRAINAGE_FLOODING | DRAINAGE | Blocked drains, broken covers, standing water |
| PUBLIC_LIGHTING | PUBLIC_LIGHTING | Broken streetlights |
| WATER | WATER_MANAGEMENT | Leaking pipes, no supply |
| PUBLIC_INFRASTRUCTURE | PUBLIC_PARKS | Parks, sidewalks, benches, fallen trees |
| OTHER | — (admin picks) | |

`suggestDepartment(category, provinceId, cityId)` returns the department of that type
covering the area. `approveAndAssign` uses it unless the admin picks another.
Departments are per province (Phnom Penh: all 6; Siem Reap: road + waste in the mock).

## Status workflow

```
SUBMITTED → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
     │            │                                     │          │
     │            ├─► NEED_MORE_INFO ─(citizen answers)─┘          │
     │            ├─► REJECTED (reason)          RESOLVED ─(admin sends back)─► IN_PROGRESS
     │            └─► DUPLICATE (of original)    RESOLVED / CLOSED ─(citizen)─► REOPENED ─(admin)─► ASSIGNED or CLOSED
     └─► CANCELLED (citizen, before assignment)
```

| Transition | Who | Function | Notes |
|---|---|---|---|
| → SUBMITTED | Citizen | `createReport` | Gets a unique code `RPT-YYYY-NNNNN` |
| SUBMITTED → UNDER_REVIEW | Admin | `startReview` | |
| SUBMITTED/UNDER_REVIEW → NEED_MORE_INFO | Admin | `requestInfo(question)` | Question is also a public comment |
| NEED_MORE_INFO → UNDER_REVIEW | Citizen | `respondToInfoRequest({ message, photos })` | |
| review states / REOPENED → ASSIGNED | Admin | `approveAndAssign({ departmentId?, priority? })` | Sets `assignedAt` and `dueAt` |
| ASSIGNED/IN_PROGRESS → ASSIGNED | Admin | `reassign(departmentId)` | Resets acceptance and due date |
| review states → REJECTED | Admin | `rejectReport(reason)` | Reason required |
| review states → DUPLICATE | Admin | `markDuplicate(originalId)` | Reporter + supporters move to the original |
| ASSIGNED → (accepted) | Staff | `acceptTask` | Status stays ASSIGNED |
| ASSIGNED → IN_PROGRESS | Staff | `startWork(note?)` | Auto-accepts if needed |
| IN_PROGRESS → RESOLVED | Staff | `resolveReport({ note, photos })` | Note required. "Department says fixed" |
| RESOLVED → CLOSED | Admin | `closeReport(note?)` | "Admin verified" |
| RESOLVED → IN_PROGRESS | Admin | `sendBack(reason)` | Fix not accepted |
| RESOLVED/CLOSED → REOPENED | Citizen (owner) | `requestReopen(reason)` | Within 30 days, max 2 times |
| REOPENED → CLOSED | Admin | `closeReport(note)` | Note required |
| SUBMITTED/UNDER_REVIEW/NEED_MORE_INFO → CANCELLED | Citizen (owner) | `cancelReport(reason?)` | |

Every action writes a history entry `{ action, from, to, by, byRole, note, internal, at }`.
`GrReportView.can` tells the UI which buttons to show for the current viewer.

## Priority (4 levels) and overdue

| Priority | Meaning | Resolve within (after assignment) |
|---|---|---|
| CRITICAL | Immediate safety risk (e.g. open drain hole) | 1 day |
| HIGH | Serious, urgent | 3 days |
| MEDIUM | Normal (default) | 7 days |
| LOW | Minor | 14 days |

Only admins change priority (`setPriority`, or in `approveAndAssign`); `dueAt` is
recalculated. **Overdue** = past `dueAt` while ASSIGNED, IN_PROGRESS or REOPENED.

## Photos and location
- Evidence photos: JPG / PNG / WebP, max **5 MB** each, max **5** per report. `updateReport({ photos })` replaces them (remove/replace).
- Staff repair photos (`kind: "REPAIR"`) are separate and don't count toward the 5.
- The mock stores `{ url, mimeType, sizeBytes }`; the UI must compress and upload, then pass the URL.
- Location: `location { lat, lng }` + `locationSource: GPS | MAP` + province/city. GPS needs permission and HTTPS; map pin is the fallback.

## Public reports, support, duplicates
- **Public feed/map** (`listPublicReports`): only ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED, REOPENED (= reports an admin approved). Filters: keyword, category, status, priority, province, city, date range, nearest first.
- Public view never includes the reporter's identity, internal notes, or internal history. Nobody's phone, email or ID is ever returned.
- **Support** (`supportReport`): one per account, not your own, open reports only. **Confirm** (`confirmIssue(stillExists)`): latest answer per user.
- **Duplicate detection** (`findPossibleDuplicates`): same category, within 200 m, last 30 days, similar words. Show these on the create screen so the citizen can support instead. Admin makes the final call with `markDuplicate`.

## Comments and notifications
- Reporter, admins and the assigned department can comment. Other citizens use support/confirm.
- `internal: true` notes: admins and assigned staff only.
- Comments show a role and a label ("Reporter" for the citizen; name for staff/admin).
- In-app notifications (`GR_*` types): submitted, approved, rejected, info requested, assigned, new task (staff), work started, resolved, closed, reopened, duplicate, comment.

## Admin dashboard (`dashboard()`)
Total, pending review, need more info, assigned, in progress, resolved, closed, rejected,
overdue · by status / category / city · resolution rate (closed ÷ valid reports) ·
average resolution time (submitted → closed) · per-department assigned / in progress /
resolved / closed / overdue / average hours.

## Validation & security (enforced in the mock; the backend must do the same)
Title 5–120 and description 10–2000 chars · category and location required · photo type
and size · unique report code · only the owner edits/cancels eligible reports · only
admins assign, change priority, reject, close · staff only touch their department's
reports · history is append-only.

## Mock data (for the demo)
Password for every account: `demo1234`.

| Phone | Account | Useful for |
|---|---|---|
| 012000001 | Citizen, Tuol Kouk | Owns gr-1 (closed), gr-7 (in progress), gr-8 (rejected), gr-9 (resolved, waiting to close), gr-11 (closed) |
| 012000004 | Citizen, Chamkar Mon | Owns gr-2 (assigned), gr-5 (in progress, **overdue**), gr-14 (cancelled) |
| 012000005 | Citizen, Sen Sok | Owns gr-3 (submitted), gr-4 (under review), gr-6 (**need more info**), gr-10 (**reopened**), gr-13 |
| 012000003 | Admin | Review queue, assign, close gr-9, handle reopened gr-10, dashboard |
| 012000015 | Staff, Road Maintenance | gr-7 in progress |
| 012000016 | Staff, Drainage | gr-5 (overdue), gr-9 (resolved) |
| 012000017 | Staff, Waste Management | gr-2 new task |

Also: gr-12 duplicate of gr-5, gr-15 submitted in Siem Reap.

## Screens (to build)

| Page | Route idea | Phase |
|---|---|---|
| Create report | `/report/new` | 1 |
| My reports | `/me/reports` | 1 |
| Report detail (timeline, comments, actions from `can`) | `/reports/[code]` | 1 |
| Admin report management + review | `/admin/reports`, `/admin/reports/[code]` | 1 |
| Department task dashboard | `/staff/tasks` | 1 |
| Notifications | `/notifications` (shared) | 1 |
| Public reports + map | `/reports`, `/reports/map` | 2 |
| Admin statistics | `/admin/stats` | 2 |

## Development phases (from the spec)
- **Phase 1 – MVP:** create, categories, photos, GPS/map, my reports, details, status tracking, admin review, approve/reject, department assignment, staff tasks, resolve and close, basic notifications. **All supported by the mock API.**
- **Phase 2:** public feed, map, search/filters, priority, support, duplicate detection, comments + history, statistics. **Also supported by the mock API** (screens to build).
- **Phase 3:** automatic routing (no admin confirm), AI categorization and priority, overdue alerts, push notifications, heatmap, real government integration.

## Decisions made while integrating
1. Added **CANCELLED** status (the spec allows cancel but had no status for it).
2. "Approve" and "assign" are one admin action (`approveAndAssign`), using the suggested department by default.
3. "Accept task" keeps status ASSIGNED and records `acceptedBy`; "start work" moves to IN_PROGRESS.
4. Admins can **send back** a RESOLVED report to IN_PROGRESS when the fix isn't good enough.
5. **Reopen** goes straight to REOPENED (owner only, 30 days, max 2). The admin then reassigns or closes with a note.
6. Public feed shows **approved reports only** (not SUBMITTED / UNDER_REVIEW / NEED_MORE_INFO).
7. Only the reporter, admins and the assigned department comment; other citizens support/confirm.
8. Due dates by priority (1 / 3 / 7 / 14 days) define "overdue".
9. New role `DEPARTMENT_STAFF` (with `departmentId`). The old simple flow (`REPORTED → FIXED`, officers fixing reports) was replaced.

## Open questions for the feature owner
- Are the SLA days per priority right?
- Should other citizens be able to comment publicly (with report-and-hide like Community)?
- Should departments be split by khan (coverage) in Phnom Penh?
