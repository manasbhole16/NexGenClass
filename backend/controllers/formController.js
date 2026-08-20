const Form = require('../models/form-model');
const FormQuestion = require('../models/formQuestion-model');
const Room = require('../models/room-model');
const notificationService = require('../services/notificationService');
const mongoose = require('mongoose');

const SUPPORTED_QUESTION_TYPES = ['short_answer', 'paragraph', 'multiple_choice', 'checkboxes', 'dropdown'];

// Helper to check if user is teacher or classroom owner
async function isAuthorizedTeacher(user, roomId, createdBy = null) {
    if (!user) return false;
    if (user.role !== 'teacher') return false;
    if (createdBy && createdBy.toString() === user._id.toString()) return true;
    if (roomId) {
        const room = await Room.findById(roomId);
        if (room && (room.owner?.toString() === user._id.toString() || room.members?.some(m => m.toString() === user._id.toString()))) {
            return true;
        }
        return false;
    }
    return false;
}

// Helper to check room membership
async function isRoomMember(user, roomId) {
    if (!user || !roomId) return false;
    const room = await Room.findById(roomId);
    if (!room) return false;
    const userIdStr = user._id.toString();
    const isOwner = room.owner?.toString() === userIdStr;
    const isMember = room.members?.some(m => m.toString() === userIdStr);
    return isOwner || isMember;
}

// Helper to validate question payload
function validateQuestion(q, idx) {
    const qNum = idx + 1;
    if (!q || typeof q !== 'object') {
        throw new Error(`Question #${qNum}: Invalid question structure.`);
    }

    if (!q.questionText || typeof q.questionText !== 'string' || !q.questionText.trim()) {
        throw new Error(`Question #${qNum}: Question text is required.`);
    }

    if (!q.type || !SUPPORTED_QUESTION_TYPES.includes(q.type)) {
        throw new Error(`Question #${qNum}: Unsupported question type '${q.type}'. Supported types: ${SUPPORTED_QUESTION_TYPES.join(', ')}.`);
    }

    if (['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type)) {
        if (!Array.isArray(q.options) || q.options.length < 2) {
            throw new Error(`Question #${qNum}: ${q.type.replace('_', ' ')} requires at least 2 options.`);
        }
        for (let i = 0; i < q.options.length; i++) {
            const opt = q.options[i];
            const text = typeof opt === 'string' ? opt : opt?.text;
            if (!text || !text.trim()) {
                throw new Error(`Question #${qNum}: Option ${i + 1} cannot be empty.`);
            }
        }
    }
}

// 1. Create a Form
module.exports.createForm = async (req, res) => {
    try {
        const {
            title,
            description,
            roomId,
            topic,
            status,
            startAt,
            endAt,
            allowResponseEditing,
            limitOneResponse,
            collectEmail,
            showResultsImmediately,
            isTemplate
        } = req.body;

        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ success: false, message: "Form title is required." });
        }

        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ success: false, message: "Valid roomId is required." });
        }

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: "Classroom not found." });
        }

        const authorized = await isAuthorizedTeacher(req.user, roomId);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Only authorized teachers of this classroom can create forms." });
        }

        const validStatus = status && ['draft', 'published', 'closed'].includes(status) ? status : 'draft';

        let parsedStart = null;
        let parsedEnd = null;
        if (startAt) {
            parsedStart = new Date(startAt);
            if (isNaN(parsedStart.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid startAt date." });
            }
        }
        if (endAt) {
            parsedEnd = new Date(endAt);
            if (isNaN(parsedEnd.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid endAt date." });
            }
        }
        if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
            return res.status(400).json({ success: false, message: "startAt must be before endAt." });
        }

        const form = await Form.create({
            title: title.trim(),
            description: description?.trim() || '',
            roomId,
            createdBy: req.user._id,
            topic: topic?.trim() || 'General',
            status: validStatus,
            startAt: parsedStart,
            endAt: parsedEnd,
            allowResponseEditing: allowResponseEditing !== undefined ? !!allowResponseEditing : false,
            limitOneResponse: limitOneResponse !== undefined ? !!limitOneResponse : true,
            collectEmail: collectEmail !== undefined ? !!collectEmail : true,
            showResultsImmediately: showResultsImmediately !== undefined ? !!showResultsImmediately : true,
            totalMarks: 0,
            isTemplate: !!isTemplate,
            archived: false
        });

        res.status(201).json({
            success: true,
            message: "Form created successfully.",
            form
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get Forms by Room (with search, filtering, and sorting)
module.exports.getFormsByRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ success: false, message: "Invalid Room ID." });
        }

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: "Classroom not found." });
        }

        const isMember = await isRoomMember(req.user, roomId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: "Not authorized to access forms in this classroom." });
        }

        const isTeacher = await isAuthorizedTeacher(req.user, roomId);

        const {
            status,
            archived,
            isTemplate,
            topic,
            search,
            sort
        } = req.query;

        let query = { roomId };

        if (!isTeacher) {
            // Students only see active, non-archived, non-template forms that are published or closed
            query.archived = false;
            query.isTemplate = false;
            query.status = { $in: ['published', 'closed'] };
        } else {
            // Teachers can filter by archive state, template, and status
            if (archived === 'true') {
                query.archived = true;
            } else if (archived === 'false') {
                query.archived = false;
            }

            if (isTemplate === 'true') {
                query.isTemplate = true;
            } else if (isTemplate === 'false') {
                query.isTemplate = false;
            }

            if (status && status !== 'All') {
                query.status = status;
            }
        }

        if (topic && topic !== 'All') {
            query.topic = topic;
        }

        if (search && search.trim()) {
            query.$or = [
                { title: { $regex: search.trim(), $options: 'i' } },
                { description: { $regex: search.trim(), $options: 'i' } },
                { topic: { $regex: search.trim(), $options: 'i' } }
            ];
        }

        // Sorting
        let sortOption = { createdAt: -1 };
        if (sort === 'oldest') {
            sortOption = { createdAt: 1 };
        } else if (sort === 'title') {
            sortOption = { title: 1 };
        } else if (sort === 'updated') {
            sortOption = { updatedAt: -1 };
        }

        const forms = await Form.find(query)
            .sort(sortOption)
            .populate('createdBy', 'fullname email role');

        res.json({
            success: true,
            forms
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get Form Details and Questions
module.exports.getFormById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID." });
        }

        const form = await Form.findById(id).populate('createdBy', 'fullname email role');
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const isMember = await isRoomMember(req.user, form.roomId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: "Not authorized to view this form." });
        }

        const isTeacher = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);

        if (!isTeacher) {
            if (form.status === 'draft') {
                return res.status(403).json({ success: false, message: "Access denied. This form is currently in draft mode." });
            }
            if (form.archived) {
                return res.status(403).json({ success: false, message: "Access denied. This form has been archived." });
            }
            if (form.isTemplate) {
                return res.status(403).json({ success: false, message: "Access denied. This is a template." });
            }
        }

        const rawQuestions = await FormQuestion.find({ formId: id }).sort({ order: 1, createdAt: 1 }).lean();

        // Sanitize questions for student - never leak answer key
        const questions = rawQuestions.map(q => {
            if (isTeacher) {
                return q;
            }
            const { correctAnswer, correctAnswers, ...studentSafeQ } = q;
            return studentSafeQ;
        });

        res.json({
            success: true,
            form,
            questions,
            isTeacher
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Update Form Details & Settings
module.exports.updateForm = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const authorized = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Not authorized to modify this form." });
        }

        const {
            title,
            description,
            topic,
            status,
            startAt,
            endAt,
            allowResponseEditing,
            limitOneResponse,
            collectEmail,
            showResultsImmediately,
            isTemplate,
            archived
        } = req.body;

        if (title !== undefined) {
            if (typeof title !== 'string' || !title.trim()) {
                return res.status(400).json({ success: false, message: "Form title cannot be empty." });
            }
            form.title = title.trim();
        }

        if (description !== undefined) form.description = description?.trim() || '';
        if (topic !== undefined) form.topic = topic?.trim() || 'General';

        if (status !== undefined) {
            if (!['draft', 'published', 'closed'].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status value. Must be draft, published, or closed." });
            }
            form.status = status;
        }

        if (startAt !== undefined) {
            if (startAt === null || startAt === '') {
                form.startAt = null;
            } else {
                const parsed = new Date(startAt);
                if (isNaN(parsed.getTime())) return res.status(400).json({ success: false, message: "Invalid startAt date." });
                form.startAt = parsed;
            }
        }

        if (endAt !== undefined) {
            if (endAt === null || endAt === '') {
                form.endAt = null;
            } else {
                const parsed = new Date(endAt);
                if (isNaN(parsed.getTime())) return res.status(400).json({ success: false, message: "Invalid endAt date." });
                form.endAt = parsed;
            }
        }

        if (form.startAt && form.endAt && form.startAt > form.endAt) {
            return res.status(400).json({ success: false, message: "startAt must be before endAt." });
        }

        if (allowResponseEditing !== undefined) form.allowResponseEditing = !!allowResponseEditing;
        if (limitOneResponse !== undefined) form.limitOneResponse = !!limitOneResponse;
        if (collectEmail !== undefined) form.collectEmail = !!collectEmail;
        if (showResultsImmediately !== undefined) form.showResultsImmediately = !!showResultsImmediately;
        if (isTemplate !== undefined) form.isTemplate = !!isTemplate;
        if (archived !== undefined) form.archived = !!archived;

        await form.save();

        res.json({
            success: true,
            message: "Form updated successfully.",
            form
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Save / Atomic Replace Questions
module.exports.saveQuestions = async (req, res) => {
    try {
        const { id } = req.params;
        const { questions } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID." });
        }

        if (!Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: "Questions must be provided as an array." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const authorized = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Not authorized to modify questions for this form." });
        }

        const formattedQuestions = [];

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            validateQuestion(q, i);

            let formattedOptions = [];
            if (['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type)) {
                formattedOptions = (q.options || []).map(opt => {
                    const text = typeof opt === 'string' ? opt : opt?.text;
                    return { text: (text || '').trim() };
                });
            }

            const marksVal = q.marks !== undefined && !isNaN(Number(q.marks)) ? Math.max(0, Number(q.marks)) : 1;
            const correctAnswerVal = typeof q.correctAnswer === 'string' ? q.correctAnswer.trim() : '';
            const correctAnswersVal = Array.isArray(q.correctAnswers)
                ? q.correctAnswers.map(c => (typeof c === 'string' ? c.trim() : '')).filter(Boolean)
                : [];

            formattedQuestions.push({
                formId: id,
                questionText: q.questionText.trim(),
                description: q.description?.trim() || '',
                type: q.type,
                options: formattedOptions,
                required: !!q.required,
                marks: marksVal,
                correctAnswer: correctAnswerVal,
                correctAnswers: correctAnswersVal,
                order: q.order !== undefined && !isNaN(Number(q.order)) ? Number(q.order) : i
            });
        }

        // Atomic replacement
        await FormQuestion.deleteMany({ formId: id });
        let savedQuestions = [];
        if (formattedQuestions.length > 0) {
            savedQuestions = await FormQuestion.insertMany(formattedQuestions);
        }

        // Recalculate and update total marks on the Form
        const calculatedTotalMarks = savedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
        form.totalMarks = calculatedTotalMarks;
        await form.save();

        res.status(200).json({
            success: true,
            message: "Questions saved successfully.",
            count: savedQuestions.length,
            totalMarks: calculatedTotalMarks,
            questions: savedQuestions
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 6. Publish / Toggle Publish Form
module.exports.publishForm = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const authorized = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Not authorized to publish this form." });
        }

        const newStatus = form.status === 'published' ? 'draft' : 'published';
        form.status = newStatus;
        await form.save();

        if (newStatus === 'published' && form.roomId) {
            const room = await Room.findById(form.roomId);
            if (room) {
                const enrolledStudentIds = (room.members || []).filter(m => m.toString() !== req.user._id.toString());
                if (enrolledStudentIds.length > 0) {
                    const notifs = enrolledStudentIds.map(stId => ({
                        recipient: stId,
                        actor: req.user._id,
                        type: "form_published",
                        title: "New Form Published",
                        message: `Form "${form.title}" is now available in "${room.name}".`,
                        entityType: "form",
                        entityId: form._id,
                        roomId: room._id,
                        metadata: { formId: form._id, title: form.title }
                    }));
                    await notificationService.createManyNotifications(notifs, req.io);
                }
            }
        }

        res.json({
            success: true,
            message: `Form status updated to ${newStatus}.`,
            form
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Close Form
module.exports.closeForm = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const authorized = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Not authorized to close this form." });
        }

        form.status = 'closed';
        await form.save();

        res.json({
            success: true,
            message: "Form closed successfully.",
            form
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 8. Archive Form
module.exports.archiveForm = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const authorized = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Not authorized to archive this form." });
        }

        form.archived = true;
        await form.save();

        res.json({
            success: true,
            message: "Form archived successfully.",
            form
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 9. Unarchive Form
module.exports.unarchiveForm = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const authorized = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Not authorized to unarchive this form." });
        }

        form.archived = false;
        await form.save();

        res.json({
            success: true,
            message: "Form unarchived successfully.",
            form
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 10. Duplicate Form
module.exports.duplicateForm = async (req, res) => {
    let newForm = null;
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const authorized = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Not authorized to duplicate this form." });
        }

        const customTitle = req.body?.title ? req.body.title.trim() : `Copy of ${form.title}`;

        // 1. Create duplicate form document (starts as draft, no responses, same room)
        newForm = await Form.create({
            title: customTitle,
            description: form.description,
            roomId: form.roomId,
            createdBy: req.user._id,
            topic: form.topic,
            status: 'draft',
            startAt: null,
            endAt: null,
            allowResponseEditing: form.allowResponseEditing,
            limitOneResponse: form.limitOneResponse,
            collectEmail: form.collectEmail,
            showResultsImmediately: form.showResultsImmediately,
            totalMarks: form.totalMarks || 0,
            isTemplate: false,
            archived: false
        });

        // 2. Fetch original questions
        const originalQuestions = await FormQuestion.find({ formId: id }).sort({ order: 1, createdAt: 1 });

        // 3. Duplicate questions
        const duplicateQuestionsData = originalQuestions.map(q => ({
            formId: newForm._id,
            questionText: q.questionText,
            description: q.description,
            type: q.type,
            options: (q.options || []).map(opt => ({ text: typeof opt === 'string' ? opt : opt.text })),
            required: q.required,
            marks: q.marks !== undefined ? q.marks : 1,
            correctAnswer: q.correctAnswer || '',
            correctAnswers: q.correctAnswers || [],
            order: q.order
        }));

        let savedQuestions = [];
        if (duplicateQuestionsData.length > 0) {
            savedQuestions = await FormQuestion.insertMany(duplicateQuestionsData);
        }

        res.status(201).json({
            success: true,
            message: "Form duplicated successfully.",
            form: newForm,
            questions: savedQuestions
        });
    } catch (error) {
        // Cleanup if error occurred during question duplication
        if (newForm && newForm._id) {
            await Form.findByIdAndDelete(newForm._id).catch(() => {});
            await FormQuestion.deleteMany({ formId: newForm._id }).catch(() => {});
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// 11. Create Template Copy of Form
module.exports.createTemplate = async (req, res) => {
    let templateForm = null;
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const authorized = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Not authorized to create a template from this form." });
        }

        const templateTitle = req.body?.title ? req.body.title.trim() : `${form.title} (Template)`;

        templateForm = await Form.create({
            title: templateTitle,
            description: form.description,
            roomId: form.roomId,
            createdBy: req.user._id,
            topic: form.topic,
            status: 'draft',
            startAt: null,
            endAt: null,
            allowResponseEditing: form.allowResponseEditing,
            limitOneResponse: form.limitOneResponse,
            collectEmail: form.collectEmail,
            showResultsImmediately: form.showResultsImmediately,
            totalMarks: form.totalMarks || 0,
            isTemplate: true,
            archived: false
        });

        const originalQuestions = await FormQuestion.find({ formId: id }).sort({ order: 1, createdAt: 1 });
        const templateQuestionsData = originalQuestions.map(q => ({
            formId: templateForm._id,
            questionText: q.questionText,
            description: q.description,
            type: q.type,
            options: (q.options || []).map(opt => ({ text: typeof opt === 'string' ? opt : opt.text })),
            required: q.required,
            marks: q.marks !== undefined ? q.marks : 1,
            correctAnswer: q.correctAnswer || '',
            correctAnswers: q.correctAnswers || [],
            order: q.order
        }));

        let savedQuestions = [];
        if (templateQuestionsData.length > 0) {
            savedQuestions = await FormQuestion.insertMany(templateQuestionsData);
        }

        res.status(201).json({
            success: true,
            message: "Template created successfully.",
            form: templateForm,
            questions: savedQuestions
        });
    } catch (error) {
        if (templateForm && templateForm._id) {
            await Form.findByIdAndDelete(templateForm._id).catch(() => {});
            await FormQuestion.deleteMany({ formId: templateForm._id }).catch(() => {});
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// 12. Create Form from Template
module.exports.createFromTemplate = async (req, res) => {
    let newForm = null;
    try {
        const { id } = req.params; // template ID
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Template Form ID." });
        }

        const templateForm = await Form.findById(id);
        if (!templateForm) {
            return res.status(404).json({ success: false, message: "Template form not found." });
        }

        const targetRoomId = req.body?.roomId || templateForm.roomId;
        if (!targetRoomId || !mongoose.Types.ObjectId.isValid(targetRoomId)) {
            return res.status(400).json({ success: false, message: "Valid target roomId is required." });
        }

        // Verify authorized in target classroom
        const authorized = await isAuthorizedTeacher(req.user, targetRoomId);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Not authorized to create forms in the target classroom." });
        }

        const formTitle = req.body?.title ? req.body.title.trim() : templateForm.title.replace(' (Template)', '');

        newForm = await Form.create({
            title: formTitle,
            description: templateForm.description,
            roomId: targetRoomId,
            createdBy: req.user._id,
            topic: templateForm.topic,
            status: 'draft',
            startAt: null,
            endAt: null,
            allowResponseEditing: templateForm.allowResponseEditing,
            limitOneResponse: templateForm.limitOneResponse,
            collectEmail: templateForm.collectEmail,
            showResultsImmediately: templateForm.showResultsImmediately,
            totalMarks: templateForm.totalMarks || 0,
            isTemplate: false,
            archived: false
        });

        const templateQuestions = await FormQuestion.find({ formId: id }).sort({ order: 1, createdAt: 1 });
        const newQuestionsData = templateQuestions.map(q => ({
            formId: newForm._id,
            questionText: q.questionText,
            description: q.description,
            type: q.type,
            options: (q.options || []).map(opt => ({ text: typeof opt === 'string' ? opt : opt.text })),
            required: q.required,
            marks: q.marks !== undefined ? q.marks : 1,
            correctAnswer: q.correctAnswer || '',
            correctAnswers: q.correctAnswers || [],
            order: q.order
        }));

        let savedQuestions = [];
        if (newQuestionsData.length > 0) {
            savedQuestions = await FormQuestion.insertMany(newQuestionsData);
        }

        res.status(201).json({
            success: true,
            message: "New form created from template successfully.",
            form: newForm,
            questions: savedQuestions
        });
    } catch (error) {
        if (newForm && newForm._id) {
            await Form.findByIdAndDelete(newForm._id).catch(() => {});
            await FormQuestion.deleteMany({ formId: newForm._id }).catch(() => {});
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// 13. Delete Form
module.exports.deleteForm = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const authorized = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Not authorized to delete this form." });
        }

        await Form.findByIdAndDelete(id);
        await FormQuestion.deleteMany({ formId: id });

        res.json({
            success: true,
            message: "Form and all questions deleted successfully."
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
