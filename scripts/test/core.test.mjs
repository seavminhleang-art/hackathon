import { api, done, expectErr, ok } from "./helpers.mjs";

const REG = { username: "test.user", firstName: "User", lastName: "Test", email: "Test.User@Example.com", password: "test12345", provinceId: "kampot", cityId: "kampot-city" };

// Password login by phone, email or username
await expectErr(api.login({ identifier: "012000001", password: "wrong" }), "UNAUTHORIZED", "wrong password rejected");
ok((await api.login({ identifier: "dara@example.com", password: "demo1234" })).user.id === "u-citizen-1", "login with email");
ok((await api.login({ identifier: "DARA", password: "demo1234" })).user.id === "u-citizen-1", "login with username (case-insensitive)");
ok((await api.login({ identifier: "០១២០០០០០១", password: "demo1234" })).user.id === "u-citizen-1", "login with a Khmer-digit phone");
ok(api.normalizePhone("០១២ ០០០ ០០១") === "012000001", "Khmer digits accepted in phone numbers");
ok(api.normalizePhone("(012) 000-001") === "012000001", "brackets and dashes ignored in phone numbers");
await api.logout();

// Direct register (no code) + validation
const s = await api.register({ ...REG, phone: "+855 12 999 888" });
ok(s.user.phone === "012999888" && s.user.email === "test.user@example.com" && s.user.fullName === "Test User" && s.user.role === "CITIZEN", "register normalizes phone + email, builds Khmer-order full name, role CITIZEN");
ok((await api.me())?.username === "test.user", "me() returns session user");
await expectErr(api.register({ ...REG, email: "other@example.com" }), "CONFLICT", "duplicate username");
await expectErr(api.register({ ...REG, username: "other.user" }), "CONFLICT", "duplicate email");
await expectErr(api.register({ ...REG, username: "x", email: "x@example.com" }), "VALIDATION", "username too short");
await expectErr(api.register({ ...REG, username: "no.city", email: "nc@example.com", cityId: "tuol-kouk" }), "VALIDATION", "city must match province");
await expectErr(api.register({ ...REG, username: "short.pw", email: "sp@example.com", password: "123" }), "VALIDATION", "password at least 8 characters");
ok(!(await api.register({ ...REG, username: "no.phone", email: "np@example.com" })).user.phone, "phone is optional");
await api.logout();

// Code login by email or Telegram (mock returns demoCode)
await expectErr(api.requestLoginCode("nobody@example.com", "EMAIL"), "NOT_FOUND", "code login needs an existing account");
await expectErr(api.requestLoginCode("np@example.com", "TELEGRAM"), "VALIDATION", "Telegram code needs a phone on the account");
let sent = await api.requestLoginCode("dara", "TELEGRAM");
ok(/^\d{6}$/.test(sent.demoCode) && sent.sentTo.startsWith("Telegram") && sent.sentTo.includes("•••"), "Telegram code issued, phone masked");
await expectErr(api.loginWithCode("dara", "000000"), "VALIDATION", "wrong code rejected");
ok((await api.loginWithCode("012000001", sent.demoCode)).user.id === "u-citizen-1", "login with code works (any identifier of the same account)");
await expectErr(api.loginWithCode("dara", sent.demoCode), "VALIDATION", "code can only be used once");
sent = await api.requestLoginCode("dara@example.com", "EMAIL");
ok(sent.channel === "EMAIL" && sent.sentTo === "da•••@example.com", "email code masked");
await api.logout();

// Sign-up confirmed with a code
await expectErr(api.requestSignupCode({ ...REG, username: "taken.mail", email: "dara@example.com" }, "EMAIL"), "CONFLICT", "sign-up code refused for a registered email");
const NEW = { ...REG, username: "code.user", email: "code.user@example.com", phone: "012888444" };
sent = await api.requestSignupCode(NEW, "TELEGRAM");
const khmerCode = sent.demoCode.replace(/\d/g, (d) => String.fromCharCode(0x17e0 + Number(d)));
const reg = await api.registerWithCode({ ...NEW, code: khmerCode });
ok(reg.user.username === "code.user" && reg.user.phone === "012888444", "sign-up with code (typed in Khmer digits) creates the account");
await api.logout();

// Google (mock)
ok((await api.loginWithGoogle({ email: "dara@example.com", firstName: "ដារ៉ា", lastName: "សុខ" })).user.id === "u-citizen-1", "Google signs in an existing email");
await api.logout();
await expectErr(api.loginWithGoogle({ email: "new.resident@example.com", firstName: "Sreyneang", lastName: "Chan" }), "NOT_FOUND", "Google with a new email asks to sign up");
const g = await api.register({ username: "sreyneang", firstName: "Sreyneang", lastName: "Chan", email: "new.resident@example.com", provinceId: "phnom-penh", cityId: "tuol-kouk", provider: "GOOGLE" });
ok(g.user.authProvider === "GOOGLE", "Google sign-up needs no password");
await expectErr(api.login({ identifier: "sreyneang", password: "" }), "UNAUTHORIZED", "Google account cannot log in with an empty password");

ok((await api.getEmergencyHotlines()).map((h) => h.number).join() === "117,118,119", "hotlines 117/118/119");
ok((await api.getProvinces()).length === 25 && (await api.getCities("phnom-penh")).length === 14, "25 provinces, 14 Phnom Penh khans");
await api.logout();
ok((await api.me()) === null, "logout clears session");
await expectErr(api.myNotifications(), "UNAUTHORIZED", "notifications need login");
done();
