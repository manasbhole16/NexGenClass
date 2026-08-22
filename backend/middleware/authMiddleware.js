const jwt = require('jsonwebtoken');
const User = require('../models/user-model');

module.exports.protect = async (req, res, next) => {
    let token;

    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, please login again." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretKey");
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ message: "User no longer exists." });
        }

        next();
    } catch (error) {
        res.status(401).json({ message: "Session expired, please login again." });
    }
};

module.exports.optionalAuth = async (req, res, next) => {
    let token;
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretKey");
        req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
        req.user = null;
    }
    next();
};
