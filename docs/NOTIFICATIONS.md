# NexGenClass Notification System

## Architecture
`createNotification()` (services/notificationService.js) is the only entry point. It validates input, applies the
user's preferences (services/notificationPolicy.js), stores the in-app notification, pushes it over Socket.IO to the
private room `user_<id>`, and queues email/SMS in the same MongoDB document (`deliveryStatus.email|sms`).
A worker (services/notificationDelivery.service.js) sends queued items with atomic claims, exponential backoff
(1m, 5m, 30m; 4 attempts) and per-channel status. API requests never wait on SMTP/SMS.

Statuses: `queued -> sending -> sent` (provider accepted) / `failed` / `skipped`. `delivered` is only set from a
provider confirmation (SMS webhook); SMTP alone can never prove inbox delivery, so email stops at `sent`.

Reminders (jobs/reminderJobs.js) are DB-driven and idempotent via `dedupKey` (assignment due/overdue, quiz start/close,
live class start). Low attendance (<threshold, default 75%) alerts students at most once per ISO week.

## Setup
1. `cd backend && npm install`; copy `.env.example` to `.env` and fill values. Never commit `.env`.
2. Brevo (recommended): create a free account, verify a sender, generate an SMTP key (SMTP & API -> SMTP), and set SMTP_HOST=smtp-relay.brevo.com, SMTP_PORT=587, SMTP_USER=<SMTP login>, SMTP_PASS=<SMTP key>, EMAIL_FROM=<verified sender>. Free tier: 300 emails/day.
   Gmail alternative: 2-Step Verification + App Password in `SMTP_PASS` (a normal password fails with 535).
3. Verify: `node -e "require('./config/mailer').verifyConnection().then(console.log)"`
4. SMS: set `SMS_ENABLED=true`, `SMS_PROVIDER=msg91|fast2sms` and that provider's keys. Without them SMS is skipped.
5. Existing databases: drop the old index `recipient_1_dedupKey_1` once so the unique `recipient_dedupKey_unique` index can build.

## API (all under /api/notifications, authenticated)
GET `/` (page, limit, category, priority, unreadOnly, readOnly) · GET `/unread-count` · PATCH `/:id/read` ·
PATCH `/read-all` · DELETE `/:id` · DELETE `/clear-read` · DELETE `/clear-all` ·
GET/PATCH `/preferences` (alias `/api/notification-preferences`) ·
POST `/internal/run-scheduled` (Bearer CRON_SECRET; runs reminders + delivery queue for serverless hosts).
There is intentionally no endpoint that sends arbitrary email, and no Admin role exists in this app.

## Socket.IO events (server -> client, room `user_<id>`)
`notification:new`, `notification:read`, `notification:read-all`, `notification:deleted`, `notification:count-updated`
(legacy `notification:unread_count` still emitted). Sockets authenticate with the JWT cookie/`auth.token`;
`joinUser` only works for the socket's own user id.

## Adding a trigger
Call `notificationService.createNotification({ recipient, type, title, message, priority, actionUrl, dedupKey, io })`
(or `createManyNotifications(list, io)` for groups). Add the type to the model enum, and to `EMAIL_DEFAULT_TYPES` /
`SMS_DEFAULT_TYPES` in notificationPolicy.js if it should email/SMS by default.

## Troubleshooting email
`deliveryStatus.email.error` on the notification document holds the last error. 535 = wrong credentials/App Password;
ETIMEDOUT/ECONNECTION = network or port blocked (try 465 with SMTP_SECURE=true); `skipped` = SMTP not configured.

## Deployment notes
Socket.IO, node-cron and local `uploads/` need a long-running server (Render/Railway/VPS). On Vercel serverless call
`/internal/run-scheduled` from a cron service every few minutes; real-time push will not work there.
