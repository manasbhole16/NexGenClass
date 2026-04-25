const jwt = require('jsonwebtoken');
const User = require('../models/user-model');

module.exports.protect = async (req, res, next) => {
    let token;

    // Verbose logging for debugging
    console.log("== AUTH CHECK ==");
    console.log("Cookies received:", req.cookies);

    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        console.log("No token found in cookies.");
        return res.status(401).json({ message: "Not authorized, please login again." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretKey");
        console.log("Token decoded for user ID:", decoded.id);

        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            console.log("User not found in database for this token.");
            return res.status(401).json({ message: "User no longer exists." });
        }

        next();
    } catch (error) {
        console.error("JWT Verification Error:", error.message);
        res.status(401).json({ message: "Session expired, please login again." });
    }
};
