// Lost & Found Community: national lost-and-found system.
// Spec: docs/features/lost-and-found.md
//
// Process: finder posts with a secret detail -> owner claims -> finder
// approves -> they meet at the pickup place -> finder marks Returned.
// Key rule: comments only help find the item. Ownership is decided only by
// Claim, Approve and Returned.

import type { I18nText, ISODateString, LatLng } from "./index";

// ---------- Categories ----------

export type LfCategory =
  | "NATIONAL_ID"
  | "PASSPORT"
  | "DRIVING_LICENSE"
  | "BANK_CARD"
  | "PHONE"
  | "WALLET"
  | "KEYS"
  | "MOTO_PLATE"
  | "BAG"
  | "ELECTRONICS"
  | "JEWELRY"
  | "DOCUMENTS"
  | "PET"
  | "OTHER";

export interface LfCategoryMeta {
  id: LfCategory;
  label: I18nText;
  icon: string;
  /**
   * Identity documents and cards. Their photos are never public, and the
   * description must not include numbers or names.
   */
  sensitive: boolean;
}

// ---------- Posts ----------

export type LfKind = "LOST" | "FOUND";

/**
 * Posted -> ClaimPending -> Approved -> Returned.
 * A rejected claim goes back to Posted (if no other claim is pending).
 * An unclaimed post becomes Expired after 60 days.
 */
export type LfPostStatus = "POSTED" | "CLAIM_PENDING" | "APPROVED" | "RETURNED" | "EXPIRED";

/** Finder-only proof of ownership (Core feature 2). */
export interface LfSecret {
  /** Optional question shown to claimants, e.g. "What color is the keychain?" */
  question?: string;
  /** The hidden detail / answer. Only the post owner ever sees it. */
  answer: string;
}

export interface LfPost {
  id: string;
  kind: LfKind;
  category: LfCategory;
  title: string;
  description: string;
  photoUrls: string[];
  provinceId: string;
  cityId: string;
  /** Free text place, e.g. "Psar Thmei, near the east gate". */
  place: string;
  /** Rounded to ~100 m so the exact spot is not exposed. */
  approxLocation?: LatLng;
  /** Date the item was lost or found (YYYY-MM-DD). */
  eventDate: string;
  ownerId: string; // the user who created the post (finder for FOUND, owner for LOST)
  /** Only FOUND posts have a secret. LOST posts are claimed by contacting the owner via comments/matches. */
  secret?: LfSecret;
  status: LfPostStatus;
  /** Distinct users who reported the post. 3 or more -> hidden. */
  reportedBy: string[];
  hidden: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  /** createdAt + 60 days. */
  expiresAt: ISODateString;
}

/** What visitors and other users see. */
export interface LfPublicPost extends Omit<LfPost, "ownerId" | "secret" | "reportedBy" | "photoUrls"> {
  /** Empty for sensitive categories. */
  photoUrls: string[];
  /** The question only, never the answer. */
  secretQuestion?: string;
  hasSecret: boolean;
  commentCount: number;
  /** Set only for the viewer's own posts. */
  isMine: boolean;
}

export interface LfCreatePostInput {
  kind: LfKind;
  category: LfCategory;
  title: string;
  description: string;
  photoUrls?: string[];
  provinceId: string;
  cityId: string;
  place: string;
  approxLocation?: LatLng;
  eventDate: string;
  secret?: LfSecret; // required when kind = FOUND
}

export interface LfPostFilter {
  q?: string;
  kind?: LfKind;
  category?: LfCategory[];
  provinceId?: string;
  cityId?: string;
  dateFrom?: string; // YYYY-MM-DD, compared with eventDate
  dateTo?: string;
  /** Include RETURNED and EXPIRED posts. Default false. */
  includeClosed?: boolean;
}

// ---------- Claims ----------

export type LfClaimStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

export interface LfPickup {
  place: string;
  time: ISODateString;
  note?: string;
}

export interface LfClaim {
  id: string;
  postId: string;
  claimantId: string;
  /** Claimant's own description of the item. */
  description: string;
  /** Claimant's answer to the secret question (if the post has one). */
  answer?: string;
  status: LfClaimStatus;
  rejectReason?: string;
  pickup?: LfPickup;
  createdAt: ISODateString;
  decidedAt?: ISODateString;
}

export interface LfContact {
  fullName: string;
  /** Missing when the person registered without a phone number. */
  phone?: string;
  email?: string;
}

/** What the finder sees when reviewing claims: claim next to the secret. */
export interface LfClaimForFinder extends LfClaim {
  claimantName: string;
  secret?: LfSecret;
  /** Shown only after approval. */
  claimantContact?: LfContact;
}

/** What the claimant sees about their own claim. */
export interface LfClaimForClaimant extends LfClaim {
  postTitle: string;
  attemptsLeft: number;
  /** Shown only after approval (private details hidden until approval). */
  finderContact?: LfContact;
}

export interface LfCreateClaimInput {
  description: string;
  answer?: string;
}

// ---------- Comments & sightings ----------

export type LfCommentType = "COMMENT" | "SIGHTING";

export interface LfComment {
  id: string;
  postId: string;
  authorId: string;
  type: LfCommentType;
  body: string;
  /** For sightings ("I saw this"): where it was seen. */
  sightingPlace?: string;
  sightingLocation?: LatLng;
  reportedBy: string[];
  hidden: boolean;
  deleted: boolean;
  createdAt: ISODateString;
}

export interface LfPublicComment extends Omit<LfComment, "authorId" | "reportedBy"> {
  authorName: string;
  /** Viewer can delete: author, or owner of the post. */
  canDelete: boolean;
}

// ---------- Matches ----------

export type LfMatchReason = "SAME_CATEGORY" | "SAME_CITY" | "SAME_PROVINCE" | "NEARBY" | "CLOSE_DATE" | "KEYWORDS";

export interface LfMatch {
  post: LfPublicPost;
  score: number; // 0-100
  reasons: LfMatchReason[];
}

// ---------- Reporting (safety) ----------

export type LfReportReason = "SPAM" | "FAKE" | "PERSONAL_INFO" | "OFFENSIVE" | "OTHER";

export interface LfReportInput {
  targetType: "POST" | "COMMENT";
  targetId: string;
  reason: LfReportReason;
}

// ---------- Rules (Core feature 10) ----------

export const LF_RULES = {
  maxWrongClaims: 3,
  autoHideReports: 3,
  expiryDays: 60,
  expiringSoonDays: 7,
  matchMaxDays: 14,
  matchNearbyKm: 5,
} as const;
