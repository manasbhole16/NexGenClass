const Form = require('../models/form-model');
const FormQuestion = require('../models/formQuestion-model');
const FormResponse = require('../models/formResponse-model');
const FormCollaborator = require('../models/formCollaborator-model');
const FormAccess = require('../models/formAccess-model');
const FormAuditLog = require('../models/formAuditLog-model');
const Room = require('../models/room-model');
const User = require('../models/user-model');
const notificationService = require('../services/notificationService');
const { getFormPermissions, canStudentAccessForm } = require('../services/formPermissionService');
const { logFormEvent } = require('../services/formAuditService');
const mongoose = require('mongoose');
const crypto = require('crypto');

const SUPPORTED_QUESTION_TYPES = [
    'short_answer', 'paragraph', 'multiple_choice', 'checkboxes', 'dropdown',
    'linear_scale', 'date', 'time', 'file_upload'
];

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

    if (q.type === 'linear_scale') {
        const min = q.scaleConfig?.min !== undefined ? Number(q.scaleConfig.min) : 1;
        const max = q.scaleConfig?.max !== undefined ? Number(q.scaleConfig.max) : 5;
        if (isNaN(min) || isNaN(max) || min >= max || min < 0 || max > 10) {
            throw new Error(`Question #${qNum}: Linear scale requires min (>=0) less than max (<=10).`);
        }
    }

    if (q.validation && q.validation.enabled && q.validation.ruleType && q.validation.ruleType !== 'none') {
        const rule = q.validation.ruleType;
        const val = q.validation.value;
        if (['min_length', 'max_length', 'min_value', 'max_value', 'exact_value', 'min_select', 'max_select', 'exact_select'].includes(rule)) {
            if (val === undefined || val === null || isNaN(Number(val))) {
                throw new Error(`Question #${qNum}: Validation rule '${rule}' requires a valid numeric threshold.`);
            }
        }
        if (rule === 'regex') {
            try {
                new RegExp(val);
            } catch (e) {
                throw new Error(`Question #${qNum}: Invalid regular expression pattern '${val}'.`);
            }
        }
    }
}

// 1. Create a new Form
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
            sections,
            confirmationMessage,
            submitButtonText,
            showProgressBar,
            shuffleQuestions,
            shuffleOptions,
            allowDraftSaving,
            requireClassroomMembership,
            sharingEnabled,
            sharingMode,
            allowExternalAccess,
            requireAuthentication
        } = req.body;

        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ success: false, message: "Form title is required and cannot be empty." });
        }

        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ success: false, message: "Valid Room ID is required." });
        }

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found." });
        }

        if (req.user.role !== 'teacher' || room.owner?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only classroom teachers can create forms in this room." });
        }

        if (startAt && endAt && new Date(startAt) > new Date(endAt)) {
            return res.status(400).json({ success: false, message: "startAt must be before endAt." });
        }

        const form = await Form.create({
            title: title.trim(),
            description: description ? description.trim() : "",
            roomId,
            createdBy: req.user._id,
            topic: topic ? topic.trim() : "General",
            status: status && ['draft', 'published', 'closed'].includes(status) ? status : 'draft',
            startAt: startAt ? new Date(startAt) : null,
            endAt: endAt ? new Date(endAt) : null,
            allowResponseEditing: allowResponseEditing !== undefined ? allowResponseEditing : false,
            limitOneResponse: limitOneResponse !== undefined ? limitOneResponse : true,
            collectEmail: collectEmail !== undefined ? collectEmail : true,
            showResultsImmediately: showResultsImmediately !== undefined ? showResultsImmediately : true,
            sections: Array.isArray(sections) && sections.length > 0 ? sections : [{ title: 'Section 1', description: '', order: 0 }],
            confirmationMessage: confirmationMessage ? confirmationMessage.trim() : "Your response has been recorded.",
            submitButtonText: submitButtonText ? submitButtonText.trim() : "Submit",
            showProgressBar: showProgressBar !== undefined ? showProgressBar : true,
            shuffleQuestions: shuffleQuestions !== undefined ? shuffleQuestions : false,
            shuffleOptions: shuffleOptions !== undefined ? shuffleOptions : false,
            allowDraftSaving: allowDraftSaving !== undefined ? allowDraftSaving : true,
            requireClassroomMembership: requireClassroomMembership !== undefined ? requireClassroomMembership : true,
            sharingEnabled: sharingEnabled !== undefined ? sharingEnabled : true,
            sharingMode: sharingMode || 'classroom',
            allowExternalAccess: allowExternalAccess !== undefined ? allowExternalAccess : false,
            requireAuthentication: requireAuthentication !== undefined ? requireAuthentication : true
        });

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'form_created',
            targetType: 'form',
            targetId: form._id,
            metadata: { title: form.title, roomId: form.roomId },
            req
        });

        res.status(201).json({ success: true, form });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get all forms in a Room
module.exports.getFormsByRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { topic, status, search, archived, isTemplate, sort } = req.query;

        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ success: false, message: "Valid Room ID is required." });
        }

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found." });
        }

        const userIdStr = req.user._id.toString();
        const isOwner = room.owner?.toString() === userIdStr;
        const isMember = room.members?.some(m => m.toString() === userIdStr);

        // Check if user has collaborator access to any forms in this room
        const userCollaborations = await FormCollaborator.find({ userId: req.user._id });
        const collaboratedFormIds = userCollaborations.map(c => c.formId);

        if (!isOwner && !isMember && collaboratedFormIds.length === 0) {
            return res.status(403).json({ success: false, message: "You are not a member of this classroom." });
        }

        const isTeacher = req.user.role === 'teacher' && isOwner;

        const filter = { roomId };

        if (!isTeacher) {
            // Student view
            filter.status = 'published';
            filter.archived = false;
            filter.isTemplate = false;
            filter.sharingEnabled = { $ne: false };
        } else {
            // Teacher filters
            if (status) filter.status = status;
            if (archived !== undefined) filter.archived = archived === 'true';
            if (isTemplate !== undefined) filter.isTemplate = isTemplate === 'true';
        }

        if (topic && topic !== 'All') {
            filter.topic = topic;
        }

        if (search && search.trim()) {
            filter.$or = [
                { title: { $regex: search.trim(), $options: 'i' } },
                { description: { $regex: search.trim(), $options: 'i' } },
                { topic: { $regex: search.trim(), $options: 'i' } }
            ];
        }

        let sortQuery = { createdAt: -1 };
        if (sort === 'oldest') sortQuery = { createdAt: 1 };
        if (sort === 'title') sortQuery = { title: 1 };
        if (sort === 'updated') sortQuery = { updatedAt: -1 };

        let forms = await Form.find(filter).sort(sortQuery).populate('createdBy', 'fullname email role avatar');

        // If student and some forms are in selected_users mode, filter accordingly
        if (!isTeacher) {
            const accessibleForms = [];
            for (const f of forms) {
                if (f.sharingMode === 'selected_users') {
                    const access = await FormAccess.findOne({ formId: f._id, userId: req.user._id });
                    if (access) accessibleForms.push(f);
                } else if (f.sharingMode !== 'restricted') {
                    accessibleForms.push(f);
                }
            }
            forms = accessibleForms;
        }

        res.status(200).json({ success: true, forms, count: forms.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get Form by ID (with questions, permissions, and shuffling)
module.exports.getFormById = async (req, res) => {
    try {
        const { id } = req.params;
        const { token } = req.query;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id).populate('createdBy', 'fullname email role avatar');
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        const isPrivileged = permissions.isOwner || permissions.canViewAuditLogs;

        if (!isPrivileged) {
            const studentAccess = await canStudentAccessForm(req.user, form, token);
            if (!studentAccess.allowed) {
                return res.status(403).json({ success: false, message: studentAccess.reason });
            }
        }

        let questions = await FormQuestion.find({ formId: id }).sort({ order: 1 });

        // If accessed by a student, strip correctAnswer keys unless intentionally allowed
        if (!isPrivileged) {
            questions = questions.map(q => {
                const qObj = q.toObject();
                delete qObj.correctAnswer;
                delete qObj.correctAnswers;
                return qObj;
            });

            // Shuffling
            if (form.shuffleQuestions) {
                questions = [...questions].sort(() => Math.random() - 0.5);
            }
            if (form.shuffleOptions) {
                questions = questions.map(q => {
                    if (['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type) && Array.isArray(q.options)) {
                        q.options = [...q.options].sort(() => Math.random() - 0.5);
                    }
                    return q;
                });
            }
        }

        res.status(200).json({
            success: true,
            form,
            questions,
            permissions,
            isTeacher: isPrivileged,
            canEdit: permissions.canEdit
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Update Form details & settings
module.exports.updateForm = async (req, res) => {
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
        if (!permissions.canEdit) {
            return res.status(403).json({ success: false, message: "You do not have permission to modify this form." });
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
            sections,
            confirmationMessage,
            submitButtonText,
            showProgressBar,
            shuffleQuestions,
            shuffleOptions,
            allowDraftSaving,
            requireClassroomMembership,
            sharingEnabled,
            sharingMode,
            allowExternalAccess,
            requireAuthentication
        } = req.body;

        if (title !== undefined) {
            if (!title || typeof title !== 'string' || !title.trim()) {
                return res.status(400).json({ success: false, message: "Form title cannot be empty." });
            }
            form.title = title.trim();
        }

        if (description !== undefined) form.description = description ? description.trim() : "";
        if (topic !== undefined) form.topic = topic ? topic.trim() : form.topic;
        if (status !== undefined && ['draft', 'published', 'closed'].includes(status)) form.status = status;
        if (startAt !== undefined) form.startAt = startAt ? new Date(startAt) : null;
        if (endAt !== undefined) form.endAt = endAt ? new Date(endAt) : null;

        if (form.startAt && form.endAt && form.startAt > form.endAt) {
            return res.status(400).json({ success: false, message: "startAt must be before endAt." });
        }

        if (allowResponseEditing !== undefined) form.allowResponseEditing = allowResponseEditing;
        if (limitOneResponse !== undefined) form.limitOneResponse = limitOneResponse;
        if (collectEmail !== undefined) form.collectEmail = collectEmail;
        if (showResultsImmediately !== undefined) form.showResultsImmediately = showResultsImmediately;
        if (sections !== undefined && Array.isArray(sections)) form.sections = sections;
        if (confirmationMessage !== undefined) form.confirmationMessage = confirmationMessage.trim();
        if (submitButtonText !== undefined) form.submitButtonText = submitButtonText.trim();
        if (showProgressBar !== undefined) form.showProgressBar = showProgressBar;
        if (shuffleQuestions !== undefined) form.shuffleQuestions = shuffleQuestions;
        if (shuffleOptions !== undefined) form.shuffleOptions = shuffleOptions;
        if (allowDraftSaving !== undefined) form.allowDraftSaving = allowDraftSaving;
        if (requireClassroomMembership !== undefined) form.requireClassroomMembership = requireClassroomMembership;

        // Sharing settings (only owner can modify)
        if (permissions.isOwner) {
            if (sharingEnabled !== undefined) form.sharingEnabled = sharingEnabled;
            if (sharingMode !== undefined && ['classroom', 'selected_users', 'link', 'restricted'].includes(sharingMode)) {
                form.sharingMode = sharingMode;
            }
            if (allowExternalAccess !== undefined) form.allowExternalAccess = allowExternalAccess;
            if (requireAuthentication !== undefined) form.requireAuthentication = requireAuthentication;
        }

        await form.save();

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'form_updated',
            targetType: 'form',
            targetId: form._id,
            metadata: { updatedFields: Object.keys(req.body) },
            req
        });

        res.status(200).json({ success: true, form });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Delete Form (Owner only)
module.exports.deleteForm = async (req, res) => {
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
        if (!permissions.isOwner) {
            return res.status(403).json({ success: false, message: "Only the form owner can delete this form." });
        }

        // Cascade delete associated items
        await FormQuestion.deleteMany({ formId: id });
        await FormResponse.deleteMany({ formId: id });
        await FormCollaborator.deleteMany({ formId: id });
        await FormAccess.deleteMany({ formId: id });
        await FormAuditLog.deleteMany({ formId: id });
        await Form.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: "Form and all associated data deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Save Questions atomically
module.exports.saveQuestions = async (req, res) => {
    try {
        const { id } = req.params;
        const { questions } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        if (!permissions.canEdit) {
            return res.status(403).json({ success: false, message: "You do not have permission to modify questions on this form." });
        }

        if (!Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: "Questions array is required." });
        }

        for (let i = 0; i < questions.length; i++) {
            validateQuestion(questions[i], i);
        }

        await FormQuestion.deleteMany({ formId: id });

        let totalMarks = 0;
        const formattedQuestions = questions.map((q, idx) => {
            const marks = q.marks !== undefined ? Math.max(0, parseInt(q.marks, 10) || 0) : 1;
            totalMarks += marks;

            return {
                formId: id,
                sectionId: q.sectionId || 'default',
                imageUrl: q.imageUrl ? q.imageUrl.trim() : '',
                questionText: q.questionText.trim(),
                description: q.description ? q.description.trim() : '',
                type: q.type,
                options: ['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type)
                    ? q.options.map(opt => ({ text: typeof opt === 'string' ? opt.trim() : opt.text.trim() }))
                    : [],
                scaleConfig: q.type === 'linear_scale'
                    ? {
                        min: q.scaleConfig?.min !== undefined ? Number(q.scaleConfig.min) : 1,
                        max: q.scaleConfig?.max !== undefined ? Number(q.scaleConfig.max) : 5,
                        minLabel: q.scaleConfig?.minLabel ? q.scaleConfig.minLabel.trim() : '',
                        maxLabel: q.scaleConfig?.maxLabel ? q.scaleConfig.maxLabel.trim() : ''
                    }
                    : undefined,
                fileUploadConfig: q.type === 'file_upload'
                    ? {
                        maxFileSizeMB: q.fileUploadConfig?.maxFileSizeMB ? Number(q.fileUploadConfig.maxFileSizeMB) : 10,
                        allowedTypes: Array.isArray(q.fileUploadConfig?.allowedTypes) && q.fileUploadConfig.allowedTypes.length > 0 ? q.fileUploadConfig.allowedTypes : ['all']
                    }
                    : undefined,
                validation: q.validation && q.validation.enabled
                    ? {
                        enabled: true,
                        ruleType: q.validation.ruleType,
                        value: q.validation.value,
                        customError: q.validation.customError ? q.validation.customError.trim() : ''
                    }
                    : { enabled: false, ruleType: 'none', value: null, customError: '' },
                correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : '',
                correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers : [],
                marks,
                required: !!q.required,
                order: q.order !== undefined ? q.order : idx
            };
        });

        const createdQuestions = await FormQuestion.insertMany(formattedQuestions);

        form.totalMarks = totalMarks;
        await form.save();

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'questions_updated',
            targetType: 'form',
            targetId: form._id,
            metadata: { count: createdQuestions.length, totalMarks },
            req
        });

        res.status(200).json({
            success: true,
            message: "Questions saved successfully.",
            questions: createdQuestions,
            count: createdQuestions.length,
            totalMarks
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 7. Publish Form Toggle
module.exports.publishForm = async (req, res) => {
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
        if (!permissions.canEdit) {
            return res.status(403).json({ success: false, message: "You do not have permission to publish this form." });
        }

        form.status = form.status === 'published' ? 'draft' : 'published';
        await form.save();

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: form.status === 'published' ? 'form_published' : 'form_unpublished',
            targetType: 'form',
            targetId: form._id,
            metadata: { status: form.status },
            req
        });

        res.status(200).json({
            success: true,
            message: `Form status updated to ${form.status}.`,
            form
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 8. Close Form
module.exports.closeForm = async (req, res) => {
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
        if (!permissions.canEdit) {
            return res.status(403).json({ success: false, message: "You do not have permission to close this form." });
        }

        form.status = 'closed';
        await form.save();

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'form_closed',
            targetType: 'form',
            targetId: form._id,
            metadata: { status: form.status },
            req
        });

        res.status(200).json({ success: true, message: "Form closed successfully.", form });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 9. Archive Form
module.exports.archiveForm = async (req, res) => {
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
        if (!permissions.canEdit) {
            return res.status(403).json({ success: false, message: "You do not have permission to archive this form." });
        }

        form.archived = true;
        await form.save();

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'form_archived',
            targetType: 'form',
            targetId: form._id,
            metadata: { archived: true },
            req
        });

        res.status(200).json({ success: true, message: "Form archived successfully.", form });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 10. Unarchive Form
module.exports.unarchiveForm = async (req, res) => {
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
        if (!permissions.canEdit) {
            return res.status(403).json({ success: false, message: "You do not have permission to unarchive this form." });
        }

        form.archived = false;
        await form.save();

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'form_unarchived',
            targetType: 'form',
            targetId: form._id,
            metadata: { archived: false },
            req
        });

        res.status(200).json({ success: true, message: "Form unarchived successfully.", form });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 11. Duplicate Form
module.exports.duplicateForm = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const sourceForm = await Form.findById(id);
        if (!sourceForm) {
            return res.status(404).json({ success: false, message: "Source form not found." });
        }

        const permissions = await getFormPermissions(req.user, sourceForm);
        if (!permissions.canEdit) {
            return res.status(403).json({ success: false, message: "You do not have permission to duplicate this form." });
        }

        const duplicatedForm = await Form.create({
            title: title && title.trim() ? title.trim() : `${sourceForm.title} (Copy)`,
            description: sourceForm.description,
            roomId: sourceForm.roomId,
            createdBy: req.user._id,
            topic: sourceForm.topic,
            status: 'draft',
            startAt: sourceForm.startAt,
            endAt: sourceForm.endAt,
            allowResponseEditing: sourceForm.allowResponseEditing,
            limitOneResponse: sourceForm.limitOneResponse,
            collectEmail: sourceForm.collectEmail,
            showResultsImmediately: sourceForm.showResultsImmediately,
            totalMarks: sourceForm.totalMarks,
            sections: sourceForm.sections,
            confirmationMessage: sourceForm.confirmationMessage,
            submitButtonText: sourceForm.submitButtonText,
            showProgressBar: sourceForm.showProgressBar,
            shuffleQuestions: sourceForm.shuffleQuestions,
            shuffleOptions: sourceForm.shuffleOptions,
            allowDraftSaving: sourceForm.allowDraftSaving,
            requireClassroomMembership: sourceForm.requireClassroomMembership,
            sharingEnabled: sourceForm.sharingEnabled,
            sharingMode: sourceForm.sharingMode,
            allowExternalAccess: sourceForm.allowExternalAccess,
            requireAuthentication: sourceForm.requireAuthentication
        });

        let createdQuestions = [];
        const sourceQuestions = await FormQuestion.find({ formId: id }).sort({ order: 1 });
        if (sourceQuestions.length > 0) {
            const duplicatedQuestions = sourceQuestions.map(q => ({
                formId: duplicatedForm._id,
                sectionId: q.sectionId,
                imageUrl: q.imageUrl,
                questionText: q.questionText,
                description: q.description,
                type: q.type,
                options: q.options,
                scaleConfig: q.scaleConfig,
                fileUploadConfig: q.fileUploadConfig,
                validation: q.validation,
                correctAnswer: q.correctAnswer,
                correctAnswers: q.correctAnswers,
                marks: q.marks,
                required: q.required,
                order: q.order
            }));
            createdQuestions = await FormQuestion.insertMany(duplicatedQuestions);
        }

        await logFormEvent({
            formId: duplicatedForm._id,
            actorId: req.user._id,
            action: 'form_duplicated',
            targetType: 'form',
            targetId: duplicatedForm._id,
            metadata: { sourceFormId: sourceForm._id, title: duplicatedForm.title },
            req
        });

        res.status(201).json({
            success: true,
            message: "Form duplicated successfully.",
            form: duplicatedForm,
            questions: createdQuestions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 12. Create Template from Form
module.exports.createTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const sourceForm = await Form.findById(id);
        if (!sourceForm) {
            return res.status(404).json({ success: false, message: "Source form not found." });
        }

        const permissions = await getFormPermissions(req.user, sourceForm);
        if (!permissions.canEdit) {
            return res.status(403).json({ success: false, message: "You do not have permission to create templates from this form." });
        }

        const templateForm = await Form.create({
            title: title && title.trim() ? title.trim() : `${sourceForm.title} (Template)`,
            description: sourceForm.description,
            roomId: sourceForm.roomId,
            createdBy: req.user._id,
            topic: sourceForm.topic,
            status: 'draft',
            isTemplate: true,
            totalMarks: sourceForm.totalMarks,
            sections: sourceForm.sections,
            confirmationMessage: sourceForm.confirmationMessage,
            submitButtonText: sourceForm.submitButtonText,
            showProgressBar: sourceForm.showProgressBar,
            shuffleQuestions: sourceForm.shuffleQuestions,
            shuffleOptions: sourceForm.shuffleOptions,
            allowDraftSaving: sourceForm.allowDraftSaving
        });

        let templateCreatedQuestions = [];
        const sourceQuestions = await FormQuestion.find({ formId: id }).sort({ order: 1 });
        if (sourceQuestions.length > 0) {
            const templateQuestions = sourceQuestions.map(q => ({
                formId: templateForm._id,
                sectionId: q.sectionId,
                imageUrl: q.imageUrl,
                questionText: q.questionText,
                description: q.description,
                type: q.type,
                options: q.options,
                scaleConfig: q.scaleConfig,
                fileUploadConfig: q.fileUploadConfig,
                validation: q.validation,
                correctAnswer: q.correctAnswer,
                correctAnswers: q.correctAnswers,
                marks: q.marks,
                required: q.required,
                order: q.order
            }));
            templateCreatedQuestions = await FormQuestion.insertMany(templateQuestions);
        }

        await logFormEvent({
            formId: templateForm._id,
            actorId: req.user._id,
            action: 'template_created',
            targetType: 'form',
            targetId: templateForm._id,
            metadata: { sourceFormId: sourceForm._id, title: templateForm.title },
            req
        });

        res.status(201).json({
            success: true,
            message: "Template created successfully.",
            form: templateForm,
            questions: templateCreatedQuestions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 13. Create Form from Template
module.exports.createFromTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, roomId } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Template ID is required." });
        }

        const template = await Form.findById(id);
        if (!template || !template.isTemplate) {
            return res.status(404).json({ success: false, message: "Template not found." });
        }

        const targetRoomId = roomId || template.roomId;
        const room = await Room.findById(targetRoomId);
        if (!room) {
            return res.status(404).json({ success: false, message: "Target classroom not found." });
        }

        if (req.user.role !== 'teacher' || room.owner?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only teachers can create forms from templates in this classroom." });
        }

        const newForm = await Form.create({
            title: title && title.trim() ? title.trim() : template.title.replace(' (Template)', ''),
            description: template.description,
            roomId: targetRoomId,
            createdBy: req.user._id,
            topic: template.topic,
            status: 'draft',
            isTemplate: false,
            totalMarks: template.totalMarks,
            sections: template.sections,
            confirmationMessage: template.confirmationMessage,
            submitButtonText: template.submitButtonText,
            showProgressBar: template.showProgressBar,
            shuffleQuestions: template.shuffleQuestions,
            shuffleOptions: template.shuffleOptions,
            allowDraftSaving: template.allowDraftSaving
        });

        let newCreatedQuestions = [];
        const templateQuestions = await FormQuestion.find({ formId: id }).sort({ order: 1 });
        if (templateQuestions.length > 0) {
            const newQuestions = templateQuestions.map(q => ({
                formId: newForm._id,
                sectionId: q.sectionId,
                imageUrl: q.imageUrl,
                questionText: q.questionText,
                description: q.description,
                type: q.type,
                options: q.options,
                scaleConfig: q.scaleConfig,
                fileUploadConfig: q.fileUploadConfig,
                validation: q.validation,
                correctAnswer: q.correctAnswer,
                correctAnswers: q.correctAnswers,
                marks: q.marks,
                required: q.required,
                order: q.order
            }));
            newCreatedQuestions = await FormQuestion.insertMany(newQuestions);
        }

        res.status(201).json({
            success: true,
            message: "Form created from template successfully.",
            form: newForm,
            questions: newCreatedQuestions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 14. Upload Question / Response File
module.exports.uploadQuestionFile = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded." });
        }

        const mimeType = req.file.mimetype || 'application/octet-stream';
        const base64Data = req.file.buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64Data}`;

        const fileRecord = {
            fileName: req.file.originalname,
            fileUrl: dataUri,
            fileSize: req.file.size,
            mimeType,
            uploadedAt: new Date()
        };

        res.status(200).json({
            success: true,
            message: "File uploaded successfully.",
            file: fileRecord
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// PHASE 6: COLLABORATOR MANAGEMENT
// ==========================================

// 15. Get Form Collaborators
module.exports.getCollaborators = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id).populate('createdBy', 'fullname email role avatar');
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const permissions = await getFormPermissions(req.user, form);
        if (!permissions.canViewAuditLogs) {
            return res.status(403).json({ success: false, message: "You do not have permission to view collaborators for this form." });
        }

        const collaborators = await FormCollaborator.find({ formId: id })
            .populate('userId', 'fullname email role avatar')
            .populate('addedBy', 'fullname email')
            .sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            owner: form.createdBy,
            collaborators,
            count: collaborators.length
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 16. Add Form Collaborator (Owner only)
module.exports.addCollaborator = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, email, role = 'viewer', permissions = [] } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const perms = await getFormPermissions(req.user, form);
        if (!perms.isOwner) {
            return res.status(403).json({ success: false, message: "Only the form owner can add collaborators." });
        }

        if (!['editor', 'reviewer', 'viewer'].includes(role)) {
            return res.status(400).json({ success: false, message: "Role must be 'editor', 'reviewer', or 'viewer'." });
        }

        let targetUser = null;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            targetUser = await User.findById(userId);
        } else if (email && typeof email === 'string') {
            targetUser = await User.findOne({ email: email.trim().toLowerCase() });
        }

        if (!targetUser) {
            return res.status(404).json({ success: false, message: "Collaborator user not found." });
        }

        if (targetUser._id.toString() === req.user._id.toString() || targetUser._id.toString() === form.createdBy.toString()) {
            return res.status(400).json({ success: false, message: "Form owner cannot be added as a collaborator." });
        }

        const existing = await FormCollaborator.findOne({ formId: id, userId: targetUser._id });
        if (existing) {
            return res.status(409).json({ success: false, message: "User is already a collaborator on this form." });
        }

        const collaborator = await FormCollaborator.create({
            formId: id,
            userId: targetUser._id,
            role,
            permissions,
            addedBy: req.user._id
        });

        // Notify added collaborator
        try {
            await notificationService.createNotification({
                recipient: targetUser._id,
                actor: req.user._id,
                type: "form_collaborator_added",
                title: "Added as Form Collaborator",
                message: `You were added as a ${role} on "${form.title}".`,
                entityType: "form",
                entityId: form._id,
                roomId: form.roomId,
                metadata: { formId: form._id, role }
            }).catch(() => {});
        } catch (e) {}

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'collaborator_added',
            targetType: 'collaborator',
            targetId: targetUser._id,
            metadata: { userEmail: targetUser.email, role },
            req
        });

        res.status(201).json({
            success: true,
            message: "Collaborator added successfully.",
            collaborator
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 17. Update Form Collaborator (Owner only)
module.exports.updateCollaborator = async (req, res) => {
    try {
        const { id, collaboratorId } = req.params;
        const { role, permissions } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id) || !collaboratorId || !mongoose.Types.ObjectId.isValid(collaboratorId)) {
            return res.status(400).json({ success: false, message: "Valid Form ID and Collaborator ID are required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const perms = await getFormPermissions(req.user, form);
        if (!perms.isOwner) {
            return res.status(403).json({ success: false, message: "Only the form owner can update collaborators." });
        }

        const collaborator = await FormCollaborator.findById(collaboratorId);
        if (!collaborator || collaborator.formId.toString() !== id) {
            return res.status(404).json({ success: false, message: "Collaborator record not found." });
        }

        if (role && !['editor', 'reviewer', 'viewer'].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role." });
        }

        if (role) collaborator.role = role;
        if (permissions && Array.isArray(permissions)) collaborator.permissions = permissions;

        await collaborator.save();

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'collaborator_updated',
            targetType: 'collaborator',
            targetId: collaborator.userId,
            metadata: { role: collaborator.role },
            req
        });

        res.status(200).json({
            success: true,
            message: "Collaborator updated successfully.",
            collaborator
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 18. Remove Form Collaborator (Owner only)
module.exports.removeCollaborator = async (req, res) => {
    try {
        const { id, collaboratorId } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id) || !collaboratorId || !mongoose.Types.ObjectId.isValid(collaboratorId)) {
            return res.status(400).json({ success: false, message: "Valid Form ID and Collaborator ID are required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const perms = await getFormPermissions(req.user, form);
        if (!perms.isOwner) {
            return res.status(403).json({ success: false, message: "Only the form owner can remove collaborators." });
        }

        let collaborator = await FormCollaborator.findById(collaboratorId);
        if (!collaborator) {
            // Check if collaboratorId was actually a userId
            collaborator = await FormCollaborator.findOne({ formId: id, userId: collaboratorId });
        }

        if (!collaborator || collaborator.formId.toString() !== id) {
            return res.status(404).json({ success: false, message: "Collaborator record not found." });
        }

        const removedUserId = collaborator.userId;
        await FormCollaborator.findByIdAndDelete(collaborator._id);

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'collaborator_removed',
            targetType: 'collaborator',
            targetId: removedUserId,
            metadata: {},
            req
        });

        res.status(200).json({ success: true, message: "Collaborator removed successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// PHASE 6: SELECTED STUDENT ACCESS LIST
// ==========================================

// 19. Get Form Access List
module.exports.getFormAccess = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const perms = await getFormPermissions(req.user, form);
        if (!perms.canViewAuditLogs) {
            return res.status(403).json({ success: false, message: "You do not have permission to view access list." });
        }

        const accessList = await FormAccess.find({ formId: id })
            .populate('userId', 'fullname email role avatar')
            .populate('grantedBy', 'fullname email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            sharingMode: form.sharingMode,
            sharingEnabled: form.sharingEnabled,
            accessList,
            count: accessList.length
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 20. Grant Student Access
module.exports.grantFormAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const { userIds, userEmails } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const perms = await getFormPermissions(req.user, form);
        if (!perms.canEdit) {
            return res.status(403).json({ success: false, message: "You do not have permission to manage access on this form." });
        }

        const targetUserIds = [];
        if (Array.isArray(userIds)) {
            for (const uid of userIds) {
                if (mongoose.Types.ObjectId.isValid(uid)) targetUserIds.push(uid);
            }
        }
        if (Array.isArray(userEmails)) {
            const users = await User.find({ email: { $in: userEmails.map(e => e.trim().toLowerCase()) } });
            users.forEach(u => targetUserIds.push(u._id.toString()));
        }

        if (targetUserIds.length === 0) {
            return res.status(400).json({ success: false, message: "No valid users provided to grant access." });
        }

        const inserted = [];
        for (const uid of targetUserIds) {
            const existing = await FormAccess.findOne({ formId: id, userId: uid });
            if (!existing) {
                const acc = await FormAccess.create({
                    formId: id,
                    userId: uid,
                    accessType: 'student',
                    grantedBy: req.user._id
                });
                inserted.push(acc);

                // Notify student
                try {
                    await notificationService.createNotification({
                        recipient: uid,
                        actor: req.user._id,
                        type: "form_access_granted",
                        title: "Form Access Granted",
                        message: `You were granted access to "${form.title}".`,
                        entityType: "form",
                        entityId: form._id,
                        roomId: form.roomId
                    }).catch(() => {});
                } catch (e) {}
            }
        }

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'access_granted',
            targetType: 'access',
            metadata: { count: inserted.length },
            req
        });

        res.status(200).json({
            success: true,
            message: `Granted access to ${inserted.length} student(s).`,
            grantedCount: inserted.length
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 21. Revoke Student Access
module.exports.revokeFormAccess = async (req, res) => {
    try {
        const { id, userId } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id) || !userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Valid Form ID and User ID are required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const perms = await getFormPermissions(req.user, form);
        if (!perms.canEdit) {
            return res.status(403).json({ success: false, message: "You do not have permission to revoke access on this form." });
        }

        await FormAccess.findOneAndDelete({ formId: id, userId });

        // Notify student of revocation
        try {
            await notificationService.createNotification({
                recipient: userId,
                actor: req.user._id,
                type: "form_access_revoked",
                title: "Form Access Revoked",
                message: `Your access to "${form.title}" was revoked.`,
                entityType: "form",
                entityId: form._id,
                roomId: form.roomId
            }).catch(() => {});
        } catch (e) {}

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'access_revoked',
            targetType: 'access',
            targetId: userId,
            metadata: {},
            req
        });

        res.status(200).json({ success: true, message: "Access revoked successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// PHASE 6: SECURE SHARE LINKS
// ==========================================

// 22. Generate / Retrieve Secure Share Link (Owner only)
module.exports.generateShareLink = async (req, res) => {
    try {
        const { id } = req.params;
        const { expiresInHours, requireAuthentication = true, allowExternalAccess = false } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const perms = await getFormPermissions(req.user, form);
        if (!perms.isOwner) {
            return res.status(403).json({ success: false, message: "Only the form owner can generate share links." });
        }

        // Generate cryptographic token
        const shareToken = crypto.randomBytes(24).toString('hex');
        let expiresAt = null;
        if (expiresInHours && !isNaN(Number(expiresInHours))) {
            expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000);
        }

        form.shareToken = shareToken;
        form.shareTokenExpiresAt = expiresAt;
        form.sharingEnabled = true;
        form.sharingMode = 'link';
        form.requireAuthentication = requireAuthentication;
        form.allowExternalAccess = allowExternalAccess;
        await form.save();

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'share_link_created',
            targetType: 'share_link',
            metadata: { expiresAt, requireAuthentication, allowExternalAccess },
            req
        });

        res.status(200).json({
            success: true,
            message: "Share link generated successfully.",
            shareToken,
            shareTokenExpiresAt: expiresAt,
            shareUrl: `/forms/shared/${shareToken}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 23. Revoke Share Link (Owner only)
module.exports.revokeShareLink = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const perms = await getFormPermissions(req.user, form);
        if (!perms.isOwner) {
            return res.status(403).json({ success: false, message: "Only the form owner can revoke share links." });
        }

        form.shareToken = null;
        form.shareTokenExpiresAt = null;
        if (form.sharingMode === 'link') {
            form.sharingMode = 'classroom';
        }
        await form.save();

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'share_link_revoked',
            targetType: 'share_link',
            metadata: {},
            req
        });

        res.status(200).json({ success: true, message: "Share link revoked successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 24. Regenerate Share Link (Owner only)
module.exports.regenerateShareLink = async (req, res) => {
    try {
        const { id } = req.params;
        const { expiresInHours } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const perms = await getFormPermissions(req.user, form);
        if (!perms.isOwner) {
            return res.status(403).json({ success: false, message: "Only the form owner can regenerate share links." });
        }

        const newShareToken = crypto.randomBytes(24).toString('hex');
        let expiresAt = null;
        if (expiresInHours && !isNaN(Number(expiresInHours))) {
            expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000);
        }

        form.shareToken = newShareToken;
        form.shareTokenExpiresAt = expiresAt;
        form.sharingEnabled = true;
        form.sharingMode = 'link';
        await form.save();

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'share_link_regenerated',
            targetType: 'share_link',
            metadata: { expiresAt },
            req
        });

        res.status(200).json({
            success: true,
            message: "Share link regenerated successfully.",
            shareToken: newShareToken,
            shareTokenExpiresAt: expiresAt,
            shareUrl: `/forms/shared/${newShareToken}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 25. Update Sharing & Access Settings (Owner only)
module.exports.updateSharingSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const { sharingEnabled, sharingMode, allowExternalAccess, requireAuthentication } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const perms = await getFormPermissions(req.user, form);
        if (!perms.isOwner) {
            return res.status(403).json({ success: false, message: "Only the form owner can modify sharing settings." });
        }

        if (sharingEnabled !== undefined) form.sharingEnabled = !!sharingEnabled;
        if (sharingMode && ['classroom', 'selected_users', 'link', 'restricted'].includes(sharingMode)) {
            form.sharingMode = sharingMode;
        }
        if (allowExternalAccess !== undefined) form.allowExternalAccess = !!allowExternalAccess;
        if (requireAuthentication !== undefined) form.requireAuthentication = !!requireAuthentication;

        await form.save();

        await logFormEvent({
            formId: form._id,
            actorId: req.user._id,
            action: 'access_changed',
            targetType: 'form',
            metadata: { sharingEnabled: form.sharingEnabled, sharingMode: form.sharingMode },
            req
        });

        res.status(200).json({ success: true, message: "Sharing settings updated successfully.", form });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 26. Access Shared Form via Token (Public / Token Endpoint)
module.exports.getSharedFormByToken = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ success: false, message: "Valid share token is required." });
        }

        const form = await Form.findOne({ shareToken: token });
        if (!form) {
            return res.status(404).json({ success: false, message: "Shared form not found or invalid link." });
        }

        if (form.sharingEnabled === false) {
            return res.status(403).json({ success: false, message: "Sharing for this form has been disabled." });
        }

        if (form.shareTokenExpiresAt && new Date() > new Date(form.shareTokenExpiresAt)) {
            return res.status(403).json({ success: false, message: "This share link has expired." });
        }

        if (form.status === 'draft') {
            return res.status(403).json({ success: false, message: "This form is in draft mode." });
        }

        if (form.archived) {
            return res.status(403).json({ success: false, message: "This form has been archived." });
        }

        if (form.requireAuthentication && !req.user) {
            return res.status(401).json({ success: false, message: "Authentication required to access this shared form." });
        }

        let questions = await FormQuestion.find({ formId: form._id }).sort({ order: 1 });

        // Strip correct answer keys for respondents
        questions = questions.map(q => {
            const qObj = q.toObject();
            delete qObj.correctAnswer;
            delete qObj.correctAnswers;
            return qObj;
        });

        if (form.shuffleQuestions) {
            questions = [...questions].sort(() => Math.random() - 0.5);
        }
        if (form.shuffleOptions) {
            questions = questions.map(q => {
                if (['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type) && Array.isArray(q.options)) {
                    q.options = [...q.options].sort(() => Math.random() - 0.5);
                }
                return q;
            });
        }

        res.status(200).json({
            success: true,
            form: {
                _id: form._id,
                title: form.title,
                description: form.description,
                topic: form.topic,
                sections: form.sections,
                collectEmail: form.collectEmail,
                limitOneResponse: form.limitOneResponse,
                showProgressBar: form.showProgressBar,
                confirmationMessage: form.confirmationMessage,
                submitButtonText: form.submitButtonText
            },
            questions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// PHASE 6: AUDIT LOGS
// ==========================================

// 27. Get Form Audit Logs (Owner & Collaborators only)
module.exports.getFormAuditLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const skip = (page - 1) * limit;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Form ID is required." });
        }

        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found." });
        }

        const perms = await getFormPermissions(req.user, form);
        if (!perms.canViewAuditLogs) {
            return res.status(403).json({ success: false, message: "You do not have permission to view audit logs for this form." });
        }

        const totalLogs = await FormAuditLog.countDocuments({ formId: id });
        const logs = await FormAuditLog.find({ formId: id })
            .populate('actorId', 'fullname email role avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            logs,
            totalLogs,
            page,
            totalPages: Math.ceil(totalLogs / limit)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
