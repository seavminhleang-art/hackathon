# Lost & Found Community — Core Feature 1

A national lost-and-found system for Cambodia (all 25 provinces). One place to
post anything lost or found, with ownership proven by a secret detail instead
of an admin.

**Process in one line:** finder posts with a secret detail → owner claims →
finder approves → they meet at the pickup place → finder marks Returned.

**Key rule:** comments only help *find* the item. Ownership is decided only by
Claim → Approve → Returned.

| Code | Path |
|---|---|
| Types | `src/types/lost-found.ts` |
| Seed data | `src/lib/mock/lost-found.ts`, `src/lib/mock/locations.ts` |
| Mock API | `src/lib/api/lost-found-api.ts` (used as `api.lf.*`) |
| Tests | `scripts/test/lost-found.test.mjs` (`npm run test:mock lost-found`) |

---

## Roles

| Role | Main actions |
|---|---|
| Visitor | Search and view public posts and comments |
| Logged-in user | Post, comment, report sightings, claim, report abuse |
| Finder (post owner) | See claims next to the secret, approve or reject, set pickup, mark Returned, delete comments on own post, renew or delete own post |

For a **LOST** post the "post owner" is the person who lost the item. LOST posts
are not claimed. People help with comments and sightings, and matching FOUND
posts are suggested.

---

## Status flow

```
            claim              approve            mark returned
POSTED ───────────► CLAIM_PENDING ───────► APPROVED ───────────► RETURNED
  ▲                     │
  └──── reject (if no ──┘
        other pending)

POSTED ── 60 days, no claim ──► EXPIRED ── owner renews ──► POSTED
```

| Post status | Meaning | Listed by default |
|---|---|---|
| `POSTED` | Open | Yes |
| `CLAIM_PENDING` | At least one claim waiting for the finder | Yes |
| `APPROVED` | Finder accepted one claim, handover in progress | Yes |
| `RETURNED` | Handover done (or LOST item recovered) | No (`includeClosed`) |
| `EXPIRED` | 60 days without a claim | No (`includeClosed`) |

| Claim status | Meaning |
|---|---|
| `PENDING` | Waiting for the finder |
| `APPROVED` | Accepted. Contacts and pickup are now shared |
| `REJECTED` | Declined (counts toward the 3-try limit) |
| `COMPLETED` | Post marked Returned |

---

## The 10 core features

### 1. Post Lost or Found item
Fields: kind (LOST/FOUND), category, title, description, photos, **province**,
**city**, place (free text), approximate map pin, date lost/found.

Rules:
- City must belong to the chosen province.
- Date can't be in the future.
- The map pin is rounded to ~100 m, so the exact spot is never shown.
- **Sensitive categories** (National ID, Passport, Driving license, Bank card,
  Documents): photos are never shown publicly, and the title or description
  can't contain 6+ digit numbers (ID or card numbers).

API: `createPost`, `myPosts`, `getPost`, `getMyPost` (owner, with secret), `deletePost`, `renewPost`.

### 2. Secret detail
FOUND posts **must** include a secret: an optional **question** shown to claimants
("What color is the keychain?") and a hidden **answer** only the finder sees.
It proves ownership without an admin.

### 3. Claim
A logged-in user who thinks a FOUND item is theirs describes it (min 10 chars)
and answers the question if there is one.
- Can't claim your own post, closed posts or LOST posts.
- One pending claim per user per post.

API: `claimPost`, `myClaims`.

### 4. Approve or Reject
The finder sees each claim **side by side with the secret answer** and decides.
- **Approve**: claim becomes APPROVED and the post becomes APPROVED. All other
  pending claims are auto-rejected ("Another claim was approved").
- **Reject**: optional reason. The post goes back to POSTED if no claim is still pending.

API: `listClaimsForPost` (finder only), `approveClaim`, `rejectClaim`.

### 5. Pickup
After approval the finder sets a **pickup place and time** (must be in the
future; suggest a sangkat office or police post) plus an optional note. After
the handover, the finder marks the post **Returned**. No live tracking.

API: `setPickup`, `markReturned`.

### 6. Community comments
Logged-in users add a **comment** or a **sighting** ("I saw this", with place and
optional pin). The post owner can delete any comment on their post, and authors
can delete their own. Comments can't change ownership.

API: `listComments`, `addComment`, `deleteComment`.

### 7. Search, filter, province and city
Filter by keyword (title, description, place, category name in Khmer or
English), kind, category, province, city and date range. Results show **the
viewer's own city first**, then their province, then everything else, newest first.

API: `listPosts(filter)`.

### 8. Match suggestions
For a post, the system finds posts of the **opposite kind** in the **same
category** and **same province**, with event dates within 14 days.

| Signal | Points |
|---|---|
| Same category (required) | 30 |
| Same city / else same province | 25 / 10 |
| Within 5 km | 20 |
| Dates ≤ 3 days apart / ≤ 14 days | 20 / 10 |
| Shared keywords | 5 each, max 15 |

Shown when score ≥ 50, top 5. When a new post is created, owners of matching
posts are notified.

API: `matchesForPost`, `myMatches`.

### 9. Notifications
In-app alerts (notification `type`):

| Type | Sent to | When |
|---|---|---|
| `LF_CLAIM_RECEIVED` | Finder | New claim |
| `LF_CLAIM_APPROVED` | Claimant | Approved |
| `LF_CLAIM_REJECTED` | Claimant | Rejected (includes tries left) |
| `LF_PICKUP_SET` | Claimant | Pickup set or changed |
| `LF_RETURNED` | Claimant | Marked Returned |
| `LF_COMMENT` / `LF_SIGHTING` | Post owner | New comment or sighting |
| `LF_MATCH` | Both post owners | Possible match found |
| `LF_POST_HIDDEN` | Content owner | Auto-hidden after reports |

API: `myNotifications`, `unreadCount`, `markNotificationRead` (shared with the rest of the app).

### 10. Safety rules
Values live in `LF_RULES` (`src/types/lost-found.ts`).

| Rule | Value |
|---|---|
| Wrong-claim limit per user per post | 3 rejected claims, then blocked (`LIMIT` error) |
| Report and auto-hide | Hidden after 3 distinct users report a post or comment |
| Private details hidden until approval | Secret answer: finder only. Finder and claimant phone numbers: only after approval. Sensitive photos: never public |
| Post expiry | 60 days after posting if still unclaimed (owner can renew) |
| No deleting mid-handover | Can't delete an APPROVED post |

---

## Mock data (for the demo)

Password for every demo account: `demo1234`.

| Phone | Name | City | Useful for |
|---|---|---|---|
| 012000001 | សុខ ដារ៉ា | Tuol Kouk, PP | Has a pending claim on the found ID (lf-1); lost a wallet (lf-4) |
| 012000004 | លី ស្រីពៅ | Chamkar Mon, PP | Finder of keys (lf-2); approved claim on phone with pickup (lf-5) |
| 012000005 | Kim Sokha | Sen Sok, PP | Finder of the ID (lf-1) with a claim to review |
| 012000009 | ម៉ៅ វិបុល | Sen Sok, PP | Lost keys (lf-3) matching found keys (lf-2) |
| 012000007 | ចាន់ សុផល | Siem Reap | Found backpack (lf-7) with one rejected claim; lost dog in Sihanoukville (lf-10) |
| 012000008 | Vann Rithy | Battambang | Lost passport (lf-8) |

Seed also includes: a RETURNED moto plate (lf-9), an EXPIRED post in Kampot
(lf-11) and an auto-hidden spam post (lf-12).

---

## Future plan (one slide)
Drop-off points network (sangkat offices, police posts), Telegram notifications,
phone verification (OTP), low-data mode, photo matching, QR code stickers for
valuables, national dashboard.

## Suggested slide order
1. Problem: items are lost and rarely returned
2. Solution: one community platform for the whole country
3. Features 1–3: post, secret detail, claim
4. Features 4–5: approve, pickup, Returned
5. Features 6–7: community comments, search by province and city
6. Features 8–9: match suggestions, notifications
7. Feature 10: safety rules
8. Process flow diagram (status flow above)
9. Future plan
10. Conclusion
