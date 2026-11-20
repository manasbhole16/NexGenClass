const fs = require("fs");
const path = require("path");
const { getMailConfig, getTransporter, isEmailConfigured } = require("../config/mailer");
const logger = require("../utils/logger");

const TEMPLATE_DIR = path.join(__dirname, "../templates/emails");
const templateCache = new Map();

const escapeHtml = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const loadTemplate = (name) => {
    if (templateCache.has(name)) return templateCache.get(name);
    const file = path.join(TEMPLATE_DIR, `${path.basename(name)}.html`);
    const src = fs.readFileSync(file, "utf8");
    templateCache.set(name, src);
    return src;
};

/**
 * {{var}} is HTML-escaped, {{{var}}} is raw (only used for trusted, pre-built fragments).
 * {{#if var}}...{{/if}} renders the block when var is truthy.
 */
const renderString = (src, vars) => {
    let out = src.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, k, body) => (vars[k] ? body : ""));
    out = out.replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => String(vars[k] ?? ""));
    out = out.replace(/\{\{(\w+)\}\}/g, (_, k) => escapeHtml(vars[k]));
    return out;
};

const TEMPLATE_BY_CATEGORY = {
    assignment: "assignment",
    quiz: "quiz",
    attendance: "attendance",
    announcement: "announcement",
    classroom: "announcement",
    calendar: "reminder",
    reminder: "reminder",
    account: "welcome",
    welcome: "welcome"
};

const htmlToText = (html) =>
    html
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|tr|h\d)>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

const buildActionLink = (actionUrl) => {
    if (!actionUrl) return "";
    if (/^https?:\/\//i.test(actionUrl)) return actionUrl;
    const base = (process.env.CLIENT_URL || "").split(",")[0].trim().replace(/\/$/, "");
    return base ? `${base}${actionUrl.startsWith("/") ? "" : "/"}${actionUrl}` : "";
};

/** Renders a branded message for a notification. Returns { subject, html, text }. */
const renderNotificationEmail = ({ templateName, subject, recipientName, title, message, className, details, actionUrl, actionLabel }) => {
    const inner = loadTemplate(templateName || "reminder");
    const layout = loadTemplate("_layout");
    const vars = {
        recipientName: recipientName || "there",
        title,
        message,
        className,
        details,
        actionUrl: buildActionLink(actionUrl),
        actionLabel: actionLabel || "Open in NexGenClass",
        year: new Date().getFullYear()
    };
    const body = renderString(inner, vars);
    const html = renderString(layout, { ...vars, preheader: message, body });
    return { subject: subject || title, html, text: htmlToText(body) };
};

// Errors worth retrying: network faults, 4xx SMTP (greylisting/rate limits), timeouts.
const isTemporaryError = (err) => {
    if (!err) return false;
    const code = err.responseCode;
    if (code && code >= 500) return false;
    if (code && code >= 400) return true;
    if (["EAUTH", "EENVELOPE", "EMESSAGE"].includes(err.code)) return false;
    return ["ECONNECTION", "ETIMEDOUT", "ESOCKET", "ECONNRESET", "EDNS", "ETIMEOUT", "EPROTOCOL"].includes(err.code) || !err.code;
};

/** Send an already-rendered message. Throws on failure (callers classify via isTemporaryError). */
const sendRaw = async ({ to, subject, text, html }) => {
    if (!isEmailConfigured()) {
        const e = new Error("SMTP is not configured");
        e.code = "ENOTCONFIGURED";
        throw e;
    }
    const info = await getTransporter().sendMail({ from: getMailConfig().from, to, subject, text, html });
    logger.info("email.sent", { messageId: info.messageId, accepted: (info.accepted || []).length, rejected: (info.rejected || []).length });
    if (info.rejected && info.rejected.length && !(info.accepted && info.accepted.length)) {
        const e = new Error("All recipients rejected by SMTP server");
        e.code = "EENVELOPE";
        throw e;
    }
    return info;
};

/** Render + send a notification email. Status is "sent" (SMTP accepted); never "delivered". */
const sendNotificationEmail = async ({ to, ...rest }) => {
    const msg = renderNotificationEmail({ templateName: TEMPLATE_BY_CATEGORY[rest.category] || "reminder", ...rest });
    const info = await sendRaw({ to, ...msg });
    return { messageId: info.messageId };
};

module.exports = {
    sendRaw, sendNotificationEmail, renderNotificationEmail, renderString, escapeHtml, isTemporaryError, isEmailConfigured, buildActionLink, TEMPLATE_BY_CATEGORY
};
