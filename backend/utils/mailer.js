// Backward-compatible wrapper. New code should use services/email.service.js.
const { isEmailConfigured } = require("../config/mailer");
const emailService = require("../services/email.service");

const sendMail = async ({ to, subject, text, html }) => {
    if (!isEmailConfigured()) return { skipped: true };
    return emailService.sendRaw({ to, subject, text, html });
};

module.exports = { isEmailConfigured, sendMail };
