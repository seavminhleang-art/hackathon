import { api, as, done, expectErr, logout, ok } from "./helpers.mjs";
const gr = api.gr;
const PHOTO = { url: "/mock/p.jpg", mimeType: "image/jpeg", sizeBytes: 900_000 };
const TK = { location: { lat: 11.5801, lng: 104.9004 }, locationSource: "GPS", provinceId: "phnom-penh", cityId: "tuol-kouk" };

// public view
await logout();
let pub = await gr.listPublicReports();
ok(pub.length > 0 && pub.every((r) => ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED"].includes(r.status)), "public feed: approved reports only");
ok(pub.every((r) => !("reporterId" in r) && r.reporter === undefined && r.history.every((h) => h.by === undefined)), "public: no reporter identity");
ok(!pub.some((r) => r.history.some((h) => h.internal)), "public: no internal history");
await expectErr(gr.getReport("gr-3"), "NOT_FOUND", "unreviewed report hidden from public");
ok((await gr.getReport("RPT-2026-00005")).id === "gr-5", "lookup by report code");
ok((await gr.listPublicReports({ category: ["WASTE"] })).every((r) => r.category === "WASTE"), "filter by category");
ok((await gr.listComments("gr-2")).every((c) => !c.internal), "internal notes hidden from public");

// hybrid routing suggestion
ok(gr.suggestDepartment("PUBLIC_LIGHTING", "phnom-penh").id === "dep-light-pp", "suggest department by category + province");
ok(gr.suggestDepartment("OTHER", "phnom-penh") === null, "OTHER: admin must pick");

// citizen create: validation
await as("012000001");
await expectErr(gr.createReport({ ...TK, category: "WASTE", title: "Bin", description: "Overflowing bin near school" }), "VALIDATION", "title too short");
await expectErr(gr.createReport({ ...TK, category: "WASTE", title: "Overflowing bin", description: "Overflowing bin near school", photos: Array(6).fill(PHOTO) }), "VALIDATION", "max 5 photos");
await expectErr(gr.createReport({ ...TK, category: "WASTE", title: "Overflowing bin", description: "Overflowing bin near school", photos: [{ ...PHOTO, mimeType: "image/gif" }] }), "VALIDATION", "JPG/PNG/WebP only");
await expectErr(gr.createReport({ ...TK, category: "WASTE", title: "Overflowing bin", description: "Overflowing bin near school", photos: [{ ...PHOTO, sizeBytes: 6 * 1024 * 1024 }] }), "VALIDATION", "5 MB limit");
await expectErr(gr.createReport({ ...TK, cityId: "siem-reap-city", category: "WASTE", title: "Overflowing bin", description: "Overflowing bin near school" }), "VALIDATION", "city must match province");

// duplicate suggestion before creating
const dupes = await gr.findPossibleDuplicates({ category: "DRAINAGE_FLOODING", location: { lat: 11.5206, lng: 104.9311 }, description: "street flooded after rain" });
ok(dupes[0]?.report.id === "gr-5" && dupes[0].distanceM < 50, "possible duplicate suggested (gr-5)");

// full lifecycle
const r = await gr.createReport({ ...TK, category: "PUBLIC_LIGHTING", title: "Streetlight broken on St. 315", description: "Two lights are off, the street is dark.", photos: [PHOTO, PHOTO] });
ok(/^RPT-\d{4}-\d{5}$/.test(r.code) && r.status === "SUBMITTED" && r.photos.length === 2, "created with unique code");
ok(r.can.edit && r.can.cancel && !r.can.review, "owner can edit/cancel, not review");
const edited = await gr.updateReport(r.id, { description: "Two lights are off near the school, the street is dark." });
ok(edited.history.some((h) => h.action === "EDITED"), "owner edits while SUBMITTED");
await expectErr(gr.startReview(r.id), "FORBIDDEN", "citizen can't review");

await as("012000003"); // admin
await gr.startReview(r.id);
await gr.requestInfo(r.id, "Which side of the school?");
await as("012000001");
ok((await gr.getReport(r.id)).can.respondToInfo, "owner sees info request");
ok((await api.myNotifications()).some((n) => n.type === "GR_INFO_REQUESTED" && n.reportId === r.id), "notified: more info");
await gr.respondToInfoRequest(r.id, { message: "North gate side", photos: [PHOTO] });
ok((await gr.getReport(r.id)).status === "UNDER_REVIEW", "answer -> back to UNDER_REVIEW");
await expectErr(gr.updateReport(r.id, { title: "Changed title here" }), "FORBIDDEN", "no edit during review");

await as("012000003");
await gr.changeCategory(r.id, "PUBLIC_LIGHTING");
const assigned = await gr.approveAndAssign(r.id, { priority: "HIGH" });
ok(assigned.status === "ASSIGNED" && assigned.departmentId === "dep-light-pp" && assigned.dueAt, "approve uses suggested department, sets due date");
await as("012000016"); // drainage staff
await expectErr(gr.startWork(r.id), "FORBIDDEN", "other department can't touch it");
await as("012000003");
await gr.reassign(r.id, "dep-drain-pp", "Lights on drain poles");
await as("012000016");
const tasks = await gr.staffTasks();
ok(tasks.some((t) => t.id === r.id) && tasks.every((t) => t.departmentId === "dep-drain-pp"), "staff sees own department tasks");
ok(tasks[0].overdue, "overdue tasks first");
await gr.acceptTask(r.id);
await expectErr(gr.acceptTask(r.id), "CONFLICT", "can't accept twice");
await gr.startWork(r.id, "Crew on the way");
await expectErr(gr.closeReport(r.id), "FORBIDDEN", "staff can't close");
await gr.addProgress(r.id, { note: "Replacing bulbs", photos: [PHOTO] });
await expectErr(gr.resolveReport(r.id, { note: "" }), "VALIDATION", "resolution note required");
const res = await gr.resolveReport(r.id, { note: "Both lights replaced", photos: [PHOTO] });
ok(res.status === "RESOLVED" && res.photos.filter((p) => p.kind === "REPAIR").length === 2, "staff resolves with repair photos");

await as("012000001");
ok((await api.myNotifications()).some((n) => n.type === "GR_RESOLVED" && n.reportId === r.id), "citizen told: resolved (not yet verified)");
await as("012000003");
await gr.sendBack(r.id, "Photo doesn't show the second light");
await as("012000016");
await gr.resolveReport(r.id, { note: "Second light photo added", photos: [PHOTO] });
await as("012000003");
const closed = await gr.closeReport(r.id, "Verified");
ok(closed.status === "CLOSED" && closed.closedAt, "admin verifies and closes");
ok(closed.history.map((h) => h.action).join(">").includes("RESOLVED>RESOLUTION_REJECTED>RESOLVED>CLOSED"), "history records every step");

// reopen
await as("012000001");
const reo = await gr.requestReopen(r.id, "Light is off again");
ok(reo.status === "REOPENED" && reo.reopenCount === 1, "citizen reopens");
await as("012000003");
ok((await gr.approveAndAssign(r.id, { departmentId: "dep-light-pp" })).status === "ASSIGNED", "admin reassigns reopened report");

// support + confirm
await as("012000009");
await gr.supportReport("gr-7");
await expectErr(gr.supportReport("gr-7"), "CONFLICT", "one support per account");
await as("012000001");
await expectErr(gr.supportReport("gr-7"), "VALIDATION", "can't support own report");
const conf = await gr.confirmIssue("gr-7", true);
ok(conf.stillExistsCount === 1, "confirm still exists");

// comments
await as("012000005"); // not owner of gr-5
await expectErr(gr.addComment("gr-5", { body: "hi" }), "FORBIDDEN", "other citizens can't comment");
await as("012000004"); // owner of gr-5
await expectErr(gr.addComment("gr-5", { body: "note", internal: true }), "FORBIDDEN", "citizen can't write internal note");
await gr.addComment("gr-5", { body: "Still flooded today" });
await as("012000016");
ok((await api.myNotifications()).some((n) => n.type === "GR_COMMENT" && n.reportId === "gr-5"), "staff notified of reporter comment");
await gr.addComment("gr-5", { body: "Pump arrives Monday", internal: true });
await as("012000004");
ok(!(await gr.listComments("gr-5")).some((c) => c.internal), "owner doesn't see internal notes");

// cancel + duplicate + reject
await as("012000001");
const c2 = await gr.createReport({ ...TK, category: "WATER", title: "Pipe leaking water", description: "Water leaking from a pipe on the corner." });
ok((await gr.cancelReport(c2.id, "Fixed already")).status === "CANCELLED", "owner cancels while SUBMITTED");
await as("012000007"); // not yet a supporter of gr-5
const d1 = await gr.createReport({ category: "DRAINAGE_FLOODING", title: "Flooded street again", description: "Flooding near Chbar Ampov bridge after rain", location: { lat: 11.5206, lng: 104.9311 }, locationSource: "GPS", provinceId: "phnom-penh", cityId: "mean-chey" });
await as("012000003");
const before = (await gr.getReport("gr-5")).supportCount;
await gr.markDuplicate(d1.id, "gr-5");
ok((await gr.getReport("gr-5")).supportCount === before + 1, "duplicate merges reporter into original's supporters");
await expectErr(gr.rejectReport("gr-3", ""), "VALIDATION", "reject needs a reason");
ok((await gr.rejectReport("gr-3", "Not a public road")).status === "REJECTED", "admin rejects with reason");

// dashboard
const dash = await gr.dashboard();
ok(dash.total >= 15 && dash.overdue >= 1 && dash.resolutionRate !== null && dash.departments.length === 8, "dashboard counts, overdue, rate, departments");
await as("012000015");
await expectErr(gr.dashboard(), "FORBIDDEN", "staff can't see admin dashboard");
done();
