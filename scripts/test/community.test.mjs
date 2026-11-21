import { api, as, done, expectErr, inDays as future, ok } from "./helpers.mjs";

const cs = api.cs;

// A. directory
let places = await cs.listPlaces();
ok(places.length === 12 && places.every(p => typeof p.openNow === "boolean"), "list places with openNow");
ok(!places.some(p => /hospital|police/i.test(p.name.en)), "no hospitals or police in directory");
const near = await cs.listPlaces({ near: { lat: 11.579, lng: 104.901 } });
ok(near[0].id === "pl-1" && near[0].distanceKm === 0, "nearest first");
ok((await cs.listPlaces({ type: ["ONE_WINDOW_OFFICE"] })).length === 2, "filter by type");
ok((await cs.getWasteSchedules({ cityId: "tuol-kouk" }))[0].timeWindow.from === "18:00", "waste schedule");
await as("012000001");
ok((await cs.listPlaces())[0].cityId === "tuol-kouk", "viewer's city first");
const ed = await cs.suggestEdit("pl-2", { field: "PHONE", value: "023 000 555" });
await as("012000006"); // officer-2, chamkar-mon
await expectErr(cs.reviewEdit(ed.id, true), "FORBIDDEN", "officer can't review other area");
await as("012000002"); // officer-1, tuol-kouk
ok((await cs.listEditSuggestions()).some(e => e.id === ed.id), "officer sees own-area suggestions");
await cs.reviewEdit(ed.id, true);
ok((await cs.getPlace("pl-2")).phone === "023 000 555", "accepted phone edit applied");

// B. guides
let guides = await cs.listGuides();
ok(guides[0].id === "g-national-id" && guides[0].helpfulCount === 3, "guides sorted by helpful");
const g = await cs.getGuide("g-national-id");
ok(g.places.some(p => p.type === "KHAN_OFFICE"), "guide links to places");
await as("012000001");
ok((await cs.toggleGuideHelpful("g-birth")).markedHelpful, "mark guide helpful");
const gq = await cs.listComments("GUIDE", "g-national-id");
ok(gq[0].replies[0]?.author.official, "guide Q&A with official reply");

// C. announcements
await as("012000001"); // tuol-kouk, Boeng Kak 2
let ann = await cs.listAnnouncements();
ok(ann[0].id === "an-1" && ann.some(a => a.id === "an-2") && ann.some(a => a.id === "an-5") && !ann.some(a => a.id === "an-3"), "announcements scoped to viewer area");
ok(!ann.some(a => a.id === "an-6"), "expired announcement hidden");
ok((await cs.activeAlerts()).length === 1, "active alerts banner");
await expectErr(cs.createAnnouncement({ title: { km: "សាកល្បង", en: "Test" }, body: { km: "សាកល្បង", en: "Test" }, level: "INFO", category: "GENERAL", scope: { level: "CITY", provinceId: "phnom-penh", cityId: "tuol-kouk" } }), "FORBIDDEN", "resident can't post announcements");
await as("012000002"); // officer tuol-kouk
await expectErr(cs.createAnnouncement({ title: { km: "សាកល្បង", en: "x" }, body: { km: "សាកល្បង", en: "x" }, level: "ALERT", category: "FLOOD", scope: { level: "CITY", provinceId: "phnom-penh", cityId: "sen-sok" } }), "FORBIDDEN", "officer can't target other area");
await cs.createAnnouncement({ title: { km: "ទឹកជំនន់", en: "Flooding on St. 315" }, body: { km: "ជៀសវាង", en: "Avoid St. 315" }, level: "ALERT", category: "FLOOD", scope: { level: "CITY", provinceId: "phnom-penh", cityId: "tuol-kouk" } });
await as("012000001");
ok((await api.myNotifications()).some(n => n.type === "CS_ALERT" && n.message.en.includes("315")), "alert notified users in area");
await as("012000004"); // chamkar-mon
ok(!(await api.myNotifications()).some(n => n.message.en?.includes("315")), "users outside area not notified");
await expectErr(cs.addComment("ANNOUNCEMENT", "an-1", { body: "hi" }), "FORBIDDEN", "comments off on alert");

// E. groups
await as("012000001");
let groups = await cs.listGroups();
ok(groups.length === 38 + 4, "area groups for every city (38) + interest groups (4)");
ok(groups[0].scope.cityId === "tuol-kouk", "own-area groups first");
await expectErr(cs.createPost({ type: "DISCUSSION", title: "Hello Sen Sok", body: "hi", scope: { level: "CITY", provinceId: "phnom-penh", cityId: "sen-sok" }, groupId: "grp-area-sen-sok" }), "FORBIDDEN", "must join to post in group");
await cs.joinGroup("grp-area-sen-sok");
ok((await cs.getGroup("grp-area-sen-sok")).myRole === "MEMBER", "joined group");
const ng = await cs.createGroup({ name: { km: "ក្រុមកីឡា", en: "Tuol Kouk football" }, description: { km: "លេងបាល់ទាត់", en: "Weekly football" }, scope: { level: "CITY", provinceId: "phnom-penh", cityId: "tuol-kouk" } });
ok(ng.myRole === "OWNER" && ng.kind === "INTEREST", "create interest group as owner");
await expectErr(cs.leaveGroup(ng.id), "CONFLICT", "owner can't leave");

// D. board
await as("012000001");
let posts = await cs.listPosts();
ok(!posts.some(p => p.id === "cp-8"), "hidden spam post not listed");
ok(posts[0].id === "cp-5" && posts[0].author.official, "official pinned post first in own area");
const poll = posts.find(p => p.id === "cp-2");
ok(poll.poll.myVote === "o1" && poll.poll.options[0].votes === 2, "poll results shown after voting");
await as("012000004");
const pollBefore = await cs.getPost("cp-2");
ok(pollBefore.poll.options[0].votes === undefined, "poll results hidden before voting");
await cs.votePoll("cp-2", "o2");
await expectErr(cs.votePoll("cp-2", "o3"), "CONFLICT", "one vote per user");
const ev = await cs.rsvp("cp-1", "GOING");
ok(ev.event.myRsvp === "GOING" && ev.event.goingCount === 3, "RSVP going");
await expectErr(cs.rsvp("cp-7", "GOING"), "CONFLICT", "can't RSVP past event");
ok((await cs.listPosts({ upcomingEvents: true })).every(p => p.type === "EVENT" && p.id !== "cp-7"), "upcoming events filter");
await expectErr(cs.createPost({ type: "DISCUSSION", title: "Call me", body: "My phone 012 345 678", scope: { level: "CITY", provinceId: "phnom-penh", cityId: "chamkar-mon" } }), "VALIDATION", "phone numbers blocked in posts");
await expectErr(cs.createPost({ type: "POLL", title: "Pick one", body: "x", scope: { level: "CITY", provinceId: "phnom-penh", cityId: "chamkar-mon" }, poll: { options: ["A"], closesAt: future(2) } }), "VALIDATION", "poll needs 2+ options");
await expectErr(cs.createPost({ type: "DISCUSSION", title: "Pinned", body: "x", pinned: true, scope: { level: "CITY", provinceId: "phnom-penh", cityId: "chamkar-mon" } }), "FORBIDDEN", "residents can't pin");
const q = await cs.createPost({ type: "QUESTION", title: "Where is the post office?", body: "Need to send a parcel", scope: { level: "CITY", provinceId: "phnom-penh", cityId: "chamkar-mon" } });
await as("012000005");
const ans = await cs.addComment("POST", q.id, { body: "Central Post Office near Wat Phnom" });
await expectErr(cs.acceptAnswer(q.id, ans.id), "FORBIDDEN", "only asker accepts answer");
await as("012000004");
ok((await api.myNotifications()).some(n => n.type === "CS_COMMENT" && n.csPostId === q.id), "author notified of comment");
await cs.acceptAnswer(q.id, ans.id);
const reply = await cs.addComment("POST", q.id, { body: "Thanks!", parentId: ans.id });
await expectErr(cs.addComment("POST", q.id, { body: "deep", parentId: reply.id }), "VALIDATION", "replies one level only");
const thread = await cs.listComments("POST", q.id);
ok(thread[0].accepted && thread[0].replies.length === 1, "accepted answer + reply threaded");
await as("012000005");
ok((await api.myNotifications()).some(n => n.type === "CS_ANSWER_ACCEPTED"), "answer author notified");
ok((await cs.toggleReaction("POST", q.id, "HELPFUL")).counts.HELPFUL === 1, "reaction toggled");

// group moderator deletes a post in their group
await as("012000001");
const gp = await cs.createPost({ type: "DISCUSSION", title: "Off topic", body: "random", scope: { level: "CITY", provinceId: "phnom-penh", cityId: "sen-sok" }, groupId: "grp-area-sen-sok" });
await as("012000009"); // u-citizen-5, moderator of cleanup group only, member of area group
await expectErr(cs.deletePost(gp.id), "FORBIDDEN", "plain member can't delete others' posts");
await as("012000003"); // admin
await cs.deletePost(gp.id);
await expectErr(cs.getPost(gp.id), "NOT_FOUND", "admin deleted post");

// report + auto-hide
for (const ph of ["012000001", "012000004", "012000005"]) { await as(ph); await cs.reportContent({ targetType: "POST", targetId: "cp-6", reason: "SPAM" }); }
ok(!(await cs.listPosts()).some(p => p.id === "cp-6"), "3 reports -> post hidden");
await as("012000007");
ok((await api.myNotifications()).some(n => n.type === "CS_CONTENT_HIDDEN"), "author told content hidden");

// Lost & Found still works
await as("012000001");
ok((await api.lf.listPosts()).length > 0, "Lost & Found API unaffected");
done();
