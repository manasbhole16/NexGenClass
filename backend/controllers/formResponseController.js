const Form = require('../models/form-model');
const FormQuestion = require('../models/formQuestion-model');
const FormResponse = require('../models/formResponse-model');
const FormCollaborator = require('../models/formCollaborator-model');
const FormAccess = require('../models/formAccess-model');
const Room = require('../models/room-model');
const User = require('../models/user-model');
const notificationService = require('../services/notificationService');
const { getFormPermissions, canStudentAccessForm } = require('../services/formPermissionService');
const { logFormEvent } = require('../services/formAuditService');
const mongoose = require('mongoose');
const XLSX = require('xlsx');

// Helper to validate and clean student response answers
function validateCleanAndScoreAnswers(questions, rawAnswers, isDraft = false) {
    const cleanedAnswers = [];
    const questionMap = new Map();
    questions.forEach(q => questionMap.set(q._id.toString(), q));

    let objectiveMarks = 0;
    let hasSubjective = false;

    // Build map of answers by questionId
    const submittedMap = new Map();
    if (Array.isArray(rawAnswers)) {
        rawAnswers.forEach(a => {
            if (a && a.questionId) {
                submittedMap.set(a.questionId.toString(), a);
            }
        });
    }

    // Process every question in the form
    for (const q of questions) {
        const qIdStr = q._id.toString();
        const userAns = submittedMap.get(qIdStr);

        let textAnswer = userAns?.textAnswer !== undefined ? String(userAns.textAnswer).trim() : "";
        let selectedOption = userAns?.selectedOption !== undefined ? String(userAns.selectedOption).trim() : "";
        let selectedOptions = Array.isArray(userAns?.selectedOptions) ? userAns.selectedOptions.map(o => String(o).trim()) : [];
        let scaleValue = userAns?.scaleValue !== undefined && userAns?.scaleValue !== null ? Number(userAns.scaleValue) : null;
        let dateAnswer = userAns?.dateAnswer !== undefined ? String(userAns.dateAnswer).trim() : "";
        let timeAnswer = userAns?.timeAnswer !== undefined ? String(userAns.timeAnswer).trim() : "";
        let fileAnswer = userAns?.fileAnswer && typeof userAns.fileAnswer === 'object' ? userAns.fileAnswer : {
            fileUrl: '', fileName: '', fileSize: 0, mimeType: '', uploadedAt: null
        };
        const sectionId = q.sectionId || 'default';

        // Check if question was answered
        let isAnswered = false;
        if (['short_answer', 'paragraph'].includes(q.type) && textAnswer) isAnswered = true;
        if (['multiple_choice', 'dropdown'].includes(q.type) && selectedOption) isAnswered = true;
        if (q.type === 'checkboxes' && selectedOptions.length > 0) isAnswered = true;
        if (q.type === 'linear_scale' && scaleValue !== null && !isNaN(scaleValue)) isAnswered = true;
        if (q.type === 'date' && dateAnswer) isAnswered = true;
        if (q.type === 'time' && timeAnswer) isAnswered = true;
        if (q.type === 'file_upload' && fileAnswer.fileUrl) isAnswered = true;

        // If not a draft, enforce required constraint
        if (!isDraft && q.required && !isAnswered) {
            throw new Error(`Question "${q.questionText}" is required and must be answered.`);
        }

        // Validate choice options
        if (isAnswered && ['multiple_choice', 'dropdown'].includes(q.type)) {
            const validOptions = (q.options || []).map(o => typeof o === 'string' ? o.trim() : o.text?.trim());
            if (!validOptions.includes(selectedOption)) {
                throw new Error(`Invalid option selected for question "${q.questionText}".`);
            }
        }

        if (isAnswered && q.type === 'checkboxes') {
            const validOptions = (q.options || []).map(o => typeof o === 'string' ? o.trim() : o.text?.trim());
            for (const opt of selectedOptions) {
                if (!validOptions.includes(opt)) {
                    throw new Error(`Invalid option '${opt}' selected for question "${q.questionText}".`);
                }
            }
        }

        // Validate linear scale range
        if (isAnswered && q.type === 'linear_scale') {
            const min = q.scaleConfig?.min !== undefined ? q.scaleConfig.min : 1;
            const max = q.scaleConfig?.max !== undefined ? q.scaleConfig.max : 5;
            if (scaleValue < min || scaleValue > max) {
                throw new Error(`Rating for question "${q.questionText}" must be between ${min} and ${max}.`);
            }
        }

        // Validate file upload size & extension
        if (isAnswered && q.type === 'file_upload' && fileAnswer.fileUrl) {
            const maxSizeMB = q.fileUploadConfig?.maxFileSizeMB || 10;
            if (fileAnswer.fileSize && fileAnswer.fileSize > maxSizeMB * 1024 * 1024) {
                throw new Error(`Uploaded file exceeds the maximum allowed size of ${maxSizeMB} MB for question "${q.questionText}".`);
            }
            const allowed = q.fileUploadConfig?.allowedTypes || ['all'];
            if (!allowed.includes('all')) {
                const ext = (fileAnswer.fileName || '').split('.').pop()?.toLowerCase();
                const mime = (fileAnswer.mimeType || '').toLowerCase();
                const isPdf = ext === 'pdf' || mime.includes('pdf');
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || mime.includes('image');
                const isDoc = ['doc', 'docx', 'txt', 'rtf'].includes(ext) || mime.includes('document') || mime.includes('text');

                let matched = false;
                if (allowed.includes('pdf') && isPdf) matched = true;
                if (allowed.includes('images') && isImage) matched = true;
                if (allowed.includes('docs') && isDoc) matched = true;
                if (!matched) {
                    throw new Error(`Uploaded file type is not allowed for question "${q.questionText}". Allowed types: ${allowed.join(', ')}.`);
                }
            }
        }

        // Enforce Validation Rules
        if (isAnswered && q.validation && q.validation.enabled && q.validation.ruleType && q.validation.ruleType !== 'none') {
            const rule = q.validation.ruleType;
            const ruleVal = q.validation.value;
            const customError = q.validation.customError || null;

            if (['short_answer', 'paragraph'].includes(q.type) && textAnswer) {
                if (rule === 'min_length' && textAnswer.length < Number(ruleVal)) {
                    throw new Error(customError || `Question "${q.questionText}": Minimum length is ${ruleVal} characters.`);
                }
                if (rule === 'max_length' && textAnswer.length > Number(ruleVal)) {
                    throw new Error(customError || `Question "${q.questionText}": Maximum length is ${ruleVal} characters.`);
                }
                if (['min_value', 'max_value', 'exact_value'].includes(rule)) {
                    const numVal = Number(textAnswer);
                    if (isNaN(numVal)) {
                        throw new Error(customError || `Question "${q.questionText}": Value must be a valid number.`);
                    }
                    if (rule === 'min_value' && numVal < Number(ruleVal)) {
                        throw new Error(customError || `Question "${q.questionText}": Value must be at least ${ruleVal}.`);
                    }
                    if (rule === 'max_value' && numVal > Number(ruleVal)) {
                        throw new Error(customError || `Question "${q.questionText}": Value must be at most ${ruleVal}.`);
                    }
                    if (rule === 'exact_value' && numVal !== Number(ruleVal)) {
                        throw new Error(customError || `Question "${q.questionText}": Value must exactly equal ${ruleVal}.`);
                    }
                }
                if (rule === 'regex') {
                    const regex = new RegExp(ruleVal);
                    if (!regex.test(textAnswer)) {
                        throw new Error(customError || `Question "${q.questionText}": Input does not match required format.`);
                    }
                }
            }

            if (q.type === 'checkboxes' && selectedOptions.length > 0) {
                if (rule === 'min_select' && selectedOptions.length < Number(ruleVal)) {
                    throw new Error(customError || `Question "${q.questionText}": Please select at least ${ruleVal} options.`);
                }
                if (rule === 'max_select' && selectedOptions.length > Number(ruleVal)) {
                    throw new Error(customError || `Question "${q.questionText}": Please select at most ${ruleVal} options.`);
                }
                if (rule === 'exact_select' && selectedOptions.length !== Number(ruleVal)) {
                    throw new Error(customError || `Question "${q.questionText}": Please select exactly ${ruleVal} options.`);
                }
            }
        }

        // Auto-scoring for objective questions
        let awardedMarks = 0;
        let isCorrect = false;
        let isGraded = false;
        const maxMarks = q.marks !== undefined ? q.marks : 1;

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
                const correctSet = new Set(q.correctAnswers.map(a => a.trim()));
                const selectedSet = new Set(selectedOptions);
                const areSetsEqual = correctSet.size === selectedSet.size && [...correctSet].every(item => selectedSet.has(item));

                if (areSetsEqual) {
                    isCorrect = true;
                    awardedMarks = maxMarks;
                } else {
                    isCorrect = false;
                    awardedMarks = 0;
                }
                objectiveMarks += awardedMarks;
            }
        } else if (['short_answer', 'date', 'time'].includes(q.type)) {
            const val = q.type === 'date' ? dateAnswer : q.type === 'time' ? timeAnswer : textAnswer;
            if (q.correctAnswer && q.correctAnswer.trim() && val) {
                isGraded = true;
                if (val.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
                    isCorrect = true;
                    awardedMarks = maxMarks;
                } else {
                    isCorrect = false;
                    awardedMarks = 0;
                }
                objectiveMarks += awardedMarks;
            }
        }

        if (['paragraph', 'file_upload'].includes(q.type) || (['short_answer'].includes(q.type) && !q.correctAnswer)) {
            hasSubjective = true;
        }

        cleanedAnswers.push({
            questionId: q._id,
            sectionId,
            textAnswer,
            selectedOption,
            selectedOptions,
            scaleValue,
            dateAnswer,
            timeAnswer,
            fileAnswer,
            awardedMarks,
            maxMarks,
            isCorrect,
            feedback: '',
            isGraded
        });
    }

    return { cleanedAnswers, objectiveMarks, hasSubjective };
}

// 1. Submit Form Response (Student)
module.exports.submitResponse = async (req, res) => {
    try {
        const { id } = req.params;
        const { answers, isDraft = false } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        // Check Form status & archive
        if (form.archived) {
            return res.status(400).json({ success: false, message: "This form has been archived and is no longer accepting responses." });
        }

        if (form.status === 'draft') {
            return res.status(403).json({ success: false, message: "Cannot submit to a draft form." });
        }

        if (form.status === 'closed') {
            return res.status(400).json({ success: false, message: "This form is closed and no longer accepting responses." });
        }

        // Authoritative access check
        const accessCheck = await canStudentAccessForm(req.user, form);
        if (!accessCheck.allowed) {
            return res.status(403).json({ success: false, message: accessCheck.reason });
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

        // Check if student already submitted
        const existingSubmitted = await FormResponse.findOne({
            formId: form._id,
            studentId: req.user._id,
            status: 'submitted'
        });

        if (existingSubmitted && form.limitOneResponse) {
            return res.status(409).json({
                success: false,
                message: "You have already submitted a response to this form and multiple responses are not allowed."
            });
        }

        const questions = await FormQuestion.find({ formId: form._id }).sort({ order: 1 });
        const { cleanedAnswers, objectiveMarks, hasSubjective } = validateCleanAndScoreAnswers(questions, answers, isDraft);

        const formTotalMarks = form.totalMarks || questions.reduce((sum, q) => sum + (q.marks || 0), 0);
        const score = objectiveMarks;
        const percentage = formTotalMarks > 0 ? Math.round((score / formTotalMarks) * 100) : 0;
        const gradingStatus = hasSubjective ? 'pending' : 'graded';

        // Check if student had an existing draft
        const existingDraft = await FormResponse.findOne({
            formId: form._id,
            studentId: req.user._id,
            status: 'draft'
        });

        let finalResponse;
        if (existingDraft) {
            existingDraft.answers = cleanedAnswers;
            existingDraft.objectiveMarks = objectiveMarks;
            existingDraft.score = score;
            existingDraft.totalMarks = formTotalMarks;
            existingDraft.percentage = percentage;
            existingDraft.gradingStatus = gradingStatus;
            existingDraft.status = 'submitted';
            existingDraft.submittedAt = new Date();
            await existingDraft.save();
            finalResponse = existingDraft;
        } else {
            finalResponse = await FormResponse.create({
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
        }

        // Notification to Teacher on submission
        try {
            await notificationService.createNotification({
                recipient: form.createdBy,
                actor: req.user._id,
                type: "form_response_submitted",
                title: "New Form Response Submitted",
                message: `${req.user.fullname || 'A student'} submitted a response to "${form.title}".`,
                entityType: "form",
                entityId: form._id,
                roomId: form.roomId,
                metadata: { formId: form._id, responseId: finalResponse._id, studentId: req.user._id }
            }).catch(() => {});
        } catch (notifErr) {}

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'response_submitted',
            targetType: 'response',
            targetId: finalResponse._id,
            metadata: { score: finalResponse.score, gradingStatus },
            req
        });

        res.status(201).json({
            success: true,
            message: form.confirmationMessage || "Form response submitted successfully.",
            confirmationMessage: form.confirmationMessage || "Your response has been recorded.",
            responseId: finalResponse._id,
            response: finalResponse,
            score: form.showResultsImmediately ? score : undefined,
            percentage: form.showResultsImmediately ? percentage : undefined,
            totalMarks: form.showResultsImmediately ? formTotalMarks : undefined
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 2. Save Response Draft (Student)
module.exports.saveDraft = async (req, res) => {
    try {
        const { id } = req.params;
        const { answers } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const accessCheck = await canStudentAccessForm(req.user, form);
        if (!accessCheck.allowed) {
            return res.status(403).json({ success: false, message: accessCheck.reason });
        }

        if (form.allowDraftSaving === false) {
            return res.status(400).json({ success: false, message: "Draft saving is disabled for this form." });
        }

        const questions = await FormQuestion.find({ formId: form._id }).sort({ order: 1 });
        const { cleanedAnswers } = validateCleanAndScoreAnswers(questions, answers, true);

        let draft = await FormResponse.findOne({
            formId: form._id,
            studentId: req.user._id,
            status: 'draft'
        });

        if (draft) {
            draft.answers = cleanedAnswers;
            draft.draftSavedAt = new Date();
            await draft.save();
        } else {
            draft = await FormResponse.create({
                formId: form._id,
                roomId: form.roomId,
                studentId: req.user._id,
                answers: cleanedAnswers,
                status: 'draft',
                draftSavedAt: new Date()
            });
        }

        res.status(200).json({
            success: true,
            message: "Draft autosaved successfully.",
            response: draft,
            draftSavedAt: draft.draftSavedAt
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 3. Get Student's Active Draft
module.exports.getMyDraft = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const draft = await FormResponse.findOne({
            formId: id,
            studentId: req.user._id,
            status: 'draft'
        });

        res.status(200).json({
            success: true,
            draft: draft || null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Get Student's Own Response (Masking internal teacher notes)
module.exports.getMyResponse = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const response = await FormResponse.findOne({
            formId: id,
            studentId: req.user._id,
            status: 'submitted'
        }).populate('answers.questionId');

        if (!response) {
            return res.status(200).json({ success: true, response: null });
        }

        // Response privacy: mask teacher internal note
        const respObj = response.toObject();
        delete respObj.internalNote;
        delete respObj.reviewedBy;
        delete respObj.reviewedAt;
        delete respObj.hidden;

        res.status(200).json({ success: true, response: respObj });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Edit Response (Student)
module.exports.editResponse = async (req, res) => {
    try {
        const { id, responseId } = req.params;
        const { answers } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id) || !responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
            return res.status(400).json({ success: false, message: "Valid Form ID and Response ID are required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        if (form.archived) {
            return res.status(400).json({ success: false, message: "Cannot edit responses on an archived form." });
        }

        if (!form.allowResponseEditing) {
            return res.status(403).json({ success: false, message: "Response editing is not allowed for this form." });
        }

        const existingResponse = await FormResponse.findById(responseId);
        if (!existingResponse || existingResponse.formId.toString() !== id) {
            return res.status(404).json({ success: false, message: "Response not found." });
        }

        if (existingResponse.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "You cannot edit another student's response." });
        }

        const questions = await FormQuestion.find({ formId: form._id }).sort({ order: 1 });
        const { cleanedAnswers, objectiveMarks, hasSubjective } = validateCleanAndScoreAnswers(questions, answers, false);

        const formTotalMarks = form.totalMarks || questions.reduce((sum, q) => sum + (q.marks || 0), 0);
        existingResponse.answers = cleanedAnswers;
        existingResponse.objectiveMarks = objectiveMarks;
        existingResponse.score = objectiveMarks + (existingResponse.subjectiveMarks || 0);
        existingResponse.totalMarks = formTotalMarks;
        existingResponse.percentage = formTotalMarks > 0 ? Math.round((existingResponse.score / formTotalMarks) * 100) : 0;
        existingResponse.gradingStatus = hasSubjective ? 'pending' : 'graded';
        existingResponse.updatedAt = new Date();
        await existingResponse.save();

        res.status(200).json({
            success: true,
            message: "Response updated successfully.",
            response: existingResponse
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 6. Get Student Result (Student view)
module.exports.getStudentResult = async (req, res) => {
    try {
        const { id, responseId } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id) || !responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
            return res.status(400).json({ success: false, message: "Valid Form ID and Response ID are required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const response = await FormResponse.findById(responseId).populate('answers.questionId');
        if (!response || response.formId.toString() !== id) {
            return res.status(404).json({ success: false, message: "Response not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        const isOwnerOrCollaborator = permissions.canViewResponses;

        if (!isOwnerOrCollaborator && response.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "You cannot access another student's result." });
        }

        const shouldShowResults = isOwnerOrCollaborator || form.showResultsImmediately || response.gradingStatus === 'graded';

        // Response privacy: mask teacher internal note for students
        const cleanAnswers = response.answers.map(ans => {
            const aObj = ans.toObject ? ans.toObject() : ans;
            return {
                questionId: aObj.questionId?._id || aObj.questionId,
                questionText: aObj.questionId?.questionText || '',
                type: aObj.questionId?.type || '',
                marks: aObj.questionId?.marks || 1,
                textAnswer: aObj.textAnswer,
                selectedOption: aObj.selectedOption,
                selectedOptions: aObj.selectedOptions,
                scaleValue: aObj.scaleValue,
                dateAnswer: aObj.dateAnswer,
                timeAnswer: aObj.timeAnswer,
                fileAnswer: aObj.fileAnswer,
                awardedMarks: shouldShowResults ? aObj.awardedMarks : undefined,
                feedback: aObj.feedback || '',
                isCorrect: shouldShowResults ? aObj.isCorrect : undefined,
                isGraded: aObj.isGraded
            };
        });

        res.status(200).json({
            success: true,
            resultsReleased: shouldShowResults,
            score: shouldShowResults ? response.score : undefined,
            totalMarks: shouldShowResults ? response.totalMarks : undefined,
            percentage: shouldShowResults ? response.percentage : undefined,
            gradingStatus: response.gradingStatus,
            answers: cleanAnswers
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Get All Form Responses (Teacher & Collaborators with Filtering, Search & Pagination)
module.exports.getFormResponses = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            reviewStatus,
            flagged,
            hidden,
            search,
            gradingStatus,
            minScore,
            maxScore,
            startDate,
            endDate,
            sort,
            page = 1,
            limit = 50
        } = req.query;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        if (!permissions.canViewResponses) {
            return res.status(403).json({ success: false, message: "You do not have permission to view responses for this form." });
        }

        const filter = { formId: id };

        if (status) filter.status = status;
        if (reviewStatus && reviewStatus !== 'All') filter.reviewStatus = reviewStatus;
        if (flagged !== undefined && flagged !== 'All') filter.flagged = flagged === 'true';
        if (gradingStatus && gradingStatus !== 'All') filter.gradingStatus = gradingStatus;

        if (hidden !== undefined && hidden !== 'All') {
            filter.hidden = hidden === 'true';
        } else if (!reviewStatus || reviewStatus === 'All') {
            // By default, exclude hidden responses unless specifically requested
            filter.hidden = { $ne: true };
        }

        if (minScore !== undefined || maxScore !== undefined) {
            filter.score = {};
            if (minScore !== undefined && !isNaN(Number(minScore))) filter.score.$gte = Number(minScore);
            if (maxScore !== undefined && !isNaN(Number(maxScore))) filter.score.$lte = Number(maxScore);
        }

        if (startDate || endDate) {
            filter.submittedAt = {};
            if (startDate) filter.submittedAt.$gte = new Date(startDate);
            if (endDate) filter.submittedAt.$lte = new Date(endDate);
        }

        let sortQuery = { submittedAt: -1, createdAt: -1 };
        if (sort === 'oldest') sortQuery = { submittedAt: 1, createdAt: 1 };
        if (sort === 'score_high') sortQuery = { score: -1 };
        if (sort === 'score_low') sortQuery = { score: 1 };

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
        const skip = (pageNum - 1) * limitNum;

        let responsesQuery = FormResponse.find(filter)
            .populate('studentId', 'fullname email role avatar')
            .populate('reviewedBy', 'fullname email')
            .sort(sortQuery);

        let responses = await responsesQuery;

        // Perform in-memory search across student names, emails, and answer text if provided
        if (search && search.trim()) {
            const queryStr = search.trim().toLowerCase();
            responses = responses.filter(r => {
                const name = r.studentId?.fullname?.toLowerCase() || '';
                const email = r.studentId?.email?.toLowerCase() || '';
                const hasTextMatch = (r.answers || []).some(a =>
                    (a.textAnswer && a.textAnswer.toLowerCase().includes(queryStr)) ||
                    (a.selectedOption && a.selectedOption.toLowerCase().includes(queryStr)) ||
                    (a.selectedOptions && a.selectedOptions.some(o => o.toLowerCase().includes(queryStr)))
                );
                return name.includes(queryStr) || email.includes(queryStr) || hasTextMatch;
            });
        }

        const totalFiltered = responses.length;
        const paginatedResponses = responses.slice(skip, skip + limitNum);

        // Overall Form metrics
        const totalSubmissions = await FormResponse.countDocuments({ formId: id, status: 'submitted' });
        const totalDrafts = await FormResponse.countDocuments({ formId: id, status: 'draft' });
        const reviewedCount = await FormResponse.countDocuments({ formId: id, reviewStatus: 'reviewed' });
        const flaggedCount = await FormResponse.countDocuments({ formId: id, flagged: true });
        const hiddenCount = await FormResponse.countDocuments({ formId: id, hidden: true });

        const room = await Room.findById(form.roomId);
        const totalStudents = room?.members?.length || 0;
        const completionRate = totalStudents > 0 ? Math.round((totalSubmissions / totalStudents) * 100) : 0;
        const responseRate = completionRate;

        res.status(200).json({
            success: true,
            responses: paginatedResponses,
            totalResponses: totalSubmissions,
            totalSubmissions,
            totalDrafts,
            reviewedCount,
            flaggedCount,
            hiddenCount,
            completionRate,
            responseRate,
            totalStudents,
            page: pageNum,
            totalPages: Math.ceil(totalFiltered / limitNum),
            count: paginatedResponses.length
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 8. Get Individual Response Detail
module.exports.getIndividualResponse = async (req, res) => {
    try {
        const { id, responseId } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id) || !responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
            return res.status(400).json({ success: false, message: "Valid Form ID and Response ID are required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        if (!permissions.canViewResponses) {
            return res.status(403).json({ success: false, message: "You do not have permission to inspect responses." });
        }

        const response = await FormResponse.findById(responseId)
            .populate('studentId', 'fullname email role avatar')
            .populate('evaluatedBy', 'fullname email')
            .populate('reviewedBy', 'fullname email')
            .populate('answers.questionId');

        if (!response || response.formId.toString() !== id) {
            return res.status(404).json({ success: false, message: "Response not found." });
        }

        res.status(200).json({
            success: true,
            response,
            answers: response.answers
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 9. Moderate Single Response (Review, Flag, Hide, Internal Notes)
module.exports.moderateResponse = async (req, res) => {
    try {
        const { id, responseId } = req.params;
        const { reviewStatus, flagged, hidden, internalNote } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id) || !responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
            return res.status(400).json({ success: false, message: "Valid Form ID and Response ID are required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        if (!permissions.canModerate) {
            return res.status(403).json({ success: false, message: "You do not have permission to moderate responses." });
        }

        const response = await FormResponse.findById(responseId);
        if (!response || response.formId.toString() !== id) {
            return res.status(404).json({ success: false, message: "Response not found." });
        }

        if (reviewStatus !== undefined) {
            if (!['pending', 'reviewed', 'flagged', 'hidden'].includes(reviewStatus)) {
                return res.status(400).json({ success: false, message: "Invalid review status." });
            }
            response.reviewStatus = reviewStatus;
            response.reviewedBy = req.user._id;
            response.reviewedAt = new Date();
        }

        if (flagged !== undefined) {
            response.flagged = !!flagged;
            if (response.flagged && response.reviewStatus === 'pending') {
                response.reviewStatus = 'flagged';
            }
        }

        if (hidden !== undefined) {
            response.hidden = !!hidden;
            if (response.hidden) {
                response.reviewStatus = 'hidden';
            }
        }

        if (internalNote !== undefined) {
            response.internalNote = typeof internalNote === 'string' ? internalNote.trim() : '';
        }

        await response.save();

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: response.flagged ? 'response_flagged' : response.hidden ? 'response_hidden' : 'response_reviewed',
            targetType: 'response',
            targetId: response._id,
            metadata: { reviewStatus: response.reviewStatus, flagged: response.flagged, hidden: response.hidden },
            req
        });

        res.status(200).json({
            success: true,
            message: "Response moderated successfully.",
            response
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 10. Bulk Moderate Responses
module.exports.bulkModerateResponses = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, responseIds } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        if (!Array.isArray(responseIds) || responseIds.length === 0) {
            return res.status(400).json({ success: false, message: "No response IDs provided for bulk action." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        if (!permissions.canModerate) {
            return res.status(403).json({ success: false, message: "You do not have permission to moderate responses." });
        }

        const validIds = responseIds.filter(rid => mongoose.Types.ObjectId.isValid(rid));
        let updateFields = {};

        switch (action) {
            case 'mark_reviewed':
                updateFields = { reviewStatus: 'reviewed', reviewedBy: req.user._id, reviewedAt: new Date() };
                break;
            case 'flag':
                updateFields = { flagged: true, reviewStatus: 'flagged', reviewedBy: req.user._id, reviewedAt: new Date() };
                break;
            case 'unflag':
                updateFields = { flagged: false, reviewStatus: 'reviewed' };
                break;
            case 'hide':
                updateFields = { hidden: true, reviewStatus: 'hidden' };
                break;
            case 'restore':
                updateFields = { hidden: false, reviewStatus: 'reviewed' };
                break;
            default:
                return res.status(400).json({ success: false, message: "Invalid bulk action." });
        }

        const result = await FormResponse.updateMany(
            { _id: { $in: validIds }, formId: id },
            { $set: updateFields }
        );

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'bulk_moderation',
            targetType: 'response',
            metadata: { action, count: result.modifiedCount },
            req
        });

        res.status(200).json({
            success: true,
            message: `Bulk moderation '${action}' applied to ${result.modifiedCount} response(s).`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 11. Teacher Grading on Subjective Questions
module.exports.gradeResponse = async (req, res) => {
    try {
        const { id, responseId } = req.params;
        const { grades } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id) || !responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
            return res.status(400).json({ success: false, message: "Valid Form ID and Response ID are required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        if (!permissions.canGrade) {
            return res.status(403).json({ success: false, message: "You do not have permission to grade responses." });
        }

        const response = await FormResponse.findById(responseId);
        if (!response || response.formId.toString() !== id) {
            return res.status(404).json({ success: false, message: "Response not found." });
        }

        if (!Array.isArray(grades)) {
            return res.status(400).json({ success: false, message: "Grades payload must be an array." });
        }

        const questions = await FormQuestion.find({ formId: id });
        const questionMap = new Map();
        questions.forEach(q => questionMap.set(q._id.toString(), q));

        const gradesMap = new Map();
        grades.forEach(g => {
            if (g && g.questionId) gradesMap.set(g.questionId.toString(), g);
        });

        let totalSubjectiveMarks = 0;
        let allGraded = true;

        response.answers = response.answers.map(ans => {
            const q = questionMap.get(ans.questionId.toString());
            const gradeItem = gradesMap.get(ans.questionId.toString());

            if (gradeItem && q) {
                const maxMarks = q.marks !== undefined ? q.marks : 1;
                const awarded = Number(gradeItem.awardedMarks);

                if (isNaN(awarded) || awarded < 0 || awarded > maxMarks) {
                    throw new Error(`Marks for question "${q.questionText}" must be between 0 and ${maxMarks}.`);
                }

                ans.awardedMarks = awarded;
                ans.isCorrect = awarded === maxMarks;
                ans.feedback = gradeItem.feedback ? gradeItem.feedback.trim() : '';
                ans.isGraded = true;
            }

            if (!ans.isGraded) {
                allGraded = false;
            }

            if (q && (['paragraph', 'file_upload'].includes(q.type) || (q.type === 'short_answer' && !q.correctAnswer))) {
                totalSubjectiveMarks += ans.awardedMarks || 0;
            }

            return ans;
        });

        const formTotalMarks = form.totalMarks || questions.reduce((sum, q) => sum + (q.marks || 0), 0);
        response.subjectiveMarks = totalSubjectiveMarks;
        response.score = (response.objectiveMarks || 0) + totalSubjectiveMarks;
        response.totalMarks = formTotalMarks;
        response.percentage = formTotalMarks > 0 ? Math.round((response.score / formTotalMarks) * 100) : 0;
        response.gradingStatus = allGraded ? 'graded' : 'partially_graded';
        response.gradedAt = new Date();
        response.evaluatedBy = req.user._id;

        await response.save();

        // Notify student if graded
        try {
            await notificationService.createNotification({
                recipient: response.studentId,
                actor: req.user._id,
                type: "form_graded",
                title: "Form Assessment Graded",
                message: `Your submission for "${form.title}" has been graded: ${response.score} / ${response.totalMarks} pts.`,
                entityType: "form",
                entityId: form._id,
                roomId: form.roomId,
                metadata: { formId: form._id, responseId: response._id, score: response.score }
            }).catch(() => {});
        } catch (e) {}

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'response_graded',
            targetType: 'response',
            targetId: response._id,
            metadata: { score: response.score, gradingStatus: response.gradingStatus },
            req
        });

        res.status(200).json({
            success: true,
            message: "Response graded successfully.",
            score: response.score,
            percentage: response.percentage,
            gradingStatus: response.gradingStatus,
            response
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 12. Get Participation Status Roster
module.exports.getResponseStatus = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        if (!permissions.canViewResponses) {
            return res.status(403).json({ success: false, message: "You do not have permission to view participation roster." });
        }

        const room = await Room.findById(form.roomId).populate('members', 'fullname email role avatar');
        if (!room) {
            return res.status(404).json({ success: false, message: "Classroom not found." });
        }

        const responses = await FormResponse.find({ formId: id, status: 'submitted' });
        const responseMap = new Map();
        responses.forEach(r => responseMap.set(r.studentId.toString(), r));

        const studentMembers = (room.members || []).filter(m => m.role === 'student');

        const participation = studentMembers.map(student => {
            const resp = responseMap.get(student._id.toString());
            return {
                studentId: student._id,
                studentName: student.fullname,
                email: student.email,
                avatar: student.avatar,
                responded: !!resp,
                submittedAt: resp?.submittedAt || null,
                score: resp?.score !== undefined ? resp.score : null,
                gradingStatus: resp?.gradingStatus || 'not_submitted',
                reviewStatus: resp?.reviewStatus || 'pending',
                flagged: !!resp?.flagged
            };
        });

        const respondedCount = participation.filter(p => p.responded).length;
        const totalStudents = studentMembers.length;
        const responseRate = totalStudents > 0 ? Math.round((respondedCount / totalStudents) * 100) : 0;

        res.status(200).json({
            success: true,
            totalStudents,
            respondedCount,
            responseRate,
            participation
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 13. Form Overview Analytics
module.exports.getFormAnalytics = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        if (!permissions.canViewResponses) {
            return res.status(403).json({ success: false, message: "You do not have permission to view analytics." });
        }

        const room = await Room.findById(form.roomId).populate('members', 'role');
        const totalStudents = (room?.members || []).filter(m => m.role === 'student').length;

        const submissions = await FormResponse.find({ formId: id, status: 'submitted' });
        const draftsCount = await FormResponse.countDocuments({ formId: id, status: 'draft' });

        const totalSubmissions = submissions.length;
        const uniqueRespondents = new Set(submissions.map(s => s.studentId.toString())).size;
        const enrolledStudents = totalStudents;
        const responseRate = totalStudents > 0 ? Math.round((uniqueRespondents / totalStudents) * 100) : 0;
        const completionRate = responseRate;

        const scores = submissions.map(s => s.score || 0);
        const averageScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
        const medianScore = scores.length > 0 ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)] : 0;
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

        res.status(200).json({
            success: true,
            totalResponses: totalSubmissions,
            totalSubmissions,
            uniqueRespondents,
            enrolledStudents,
            totalDrafts: draftsCount,
            totalStudents,
            completionRate,
            responseRate,
            averageScore,
            medianScore,
            highestScore,
            lowestScore,
            totalMarks: form.totalMarks || 0
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 14. Question-Level Analytics
module.exports.getQuestionAnalytics = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        if (!permissions.canViewResponses) {
            return res.status(403).json({ success: false, message: "You do not have permission to view analytics." });
        }

        const questions = await FormQuestion.find({ formId: id }).sort({ order: 1 });
        const submissions = await FormResponse.find({ formId: id, status: 'submitted' }).populate('studentId', 'fullname');

        const analytics = questions.map(q => {
            const qIdStr = q._id.toString();
            const answersForQ = [];
            submissions.forEach(sub => {
                const ans = (sub.answers || []).find(a => a.questionId.toString() === qIdStr);
                if (ans) answersForQ.push({ ans, studentName: sub.studentId?.fullname || 'Student' });
            });

            const answeredCount = answersForQ.filter(({ ans }) => {
                if (ans.textAnswer) return true;
                if (ans.selectedOption) return true;
                if (ans.selectedOptions && ans.selectedOptions.length > 0) return true;
                if (ans.scaleValue !== null && ans.scaleValue !== undefined) return true;
                if (ans.dateAnswer) return true;
                if (ans.timeAnswer) return true;
                if (ans.fileAnswer && ans.fileAnswer.fileUrl) return true;
                return false;
            }).length;
            const skippedCount = submissions.length - answeredCount;

            if (['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type)) {
                const optCounts = {};
                (q.options || []).forEach(opt => {
                    const text = typeof opt === 'string' ? opt : opt.text;
                    optCounts[text] = 0;
                });

                answersForQ.forEach(({ ans }) => {
                    if (ans.selectedOption && optCounts[ans.selectedOption] !== undefined) {
                        optCounts[ans.selectedOption]++;
                    }
                    if (Array.isArray(ans.selectedOptions)) {
                        ans.selectedOptions.forEach(opt => {
                            if (optCounts[opt] !== undefined) optCounts[opt]++;
                        });
                    }
                });

                const optionsBreakdown = Object.entries(optCounts).map(([text, count]) => ({
                    text,
                    count,
                    percentage: answersForQ.length > 0 ? Math.round((count / answersForQ.length) * 100) : 0,
                    isCorrect: q.type === 'checkboxes' ? (q.correctAnswers || []).includes(text) : q.correctAnswer === text
                }));

                return {
                    questionId: q._id,
                    questionText: q.questionText,
                    questionType: q.type,
                    marks: q.marks,
                    answeredCount,
                    skippedCount,
                    totalResponses: answeredCount,
                    optionsBreakdown
                };
            }

            if (q.type === 'linear_scale') {
                const min = q.scaleConfig?.min !== undefined ? q.scaleConfig.min : 1;
                const max = q.scaleConfig?.max !== undefined ? q.scaleConfig.max : 5;
                const scaleCounts = {};
                for (let v = min; v <= max; v++) scaleCounts[v] = 0;

                let sum = 0;
                let count = 0;
                answersForQ.forEach(({ ans }) => {
                    if (ans.scaleValue !== null && ans.scaleValue !== undefined) {
                        if (scaleCounts[ans.scaleValue] !== undefined) scaleCounts[ans.scaleValue]++;
                        sum += ans.scaleValue;
                        count++;
                    }
                });

                const scaleAverage = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
                const scaleDistribution = Object.entries(scaleCounts).map(([rating, c]) => ({
                    rating: Number(rating),
                    count: c,
                    percentage: count > 0 ? Math.round((c / count) * 100) : 0
                }));

                return {
                    questionId: q._id,
                    questionText: q.questionText,
                    questionType: q.type,
                    marks: q.marks,
                    scaleMin: min,
                    scaleMax: max,
                    scaleAverage,
                    scaleDistribution,
                    answeredCount,
                    skippedCount,
                    totalResponses: count
                };
            }

            if (q.type === 'date') {
                const dateValues = answersForQ.map(({ ans }) => ans.dateAnswer).filter(Boolean);
                return {
                    questionId: q._id,
                    questionText: q.questionText,
                    questionType: q.type,
                    marks: q.marks,
                    dateValues,
                    answeredCount,
                    skippedCount,
                    totalResponses: dateValues.length
                };
            }

            if (q.type === 'time') {
                const timeValues = answersForQ.map(({ ans }) => ans.timeAnswer).filter(Boolean);
                return {
                    questionId: q._id,
                    questionText: q.questionText,
                    questionType: q.type,
                    marks: q.marks,
                    timeValues,
                    answeredCount,
                    skippedCount,
                    totalResponses: timeValues.length
                };
            }

            if (q.type === 'file_upload') {
                const files = answersForQ.map(({ ans }) => ans.fileAnswer).filter(f => f && f.fileUrl);
                return {
                    questionId: q._id,
                    questionText: q.questionText,
                    questionType: q.type,
                    marks: q.marks,
                    uploadedFilesCount: files.length,
                    answeredCount,
                    skippedCount,
                    files
                };
            }

            // Short Answer / Paragraph
            const textResponses = answersForQ.map(({ ans, studentName }) => ({
                studentName,
                textAnswer: ans.textAnswer || '',
                awardedMarks: ans.awardedMarks,
                maxMarks: ans.maxMarks
            }));

            return {
                questionId: q._id,
                questionText: q.questionText,
                questionType: q.type,
                marks: q.marks,
                textResponses,
                answeredCount,
                skippedCount,
                totalResponses: textResponses.length
            };
        });

        res.status(200).json({ success: true, questions: analytics });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 15. Export CSV
module.exports.exportCSV = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        if (!permissions.canViewResponses) {
            return res.status(403).json({ success: false, message: "You do not have permission to export responses." });
        }

        const questions = await FormQuestion.find({ formId: id }).sort({ order: 1 });
        const submissions = await FormResponse.find({ formId: id, status: 'submitted' }).populate('studentId', 'fullname email');

        const headers = ['Student Name', 'Email', 'Submission Date', 'Score', 'Total Marks', 'Grading Status', 'Review Status', 'Flagged'];
        questions.forEach((q, idx) => {
            headers.push(`Q${idx + 1}: ${q.questionText.replace(/"/g, '""')} [${q.type}]`);
        });

        const rows = [headers.join(',')];

        submissions.forEach(sub => {
            const studentName = (sub.studentId?.fullname || 'Student').replace(/"/g, '""');
            const email = (sub.studentId?.email || '').replace(/"/g, '""');
            const date = sub.submittedAt ? new Date(sub.submittedAt).toISOString() : '';
            const score = sub.score !== undefined ? sub.score : 0;
            const totalMarks = sub.totalMarks || form.totalMarks || 0;
            const gradingStatus = sub.gradingStatus || 'pending';
            const reviewStatus = sub.reviewStatus || 'pending';
            const flagged = sub.flagged ? 'Yes' : 'No';

            const row = [`"${studentName}"`, `"${email}"`, `"${date}"`, score, totalMarks, `"${gradingStatus}"`, `"${reviewStatus}"`, `"${flagged}"`];

            questions.forEach(q => {
                const ans = (sub.answers || []).find(a => a.questionId.toString() === q._id.toString());
                let answerStr = '';
                if (ans) {
                    if (ans.textAnswer) answerStr = ans.textAnswer;
                    else if (ans.selectedOption) answerStr = ans.selectedOption;
                    else if (ans.selectedOptions?.length > 0) answerStr = ans.selectedOptions.join('; ');
                    else if (ans.scaleValue !== null && ans.scaleValue !== undefined) answerStr = String(ans.scaleValue);
                    else if (ans.dateAnswer) answerStr = ans.dateAnswer;
                    else if (ans.timeAnswer) answerStr = ans.timeAnswer;
                    else if (ans.fileAnswer?.fileName) answerStr = `[File: ${ans.fileAnswer.fileName} (${ans.fileAnswer.fileUrl})]`;
                }
                row.push(`"${answerStr.replace(/"/g, '""')}"`);
            });

            rows.push(row.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="form_${id}_responses.csv"`);
        res.status(200).send(rows.join('\n'));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 16. Export Excel Workbook
module.exports.exportXLSX = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        if (!permissions.canViewResponses) {
            return res.status(403).json({ success: false, message: "You do not have permission to export responses." });
        }

        const questions = await FormQuestion.find({ formId: id }).sort({ order: 1 });
        const submissions = await FormResponse.find({ formId: id, status: 'submitted' }).populate('studentId', 'fullname email');

        const responsesData = submissions.map(sub => {
            const row = {
                'Student Name': sub.studentId?.fullname || 'Student',
                'Email': sub.studentId?.email || '',
                'Submission Date': sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '',
                'Score': sub.score !== undefined ? sub.score : 0,
                'Total Marks': sub.totalMarks || form.totalMarks || 0,
                'Percentage': `${sub.percentage || 0}%`,
                'Grading Status': sub.gradingStatus || 'pending',
                'Review Status': sub.reviewStatus || 'pending',
                'Flagged': sub.flagged ? 'Yes' : 'No'
            };

            questions.forEach((q, idx) => {
                const ans = (sub.answers || []).find(a => a.questionId.toString() === q._id.toString());
                let answerStr = '';
                if (ans) {
                    if (ans.textAnswer) answerStr = ans.textAnswer;
                    else if (ans.selectedOption) answerStr = ans.selectedOption;
                    else if (ans.selectedOptions?.length > 0) answerStr = ans.selectedOptions.join('; ');
                    else if (ans.scaleValue !== null && ans.scaleValue !== undefined) answerStr = String(ans.scaleValue);
                    else if (ans.dateAnswer) answerStr = ans.dateAnswer;
                    else if (ans.timeAnswer) answerStr = ans.timeAnswer;
                    else if (ans.fileAnswer?.fileName) answerStr = `${ans.fileAnswer.fileName} (${ans.fileAnswer.fileUrl})`;
                }
                row[`Q${idx + 1}: ${q.questionText} [${q.type}]`] = answerStr;
            });

            return row;
        });

        const questionsData = questions.map((q, idx) => {
            const qIdStr = q._id.toString();
            const answeredCount = submissions.filter(sub => (sub.answers || []).some(a => a.questionId.toString() === qIdStr)).length;
            return {
                'Question #': idx + 1,
                'Question Text': q.questionText,
                'Type': q.type,
                'Marks': q.marks || 0,
                'Answered Count': answeredCount,
                'Skipped Count': submissions.length - answeredCount
            };
        });

        const room = await Room.findById(form.roomId).populate('members', 'fullname email role');
        const students = (room?.members || []).filter(m => m.role === 'student');
        const participationData = students.map(st => {
            const sub = submissions.find(s => s.studentId?._id?.toString() === st._id.toString() || s.studentId?.toString() === st._id.toString());
            return {
                'Student Name': st.fullname || 'Student',
                'Email': st.email || '',
                'Responded': sub ? 'Yes' : 'No',
                'Score': sub?.score !== undefined ? sub.score : 'N/A',
                'Submitted At': sub?.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'N/A'
            };
        });

        const workbook = XLSX.utils.book_new();
        const sheet1 = XLSX.utils.json_to_sheet(responsesData.length > 0 ? responsesData : [{ 'Status': 'No Responses' }]);
        XLSX.utils.book_append_sheet(workbook, sheet1, "Responses");

        const sheet2 = XLSX.utils.json_to_sheet(questionsData);
        XLSX.utils.book_append_sheet(workbook, sheet2, "Question Analytics");

        const sheet3 = XLSX.utils.json_to_sheet(participationData.length > 0 ? participationData : [{ 'Status': 'No Students' }]);
        XLSX.utils.book_append_sheet(workbook, sheet3, "Participation");

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="form_${id}_report.xlsx"`);
        res.status(200).send(buffer);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
