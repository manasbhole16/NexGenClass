const logger = require("../utils/logger");

/**
 * SMS provider abstraction. Providers: "msg91", "fast2sms" (India), "none" (default).
 * Nothing is sent unless SMS_PROVIDER is set AND that provider's credentials exist.
 * Status vocabulary: "sent" = provider accepted the request; "delivered" only via provider webhook.
 */
const providers = {
    msg91: {
        configured: () => Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID),
        async send({ to, message }) {
            const res = await fetch("https://control.msg91.com/api/v5/flow/", {
                method: "POST",
                headers: { authkey: process.env.MSG91_AUTH_KEY, "Content-Type": "application/json", accept: "application/json" },
                body: JSON.stringify({
                    template_id: process.env.MSG91_TEMPLATE_ID,
                    short_url: "0",
                    recipients: [{ mobiles: to.replace(/^\+/, ""), message }]
                }),
                signal: AbortSignal.timeout(15000)
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || body.type === "error") return fail(res.status, body.message || "MSG91 error");
            return { messageId: body.request_id || body.message || null };
        }
    },
    fast2sms: {
        configured: () => Boolean(process.env.FAST2SMS_API_KEY),
        async send({ to, message }) {
            const number = to.replace(/^\+?91/, "");
            const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
                method: "POST",
                headers: { authorization: process.env.FAST2SMS_API_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ route: process.env.FAST2SMS_ROUTE || "q", message, numbers: number }),
                signal: AbortSignal.timeout(15000)
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || body.return === false) return fail(res.status, body.message || "Fast2SMS error");
            return { messageId: body.request_id || null };
        }
    }
};

function fail(status, message) {
    const e = new Error(Array.isArray(message) ? message.join(", ") : String(message));
    e.status = status;
    throw e;
}

const providerName = () => (process.env.SMS_PROVIDER || "none").toLowerCase();
const getProvider = () => providers[providerName()];
const isSmsConfigured = () => {
    const p = getProvider();
    return Boolean(p && p.configured() && process.env.SMS_ENABLED === "true");
};

/** E.164 normalisation; bare 10-digit numbers are assumed Indian (+91). Returns null if invalid. */
const normalizePhone = (raw) => {
    if (!raw) return null;
    const cleaned = String(raw).replace(/[\s\-()]/g, "");
    if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;
    if (/^[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned}`;
    if (/^91[6-9]\d{9}$/.test(cleaned)) return `+${cleaned}`;
    return null;
};

const isTemporaryError = (err) => !err.status || err.status >= 500 || err.status === 429 || err.name === "TimeoutError";

const sendSms = async ({ to, message }) => {
    if (!isSmsConfigured()) {
        const e = new Error("SMS provider not configured or SMS_ENABLED is not true");
        e.code = "ENOTCONFIGURED";
        throw e;
    }
    const phone = normalizePhone(to);
    if (!phone) {
        const e = new Error("Invalid phone number");
        e.code = "EINVALIDPHONE";
        throw e;
    }
    const result = await getProvider().send({ to: phone, message: String(message).slice(0, 320) });
    logger.info("sms.sent", { provider: providerName(), messageId: result.messageId });
    return result;
};

module.exports = { sendSms, isSmsConfigured, normalizePhone, isTemporaryError, providerName };
