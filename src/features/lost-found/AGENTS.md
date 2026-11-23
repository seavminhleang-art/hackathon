# AGENTS.md — Feature 1: Lost & Found

AI handoff guide for this feature only. Shared rules (stack, commands, conventions,
cross-feature decisions) are in the root [AGENTS.md](../../../AGENTS.md). Read both.
Full human spec: [docs/features/lost-and-found.md](../../../docs/features/lost-and-found.md).

## What it is
National lost-and-found (all 25 provinces). Finder posts a found item with a
**secret detail**, the owner claims it, the finder approves, they meet at a pickup
place, the finder marks it **Returned**. Comments and sightings only help find
items; ownership is decided only by Claim → Approve → Returned.

## Status
| Part | Status |
|---|---|
| Types, mock data, mock API, tests | Done |
| Screens (this folder) | Browse/list and lost/found post form built; detail and claim flows remain |
| Backend | Not started |

## Files
| What | Path |
|---|---|
| Types (`Lf*`, `LF_RULES`) | `src/types/lost-found.ts` |
| Seed (categories, 12 posts, claims, comments) | `src/lib/mock/lost-found.ts` |
| Mock API (`api.lf.*`) | `src/lib/api/lost-found-api.ts` |
| Tests | `scripts/test/lost-found.test.mjs` → `npm run test:mock lost-found` |
| UI (to build) | `src/features/lost-found/` (components), routes in `src/app/lost-found/` |

## Status flow
```
POSTED → CLAIM_PENDING → APPROVED → RETURNED
   ▲          │ (reject, no other pending claim)
   └──────────┘
POSTED ─(60 days)→ EXPIRED ─(owner renews)→ POSTED
```
Claim: `PENDING → APPROVED → COMPLETED`, or `REJECTED`.

## API cheat sheet
| Need | Call |
|---|---|
| Browse / search (viewer's city first) | `api.lf.listPosts({ q, kind, category, provinceId, cityId, dateFrom, dateTo })` |
| Post details / owner view with secret | `getPost(id)` / `getMyPost(id)` |
| Create, delete, renew | `createPost(input)`, `deletePost(id)`, `renewPost(id)` |
| Claim (owner of item) | `claimPost(postId, { description, answer })`, `myClaims()` |
| Finder reviews | `listClaimsForPost(postId)` (claim next to secret), `approveClaim`, `rejectClaim` |
| Handover | `setPickup(claimId, { place, time, note })`, `markReturned(postId)` |
| Comments / sightings | `listComments`, `addComment(postId, { type: "COMMENT" \| "SIGHTING", body, sightingPlace })`, `deleteComment` |
| Matches | `matchesForPost(postId)`, `myMatches()` |
| Safety | `reportContent({ targetType, targetId, reason })` |

## Rules you must keep
- **Never** show the secret answer to anyone but the post owner.
- Photos of sensitive categories (National ID, passport, licence, bank card, documents) are **never public**; 6+ digit numbers are blocked in their text.
- Phone numbers are shared between finder and claimant **only after approval** (`finderContact` / `claimantContact`).
- Locations are rounded to ~100 m.
- Limits (`LF_RULES`): 3 wrong claims per user per post, auto-hide after 3 reports, 60-day expiry, matches within 14 days and same province.
- Only FOUND posts can be claimed. LOST posts get help via comments, sightings and matches.
- A post can't be deleted while APPROVED (handover in progress).

## Screens to build
| Route | Who | Notes |
|---|---|---|
| `/lost-found` | all | List + filters and lost/found post sheets; available standalone and inside the dashboard workspace |
| `/lost-found/[id]` | all | Details, comments/sightings, matches, claim button |
| `/lost-found/[id]/claim` | citizen | Description + answer the finder's question |
| `/lost-found/mine` | citizen | My posts with claims to review; my claims with pickup info |

Use the shared tokens (`fixed` = returned, `rejected` = expired) and `useLocale().tx()` for bilingual data.

## Demo accounts (password `demo1234`)
012000005 finder of the ID (lf-1, claim to review) · 012000001 claimant of lf-1, lost wallet lf-4 ·
012000004 finder of keys lf-2, approved claim with pickup lf-5 · 012000009 lost keys lf-3 (matches lf-2) ·
012000007 Siem Reap finder lf-7, lost dog lf-10.

## Boundaries
- Notifications use the shared list (`LF_*` types, field `postId` / `claimId`).
- Comments here are separate from Community & Services comments (possible later merge).
- Don't change shared files (`src/types/index.ts`, `mock-db.ts`, `data.ts`) without checking the root AGENTS.md rules.

## Open questions
Hand official IDs to sangkat offices instead of person-to-person? Drop-off points network (future plan).
