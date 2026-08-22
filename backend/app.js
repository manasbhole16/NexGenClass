const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const db = require("./config/mongoose");
require("dotenv").config();

const authRoutes = require("./routes/authRouter");
const taskRoutes = require("./routes/taskRouter");
const roomRoutes = require("./routes/roomRouter");
const chatRoutes = require("./routes/chatRouter");
const quizRoutes = require("./routes/quizRouter");
const submissionRoutes = require("./routes/submissionRouter");
const attendanceRoutes = require("./routes/attendanceRouter");
const assessmentRoutes = require("./routes/assessmentRouter");
const analyticsRoutes = require("./routes/analyticsRouter");
const notificationRoutes = require("./routes/notificationRouter");
const liveSessionRoutes = require("./routes/liveSessionRouter");
const formRoutes = require("./routes/formRouter");
const calendarRoutes = require("./routes/calendarRouter");
const fileRoutes = require("./routes/fileRouter");
const aiRoutes = require("./routes/aiRouter");
const ChatMessage = require("./models/chatMessage-model");
const { startTaskReminderJob } = require("./jobs/taskReminderJob");

const app = express();
const server = http.createServer(app);

// Production Configuration
const ORIGIN = [
    "https://task-buddy-4xix.vercel.app",
    "https://task-buddy-4xix.vercel.app/",
    "https://nex-gen-class.vercel.app",
    "https://nex-gen-class.vercel.app/",
    "https://nexgenback-gamma.vercel.app",
    "https://nexgenback-gamma.vercel.app/",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
];

// Socket.IO Setup
const io = new Server(server, {
    cors: {
        origin: ORIGIN,
        credentials: true
    }
});

// Database Connection Middleware for Serverless
app.use(async (req, res, next) => {
    try {
        await db.connectDB();
        next();
    } catch (error) {
        console.error("Database connection failed before request:", error.message || error);
        res.status(503).json({ error: "Database connection failed. Please try again later.", details: error.message });
    }
});

// Global Middlewares
app.use(cors({
    origin: ORIGIN,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Inject IO into requests
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/live-sessions", liveSessionRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/ai", aiRoutes);

// Socket Connection Handler
const usersInRooms = {}; // { roomId: [ { userId, fullname, socketId } ] }

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Private user notifications channel
    socket.on("joinUser", ({ userId }) => {
        if (!userId) return;
        const uId = userId.toString();
        socket.join(uId);
        socket.join(`user_${uId}`);
        console.log(`Socket ${socket.id} joined private channel user_${uId}`);
    });

    socket.on("joinRoom", ({ roomId, user }) => {
        if (!roomId || !user) return;

        socket.join(roomId);

        // Auto-join user room as well
        if (user._id) {
            const uId = user._id.toString();
            socket.join(uId);
            socket.join(`user_${uId}`);
        }

        // Track presence
        if (!usersInRooms[roomId]) usersInRooms[roomId] = [];

        // Remove existing entry for same user if exists (avoids duplicates on refresh)
        usersInRooms[roomId] = usersInRooms[roomId].filter(u => u.userId !== user._id);

        usersInRooms[roomId].push({
            userId: user._id,
            fullname: user.fullname,
            socketId: socket.id
        });

        io.to(roomId).emit("presenceUpdate", usersInRooms[roomId]);
        console.log(`User ${user.fullname} joined room ${roomId}`);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);

        // Find which room this socket was in and remove them
        for (const roomId in usersInRooms) {
            const initialCount = usersInRooms[roomId].length;
            usersInRooms[roomId] = usersInRooms[roomId].filter(u => u.socketId !== socket.id);

            if (usersInRooms[roomId].length !== initialCount) {
                io.to(roomId).emit("presenceUpdate", usersInRooms[roomId]);
            }
        }
    });

    socket.on("typing", ({ roomId, user, isTyping }) => {
        socket.to(roomId).emit("userTyping", { user, isTyping });
    });

    socket.on("chatMessage", async ({ roomId, message }) => {
        try {
            const count = await ChatMessage.countDocuments({ roomId });
            if (count >= 100) {
                return socket.emit("chatError", { message: "Chat limit reached (100 msgs). Please ask the room owner to clear the chat logs." });
            }

            const newMessage = new ChatMessage({
                roomId,
                sender: message.senderId,
                senderName: message.sender,
                text: message.text,
                timestamp: message.timestamp
            });

            await newMessage.save();
            io.to(roomId).emit("chatMessage", newMessage);
        } catch (err) {
            console.error("Chat error:", err);
        }
    });
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`NexGen Backend running on port ${PORT}`);
    });
}

// Export the Express API for Vercel Serverless Functions
module.exports = app;
