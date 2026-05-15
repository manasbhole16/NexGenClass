const mongoose = require("mongoose");

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI is not defined. Set the database URI in your environment variables.");
        }

        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000, // Fail fast if no connection
        };

        cached.promise = mongoose.connect(mongoUri, opts).then((mongoose) => {
            console.log("Connected to MongoDB (Cached for Serverless)");
            
            // FORCED FIX FOR phone_1 DUPLICATE KEY ERROR
            try {
                const User = require("../models/user-model");
                // Direct drop of the problematic index
                User.collection.dropIndex('phone_1').catch(() => {});
            } catch (err) {}

            return mongoose;
        }).catch(err => {
            console.log("Error connecting to MongoDB:", err.message);
            cached.promise = null;
            throw err;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
};

module.exports = { connectDB };