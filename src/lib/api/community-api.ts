// Community & Services mock API (used as `api.cs.*`).
// Spec: docs/features/community-services.md
//
// A. Directory   listPlaces, getPlace, getWasteSchedules, suggestEdit, listEditSuggestions, reviewEdit, createPlace, updatePlace
// B. Guides      listGuides, getGuide, toggleGuideHelpful
// C. Announce    listAnnouncements, activeAlerts, getAnnouncement, createAnnouncement, deleteAnnouncement
// D. Board       listPosts, getPost, createPost, deletePost, rsvp, votePoll, acceptAnswer, toggleReaction
//    Comments    listComments, addComment, deleteComment
// E. Groups      listGroups, getGroup, listMembers, createGroup, joinGroup, leaveGroup, setMemberRole, removeMember
//    Safety      reportContent

import type {
  CsAnnouncement,
  CsAnnouncementView,
  CsAuthor,
  CsComment,
  CsCommentTarget,
  CsCommentView,
  CsCreateAnnouncementInput,
  CsCreateGroupInput,
  CsCreatePostInput,
  CsEditField,
  CsEditSuggestion,
  CsGroup,
  CsGroupRole,
  CsGroupView,
  CsGuide,
  CsGuideCategory,
  CsGuideView,
  CsPlace,
  CsPlaceFilter,
  CsPlaceView,
  CsPost,
  CsPostFilter,
  CsPostView,
  CsReaction,
  CsReportInput,
  CsRsvp,
  CsScope,
  CsWasteSchedule,
  I18nText,
  LatLng,
  OpeningHours,
  UserRecord,
  Weekday,
} from "@/types";
import { CS_RULES } from "@/types";
import { CS_PLACE_TYPES, noReactions } from "@/lib/mock/community";
import { distanceKm, findCity, findProvince } from "@/lib/mock/locations";
import { ApiError, currentUser, delay, findUser, load, nextId, notify, now, requireUser, save } from "./mock-db";

// =====================================================================
// Shared helpers
// =====================================================================

const msg = (km: string, en: string): I18nText => ({ km, en });
const isOfficial = (u?: UserRecord | null) => !!u && (u.role === "OFFICER" || u.role === "ADMIN");

function authorOf(userId: string): CsAuthor {
  const u = findUser(userId);
  return {
    id: userId,
    name: u?.fullName ?? "—",
    role: u?.role ?? "CITIZEN",
    official: isOfficial(u),
  };
}

/** Is a place / person (area) inside a scope? */
type Area = { provinceId: string; cityId?: string; sangkat?: string };

function inScope(scope: CsScope, area: Area): boolean {
  switch (scope.level) {
    case "NATIONAL":
      return true;
    case "PROVINCE":
      return scope.provinceId === area.provinceId;
    case "CITY":
      return scope.cityId === area.cityId;
    case "SANGKAT":
      return scope.cityId === area.cityId && !!area.sangkat && norm(scope.sangkat) === norm(area.sangkat);
  }
}

const norm = (s?: string) => (s ?? "").trim().toLowerCase();

function validateScope(scope: CsScope, allowed: CsScope["level"][]) {
  if (!scope || !allowed.includes(scope.level)) throw new ApiError("VALIDATION", "Choose a valid area", "scope");
  if (scope.level === "NATIONAL") return;
  if (!scope.provinceId || !findProvince(scope.provinceId)) throw new ApiError("VALIDATION", "Choose a province", "scope");
  if (scope.level === "PROVINCE") return;
  if (!scope.cityId || findCity(scope.cityId)?.provinceId !== scope.provinceId)
    throw new ApiError("VALIDATION", "Choose a city", "scope");
  if (scope.level === "SANGKAT" && !scope.sangkat?.trim()) throw new ApiError("VALIDATION", "Enter a sangkat", "scope");
}

/** Officers act only inside their own city/khan. Admins act anywhere. */
function requireOfficialFor(scopeOrArea: CsScope | Area): UserRecord {
  const u = requireUser(["OFFICER", "ADMIN"]);
  if (u.role === "ADMIN") return u;
  const cityId = scopeOrArea.cityId;
  const level = "level" in scopeOrArea ? scopeOrArea.level : "CITY";
  if ((level !== "CITY" && level !== "SANGKAT") || cityId !== u.cityId)
    throw new ApiError("FORBIDDEN", "Officers can only act in their own area");
  return u;
}

/** Phone / ID / card numbers are not allowed in resident text (9+ digits, spaces and dashes ignored). */
function assertNoPersonalNumbers(text: string, field: string) {
  const joined = text.replace(/(\d)[\s.-](?=\d)/g, "$1");
  if (/\d{9,}/.test(joined)) throw new ApiError("VALIDATION", "Don't include phone, ID or card numbers", field);
}

function assertText(value: string | undefined, field: string, min: number, max: number) {
  const len = value?.trim().length ?? 0;
  if (len < min || len > max) throw new ApiError("VALIDATION", `Must be ${min}–${max} characters`, field);
}

function toggle(list: string[], id: string): boolean {
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else list.push(id);
  return i < 0;
}

const reactionCounts = (r: Record<CsReaction, string[]>) => ({ LIKE: r.LIKE.length, HELPFUL: r.HELPFUL.length });
const myReactions = (r: Record<CsReaction, string[]>, uid?: string) =>
  uid ? (Object.keys(r) as CsReaction[]).filter((k) => r[k].includes(uid)) : [];

// ---------- opening hours (Cambodia, UTC+7, no DST) ----------

const DAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function cambodiaClock(at = new Date()): { day: Weekday; time: string } {
  const shifted = new Date(at.getTime() + 7 * 3_600_000);
  return { day: DAYS[shifted.getUTCDay()], time: shifted.toISOString().slice(11, 16) };
}

export function isOpenAt(hours: OpeningHours, at = new Date()): boolean {
  const { day, time } = cambodiaClock(at);
  return hours[day].some((r) => time >= r.open && time < r.close);
}

// =====================================================================
// A. Service directory
// =====================================================================

function placeView(p: CsPlace, near?: LatLng): CsPlaceView {
  return {
    ...p,
    openNow: isOpenAt(p.hours),
    distanceKm: near ? Math.round(distanceKm(near, p.location) * 10) / 10 : undefined,
  };
}

export async function listPlaces(filter: CsPlaceFilter = {}): Promise<CsPlaceView[]> {
  const viewer = currentUser();
  const q = norm(filter.q);
  let rows = load()
    .csPlaces.filter(
      (p) =>
        (!filter.type?.length || filter.type.includes(p.type)) &&
        (!filter.provinceId || p.provinceId === filter.provinceId) &&
        (!filter.cityId || p.cityId === filter.cityId) &&
        (!q || `${p.name.km} ${p.name.en} ${p.address} ${p.sangkat ?? ""}`.toLowerCase().includes(q)),
    )
    .map((p) => placeView(p, filter.near));
  if (filter.openNow) rows = rows.filter((p) => p.openNow);

  if (filter.near) rows.sort((a, b) => a.distanceKm! - b.distanceKm!);
  else {
    const rank = (p: CsPlace) => (!viewer ? 2 : p.cityId === viewer.cityId ? 0 : p.provinceId === viewer.provinceId ? 1 : 2);
    rows.sort((a, b) => rank(a) - rank(b) || a.name.en.localeCompare(b.name.en));
  }
  return delay(rows);
}

export async function getPlace(id: string): Promise<CsPlaceView> {
  const p = load().csPlaces.find((x) => x.id === id);
  if (!p) throw new ApiError("NOT_FOUND", "Place not found");
  return delay(placeView(p));
}

export async function getWasteSchedules(filter: { provinceId?: string; cityId?: string } = {}): Promise<CsWasteSchedule[]> {
  return delay(
    load().csWaste.filter(
      (w) => (!filter.provinceId || w.provinceId === filter.provinceId) && (!filter.cityId || w.cityId === filter.cityId),
    ),
  );
}

export async function suggestEdit(
  placeId: string,
  input: { field: CsEditField; value: string; note?: string },
): Promise<CsEditSuggestion> {
  const u = requireUser();
  if (!load().csPlaces.some((p) => p.id === placeId)) throw new ApiError("NOT_FOUND", "Place not found");
  assertText(input.value, "value", 1, 300);
  const e: CsEditSuggestion = {
    id: nextId("ed"),
    placeId,
    userId: u.id,
    field: input.field,
    value: input.value.trim(),
    note: input.note?.trim() || undefined,
    status: "PENDING",
    createdAt: now(),
  };
  load().csEdits.push(e);
  save();
  return delay(e);
}

/** Officials see suggestions for places in their area; admins see all. */
export async function listEditSuggestions(status: CsEditSuggestion["status"] = "PENDING"): Promise<CsEditSuggestion[]> {
  const u = requireUser(["OFFICER", "ADMIN"]);
  const d = load();
  return delay(
    d.csEdits.filter((e) => {
      if (e.status !== status) return false;
      if (u.role === "ADMIN") return true;
      return d.csPlaces.find((p) => p.id === e.placeId)?.cityId === u.cityId;
    }),
  );
}

/** Accepting a PHONE or ADDRESS suggestion applies it. Other fields: update the place by hand. */
export async function reviewEdit(id: string, accept: boolean): Promise<CsEditSuggestion> {
  const d = load();
  const e = d.csEdits.find((x) => x.id === id);
  if (!e) throw new ApiError("NOT_FOUND", "Suggestion not found");
  const place = d.csPlaces.find((p) => p.id === e.placeId);
  if (!place) throw new ApiError("NOT_FOUND", "Place not found");
  const u = requireOfficialFor(place);
  if (e.status !== "PENDING") throw new ApiError("CONFLICT", "Already reviewed");

  e.status = accept ? "ACCEPTED" : "DISMISSED";
  e.reviewedBy = u.id;
  e.reviewedAt = now();
  if (accept) {
    if (e.field === "PHONE") place.phone = e.value;
    if (e.field === "ADDRESS") place.address = e.value;
    place.verified = true;
    place.updatedAt = e.reviewedAt;
  }
  notify({
    userId: e.userId,
    type: "CS_EDIT_REVIEWED",
    placeId: place.id,
    message: accept
      ? msg(`អរគុណ! ការកែប្រែ "${place.name.km}" ត្រូវបានទទួលយក`, `Thanks! Your edit to "${place.name.en}" was accepted`)
      : msg(`ការកែប្រែ "${place.name.km}" មិនត្រូវបានទទួលយក`, `Your edit to "${place.name.en}" was not accepted`),
  });
  save();
  return delay(e);
}

export async function createPlace(input: Omit<CsPlace, "id" | "verified" | "updatedAt">): Promise<CsPlaceView> {
  requireOfficialFor(input);
  if (findCity(input.cityId)?.provinceId !== input.provinceId) throw new ApiError("VALIDATION", "Choose a city", "cityId");
  assertText(input.name?.km, "name", 2, 120);
  const p: CsPlace = { ...input, id: nextId("pl"), verified: true, updatedAt: now() };
  load().csPlaces.push(p);
  save();
  return delay(placeView(p));
}

export async function updatePlace(id: string, patch: Partial<Omit<CsPlace, "id" | "provinceId" | "cityId">>): Promise<CsPlaceView> {
  const p = load().csPlaces.find((x) => x.id === id);
  if (!p) throw new ApiError("NOT_FOUND", "Place not found");
  requireOfficialFor(p);
  Object.assign(p, patch, { updatedAt: now(), verified: true });
  save();
  return delay(placeView(p));
}

// =====================================================================
// B. Government service guides
// =====================================================================

function guideView(g: CsGuide, viewer: UserRecord | null): CsGuideView {
   
  const { helpfulBy, ...rest } = g;
  return {
    ...rest,
    helpfulCount: helpfulBy.length,
    markedHelpful: !!viewer && helpfulBy.includes(viewer.id),
    commentCount: countComments("GUIDE", g.id),
  };
}

export async function listGuides(filter: { q?: string; category?: CsGuideCategory } = {}): Promise<CsGuideView[]> {
  const viewer = currentUser();
  const q = norm(filter.q);
  return delay(
    load()
      .csGuides.filter(
        (g) =>
          (!filter.category || g.category === filter.category) &&
          (!q || `${g.title.km} ${g.title.en} ${g.summary.km} ${g.summary.en}`.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.helpfulBy.length - a.helpfulBy.length)
      .map((g) => guideView(g, viewer)),
  );
}

/** Guide plus the places that handle it (viewer's province first). */
export async function getGuide(id: string): Promise<{ guide: CsGuideView; places: CsPlaceView[] }> {
  const viewer = currentUser();
  const g = load().csGuides.find((x) => x.id === id);
  if (!g) throw new ApiError("NOT_FOUND", "Guide not found");
  const places = load()
    .csPlaces.filter((p) => p.guideIds.includes(g.id) || g.whereTypes.includes(p.type))
    .map((p) => placeView(p))
    .sort((a, b) => Number(b.provinceId === viewer?.provinceId) - Number(a.provinceId === viewer?.provinceId));
  return delay({ guide: guideView(g, viewer), places });
}

export async function toggleGuideHelpful(id: string): Promise<CsGuideView> {
  const u = requireUser();
  const g = load().csGuides.find((x) => x.id === id);
  if (!g) throw new ApiError("NOT_FOUND", "Guide not found");
  toggle(g.helpfulBy, u.id);
  save();
  return delay(guideView(g, u));
}

// =====================================================================
// C. Announcements and alerts
// =====================================================================

const LEVEL_RANK = { ALERT: 0, WARNING: 1, INFO: 2 } as const;

const isActive = (a: CsAnnouncement, t = now()) => a.validFrom <= t && (!a.validTo || a.validTo > t);

function announcementView(a: CsAnnouncement): CsAnnouncementView {
   
  const { authorId, ...rest } = a;
  return { ...rest, author: authorOf(authorId), active: isActive(a), commentCount: countComments("ANNOUNCEMENT", a.id) };
}

/**
 * Announcements for an area: the filter's area, else the viewer's area.
 * Visitors with no area see everything active.
 */
export async function listAnnouncements(
  filter: { provinceId?: string; cityId?: string; sangkat?: string; includeExpired?: boolean } = {},
): Promise<CsAnnouncementView[]> {
  const viewer = currentUser();
  const area: Area | null = filter.provinceId
    ? { provinceId: filter.provinceId, cityId: filter.cityId, sangkat: filter.sangkat }
    : viewer
      ? { provinceId: viewer.provinceId, cityId: viewer.cityId, sangkat: viewer.sangkat }
      : null;
  const rows = load().csAnnouncements.filter(
    (a) => (filter.includeExpired || isActive(a)) && (!area || inScope(a.scope, area)),
  );
  rows.sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      LEVEL_RANK[a.level] - LEVEL_RANK[b.level] ||
      b.createdAt.localeCompare(a.createdAt),
  );
  return delay(rows.map(announcementView));
}

/** Active ALERTs for the banner. */
export async function activeAlerts(): Promise<CsAnnouncementView[]> {
  const all = await listAnnouncements();
  return all.filter((a) => a.level === "ALERT");
}

export async function getAnnouncement(id: string): Promise<CsAnnouncementView> {
  const a = load().csAnnouncements.find((x) => x.id === id);
  if (!a) throw new ApiError("NOT_FOUND", "Announcement not found");
  return delay(announcementView(a));
}

/** Officials only, for their own area. ALERT notifies every user in the area. */
export async function createAnnouncement(input: CsCreateAnnouncementInput): Promise<CsAnnouncementView> {
  validateScope(input.scope, ["NATIONAL", "PROVINCE", "CITY", "SANGKAT"]);
  const u = requireOfficialFor(input.scope);
  assertText(input.title?.km, "title", 2, CS_RULES.titleMax);
  assertText(input.body?.km, "body", 2, CS_RULES.bodyMax);
  const t = now();
  if (input.validTo && input.validTo <= (input.validFrom ?? t)) throw new ApiError("VALIDATION", "End must be after start", "validTo");

  const a: CsAnnouncement = {
    id: nextId("an"),
    title: input.title,
    body: input.body,
    level: input.level,
    category: input.category,
    scope: input.scope,
    authorId: u.id,
    imageUrl: input.imageUrl,
    pinned: !!input.pinned,
    commentsEnabled: input.commentsEnabled ?? input.level !== "ALERT",
    validFrom: input.validFrom ?? t,
    validTo: input.validTo,
    incidentId: input.incidentId,
    createdAt: t,
  };
  const d = load();
  d.csAnnouncements.unshift(a);
  if (a.level === "ALERT") {
    for (const user of d.users) {
      if (user.id !== u.id && inScope(a.scope, user)) {
        notify({ userId: user.id, type: "CS_ALERT", announcementId: a.id, message: a.title });
      }
    }
  }
  save();
  return delay(announcementView(a));
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const u = requireUser(["OFFICER", "ADMIN"]);
  const d = load();
  const a = d.csAnnouncements.find((x) => x.id === id);
  if (!a) throw new ApiError("NOT_FOUND", "Announcement not found");
  if (u.role !== "ADMIN" && a.authorId !== u.id) throw new ApiError("FORBIDDEN", "Not allowed");
  d.csAnnouncements = d.csAnnouncements.filter((x) => x.id !== id);
  d.csComments = d.csComments.filter((c) => !(c.targetType === "ANNOUNCEMENT" && c.targetId === id));
  save();
  return delay(undefined);
}

// =====================================================================
// E. Groups (before D: posting checks membership)
// =====================================================================

const memberRole = (groupId: string, userId?: string): CsGroupRole | null =>
  (userId && load().csMembers.find((m) => m.groupId === groupId && m.userId === userId)?.role) || null;

const isGroupMod = (groupId: string | undefined, userId: string) => {
  const r = groupId ? memberRole(groupId, userId) : null;
  return r === "OWNER" || r === "MODERATOR";
};

function groupView(g: CsGroup, viewer: UserRecord | null): CsGroupView {
  const d = load();
  return {
    ...g,
    memberCount: d.csMembers.filter((m) => m.groupId === g.id).length,
    postCount: d.csPosts.filter((p) => p.groupId === g.id && !p.hidden).length,
    myRole: memberRole(g.id, viewer?.id),
  };
}

function getGroupOr404(id: string) {
  const g = load().csGroups.find((x) => x.id === id);
  if (!g) throw new ApiError("NOT_FOUND", "Group not found");
  return g;
}

export async function listGroups(
  filter: { q?: string; kind?: CsGroup["kind"]; provinceId?: string; cityId?: string; mine?: boolean } = {},
): Promise<CsGroupView[]> {
  const viewer = currentUser();
  const q = norm(filter.q);
  const rows = load()
    .csGroups.filter(
      (g) =>
        (!filter.kind || g.kind === filter.kind) &&
        (!filter.provinceId || g.scope.provinceId === filter.provinceId) &&
        (!filter.cityId || g.scope.cityId === filter.cityId) &&
        (!filter.mine || !!memberRole(g.id, viewer?.id)) &&
        (!q || `${g.name.km} ${g.name.en} ${g.description.en}`.toLowerCase().includes(q)),
    )
    .map((g) => groupView(g, viewer));
  const rank = (g: CsGroupView) => (viewer && inScope(g.scope, viewer) ? 0 : 1);
  rows.sort((a, b) => rank(a) - rank(b) || b.memberCount - a.memberCount);
  return delay(rows);
}

export async function getGroup(id: string): Promise<CsGroupView> {
  return delay(groupView(getGroupOr404(id), currentUser()));
}

export async function listMembers(groupId: string): Promise<{ userId: string; name: string; role: CsGroupRole }[]> {
  getGroupOr404(groupId);
  const rank = { OWNER: 0, MODERATOR: 1, MEMBER: 2 } as const;
  return delay(
    load()
      .csMembers.filter((m) => m.groupId === groupId)
      .sort((a, b) => rank[a.role] - rank[b.role])
      .map((m) => ({ userId: m.userId, name: findUser(m.userId)?.fullName ?? "—", role: m.role })),
  );
}

export async function createGroup(input: CsCreateGroupInput): Promise<CsGroupView> {
  const u = requireUser();
  validateScope(input.scope, ["PROVINCE", "CITY", "SANGKAT"]);
  assertText(input.name?.km || input.name?.en, "name", 3, 80);
  assertText(input.description?.km || input.description?.en, "description", 5, 500);
  const g: CsGroup = { ...input, id: nextId("grp"), kind: "INTEREST", createdBy: u.id, createdAt: now() };
  const d = load();
  d.csGroups.push(g);
  d.csMembers.push({ groupId: g.id, userId: u.id, role: "OWNER", joinedAt: g.createdAt });
  save();
  return delay(groupView(g, u));
}

export async function joinGroup(groupId: string): Promise<CsGroupView> {
  const u = requireUser();
  const g = getGroupOr404(groupId);
  if (!memberRole(groupId, u.id)) load().csMembers.push({ groupId, userId: u.id, role: "MEMBER", joinedAt: now() });
  save();
  return delay(groupView(g, u));
}

/** The owner can't leave; they must make someone else owner first (not built yet). */
export async function leaveGroup(groupId: string): Promise<void> {
  const u = requireUser();
  getGroupOr404(groupId);
  const role = memberRole(groupId, u.id);
  if (role === "OWNER") throw new ApiError("CONFLICT", "The owner can't leave the group");
  const d = load();
  d.csMembers = d.csMembers.filter((m) => !(m.groupId === groupId && m.userId === u.id));
  save();
  return delay(undefined);
}

/** Owner promotes or demotes moderators. */
export async function setMemberRole(groupId: string, userId: string, role: "MODERATOR" | "MEMBER"): Promise<void> {
  const u = requireUser();
  if (memberRole(groupId, u.id) !== "OWNER") throw new ApiError("FORBIDDEN", "Only the owner can change roles");
  const m = load().csMembers.find((x) => x.groupId === groupId && x.userId === userId);
  if (!m || m.role === "OWNER") throw new ApiError("NOT_FOUND", "Member not found");
  m.role = role;
  save();
  return delay(undefined);
}

/** Owner or moderator removes a member (not the owner). */
export async function removeMember(groupId: string, userId: string): Promise<void> {
  const u = requireUser();
  if (!isGroupMod(groupId, u.id)) throw new ApiError("FORBIDDEN", "Not allowed");
  if (memberRole(groupId, userId) === "OWNER") throw new ApiError("FORBIDDEN", "Can't remove the owner");
  const d = load();
  d.csMembers = d.csMembers.filter((m) => !(m.groupId === groupId && m.userId === userId));
  save();
  return delay(undefined);
}

// =====================================================================
// D. Community board
// =====================================================================

function canDeletePost(p: CsPost, u: UserRecord | null) {
  return !!u && (p.authorId === u.id || u.role === "ADMIN" || isGroupMod(p.groupId, u.id));
}

function postView(p: CsPost, viewer: UserRecord | null): CsPostView {
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars -- private fields */
  const { authorId, reactions, reportedBy, event, poll, ...rest } = p;
  const uid = viewer?.id;
  const t = now();
  const view: CsPostView = {
    ...rest,
    author: authorOf(authorId),
    reactionCounts: reactionCounts(reactions),
    myReactions: myReactions(reactions, uid),
    commentCount: countComments("POST", p.id),
    groupName: p.groupId ? load().csGroups.find((g) => g.id === p.groupId)?.name : undefined,
    canDelete: canDeletePost(p, viewer),
  };
  if (event) {
    const { going, interested, ...info } = event;
    view.event = {
      ...info,
      goingCount: going.length,
      interestedCount: interested.length,
      myRsvp: uid && going.includes(uid) ? "GOING" : uid && interested.includes(uid) ? "INTERESTED" : null,
      full: !!event.capacity && going.length >= event.capacity,
    };
  }
  if (poll) {
    const closed = poll.closesAt <= t;
    const myVote = (uid && poll.options.find((o) => o.voterIds.includes(uid))?.id) || null;
    const showResults = closed || !!myVote;
    view.poll = {
      closesAt: poll.closesAt,
      closed,
      myVote,
      options: poll.options.map((o) => ({ id: o.id, label: o.label, votes: showResults ? o.voterIds.length : undefined })),
      totalVotes: showResults ? poll.options.reduce((n, o) => n + o.voterIds.length, 0) : undefined,
    };
  }
  return view;
}

function getPostOr404(id: string, viewer: UserRecord | null): CsPost {
  const p = load().csPosts.find((x) => x.id === id);
  if (!p || (p.hidden && p.authorId !== viewer?.id)) throw new ApiError("NOT_FOUND", "Post not found");
  return p;
}

/** Feed: official pinned posts in the viewer's area, then the viewer's area, then newest. */
export async function listPosts(filter: CsPostFilter = {}): Promise<CsPostView[]> {
  const viewer = currentUser();
  const q = norm(filter.q);
  const t = now();
  const rows = load().csPosts.filter(
    (p) =>
      !p.hidden &&
      (!filter.type?.length || filter.type.includes(p.type)) &&
      (!filter.groupId || p.groupId === filter.groupId) &&
      (!filter.provinceId || p.scope.provinceId === filter.provinceId) &&
      (!filter.cityId || p.scope.cityId === filter.cityId) &&
      (!filter.upcomingEvents || (p.type === "EVENT" && !!p.event && p.event.end > t)) &&
      (!q || `${p.title} ${p.body}`.toLowerCase().includes(q)),
  );
  const local = (p: CsPost) => !!viewer && inScope(p.scope, viewer);
  const rank = (p: CsPost) => (p.pinned && local(p) ? 0 : local(p) ? 1 : 2);
  rows.sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
  return delay(rows.map((p) => postView(p, viewer)));
}

export async function getPost(id: string): Promise<CsPostView> {
  const viewer = currentUser();
  return delay(postView(getPostOr404(id, viewer), viewer));
}

export async function createPost(input: CsCreatePostInput): Promise<CsPostView> {
  const u = requireUser();
  validateScope(input.scope, ["CITY", "SANGKAT"]);
  assertText(input.title, "title", 3, CS_RULES.titleMax);
  assertText(input.body, "body", 1, CS_RULES.bodyMax);
  if (!isOfficial(u)) assertNoPersonalNumbers(`${input.title} ${input.body}`, "body");
  if (input.groupId) {
    getGroupOr404(input.groupId);
    if (!memberRole(input.groupId, u.id)) throw new ApiError("FORBIDDEN", "Join the group to post in it");
  }
  if (input.pinned && !isOfficial(u)) throw new ApiError("FORBIDDEN", "Only officials can pin posts");
  if (input.pinned) requireOfficialFor(input.scope);

  const t = now();
  const post: CsPost = {
    id: nextId("cp"),
    type: input.type,
    title: input.title.trim(),
    body: input.body.trim(),
    photoUrls: input.photoUrls ?? [],
    scope: input.scope,
    groupId: input.groupId,
    authorId: u.id,
    pinned: !!input.pinned,
    reactions: noReactions(),
    reportedBy: [],
    hidden: false,
    createdAt: t,
    updatedAt: t,
  };

  if (input.type === "EVENT") {
    const e = input.event;
    if (!e) throw new ApiError("VALIDATION", "Event details are required", "event");
    if (!e.start || !e.end || e.end <= e.start) throw new ApiError("VALIDATION", "End must be after start", "event");
    if (e.end <= t) throw new ApiError("VALIDATION", "Event must be in the future", "event");
    assertText(e.place, "event", 2, 200);
    if (e.capacity !== undefined && e.capacity < 1) throw new ApiError("VALIDATION", "Capacity must be at least 1", "event");
    post.event = { ...e, place: e.place.trim(), going: [u.id], interested: [] };
  }

  if (input.type === "POLL") {
    const opts = (input.poll?.options ?? []).map((o) => o.trim()).filter(Boolean);
    const unique = new Set(opts.map(norm));
    if (opts.length < CS_RULES.pollMinOptions || opts.length > CS_RULES.pollMaxOptions || unique.size !== opts.length)
      throw new ApiError("VALIDATION", `Add ${CS_RULES.pollMinOptions}–${CS_RULES.pollMaxOptions} different options`, "poll");
    if (!input.poll?.closesAt || input.poll.closesAt <= t) throw new ApiError("VALIDATION", "Closing time must be in the future", "poll");
    post.poll = { closesAt: input.poll.closesAt, options: opts.map((label, i) => ({ id: `o${i + 1}`, label, voterIds: [] })) };
  }

  load().csPosts.unshift(post);
  save();
  return delay(postView(post, u));
}

export async function deletePost(id: string): Promise<void> {
  const u = requireUser();
  const p = getPostOr404(id, u);
  if (!canDeletePost(p, u)) throw new ApiError("FORBIDDEN", "Not allowed");
  const d = load();
  d.csPosts = d.csPosts.filter((x) => x.id !== id);
  d.csComments = d.csComments.filter((c) => !(c.targetType === "POST" && c.targetId === id));
  save();
  return delay(undefined);
}

/** RSVP to an event. Pass null to cancel. */
export async function rsvp(postId: string, answer: CsRsvp | null): Promise<CsPostView> {
  const u = requireUser();
  const p = getPostOr404(postId, u);
  const e = p.event;
  if (p.type !== "EVENT" || !e) throw new ApiError("VALIDATION", "Not an event");
  if (e.end <= now()) throw new ApiError("CONFLICT", "This event has ended");
  e.going = e.going.filter((x) => x !== u.id);
  e.interested = e.interested.filter((x) => x !== u.id);
  if (answer === "GOING") {
    if (e.capacity && e.going.length >= e.capacity) throw new ApiError("LIMIT", "This event is full");
    e.going.push(u.id);
  }
  if (answer === "INTERESTED") e.interested.push(u.id);
  save();
  return delay(postView(p, u));
}

/** One vote per user. Votes can't be changed. */
export async function votePoll(postId: string, optionId: string): Promise<CsPostView> {
  const u = requireUser();
  const p = getPostOr404(postId, u);
  if (p.type !== "POLL" || !p.poll) throw new ApiError("VALIDATION", "Not a poll");
  if (p.poll.closesAt <= now()) throw new ApiError("CONFLICT", "This poll is closed");
  if (p.poll.options.some((o) => o.voterIds.includes(u.id))) throw new ApiError("CONFLICT", "You already voted");
  const opt = p.poll.options.find((o) => o.id === optionId);
  if (!opt) throw new ApiError("NOT_FOUND", "Option not found");
  opt.voterIds.push(u.id);
  save();
  return delay(postView(p, u));
}

/** QUESTION author marks one top-level comment as the accepted answer (or null to clear). */
export async function acceptAnswer(postId: string, commentId: string | null): Promise<CsPostView> {
  const u = requireUser();
  const p = getPostOr404(postId, u);
  if (p.type !== "QUESTION") throw new ApiError("VALIDATION", "Not a question");
  if (p.authorId !== u.id) throw new ApiError("FORBIDDEN", "Only the person who asked can accept an answer");
  if (commentId) {
    const c = load().csComments.find(
      (x) => x.id === commentId && x.targetType === "POST" && x.targetId === postId && !x.parentId && !x.deleted,
    );
    if (!c) throw new ApiError("NOT_FOUND", "Answer not found");
    if (c.authorId !== u.id) {
      notify({
        userId: c.authorId,
        type: "CS_ANSWER_ACCEPTED",
        csPostId: postId,
        message: msg("ចម្លើយរបស់អ្នកត្រូវបានជ្រើសរើស", "Your answer was accepted"),
      });
    }
  }
  p.acceptedCommentId = commentId ?? undefined;
  save();
  return delay(postView(p, u));
}

export async function toggleReaction(
  targetType: "POST" | "COMMENT",
  id: string,
  reaction: CsReaction,
): Promise<{ counts: Record<CsReaction, number>; mine: CsReaction[] }> {
  const u = requireUser();
  const target =
    targetType === "POST" ? getPostOr404(id, u) : load().csComments.find((c) => c.id === id && !c.deleted && !c.hidden);
  if (!target) throw new ApiError("NOT_FOUND", "Not found");
  toggle(target.reactions[reaction], u.id);
  save();
  return delay({ counts: reactionCounts(target.reactions), mine: myReactions(target.reactions, u.id) });
}

// =====================================================================
// Comments (board posts, guides, announcements)
// =====================================================================

function countComments(targetType: CsCommentTarget, targetId: string) {
  return load().csComments.filter((c) => c.targetType === targetType && c.targetId === targetId && !c.deleted && !c.hidden)
    .length;
}

/** Throws if the target doesn't exist or doesn't accept comments. Returns the owner and group (if any). */
function commentTarget(targetType: CsCommentTarget, targetId: string, viewer: UserRecord | null) {
  const d = load();
  if (targetType === "POST") {
    const p = getPostOr404(targetId, viewer);
    return { ownerId: p.authorId, groupId: p.groupId, acceptedId: p.acceptedCommentId };
  }
  if (targetType === "GUIDE") {
    if (!d.csGuides.some((g) => g.id === targetId)) throw new ApiError("NOT_FOUND", "Guide not found");
    return { ownerId: undefined, groupId: undefined, acceptedId: undefined };
  }
  const a = d.csAnnouncements.find((x) => x.id === targetId);
  if (!a) throw new ApiError("NOT_FOUND", "Announcement not found");
  return { ownerId: a.authorId, groupId: undefined, acceptedId: undefined, commentsEnabled: a.commentsEnabled };
}

function canDeleteComment(c: CsComment, u: UserRecord | null, ownerId?: string, groupId?: string) {
  return (
    !!u &&
    (c.authorId === u.id ||
      u.role === "ADMIN" ||
      (c.targetType === "POST" && ownerId === u.id) ||
      (c.targetType === "POST" && isGroupMod(groupId, u.id)))
  );
}

/** Threaded: top-level comments (oldest first) with their replies. Official answers first on guides. */
export async function listComments(targetType: CsCommentTarget, targetId: string): Promise<CsCommentView[]> {
  const viewer = currentUser();
  const t = commentTarget(targetType, targetId, viewer);
  const all = load()
    .csComments.filter((c) => c.targetType === targetType && c.targetId === targetId && !c.deleted && !c.hidden)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const toView = (c: CsComment): CsCommentView => {
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars -- private fields */
    const { authorId, reactions, reportedBy, ...rest } = c;
    return {
      ...rest,
      author: authorOf(authorId),
      reactionCounts: reactionCounts(reactions),
      myReactions: myReactions(reactions, viewer?.id),
      accepted: c.id === t.acceptedId,
      canDelete: canDeleteComment(c, viewer, t.ownerId, t.groupId),
      replies: [],
    };
  };

  const top = all.filter((c) => !c.parentId).map(toView);
  for (const reply of all.filter((c) => c.parentId)) top.find((p) => p.id === reply.parentId)?.replies.push(toView(reply));
  // Accepted answer first; then official answers first.
  top.sort((a, b) => Number(b.accepted) - Number(a.accepted) || Number(b.author.official) - Number(a.author.official));
  return delay(top);
}

export async function addComment(
  targetType: CsCommentTarget,
  targetId: string,
  input: { body: string; parentId?: string },
): Promise<CsCommentView> {
  const u = requireUser();
  const t = commentTarget(targetType, targetId, u);
  if ("commentsEnabled" in t && !t.commentsEnabled) throw new ApiError("FORBIDDEN", "Comments are turned off");
  assertText(input.body, "body", 1, CS_RULES.commentMax);
  if (!isOfficial(u)) assertNoPersonalNumbers(input.body, "body");

  const d = load();
  let parent: CsComment | undefined;
  if (input.parentId) {
    parent = d.csComments.find((c) => c.id === input.parentId && c.targetId === targetId && !c.deleted);
    if (!parent) throw new ApiError("NOT_FOUND", "Comment not found");
    if (parent.parentId) throw new ApiError("VALIDATION", "Replies can only go one level deep");
  }

  const c: CsComment = {
    id: nextId("cc"),
    targetType,
    targetId,
    parentId: parent?.id,
    authorId: u.id,
    body: input.body.trim(),
    reactions: noReactions(),
    reportedBy: [],
    hidden: false,
    deleted: false,
    createdAt: now(),
  };
  d.csComments.push(c);

  const link =
    targetType === "POST" ? { csPostId: targetId } : targetType === "GUIDE" ? { guideId: targetId } : { announcementId: targetId };
  if (parent && parent.authorId !== u.id) {
    notify({ userId: parent.authorId, type: "CS_REPLY", ...link, message: msg("មានការឆ្លើយតបមតិរបស់អ្នក", "Someone replied to your comment") });
  }
  if (t.ownerId && t.ownerId !== u.id && t.ownerId !== parent?.authorId) {
    notify({ userId: t.ownerId, type: "CS_COMMENT", ...link, message: msg("មានមតិថ្មីលើការប្រកាសរបស់អ្នក", "New comment on your post") });
  }
  save();
  return delay({
    ...c,
    author: authorOf(u.id),
    reactionCounts: { LIKE: 0, HELPFUL: 0 },
    myReactions: [],
    accepted: false,
    canDelete: true,
    replies: [],
  });
}

export async function deleteComment(id: string): Promise<void> {
  const u = requireUser();
  const c = load().csComments.find((x) => x.id === id && !x.deleted);
  if (!c) throw new ApiError("NOT_FOUND", "Comment not found");
  const t = commentTarget(c.targetType, c.targetId, u);
  if (!canDeleteComment(c, u, t.ownerId, t.groupId)) throw new ApiError("FORBIDDEN", "Not allowed");
  c.deleted = true;
  save();
  return delay(undefined);
}

// =====================================================================
// Safety: report and auto-hide
// =====================================================================

export async function reportContent(input: CsReportInput): Promise<{ hidden: boolean }> {
  const u = requireUser();
  const d = load();
  const target =
    input.targetType === "POST"
      ? d.csPosts.find((p) => p.id === input.targetId)
      : d.csComments.find((c) => c.id === input.targetId && !c.deleted);
  if (!target) throw new ApiError("NOT_FOUND", "Not found");
  if (target.authorId === u.id) throw new ApiError("VALIDATION", "You can't report your own content");
  if (!target.reportedBy.includes(u.id)) target.reportedBy.push(u.id);
  if (!target.hidden && target.reportedBy.length >= CS_RULES.autoHideReports) {
    target.hidden = true;
    notify({
      userId: target.authorId,
      type: "CS_CONTENT_HIDDEN",
      csPostId: input.targetType === "POST" ? target.id : undefined,
      message: msg("មាតិការបស់អ្នកត្រូវបានលាក់ ដោយសារមានការរាយការណ៍ច្រើន", "Your content was hidden after several reports"),
    });
  }
  save();
  return delay({ hidden: target.hidden });
}

// =====================================================================
// Reference data
// =====================================================================

export const getPlaceTypes = async () => delay(CS_PLACE_TYPES);
