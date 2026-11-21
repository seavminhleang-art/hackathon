import { api, as, done, expectErr, logout, ok } from "./helpers.mjs";
const em = api.em;
const TK = { location: { lat: 11.5795, lng: 104.8992 }, locationSource: "GPS", provinceId: "phnom-penh", cityId: "tuol-kouk" };

// directory (visitor)
ok((await em.getHotlines()).length === 3, "hotlines");
const services = await em.listServices();
ok(services.length === 11 && !services.some((s) => s.type === "NEWS"), "directory lists services, not news orgs");
const near = await em.nearbyServices(TK.location);
ok(near[0].id === "org-police-tk" && near.every((s) => s.distanceKm <= 10), "nearby: nearest first within 10 km");
ok((await em.listServices({ type: ["HOSPITAL"] })).length === 4, "filter by type");
const pub = await em.listPublicIncidents();
ok(pub.length === 1 && pub[0].id === "em-4" && !("description" in pub[0]) && !("reporterId" in pub[0]), "public: verified open incidents only, no details");
await expectErr(em.sendSos({ type: "MEDICAL", ...TK }), "UNAUTHORIZED", "SOS in app needs login (hotline works without)");

// routing
const r = em.routeOrganizations("ROAD_CRASH", TK).map((o) => o.id);
ok(r.join() === "org-amb-pp,org-police-tk", "crash -> ambulance + local police");
ok(em.routeOrganizations("FIRE", { location: { lat: 13.36, lng: 103.86 }, provinceId: "siem-reap", cityId: "siem-reap-city" })[0].id === "org-fire-pp", "no local fire dept -> nearest anywhere");

// trusted contacts + SOS
await as("012000001");
ok((await em.listTrustedContacts()).length === 2, "seed trusted contacts");
await expectErr(em.addTrustedContact({ name: "Me", phone: "012000001" }), "VALIDATION", "can't add own number");
const tc = await em.addTrustedContact({ name: "Kim Sokha", phone: "012 000 005" });
ok(tc.linkedUserId === "u-citizen-3", "contact linked to app user by phone");
const sos = await em.sendSos({ type: "ROAD_CRASH", ...TK, note: "Crash at the corner" });
ok(sos.hotline === "119", "SOS returns hotline to call first");
ok(sos.incident.status === "SUBMITTED" && sos.incident.severity === "CRITICAL", "SOS submitted, critical");
ok(sos.incident.dispatches.length === 2 && sos.incident.dispatches.every((d) => d.status === "SENT"), "SOS dispatched (SENT, not confirmed)");
ok(sos.notifiedInApp.length === 2 && sos.smsLinks.length === 1 && sos.smsLinks[0].href.startsWith("sms:012888777"), "app contacts notified, sms link for others");
await as("012000004");
ok((await api.myNotifications()).some((n) => n.type === "EM_SOS_CONTACT" && n.incidentId === sos.incident.id), "trusted contact got in-app SOS alert");

// organization flow
await as("012000014"); // 119 dispatch
const inbox = await em.orgInbox();
ok(inbox[0].severity === "CRITICAL" && inbox.some((i) => i.id === sos.incident.id), "org inbox, most severe first");
ok(inbox.find((i) => i.id === sos.incident.id).reporterContact?.phone === "012000001", "contact shared (SOS consent)");
ok(!("reporterId" in inbox[0]), "org view hides reporter id");
await em.getOrgIncident(sos.incident.id);
await as("012000001");
ok((await em.getMyIncident(sos.incident.id)).status === "RECEIVED", "opening confirms receipt -> RECEIVED");
await as("012000014");
await em.updateDispatch(sos.incident.id, "RESPONDING", { responseInfo: "Ambulance on the way, 8 min" });
await expectErr(em.updateDispatch(sos.incident.id, "ACKNOWLEDGED"), "CONFLICT", "status only moves forward");
await as("012000010"); // municipal police: not dispatched (local Tuol Kouk police was)
await expectErr(em.getOrgIncident(sos.incident.id), "FORBIDDEN", "other org can't open it");
await as("012000001");
const mine = await em.getMyIncident(sos.incident.id);
ok(mine.status === "RESPONDING" && mine.dispatches.some((d) => d.responseInfo?.includes("8 min")), "reporter tracks RESPONDING + info");
ok((await api.myNotifications()).some((n) => n.type === "EM_STATUS" && n.incidentId === sos.incident.id), "reporter notified of status");

// incident report: consent defaults private
const rep = await em.createIncident({ type: "ELECTRICAL_HAZARD", description: "Power line down on the road", ...TK, photoUrls: ["/mock/p.jpg"] });
ok(rep.dispatches[0].organizationId === "org-fire-pp" && !rep.consent.shareWithNews && !rep.consent.shareContactWithResponders, "routed to fire, consent off by default");
await as("012000012");
ok((await em.orgInbox()).find((i) => i.id === rep.id).reporterContact === undefined, "no contact without consent");
await expectErr(em.updateDispatch(rep.id, "DECLINED"), "VALIDATION", "decline needs a reason");
await em.updateDispatch(rep.id, "DECLINED", { note: "Electricity company handles this" });
await as("012000003");
await em.assignOrganization(rep.id, "org-police-tk");
ok((await em.getMyIncident(rep.id)).dispatches.length === 2, "admin reassigns after decline");

// cancel
await as("012000001");
await expectErr(em.cancelIncident(rep.id, ""), "VALIDATION", "cancel needs reason");
ok((await em.cancelIncident(rep.id, "Already fixed")).status === "CANCELLED", "reporter cancels");
await expectErr(em.cancelIncident(rep.id, "again"), "CONFLICT", "can't cancel twice");

// SOS rate limit
await em.sendSos({ type: "OTHER", ...TK });
await em.sendSos({ type: "OTHER", ...TK });
await expectErr(em.sendSos({ type: "OTHER", ...TK }), "LIMIT", "SOS limited per hour (call hotline)");

// admin: verify, alert, news
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
ok((await em.rejectIncident("em-3", "Test")).status === "REJECTED", "admin rejects with reason");

// news reporter
await as("012000013");
const news = await em.listNewsReleases();
ok(news.length === 2 && !("description" in news[0]), "reporter sees only approved releases");
await expectErr(em.adminListIncidents(), "FORBIDDEN", "reporter can't see raw incidents");
await logout();
await expectErr(em.listNewsReleases(), "UNAUTHORIZED", "visitors can't see news feed");
done();
