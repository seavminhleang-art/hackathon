import { load, currentUser, delay } from "./mock-db";
import { myMatches } from "./lost-found-api";

export type MyActivityKind = "POST" | "COMMENT" | "CLAIM" | "MATCH" | "REPORT" | "EMERGENCY";

export interface MyActivityEvent {
  id: string;
  kind: MyActivityKind;
  title: string;
  detail: string;
  at: string;
  href: string;
  status?: string;
}

export interface MyActivityData {
  events: MyActivityEvent[];
  postsCreated: number;
  itemsFound: number;
  itemsLost: number;
  comments: number;
  claimsSubmitted: number;
  matchesFound: number;
  reportsMade: number;
}

/** Cross-feature activity for the signed-in citizen's own actions only. */
export async function getMyActivity(): Promise<MyActivityData> {
  const user = currentUser();
  if (!user) return delay({ events: [], postsCreated: 0, itemsFound: 0, itemsLost: 0, comments: 0, claimsSubmitted: 0, matchesFound: 0, reportsMade: 0 });

  const db = load();
  const ownLfPosts = db.lfPosts.filter((post) => post.ownerId === user.id);
  const ownCommunityPosts = db.csPosts.filter((post) => post.authorId === user.id && !post.hidden);
  const ownClaims = db.lfClaims.filter((claim) => claim.claimantId === user.id);
  const ownReports = db.grReports.filter((report) => report.reporterId === user.id);
  const ownIncidents = db.emIncidents.filter((incident) => incident.reporterId === user.id && incident.kind === "REPORT");

  const events: MyActivityEvent[] = [
    ...ownLfPosts.map((post) => ({ id: `lf-post-${post.id}`, kind: "POST" as const, title: post.title, detail: post.place, at: post.createdAt, href: "/lost-found", status: post.kind })),
    ...ownCommunityPosts.map((post) => ({ id: `community-post-${post.id}`, kind: "POST" as const, title: post.title, detail: post.body, at: post.createdAt, href: "/community", status: post.type })),
    ...ownClaims.map((claim) => ({ id: `claim-${claim.id}`, kind: "CLAIM" as const, title: db.lfPosts.find((post) => post.id === claim.postId)?.title ?? "Lost & Found item", detail: claim.description, at: claim.createdAt, href: "/lost-found", status: claim.status })),
    ...ownReports.map((report) => ({ id: `report-${report.id}`, kind: "REPORT" as const, title: report.title, detail: report.addressHint ?? "", at: report.createdAt, href: "/me/reports", status: report.status })),
    ...ownIncidents.map((incident) => ({ id: `emergency-${incident.id}`, kind: "EMERGENCY" as const, title: incident.description, detail: incident.addressHint ?? "", at: incident.createdAt, href: "/announcements", status: incident.status })),
    ...db.lfComments.filter((comment) => comment.authorId === user.id && !comment.hidden && !comment.deleted).map((comment) => ({ id: `lf-comment-${comment.id}`, kind: "COMMENT" as const, title: db.lfPosts.find((post) => post.id === comment.postId)?.title ?? "Lost & Found", detail: comment.body, at: comment.createdAt, href: "/lost-found" })),
    ...db.csComments.filter((comment) => comment.authorId === user.id && !comment.hidden && !comment.deleted).map((comment) => {
      const target = comment.targetType === "POST" ? db.csPosts.find((post) => post.id === comment.targetId)?.title : comment.targetType === "ANNOUNCEMENT" ? db.csAnnouncements.find((item) => item.id === comment.targetId)?.title.en : undefined;
      return { id: `community-comment-${comment.id}`, kind: "COMMENT" as const, title: target ?? "Community", detail: comment.body, at: comment.createdAt, href: "/community" };
    }),
    ...db.grComments.filter((comment) => comment.authorId === user.id && !comment.internal).map((comment) => ({ id: `report-comment-${comment.id}`, kind: "COMMENT" as const, title: db.grReports.find((report) => report.id === comment.reportId)?.title ?? "Civic report", detail: comment.body, at: comment.createdAt, href: "/me/reports" })),
  ];

  const ownPostById = new Map(ownLfPosts.map((post) => [post.id, post]));
  const matchGroups = await myMatches().catch(() => []);
  for (const group of matchGroups) {
    const ownPost = ownPostById.get(group.postId);
    if (!ownPost) continue;
    for (const match of group.matches) {
      events.push({ id: `match-${group.postId}-${match.post.id}`, kind: "MATCH", title: ownPost.title, detail: match.post.title, at: match.post.createdAt, href: "/lost-found", status: `${match.score}%` });
    }
  }

  events.sort((a, b) => b.at.localeCompare(a.at));
  return delay({
    events,
    postsCreated: ownLfPosts.length + ownCommunityPosts.length,
    itemsFound: ownLfPosts.filter((post) => post.kind === "FOUND").length,
    itemsLost: ownLfPosts.filter((post) => post.kind === "LOST").length,
    comments: events.filter((event) => event.kind === "COMMENT").length,
    claimsSubmitted: ownClaims.length,
    matchesFound: matchGroups.reduce((sum, group) => sum + group.matches.length, 0),
    reportsMade: ownReports.length + ownIncidents.length,
  });
}
