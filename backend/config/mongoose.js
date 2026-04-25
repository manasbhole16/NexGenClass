const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // FORCED FIX FOR phone_1 DUPLICATE KEY ERROR
        try {
            const User = require("../models/user-model");
            // Direct drop of the problematic index
            await User.collection.dropIndex('phone_1');
            console.log("Successfully dropped the ghost 'phone_1' index.");
        } catch (indexErr) {
            // Index might not exist or already be dropped, which is fine
            if (indexErr.code === 27) {
                console.log("Note: 'phone_1' index not found (already removed).");
            } else {
                console.log("Index drop status:", indexErr.message);
            }
        }

    } catch (err) {
        console.log("Error connecting to MongoDB:", err.message);
        console.log("Backend continuing without MongoDB...");
        // process.exit(1);
    }
};

module.exports = { connectDB };