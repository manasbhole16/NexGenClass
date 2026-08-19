const Form = require('../models/form-model');
const FormQuestion = require('../models/formQuestion-model');
const FormResponse = require('../models/formResponse-model');
const Room = require('../models/room-model');
const User = require('../models/user-model');
const notificationService = require('../services/notificationService');
const mongoose = require('mongoose');
const XLSX = require('xlsx');

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

// Helper to validate and clean student answers against question definitions with automatic objective scoring
function validateCleanAndScoreAnswers(questions, rawAnswers) {
    const questionsMap = {};
    questions.forEach(q => {
        questionsMap[q._id.toString()] = q;
    });

    const answersByQId = {};
    if (Array.isArray(rawAnswers)) {
        rawAnswers.forEach(ans => {
            if (ans && ans.questionId) {
                answersByQId[ans.questionId.toString()] = ans;
            }
        });
    }

    const cleanedAnswers = [];
    let objectiveMarks = 0;

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qIdStr = q._id.toString();
        const ans = answersByQId[qIdStr];

        let textAnswer = '';
        let selectedOption = '';
        let selectedOptions = [];

        if (ans) {
            if (typeof ans.textAnswer === 'string') textAnswer = ans.textAnswer.trim();
            if (typeof ans.selectedOption === 'string') selectedOption = ans.selectedOption.trim();
            if (Array.isArray(ans.selectedOptions)) {
                selectedOptions = ans.selectedOptions.map(o => (typeof o === 'string' ? o.trim() : '')).filter(Boolean);
            }
        }

        // Validate Required
        if (q.required) {
            if (['short_answer', 'paragraph'].includes(q.type)) {
                if (!textAnswer) {
                    throw new Error(`Question "${q.questionText}" is required.`);
                }
            } else if (['multiple_choice', 'dropdown'].includes(q.type)) {
                if (!selectedOption) {
                    throw new Error(`Question "${q.questionText}" is required. Please select an option.`);
                }
            } else if (q.type === 'checkboxes') {
                if (selectedOptions.length === 0) {
                    throw new Error(`Question "${q.questionText}" is required. Please select at least one option.`);
                }
            }
        }

        // Validate Option validity
        const validOptionTexts = (q.options || []).map(o => (typeof o === 'string' ? o : o.text));

        if (['multiple_choice', 'dropdown'].includes(q.type) && selectedOption) {
            if (!validOptionTexts.includes(selectedOption)) {
                throw new Error(`Invalid option "${selectedOption}" for question "${q.questionText}".`);
            }
        }

        if (q.type === 'checkboxes' && selectedOptions.length > 0) {
            for (const selOpt of selectedOptions) {
                if (!validOptionTexts.includes(selOpt)) {
                    throw new Error(`Invalid checkbox option "${selOpt}" for question "${q.questionText}".`);
                }
            }
        }

        const maxMarks = (q.marks !== undefined && q.marks !== null && !isNaN(Number(q.marks))) ? Math.max(0, Number(q.marks)) : 1;
        let awardedMarks = 0;
        let isCorrect = false;
        let isGraded = false;

        // Automatic objective scoring
        if (['multiple_choice', 'dropdown'].includes(q.type)) {
            if (q.correctAnswer && q.correctAnswer.trim()) {
                isGraded = true;
                if (selectedOption === q.correctAnswer.trim()) {
                    isCorrect = true;
                    awardedMarks = maxMarks;
                } else {
                    isCorrect = false;
                    awardedMarks = 0;
                }
                objectiveMarks += awardedMarks;
            }
        } else if (q.type === 'checkboxes') {
            if (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0) {
                isGraded = true;
                const sortedUser = [...selectedOptions].sort();
                const sortedCorrect = [...q.correctAnswers].sort();
                const exactMatch = sortedUser.length === sortedCorrect.length && sortedUser.every((val, idx) => val === sortedCorrect[idx]);

                if (exactMatch) {
                    isCorrect = true;
                    awardedMarks = maxMarks;
                } else {
                    isCorrect = false;
                    awardedMarks = 0;
                }
                objectiveMarks += awardedMarks;
            }
        }

        cleanedAnswers.push({
            questionId: q._id,
            textAnswer,
            selectedOption,
            selectedOptions,
            awardedMarks,
            maxMarks,
            isCorrect,
            feedback: '',
            isGraded
        });
    }

    return { cleanedAnswers, objectiveMarks };
}

// 1. Submit Form Response (Student)
module.exports.submitResponse = async (req, res) => {
    try {
        const { id } = req.params;
        const { answers } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const isMember = await isRoomMember(req.user, form.roomId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: "You are not enrolled in this classroom." });
        }

        // Check Form status
        if (form.status === 'draft') {
            return res.status(403).json({ success: false, message: "Cannot submit to a draft form." });
        }

        if (form.status === 'closed') {
            return res.status(400).json({ success: false, message: "This form is closed and no longer accepting responses." });
        }

        // Check Start / End availability dates
        const now = new Date();
        if (form.startAt && now < new Date(form.startAt)) {
            return res.status(400).json({
                success: false,
                message: `This form is not open yet. It will open on ${new Date(form.startAt).toLocaleString()}.`
            });
        }

        if (form.endAt && now > new Date(form.endAt)) {
            return res.status(400).json({
                success: false,
                message: `This form closed on ${new Date(form.endAt).toLocaleString()}. Submissions are no longer accepted.`
            });
        }

        // Check Limit One Response
        if (form.limitOneResponse) {
            const existing = await FormResponse.findOne({ formId: form._id, studentId: req.user._id });
            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: "You have already submitted this form.",
                    existingResponseId: existing._id
                });
            }
        }

        // Load and validate questions with scoring
        const questions = await FormQuestion.find({ formId: id }).sort({ order: 1 });
        let cleanedAnswers;
        let objectiveMarks = 0;
        try {
            const result = validateCleanAndScoreAnswers(questions, answers || []);
            cleanedAnswers = result.cleanedAnswers;
            objectiveMarks = result.objectiveMarks;
        } catch (valErr) {
            return res.status(400).json({ success: false, message: valErr.message });
        }

        const formTotalMarks = form.totalMarks || questions.reduce((sum, q) => sum + (q.marks || 1), 0);
        const score = objectiveMarks;
        const percentage = formTotalMarks > 0 ? Math.round((score / formTotalMarks) * 100) : 0;

        const allGraded = questions.length > 0 && cleanedAnswers.every(a => a.isGraded);
        const anyGraded = cleanedAnswers.some(a => a.isGraded);
        const gradingStatus = allGraded ? 'graded' : anyGraded ? 'partially_graded' : 'pending';

        const newResponse = await FormResponse.create({
            formId: form._id,
            roomId: form.roomId,
            studentId: req.user._id,
            answers: cleanedAnswers,
            objectiveMarks,
            subjectiveMarks: 0,
            score,
            totalMarks: formTotalMarks,
            percentage,
            gradingStatus,
            status: 'submitted',
            submittedAt: new Date()
        });

        // Trigger Notification for Teacher
        if (form.createdBy && form.createdBy.toString() !== req.user._id.toString()) {
            const notif = {
                recipient: form.createdBy,
                actor: req.user._id,
                type: "form_response_submitted",
                title: "New Form Response",
                message: `${req.user.fullname} submitted a response for "${form.title}".`,
                entityType: "form",
                entityId: form._id,
                roomId: form.roomId,
                metadata: { formId: form._id, responseId: newResponse._id },
                dedupKey: `form_response_submitted:${form._id}:${newResponse._id}`
            };
            await notificationService.createNotification(notif, req.io);
        }

        res.status(201).json({
            success: true,
            message: "Your response has been recorded.",
            responseId: newResponse._id,
            submittedAt: newResponse.submittedAt,
            score: newResponse.score,
            totalMarks: newResponse.totalMarks,
            percentage: newResponse.percentage,
            gradingStatus: newResponse.gradingStatus,
            response: newResponse
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Edit Response (Student)
module.exports.editResponse = async (req, res) => {
    try {
        const { id, responseId } = req.params;
        const { answers } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id) || !responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID or Response ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const response = await FormResponse.findById(responseId);
        if (!response) {
            return res.status(404).json({ success: false, message: "Response not found." });
        }

        // Ownership check
        if (response.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized to edit another student's response." });
        }

        // Check if editing allowed
        if (!form.allowResponseEditing) {
            return res.status(403).json({ success: false, message: "Response editing is disabled for this form." });
        }

        if (form.status === 'closed') {
            return res.status(400).json({ success: false, message: "This form is closed. Edits cannot be submitted." });
        }

        const now = new Date();
        if (form.endAt && now > new Date(form.endAt)) {
            return res.status(400).json({ success: false, message: "This form has expired. Edits cannot be submitted." });
        }

        const questions = await FormQuestion.find({ formId: id }).sort({ order: 1 });
        let cleanedAnswers;
        let objectiveMarks = 0;
        try {
            const result = validateCleanAndScoreAnswers(questions, answers || []);
            cleanedAnswers = result.cleanedAnswers;
            objectiveMarks = result.objectiveMarks;
        } catch (valErr) {
            return res.status(400).json({ success: false, message: valErr.message });
        }

        const formTotalMarks = form.totalMarks || questions.reduce((sum, q) => sum + (q.marks || 1), 0);
        const score = objectiveMarks + (response.subjectiveMarks || 0);
        const percentage = formTotalMarks > 0 ? Math.round((score / formTotalMarks) * 100) : 0;

        const allGraded = questions.length > 0 && cleanedAnswers.every(a => a.isGraded);
        const anyGraded = cleanedAnswers.some(a => a.isGraded);
        const gradingStatus = allGraded ? 'graded' : anyGraded ? 'partially_graded' : 'pending';

        response.answers = cleanedAnswers;
        response.objectiveMarks = objectiveMarks;
        response.score = score;
        response.totalMarks = formTotalMarks;
        response.percentage = percentage;
        response.gradingStatus = gradingStatus;
        response.updatedAt = new Date();
        await response.save();

        res.json({
            success: true,
            message: "Response updated successfully.",
            response
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get Authenticated Student's Own Response
module.exports.getMyResponse = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const isMember = await isRoomMember(req.user, form.roomId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: "Not authorized to view responses for this classroom." });
        }

        const response = await FormResponse.findOne({ formId: id, studentId: req.user._id }).sort({ submittedAt: -1 });

        res.json({
            success: true,
            response: response || null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Get All Responses for a Form (Teacher Only)
module.exports.getFormResponses = async (req, res) => {
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
            return res.status(403).json({ success: false, message: "Only classroom teachers can view all form responses." });
        }

        const responses = await FormResponse.find({ formId: id })
            .sort({ submittedAt: -1 })
            .populate('studentId', 'fullname email role');

        const uniqueStudents = new Set(responses.map(r => r.studentId?._id?.toString() || r.studentId?.toString())).size;

        res.json({
            success: true,
            totalResponses: responses.length,
            studentsResponded: uniqueStudents,
            responses
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Get Individual Response Detail
module.exports.getIndividualResponse = async (req, res) => {
    try {
        const { id, responseId } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id) || !responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID or Response ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const response = await FormResponse.findById(responseId).populate('studentId', 'fullname email');
        if (!response) {
            return res.status(404).json({ success: false, message: "Response not found." });
        }

        const isTeacher = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);
        const isOwner = response.studentId?._id?.toString() === req.user._id.toString() || response.studentId?.toString() === req.user._id.toString();

        if (!isTeacher && !isOwner) {
            return res.status(403).json({ success: false, message: "Not authorized to view this response." });
        }

        const questions = await FormQuestion.find({ formId: id }).sort({ order: 1 });

        const answersMap = {};
        (response.answers || []).forEach(a => {
            if (a.questionId) answersMap[a.questionId.toString()] = a;
        });

        const detailedAnswers = questions.map(q => {
            const ans = answersMap[q._id.toString()];
            const baseObj = {
                questionId: q._id,
                questionText: q.questionText,
                description: q.description,
                type: q.type,
                required: q.required,
                marks: q.marks !== undefined ? q.marks : 1,
                options: q.options,
                textAnswer: ans?.textAnswer || '',
                selectedOption: ans?.selectedOption || '',
                selectedOptions: ans?.selectedOptions || [],
                awardedMarks: ans?.awardedMarks || 0,
                maxMarks: ans?.maxMarks || q.marks || 1,
                isCorrect: ans?.isCorrect || false,
                feedback: ans?.feedback || '',
                isGraded: ans?.isGraded || false
            };

            // Answer key only exposed to teachers
            if (isTeacher) {
                baseObj.correctAnswer = q.correctAnswer || '';
                baseObj.correctAnswers = q.correctAnswers || [];
            }
            return baseObj;
        });

        res.json({
            success: true,
            form: {
                _id: form._id,
                title: form.title,
                description: form.description,
                topic: form.topic,
                status: form.status,
                collectEmail: form.collectEmail,
                totalMarks: form.totalMarks,
                showResultsImmediately: form.showResultsImmediately
            },
            student: response.studentId,
            submittedAt: response.submittedAt,
            objectiveMarks: response.objectiveMarks,
            subjectiveMarks: response.subjectiveMarks,
            score: response.score,
            totalMarks: response.totalMarks,
            percentage: response.percentage,
            gradingStatus: response.gradingStatus,
            gradedAt: response.gradedAt,
            answers: detailedAnswers,
            response
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Get Classroom Participation / Roster Status (Teacher Only)
module.exports.getResponseStatus = async (req, res) => {
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
            return res.status(403).json({ success: false, message: "Not authorized to view response status." });
        }

        const room = await Room.findById(form.roomId).populate('members', 'fullname email role');
        if (!room) {
            return res.status(404).json({ success: false, message: "Classroom not found." });
        }

        // Filter classroom members to students
        const students = (room.members || []).filter(m => m.role === 'student' || m._id.toString() !== room.owner?.toString());

        const responses = await FormResponse.find({ formId: id });
        const responseMap = {};
        responses.forEach(r => {
            responseMap[r.studentId.toString()] = r;
        });

        let respondedCount = 0;
        const participation = students.map(st => {
            const resp = responseMap[st._id.toString()];
            if (resp) respondedCount++;
            return {
                studentId: st._id,
                studentName: st.fullname,
                email: st.email,
                responded: !!resp,
                submittedAt: resp ? resp.submittedAt : null,
                responseId: resp ? resp._id : null,
                score: resp ? resp.score : null,
                totalMarks: resp ? resp.totalMarks : null,
                gradingStatus: resp ? resp.gradingStatus : null
            };
        });

        res.json({
            success: true,
            totalStudents: students.length,
            respondedCount,
            notRespondedCount: Math.max(0, students.length - respondedCount),
            participation
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Teacher Grading Flow (POST / PUT /api/forms/:id/responses/:responseId/grade)
module.exports.gradeResponse = async (req, res) => {
    try {
        const { id, responseId } = req.params;
        const { grades } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id) || !responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID or Response ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const authorized = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);
        if (!authorized) {
            return res.status(403).json({ success: false, message: "Only teachers can grade responses." });
        }

        const response = await FormResponse.findById(responseId);
        if (!response) {
            return res.status(404).json({ success: false, message: "Response not found." });
        }

        if (!Array.isArray(grades)) {
            return res.status(400).json({ success: false, message: "Grades must be provided as an array." });
        }

        const questions = await FormQuestion.find({ formId: id });
        const questionMap = {};
        questions.forEach(q => {
            questionMap[q._id.toString()] = q;
        });

        const answersMap = {};
        (response.answers || []).forEach(a => {
            if (a.questionId) answersMap[a.questionId.toString()] = a;
        });

        // Validate and apply each grade entry
        for (const g of grades) {
            if (!g || !g.questionId || !mongoose.Types.ObjectId.isValid(g.questionId)) {
                return res.status(400).json({ success: false, message: "Invalid questionId in grade entry." });
            }

            const q = questionMap[g.questionId.toString()];
            if (!q) {
                return res.status(400).json({ success: false, message: `Question ${g.questionId} does not belong to this form.` });
            }

            const maxMarks = (q.marks !== undefined && q.marks !== null && !isNaN(Number(q.marks))) ? Math.max(0, Number(q.marks)) : 1;
            const marksVal = Number(g.awardedMarks);

            if (isNaN(marksVal) || marksVal < 0 || marksVal > maxMarks) {
                return res.status(400).json({
                    success: false,
                    message: `Marks for "${q.questionText}" must be between 0 and ${maxMarks}.`
                });
            }

            let ans = answersMap[g.questionId.toString()];
            if (!ans) {
                ans = {
                    questionId: q._id,
                    textAnswer: '',
                    selectedOption: '',
                    selectedOptions: []
                };
                response.answers.push(ans);
                answersMap[g.questionId.toString()] = ans;
            }

            ans.awardedMarks = marksVal;
            ans.maxMarks = maxMarks;
            ans.feedback = (g.feedback || '').trim();
            ans.isGraded = true;
            ans.isCorrect = (marksVal === maxMarks);
        }

        // Recalculate score and totals
        let objectiveTotal = 0;
        let subjectiveTotal = 0;

        for (const ans of response.answers) {
            const q = questionMap[ans.questionId.toString()];
            if (q) {
                if (['short_answer', 'paragraph'].includes(q.type)) {
                    subjectiveTotal += (ans.awardedMarks || 0);
                } else {
                    objectiveTotal += (ans.awardedMarks || 0);
                }
            }
        }

        const formTotalMarks = form.totalMarks || questions.reduce((sum, q) => sum + (q.marks || 1), 0);
        const totalScore = objectiveTotal + subjectiveTotal;
        const percentage = formTotalMarks > 0 ? Math.round((totalScore / formTotalMarks) * 100) : 0;

        const allGraded = questions.length > 0 && response.answers.every(a => a.isGraded);
        const anyGraded = response.answers.some(a => a.isGraded);
        const gradingStatus = allGraded ? 'graded' : anyGraded ? 'partially_graded' : 'pending';

        response.objectiveMarks = objectiveTotal;
        response.subjectiveMarks = subjectiveTotal;
        response.score = totalScore;
        response.totalMarks = formTotalMarks;
        response.percentage = percentage;
        response.gradingStatus = gradingStatus;
        response.gradedAt = new Date();
        response.evaluatedBy = req.user._id;

        await response.save();

        // Notification on grading completion
        if (response.studentId) {
            const notif = {
                recipient: response.studentId,
                actor: req.user._id,
                type: "form_graded",
                title: "Form Graded",
                message: `Your response for "${form.title}" has been graded. Score: ${response.score}/${response.totalMarks} (${response.percentage}%).`,
                entityType: "form",
                entityId: form._id,
                roomId: form.roomId,
                metadata: { formId: form._id, responseId: response._id, score: response.score, totalMarks: response.totalMarks },
                dedupKey: `form_graded:${form._id}:${response._id}`
            };
            await notificationService.createNotification(notif, req.io);
        }

        res.json({
            success: true,
            message: "Grading saved successfully.",
            score: response.score,
            totalMarks: response.totalMarks,
            percentage: response.percentage,
            gradingStatus: response.gradingStatus,
            response
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 8. Student Score / Result View (GET /api/forms/:id/responses/:responseId/result)
module.exports.getStudentResult = async (req, res) => {
    try {
        const { id, responseId } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id) || !responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
            return res.status(400).json({ success: false, message: "Invalid Form ID or Response ID." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const response = await FormResponse.findById(responseId).populate('studentId', 'fullname email');
        if (!response) {
            return res.status(404).json({ success: false, message: "Response not found." });
        }

        const isTeacher = await isAuthorizedTeacher(req.user, form.roomId, form.createdBy);
        const isOwner = response.studentId?._id?.toString() === req.user._id.toString() || response.studentId?.toString() === req.user._id.toString();

        if (!isTeacher && !isOwner) {
            return res.status(403).json({ success: false, message: "Not authorized to view this result." });
        }

        // Result release policy: if student and showResultsImmediately is false and grading is pending, withhold score
        if (!isTeacher && form.showResultsImmediately === false && response.gradingStatus !== 'graded') {
            return res.json({
                success: true,
                resultsReleased: false,
                message: "Results have not been released yet for this form.",
                gradingStatus: response.gradingStatus,
                submittedAt: response.submittedAt
            });
        }

        const questions = await FormQuestion.find({ formId: id }).sort({ order: 1 });
        const answersMap = {};
        (response.answers || []).forEach(a => {
            if (a.questionId) answersMap[a.questionId.toString()] = a;
        });

        const detailedAnswers = questions.map(q => {
            const ans = answersMap[q._id.toString()];
            return {
                questionId: q._id,
                questionText: q.questionText,
                type: q.type,
                marks: q.marks !== undefined ? q.marks : 1,
                awardedMarks: ans?.awardedMarks || 0,
                maxMarks: ans?.maxMarks || q.marks || 1,
                textAnswer: ans?.textAnswer || '',
                selectedOption: ans?.selectedOption || '',
                selectedOptions: ans?.selectedOptions || [],
                isCorrect: ans?.isCorrect || false,
                feedback: ans?.feedback || '',
                isGraded: ans?.isGraded || false
            };
        });

        res.json({
            success: true,
            resultsReleased: true,
            formTitle: form.title,
            score: response.score,
            totalMarks: response.totalMarks,
            percentage: response.percentage,
            objectiveMarks: response.objectiveMarks,
            subjectiveMarks: response.subjectiveMarks,
            gradingStatus: response.gradingStatus,
            gradedAt: response.gradedAt,
            submittedAt: response.submittedAt,
            answers: detailedAnswers
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 9. Response Overview Analytics (Teacher Only: GET /api/forms/:id/analytics)
module.exports.getFormAnalytics = async (req, res) => {
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
            return res.status(403).json({ success: false, message: "Only teachers can access form analytics." });
        }

        const room = await Room.findById(form.roomId).populate('members', 'fullname email role');
        const enrolledStudents = (room?.members || []).filter(m => m.role === 'student' || m._id.toString() !== room?.owner?.toString()).length;

        const responses = await FormResponse.find({ formId: id }).sort({ submittedAt: 1 }).lean();
        const totalResponses = responses.length;
        const uniqueRespondents = new Set(responses.map(r => r.studentId.toString())).size;
        const responseRate = enrolledStudents > 0 ? Math.round((uniqueRespondents / enrolledStudents) * 100) : 0;
        const pendingResponses = Math.max(0, enrolledStudents - uniqueRespondents);

        const firstResponseAt = responses.length > 0 ? responses[0].submittedAt : null;
        const latestResponseAt = responses.length > 0 ? responses[responses.length - 1].submittedAt : null;

        // Score analytics
        const scoredResponses = responses.filter(r => r.totalMarks > 0);
        let averageScore = 0;
        let highestScore = 0;
        let lowestScore = 0;
        let averagePercentage = 0;

        const scoreDistribution = [
            { range: '0-20%', count: 0 },
            { range: '21-40%', count: 0 },
            { range: '41-60%', count: 0 },
            { range: '61-80%', count: 0 },
            { range: '81-100%', count: 0 }
        ];

        if (scoredResponses.length > 0) {
            const scores = scoredResponses.map(r => r.score || 0);
            const percentages = scoredResponses.map(r => r.percentage || 0);

            averageScore = +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
            highestScore = Math.max(...scores);
            lowestScore = Math.min(...scores);
            averagePercentage = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);

            percentages.forEach(p => {
                if (p <= 20) scoreDistribution[0].count++;
                else if (p <= 40) scoreDistribution[1].count++;
                else if (p <= 60) scoreDistribution[2].count++;
                else if (p <= 80) scoreDistribution[3].count++;
                else scoreDistribution[4].count++;
            });
        }

        res.json({
            success: true,
            formTitle: form.title,
            totalResponses,
            uniqueRespondents,
            enrolledStudents,
            responseRate,
            pendingResponses,
            firstResponseAt,
            latestResponseAt,
            scoring: {
                totalMarks: form.totalMarks,
                hasScoring: (form.totalMarks || 0) > 0,
                scoredResponsesCount: scoredResponses.length,
                averageScore,
                highestScore,
                lowestScore,
                averagePercentage,
                scoreDistribution
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 10. Question-Level Analytics (Teacher Only: GET /api/forms/:id/question-analytics)
module.exports.getQuestionAnalytics = async (req, res) => {
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
            return res.status(403).json({ success: false, message: "Only teachers can access question analytics." });
        }

        const questions = await FormQuestion.find({ formId: id }).sort({ order: 1 }).lean();
        const responses = await FormResponse.find({ formId: id }).populate('studentId', 'fullname email').lean();
        const totalResponses = responses.length;

        const questionAnalytics = questions.map((q, qIndex) => {
            const qIdStr = q._id.toString();
            let answeredCount = 0;
            let skippedCount = 0;

            const optionCounts = {};
            (q.options || []).forEach(opt => {
                const optText = typeof opt === 'string' ? opt : opt.text;
                optionCounts[optText] = 0;
            });

            const textResponses = [];

            responses.forEach(r => {
                const ans = (r.answers || []).find(a => a.questionId?.toString() === qIdStr);
                if (!ans) {
                    skippedCount++;
                    return;
                }

                if (['short_answer', 'paragraph'].includes(q.type)) {
                    if (ans.textAnswer && ans.textAnswer.trim()) {
                        answeredCount++;
                        textResponses.push({
                            studentName: r.studentId?.fullname || 'Anonymous',
                            studentEmail: r.studentId?.email || '',
                            textAnswer: ans.textAnswer,
                            submittedAt: r.submittedAt,
                            awardedMarks: ans.awardedMarks,
                            maxMarks: ans.maxMarks || q.marks || 1
                        });
                    } else {
                        skippedCount++;
                    }
                } else if (['multiple_choice', 'dropdown'].includes(q.type)) {
                    if (ans.selectedOption) {
                        answeredCount++;
                        optionCounts[ans.selectedOption] = (optionCounts[ans.selectedOption] || 0) + 1;
                    } else {
                        skippedCount++;
                    }
                } else if (q.type === 'checkboxes') {
                    if (Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0) {
                        answeredCount++;
                        ans.selectedOptions.forEach(opt => {
                            optionCounts[opt] = (optionCounts[opt] || 0) + 1;
                        });
                    } else {
                        skippedCount++;
                    }
                }
            });

            const optionsBreakdown = (q.options || []).map(opt => {
                const optText = typeof opt === 'string' ? opt : opt.text;
                const count = optionCounts[optText] || 0;
                const percentage = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
                const isCorrect = q.type === 'checkboxes'
                    ? (q.correctAnswers || []).includes(optText)
                    : q.correctAnswer === optText;

                return {
                    text: optText,
                    count,
                    percentage,
                    isCorrect
                };
            });

            return {
                questionId: q._id,
                order: q.order !== undefined ? q.order : qIndex,
                questionText: q.questionText,
                questionType: q.type,
                marks: q.marks !== undefined ? q.marks : 1,
                required: q.required,
                totalResponses,
                answeredCount,
                skippedCount,
                optionsBreakdown: ['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type) ? optionsBreakdown : [],
                textResponses: ['short_answer', 'paragraph'].includes(q.type) ? textResponses : []
            };
        });

        res.json({
            success: true,
            formTitle: form.title,
            totalQuestions: questions.length,
            totalResponses,
            questions: questionAnalytics
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 11. Export Responses as CSV (Teacher Only: GET /api/forms/:id/export/csv)
module.exports.exportCSV = async (req, res) => {
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
            return res.status(403).json({ success: false, message: "Only teachers can export form responses." });
        }

        const questions = await FormQuestion.find({ formId: id }).sort({ order: 1 });
        const responses = await FormResponse.find({ formId: id })
            .sort({ submittedAt: -1 })
            .populate('studentId', 'fullname email');

        // CSV Helper to escape string
        const escapeCSV = (str) => {
            if (str === null || str === undefined) return '""';
            const stringified = String(str).replace(/"/g, '""');
            return `"${stringified}"`;
        };

        const headers = [
            "Student Name",
            "Student Email",
            "Response ID",
            "Submission Date",
            "Status",
            "Score",
            "Total Marks",
            "Percentage",
            "Grading Status",
            ...questions.map((q, idx) => `Q${idx + 1}: ${q.questionText}`)
        ];

        const rows = responses.map(r => {
            const studentName = r.studentId?.fullname || 'Anonymous';
            const studentEmail = r.studentId?.email || '';
            const respId = r._id.toString();
            const dateStr = r.submittedAt ? new Date(r.submittedAt).toISOString() : '';
            const status = r.status || 'submitted';
            const score = r.score !== undefined ? r.score : 0;
            const totalMarks = r.totalMarks !== undefined ? r.totalMarks : (form.totalMarks || 0);
            const percentage = `${r.percentage || 0}%`;
            const gradingStatus = r.gradingStatus || 'pending';

            const answersMap = {};
            (r.answers || []).forEach(a => {
                if (a.questionId) answersMap[a.questionId.toString()] = a;
            });

            const questionAnswers = questions.map(q => {
                const ans = answersMap[q._id.toString()];
                if (!ans) return '';
                if (['short_answer', 'paragraph'].includes(q.type)) {
                    return ans.textAnswer || '';
                } else if (['multiple_choice', 'dropdown'].includes(q.type)) {
                    return ans.selectedOption || '';
                } else if (q.type === 'checkboxes') {
                    return (ans.selectedOptions || []).join('; ');
                }
                return '';
            });

            return [
                escapeCSV(studentName),
                escapeCSV(studentEmail),
                escapeCSV(respId),
                escapeCSV(dateStr),
                escapeCSV(status),
                escapeCSV(score),
                escapeCSV(totalMarks),
                escapeCSV(percentage),
                escapeCSV(gradingStatus),
                ...questionAnswers.map(escapeCSV)
            ].join(',');
        });

        const csvData = [headers.map(escapeCSV).join(','), ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="form_${form._id}_responses.csv"`);
        return res.status(200).send(csvData);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 12. Export Responses and Analytics as Multi-Sheet Excel (Teacher Only: GET /api/forms/:id/export/xlsx)
module.exports.exportXLSX = async (req, res) => {
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
            return res.status(403).json({ success: false, message: "Only teachers can export form responses." });
        }

        const questions = await FormQuestion.find({ formId: id }).sort({ order: 1 });
        const responses = await FormResponse.find({ formId: id })
            .sort({ submittedAt: -1 })
            .populate('studentId', 'fullname email');

        const room = await Room.findById(form.roomId).populate('members', 'fullname email role');
        const students = (room?.members || []).filter(m => m.role === 'student' || m._id.toString() !== room?.owner?.toString());

        // Workbook creation
        const wb = XLSX.utils.book_new();

        // 1. Sheet: Responses
        const responsesData = responses.map(r => {
            const answersMap = {};
            (r.answers || []).forEach(a => {
                if (a.questionId) answersMap[a.questionId.toString()] = a;
            });

            const row = {
                "Student Name": r.studentId?.fullname || 'Anonymous',
                "Student Email": r.studentId?.email || '',
                "Response ID": r._id.toString(),
                "Submitted At": r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '',
                "Status": r.status || 'submitted',
                "Score": r.score || 0,
                "Total Marks": r.totalMarks || form.totalMarks || 0,
                "Percentage": `${r.percentage || 0}%`,
                "Grading Status": r.gradingStatus || 'pending'
            };

            questions.forEach((q, idx) => {
                const ans = answersMap[q._id.toString()];
                let answerText = '';
                if (ans) {
                    if (['short_answer', 'paragraph'].includes(q.type)) {
                        answerText = ans.textAnswer || '';
                    } else if (['multiple_choice', 'dropdown'].includes(q.type)) {
                        answerText = ans.selectedOption || '';
                    } else if (q.type === 'checkboxes') {
                        answerText = (ans.selectedOptions || []).join(', ');
                    }
                }
                row[`Q${idx + 1}: ${q.questionText}`] = answerText;
            });

            return row;
        });

        const wsResponses = XLSX.utils.json_to_sheet(responsesData.length > 0 ? responsesData : [{ "Message": "No responses submitted yet" }]);
        XLSX.utils.book_append_sheet(wb, wsResponses, "Responses");

        // 2. Sheet: Question Analytics
        const analyticsData = questions.map((q, idx) => {
            const qIdStr = q._id.toString();
            let answered = 0;
            let skipped = 0;
            const optionsCount = {};

            responses.forEach(r => {
                const ans = (r.answers || []).find(a => a.questionId?.toString() === qIdStr);
                if (!ans) {
                    skipped++;
                } else if (['short_answer', 'paragraph'].includes(q.type)) {
                    if (ans.textAnswer?.trim()) answered++;
                    else skipped++;
                } else if (['multiple_choice', 'dropdown'].includes(q.type)) {
                    if (ans.selectedOption) {
                        answered++;
                        optionsCount[ans.selectedOption] = (optionsCount[ans.selectedOption] || 0) + 1;
                    } else skipped++;
                } else if (q.type === 'checkboxes') {
                    if (ans.selectedOptions?.length > 0) {
                        answered++;
                        ans.selectedOptions.forEach(opt => {
                            optionsCount[opt] = (optionsCount[opt] || 0) + 1;
                        });
                    } else skipped++;
                }
            });

            const breakdown = Object.entries(optionsCount).map(([k, v]) => `${k} (${v})`).join('; ');

            return {
                "Question #": idx + 1,
                "Question Text": q.questionText,
                "Type": q.type,
                "Marks": q.marks || 1,
                "Total Responses": responses.length,
                "Answered": answered,
                "Skipped": skipped,
                "Option Breakdown": breakdown || 'N/A'
            };
        });

        const wsAnalytics = XLSX.utils.json_to_sheet(analyticsData);
        XLSX.utils.book_append_sheet(wb, wsAnalytics, "Question Analytics");

        // 3. Sheet: Participation
        const responseLookup = {};
        responses.forEach(r => {
            responseLookup[r.studentId?._id?.toString() || r.studentId?.toString()] = r;
        });

        const participationData = students.map(st => {
            const resp = responseLookup[st._id.toString()];
            return {
                "Student Name": st.fullname,
                "Email": st.email,
                "Responded": resp ? "Yes" : "No",
                "Submitted At": resp ? new Date(resp.submittedAt).toLocaleString() : "N/A",
                "Score": resp ? resp.score : "N/A",
                "Percentage": resp ? `${resp.percentage}%` : "N/A"
            };
        });

        const wsParticipation = XLSX.utils.json_to_sheet(participationData);
        XLSX.utils.book_append_sheet(wb, wsParticipation, "Participation");

        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="form_${form._id}_report.xlsx"`);
        return res.status(200).send(excelBuffer);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
