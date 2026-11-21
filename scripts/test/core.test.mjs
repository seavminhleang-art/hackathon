import { api, done, expectErr, ok } from "./helpers.mjs";

await expectErr(api.login({ phone: "012000001", password: "wrong" }), "UNAUTHORIZED", "wrong password rejected");
const s = await api.register({ fullName: "Test User", phone: "+855 12 999 888", password: "test1234", provinceId: "kampot", cityId: "kampot-city" });
ok(s.user.phone === "012999888" && s.user.role === "CITIZEN", "register normalizes +855 phone, role CITIZEN");
await expectErr(api.register({ fullName: "Dup", phone: "012999888", password: "test1234", provinceId: "kampot", cityId: "kampot-city" }), "CONFLICT", "duplicate phone");
await expectErr(api.register({ fullName: "X", phone: "012999777", password: "test1234", provinceId: "kampot", cityId: "tuol-kouk" }), "VALIDATION", "city must match province");
ok((await api.me())?.fullName === "Test User", "me() returns session user");

ok((await api.getEmergencyHotlines()).map((h) => h.number).join() === "117,118,119", "hotlines 117/118/119");
ok((await api.getProvinces()).length === 25 && (await api.getCities("phnom-penh")).length === 14, "25 provinces, 14 Phnom Penh khans");
await api.logout();
ok((await api.me()) === null, "logout clears session");
await expectErr(api.myNotifications(), "UNAUTHORIZED", "notifications need login");
done();
