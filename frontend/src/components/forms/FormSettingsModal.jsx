import React, { useState, useEffect } from 'react';
import {
    X,
    Settings,
    Calendar,
    Mail,
    Lock,
    Edit3,
    Layers,
    Save,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react';

const FormSettingsModal = ({ isOpen, onClose, form, onSave, existingTopics = [] }) => {
    const [title, setTitle] = useState(form?.title || '');
    const [description, setDescription] = useState(form?.description || '');
    const [topic, setTopic] = useState(form?.topic || 'General');
    const [customTopic, setCustomTopic] = useState('');
    const [status, setStatus] = useState(form?.status || 'draft');
    const [startAt, setStartAt] = useState(
        form?.startAt ? new Date(form.startAt).toISOString().slice(0, 16) : ''
    );
    const [endAt, setEndAt] = useState(
        form?.endAt ? new Date(form.endAt).toISOString().slice(0, 16) : ''
    );
    const [collectEmail, setCollectEmail] = useState(
        form?.collectEmail !== undefined ? form.collectEmail : true
    );
    const [limitOneResponse, setLimitOneResponse] = useState(
        form?.limitOneResponse !== undefined ? form.limitOneResponse : true
    );
    const [allowResponseEditing, setAllowResponseEditing] = useState(
        form?.allowResponseEditing !== undefined ? form.allowResponseEditing : false
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (form) {
            setTitle(form.title || '');
            setDescription(form.description || '');
            setTopic(form.topic || 'General');
            setStatus(form.status || 'draft');
            setStartAt(form.startAt ? new Date(form.startAt).toISOString().slice(0, 16) : '');
            setEndAt(form.endAt ? new Date(form.endAt).toISOString().slice(0, 16) : '');
            setCollectEmail(form.collectEmail !== undefined ? form.collectEmail : true);
            setLimitOneResponse(form.limitOneResponse !== undefined ? form.limitOneResponse : true);
            setAllowResponseEditing(
                form.allowResponseEditing !== undefined ? form.allowResponseEditing : false
            );
        }
    }, [form]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError('Form title is required.');
            return;
        }

        if (startAt && endAt && new Date(startAt) > new Date(endAt)) {
            setError('Start date/time must be before end date/time.');
            return;
        }

        const chosenTopic = topic === 'custom' ? (customTopic.trim() || 'General') : topic;

        setSaving(true);
        try {
            await onSave({
                title: title.trim(),
                description: description.trim(),
                topic: chosenTopic,
                status,
                startAt: startAt ? new Date(startAt).toISOString() : null,
                endAt: endAt ? new Date(endAt).toISOString() : null,
                collectEmail,
                limitOneResponse,
                allowResponseEditing
            });
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#18181c] w-full max-w-xl rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-gray-900 dark:text-white">Form Settings</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Configure response and availability settings</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold text-red-500">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Topic */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-purple-500" /> Topic / Category
                        </label>
                        <select
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500 transition-colors"
                        >
                            <option value="General">General</option>
                            <option value="Feedback">Feedback</option>
                            <option value="Surveys">Surveys</option>
                            <option value="Assignments">Assignments</option>
                            {existingTopics
                                .filter((t) => !['General', 'Feedback', 'Surveys', 'Assignments', 'All'].includes(t))
                                .map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            <option value="custom">+ Create New Topic...</option>
                        </select>
                        {topic === 'custom' && (
                            <input
                                type="text"
                                placeholder="Enter custom topic name..."
                                value={customTopic}
                                onChange={(e) => setCustomTopic(e.target.value)}
                                className="mt-2 w-full px-3.5 py-2 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                            />
                        )}
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" /> Form Lifecycle Status
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'draft', label: 'Draft', desc: 'Teacher only' },
                                { id: 'published', label: 'Published', desc: 'Open' },
                                { id: 'closed', label: 'Closed', desc: 'No responses' }
                            ].map((st) => (
                                <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => setStatus(st.id)}
                                    className={`py-2.5 px-3 rounded-xl border text-center transition-all ${
                                        status === st.id
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                                            : 'bg-gray-50 dark:bg-[#222228] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-xs font-bold">{st.label}</div>
                                    <div className="text-[10px] opacity-75">{st.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Availability Schedule */}
                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-500" /> Availability Window (Optional)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <span className="text-[11px] text-gray-500 block mb-1">Start Date & Time</span>
                                <input
                                    type="datetime-local"
                                    value={startAt}
                                    onChange={(e) => setStartAt(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <span className="text-[11px] text-gray-500 block mb-1">End Date & Time</span>
                                <input
                                    type="datetime-local"
                                    value={endAt}
                                    onChange={(e) => setEndAt(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Response Controls */}
                    <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-white/5">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                            Response Controls
                        </h4>

                        {/* Collect Email */}
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#222228]/50 border border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Collect Email Addresses</div>
                                    <div className="text-[11px] text-gray-500">Record respondent email on submission</div>
                                </div>
                            </div>
                            <div
                                onClick={() => setCollectEmail(!collectEmail)}
                                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    collectEmail ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'
                                }`}
                            >
                                <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                        collectEmail ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Limit to 1 response */}
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#222228]/50 border border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Limit to 1 response</div>
                                    <div className="text-[11px] text-gray-500">Respondents will be required to sign in</div>
                                </div>
                            </div>
                            <div
                                onClick={() => setLimitOneResponse(!limitOneResponse)}
                                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    limitOneResponse ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'
                                }`}
                            >
                                <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                        limitOneResponse ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Allow response editing */}
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#222228]/50 border border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                    <Edit3 className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Allow Response Editing</div>
                                    <div className="text-[11px] text-gray-500">Respondents can edit responses after submit</div>
                                </div>
                            </div>
                            <div
                                onClick={() => setAllowResponseEditing(!allowResponseEditing)}
                                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    allowResponseEditing ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'
                                }`}
                            >
                                <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                        allowResponseEditing ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FormSettingsModal;
