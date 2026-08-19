import React, { useState, useEffect } from 'react';
import { X, Copy, Check, RefreshCw, Eye, Shield, Sliders, GraduationCap, Trash2, Archive, ExternalLink } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import { BANNER_THEMES } from '../../utils/themeUtils';

const ClassSettingsModal = ({ isOpen, onClose, roomId, onSettingsSaved, onClassDeleted }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [showCodeBig, setShowCodeBig] = useState(false);
    const [activeSection, setActiveSection] = useState('details');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        section: '',
        subject: '',
        room: '',
        description: '',
        banner: 'purple',
        code: '',
        joinEnabled: true,
        inviteLinkEnabled: true,
        streamSettings: {
            whoCanPost: 'students_post_comment',
            classworkOnStream: 'show_all',
            showDeletedItems: false
        },
        gradingSettings: {
            gradeCalculation: 'total_points',
            showOverallGradeToStudents: true,
            gradeCategories: [{ name: 'Assignments', weight: 100 }]
        },
        archived: false
    });

    useEffect(() => {
        if (isOpen && roomId) {
            fetchSettings();
        }
    }, [isOpen, roomId]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/settings`, { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.settings) {
                setFormData({
                    name: data.settings.name || '',
                    section: data.settings.section || '',
                    subject: data.settings.subject || '',
                    room: data.settings.room || '',
                    description: data.settings.description || '',
                    banner: data.settings.banner || 'purple',
                    code: data.settings.code || '',
                    joinEnabled: data.settings.joinEnabled !== false,
                    inviteLinkEnabled: data.settings.inviteLinkEnabled !== false,
                    streamSettings: {
                        whoCanPost: data.settings.streamSettings?.whoCanPost || 'students_post_comment',
                        classworkOnStream: data.settings.streamSettings?.classworkOnStream || 'show_all',
                        showDeletedItems: Boolean(data.settings.streamSettings?.showDeletedItems)
                    },
                    gradingSettings: {
                        gradeCalculation: data.settings.gradingSettings?.gradeCalculation || 'total_points',
                        showOverallGradeToStudents: data.settings.gradingSettings?.showOverallGradeToStudents !== false,
                        gradeCategories: data.settings.gradingSettings?.gradeCategories || [{ name: 'Assignments', weight: 100 }]
                    },
                    archived: Boolean(data.settings.archived)
                });
            }
        } catch (err) {
            console.error("Failed to fetch classroom settings", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                if (onSettingsSaved) onSettingsSaved(data.room);
                onClose();
            } else {
                alert(data.message || "Failed to save settings");
            }
        } catch (err) {
            console.error("Failed to update settings", err);
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerateCode = async () => {
        if (!window.confirm("Regenerate class code? The existing code will no longer work for new students.")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/join-code/regenerate`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({ ...prev, code: data.code, joinEnabled: true }));
            }
        } catch (err) {
            console.error("Failed to regenerate code", err);
        }
    };

    const handleToggleJoin = async (enabled) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/join-code/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({ ...prev, joinEnabled: data.joinEnabled }));
            }
        } catch (err) {
            console.error("Failed to toggle join code", err);
        }
    };

    const copyCodeToClipboard = () => {
        navigator.clipboard.writeText(formData.code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const copyLinkToClipboard = () => {
        const inviteUrl = `${window.location.origin}/rooms?code=${formData.code}`;
        navigator.clipboard.writeText(inviteUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#121215] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Class settings</h2>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || !formData.name.trim()}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm shadow-md transition-all active:scale-95"
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-gray-500">
                            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mr-3" />
                            Loading settings...
                        </div>
                    ) : (
                        <>
                            {/* Class Details Section */}
                            <section className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl p-6">
                                <h3 className="text-base font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <GraduationCap className="w-5 h-5" /> Class details
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                            Class name (required)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-purple-500 outline-none transition-colors"
                                            placeholder="e.g. Data Structures & Algorithms"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                            Class description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-purple-500 outline-none transition-colors resize-none"
                                            rows="2"
                                            placeholder="Add classroom syllabus, notes, or expectations..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                                Section
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.section}
                                                onChange={e => setFormData({ ...formData, section: e.target.value })}
                                                className="w-full bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-purple-500 outline-none transition-colors"
                                                placeholder="e.g. CSE-A"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                                Room
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.room}
                                                onChange={e => setFormData({ ...formData, room: e.target.value })}
                                                className="w-full bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-purple-500 outline-none transition-colors"
                                                placeholder="e.g. Lab 402"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                                Subject
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.subject}
                                                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                                className="w-full bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-purple-500 outline-none transition-colors"
                                                placeholder="e.g. Computer Science"
                                            />
                                        </div>
                                    </div>

                                    {/* Banner Theme Picker */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
                                            Theme color preset
                                        </label>
                                        <div className="flex flex-wrap gap-3">
                                            {Object.entries(BANNER_THEMES).map(([key, theme]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, banner: key })}
                                                    className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all ${
                                                        formData.banner === key
                                                            ? 'border-purple-500 bg-purple-500/20 text-white ring-2 ring-purple-500/30'
                                                            : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181c] text-gray-700 dark:text-gray-300 hover:border-gray-400'
                                                    }`}
                                                >
                                                    <div className={`w-3.5 h-3.5 rounded-full ${theme.badge}`} />
                                                    {theme.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* General Section */}
                            <section className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl p-6">
                                <h3 className="text-base font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5" /> General
                                </h3>

                                <div className="space-y-6">
                                    {/* Invite codes */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Invite codes</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Manage how students join your classroom</p>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Manage invite codes</p>
                                                    <p className="text-xs text-gray-500">Status: {formData.joinEnabled ? 'On' : 'Off'}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleJoin(!formData.joinEnabled)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                                            formData.joinEnabled
                                                                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                                                : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                                        }`}
                                                    >
                                                        {formData.joinEnabled ? 'Enabled (Click to disable)' : 'Disabled (Click to enable)'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleRegenerateCode}
                                                        className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
                                                        title="Reset / Regenerate code"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-3 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Class code</p>
                                                    <p className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400 mt-0.5 tracking-wider">
                                                        {formData.code}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCodeBig(true)}
                                                        className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> Display
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={copyCodeToClipboard}
                                                        className="px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                                                    >
                                                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                        {copiedCode ? "Copied" : "Copy code"}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-3 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Class invite link</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-xs md:max-w-md">
                                                        {window.location.origin}/rooms?code={formData.code}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={copyLinkToClipboard}
                                                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                                                >
                                                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                    {copiedLink ? "Copied link" : "Copy link"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stream & Classwork permissions */}
                                    <div className="pt-4 border-t border-gray-200 dark:border-white/10 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                                                Stream posting permissions
                                            </label>
                                            <p className="text-xs text-gray-500 mb-2">Control who can post announcements and comments on the stream</p>
                                            <select
                                                value={formData.streamSettings.whoCanPost}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    streamSettings: { ...formData.streamSettings, whoCanPost: e.target.value }
                                                })}
                                                className="w-full bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-purple-500 outline-none"
                                            >
                                                <option value="students_post_comment">Students can post and comment</option>
                                                <option value="students_comment_only">Students can only comment</option>
                                                <option value="teachers_only">Only teachers can post or comment</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                                                Classwork on the stream
                                            </label>
                                            <select
                                                value={formData.streamSettings.classworkOnStream}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    streamSettings: { ...formData.streamSettings, classworkOnStream: e.target.value }
                                                })}
                                                className="w-full bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-purple-500 outline-none"
                                            >
                                                <option value="show_all">Show attachments and details</option>
                                                <option value="condensed">Show condensed notifications</option>
                                                <option value="hide">Hide notifications</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Grading Section */}
                            <section className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl p-6">
                                <h3 className="text-base font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Sliders className="w-5 h-5" /> Grading
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                                            Overall grade calculation
                                        </label>
                                        <select
                                            value={formData.gradingSettings.gradeCalculation}
                                            onChange={e => setFormData({
                                                ...formData,
                                                gradingSettings: { ...formData.gradingSettings, gradeCalculation: e.target.value }
                                            })}
                                            className="w-full bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-purple-500 outline-none"
                                        >
                                            <option value="total_points">Total points</option>
                                            <option value="weighted_categories">Weighted by category</option>
                                            <option value="no_overall_grade">No overall grade</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">Show overall grade to students</p>
                                            <p className="text-xs text-gray-500">Allow students to view their calculated score</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.gradingSettings.showOverallGradeToStudents}
                                            onChange={e => setFormData({
                                                ...formData,
                                                gradingSettings: { ...formData.gradingSettings, showOverallGradeToStudents: e.target.checked }
                                            })}
                                            className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>

            {/* Big Code Display Modal */}
            {showCodeBig && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150" onClick={() => setShowCodeBig(false)}>
                    <div className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-10 max-w-lg w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-sm uppercase tracking-widest text-purple-600 dark:text-purple-400 font-bold mb-4">Class Code</h3>
                        <div className="text-6xl md:text-7xl font-mono font-black text-gray-900 dark:text-white tracking-widest my-6 select-all">
                            {formData.code}
                        </div>
                        <div className="flex justify-center gap-4 mt-6">
                            <button
                                onClick={copyCodeToClipboard}
                                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                            >
                                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copiedCode ? "Copied to clipboard!" : "Copy code"}
                            </button>
                            <button
                                onClick={() => setShowCodeBig(false)}
                                className="px-6 py-2.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white rounded-xl font-bold text-sm transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassSettingsModal;
