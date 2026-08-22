const FormAuditLog = require('../models/formAuditLog-model');

/**
 * Log an immutable audit event for a Form
 */
async function logFormEvent({ formId, actorId, action, targetType = 'form', targetId = null, metadata = {}, req = null }) {
    try {
        if (!formId || !actorId || !action) return;

        let ipAddress = '';
        let userAgent = '';
        if (req) {
            ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
            userAgent = req.headers['user-agent'] || '';
        }

        await FormAuditLog.create({
            formId,
            actorId,
            action,
            targetType,
            targetId,
            metadata,
            ipAddress,
            userAgent
        });
    } catch (err) {
        console.error("Form audit logging error:", err.message);
    }
}

module.exports = {
    logFormEvent
};
