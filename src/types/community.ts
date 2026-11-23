// Community & Services (core feature 4). Spec: docs/features/community-services.md
//
// A. Service directory (civic places + waste pickup)  -> CsPlace, CsWasteSchedule
// B. Government service guides                        -> CsGuide
// C. Announcements and alerts (officials only)        -> CsAnnouncement
// D. Community board (posts, events, polls, Q&A)      -> CsPost, CsComment
// E. Community groups                                 -> CsGroup, CsMember
//
// Hospitals and police posts are NOT here: they belong to feature 2 (Emergency).

import type { I18nText, ISODateString, LatLng, Role } from "./index";

// ---------- Area scope (shared) ----------

export type CsScopeLevel = "NATIONAL" | "PROVINCE" | "CITY" | "SANGKAT";

/** Where something applies. Lower levels need the higher ids too. */
export interface CsScope {
  level: CsScopeLevel;
  provinceId?: string;
  cityId?: string;
  sangkat?: string;
}

/** Who wrote something, as shown to readers. */
export interface CsAuthor {
  id: string;
  name: string;
  role: Role;
  /** OFFICER or ADMIN: shown with a verified badge. */
  official: boolean;
}

// ---------- A. Service directory ----------

export type CsPlaceType =
  | "SANGKAT_OFFICE"
  | "KHAN_OFFICE"
  | "PROVINCIAL_HALL"
  | "ONE_WINDOW_OFFICE"
  | "WATER_OFFICE"
  | "ELECTRICITY_OFFICE"
  | "POST_OFFICE"
  | "WASTE_POINT"
  | "PUBLIC_LIBRARY"
  | "COMMUNITY_CENTER"
  | "OTHER";

export interface CsPlaceTypeMeta {
  id: CsPlaceType;
  label: I18nText;
  icon: string;
}

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** "HH:mm" 24h, Cambodia time (UTC+7). Empty array = closed that day. */
export type OpeningHours = Record<Weekday, { open: string; close: string }[]>;

export interface CsPlace {
  id: string;
  type: CsPlaceType;
  name: I18nText;
  provinceId: string;
  cityId: string;
  sangkat?: string;
  address: string;
  location: LatLng;
  phone?: string;
  hours: OpeningHours;
  /** Guides whose paperwork is handled here. */
  guideIds: string[];
  note?: I18nText;
  verified: boolean;
  updatedAt: ISODateString;
}

export interface CsPlaceView extends CsPlace {
  openNow: boolean;
  /** Set when the caller passed a location. */
  distanceKm?: number;
}

export interface CsPlaceFilter {
  q?: string;
  type?: CsPlaceType[];
  provinceId?: string;
  cityId?: string;
  openNow?: boolean;
  /** Sort nearest first when given. */
  near?: LatLng;
}

export interface CsWasteSchedule {
  id: string;
  provinceId: string;
  cityId: string;
  sangkat?: string;
  days: Weekday[];
  timeWindow: { from: string; to: string };
  note?: I18nText;
  collectorPhone?: string;
}

export type CsEditField = "PHONE" | "HOURS" | "ADDRESS" | "LOCATION" | "CLOSED" | "OTHER";
export type CsEditStatus = "PENDING" | "ACCEPTED" | "DISMISSED";

/** Resident suggests a correction to a directory entry. */
export interface CsEditSuggestion {
  id: string;
  placeId: string;
  userId: string;
  field: CsEditField;
  /** Proposed new value, e.g. a phone number or address. */
  value: string;
  note?: string;
  status: CsEditStatus;
  reviewedBy?: string;
  createdAt: ISODateString;
  reviewedAt?: ISODateString;
}

// ---------- B. Government service guides ----------

export type CsGuideCategory =
  | "IDENTITY"
  | "CIVIL_REGISTRATION"
  | "VEHICLE"
  | "BUSINESS"
  | "PROPERTY"
  | "UTILITIES"
  | "SOCIAL";

export interface CsGuideStep {
  title: I18nText;
  detail?: I18nText;
}

export interface CsGuide {
  id: string;
  category: CsGuideCategory;
  title: I18nText;
  summary: I18nText;
  steps: CsGuideStep[];
  requiredDocuments: I18nText[];
  /** Riel. null = free or varies. Always shown with a "verify at office" note. */
  feeRiel: number | null;
  feeNote?: I18nText;
  processingTime: I18nText;
  /** Place types where this is done (links into the directory). */
  whereTypes: CsPlaceType[];
  /** Name of the official source. Add a URL only when it has been checked. */
  sourceName: string;
  sourceUrl?: string;
  lastVerified: string; // YYYY-MM-DD
  helpfulBy: string[];
  updatedAt: ISODateString;
}

export interface CsGuideView extends Omit<CsGuide, "helpfulBy"> {
  helpfulCount: number;
  markedHelpful: boolean;
  commentCount: number;
}

// ---------- C. Announcements and alerts ----------

export type CsAnnouncementLevel = "INFO" | "WARNING" | "ALERT";

export type CsAnnouncementCategory =
  | "FLOOD"
  | "FIRE"
  | "ROAD_ACCIDENT"
  | "ROAD_CLOSURE"
  | "WASTE"
  | "HEALTH"
  | "UTILITY_OUTAGE"
  | "EVENT"
  | "GENERAL";

export interface CsAnnouncement {
  id: string;
  title: I18nText;
  body: I18nText;
  level: CsAnnouncementLevel;
  category: CsAnnouncementCategory;
  scope: CsScope;
  authorId: string; // OFFICER or ADMIN
  imageUrl?: string;
  location?: LatLng;
  pinned: boolean;
  commentsEnabled: boolean;
  validFrom: ISODateString;
  validTo?: ISODateString; // undefined = no end
  /** Set when an emergency admin publishes an alert about an incident (feature 2). */
  incidentId?: string;
  createdAt: ISODateString;
}

export interface CsAnnouncementView extends Omit<CsAnnouncement, "authorId"> {
  author: CsAuthor;
  active: boolean;
  commentCount: number;
}

export interface CsCreateAnnouncementInput {
  title: I18nText;
  body: I18nText;
  level: CsAnnouncementLevel;
  category: CsAnnouncementCategory;
  scope: CsScope;
  imageUrl?: string;
  location?: LatLng;
  pinned?: boolean;
  commentsEnabled?: boolean;
  validFrom?: ISODateString;
  validTo?: ISODateString;
  incidentId?: string;
}

// ---------- D. Community board ----------

export type CsPostType = "DISCUSSION" | "QUESTION" | "EVENT" | "POLL";

export type CsReaction = "LIKE" | "HELPFUL";

export interface CsEventInfo {
  start: ISODateString;
  end: ISODateString;
  place: string; // must be a public place
  location?: LatLng;
  capacity?: number;
  going: string[]; // user ids
  interested: string[];
}

export interface CsPollOption {
  id: string;
  label: string;
  voterIds: string[];
}

export interface CsPollInfo {
  options: CsPollOption[];
  closesAt: ISODateString;
}

export interface CsPost {
  id: string;
  type: CsPostType;
  title: string;
  body: string;
  photoUrls: string[];
  /** Area the post belongs to (CITY or SANGKAT level). */
  scope: CsScope;
  groupId?: string;
  authorId: string;
  /** Official posts can be pinned to the top of their area feed. */
  pinned: boolean;
  event?: CsEventInfo;
  poll?: CsPollInfo;
  /** QUESTION: accepted answer (comment id). */
  acceptedCommentId?: string;
  reactions: Record<CsReaction, string[]>;
  reportedBy: string[];
  hidden: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CsPostView extends Omit<CsPost, "authorId" | "reactions" | "reportedBy" | "event" | "poll"> {
  author: CsAuthor;
  reactionCounts: Record<CsReaction, number>;
  myReactions: CsReaction[];
  commentCount: number;
  groupName?: I18nText;
  event?: Omit<CsEventInfo, "going" | "interested"> & {
    goingCount: number;
    interestedCount: number;
    myRsvp: CsRsvp | null;
    full: boolean;
  };
  /** Results (counts) are shown only after the viewer voted or the poll closed. */
  poll?: {
    closesAt: ISODateString;
    closed: boolean;
    options: { id: string; label: string; votes?: number }[];
    totalVotes?: number;
    myVote: string | null;
  };
  canDelete: boolean;
}

export type CsRsvp = "GOING" | "INTERESTED";

export interface CsCreatePostInput {
  type: CsPostType;
  title: string;
  body: string;
  photoUrls?: string[];
  scope: CsScope;
  groupId?: string;
  pinned?: boolean; // officials only
  event?: { start: ISODateString; end: ISODateString; place: string; location?: LatLng; capacity?: number };
  poll?: { options: string[]; closesAt: ISODateString };
}

export interface CsPostFilter {
  q?: string;
  type?: CsPostType[];
  groupId?: string;
  provinceId?: string;
  cityId?: string;
  /** Only events that have not ended yet. */
  upcomingEvents?: boolean;
}

// ---------- Comments (board posts, guides, announcements) ----------

export type CsCommentTarget = "POST" | "GUIDE" | "ANNOUNCEMENT";

export interface CsComment {
  id: string;
  targetType: CsCommentTarget;
  targetId: string;
  /** One level of replies only. */
  parentId?: string;
  authorId: string;
  body: string;
  reactions: Record<CsReaction, string[]>;
  reportedBy: string[];
  hidden: boolean;
  deleted: boolean;
  createdAt: ISODateString;
}

export interface CsCommentView extends Omit<CsComment, "authorId" | "reactions" | "reportedBy"> {
  author: CsAuthor;
  reactionCounts: Record<CsReaction, number>;
  myReactions: CsReaction[];
  /** QUESTION posts: this is the accepted answer. */
  accepted: boolean;
  canDelete: boolean;
  replies: CsCommentView[];
}

// ---------- E. Community groups ----------

export type CsGroupKind = "AREA" | "INTEREST";
export type CsGroupRole = "OWNER" | "MODERATOR" | "MEMBER";

export interface CsGroup {
  id: string;
  kind: CsGroupKind;
  name: I18nText;
  description: I18nText;
  coverUrl?: string;
  scope: CsScope;
  rules?: string;
  createdBy?: string; // undefined for auto-created area groups
  createdAt: ISODateString;
}

export interface CsMember {
  groupId: string;
  userId: string;
  role: CsGroupRole;
  joinedAt: ISODateString;
}

export interface CsGroupView extends CsGroup {
  memberCount: number;
  postCount: number;
  myRole: CsGroupRole | null;
}

export interface CsCreateGroupInput {
  name: I18nText;
  description: I18nText;
  scope: CsScope;
  coverUrl?: string;
  rules?: string;
}

// ---------- Reporting ----------

export type CsReportReason = "SPAM" | "FAKE" | "PERSONAL_INFO" | "OFFENSIVE" | "OTHER";

export interface CsReportInput {
  targetType: "POST" | "COMMENT";
  targetId: string;
  reason: CsReportReason;
}

// ---------- Rules ----------

export const CS_RULES = {
  autoHideReports: 3, // same as Lost & Found
  pollMinOptions: 2,
  pollMaxOptions: 6,
  titleMax: 120,
  bodyMax: 2000,
  commentMax: 1000,
} as const;
