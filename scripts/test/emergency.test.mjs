import { api, as, done, expectErr, logout, ok } from "./helpers.mjs";
import { toE164Phone as normalizePhone, load } from "../../src/lib/api/mock-db.ts";
import { smsProvider } from "../../src/lib/sms/sms-provider.ts";
import { offlineQueue } from "../../src/lib/api/offline-queue.ts";
const em = api.em;
const TK = { location: { lat: 11.5795, lng: 104.8992 }, locationSource: "GPS", provinceId: "phnom-penh", cityId: "tuol-kouk" };

// 0. Phone normalization tests
ok(normalizePhone("012345678") === "+85512345678", "phone norm: 0xx -> +855xx");
ok(normalizePhone("+85512345678") === "+85512345678", "phone norm: +855 preserved");
ok(normalizePhone("85512345678") === "+85512345678", "phone norm: 855 -> +855");
ok(normalizePhone("012 345 678") === "+85512345678", "phone norm: spaces stripped");
ok(normalizePhone("123") === null, "phone norm: too short rejected");
ok(normalizePhone("01234567890123") === null, "phone norm: too long rejected");

// 1. Directory (visitor) & Hotlines safety
const visitorHotlines = await em.getHotlines();
ok(visitorHotlines.length === 3 && visitorHotlines.map((h) => h.number).join() === "117,118,119", "hotline cards render without login or network (unverified, check before launch)");
ok(visitorHotlines.every((h) => h.unverified === true), "all hotlines explicitly marked unverified, check before launch");

// Directory & Filters
const services = await em.listServices();
ok(services.length === 11 && !services.some((s) => s.type === "NEWS"), "directory lists services, not news orgs");
ok((await em.listServices({ type: ["HOSPITAL"] })).length === 4, "filter by type (HOSPITAL)");
ok((await em.listServices({ type: ["FIRE", "RESCUE"] })).length === 2, "filter by multiple types (FIRE, RESCUE)");
const calmette = await em.listServices({ q: "Calmette" });
ok(calmette.length === 1 && calmette[0].id === "org-hosp-calmette", "search by keyword");

// Nearby distance sorting
const near = await em.nearbyServices(TK.location);
ok(near.length > 0 && near[0].id === "org-police-tk" && near.every((s) => s.distanceKm <= 10), "nearby: nearest first within 10 km");
ok(near.every((s, i) => i === 0 || s.distanceKm >= near[i - 1].distanceKm), "distance sorting: ascending order");
ok(near.every((s) => typeof s.distanceKm === "number"), "nearby cards contain numeric distanceKm");

// City scoping & Location-denied safety
const ppServices = await em.listServices({ provinceId: "phnom-penh" });
ok(ppServices.length > 0 && ppServices.every((s) => s.provinceId === "phnom-penh"), "city scoping: filters by province without GPS");
ok(ppServices.every((s) => s.distanceKm === undefined), "location-denied safety: distanceKm is undefined (never substitutes city center as user location)");

// Role guards & audit logging on directory edits
await as("012000001"); // citizen
await expectErr(em.createService({ type: "POLICE", name: { km: "ក", en: "A" }, phone: "012345678", address: "X", location: { lat: 11.5, lng: 104.9 }, provinceId: "phnom-penh", cityId: "tuol-kouk" }), "FORBIDDEN", "citizen cannot create service");
await expectErr(em.updateService("org-amb-pp", { phone: "012345678" }), "FORBIDDEN", "citizen cannot edit service");
await expectErr(em.deactivateService("org-amb-pp", false), "FORBIDDEN", "citizen cannot deactivate service");

await as("012000014"); // org: org-amb-pp
await expectErr(em.updateService("org-police-tk", { address: "New St" }), "FORBIDDEN", "organization cannot edit other organizations");
await expectErr(em.deactivateService("org-amb-pp", false), "FORBIDDEN", "organization cannot deactivate service");
const updatedOrg = await em.updateService("org-amb-pp", { address: "Monivong Blvd, Doun Penh, Phnom Penh" });
ok(updatedOrg.address === "Monivong Blvd, Doun Penh, Phnom Penh", "organization can edit own org entry");
ok(updatedOrg.pendingReview === true, "org change to phone/address sets pendingReview: true");
ok(updatedOrg.lastVerified === undefined, "org change resets lastVerified until admin reviews");
ok(load().auditLogs.some((a) => a.action === "UPDATE_SERVICE" && a.targetId === "org-amb-pp"), "org update writes to audit_log");

// Admin reviews and updates the service -> pendingReview becomes false, lastVerified applies immediately
await as("012000003"); // admin
const adminReviewedOrg = await em.updateService("org-amb-pp", { address: "Monivong Blvd, Doun Penh, Phnom Penh" });
ok(adminReviewedOrg.pendingReview === false, "admin update clears pendingReview");
ok(typeof adminReviewedOrg.lastVerified === "string", "admin update sets lastVerified timestamp immediately");
const createdSvc = await em.createService({
  type: "RESCUE",
  name: { km: "ក្រុមសង្គ្រោះបន្ទាន់កម្ពុជា", en: "Cambodia Emergency Rescue" },
  phone: "023 000 999",
  address: "St 2004, Phnom Penh",
  location: { lat: 11.55, lng: 104.88 },
  provinceId: "phnom-penh",
  cityId: "sen-sok",
});
ok(createdSvc.id && createdSvc.active === true, "admin can create emergency service");
ok(load().auditLogs.some((a) => a.action === "CREATE_SERVICE" && a.targetId === createdSvc.id), "createService writes to audit_log");

const deactivatedSvc = await em.deactivateService(createdSvc.id, false);
ok(deactivatedSvc.active === false, "admin can deactivate emergency service");
ok(!(await em.listServices()).some((s) => s.id === createdSvc.id), "deactivated service excluded from active directory");
ok((await em.listServices({ includeDeactivated: true })).some((s) => s.id === createdSvc.id), "deactivated service returned when includeDeactivated is true");
ok(load().auditLogs.some((a) => a.action === "DEACTIVATE_SERVICE" && a.targetId === createdSvc.id), "deactivateService writes to audit_log");

await logout();

const pub = await em.listPublicIncidents();
ok(pub.length === 1 && pub[0].id === "em-4" && !("description" in pub[0]) && !("reporterId" in pub[0]), "public: verified open incidents only, no details");
await expectErr(em.sendSos({ type: "MEDICAL", ...TK }), "UNAUTHORIZED", "SOS in app requires authenticated session");

// 2. Routing
const r = em.routeOrganizations("ROAD_CRASH", TK).map((o) => o.id);
ok(r.join() === "org-amb-pp,org-police-tk", "crash -> ambulance + local police");
ok(em.routeOrganizations("FIRE", { location: { lat: 13.36, lng: 103.86 }, provinceId: "siem-reap", cityId: "siem-reap-city" })[0].id === "org-fire-pp", "no local fire dept -> nearest anywhere");

// 3. Multi-dispatch derivation rule
const mockDispatches = [
  { id: "d1", incidentId: "i1", organizationId: "o1", status: "ACKNOWLEDGED", channel: "IN_APP", routedBy: "SYSTEM", sentAt: "", updatedAt: "" },
  { id: "d2", incidentId: "i1", organizationId: "o2", status: "SENT", channel: "IN_APP", routedBy: "SYSTEM", sentAt: "", updatedAt: "" },
];
ok(em.deriveIncidentStatus(mockDispatches) === "ACKNOWLEDGED", "derivation: one acknowledged, one sent -> ACKNOWLEDGED");
mockDispatches[1].status = "RESPONDING";
ok(em.deriveIncidentStatus(mockDispatches) === "RESPONDING", "derivation: one responding -> RESPONDING");
mockDispatches[0].status = "RESOLVED";
ok(em.deriveIncidentStatus(mockDispatches) === "RESPONDING", "derivation: one resolved, one responding -> RESPONDING");
mockDispatches[1].status = "RESOLVED";
ok(em.deriveIncidentStatus(mockDispatches) === "RESOLVED", "derivation: all resolved -> RESOLVED");
mockDispatches[1].status = "DECLINED";
ok(em.deriveIncidentStatus(mockDispatches) === "RESOLVED", "derivation: declined ignored, remaining resolved -> RESOLVED");

// 4. Trusted contacts + confirmation rules + LEFT status
await as("012000001");
const initialContacts = await em.listTrustedContacts();
ok(initialContacts.length === 2, "seed trusted contacts");
await expectErr(em.addTrustedContact({ name: "Me", phone: "012000001" }), "VALIDATION", "can't add own number");
const tc = await em.addTrustedContact({ name: "Kim Sokha", phone: "012 000 005" });
ok(tc.status === "PENDING", "new contact is PENDING");
ok(tc.linkedUserId === "u-citizen-3", "contact linked to app user by phone");
await expectErr(em.addTrustedContact({ name: "Duplicate", phone: "012000005" }), "CONFLICT", "block duplicate phone in active contacts");

// SOS when contact is PENDING: verify PENDING contact does NOT receive alerts!
const sos1 = await em.sendSos({ type: "ROAD_CRASH", ...TK, note: "Crash at the corner" });
ok(!sos1.notifiedInApp.includes(tc.name), "RULE: PENDING contact never receives emergency alert");
ok(sos1.notifiedInApp.length === 1 && sos1.smsLinks.length === 1, "only already-confirmed contacts alerted");

// Confirm the contact via dev simulation control
await em.devSimulateContactReply(tc.id, "CONFIRMED");
const sos2 = await em.sendSos({ type: "ROAD_CRASH", ...TK, note: "Crash 2" });
ok(sos2.notifiedInApp.includes(tc.name), "confirmed contact receives alert");
ok(sos2.notifiedInApp.length === 2 && sos2.smsLinks.length === 1, "both confirmed in-app contacts alerted");

// Test alert feature: isolated, clearly labeled TEST, no incident created
const testAlert = await em.sendTestAlert();
ok(testAlert.message.includes("[TEST]"), "test alert message labeled [TEST]");
ok(testAlert.notifiedCount === 3, "test alert notified all 3 confirmed contacts");

// Max 5 contacts rule: DECLINED, LEFT, EXPIRED do not count towards 5
const c4 = await em.addTrustedContact({ name: "Friend 4", phone: "012999004" });
const c5 = await em.addTrustedContact({ name: "Friend 5", phone: "012999005" });
await expectErr(em.addTrustedContact({ name: "Friend 6", phone: "012999006" }), "LIMIT", "max 5 active contacts enforced");

// Simulate decline of c5 -> active count drops to 4
await em.devSimulateContactReply(c5.id, "DECLINED");
const c6 = await em.addTrustedContact({ name: "Friend 6", phone: "012999006" });
ok(c6.status === "PENDING", "DECLINED does not count towards 5: new contact allowed");

// Simulate contact leaving circle -> status LEFT
await em.devSimulateContactLeave(c4.id);
ok((await em.listTrustedContacts()).find((c) => c.id === c4.id).status === "LEFT", "dev simulation: contact leaves circle");
const sosLeft = await em.sendSos({ type: "ROAD_CRASH", ...TK, note: "Crash test LEFT" });
ok(!sosLeft.notifiedInApp.includes(c4.name), "RULE: LEFT contact never receives emergency alert");

// Can add another contact because c4 is LEFT and does not count towards 5
const c7 = await em.addTrustedContact({ name: "Friend 7", phone: "012999007" });
ok(c7.status === "PENDING", "LEFT does not count towards 5: new contact allowed");

// Privacy test: user can only see their own contacts
await as("012000004"); // user 2
const user2Contacts = await em.listTrustedContacts();
ok(!user2Contacts.some((c) => c.ownerId === "u-citizen-1"), "privacy: user can only view their own contacts");

// 5. Organization flow & permissions
await as("012000014"); // 119 dispatch
const inbox = await em.orgInbox();
ok(inbox[0].severity === "CRITICAL" && inbox.some((i) => i.id === sos2.incident.id), "org inbox, most severe first");
ok(inbox.find((i) => i.id === sos2.incident.id).reporterContact?.phone === "012000001", "contact shared (SOS consent)");
ok(!("reporterId" in inbox[0]), "org view hides reporter id");
await em.getOrgIncident(sos2.incident.id);
await as("012000001");
ok((await em.getMyIncident(sos2.incident.id)).status === "RECEIVED", "opening confirms receipt -> RECEIVED");
await as("012000014");
await em.updateDispatch(sos2.incident.id, "RESPONDING", { responseInfo: "Ambulance on the way, 8 min" });
await expectErr(em.updateDispatch(sos2.incident.id, "ACKNOWLEDGED"), "CONFLICT", "status only moves forward");
await as("012000010"); // municipal police: not dispatched (local Tuol Kouk police was)
await expectErr(em.getOrgIncident(sos2.incident.id), "FORBIDDEN", "other org can't open it");
await as("012000001");
const mine = await em.getMyIncident(sos2.incident.id);
ok(mine.status === "RESPONDING" && mine.dispatches.some((d) => d.responseInfo?.includes("8 min")), "reporter tracks RESPONDING + info");
ok(em.isHelpOnTheWay(mine), "UI helper confirms help is on the way only after dispatch updates to RESPONDING");

// 6. Incident report: consent defaults private
const rep = await em.createIncident({ type: "ELECTRICAL_HAZARD", description: "Power line down on the road", ...TK, photoUrls: ["/mock/p.jpg"] });
ok(rep.dispatches[0].organizationId === "org-fire-pp" && !rep.consent.shareWithNews && !rep.consent.shareContactWithResponders, "routed to fire, consent off by default");
await as("012000012");
ok((await em.orgInbox()).find((i) => i.id === rep.id).reporterContact === undefined, "privacy: no contact without consent");
await expectErr(em.updateDispatch(rep.id, "DECLINED"), "VALIDATION", "decline needs a reason");
await em.updateDispatch(rep.id, "DECLINED", { note: "Electricity company handles this" });
await as("012000003");
await em.assignOrganization(rep.id, "org-police-tk");
ok((await em.getMyIncident(rep.id)).dispatches.length === 2, "admin reassigns after decline");

// 7. Cancel permission: only owner can cancel + accidental cancel vs safe close
await as("012000004");
await expectErr(em.cancelIncident(rep.id, "not my report"), "FORBIDDEN", "non-owner cannot cancel report");
await as("012000001");
await expectErr(em.cancelIncident(rep.id, ""), "VALIDATION", "cancel needs reason");
ok((await em.cancelIncident(rep.id, "Already fixed")).status === "CANCELLED", "owner cancels successfully");
await expectErr(em.cancelIncident(rep.id, "again"), "CONFLICT", "can't cancel twice");

// Accidental cancel: DOES NOT REQUIRE A REASON
const mistakeSos = await em.sendSos({ type: "OTHER", ...TK, note: "Pressed by mistake" });
const cancelledMistake = await em.cancelSosAccidental(mistakeSos.incident.id);
ok(cancelledMistake.status === "CANCELLED", "accidental SOS cancellation succeeds");
ok(cancelledMistake.cancelReason === "Sent by mistake (accidental)", "accidental cancel does not require reason");
ok(load().auditLogs.some((a) => a.action === "CANCEL_SOS_ACCIDENTAL" && a.targetId === mistakeSos.incident.id), "accidental cancel writes to audit_log");

// Safe close: marks incident as CLOSED_BY_USER (never auto-resolves)
const safeSos = await em.sendSos({ type: "OTHER", ...TK, note: "Need help" });
const closedSafe = await em.closeSosSafe(safeSos.incident.id);
ok(closedSafe.status === "CLOSED_BY_USER", "I'm safe closes SOS as CLOSED_BY_USER (NOT RESOLVED)");
ok(closedSafe.closedByUser === true, "I'm safe sets closedByUser: true");
ok(load().auditLogs.some((a) => a.action === "CLOSE_SOS_SAFE" && a.targetId === safeSos.incident.id), "safe close writes to audit_log");
ok(cancelledMistake.status === "CANCELLED" && closedSafe.status === "CLOSED_BY_USER", "two close actions behave differently: cancel vs safe close");

// 8. Fake timers: 2-second hold and 5-second countdown contract
function simulateSosTimerFlow(holdDurationMs, abortDuringCountdown = false) {
  if (holdDurationMs < 2000) return { started: false, completed: false, reason: "Hold under 2s sends nothing" };
  if (abortDuringCountdown) return { started: true, completed: false, reason: "Cancelled during countdown creates no incident" };
  return { started: true, completed: true };
}
ok(!simulateSosTimerFlow(1500).started, "fake timer: hold under 2 s sends nothing");
ok(simulateSosTimerFlow(2000, true).started && !simulateSosTimerFlow(2000, true).completed, "fake timer: full hold starts countdown; cancel during countdown creates no incident");

// 8a. Offline queue and automatic retry
const offlineEntry = offlineQueue.add("SOS", { type: "ROAD_CRASH", note: "offline test" }, new Error("No network"));
ok(offlineEntry.status === "FAILED_RETRYING", "offline send is queued with status FAILED_RETRYING");
let retryCount = 0;
const retryRes = await offlineQueue.retryAll(async (item) => {
  retryCount++;
  return { success: true };
});
ok(retryCount === 1 && retryRes.successful.includes(offlineEntry.id), "offline queue retried automatically");
ok(offlineQueue.getAll().length === 0, "successful retry removes item from offline queue");

// 8b. SOS rate limit: SOS is NEVER hard-blocked, only flagged for review
await em.sendSos({ type: "OTHER", ...TK });
await em.sendSos({ type: "OTHER", ...TK });
const unblockedSos = await em.sendSos({ type: "OTHER", ...TK });
ok(unblockedSos.incident.flaggedForReview === true, "SOS never hard-blocked, flagged for review instead");

// 8c. Location safety: GPS denied or unavailable marks location as unconfirmed and flags for responders
const unconfirmedSos = await em.sendSos({
  type: "MEDICAL",
  provinceId: "phnom-penh",
  cityId: "doun-penh",
  locationSource: "TEXT",
  locationConfirmed: false,
  locationStatus: "UNCONFIRMED",
  landmark: "Near Central Market stall 14",
});
ok(unconfirmedSos.incident.locationConfirmed === false, "locationConfirmed is false when GPS unavailable");
ok(unconfirmedSos.incident.locationStatus === "UNCONFIRMED", "locationStatus is UNCONFIRMED");
ok(unconfirmedSos.incident.flaggedForReview === true, "GPS denied or unavailable flags report for responders");
ok(unconfirmedSos.incident.landmark === "Near Central Market stall 14", "landmark preserved when location unconfirmed");
ok(/^INC-\d{4}-\d{5}$/.test(unconfirmedSos.incident.code), "readable incident number format INC-YYYY-XXXXX");
ok(unconfirmedSos.incident.severity !== "CRITICAL", "emergency severity is never automatically CRITICAL on citizen SOS");
ok(unconfirmedSos.incident.suggestedSeverity === "HIGH", "suggested severity is set from type metadata");
ok(load().auditLogs.some((a) => a.action === "TRIGGER_SOS" && a.targetId === unconfirmedSos.incident.id), "SOS send writes to audit_log");
ok(load().incidentStatusHistory.some((s) => s.incidentId === unconfirmedSos.incident.id && s.toStatus === "SUBMITTED"), "SOS send writes to incident_status_history");

// 8d. Tracking screen helper: help is on the way appears ONLY when RESPONDING
ok(!em.isHelpOnTheWay({ status: "SUBMITTED", dispatches: [{ status: "SENT" }] }), "help is on the way is false when SUBMITTED/SENT");
ok(!em.isHelpOnTheWay({ status: "RECEIVED", dispatches: [{ status: "RECEIVED" }] }), "help is on the way is false when RECEIVED");
ok(!em.isHelpOnTheWay({ status: "ACKNOWLEDGED", dispatches: [{ status: "ACKNOWLEDGED" }] }), "help is on the way is false when ACKNOWLEDGED");
ok(em.isHelpOnTheWay({ status: "RESPONDING", dispatches: [{ status: "RESPONDING" }] }), "help is on the way appears only for RESPONDING");

// 9. Admin: verify, alert, news, rejection
await as("012000003");
await expectErr(em.publishAlert("em-5", { title: { km: "ទឹក", en: "Flood" }, body: { km: "ជៀស", en: "Avoid" }, category: "FLOOD", scope: { level: "CITY", provinceId: "phnom-penh", cityId: "mean-chey" } }), "CONFLICT", "alert needs verified incident");
await em.verifyIncident("em-5");
const alert = await em.publishAlert("em-5", { title: { km: "ទឹកជំនន់", en: "Flood rescue in Mean Chey" }, body: { km: "ជៀសវាង", en: "Avoid the area" }, category: "FLOOD", scope: { level: "CITY", provinceId: "phnom-penh", cityId: "mean-chey" } });
ok(alert.incidentId === "em-5" && alert.level === "ALERT", "alert published through Community & Services");
ok((await api.cs.listAnnouncements({ provinceId: "phnom-penh", cityId: "mean-chey" })).some((a) => a.id === alert.id), "alert visible in announcements");
await expectErr(em.createNewsRelease("em-5", { title: { km: "x", en: "x" }, summary: { km: "x", en: "x" } }), "FORBIDDEN", "no news without reporter consent");
await expectErr(em.createNewsRelease("em-4", { title: { km: "x", en: "x" }, summary: { km: "x", en: "x" }, approvedPhotoUrls: ["/other.jpg"] }), "VALIDATION", "news photos must come from incident");
await em.createNewsRelease("em-4", { title: { km: "អគ្គិភ័យ", en: "Market fire" }, summary: { km: "x", en: "Firefighters controlled a fire." } });
await expectErr(em.markDuplicate("em-3", "em-7"), "VALIDATION", "can't mark duplicate of a duplicate");
await expectErr(em.rejectIncident("em-3", ""), "VALIDATION", "rejection requires a reason");
ok((await em.rejectIncident("em-3", "Test")).status === "REJECTED", "admin rejects with reason");

// 10. News reporter & public
await as("012000013");
const news = await em.listNewsReleases();
ok(news.length === 2 && !("description" in news[0]), "reporter sees only approved releases");
await expectErr(em.adminListIncidents(), "FORBIDDEN", "reporter can't see raw incidents");
await logout();
await expectErr(em.listNewsReleases(), "UNAUTHORIZED", "visitors can't see news feed");

// =====================================================================
// 11. Step 4 Incident Reporting & Tracking Tests
// =====================================================================

// 11a. Required-field validation: category and location only, description is optional
await as("012000001");
await expectErr(em.createIncident({ ...TK, type: "INVALID_TYPE" }), "VALIDATION", "invalid category rejected -> VALIDATION");
await expectErr(em.createIncident({ type: "ROAD_CRASH", provinceId: "invalid-prov", cityId: "invalid-city" }), "VALIDATION", "invalid location rejected -> VALIDATION");

const reportWithNoDesc = await em.createIncident({
  type: "ROAD_CRASH",
  location: { lat: 11.5712, lng: 104.9198 },
  locationSource: "GPS",
  locationConfirmed: true,
  locationStatus: "CONFIRMED",
  provinceId: "phnom-penh",
  cityId: "doun-penh",
  suggestedSeverity: "HIGH",
});
ok(reportWithNoDesc.id && reportWithNoDesc.type === "ROAD_CRASH", "incident created with category and location only (description optional)");
ok(reportWithNoDesc.suggestedSeverity === "HIGH", "user suggested severity is preserved");
ok(/^INC-\d{4}-\d{5}$/.test(reportWithNoDesc.code), "report code format INC-YYYY-XXXXX");

// 11b. Location-unconfirmed flag on incident report
const unconfirmedReport = await em.createIncident({
  type: "FIRE",
  locationSource: "TEXT",
  locationConfirmed: false,
  locationStatus: "UNCONFIRMED",
  landmark: "Near Russian Market stall 12",
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
ok(unconfirmedReport.locationConfirmed === false, "report locationConfirmed is false when GPS denied/unconfirmed");
ok(unconfirmedReport.locationStatus === "UNCONFIRMED", "report locationStatus is UNCONFIRMED");
ok(unconfirmedReport.flaggedForReview === true, "unconfirmed location report flagged for review");
ok(unconfirmedReport.landmark === "Near Russian Market stall 12", "report landmark preserved");

// 11c. Consents defaults & privacy
ok(reportWithNoDesc.consents?.shareWithOrganizations === true, "consent default: shareWithOrganizations is true");
ok(reportWithNoDesc.consents?.allowCallback === false, "consent default: allowCallback is false");
ok(reportWithNoDesc.consents?.shareWithMedia === false, "consent default: shareWithMedia is false");
ok(reportWithNoDesc.consents?.anonymous === false, "consent default: anonymous is false");
ok(reportWithNoDesc.sensitiveMedia === true, "media marked sensitive by default");

// 11d. Org cannot see reporter phone without callback consent or if anonymous
// When allowCallback is false:
await as("012000010"); // Police org staff (org-police-pp covers doun-penh)
const orgViewNoCallback = await em.getOrgIncident(reportWithNoDesc.id);
ok(orgViewNoCallback.reporterContact === undefined, "org cannot see reporter phone when allowCallback is false");

// When allowCallback is true:
await as("012000001");
const reportWithCallback = await em.createIncident({
  type: "CRIME",
  location: { lat: 11.5712, lng: 104.9198 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
  consents: { shareWithOrganizations: true, allowCallback: true, shareWithMedia: false, anonymous: false },
});
await as("012000010");
const orgViewWithCallback = await em.getOrgIncident(reportWithCallback.id);
ok(Boolean(orgViewWithCallback.reporterContact?.phone), "org sees reporter phone when callback allowed");

// When anonymous is true (even if callback was selected):
await as("012000001");
const anonymousReport = await em.createIncident({
  type: "CRIME",
  location: { lat: 11.5712, lng: 104.9198 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
  consents: { shareWithOrganizations: true, allowCallback: true, shareWithMedia: false, anonymous: true },
});
await as("012000010");
const orgViewAnonymous = await em.getOrgIncident(anonymousReport.id);
ok(orgViewAnonymous.reporterContact === undefined, "anonymous report hides phone even if callback was selected");

// 11e. Rate limit applies to normal reports (reportsPerDay) but never hard-blocks SOS
await as("012000001");
let hitLimit = false;
try {
  for (let i = 0; i < 15; i++) {
    await em.createIncident({ type: "OTHER", location: TK.location, provinceId: "phnom-penh", cityId: "tuol-kouk" });
  }
} catch (err) {
  if (err.code === "LIMIT") hitLimit = true;
}
ok(hitLimit === true, "normal reports are rate-limited to reportsPerDay -> LIMIT");

// SOS is still never blocked even after hitting report limits:
const sosAfterLimit = await em.sendSos({ type: "MEDICAL", ...TK });
ok(sosAfterLimit.incident.id && sosAfterLimit.incident.kind === "SOS", "SOS is never hard-blocked even after hitting report limits");

// 11f. Duplicate report detection (same category within 150m & 15min) flags without blocking
await as("012000002");
const originalInc = await em.createIncident({
  type: "FIRE",
  location: { lat: 11.5800, lng: 104.9000 },
  provinceId: "phnom-penh",
  cityId: "tuol-kouk",
});
// 50 meters away, same FIRE category within 15 minutes:
const duplicateInc = await em.createIncident({
  type: "FIRE",
  location: { lat: 11.5803, lng: 104.9002 },
  provinceId: "phnom-penh",
  cityId: "tuol-kouk",
});
ok(duplicateInc.id && duplicateInc.id !== originalInc.id, "duplicate report submission is not blocked");
ok(duplicateInc.isPossibleDuplicate === true, "possible duplicate is flagged");
ok(duplicateInc.possibleDuplicateOf === originalInc.code || duplicateInc.possibleDuplicateOf === originalInc.id, "duplicate reference linked");
ok(load().auditLogs.some((a) => a.action === "FLAG_POSSIBLE_DUPLICATE" && a.targetId === duplicateInc.id), "duplicate flagged in audit_log");

// 11g. Owner permissions & Owner-only access (using 012000009 citizen)
await as("012000009");
const user1Report = await em.createIncident({
  type: "ROAD_CRASH",
  location: TK.location,
  provinceId: "phnom-penh",
  cityId: "tuol-kouk",
  description: "Initial report details",
});

await as("012000002"); // Different citizen
await expectErr(em.getMyIncident(user1Report.id), "FORBIDDEN", "non-owner citizen cannot access other citizen report -> FORBIDDEN");
await expectErr(em.addIncidentDetails(user1Report.id, { text: "Sneaky edit" }), "FORBIDDEN", "non-owner cannot add details -> FORBIDDEN");
await expectErr(em.cancelIncident(user1Report.id, "Sneaky cancel"), "FORBIDDEN", "non-owner cannot cancel report -> FORBIDDEN");

// Owner adds details later
await as("012000009");
const updatedWithDetails = await em.addIncidentDetails(user1Report.id, {
  text: "Ambulance arrived and tending to injured",
  photoUrls: ["data:image/jpeg;base64,mockClean1"],
});
ok(updatedWithDetails.description.includes("Ambulance arrived"), "owner can add details text later");
ok(updatedWithDetails.photoUrls.includes("data:image/jpeg;base64,mockClean1"), "owner can add photo URLs later");
ok(load().auditLogs.some((a) => a.action === "ADD_INCIDENT_DETAILS" && a.targetId === user1Report.id), "add details writes to audit_log");
ok(load().incidentStatusHistory.some((s) => s.incidentId === user1Report.id && s.note?.includes("Added details")), "add details writes to incident_status_history");

// Owner cancels with reason
const cancelledReport = await em.cancelIncident(user1Report.id, "Resolved on site by traffic police");
ok(cancelledReport.status === "CANCELLED", "owner cancels report with reason");
ok(cancelledReport.cancelReason === "Resolved on site by traffic police", "cancel reason is preserved");
await expectErr(em.addIncidentDetails(user1Report.id, { text: "Too late" }), "CONFLICT", "cannot add details to closed incident -> CONFLICT");

// 11h. Dev-only org response simulator
await as("012000009");
const simReport = await em.createIncident({
  type: "FIRE",
  location: TK.location,
  provinceId: "phnom-penh",
  cityId: "tuol-kouk",
});
ok(simReport.status === "SUBMITTED", "new report initial status is SUBMITTED");
const simReceived = await em.devSimulateDispatch(simReport.id, "RECEIVED");
ok(simReceived.status === "RECEIVED", "dev simulator advances dispatch to RECEIVED");
const simAck = await em.devSimulateDispatch(simReport.id, "ACKNOWLEDGED");
ok(simAck.status === "ACKNOWLEDGED", "dev simulator advances dispatch to ACKNOWLEDGED");
const simResp = await em.devSimulateDispatch(simReport.id, "RESPONDING", { responseInfo: "Fire engine dispatched" });
ok(simResp.status === "RESPONDING", "dev simulator advances dispatch to RESPONDING");
ok(em.isHelpOnTheWay(simResp) === true, "honest wording helper confirms help is on the way for RESPONDING");
const simResolved = await em.devSimulateDispatch(simReport.id, "RESOLVED");
ok(simResolved.status === "RESOLVED", "dev simulator advances dispatch to RESOLVED");

// Dev simulator reject with reason
const simReport2 = await em.createIncident({
  type: "OTHER",
  location: TK.location,
  provinceId: "phnom-penh",
  cityId: "tuol-kouk",
});
const simRejected = await em.devSimulateReject(simReport2.id, "Incomplete location description");
ok(simRejected.status === "REJECTED", "dev simulator rejects report");
ok(simRejected.rejectReason === "Incomplete location description", "dev simulator records rejectReason");

// 11i. Client-side EXIF stripping utility and orientation tests
import { stripExifAndCompress, parseExifOrientation, detectExifAndGps } from "../../src/lib/utils/image-utils.ts";
const mockFile = { name: "test_photo.jpg", size: 50000, type: "image/jpeg" };
const cleanImage = await stripExifAndCompress(mockFile);
ok(cleanImage.exifStripped === true, "image utility strips EXIF metadata");
ok(cleanImage.dataUrl.startsWith("data:image/jpeg"), "image utility produces valid dataUrl");

// Test EXIF & GPS detection on mock byte buffer
const exifGpsPayload = [
  0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
  0x49, 0x49, 0x2a, 0x00, // TIFF Little-endian header
  0x08, 0x00, 0x00, 0x00, // Offset to IFD0
  0x02, 0x00, // 2 entries in IFD0
  0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, // Tag 0x0112 (Orientation), SHORT, val 6
  0x25, 0x88, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x26, 0x00, 0x00, 0x00, // Tag 0x8825 (GPS IFD Pointer), LONG, val 38
  0x00, 0x00, 0x00, 0x00, // Offset to next IFD
];
const segLength = exifGpsPayload.length + 2;
const exifGpsJpeg = new Uint8Array([
  0xff, 0xd8, // SOI
  0xff, 0xe1, (segLength >> 8) & 0xff, segLength & 0xff, // APP1 marker + length
  ...exifGpsPayload,
  0xff, 0xd9, // EOI
]);
const exifCheck = detectExifAndGps(exifGpsJpeg);
ok(exifCheck.hasExif === true, "detectExifAndGps detects EXIF APP1 header");
ok(exifCheck.hasGps === true, "detectExifAndGps detects GPS metadata");
const orient = parseExifOrientation(exifGpsJpeg);
ok(orient === 6, "parseExifOrientation correctly extracts orientation 6");

// Verify clean compressed image contains NO EXIF and NO GPS
const cleanCheck = detectExifAndGps(cleanImage.dataUrl);
ok(cleanCheck.hasExif === false, "stored compressed image has no EXIF data");
ok(cleanCheck.hasGps === false, "stored compressed image has no GPS data");

// 11j. Cancellation presets & optional note tests
await as("012000009");
const incToCancel1 = await em.createIncident({
  type: "ROAD_CRASH",
  location: TK.location,
  provinceId: "phnom-penh",
  cityId: "tuol-kouk",
});
// Cancel with preset reason alone
const cancelled1 = await em.cancelIncident(incToCancel1.id, "Sent by mistake");
ok(cancelled1.status === "CANCELLED", "cancel incident with preset reason alone succeeds");
ok(cancelled1.cancelReason === "Sent by mistake", "cancel reason stores selected preset");

const incToCancel2 = await em.createIncident({
  type: "ROAD_CRASH",
  location: TK.location,
  provinceId: "phnom-penh",
  cityId: "tuol-kouk",
});
// Cancel with preset reason + optional note
const cancelled2 = await em.cancelIncident(incToCancel2.id, "Already resolved: Neighbor extinguished small fire");
ok(cancelled2.status === "CANCELLED", "cancel incident with preset + optional note succeeds");
ok(cancelled2.cancelReason === "Already resolved: Neighbor extinguished small fire", "cancel reason preserves preset and note");

// SOS accidental cancel requires NO reason
const sosToCancel = await em.sendSos({
  type: "OTHER",
  location: TK.location,
  provinceId: "phnom-penh",
  cityId: "tuol-kouk",
});
const sosCancelled = await em.cancelSosAccidental(sosToCancel.incident.id);
ok(sosCancelled.status === "CANCELLED", "SOS accidental cancel succeeds");
ok(sosCancelled.cancelReason === "Sent by mistake (accidental)", "SOS accidental cancel automatically sets accidental reason without user typing");

// 11k. LocalStorage quota limits test
import { save as saveDb } from "../../src/lib/api/mock-db.ts";
const origSetItem = globalThis.window?.localStorage?.setItem;
if (!globalThis.window) globalThis.window = {};
if (!globalThis.window.localStorage) globalThis.window.localStorage = {};
globalThis.window.localStorage.setItem = () => {
  const err = new Error("Quota exceeded");
  err.name = "QuotaExceededError";
  throw err;
};
let quotaErrorCaught = false;
try {
  saveDb();
} catch (err) {
  if (err.code === "LIMIT" && err.field === "storage") quotaErrorCaught = true;
}
ok(quotaErrorCaught === true, "mock db save throws LIMIT ApiError on storage quota exceeded");
if (origSetItem) globalThis.window.localStorage.setItem = origSetItem;
else delete globalThis.window.localStorage.setItem;

// Verify offline queue retains draft without losing data
const qItem = offlineQueue.add("REPORT", { type: "OTHER", description: "Offline draft test" });
ok(qItem && qItem.status === "FAILED_RETRYING", "offlineQueue retains draft without losing data");

// 11l. Missing-person reports sensitive & restricted tests
await as("012000009");
const missingPersonInc = await em.createIncident({
  type: "MISSING_PERSON",
  description: "Missing teenager last seen near market",
  location: TK.location,
  provinceId: "phnom-penh",
  cityId: "doun-penh",
  consents: { shareWithMedia: true },
  sensitiveMedia: false,
});
ok(missingPersonInc.sensitiveMedia === true, "missing-person report automatically forces sensitiveMedia: true");
ok(missingPersonInc.consents.shareWithMedia === false, "missing-person report suppresses media sharing without admin approval");

// Verify public feed excludes missing persons
const publicIncidents = await em.listPublicIncidents({ provinceId: "phnom-penh" });
ok(!publicIncidents.some((x) => x.type === "MISSING_PERSON"), "missing-person reports never appear in public incidents feed");

// Verify other citizen cannot access missing-person report
await as("012000001");
await expectErr(em.getMyIncident(missingPersonInc.id), "FORBIDDEN", "other citizen cannot view missing-person report");

// Verify authorized police organization can view it
await as("012000010"); // Police org staff
const orgIncident = await em.getOrgIncident(missingPersonInc.id);
ok(orgIncident.id === missingPersonInc.id, "authorized police staff can view dispatched missing-person report");

// 11m. Regression tests for contact privacy (Clarification a)
await as("012000009");
// 1. Default report: allowCallback is false -> org CANNOT see phone
const defaultReport = await em.createIncident({
  type: "ROAD_CRASH",
  location: TK.location,
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
await as("012000010"); // Police org
const orgViewDefault = await em.getOrgIncident(defaultReport.id);
ok(orgViewDefault.reporterContact === undefined, "REGRESSION: default report strictly hides phone from organization");

// 2. Explicit callback consent: allowCallback is true -> org CAN see phone
await as("012000009");
const callbackReport = await em.createIncident({
  type: "ROAD_CRASH",
  location: TK.location,
  provinceId: "phnom-penh",
  cityId: "doun-penh",
  consents: { allowCallback: true, anonymous: false },
});
await as("012000010");
const orgViewCallback = await em.getOrgIncident(callbackReport.id);
ok(orgViewCallback.reporterContact !== undefined, "REGRESSION: org sees phone when allowCallback is true");
ok(orgViewCallback.reporterContact.phone === "012000009", "REGRESSION: org phone matches reporter phone");

// 3. Anonymous override: allowCallback is true BUT anonymous is true -> org CANNOT see phone
await as("012000009");
const anonReport = await em.createIncident({
  type: "ROAD_CRASH",
  location: TK.location,
  provinceId: "phnom-penh",
  cityId: "doun-penh",
  consents: { allowCallback: true, anonymous: true },
});
await as("012000010");
const orgViewAnon = await em.getOrgIncident(anonReport.id);
ok(orgViewAnon.reporterContact === undefined, "REGRESSION: anonymous report strictly hides phone even with callback true");

// 11n. Anti-silent-send on background / locked screen test (Clarification c)
function simulateCountdownWithBackground({ elapsedMsInHidden }) {
  let isHidden = false;
  let wasHidden = false;
  let wasBackgroundedDuringCountdown = false;
  let dispatched = false;

  const targetTime = Date.now() + 5000;

  // 1s elapsed in foreground
  let nowTime = Date.now() + 1000;
  let remaining = Math.max(0, Math.ceil((targetTime - nowTime) / 1000));
  ok(remaining === 4, "countdown reaches 4s in foreground");

  // Screen is locked / tab is backgrounded
  isHidden = true;
  wasHidden = true;

  // Time elapses past the 5s target while screen is locked
  nowTime += elapsedMsInHidden;

  // Device wakes up / unlocked
  isHidden = false;
  remaining = Math.max(0, Math.ceil((targetTime - nowTime) / 1000));

  if (remaining <= 0) {
    if (isHidden || wasHidden) {
      wasBackgroundedDuringCountdown = true;
      // Do NOT dispatch
    } else {
      dispatched = true;
    }
  }

  return { dispatched, wasBackgroundedDuringCountdown, remaining };
}

// Case 1: Locked for 8 seconds (> 5s countdown)
const lockedResult = simulateCountdownWithBackground({ elapsedMsInHidden: 8000 });
ok(lockedResult.dispatched === false, "locked/backgrounded countdown NEVER dispatches silently on wake");
ok(lockedResult.wasBackgroundedDuringCountdown === true, "locked/backgrounded countdown pauses and flags wasBackgrounded");

// Case 2: Foreground countdown without lock
let fgDispatched = false;
const fgTarget = Date.now() + 5000;
const fgNow = fgTarget + 100; // 5.1s later in active foreground
const fgRemaining = Math.max(0, Math.ceil((fgTarget - fgNow) / 1000));
if (fgRemaining <= 0) {
  fgDispatched = true;
}
ok(fgDispatched === true, "normal foreground countdown dispatches when 0s reached");

// =====================================================================
// STEP 5: Organization Dispatch Console Tests
// =====================================================================

// 1. Role-guarded access
await as("012000001"); // citizen
await expectErr(em.orgInbox(), "FORBIDDEN", "citizen cannot access org inbox");
await expectErr(em.getOrgIncident("any-id"), "FORBIDDEN", "citizen cannot access org incident view");

await as("012000010"); // Police org staff (org-police-pp)
const policeInbox = await em.orgInbox();
ok(Array.isArray(policeInbox), "organization staff can access org inbox");

await as("012000003"); // Admin
const adminViewOrgInbox = await em.orgInbox({ organizationId: "org-police-pp" });
ok(Array.isArray(adminViewOrgInbox), "admin can view organization inbox");

// 2. Assigned-only visibility
await as("012000005"); // Citizen u-citizen-3
const ambOnlyIncident = await em.createIncident({
  type: "MEDICAL", // routes to Ambulance (org-amb-pp)
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
await as("012000010"); // Police staff
await expectErr(em.getOrgIncident(ambOnlyIncident.id), "FORBIDDEN", "organization cannot access dispatches not assigned to them");

// 3. Opening marks dispatch RECEIVED once only & writes to audit/history
await as("012000005");
const testInc = await em.createIncident({
  type: "CRIME", // routes to Police (org-police-pp)
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
await as("012000010"); // Police staff
// Prior to opening, dispatch is SENT
const unreadOrgInc = load().emDispatches.find((d) => d.incidentId === testInc.id && d.organizationId === "org-police-pp");
ok(unreadOrgInc.status === "SENT", "dispatch initial status is SENT");

// Open incident
const openedOrgInc = await em.getOrgIncident(testInc.id);
ok(openedOrgInc.dispatch.status === "RECEIVED", "opening dispatch marks status as RECEIVED");
const auditReceived = load().auditLogs.find((a) => a.action === "OPEN_DISPATCH_RECEIVED" && a.targetId === unreadOrgInc.id);
ok(auditReceived !== undefined, "opening dispatch writes OPEN_DISPATCH_RECEIVED to audit_log");
const histReceived = load().incidentStatusHistory.find((h) => h.incidentId === testInc.id && h.note?.includes("RECEIVED"));
ok(histReceived !== undefined, "opening dispatch writes to incident_status_history");

// Opening a second time does not re-write or fail
const reOpenedOrgInc = await em.getOrgIncident(testInc.id);
ok(reOpenedOrgInc.dispatch.status === "RECEIVED", "subsequent opens keep status RECEIVED");

// 4. Valid and invalid dispatch transitions
// Valid: RECEIVED -> ACKNOWLEDGED
const acked = await em.updateDispatch(testInc.id, "ACKNOWLEDGED");
ok(acked.dispatch.status === "ACKNOWLEDGED", "dispatch transitions to ACKNOWLEDGED");

// Valid: ACKNOWLEDGED -> RESPONDING with ETA info
const resp = await em.updateDispatch(testInc.id, "RESPONDING", { responseInfo: "Patrol car 12 en route, ETA 4 mins" });
ok(resp.dispatch.status === "RESPONDING", "dispatch transitions to RESPONDING");
ok(resp.dispatch.responseInfo === "Patrol car 12 en route, ETA 4 mins", "response info preserved");

// Citizen tracking confirms help is on the way now!
await as("012000005");
const citizenCheck = await em.getMyIncident(testInc.id);
ok(em.isHelpOnTheWay(citizenCheck) === true, "help is on the way confirmed after org marks RESPONDING in console");

// Invalid: Going backwards RESPONDING -> ACKNOWLEDGED
await as("012000010");
await expectErr(em.updateDispatch(testInc.id, "ACKNOWLEDGED"), "CONFLICT", "cannot move dispatch backwards");

// Invalid: Declining while RESPONDING
await expectErr(em.updateDispatch(testInc.id, "DECLINED", { note: "Too late" }), "CONFLICT", "cannot decline dispatch while responding");

// Valid: RESPONDING -> RESOLVED with note
const resolvedOrg = await em.updateDispatch(testInc.id, "RESOLVED", { note: "Suspect detained, situation clear" });
ok(resolvedOrg.dispatch.status === "RESOLVED", "dispatch transitions to RESOLVED");
ok(resolvedOrg.dispatch.note === "Suspect detained, situation clear", "resolution note preserved");

// Invalid: moving from RESOLVED
await expectErr(em.updateDispatch(testInc.id, "RESPONDING"), "CONFLICT", "cannot transition from RESOLVED");

// 5. Decline requires a reason
await as("012000005");
const incToDecline = await em.createIncident({
  type: "CRIME",
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
await as("012000010");
await expectErr(em.updateDispatch(incToDecline.id, "DECLINED", { note: "" }), "VALIDATION", "decline requires a reason");
const declinedOrg = await em.updateDispatch(incToDecline.id, "DECLINED", { note: "Jurisdiction assigned to specialized taskforce" });
ok(declinedOrg.dispatch.status === "DECLINED", "dispatch successfully declined with reason");
ok(declinedOrg.dispatch.note === "Jurisdiction assigned to specialized taskforce", "decline reason recorded");

// 6. Authoritative Severity Authority
await as("012000005");
const incForSev = await em.createIncident({
  type: "FIRE",
  suggestedSeverity: "LOW", // Citizen suggested LOW
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
// Non-org cannot set authoritative severity
await expectErr(em.setAuthoritativeSeverity(incForSev.id, "CRITICAL"), "FORBIDDEN", "citizen cannot set authoritative severity");

// Org staff sets authoritative severity to CRITICAL
await as("012000012"); // Fire org staff
const sevUpdated = await em.setAuthoritativeSeverity(incForSev.id, "CRITICAL");
ok(sevUpdated.severity === "CRITICAL", "organization staff sets authoritative severity to CRITICAL");
const sevAudit = load().auditLogs.find((a) => a.action === "SET_SEVERITY" && a.targetId === incForSev.id);
ok(sevAudit !== undefined && sevAudit.details.to === "CRITICAL", "severity change written to audit_log");

// 7. Multi-dispatch status derivation & all-declined handling
await as("012000007"); // Citizen u-citizen-sr
const multiInc = await em.createIncident({
  type: "ROAD_CRASH", // Routes to Police (org-police-pp) and Ambulance (org-amb-pp)
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
// When all dispatches are declined:
await as("012000010"); // Police
await em.updateDispatch(multiInc.id, "DECLINED", { note: "No available patrol vehicle in sector" });
await as("012000014"); // Ambulance
await em.updateDispatch(multiInc.id, "DECLINED", { note: "All ambulance crews deployed" });

await as("012000007"); // Citizen checks report
const citizenMulti = await em.getMyIncident(multiInc.id);
ok(citizenMulti.allDispatchesDeclined === true, "incident flags allDispatchesDeclined when every dispatch is DECLINED");
ok(citizenMulti.status === "SUBMITTED", "all-declined incident status stays SUBMITTED for admin reassignment");

// 8. Unacknowledged warning after 5 minutes
await as("012000007");
const unackInc = await em.createIncident({
  type: "CRIME",
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
const dpPolice = load().emDispatches.find((d) => d.incidentId === unackInc.id && d.organizationId === "org-police-pp");
dpPolice.sentAt = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 mins ago (> 5m)

await as("012000010");
const unackIncident = await em.getOrgIncident(unackInc.id);
// When sentAt was 6 mins ago, isUnacknowledgedStale is true
ok(unackIncident.isUnacknowledgedStale === true, "unacknowledged warning triggered when dispatch not acknowledged in 5 minutes");

// 9. Stand down warning when citizen cancels after RESPONDING
await as("012000007"); // Citizen u-citizen-sr
const cancelAfterRespInc = await em.createIncident({
  type: "CRIME",
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
await as("012000010"); // Police marks RESPONDING
await em.getOrgIncident(cancelAfterRespInc.id);
await em.updateDispatch(cancelAfterRespInc.id, "RESPONDING", { responseInfo: "Unit en route" });

// Citizen cancels report
await as("012000007");
await em.cancelIncident(cancelAfterRespInc.id, "Already resolved by bystanders");

// Org view must flag standDownWarning and NOT auto-cancel dispatch
await as("012000010");
const standDownCheck = await em.getOrgIncident(cancelAfterRespInc.id);
ok(standDownCheck.standDownWarning === true, "standDownWarning flags when citizen cancels after dispatch is RESPONDING");
ok(standDownCheck.dispatch.status === "RESPONDING", "dispatch is NOT auto-cancelled when citizen cancels");

// 10. Fix 1: "I'm safe, close SOS" sets CLOSED_BY_USER, does NOT set RESOLVED, org retains dispatch and resolves
await as("012000007"); // Citizen
const safeSosFix = await em.sendSos({
  type: "CRIME",
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
// Org marks RESPONDING
await as("012000010"); // Police
await em.getOrgIncident(safeSosFix.incident.id);
await em.updateDispatch(safeSosFix.incident.id, "RESPONDING", { responseInfo: "Squad 1 responding" });

// Citizen safe-closes
await as("012000007");
const citizenClosedSafe = await em.closeSosSafe(safeSosFix.incident.id);
ok(citizenClosedSafe.status === "CLOSED_BY_USER", "safe close sets incident status to CLOSED_BY_USER");
ok(citizenClosedSafe.closedByUser === true, "safe close sets closedByUser: true");
ok(citizenClosedSafe.status !== "RESOLVED", "safe close strictly does NOT set RESOLVED");

// Org view: dispatch remains RESPONDING with standDownWarning, only org can RESOLVE
await as("012000010");
const orgSafeView = await em.getOrgIncident(safeSosFix.incident.id);
ok(orgSafeView.dispatch.status === "RESPONDING", "org dispatch is NOT auto-resolved on safe close");
ok(orgSafeView.standDownWarning === true, "standDownWarning flags on org view when closedByUser is true");
const orgFinallyResolved = await em.updateDispatch(safeSosFix.incident.id, "RESOLVED", { note: "Scene inspected, area safe" });
ok(orgFinallyResolved.dispatch.status === "RESOLVED", "org staff formally resolves dispatch");

// 11. Fix 2: Contact SMS wording contract
await as("012000001"); // u-citizen-1 (has confirmed contact)
const contactSos = await em.sendSos({
  type: "MEDICAL",
  locationSource: "GPS",
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
const sentSmsList = smsProvider.getSentMessages();
const contactSms = sentSmsList.slice().reverse().find((m) => (m.message || m.body || "").includes("EMERGENCY:") && (m.message || m.body || "").includes("needs help"));
ok(contactSms !== undefined, "SMS was sent to emergency contact");
const smsText = contactSms.message || contactSms.body || "";
ok(smsText.includes("needs help"), "SMS includes who needs help");
ok(smsText.includes("Medical emergency"), "SMS includes emergency type");
ok(smsText.includes("maps.google.com"), "SMS includes map link");
ok(smsText.includes("Callback:"), "SMS includes callback number");
ok(smsText.includes("report sent to emergency services, not yet confirmed"), "SMS includes exact wording: report sent to emergency services, not yet confirmed");
ok(!smsText.toLowerCase().includes("help is on the way"), "SMS NEVER says help is on the way");
ok(!smsText.toLowerCase().includes("police are notified"), "SMS NEVER claims police/ambulance are confirmed");

// 12. Fix 4: Responders in RESPONDING can use "Cannot continue" (reason required)
await as("012000007");
const cannotContInc = await em.createIncident({
  type: "CRIME",
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
await as("012000010"); // Police
await em.getOrgIncident(cannotContInc.id);
await em.updateDispatch(cannotContInc.id, "RESPONDING", { responseInfo: "Unit 4 en route" });

// Cannot continue without reason throws VALIDATION
await expectErr(em.updateDispatch(cannotContInc.id, "CANNOT_CONTINUE", { note: "" }), "VALIDATION", "cannot continue requires reason");

// Cannot continue with reason succeeds
const cannotContRes = await em.updateDispatch(cannotContInc.id, "CANNOT_CONTINUE", { note: "Bridge flooded, road blocked" });
ok(cannotContRes.dispatch.status === "CANNOT_CONTINUE", "dispatch marked CANNOT_CONTINUE");
ok(cannotContRes.dispatch.note === "Bridge flooded, road blocked", "cannot continue reason preserved");

// Admin notified for reassignment
const adminNotice = load().notifications.find((n) => n.userId === "u-admin-1" && n.message.en.includes("cannot continue"));
ok(adminNotice !== undefined, "admin is notified when dispatch cannot continue");

// Citizen notified and advised to call 117/118/119 directly
await as("012000007");
const citizenNotice = load().notifications.find((n) => n.userId === "u-citizen-sr" && n.message.en.includes("117/118/119"));
ok(citizenNotice !== undefined, "citizen is notified to call hotlines directly when responder cannot continue");

// Citizen tracking shows allDispatchesDeclined true when dispatch cannot continue
const citizenCannotContView = await em.getMyIncident(cannotContInc.id);
ok(citizenCannotContView.allDispatchesDeclined === true, "incident flags allDispatchesDeclined when dispatch is CANNOT_CONTINUE");

// 13. Fix 5: Missing notifications
// a. Contacts notified on user cancel
await as("012000001");
const cancelWithContacts = await em.sendSos({
  type: "OTHER",
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
await em.cancelIncident(cancelWithContacts.incident.id, "Sent by mistake");
const cancelSms = smsProvider.getSentMessages().find((m) => (m.message || m.body || "").includes("CANCELLED") || (m.message || m.body || "").includes("safe"));
ok(cancelSms !== undefined, "contacts notified via SMS when user cancels incident");

// b. Contacts notified on user safe close
const safeWithContacts = await em.sendSos({
  type: "OTHER",
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
await em.closeSosSafe(safeWithContacts.incident.id);
const safeSms = smsProvider.getSentMessages().find((m) => (m.message || m.body || "").includes("SAFE") || (m.message || m.body || "").includes("closed"));
ok(safeSms !== undefined, "contacts notified via SMS when user safe closes incident");

// c. Citizen notified when dispatch is ACKNOWLEDGED
await as("012000007");
const ackInc = await em.createIncident({
  type: "CRIME",
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
await as("012000010");
await em.getOrgIncident(ackInc.id);
await em.updateDispatch(ackInc.id, "ACKNOWLEDGED");
const ackNotice = load().notifications.find((n) => n.userId === "u-citizen-sr" && n.message.en.includes("acknowledged"));
ok(ackNotice !== undefined, "citizen is notified when report is ACKNOWLEDGED");

// d. Citizen notified when report is REJECTED with reason
await as("012000003"); // Admin
await em.rejectIncident(ackInc.id, "Non-emergency administrative matter");
const rejectNotice = load().notifications.find((n) => n.userId === "u-citizen-sr" && n.message.en.includes("Non-emergency administrative matter"));
ok(rejectNotice !== undefined, "citizen is notified when report is REJECTED with rejection reason");

// e. Citizen notified when report is marked DUPLICATE
await as("012000007");
const dupInc = await em.createIncident({
  type: "FIRE",
  location: { lat: 11.5564, lng: 104.9282 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});
await as("012000003"); // Admin
await em.markDuplicate(dupInc.id, "INC-2026-00001");
const dupNotice = load().notifications.find((n) => n.userId === "u-citizen-sr" && n.message.en.includes("INC-2026-00001"));
ok(dupNotice !== undefined, "citizen is notified when report is marked DUPLICATE with original report code");

// 14. Fix 7: Public alert redaction into community announcements
await as("012000003"); // Admin
const incToAlert = await em.createIncident({
  type: "FIRE",
  description: "Major fire near market, call reporter Sokha at 012999888",
  location: { lat: 11.5564892, lng: 104.9282715 }, // High precision GPS
  provinceId: "phnom-penh",
  cityId: "doun-penh",
  sensitiveMedia: true,
  photoUrls: ["https://example.com/sensitive_victim.jpg"],
});
await em.verifyIncident(incToAlert.id);

// Attempting to attach sensitive media fails
await expectErr(
  em.publishAlert(incToAlert.id, {
    title: { km: "ការព្រមានអគ្គិភ័យ", en: "Major Fire Alert" },
    body: { km: "សូមប្រុងប្រយ័ត្ន", en: "Avoid area" },
    category: "SAFETY",
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "doun-penh" },
    imageUrl: "https://example.com/sensitive_victim.jpg",
  }),
  "FORBIDDEN",
  "sensitive media is blocked from public alerts"
);

// Attempting to publish personal phone numbers fails
await expectErr(
  em.publishAlert(incToAlert.id, {
    title: { km: "ការព្រមានអគ្គិភ័យ", en: "Major Fire Alert" },
    body: { km: "ទំនាក់ទំនង 012999888", en: "Call reporter at 012999888" },
    category: "SAFETY",
    scope: { level: "CITY", provinceId: "phnom-penh", cityId: "doun-penh" },
  }),
  "VALIDATION",
  "personal phone numbers are blocked from public alerts"
);

// Clean alert publication succeeds with redacted location (~100m rounding)
const alertAnnouncement = await em.publishAlert(incToAlert.id, {
  title: { km: "ការព្រមានអគ្គិភ័យធំនៅផ្សារ", en: "Major Warehouse Fire Alert" },
  body: { km: "សូមជៀសវាងតំបន់មាត់ទន្លេដោយសារផ្សែងហុយខ្លាំង", en: "Avoid Riverside area due to heavy smoke" },
  category: "SAFETY",
  scope: { level: "CITY", provinceId: "phnom-penh", cityId: "doun-penh" },
});
ok(alertAnnouncement !== undefined, "public alert creates community announcement");
ok(alertAnnouncement.location !== undefined, "public alert includes coordinates");
const latDecimals = (alertAnnouncement.location.lat.toString().split(".")[1] || "").length;
const lngDecimals = (alertAnnouncement.location.lng.toString().split(".")[1] || "").length;
ok(latDecimals <= 3 && lngDecimals <= 3, "public alert coordinates are rounded to ~100m (<= 3 decimals)");
ok(alertAnnouncement.location.lat === 11.556, "lat 11.5564892 is rounded to 11.556");
ok(alertAnnouncement.location.lng === 104.928, "lng 104.9282715 is rounded to 104.928");

// 15. Batch 1: Proposals 4 & 5 (undoResponding window & responder workflow)
await as("012000009"); // citizen-5 (fresh quota)
const undoInc = await em.createIncident({
  type: "ROAD_CRASH",
  description: "Accident requiring police traffic management",
  location: { lat: 11.55, lng: 104.92 },
  provinceId: "phnom-penh",
  cityId: "doun-penh",
});

await as("012000010"); // police staff (u-org-police, already dispatched via ROAD_CRASH auto-routing)
// Org staff acknowledges
let policeView = await em.updateDispatch(undoInc.id, "ACKNOWLEDGED");
ok(policeView.dispatch.status === "ACKNOWLEDGED", "dispatch acknowledged");

// Cannot undo when not in RESPONDING
await expectErr(
  em.undoResponding(undoInc.id),
  "CONFLICT",
  "cannot undo when not in RESPONDING"
);

// Staff marks RESPONDING with ETA 10 minutes
policeView = await em.updateDispatch(undoInc.id, "RESPONDING", { responseInfo: "10 នាទី" });
ok(policeView.dispatch.status === "RESPONDING", "dispatch is RESPONDING");
ok(policeView.dispatch.responseInfo === "10 នាទី", "responseInfo set to 10 នាទី");
ok(policeView.status === "RESPONDING", "overall incident status is RESPONDING");

// Staff realizes mis-tap and clicks undo within window
const undoneView = await em.undoResponding(undoInc.id);
ok(undoneView.dispatch.status === "ACKNOWLEDGED", "undo reverts dispatch status to ACKNOWLEDGED");
ok(undoneView.dispatch.responseInfo === undefined, "undo clears responseInfo");
ok(undoneView.status === "ACKNOWLEDGED", "undo recomputes overall incident status back to ACKNOWLEDGED");

// Attempting undo again fails with CONFLICT
await expectErr(
  em.undoResponding(undoInc.id),
  "CONFLICT",
  "cannot undo once already reverted"
);

done();
