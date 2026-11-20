// Minimal structured (JSON-line) logger. Never log secrets or full email bodies.
const emit = (level, event, fields = {}) => {
    if (process.env.NODE_ENV === "test" && !process.env.LOG_IN_TEST) return;
    const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
};
module.exports = {
    info: (e, f) => emit("info", e, f),
    warn: (e, f) => emit("warn", e, f),
    error: (e, f) => emit("error", e, f)
};
