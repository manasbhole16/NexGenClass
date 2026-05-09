const nodemailer = require("nodemailer");

let cachedTransporter = null;

const isEmailConfigured = () => {
    return Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.MAIL_FROM
    );
};

const getTransporter = () => {
    if (cachedTransporter) return cachedTransporter;

    const port = Number(process.env.SMTP_PORT);
    const secure = process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === "true"
        : port === 465;

    cachedTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    return cachedTransporter;
};

const sendMail = async ({ to, subject, text, html }) => {
    if (!isEmailConfigured()) {
        console.warn("Email not configured; skipping send.");
        return { skipped: true };
    }

    const transporter = getTransporter();
    return transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        text,
        html
    });
};

module.exports = {
    isEmailConfigured,
    sendMail
};
