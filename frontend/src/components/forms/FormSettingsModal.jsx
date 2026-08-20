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
    AlertCircle,
    Shuffle,
    Sliders,
    MessageSquare,
    Send,
    Shield
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
    const [confirmationMessage, setConfirmationMessage] = useState(
        form?.confirmationMessage || 'Your response has been recorded.'
    );
    const [submitButtonText, setSubmitButtonText] = useState(form?.submitButtonText || 'Submit');
    const [showProgressBar, setShowProgressBar] = useState(
        form?.showProgressBar !== undefined ? form.showProgressBar : true
    );
    const [shuffleQuestions, setShuffleQuestions] = useState(!!form?.shuffleQuestions);
    const [shuffleOptions, setShuffleOptions] = useState(!!form?.shuffleOptions);
    const [allowDraftSaving, setAllowDraftSaving] = useState(
        form?.allowDraftSaving !== undefined ? form.allowDraftSaving : true
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
            setConfirmationMessage(form.confirmationMessage || 'Your response has been recorded.');
            setSubmitButtonText(form.submitButtonText || 'Submit');
            setShowProgressBar(form.showProgressBar !== undefined ? form.showProgressBar : true);
            setShuffleQuestions(!!form.shuffleQuestions);
            setShuffleOptions(!!form.shuffleOptions);
            setAllowDraftSaving(form.allowDraftSaving !== undefined ? form.allowDraftSaving : true);
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

        const chosenTopic = topic === 'custom' ? customTopic.trim() || 'General' : topic;

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
                allowResponseEditing,
                confirmationMessage: confirmationMessage.trim(),
                submitButtonText: submitButtonText.trim() || 'Submit',
                showProgressBar,
                shuffleQuestions,
                shuffleOptions,
                allowDraftSaving
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
                            <p className="text-xs text-gray-500 dark:text-gray-400">Configure response and presentation options</p>
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
                                className="w-full mt-2 px-3.5 py-2 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                            />
                        )}
                    </div>

                    {/* Response Controls */}
                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/5">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Responses & Submissions</h4>

                        <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#222228]/50 border border-gray-200 dark:border-white/5 cursor-pointer">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-purple-500" /> Collect Email Addresses
                                </span>
                                <p className="text-[11px] text-gray-400">Record respondent email automatically with submission</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={collectEmail}
                                onChange={(e) => setCollectEmail(e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#222228]/50 border border-gray-200 dark:border-white/5 cursor-pointer">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-purple-500" /> Limit to 1 Response
                                </span>
                                <p className="text-[11px] text-gray-400">Require students to submit at most once</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={limitOneResponse}
                                onChange={(e) => setLimitOneResponse(e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#222228]/50 border border-gray-200 dark:border-white/5 cursor-pointer">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <Edit3 className="w-3.5 h-3.5 text-purple-500" /> Allow Response Editing
                                </span>
                                <p className="text-[11px] text-gray-400">Respondents can modify their answers after submit</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={allowResponseEditing}
                                onChange={(e) => setAllowResponseEditing(e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#222228]/50 border border-gray-200 dark:border-white/5 cursor-pointer">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <Save className="w-3.5 h-3.5 text-purple-500" /> Enable Draft Autosave
                                </span>
                                <p className="text-[11px] text-gray-400">Automatically save student answers as drafts while filling</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={allowDraftSaving}
                                onChange={(e) => setAllowDraftSaving(e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                        </label>
                    </div>

                    {/* Presentation & Shuffling */}
                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/5">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Presentation & Randomization</h4>

                        <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#222228]/50 border border-gray-200 dark:border-white/5 cursor-pointer">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <Sliders className="w-3.5 h-3.5 text-purple-500" /> Show Progress Bar
                                </span>
                                <p className="text-[11px] text-gray-400">Show section progress bar on multi-section forms</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={showProgressBar}
                                onChange={(e) => setShowProgressBar(e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#222228]/50 border border-gray-200 dark:border-white/5 cursor-pointer">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <Shuffle className="w-3.5 h-3.5 text-purple-500" /> Shuffle Questions Order
                                </span>
                                <p className="text-[11px] text-gray-400">Display questions in randomized order for each student</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={shuffleQuestions}
                                onChange={(e) => setShuffleQuestions(e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#222228]/50 border border-gray-200 dark:border-white/5 cursor-pointer">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <Shuffle className="w-3.5 h-3.5 text-purple-500" /> Shuffle Options Order
                                </span>
                                <p className="text-[11px] text-gray-400">Randomize multiple choice / checkbox options</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={shuffleOptions}
                                onChange={(e) => setShuffleOptions(e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                        </label>
                    </div>

                    {/* Custom Confirmation & Submit Text */}
                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/5">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Confirmation Screen</h4>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-purple-500" /> Confirmation Message
                            </label>
                            <input
                                type="text"
                                value={confirmationMessage}
                                onChange={(e) => setConfirmationMessage(e.target.value)}
                                placeholder="Your response has been recorded."
                                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                <Send className="w-3.5 h-3.5 text-purple-500" /> Custom Submit Button Text
                            </label>
                            <input
                                type="text"
                                value={submitButtonText}
                                onChange={(e) => setSubmitButtonText(e.target.value)}
                                placeholder="Submit"
                                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>

                    {/* Schedule / Timing */}
                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/5">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Availability Windows</h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-500">Open Date & Time:</label>
                                <input
                                    type="datetime-local"
                                    value={startAt}
                                    onChange={(e) => setStartAt(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-500">Close Date & Time:</label>
                                <input
                                    type="datetime-local"
                                    value={endAt}
                                    onChange={(e) => setEndAt(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                        >
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FormSettingsModal;
