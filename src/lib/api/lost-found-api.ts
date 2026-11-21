// Lost & Found Community mock API. Spec: docs/features/lost-and-found.md
//
// Status flow: POSTED -> CLAIM_PENDING -> APPROVED -> RETURNED.
// Rejected claim -> back to POSTED (if no other claim is pending).
// Unclaimed post -> EXPIRED after 60 days.

import type {
  I18nText,
  LfClaim,
  LfClaimForClaimant,
  LfClaimForFinder,
  LfComment,
  LfCommentType,
  LfCreateClaimInput,
  LfCreatePostInput,
  LfMatch,
  LfMatchReason,
  LfPickup,
  LfPost,
  LfPostFilter,
  LfPublicComment,
  LfPublicPost,
  LfReportInput,
  LatLng,
  UserRecord,
} from "@/types";
import { LF_RULES } from "@/types";
import { addDays, LF_CATEGORIES } from "@/lib/mock/lost-found";
import { distanceKm, findCity, findProvince } from "@/lib/mock/locations";
import { ApiError, currentUser, delay, findUser, load, nextId, notify, now, requireUser, save } from "./mock-db";

// ---------- helpers ----------

const isSensitive = (category: LfPost["category"]) =>
  LF_CATEGORIES.find((c) => c.id === category)?.sensitive ?? false;

const categoryLabel = (category: LfPost["category"]): I18nText =>
  LF_CATEGORIES.find((c) => c.id === category)?.label ?? { km: "របស់", en: "item" };

const OPEN_STATUSES: LfPost["status"][] = ["POSTED", "CLAIM_PENDING", "APPROVED"];
const CLAIMABLE: LfPost["status"][] = ["POSTED", "CLAIM_PENDING"];

const roundLoc = (l?: LatLng) => (l ? { lat: +l.lat.toFixed(3), lng: +l.lng.toFixed(3) } : undefined);
const today = () => now().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

/** Posts past their 60-day window with no claim in progress become EXPIRED. */
function refreshExpiry() {
  const t = now();
  let changed = false;
  for (const p of load().lfPosts) {
    if (p.status === "POSTED" && p.expiresAt < t) {
      p.status = "EXPIRED";
      p.updatedAt = t;
      changed = true;
    }
  }
  if (changed) save();
}

function getPostOr404(id: string, viewer?: UserRecord | null): LfPost {
  const p = load().lfPosts.find((x) => x.id === id);
  if (!p || (p.hidden && p.ownerId !== viewer?.id)) throw new ApiError("NOT_FOUND", "Post not found");
  return p;
}

function requireOwner(post: LfPost, user: UserRecord) {
  if (post.ownerId !== user.id) throw new ApiError("FORBIDDEN", "Only the post owner can do this");
}

function toPublicPost(p: LfPost, viewer: UserRecord | null): LfPublicPost {
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars -- drops private fields */
  const { ownerId, secret, reportedBy: _r, photoUrls, ...rest } = p;
  const isMine = viewer?.id === ownerId;
  return {
    ...rest,
    // Photos of ID documents and cards are never public (owner still sees them).
    photoUrls: isSensitive(p.category) && !isMine ? [] : photoUrls,
    secretQuestion: secret?.question,
    hasSecret: !!secret,
    commentCount: load().lfComments.filter((c) => c.postId === p.id && !c.deleted && !c.hidden).length,
    isMine,
  };
}

function contactOf(userId: string) {
  const u = findUser(userId);
  return u ? { fullName: u.fullName, phone: u.phone } : undefined;
}

function wrongClaims(postId: string, userId: string) {
  return load().lfClaims.filter((c) => c.postId === postId && c.claimantId === userId && c.status === "REJECTED").length;
}

const msg = (km: string, en: string): I18nText => ({ km, en });

// ---------- posts (Core features 1, 2, 7, 10) ----------

export async function listPosts(filter: LfPostFilter = {}): Promise<LfPublicPost[]> {
  refreshExpiry();
  const viewer = currentUser();
  const q = filter.q?.trim().toLowerCase();

  const rows = load().lfPosts.filter((p) => {
    if (p.hidden) return false;
    if (!filter.includeClosed && !OPEN_STATUSES.includes(p.status)) return false;
    if (filter.kind && p.kind !== filter.kind) return false;
    if (filter.category?.length && !filter.category.includes(p.category)) return false;
    if (filter.provinceId && p.provinceId !== filter.provinceId) return false;
    if (filter.cityId && p.cityId !== filter.cityId) return false;
    if (filter.dateFrom && p.eventDate < filter.dateFrom) return false;
    if (filter.dateTo && p.eventDate > filter.dateTo) return false;
    if (q) {
      const label = categoryLabel(p.category);
      const hay = `${p.title} ${p.description} ${p.place} ${label.km} ${label.en}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // The viewer's own city first, then their province, then newest.
  const rank = (p: LfPost) => (!viewer ? 2 : p.cityId === viewer.cityId ? 0 : p.provinceId === viewer.provinceId ? 1 : 2);
  rows.sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
  return delay(rows.map((p) => toPublicPost(p, viewer)));
}

export async function getPost(id: string): Promise<LfPublicPost> {
  refreshExpiry();
  const viewer = currentUser();
  return delay(toPublicPost(getPostOr404(id, viewer), viewer));
}

/** Owner-only full view (includes the secret answer). */
export async function getMyPost(id: string): Promise<LfPost> {
  const u = requireUser();
  const p = getPostOr404(id, u);
  requireOwner(p, u);
  return delay(p);
}

export async function myPosts(): Promise<LfPublicPost[]> {
  refreshExpiry();
  const u = requireUser();
  return delay(
    load()
      .lfPosts.filter((p) => p.ownerId === u.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => toPublicPost(p, u)),
  );
}

export async function createPost(input: LfCreatePostInput): Promise<LfPublicPost> {
  const u = requireUser();
  if (!input.title?.trim()) throw new ApiError("VALIDATION", "Title is required", "title");
  if (!input.description?.trim()) throw new ApiError("VALIDATION", "Description is required", "description");
  if (!findProvince(input.provinceId)) throw new ApiError("VALIDATION", "Choose a province", "provinceId");
  if (findCity(input.cityId)?.provinceId !== input.provinceId) throw new ApiError("VALIDATION", "Choose a city", "cityId");
  if (!input.place?.trim()) throw new ApiError("VALIDATION", "Place is required", "place");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate) || input.eventDate > today())
    throw new ApiError("VALIDATION", "Date can't be in the future", "eventDate");
  if (input.kind === "FOUND" && !input.secret?.answer?.trim())
    throw new ApiError("VALIDATION", "Add a secret detail only the owner would know", "secret");
  if (isSensitive(input.category) && /\d{6,}/.test(`${input.title} ${input.description}`))
    throw new ApiError("VALIDATION", "Don't include ID or card numbers", "description");

  const t = now();
  const post: LfPost = {
    id: nextId("lf"),
    kind: input.kind,
    category: input.category,
    title: input.title.trim(),
    description: input.description.trim(),
    photoUrls: input.photoUrls ?? [],
    provinceId: input.provinceId,
    cityId: input.cityId,
    place: input.place.trim(),
    approxLocation: roundLoc(input.approxLocation),
    eventDate: input.eventDate,
    ownerId: u.id,
    secret: input.kind === "FOUND" ? { question: input.secret?.question?.trim() || undefined, answer: input.secret!.answer.trim() } : undefined,
    status: "POSTED",
    reportedBy: [],
    hidden: false,
    createdAt: t,
    updatedAt: t,
    expiresAt: addDays(t, LF_RULES.expiryDays),
  };
  load().lfPosts.unshift(post);

  // Core feature 8 + 9: tell owners of matching posts (and the poster) right away.
  const matches = computeMatches(post);
  for (const m of matches) {
    const other = load().lfPosts.find((p) => p.id === m.post.id);
    if (other && other.ownerId !== u.id) {
      notify({
        userId: other.ownerId,
        type: "LF_MATCH",
        postId: other.id,
        message: msg("មានការប្រកាសថ្មីដែលអាចត្រូវនឹងរបស់អ្នក", "A new post may match yours"),
      });
    }
  }
  if (matches.length) {
    notify({
      userId: u.id,
      type: "LF_MATCH",
      postId: post.id,
      message: msg(`រកឃើញ ${matches.length} ការប្រកាសដែលអាចត្រូវគ្នា`, `${matches.length} possible match(es) found`),
    });
  }
  save();
  return delay(toPublicPost(post, u));
}

/** Owner deletes a post. Not allowed while a handover is in progress. */
export async function deletePost(id: string): Promise<void> {
  const u = requireUser();
  const p = getPostOr404(id, u);
  requireOwner(p, u);
  if (p.status === "APPROVED") throw new ApiError("CONFLICT", "Finish or cancel the handover first");
  const d = load();
  d.lfPosts = d.lfPosts.filter((x) => x.id !== id);
  d.lfClaims = d.lfClaims.filter((c) => c.postId !== id);
  d.lfComments = d.lfComments.filter((c) => c.postId !== id);
  save();
  return delay(undefined);
}

/** Owner extends an expired or open post for another 60 days. */
export async function renewPost(id: string): Promise<LfPublicPost> {
  const u = requireUser();
  const p = getPostOr404(id, u);
  requireOwner(p, u);
  if (p.status !== "POSTED" && p.status !== "EXPIRED") throw new ApiError("CONFLICT", "Only open or expired posts can be renewed");
  const t = now();
  p.status = "POSTED";
  p.expiresAt = addDays(t, LF_RULES.expiryDays);
  p.updatedAt = t;
  save();
  return delay(toPublicPost(p, u));
}

// ---------- claims (Core features 3, 4, 5) ----------

export async function claimPost(postId: string, input: LfCreateClaimInput): Promise<LfClaimForClaimant> {
  refreshExpiry();
  const u = requireUser();
  const post = getPostOr404(postId, u);
  if (post.kind !== "FOUND") throw new ApiError("VALIDATION", "Only found items can be claimed");
  if (post.ownerId === u.id) throw new ApiError("FORBIDDEN", "You can't claim your own post");
  if (!CLAIMABLE.includes(post.status)) throw new ApiError("CONFLICT", "This item can't be claimed now");

  const used = wrongClaims(postId, u.id);
  if (used >= LF_RULES.maxWrongClaims) throw new ApiError("LIMIT", "No claim attempts left for this item");
  if (load().lfClaims.some((c) => c.postId === postId && c.claimantId === u.id && c.status === "PENDING"))
    throw new ApiError("CONFLICT", "You already have a pending claim on this item");
  if (!input.description || input.description.trim().length < 10)
    throw new ApiError("VALIDATION", "Describe the item in more detail", "description");
  if (post.secret?.question && !input.answer?.trim())
    throw new ApiError("VALIDATION", "Answer the finder's question", "answer");

  const claim: LfClaim = {
    id: nextId("lfc"),
    postId,
    claimantId: u.id,
    description: input.description.trim(),
    answer: input.answer?.trim() || undefined,
    status: "PENDING",
    createdAt: now(),
  };
  load().lfClaims.push(claim);
  post.status = "CLAIM_PENDING";
  post.updatedAt = claim.createdAt;
  notify({
    userId: post.ownerId,
    type: "LF_CLAIM_RECEIVED",
    postId,
    claimId: claim.id,
    message: msg(`មានអ្នកទាមទារ "${post.title}"`, `Someone claimed "${post.title}"`),
  });
  save();
  return delay({ ...claim, postTitle: post.title, attemptsLeft: LF_RULES.maxWrongClaims - used });
}

/** Finder view: every claim next to the secret detail. */
export async function listClaimsForPost(postId: string): Promise<LfClaimForFinder[]> {
  const u = requireUser();
  const post = getPostOr404(postId, u);
  requireOwner(post, u);
  return delay(
    load()
      .lfClaims.filter((c) => c.postId === postId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((c) => ({
        ...c,
        claimantName: findUser(c.claimantId)?.fullName ?? "—",
        secret: post.secret,
        claimantContact: c.status === "APPROVED" || c.status === "COMPLETED" ? contactOf(c.claimantId) : undefined,
      })),
  );
}

/** Claimant view of their own claims. Finder contact only after approval. */
export async function myClaims(): Promise<LfClaimForClaimant[]> {
  const u = requireUser();
  const d = load();
  return delay(
    d.lfClaims
      .filter((c) => c.claimantId === u.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((c) => {
        const post = d.lfPosts.find((p) => p.id === c.postId);
        return {
          ...c,
          postTitle: post?.title ?? "—",
          attemptsLeft: LF_RULES.maxWrongClaims - wrongClaims(c.postId, u.id),
          finderContact:
            post && (c.status === "APPROVED" || c.status === "COMPLETED") ? contactOf(post.ownerId) : undefined,
        };
      }),
  );
}

function getClaimAsFinder(claimId: string) {
  const u = requireUser();
  const claim = load().lfClaims.find((c) => c.id === claimId);
  if (!claim) throw new ApiError("NOT_FOUND", "Claim not found");
  const post = getPostOr404(claim.postId, u);
  requireOwner(post, u);
  return { claim, post };
}

export async function approveClaim(claimId: string): Promise<LfClaim> {
  const { claim, post } = getClaimAsFinder(claimId);
  if (claim.status !== "PENDING") throw new ApiError("CONFLICT", "Claim is not pending");
  const t = now();
  claim.status = "APPROVED";
  claim.decidedAt = t;
  post.status = "APPROVED";
  post.updatedAt = t;

  // Only one owner: other pending claims are closed.
  for (const other of load().lfClaims) {
    if (other.postId === post.id && other.id !== claim.id && other.status === "PENDING") {
      other.status = "REJECTED";
      other.rejectReason = "Another claim was approved";
      other.decidedAt = t;
      notify({
        userId: other.claimantId,
        type: "LF_CLAIM_REJECTED",
        postId: post.id,
        claimId: other.id,
        message: msg(`ការទាមទារ "${post.title}" មិនត្រូវបានយល់ព្រម`, `Your claim on "${post.title}" was not approved`),
      });
    }
  }
  notify({
    userId: claim.claimantId,
    type: "LF_CLAIM_APPROVED",
    postId: post.id,
    claimId: claim.id,
    message: msg(`ការទាមទារ "${post.title}" ត្រូវបានយល់ព្រម`, `Your claim on "${post.title}" was approved`),
  });
  save();
  return delay(claim);
}

export async function rejectClaim(claimId: string, reason?: string): Promise<LfClaim> {
  const { claim, post } = getClaimAsFinder(claimId);
  if (claim.status !== "PENDING") throw new ApiError("CONFLICT", "Claim is not pending");
  const t = now();
  claim.status = "REJECTED";
  claim.rejectReason = reason?.trim() || undefined;
  claim.decidedAt = t;
  if (!load().lfClaims.some((c) => c.postId === post.id && c.status === "PENDING")) post.status = "POSTED";
  post.updatedAt = t;
  const left = LF_RULES.maxWrongClaims - wrongClaims(post.id, claim.claimantId);
  notify({
    userId: claim.claimantId,
    type: "LF_CLAIM_REJECTED",
    postId: post.id,
    claimId: claim.id,
    message: msg(
      `ការទាមទារ "${post.title}" មិនត្រូវបានយល់ព្រម (នៅសល់ ${left} ដង)`,
      `Your claim on "${post.title}" was rejected (${left} tries left)`,
    ),
  });
  save();
  return delay(claim);
}

/** Finder sets (or changes) the pickup place and time after approval. */
export async function setPickup(claimId: string, pickup: LfPickup): Promise<LfClaim> {
  const { claim, post } = getClaimAsFinder(claimId);
  if (claim.status !== "APPROVED") throw new ApiError("CONFLICT", "Approve the claim first");
  if (!pickup.place?.trim()) throw new ApiError("VALIDATION", "Pickup place is required", "place");
  if (!pickup.time || Number.isNaN(Date.parse(pickup.time)) || pickup.time < now())
    throw new ApiError("VALIDATION", "Pickup time must be in the future", "time");
  claim.pickup = { place: pickup.place.trim(), time: pickup.time, note: pickup.note?.trim() || undefined };
  notify({
    userId: claim.claimantId,
    type: "LF_PICKUP_SET",
    postId: post.id,
    claimId: claim.id,
    message: msg(`ទីកន្លែងទទួល៖ ${claim.pickup.place}`, `Pickup: ${claim.pickup.place}`),
  });
  save();
  return delay(claim);
}

/**
 * Finder marks the item Returned after the handover.
 * For a LOST post, the owner marks it Returned when they got it back.
 */
export async function markReturned(postId: string): Promise<LfPublicPost> {
  const u = requireUser();
  const post = getPostOr404(postId, u);
  requireOwner(post, u);
  if (post.kind === "FOUND" && post.status !== "APPROVED") throw new ApiError("CONFLICT", "Approve a claim first");
  if (post.kind === "LOST" && !OPEN_STATUSES.includes(post.status)) throw new ApiError("CONFLICT", "Post is closed");
  const t = now();
  post.status = "RETURNED";
  post.updatedAt = t;
  const claim = load().lfClaims.find((c) => c.postId === postId && c.status === "APPROVED");
  if (claim) {
    claim.status = "COMPLETED";
    notify({
      userId: claim.claimantId,
      type: "LF_RETURNED",
      postId,
      claimId: claim.id,
      message: msg(`"${post.title}" ត្រូវបានប្រគល់ជូនរួចរាល់ ✅`, `"${post.title}" was marked returned ✅`),
    });
  }
  save();
  return delay(toPublicPost(post, u));
}

// ---------- comments & sightings (Core feature 6) ----------

export async function listComments(postId: string): Promise<LfPublicComment[]> {
  const viewer = currentUser();
  const post = getPostOr404(postId, viewer);
  return delay(
    load()
      .lfComments.filter((c) => c.postId === postId && !c.deleted && !c.hidden)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((c) => {
        /* eslint-disable-next-line @typescript-eslint/no-unused-vars -- drops private fields */
        const { authorId, reportedBy: _r, ...rest } = c;
        return {
          ...rest,
          authorName: findUser(authorId)?.fullName ?? "—",
          canDelete: !!viewer && (viewer.id === authorId || viewer.id === post.ownerId),
        };
      }),
  );
}

export async function addComment(
  postId: string,
  input: { type: LfCommentType; body: string; sightingPlace?: string; sightingLocation?: LatLng },
): Promise<LfPublicComment> {
  const u = requireUser();
  const post = getPostOr404(postId, u);
  if (!OPEN_STATUSES.includes(post.status)) throw new ApiError("CONFLICT", "This post is closed");
  const body = input.body?.trim() ?? "";
  if (body.length < 2 || body.length > 500) throw new ApiError("VALIDATION", "Comment must be 2–500 characters", "body");
  if (input.type === "SIGHTING" && !input.sightingPlace?.trim())
    throw new ApiError("VALIDATION", "Where did you see it?", "sightingPlace");

  const c: LfComment = {
    id: nextId("lfm"),
    postId,
    authorId: u.id,
    type: input.type,
    body,
    sightingPlace: input.sightingPlace?.trim() || undefined,
    sightingLocation: roundLoc(input.sightingLocation),
    reportedBy: [],
    hidden: false,
    deleted: false,
    createdAt: now(),
  };
  load().lfComments.push(c);
  if (post.ownerId !== u.id) {
    notify({
      userId: post.ownerId,
      type: input.type === "SIGHTING" ? "LF_SIGHTING" : "LF_COMMENT",
      postId,
      message:
        input.type === "SIGHTING"
          ? msg(`មាននរណាម្នាក់បានឃើញ "${post.title}"`, `Someone saw "${post.title}"`)
          : msg(`មតិថ្មីលើ "${post.title}"`, `New comment on "${post.title}"`),
    });
  }
  save();
  return delay({ ...c, authorName: u.fullName, canDelete: true });
}

/** Author, or the post owner, can delete a comment. */
export async function deleteComment(commentId: string): Promise<void> {
  const u = requireUser();
  const c = load().lfComments.find((x) => x.id === commentId);
  if (!c || c.deleted) throw new ApiError("NOT_FOUND", "Comment not found");
  const post = load().lfPosts.find((p) => p.id === c.postId);
  if (c.authorId !== u.id && post?.ownerId !== u.id) throw new ApiError("FORBIDDEN", "Not allowed");
  c.deleted = true;
  save();
  return delay(undefined);
}

// ---------- reporting & auto-hide (Core feature 10) ----------

export async function reportContent(input: LfReportInput): Promise<{ hidden: boolean }> {
  const u = requireUser();
  const d = load();
  const target =
    input.targetType === "POST"
      ? d.lfPosts.find((p) => p.id === input.targetId)
      : d.lfComments.find((c) => c.id === input.targetId);
  if (!target) throw new ApiError("NOT_FOUND", "Not found");
  const ownerId = "ownerId" in target ? target.ownerId : target.authorId;
  if (ownerId === u.id) throw new ApiError("VALIDATION", "You can't report your own content");
  if (!target.reportedBy.includes(u.id)) target.reportedBy.push(u.id);
  if (!target.hidden && target.reportedBy.length >= LF_RULES.autoHideReports) {
    target.hidden = true;
    notify({
      userId: ownerId,
      type: "LF_POST_HIDDEN",
      postId: input.targetType === "POST" ? target.id : (target as LfComment).postId,
      message: msg("មាតិការបស់អ្នកត្រូវបានលាក់ ដោយសារមានការរាយការណ៍ច្រើន", "Your content was hidden after several reports"),
    });
  }
  save();
  return delay({ hidden: target.hidden });
}

// ---------- match suggestions (Core feature 8) ----------

const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 3),
  );

function computeMatches(post: LfPost): LfMatch[] {
  const viewer = currentUser();
  const mine = tokens(`${post.title} ${post.description}`);
  const out: LfMatch[] = [];

  for (const o of load().lfPosts) {
    if (o.id === post.id || o.kind === post.kind || o.hidden) continue;
    if (o.category !== post.category || !CLAIMABLE.includes(o.status)) continue;
    if (o.provinceId !== post.provinceId) continue;
    const days = daysBetween(o.eventDate, post.eventDate);
    if (days > LF_RULES.matchMaxDays) continue;

    const reasons: LfMatchReason[] = ["SAME_CATEGORY"];
    let score = 30;
    if (o.cityId === post.cityId) {
      score += 25;
      reasons.push("SAME_CITY");
    } else {
      score += 10;
      reasons.push("SAME_PROVINCE");
    }
    if (o.approxLocation && post.approxLocation && distanceKm(o.approxLocation, post.approxLocation) <= LF_RULES.matchNearbyKm) {
      score += 20;
      reasons.push("NEARBY");
    }
    if (days <= 3) {
      score += 20;
      reasons.push("CLOSE_DATE");
    } else {
      score += 10;
    }
    const shared = [...tokens(`${o.title} ${o.description}`)].filter((w) => mine.has(w)).length;
    if (shared) {
      score += Math.min(15, shared * 5);
      reasons.push("KEYWORDS");
    }
    out.push({ post: toPublicPost(o, viewer), score: Math.min(100, score), reasons });
  }
  return out.filter((m) => m.score >= 50).sort((a, b) => b.score - a.score).slice(0, 5);
}

export async function matchesForPost(postId: string): Promise<LfMatch[]> {
  refreshExpiry();
  const post = getPostOr404(postId, currentUser());
  return delay(computeMatches(post));
}

/** Matches for all of the viewer's open posts. */
export async function myMatches(): Promise<{ postId: string; matches: LfMatch[] }[]> {
  refreshExpiry();
  const u = requireUser();
  return delay(
    load()
      .lfPosts.filter((p) => p.ownerId === u.id && CLAIMABLE.includes(p.status))
      .map((p) => ({ postId: p.id, matches: computeMatches(p) }))
      .filter((x) => x.matches.length),
  );
}

// ---------- reference ----------

export const getCategories = async () => delay(LF_CATEGORIES);
