// Tiny in-memory fixed-window rate limiter (per user id, else IP). Sufficient per instance;
// use a shared store (Redis) if you run many instances.
module.exports = ({ windowMs = 60_000, max = 120 } = {}) => {
    const hits = new Map();
    setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); }, windowMs).unref();
    return (req, res, next) => {
        const key = (req.user && String(req.user._id)) || req.ip;
        const now = Date.now();
        let h = hits.get(key);
        if (!h || h.reset <= now) { h = { count: 0, reset: now + windowMs }; hits.set(key, h); }
        if (++h.count > max) {
            res.setHeader("Retry-After", Math.ceil((h.reset - now) / 1000));
            return res.status(429).json({ success: false, message: "Too many requests, slow down." });
        }
        next();
    };
};
