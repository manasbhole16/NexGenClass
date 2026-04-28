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
const ChatMessage = require("./models/chatMessage-model");

const app = express();
const server = http.createServer(app);

// Production Configuration
const ORIGIN = [
    "https://task-buddy-4xix.vercel.app",
    "https://task-buddy-4xix.vercel.app/",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
];

// Socket.IO Setup
const io = new Server(server, {
    cors: {
        origin: ORIGIN,
        credentials: true
    }
});

// Database Connection
db.connectDB();

// Global Middlewares
app.use(cors({
    origin: ORIGIN,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
app.use("/api/submissions", submissionRoutes);

// Socket Connection Handler
const usersInRooms = {}; // { roomId: [ { userId, fullname, socketId } ] }

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("joinRoom", ({ roomId, user }) => {
        if (!roomId || !user) return;

        socket.join(roomId);

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`NexGen Backend running on port ${PORT}`);
});
