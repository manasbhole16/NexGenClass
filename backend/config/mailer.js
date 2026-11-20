const nodemailer = require("nodemailer");

/**
 * Provider-independent SMTP configuration.
 * Reads SMTP_* env vars (legacy EMAIL_HOST/EMAIL_* names are accepted as fallbacks).
 * Credentials never leave the backend.
 */
const env = (...names) => {
    for (const n of names) if (process.env[n]) return process.env[n];
    return undefined;
};

const getMailConfig = () => {
    const port = Number(env("SMTP_PORT", "EMAIL_PORT") || 587);
    const secureEnv = env("SMTP_SECURE", "EMAIL_SECURE");
    return {
        host: env("SMTP_HOST", "EMAIL_HOST"),
        port,
        secure: secureEnv !== undefined ? secureEnv === "true" : port === 465,
        user: env("SMTP_USER", "EMAIL_USER"),
        pass: env("SMTP_PASS", "EMAIL_PASS"),
        from: env("EMAIL_FROM", "MAIL_FROM") || env("SMTP_USER", "EMAIL_USER")
    };
};

const hasBrevoApi = () => Boolean(process.env.BREVO_API_KEY);

const isEmailConfigured = () => {
    const c = getMailConfig();
    return Boolean((c.host && c.user && c.pass && c.from) || (hasBrevoApi() && c.from));
};

let cached = null;
let cachedKey = null;

const getTransporter = () => {
    if (cachedKey === "__test__") return cached;
    const c = getMailConfig();
    const key = `${c.host}|${c.port}|${c.secure}|${c.user}`;
    if (cached && cachedKey === key) return cached;
    cached = nodemailer.createTransport({
        host: c.host,
        port: c.port,
        secure: c.secure,
        auth: { user: c.user, pass: c.pass },
        pool: true,
        maxConnections: 3,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000
    });
    cachedKey = key;
    return cached;
};

/** Test hook: inject a transporter (e.g. nodemailer jsonTransport). */
const setTransporterForTests = (t) => {
    cached = t;
    cachedKey = t ? "__test__" : null;
};

/** Development/testing helper: verifies SMTP connectivity + auth. */
const verifyConnection = async () => {
    if (!isEmailConfigured()) return { ok: false, error: "Email is not configured" };
    if (hasBrevoApi()) {
        try {
            const r = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": process.env.BREVO_API_KEY }, signal: AbortSignal.timeout(15000) });
            return r.ok ? { ok: true, transport: "brevo-api" } : { ok: false, error: `Brevo API ${r.status}` };
        } catch (err) { return { ok: false, error: err.message }; }
    }
    try {
        await getTransporter().verify();
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message, code: err.code };
    }
};

module.exports = { hasBrevoApi, getMailConfig, isEmailConfigured, getTransporter, setTransporterForTests, verifyConnection };
