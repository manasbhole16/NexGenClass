const User = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const generateToken = (user) => {
    return jwt.sign({ email: user.email, id: user._id }, process.env.JWT_SECRET || "secretKey", { expiresIn: '1d' });
};

const sendToken = (user, statusCode, res) => {
    try {
        const token = generateToken(user);

        // Dynamic cookie options for production (Cross-Domain support)
        const isProduction = process.env.NODE_ENV === 'production';

        const options = {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: isProduction, // Must be true for SameSite: None
            sameSite: isProduction ? 'none' : 'lax'
        };

        console.log(`Setting cookie with SameSite: ${options.sameSite}, Secure: ${options.secure}`);

        res.cookie('token', token, options).status(statusCode).json({
            success: true,
            user: {
                _id: user._id,
                fullname: user.fullname,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error("Token Generation Error:", err);
        res.status(500).json({ message: "Error generating auth token" });
    }
}

module.exports.registerUser = async (req, res) => {
    try {
        const { fullname, email, password, role } = req.body;
        if (!fullname || !email || !password) return res.status(400).json({ message: "All fields are required" });

        let userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const user = await User.create({ fullname, email, password: hash, role: role || 'student' });
        sendToken(user, 201, res);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports.loginUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Email or Password incorrect" });

        // Enforce role consistency
        if (role && user.role !== role) {
            return res.status(403).json({ 
                message: `Account is registered as a ${user.role}. Please change your login type.` 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            sendToken(user, 200, res);
        } else {
            res.status(400).json({ message: "Email or Password incorrect" });
        }
    } catch (err) {
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports.logoutUser = (req, res) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.json({ success: true, message: "Logged out" });
};

module.exports.getProfile = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Not logged in" });
        const user = await User.findById(req.user._id).select('-password');
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
