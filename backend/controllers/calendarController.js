const mongoose = require("mongoose");
const Task = require("../models/task-model");
const Quiz = require("../models/quiz-model");
const Form = require("../models/form-model");
const Attendance = require("../models/attendance-model");
const LiveSession = require("../models/liveSession-model");
const Room = require("../models/room-model");
const Submission = require("../models/submission-model");
const Attempt = require("../models/attempt-model");
const FormResponse = require("../models/formResponse-model");

// Helper to format Date into YYYY-MM-DD
function toDateString(date) {
    if (!date) return null;
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split("T")[0];
    } catch {
        return null;
    }
}

// Helper to safely get classrooms user is enrolled in or owns
async function getUserRooms(userId, userRole) {
    const query = { members: userId };
    const rooms = await Room.find(query).select("_id name code owner");
    return rooms;
}

// 1. Unified Calendar Events Aggregator
exports.getCalendarEvents = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = (req.user.role || "student").toLowerCase();
        const { startDate, endDate, roomId, eventType, status, search } = req.query;

        const userRooms = await getUserRooms(userId, userRole);
        const enrolledRoomIds = userRooms.map(r => r._id);
        const roomMap = new Map(userRooms.map(r => [r._id.toString(), r]));

        // Target rooms filter
        let targetRoomIds = enrolledRoomIds;
        let includePersonal = true;

        if (roomId === "personal") {
            targetRoomIds = [];
            includePersonal = true;
        } else if (roomId && roomId !== "all") {
            if (enrolledRoomIds.some(id => id.toString() === roomId)) {
                targetRoomIds = [new mongoose.Types.ObjectId(roomId)];
                includePersonal = false;
            } else {
                return res.status(403).json({ success: false, message: "Access denied to classroom." });
            }
        }

        const events = [];
        const now = new Date();
        const startFilter = startDate ? new Date(startDate) : null;
        const endFilter = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;

        // ==========================================
        // A. ASSIGNMENTS & CLASSROOM MATERIALS
        // ==========================================
        if (!eventType || eventType === "all" || eventType === "assignment") {
            const taskQuery = {};
            if (targetRoomIds.length > 0) {
                taskQuery.room = { $in: targetRoomIds };
                if (userRole === "student") {
                    taskQuery.isDraft = { $ne: true };
                }
                if (startFilter || endFilter) {
                    taskQuery.dueDate = {};
                    if (startFilter) taskQuery.dueDate.$gte = startFilter;
                    if (endFilter) taskQuery.dueDate.$lte = endFilter;
                } else {
                    taskQuery.dueDate = { $exists: true, $ne: null };
                }

                const assignments = await Task.find(taskQuery)
                    .populate("room", "name code")
                    .select("title description dueDate priority taskType category topic maxMarks room isDraft assignedTo");

                // Get student submissions for these assignments
                let submissionsMap = new Map();
                if (userRole === "student" && assignments.length > 0) {
                    const taskIds = assignments.map(a => a._id);
                    const submissions = await Submission.find({
                        studentId: userId,
                        taskId: { $in: taskIds }
                    }).select("taskId status marksAwarded submittedAt");
                    submissions.forEach(sub => {
                        submissionsMap.set(sub.taskId.toString(), sub);
                    });
                }

                assignments.forEach(task => {
                    // Check student assignment scope
                    if (userRole === "student" && Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
                        const isAssigned = task.assignedTo.some(id => id.toString() === userId.toString());
                        if (!isAssigned) return;
                    }

                    let taskStatus = "pending";
                    const sub = submissionsMap.get(task._id.toString());
                    if (userRole === "student") {
                        if (sub) {
                            if (sub.status === "graded" || sub.marksAwarded !== null) taskStatus = "graded";
                            else if (sub.status === "late") taskStatus = "submitted_late";
                            else taskStatus = "submitted";
                        } else if (task.dueDate && new Date(task.dueDate) < now) {
                            taskStatus = "overdue";
                        }
                    } else {
                        taskStatus = task.isDraft ? "draft" : "published";
                    }

                    const dateStr = toDateString(task.dueDate);
                    if (dateStr) {
                        events.push({
                            id: `assignment_${task._id}`,
                            eventType: "assignment",
                            title: task.title,
                            description: task.description || "",
                            date: dateStr,
                            start: task.dueDate,
                            end: task.dueDate,
                            startTime: new Date(task.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                            endTime: "",
                            classroom: task.room ? { _id: task.room._id, name: task.room.name, code: task.room.code } : null,
                            topic: task.topic || "General",
                            priority: task.priority || "Medium",
                            maxMarks: task.maxMarks || 100,
                            status: taskStatus,
                            isPersonal: false,
                            sourceId: task._id.toString(),
                            metadata: {
                                taskType: task.taskType || "assignment",
                                isDraft: task.isDraft
                            }
                        });
                    }
                });
            }
        }

        // ==========================================
        // B. QUIZZES / ASSESSMENTS
        // ==========================================
        if (!eventType || eventType === "all" || eventType === "quiz") {
            if (targetRoomIds.length > 0) {
                const quizQuery = { roomId: { $in: targetRoomIds } };
                if (userRole === "student") {
                    quizQuery.isPublished = true;
                }

                const quizzes = await Quiz.find(quizQuery)
                    .select("title description deadline startDate scheduledAt timeLimit totalMarks passingMarks roomId isPublished resultVisibility topic");

                let attemptsMap = new Map();
                if (userRole === "student" && quizzes.length > 0) {
                    const quizIds = quizzes.map(q => q._id);
                    const attempts = await Attempt.find({
                        studentId: userId,
                        quizId: { $in: quizIds }
                    }).select("quizId status score isEvaluated");
                    attempts.forEach(att => {
                        attemptsMap.set(att.quizId.toString(), att);
                    });
                }

                quizzes.forEach(quiz => {
                    const roomObj = roomMap.get(quiz.roomId.toString());
                    const att = attemptsMap.get(quiz._id.toString());
                    
                    let quizStatus = "available";
                    if (userRole === "student") {
                        if (att) {
                            quizStatus = att.isEvaluated ? "graded" : "submitted";
                        } else if (quiz.deadline && new Date(quiz.deadline) < now) {
                            quizStatus = "overdue";
                        } else if (quiz.startDate && new Date(quiz.startDate) > now) {
                            quizStatus = "scheduled";
                        }
                    } else {
                        quizStatus = quiz.isPublished ? "published" : "draft";
                    }

                    const targetDate = quiz.deadline || quiz.startDate || quiz.scheduledAt;
                    const dateStr = toDateString(targetDate);

                    if (dateStr) {
                        events.push({
                            id: `quiz_${quiz._id}`,
                            eventType: "quiz",
                            title: quiz.title,
                            description: quiz.description || "",
                            date: dateStr,
                            start: quiz.startDate || quiz.deadline,
                            end: quiz.deadline,
                            startTime: quiz.startDate ? new Date(quiz.startDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
                            endTime: quiz.deadline ? new Date(quiz.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
                            classroom: roomObj ? { _id: roomObj._id, name: roomObj.name, code: roomObj.code } : null,
                            topic: quiz.topic || "Assessment",
                            priority: "High",
                            maxMarks: quiz.totalMarks || 100,
                            status: quizStatus,
                            isPersonal: false,
                            sourceId: quiz._id.toString(),
                            metadata: {
                                timeLimit: quiz.timeLimit,
                                passingMarks: quiz.passingMarks,
                                isPublished: quiz.isPublished
                            }
                        });
                    }
                });
            }
        }

        // ==========================================
        // C. GOOGLE FORMS
        // ==========================================
        if (!eventType || eventType === "all" || eventType === "form") {
            if (targetRoomIds.length > 0) {
                const formQuery = { roomId: { $in: targetRoomIds } };
                if (userRole === "student") {
                    formQuery.status = { $ne: "draft" };
                }

                const forms = await Form.find(formQuery)
                    .select("title description endAt startAt roomId status totalMarks topic");

                let responsesMap = new Map();
                if (userRole === "student" && forms.length > 0) {
                    const formIds = forms.map(f => f._id);
                    const responses = await FormResponse.find({
                        formId: { $in: formIds },
                        respondent: userId
                    }).select("formId submittedAt isCompleted");
                    responses.forEach(r => responsesMap.set(r.formId.toString(), r));
                }

                forms.forEach(form => {
                    const roomObj = roomMap.get(form.roomId.toString());
                    const resp = responsesMap.get(form._id.toString());
                    let formStatus = "pending";

                    if (userRole === "student") {
                        if (resp && resp.isCompleted) formStatus = "submitted";
                        else if (form.endAt && new Date(form.endAt) < now) formStatus = "overdue";
                    } else {
                        formStatus = form.status;
                    }

                    const targetDate = form.endAt || form.startAt;
                    const dateStr = toDateString(targetDate);

                    if (dateStr) {
                        events.push({
                            id: `form_${form._id}`,
                            eventType: "form",
                            title: form.title,
                            description: form.description || "",
                            date: dateStr,
                            start: form.startAt || form.endAt,
                            end: form.endAt,
                            startTime: form.startAt ? new Date(form.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
                            endTime: form.endAt ? new Date(form.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
                            classroom: roomObj ? { _id: roomObj._id, name: roomObj.name, code: roomObj.code } : null,
                            topic: form.topic || "Survey / Form",
                            priority: "Medium",
                            maxMarks: form.totalMarks || 0,
                            status: formStatus,
                            isPersonal: false,
                            sourceId: form._id.toString(),
                            metadata: { status: form.status }
                        });
                    }
                });
            }
        }

        // ==========================================
        // D. ATTENDANCE / CLASS SESSIONS (Phase 4)
        // ==========================================
        if (!eventType || eventType === "all" || eventType === "attendance") {
            if (targetRoomIds.length > 0) {
                const attQuery = { roomId: { $in: targetRoomIds } };
                if (startFilter || endFilter) {
                    const startStr = startFilter ? toDateString(startFilter) : null;
                    const endStr = endFilter ? toDateString(endFilter) : null;
                    if (startStr && endStr) attQuery.date = { $gte: startStr, $lte: endStr };
                    else if (startStr) attQuery.date = { $gte: startStr };
                    else if (endStr) attQuery.date = { $lte: endStr };
                }

                const attendances = await Attendance.find(attQuery)
                    .select("title sessionType date startTime endTime roomId isLocked records");

                attendances.forEach(att => {
                    const roomObj = roomMap.get(att.roomId.toString());
                    let attStatus = "scheduled";

                    if (userRole === "student") {
                        const myRecord = att.records.find(r => r.student?.toString() === userId.toString());
                        if (myRecord) {
                            attStatus = myRecord.status.toLowerCase(); // 'present', 'late', 'absent'
                        }
                    } else {
                        attStatus = att.isLocked ? "completed" : "recorded";
                    }

                    events.push({
                        id: `attendance_${att._id}`,
                        eventType: "attendance",
                        title: att.title || `${att.sessionType?.toUpperCase()} Session`,
                        description: `Class session for ${roomObj?.name || 'Classroom'}`,
                        date: att.date,
                        start: att.date,
                        end: att.date,
                        startTime: att.startTime || "09:00",
                        endTime: att.endTime || "10:00",
                        classroom: roomObj ? { _id: roomObj._id, name: roomObj.name, code: roomObj.code } : null,
                        topic: att.sessionType || "lecture",
                        priority: "Medium",
                        status: attStatus,
                        isPersonal: false,
                        sourceId: att._id.toString(),
                        metadata: {
                            sessionType: att.sessionType,
                            isLocked: att.isLocked
                        }
                    });
                });
            }
        }

        // ==========================================
        // E. PERSONAL TASKS & TO-DOS
        // ==========================================
        if (includePersonal && (!eventType || eventType === "all" || eventType === "task")) {
            const personalQuery = { room: null, owner: userId };
            if (startFilter || endFilter) {
                personalQuery.dueDate = {};
                if (startFilter) personalQuery.dueDate.$gte = startFilter;
                if (endFilter) personalQuery.dueDate.$lte = endFilter;
            } else {
                personalQuery.dueDate = { $exists: true, $ne: null };
            }

            const personalTasks = await Task.find(personalQuery)
                .select("title description dueDate priority status tags subtasks");

            personalTasks.forEach(task => {
                let taskStatus = task.status === "Done" ? "completed" : "pending";
                if (taskStatus !== "completed" && task.dueDate && new Date(task.dueDate) < now) {
                    taskStatus = "overdue";
                }

                const dateStr = toDateString(task.dueDate);
                if (dateStr) {
                    events.push({
                        id: `task_${task._id}`,
                        eventType: "task",
                        title: task.title,
                        description: task.description || "",
                        date: dateStr,
                        start: task.dueDate,
                        end: task.dueDate,
                        startTime: new Date(task.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        endTime: "",
                        classroom: null,
                        topic: "Personal To-Do",
                        priority: task.priority || "Medium",
                        status: taskStatus,
                        isPersonal: true,
                        sourceId: task._id.toString(),
                        metadata: {
                            originalStatus: task.status,
                            tags: task.tags,
                            subtasksCount: task.subtasks?.length || 0
                        }
                    });
                }
            });
        }

        // ==========================================
        // F. LIVE SESSIONS / CLASSROOM EVENTS
        // ==========================================
        if (!eventType || eventType === "all" || eventType === "event") {
            if (targetRoomIds.length > 0) {
                const liveQuery = { roomId: { $in: targetRoomIds } };
                if (startFilter || endFilter) {
                    liveQuery.scheduledAt = {};
                    if (startFilter) liveQuery.scheduledAt.$gte = startFilter;
                    if (endFilter) liveQuery.scheduledAt.$lte = endFilter;
                } else {
                    liveQuery.scheduledAt = { $exists: true, $ne: null };
                }

                const liveSessions = await LiveSession.find(liveQuery)
                    .select("title description scheduledAt status roomId hostId");

                liveSessions.forEach(session => {
                    const roomObj = roomMap.get(session.roomId.toString());
                    const dateStr = toDateString(session.scheduledAt);
                    if (dateStr) {
                        events.push({
                            id: `live_${session._id}`,
                            eventType: "event",
                            title: session.title,
                            description: session.description || "",
                            date: dateStr,
                            start: session.scheduledAt,
                            end: session.scheduledAt,
                            startTime: new Date(session.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                            endTime: "",
                            classroom: roomObj ? { _id: roomObj._id, name: roomObj.name, code: roomObj.code } : null,
                            topic: "Live Class / Meeting",
                            priority: "High",
                            status: session.status,
                            isPersonal: false,
                            sourceId: session._id.toString(),
                            metadata: {
                                hostId: session.hostId
                            }
                        });
                    }
                });
            }
        }

        // Apply Status Filter if specified
        let filteredEvents = events;
        if (status && status !== "all") {
            filteredEvents = filteredEvents.filter(e => {
                if (status === "overdue") return e.status === "overdue";
                if (status === "completed") return e.status === "completed" || e.status === "graded" || e.status === "submitted";
                if (status === "pending") return e.status === "pending" || e.status === "available" || e.status === "scheduled";
                return e.status === status;
            });
        }

        // Apply Search Filter if specified
        if (search && search.trim()) {
            const term = search.trim().toLowerCase();
            filteredEvents = filteredEvents.filter(e => 
                e.title.toLowerCase().includes(term) ||
                (e.description && e.description.toLowerCase().includes(term)) ||
                (e.classroom && e.classroom.name.toLowerCase().includes(term)) ||
                (e.topic && e.topic.toLowerCase().includes(term))
            );
        }

        // Sort events chronologically by date and start time
        filteredEvents.sort((a, b) => new Date(a.start || a.date) - new Date(b.start || b.date));

        res.status(200).json({
            success: true,
            totalEvents: filteredEvents.length,
            events: filteredEvents
        });
    } catch (error) {
        console.error("getCalendarEvents error:", error);
        res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
};

// 2. Upcoming Academic Agenda Feed (Grouped by Today, Tomorrow, This Week, Later, Overdue)
exports.getUpcomingAgenda = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = (req.user.role || "student").toLowerCase();

        const userRooms = await getUserRooms(userId, userRole);
        const enrolledRoomIds = userRooms.map(r => r._id);

        const now = new Date();
        const todayStr = toDateString(now);
        
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = toDateString(tomorrow);

        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = toDateString(nextWeek);

        // Fetch events for past 14 days and next 60 days
        const pastDate = new Date(now);
        pastDate.setDate(pastDate.getDate() - 14);

        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + 60);

        req.query.startDate = toDateString(pastDate);
        req.query.endDate = toDateString(futureDate);

        // Call internal aggregation
        const fakeRes = {
            status: () => fakeRes,
            json: (payload) => payload
        };

        // Reuse aggregation logic directly
        const result = await new Promise((resolve) => {
            exports.getCalendarEvents(req, {
                status: () => ({
                    json: (data) => resolve(data)
                })
            });
        });

        const allEvents = result.events || [];

        const grouped = {
            overdue: [],
            today: [],
            tomorrow: [],
            thisWeek: [],
            later: []
        };

        allEvents.forEach(event => {
            const eventDate = event.date;

            if (event.status === "overdue") {
                grouped.overdue.push(event);
            } else if (eventDate === todayStr) {
                grouped.today.push(event);
            } else if (eventDate === tomorrowStr) {
                grouped.tomorrow.push(event);
            } else if (eventDate > tomorrowStr && eventDate <= nextWeekStr) {
                grouped.thisWeek.push(event);
            } else if (eventDate > nextWeekStr) {
                grouped.later.push(event);
            }
        });

        res.status(200).json({
            success: true,
            summary: {
                totalOverdue: grouped.overdue.length,
                totalToday: grouped.today.length,
                totalUpcomingWeek: grouped.tomorrow.length + grouped.thisWeek.length
            },
            agenda: grouped
        });
    } catch (error) {
        console.error("getUpcomingAgenda error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 3. Quick Create Personal Task from Planner
exports.createPersonalTask = async (req, res) => {
    try {
        const { title, description, dueDate, priority = "Medium", tags = [] } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: "Title is required." });
        }

        const task = await Task.create({
            title: title.trim(),
            description: (description || "").trim(),
            dueDate: dueDate ? new Date(dueDate) : null,
            priority: ["Low", "Medium", "High", "Urgent"].includes(priority) ? priority : "Medium",
            tags: Array.isArray(tags) ? tags : [],
            status: "Todo",
            room: null,
            owner: req.user._id,
            taskType: "assignment"
        });

        if (req.io) {
            req.io.to(`user_${req.user._id}`).emit("taskCreated", task);
        }

        res.status(201).json({ success: true, message: "Personal task created.", task });
    } catch (error) {
        console.error("createPersonalTask error:", error);
        res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
};

// 4. Quick Toggle Task Completion from Planner
exports.toggleTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await Task.findOne({ _id: id, owner: req.user._id });
        if (!task) return res.status(404).json({ success: false, message: "Task not found or unauthorized." });

        task.status = task.status === "Done" ? "Todo" : "Done";
        await task.save();

        if (req.io) {
            req.io.to(`user_${req.user._id}`).emit("taskUpdated", task);
        }

        res.status(200).json({ success: true, message: "Task updated.", task });
    } catch (error) {
        console.error("toggleTaskStatus error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
