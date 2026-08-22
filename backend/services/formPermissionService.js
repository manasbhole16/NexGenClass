const FormCollaborator = require('../models/formCollaborator-model');
const FormAccess = require('../models/formAccess-model');
const Room = require('../models/room-model');

/**
 * Resolves comprehensive permissions for a user on a given Form.
 */
async function getFormPermissions(user, form) {
    if (!user || !form) {
        return {
            isOwner: false,
            isCollaborator: false,
            collaboratorRole: null,
            canEdit: false,
            canGrade: false,
            canViewResponses: false,
            canModerate: false,
            canManageCollaborators: false,
            canManageSharing: false,
            canDelete: false,
            canViewAuditLogs: false
        };
    }

    const userIdStr = user._id.toString();

    // Check if user is the direct creator
    const isCreator = form.createdBy?.toString() === userIdStr;

    // Check if user is the classroom owner
    let isRoomOwner = false;
    if (form.roomId) {
        const room = await Room.findById(form.roomId);
        if (room && room.owner?.toString() === userIdStr) {
            isRoomOwner = true;
        }
    }

    // Owner has total control
    if (isCreator || isRoomOwner) {
        return {
            isOwner: true,
            isCollaborator: false,
            collaboratorRole: 'owner',
            canEdit: true,
            canGrade: true,
            canViewResponses: true,
            canModerate: true,
            canManageCollaborators: true,
            canManageSharing: true,
            canDelete: true,
            canViewAuditLogs: true
        };
    }

    // Check collaborator record
    const collaborator = await FormCollaborator.findOne({ formId: form._id, userId: user._id });
    if (collaborator) {
        const role = collaborator.role; // 'editor', 'reviewer', 'viewer'
        return {
            isOwner: false,
            isCollaborator: true,
            collaboratorRole: role,
            canEdit: role === 'editor',
            canGrade: ['editor', 'reviewer'].includes(role),
            canViewResponses: ['editor', 'reviewer', 'viewer'].includes(role),
            canModerate: ['editor', 'reviewer'].includes(role),
            canManageCollaborators: false, // only owner
            canManageSharing: false,       // only owner
            canDelete: false,              // only owner
            canViewAuditLogs: true         // collaborators can view audit logs
        };
    }

    return {
        isOwner: false,
        isCollaborator: false,
        collaboratorRole: null,
        canEdit: false,
        canGrade: false,
        canViewResponses: false,
        canModerate: false,
        canManageCollaborators: false,
        canManageSharing: false,
        canDelete: false,
        canViewAuditLogs: false
    };
}

/**
 * Checks if a student is permitted to access/submit to a form based on sharing mode.
 */
async function canStudentAccessForm(user, form, token = null) {
    if (!form) return { allowed: false, reason: "Form not found." };

    // If sharing is explicitly disabled
    if (form.sharingEnabled === false) {
        return { allowed: false, reason: "Form sharing is currently disabled." };
    }

    // If form is in draft status, students cannot access
    if (form.status === 'draft') {
        return { allowed: false, reason: "This form is currently in draft mode and not available." };
    }

    const sharingMode = form.sharingMode || 'classroom';

    // 1. Restricted mode: only owner and collaborators
    if (sharingMode === 'restricted') {
        return { allowed: false, reason: "This form is restricted to owners and collaborators only." };
    }

    // 2. Selected users mode: student must be in FormAccess
    if (sharingMode === 'selected_users') {
        if (!user) return { allowed: false, reason: "Authentication required to access this form." };
        const access = await FormAccess.findOne({ formId: form._id, userId: user._id });
        if (!access) {
            return { allowed: false, reason: "You have not been granted access to this form." };
        }
        return { allowed: true };
    }

    // 3. Link sharing mode: valid shareToken required
    if (sharingMode === 'link') {
        if (!token && !form.shareToken) {
            // Check classroom fallback if member
            if (user && form.roomId) {
                const room = await Room.findById(form.roomId);
                const isMember = room && (room.owner?.toString() === user._id.toString() || room.members?.some(m => m.toString() === user._id.toString()));
                if (isMember) return { allowed: true };
            }
            return { allowed: false, reason: "A valid share link is required to access this form." };
        }

        if (token) {
            if (form.shareToken !== token) {
                return { allowed: false, reason: "Invalid or revoked share link." };
            }
            if (form.shareTokenExpiresAt && new Date() > new Date(form.shareTokenExpiresAt)) {
                return { allowed: false, reason: "This share link has expired." };
            }
            if (form.requireAuthentication && !user) {
                return { allowed: false, reason: "Authentication is required to view this shared form." };
            }
            return { allowed: true };
        }
    }

    // 4. Classroom mode (default)
    if (user && form.roomId) {
        const room = await Room.findById(form.roomId);
        if (!room) return { allowed: false, reason: "Classroom not found." };
        const userIdStr = user._id.toString();
        const isMember = room.owner?.toString() === userIdStr || room.members?.some(m => m.toString() === userIdStr);
        if (!isMember) {
            return { allowed: false, reason: "You must be enrolled in this classroom to access this form." };
        }
        return { allowed: true };
    }

    return { allowed: false, reason: "Unauthorized access to form." };
}

module.exports = {
    getFormPermissions,
    canStudentAccessForm
};
