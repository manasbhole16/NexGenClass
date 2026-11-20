// Run: node --test tests/notifications_engine.test.js
// Uses an in-memory MongoDB; no running server, SMTP or SMS account needed.
process.env.NODE_ENV = "test";
process.env.NOTIFY_AUTOKICK = "false"; // tests drive the delivery worker explicitly
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const { MongoMemoryServer } = require("mongodb-memory-server");

const User = require("../models/user-model");
const Room = require("../models/room-model");
const Task = require("../models/task-model");
const Notification = require("../models/notification-model");
const mailerConfig = require("../config/mailer");
const emailService = require("../services/email.service");
const sms = require("../services/sms.service");
const policy = require("../services/notificationPolicy");
const svc = require("../services/notificationService");
const delivery = require("../services/notificationDelivery.service");
const reminders = require("../jobs/reminderJobs");

let mongod, teacher, alice, bob;
const emitted = [];
const fakeIo = { to: (room) => ({ emit: (event, payload) => emitted.push({ room, event, payload }) }) };
const tick = () => new Promise((r) => setTimeout(r, 50));
const smtpEnv = () => Object.assign(process.env, { SMTP_HOST: "smtp.test", SMTP_PORT: "587", SMTP_USER: "u", SMTP_PASS: "p", EMAIL_FROM: "NexGenClass <n@test.dev>", CLIENT_URL: "https://app.test" });

test.before(async () => {
    // Relaxed index-build disk guard so the suite also runs on nearly-full dev machines.
    mongod = await MongoMemoryServer.create({ instance: { args: ["--setParameter", "indexBuildMinAvailableDiskSpaceMB=10"] } });
    await mongoose.connect(mongod.getUri());
    await Notification.init();
    teacher = await User.create({ fullname: "Prof T", email: "t@test.dev", password: "x", role: "teacher" });
    alice = await User.create({ fullname: "Alice", email: "alice@test.dev", password: "x", phone: "+919876543210" });
    bob = await User.create({ fullname: "Bob", email: "bob@test.dev", password: "x" });
    smtpEnv();
});
test.after(async () => { await mongoose.disconnect(); await mongod.stop(); });
test.beforeEach(async () => { emitted.length = 0; await Notification.deleteMany({}); mailerConfig.setTransporterForTests(null); });

// ---------- pure policy ----------
test("policy: category toggle suppresses non-urgent, urgent overrides, security always passes", () => {
    const user = { email: "a@b.c", notificationPreferences: { quizNotifications: false, emailNotifications: false } };
    assert.deepEqual(policy.resolveChannels({ type: "quiz_published", priority: "normal", user }), { inApp: false, email: false, sms: false, reason: "category_disabled" });
    assert.equal(policy.resolveChannels({ type: "quiz_starting_soon", priority: "urgent", user }).inApp, true);
    const sec = policy.resolveChannels({ type: "account_security", user: { ...user, notificationPreferences: { inAppNotifications: false, emailNotifications: false } } });
    assert.equal(sec.inApp && sec.email, true);
});
test("policy: sms needs opt-in AND a phone; email respects eligibility", () => {
    const base = { type: "assignment_due_soon", priority: "high" };
    assert.equal(policy.resolveChannels({ ...base, user: { email: "a@b.c", phone: "+911234567890", notificationPreferences: {} } }).sms, false);
    assert.equal(policy.resolveChannels({ ...base, user: { email: "a@b.c", phone: "+911234567890", notificationPreferences: { smsNotifications: true } } }).sms, true);
    assert.equal(policy.resolveChannels({ type: "announcement_comment", priority: "normal", user: { email: "a@b.c", notificationPreferences: {} } }).email, false);
    assert.equal(policy.resolveChannels({ type: "x", requestedChannels: ["email"], user: { email: "a@b.c", notificationPreferences: {} } }).inApp, false);
});

// ---------- email rendering / sms helpers ----------
test("email: templates escape user content and include action link", () => {
    const m = emailService.renderNotificationEmail({ templateName: "assignment", title: "<script>x</script>", message: "Hello & bye", recipientName: "A<b>", actionUrl: "/room/1" });
    assert.ok(!m.html.includes("<script>x"));
    assert.ok(m.html.includes("&lt;script&gt;"));
    assert.ok(m.html.includes("https://app.test/room/1"));
    assert.ok(m.text.includes("Hello & bye"));
});
test("email: temporary vs permanent error classification", () => {
    assert.equal(emailService.isTemporaryError({ code: "ETIMEDOUT" }), true);
    assert.equal(emailService.isTemporaryError({ responseCode: 421 }), true);
    assert.equal(emailService.isTemporaryError({ responseCode: 550 }), false);
    assert.equal(emailService.isTemporaryError({ code: "EAUTH" }), false);
});
test("sms: phone normalisation and graceful not-configured", async () => {
    assert.equal(sms.normalizePhone("98765 43210"), "+919876543210");
    assert.equal(sms.normalizePhone("123"), null);
    delete process.env.SMS_PROVIDER;
    await assert.rejects(sms.sendSms({ to: "+919876543210", message: "hi" }), { code: "ENOTCONFIGURED" });
});

// ---------- engine ----------
test("create: persists, emits only to the recipient's private room, tracks channels independently", async () => {
    const n = await svc.createNotification({ recipient: alice._id, actor: teacher._id, type: "assignment_created", title: "New", message: "Do it", io: fakeIo });
    assert.ok(n);
    const doc = await Notification.findById(n._id);
    assert.equal(doc.category, "assignment");
    assert.equal(doc.deliveryStatus.inApp.status, "delivered");
    assert.equal(doc.deliveryStatus.email.status, "queued");
    assert.equal(doc.deliveryStatus.sms.status, "none");
    const newEvents = emitted.filter((e) => e.event === "notification:new");
    assert.equal(newEvents.length, 1);
    assert.equal(newEvents[0].room, `user_${alice._id}`);
    assert.ok(emitted.some((e) => e.event === "notification:count-updated" && e.payload.unreadCount === 1));
});
test("create: duplicate dedupKey returns the original, only one row", async () => {
    const opts = { recipient: alice._id, type: "assignment_due_soon", title: "t", message: "m", dedupKey: "k1" };
    const [a, b] = await Promise.all([svc.createNotification(opts), svc.createNotification(opts)]);
    assert.ok(a && b);
    assert.equal(await Notification.countDocuments({ dedupKey: "k1" }), 1);
});
test("create: validation rejects empty / invalid input and never throws", async () => {
    assert.equal(await svc.createNotification({ recipient: "nope", type: "x", title: "t", message: "m" }), null);
    assert.equal(await svc.createNotification({ recipient: alice._id, type: "general", title: "  ", message: "m" }), null);
    assert.equal(await svc.createNotification({ recipient: alice._id, type: "general", title: "t", message: "m", actionUrl: "javascript:alert(1)" }).then((n) => n.actionUrl), null);
});
test("create: never notifies the actor themselves", async () => {
    assert.equal(await svc.createNotification({ recipient: alice._id, actor: alice._id, type: "general", title: "t", message: "m" }), null);
});
test("preferences: disabled category creates nothing; bulk create resolves users in one pass", async () => {
    await svc.updatePreferences(bob._id, { quizNotifications: false });
    const out = await svc.createManyNotifications([
        { recipient: alice._id, type: "quiz_published", title: "Q", message: "m" },
        { recipient: bob._id, type: "quiz_published", title: "Q", message: "m" }
    ], fakeIo);
    assert.equal(out.length, 1);
    assert.equal(String(out[0].recipient), String(alice._id));
});
test("preferences: whitelist, type checks, SMS requires phone", async () => {
    await assert.rejects(svc.updatePreferences(bob._id, { emailNotifications: "yes" }), { status: 400 });
    await assert.rejects(svc.updatePreferences(bob._id, { smsNotifications: true }), { status: 400 });
    const r = await svc.updatePreferences(bob._id, { phone: "9876501234", smsNotifications: true, isAdmin: true, role: "teacher" });
    assert.equal(r.phone, "+919876501234");
    assert.equal(r.preferences.smsNotifications, true);
    assert.equal((await User.findById(bob._id)).role, "student");
    await svc.updatePreferences(bob._id, { smsNotifications: false, phone: null });
});
test("authorization: users cannot read/modify/delete others' notifications", async () => {
    const n = await svc.createNotification({ recipient: alice._id, type: "general", title: "t", message: "m" });
    assert.equal(await svc.markAsRead(n._id, bob._id, fakeIo), null);
    assert.equal(await svc.deleteNotification(n._id, bob._id, fakeIo), false);
    assert.equal((await svc.getUserNotifications(bob._id)).total, 0);
    assert.ok(await svc.markAsRead(n._id, alice._id, fakeIo));
    assert.ok(emitted.some((e) => e.event === "notification:read" && e.room === `user_${alice._id}`));
    assert.equal(await svc.getUnreadCount(alice._id), 0);
});
test("read-all / delete / clear-all keep counts and events consistent; pagination works", async () => {
    for (let i = 0; i < 5; i++) await svc.createNotification({ recipient: alice._id, type: "general", title: `t${i}`, message: "m" });
    const p1 = await svc.getUserNotifications(alice._id, { page: 1, limit: 2 });
    assert.equal(p1.notifications.length, 2);
    assert.equal(p1.total, 5);
    assert.equal(p1.hasMore, true);
    assert.equal((await svc.getUserNotifications(alice._id, { category: "system", limit: 100 })).total, 5);
    assert.equal(await svc.markAllAsRead(alice._id, null, fakeIo), 5);
    assert.ok(emitted.some((e) => e.event === "notification:read-all"));
    assert.equal((await svc.getUserNotifications(alice._id, { unreadOnly: true })).total, 0);
    assert.equal(await svc.clearAllNotifications(alice._id, fakeIo), 5);
});

// ---------- delivery worker ----------
test("delivery: successful SMTP hand-off is 'sent' (never 'delivered') and stores messageId", async () => {
    mailerConfig.setTransporterForTests(nodemailer.createTransport({ jsonTransport: true }));
    const n = await svc.createNotification({ recipient: alice._id, type: "assignment_created", title: "New", message: "Do it", metadata: { dueDate: new Date(Date.now() + 864e5) } });
    await tick();
    await delivery.processDueDeliveries();
    const d = await Notification.findById(n._id);
    assert.equal(d.deliveryStatus.email.status, "sent");
    assert.ok(d.deliveryStatus.email.messageId);
    assert.equal(d.deliveryStatus.email.attempts, 1);
    assert.equal(d.deliveryStatus.inApp.status, "delivered");
    assert.equal(d.deliveryStatus.sms.status, "none");
});
test("delivery: temporary failure re-queues with backoff; in-app unaffected", async () => {
    mailerConfig.setTransporterForTests({ sendMail: async () => { const e = new Error("conn reset"); e.code = "ECONNECTION"; throw e; } });
    const n = await svc.createNotification({ recipient: alice._id, type: "assignment_created", title: "New", message: "m" });
    await tick(); await delivery.processDueDeliveries();
    const d = await Notification.findById(n._id);
    assert.equal(d.deliveryStatus.email.status, "queued");
    assert.equal(d.deliveryStatus.email.attempts, 1);
    assert.ok(d.deliveryStatus.email.nextAttemptAt > new Date());
    assert.equal(d.deliveryStatus.inApp.status, "delivered");
    // not due yet -> a second pass must not retry early
    await delivery.processDueDeliveries();
    assert.equal((await Notification.findById(n._id)).deliveryStatus.email.attempts, 1);
});
test("delivery: retries exhaust to 'failed'; permanent errors fail immediately", async () => {
    mailerConfig.setTransporterForTests({ sendMail: async () => { const e = new Error("550 no such user"); e.responseCode = 550; throw e; } });
    const n = await svc.createNotification({ recipient: alice._id, type: "assignment_created", title: "New", message: "m" });
    await tick(); await delivery.processDueDeliveries();
    const d = await Notification.findById(n._id);
    assert.equal(d.deliveryStatus.email.status, "failed");
    assert.match(d.deliveryStatus.email.error, /550/);

    mailerConfig.setTransporterForTests({ sendMail: async () => { const e = new Error("timeout"); e.code = "ETIMEDOUT"; throw e; } });
    const m = await svc.createNotification({ recipient: alice._id, type: "assignment_created", title: "New2", message: "m" });
    for (let i = 0; i < delivery.MAX_ATTEMPTS; i++) {
        await Notification.updateOne({ _id: m._id }, { "deliveryStatus.email.nextAttemptAt": new Date(0) });
        await delivery.processNotification(m._id);
    }
    assert.equal((await Notification.findById(m._id)).deliveryStatus.email.status, "failed");
});
test("delivery: unconfigured SMTP and SMS are skipped gracefully (no crash)", async () => {
    const saved = process.env.SMTP_HOST; delete process.env.SMTP_HOST;
    await User.updateOne({ _id: alice._id }, { "notificationPreferences.smsNotifications": true });
    const n = await svc.createNotification({ recipient: alice._id, type: "assignment_due_soon", priority: "urgent", title: "Due", message: "m" });
    await tick(); await delivery.processDueDeliveries();
    process.env.SMTP_HOST = saved;
    const d = await Notification.findById(n._id);
    assert.equal(d.deliveryStatus.email.status, "skipped");
    assert.equal(d.deliveryStatus.sms.status, "skipped");
    assert.equal(d.deliveryStatus.inApp.status, "delivered");
    await User.updateOne({ _id: alice._id }, { "notificationPreferences.smsNotifications": false });
});
test("delivery: concurrent workers cannot double-send (atomic claim)", async () => {
    let sends = 0;
    mailerConfig.setTransporterForTests({ sendMail: async () => { sends++; return { messageId: "<m1>", accepted: ["a"], rejected: [] }; } });
    const n = await svc.createNotification({ recipient: alice._id, type: "assignment_created", title: "New", message: "m" });
    await Promise.all([delivery.processNotification(n._id), delivery.processNotification(n._id), delivery.processNotification(n._id)]);
    await tick();
    assert.equal(sends, 1);
});

test("delivery: auto-kick sends in the background without blocking createNotification", async () => {
    process.env.NOTIFY_AUTOKICK = "true";
    let sends = 0;
    mailerConfig.setTransporterForTests({ sendMail: async () => { sends++; await new Promise((r) => setTimeout(r, 150)); return { messageId: "<bg>", accepted: ["a"], rejected: [] }; } });
    const t0 = Date.now();
    const n = await svc.createNotification({ recipient: alice._id, type: "assignment_created", title: "BG", message: "m" });
    assert.ok(Date.now() - t0 < 140, "createNotification must not wait for SMTP");
    assert.equal((await Notification.findById(n._id)).deliveryStatus.email.status === "sent", false);
    await new Promise((r) => setTimeout(r, 500));
    process.env.NOTIFY_AUTOKICK = "false";
    assert.equal(sends, 1);
    assert.equal((await Notification.findById(n._id)).deliveryStatus.email.status, "sent");
});

// ---------- scheduled reminders ----------
test("reminders: assignment due-soon is idempotent, skips submitted students, honours reschedule", async () => {
    const room = await Room.create({ name: "Math", code: "MATH1", owner: teacher._id, members: [teacher._id, alice._id, bob._id] });
    const due = new Date(Date.now() + 5 * 3600 * 1000);
    const task = await Task.create({ title: "HW1", room: room._id, owner: teacher._id, dueDate: due, status: "Todo" });
    const Submission = require("../models/submission-model");
    await Submission.collection.insertOne({ taskId: task._id, studentId: bob._id, roomId: room._id, status: "submitted" });

    assert.equal(await reminders.assignmentReminders(fakeIo, new Date()), 1); // only Alice
    assert.equal(await reminders.assignmentReminders(fakeIo, new Date()), 1); // dedup returns existing -> still 1, no new rows
    assert.equal(await Notification.countDocuments({ type: "assignment_due_soon" }), 1);

    await Task.updateOne({ _id: task._id }, { dueDate: new Date(due.getTime() + 3600 * 1000) }); // rescheduled
    await reminders.assignmentReminders(fakeIo, new Date());
    assert.equal(await Notification.countDocuments({ type: "assignment_due_soon" }), 2);

    await Task.updateOne({ _id: task._id }, { dueDate: new Date(Date.now() - 1000), status: "Todo" }); // expired -> no reminder
    const before = await Notification.countDocuments({});
    await reminders.assignmentReminders(fakeIo, new Date());
    assert.equal(await Notification.countDocuments({}), before);
});
