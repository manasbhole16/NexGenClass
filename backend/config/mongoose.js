const mongoose = require("mongoose");
let isConnected = false;

const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error("MONGO_URI is not defined. Set the database URI in your environment variables.");
    }

    if (isConnected || mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    mongoose.set("strictQuery", false);
    mongoose.set("bufferCommands", false);

    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
    });

    isConnected = true;
    console.log("Connected to MongoDB");

    // FORCED FIX FOR phone_1 DUPLICATE KEY ERROR
    try {
        const User = require("../models/user-model");
        await User.collection.dropIndex('phone_1');
        console.log("Successfully dropped the ghost 'phone_1' index.");
    } catch (indexErr) {
        if (indexErr.code === 27) {
            console.log("Note: 'phone_1' index not found (already removed).");
        } else {
            console.log("Index drop status:", indexErr.message);
        }
    }

    return mongoose.connection;
};

module.exports = { connectDB };