import { api, as, done, expectErr, ok } from "./helpers.mjs";
const lf = api.lf;

// visitor view
let posts = await lf.listPosts();
ok(!posts.some((p) => p.id === "lf-12"), "hidden spam post not listed");
ok(!posts.some((p) => p.id === "lf-11"), "expired post not listed");
ok(posts.find((p) => p.id === "lf-1").photoUrls.length === 0, "ID photo hidden from visitors");
ok(!("secret" in posts[0]) && !("ownerId" in posts[0]), "no secret or ownerId in public post");
ok((await lf.listPosts({ provinceId: "siem-reap" })).length === 1, "province filter");
await as("012000007");
ok((await lf.listPosts())[0].cityId === "siem-reap-city", "viewer's city first");
ok((await lf.matchesForPost("lf-3"))[0]?.post.id === "lf-2", "match suggestion lf-3 -> lf-2");

// claim -> reject -> limit
await as("012000001");
await expectErr(lf.claimPost("lf-2", { description: "short" }), "VALIDATION", "claim needs detail");
const c1 = await lf.claimPost("lf-2", { description: "My Honda key with keychain", answer: "blue" });
ok((await lf.getPost("lf-2")).status === "CLAIM_PENDING", "post CLAIM_PENDING");
await expectErr(lf.claimPost("lf-2", { description: "again my Honda key", answer: "x" }), "CONFLICT", "no double pending claim");
ok((await lf.myClaims())[0].finderContact === undefined, "finder contact hidden before approval");
await as("012000004");
ok((await lf.listClaimsForPost("lf-2"))[0].secret?.answer, "finder sees secret next to claim");
await lf.rejectClaim(c1.id, "Keychain is red");
ok((await lf.getPost("lf-2")).status === "POSTED", "rejected -> back to POSTED");
for (let i = 0; i < 2; i++) {
  await as("012000001");
  const c = await lf.claimPost("lf-2", { description: "My Honda key with keychain", answer: "guess " + i });
  await as("012000004");
  await lf.rejectClaim(c.id);
}
await as("012000001");
await expectErr(lf.claimPost("lf-2", { description: "My Honda key with keychain", answer: "red" }), "LIMIT", "3 wrong claims -> blocked");

// approve -> pickup -> returned
await as("012000009");
const c2 = await lf.claimPost("lf-2", { description: "Honda Dream key, red keychain", answer: "Red Angkor Wat keychain" });
await as("012000004");
await lf.approveClaim(c2.id);
ok((await lf.listClaimsForPost("lf-2")).find((c) => c.id === c2.id).claimantContact?.phone === "012000009", "contact shared after approval");
await expectErr(lf.setPickup(c2.id, { place: "Office", time: "2020-01-01T00:00:00Z" }), "VALIDATION", "pickup in the past rejected");
await lf.setPickup(c2.id, { place: "Sen Sok Sangkat office", time: new Date(Date.now() + 864e5).toISOString() });
await expectErr(lf.deletePost("lf-2"), "CONFLICT", "can't delete during handover");
await as("012000009");
await expectErr(lf.markReturned("lf-2"), "FORBIDDEN", "only finder marks returned");
await as("012000004");
ok((await lf.markReturned("lf-2")).status === "RETURNED", "marked RETURNED");

// comments, reports, create rules
await as("012000001");
const cm = await lf.addComment("lf-10", { type: "SIGHTING", body: "Saw it near the pier", sightingPlace: "Pier" });
await as("012000007");
await lf.deleteComment(cm.id);
ok(!(await lf.listComments("lf-10")).some((c) => c.id === cm.id), "post owner deleted comment");
for (const ph of ["012000001", "012000004", "012000005"]) { await as(ph); await lf.reportContent({ targetType: "POST", targetId: "lf-8", reason: "FAKE" }); }
ok(!(await lf.listPosts()).some((p) => p.id === "lf-8"), "3 reports -> hidden");
await as("012000001");
await expectErr(lf.createPost({ kind: "FOUND", category: "WALLET", title: "Wallet", description: "Found", provinceId: "phnom-penh", cityId: "chamkar-mon", place: "x", eventDate: "2026-11-19" }), "VALIDATION", "FOUND needs secret");
await expectErr(lf.createPost({ kind: "FOUND", category: "NATIONAL_ID", title: "ID", description: "Number 012345678", provinceId: "phnom-penh", cityId: "doun-penh", place: "x", eventDate: "2026-11-19", secret: { answer: "a" } }), "VALIDATION", "ID numbers blocked");
done();
