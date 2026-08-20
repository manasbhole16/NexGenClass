const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    section: { type: String, default: '', trim: true },
    subject: { type: String, default: '', trim: true },
    room: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    banner: { type: String, default: 'purple' },
    archived: { type: Boolean, default: false },
    joinEnabled: { type: Boolean, default: true },
    inviteLinkEnabled: { type: Boolean, default: true },
    streamSettings: {
        whoCanPost: {
            type: String,
            enum: ['teachers_only', 'students_post_comment', 'students_comment_only'],
            default: 'students_post_comment'
        },
        classworkOnStream: {
            type: String,
            enum: ['show_all', 'condensed', 'hide'],
            default: 'show_all'
        },
        showDeletedItems: { type: Boolean, default: false }
    },
    gradingSettings: {
        gradeCalculation: {
            type: String,
            enum: ['no_overall_grade', 'total_points', 'weighted_categories'],
            default: 'total_points'
        },
        showOverallGradeToStudents: { type: Boolean, default: true },
        gradeCategories: [{
            name: { type: String, default: 'Assignments' },
            weight: { type: Number, default: 100 }
        }]
    },
    topics: [{
        name: { type: String, required: true, trim: true },
        order: { type: Number, default: 0 }
    }]
}, { timestamps: true });

roomSchema.index({ owner: 1 });
roomSchema.index({ members: 1 });

module.exports = mongoose.model("Room", roomSchema);
