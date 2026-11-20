/**
 * Pure helpers: classify a notification and decide which channels it should use.
 * No I/O here so the rules are easy to unit test.
 */

const CATEGORY_PREFIXES = [
    ["assignment_", "assignment"],
    ["quiz_", "quiz"],
    ["attendance_", "attendance"],
    ["announcement_", "announcement"],
    ["classroom_", "classroom"],
    ["class_", "classroom"],
    ["student_", "classroom"],
    ["teacher_", "classroom"],
    ["task_", "calendar"],
    ["calendar_", "calendar"],
    ["live_class_", "live_class"],
    ["academic_", "analytics"],
    ["performance_", "analytics"],
    ["form_", "form"],
    ["account_", "account"]
];

const categoryForType = (type = "") => {
    for (const [prefix, cat] of CATEGORY_PREFIXES) if (type.startsWith(prefix)) return cat;
    return "system";
};

// Category -> user preference toggle. Categories without an entry have no per-category switch.
const CATEGORY_PREF_KEY = {
    assignment: "assignmentNotifications",
    quiz: "quizNotifications",
    attendance: "attendanceNotifications",
    calendar: "calendarNotifications",
    live_class: "liveClassNotifications",
    analytics: "analyticsNotifications",
    announcement: "announcementNotifications",
    classroom: "announcementNotifications"
};

// Types that are worth an email by default (high-signal academic events). Everything else is in-app only
// unless the caller asks for email explicitly or the priority is high/urgent.
const EMAIL_DEFAULT_TYPES = new Set([
    "assignment_created", "assignment_published", "assignment_updated", "assignment_updated_deadline", "assignment_due_soon",
    "assignment_overdue", "assignment_graded", "assignment_submitted", "assignment_returned",
    "quiz_published", "quiz_updated", "quiz_schedule_changed", "quiz_due_soon", "quiz_starting_soon", "quiz_results_released", "quiz_graded", "quiz_submitted",
    "attendance_marked", "attendance_low", "attendance_warning", "attendance_low_threshold",
    "announcement_created", "announcement_updated",
    "classroom_joined", "classroom_removed", "classroom_updated",
    "live_class_scheduled", "live_class_starting", "live_class_cancelled",
    "task_due_soon", "task_overdue",
    "account_welcome", "account_updated", "account_security"
]);

// SMS is reserved for time-critical or urgent alerts.
const SMS_DEFAULT_TYPES = new Set([
    "assignment_due_soon", "assignment_overdue", "quiz_starting_soon", "quiz_due_soon",
    "attendance_low_threshold", "attendance_low", "live_class_starting", "account_security"
]);

const ESSENTIAL_TYPES = new Set(["account_security"]);

const PRIORITY_ALIASES = { medium: "normal", critical: "urgent" };
const normalizePriority = (p) => {
    const v = PRIORITY_ALIASES[p] || p || "normal";
    return ["low", "normal", "high", "urgent"].includes(v) ? v : "normal";
};

/**
 * @returns {{inApp:boolean,email:boolean,sms:boolean,reason?:string}}
 */
const resolveChannels = ({ type, category, priority, requestedChannels, user }) => {
    const prefs = (user && user.notificationPreferences) || {};
    const cat = category || categoryForType(type);
    const prio = normalizePriority(priority);
    const essential = ESSENTIAL_TYPES.has(type);

    const categoryKey = CATEGORY_PREF_KEY[cat];
    const categoryOff = categoryKey && prefs[categoryKey] === false;
    const urgentOverride = prio === "urgent" && prefs.urgentAlerts !== false;
    if (!essential && categoryOff && !urgentOverride) {
        return { inApp: false, email: false, sms: false, reason: "category_disabled" };
    }

    const explicit = Array.isArray(requestedChannels) && requestedChannels.length > 0;
    const wants = (ch) => (explicit ? requestedChannels.includes(ch) : false);

    const inApp = (explicit ? wants("inApp") : true) && (essential || prefs.inAppNotifications !== false);

    const emailAuto = EMAIL_DEFAULT_TYPES.has(type) || prio === "high" || prio === "urgent";
    const emailWanted = explicit ? wants("email") : emailAuto;
    const email = Boolean(emailWanted && user && user.email && (essential || prefs.emailNotifications !== false));

    const smsAuto = SMS_DEFAULT_TYPES.has(type) || prio === "urgent";
    const smsWanted = explicit ? wants("sms") : smsAuto;
    const sms = Boolean(smsWanted && user && user.phone && prefs.smsNotifications === true);

    return { inApp, email, sms };
};

module.exports = { categoryForType, resolveChannels, normalizePriority, CATEGORY_PREF_KEY, EMAIL_DEFAULT_TYPES, SMS_DEFAULT_TYPES, ESSENTIAL_TYPES };
