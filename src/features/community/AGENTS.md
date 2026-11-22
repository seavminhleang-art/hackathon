# AGENTS.md — Feature 4: Community & Services

AI handoff guide for this feature only. Shared rules (stack, commands, conventions,
cross-feature decisions) are in the root [AGENTS.md](../../../AGENTS.md). Read both.
Full human spec: [docs/features/community-services.md](../../../docs/features/community-services.md).

## What it is
Five parts:
- **A. Service directory:** civic offices and waste pickup.
- **B. Government service guides:** how to get paperwork done.
- **C. Announcements and alerts:** officials only. This is **the app's one alert system**.
- **D. Community board:** discussions, questions, events with RSVP, polls, comments, reactions.
- **E. Community groups:** area groups and interest groups.

## Status
| Part | Status |
|---|---|
| Types, mock data, mock API, tests | Done |
| P0 screens (Board, post detail, new post, News, Services, Guides) | Built on mock API, from `docs/design` Community wireframes |
| Groups | Read-only list at `/community/groups`; group page, join/leave not built (P1) |
| Admin: announcements form, directory edits queue | Not built (P1) |
| P2 items (group post notifications, event reminders, follow an area, ownership transfer) | Not built |

## Files
| What | Path |
|---|---|
| Types (`Cs*`, `CS_RULES`, `OpeningHours`) | `src/types/community.ts` |
| Seed (12 places, waste schedules, 6 guides, 7 announcements, 42 groups, 8 posts, comments) | `src/lib/mock/community.ts` |
| Mock API (`api.cs.*`) | `src/lib/api/community-api.ts` |
| Tests | `scripts/test/community.test.mjs` → `npm run test:mock community` |
| UI | `src/features/community/`: `BoardScreen`, `PostScreen`, `PostCard`, `NewPostScreen`, `NewsScreens` (news list/detail + groups list), `ServicesScreens`, `GuidesScreens`, `Comments` (threads + reactions), `shared` (login gate, report sheet, area names) |
| UI strings | `src/features/community/i18n.ts` → `const { c } = useCs()` (km + en, kept out of the shared dictionary) |
| Routes | `src/app/(app)/community/…`, `announcements/…`, `services/…`, `guides/…` (inside `(app)` so they get the shell). `[id]` pages wrap the screen in `<Suspense>` (needed with `cacheComponents`) |

## API cheat sheet
| Part | Calls |
|---|---|
| A. Directory | `listPlaces({ q, type, provinceId, cityId, openNow, near })`, `getPlace`, `getWasteSchedules`, `suggestEdit`, `listEditSuggestions` / `reviewEdit` / `createPlace` / `updatePlace` (officials) |
| B. Guides | `listGuides({ q, category })`, `getGuide(id)` → `{ guide, places }`, `toggleGuideHelpful` |
| C. Announcements | `listAnnouncements({ provinceId, cityId, sangkat, includeExpired })`, `activeAlerts()` (banner), `getAnnouncement`, `createAnnouncement` / `deleteAnnouncement` (officials) |
| D. Board | `listPosts({ q, type, groupId, provinceId, cityId, upcomingEvents })`, `getPost`, `createPost`, `deletePost`, `rsvp(postId, "GOING" \| "INTERESTED" \| null)`, `votePoll`, `acceptAnswer`, `toggleReaction` |
| Comments | `listComments("POST" \| "GUIDE" \| "ANNOUNCEMENT", id)` (threaded), `addComment(target, id, { body, parentId })`, `deleteComment` |
| E. Groups | `listGroups`, `getGroup`, `listMembers`, `createGroup`, `joinGroup`, `leaveGroup`, `setMemberRole`, `removeMember` |
| Safety | `reportContent({ targetType, targetId, reason })` |
| Helpers | `isOpenAt(hours)`, `cambodiaClock()` (UTC+7), `getPlaceTypes()` |

## Rules you must keep
- **Hospitals and police are NOT here.** They belong to Emergency (`api.em.listServices`). This directory is civic offices only.
- Only `OFFICER` / `ADMIN` create announcements. **Officers only post for their own city/khan**; admins anywhere. ALERT notifies everyone in the area; comments are off on alerts.
- Emergency alerts come in through `api.em.publishAlert` (`announcement.incidentId` set). Show them like any alert; link to the incident when `incidentId` exists.
- Official content shows a verified badge (`author.official`).
- Residents can't post phone / ID / card numbers (9+ digits blocked). Auto-hide after 3 reports.
- Must join a group to post in it. Owner can't leave. Owner/moderators/admin can delete others' posts.
- Poll results hidden until the viewer votes or the poll closes; one vote, no changes.
- Events need a public place. The author is auto "going". RSVP fails when full or ended.
- Guide steps and fees in the seed are **illustrative**; fees are `null` with "check at the office". Always show `lastVerified` and the source.
- Opening hours are evaluated in Cambodia time (UTC+7).

## Screens (P0 built, P1 left)
| Route | Who | Priority |
|---|---|---|
| Alert banner (in shared layout, from `activeAlerts()`) | all | P0 |
| `/services` (directory, map, open now, nearest) | all | P0 |
| `/guides`, `/guides/[id]` (steps, documents, where to go, Q&A) | all | P0 |
| `/announcements`, `/announcements/[id]` | all | P0 |
| `/community` (feed), `/community/posts/[id]`, `/community/new` | all / citizen | P0 |
| `/community/groups`, `/community/groups/[id]` | all / citizen | P1 |
| `/admin/announcements`, `/admin/directory-edits` | officer / admin | P1 |

UI patterns to reuse here: `useLoginGate()` (visitors read everything; actions open a login sheet titled with the action), `<ReportButton>` on every post/comment, `<CommentThread>` for posts, guides and announcements, `openStatus(hours)` for "Closed · opens 07:30 tomorrow".

## Demo accounts (password `demo1234`)
012000001 citizen Tuol Kouk (sees rain alert, owns parents group, voted in poll) · 012000002 officer Tuol Kouk ·
012000006 officer Chamkar Mon · 012000003 admin · 012000004 asked the National ID question ·
012000005 owns Sen Sok clean-up group · 012000007 owns Siem Reap volunteers.

## Boundaries
- Notifications: `CS_*` types, fields `csPostId`, `announcementId`, `groupId`, `placeId`, `guideId`.
- Comments are separate from Lost & Found comments (merging into one shared module is a possible later refactor — coordinate first).
- `OFFICER` is this feature's local official role; Government Reporting uses `DEPARTMENT_STAFF` instead.

## Open questions
Follow an area for INFO/WARNING notifications · private groups · group ownership transfer.
