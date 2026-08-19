import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import {
    ArrowLeft,
    Save,
    Plus,
    Eye,
    Settings,
    Loader,
    CheckCircle2,
    AlertCircle,
    Globe,
    Lock,
    Radio,
    CheckSquare,
    AlignLeft,
    FileText,
    ListFilter,
    Layers,
    Sparkles
} from 'lucide-react';
import FormQuestion from './FormQuestion';
import FormSettingsModal from './FormSettingsModal';
import FormPreview from './FormPreview';

const FormBuilder = ({ formId, roomId, onBack, onSaved }) => {
    const [form, setForm] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Load form details and questions
    const loadFormDetails = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setForm(data.form);
                if (Array.isArray(data.questions) && data.questions.length > 0) {
                    setQuestions(
                        data.questions.map((q, idx) => ({
                            _id: q._id,
                            questionText: q.questionText || '',
                            description: q.description || '',
                            type: q.type || 'short_answer',
                            options:
                                Array.isArray(q.options) && q.options.length > 0
                                    ? q.options
                                    : ['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type)
                                    ? [{ text: 'Option 1' }, { text: 'Option 2' }]
                                    : [],
                            required: !!q.required,
                            order: q.order !== undefined ? q.order : idx
                        }))
                    );
                } else {
                    // Default first question if none exist
                    setQuestions([
                        {
                            questionText: 'Untitled Question',
                            description: '',
                            type: 'multiple_choice',
                            options: [{ text: 'Option 1' }, { text: 'Option 2' }],
                            required: false,
                            order: 0
                        }
                    ]);
                }
            } else {
                showToast(data.message || 'Failed to load form', 'error');
            }
        } catch (err) {
            console.error('Error fetching form:', err);
            showToast('Error loading form details', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (formId) {
            loadFormDetails();
        }
    }, [formId]);

    // Question Management Operations
    const handleUpdateQuestion = (idx, updatedQ) => {
        const updated = [...questions];
        updated[idx] = updatedQ;
        setQuestions(updated);
    };

    const handleAddQuestion = (type = 'multiple_choice') => {
        const defaultOptions = ['multiple_choice', 'checkboxes', 'dropdown'].includes(type)
            ? [{ text: 'Option 1' }, { text: 'Option 2' }]
            : [];

        const newQ = {
            questionText: '',
            description: '',
            type,
            options: defaultOptions,
            required: false,
            order: questions.length
        };

        setQuestions([...questions, newQ]);
        setActiveQuestionIdx(questions.length);
    };

    const handleDuplicateQuestion = (idx) => {
        const source = questions[idx];
        const duplicated = {
            ...source,
            _id: undefined,
            questionText: source.questionText ? `${source.questionText} (Copy)` : 'Copy of Question',
            options: Array.isArray(source.options) ? source.options.map((o) => ({ ...o })) : [],
            order: questions.length
        };

        const updated = [...questions];
        updated.splice(idx + 1, 0, duplicated);
        // Re-index orders
        const reindexed = updated.map((q, i) => ({ ...q, order: i }));
        setQuestions(reindexed);
        setActiveQuestionIdx(idx + 1);
        showToast('Question duplicated');
    };

    const handleDeleteQuestion = (idx) => {
        if (questions.length <= 1) {
            showToast('A form must contain at least one question', 'error');
            return;
        }
        const filtered = questions.filter((_, i) => i !== idx);
        const reindexed = filtered.map((q, i) => ({ ...q, order: i }));
        setQuestions(reindexed);
        setActiveQuestionIdx(Math.max(0, idx - 1));
        showToast('Question deleted');
    };

    const handleMoveUp = (idx) => {
        if (idx === 0) return;
        const updated = [...questions];
        const temp = updated[idx - 1];
        updated[idx - 1] = updated[idx];
        updated[idx] = temp;
        const reindexed = updated.map((q, i) => ({ ...q, order: i }));
        setQuestions(reindexed);
        setActiveQuestionIdx(idx - 1);
    };

    const handleMoveDown = (idx) => {
        if (idx === questions.length - 1) return;
        const updated = [...questions];
        const temp = updated[idx + 1];
        updated[idx + 1] = updated[idx];
        updated[idx] = temp;
        const reindexed = updated.map((q, i) => ({ ...q, order: i }));
        setQuestions(reindexed);
        setActiveQuestionIdx(idx + 1);
    };

    // Save questions to backend
    const handleSaveQuestions = async () => {
        // Validation check
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.questionText || !q.questionText.trim()) {
                showToast(`Question #${i + 1} must have a title`, 'error');
                setActiveQuestionIdx(i);
                return;
            }
            if (['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type)) {
                if (!Array.isArray(q.options) || q.options.length < 2) {
                    showToast(`Question #${i + 1} requires at least 2 options`, 'error');
                    setActiveQuestionIdx(i);
                    return;
                }
                for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
                    const opt = q.options[oIdx];
                    const text = typeof opt === 'string' ? opt : opt?.text;
                    if (!text || !text.trim()) {
                        showToast(`Question #${i + 1}: Option ${oIdx + 1} cannot be empty`, 'error');
                        setActiveQuestionIdx(i);
                        return;
                    }
                }
            }
        }

        try {
            setSaving(true);
            // Save form header info (title/description)
            await fetch(`${API_BASE_URL}/api/forms/${formId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: form.title,
                    description: form.description
                })
            });

            // Save question list
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ questions })
            });
            const data = await res.json();
            if (data.success) {
                showToast('All changes saved successfully!');
                if (Array.isArray(data.questions)) {
                    setQuestions(data.questions);
                }
                if (onSaved) onSaved();
            } else {
                showToast(data.message || 'Failed to save questions', 'error');
            }
        } catch (err) {
            console.error('Error saving form questions:', err);
            showToast('Server error while saving form', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Toggle publish
    const handlePublishToggle = async () => {
        try {
            setPublishing(true);
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/publish`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setForm(data.form);
                showToast(`Form is now ${data.form.status.toUpperCase()}`);
                if (onSaved) onSaved();
            } else {
                showToast(data.message || 'Failed to update publish state', 'error');
            }
        } catch (err) {
            console.error('Error publishing form:', err);
            showToast('Server error while updating publish status', 'error');
        } finally {
            setPublishing(false);
        }
    };

    // Save Settings from modal
    const handleSaveSettings = async (settingsPayload) => {
        const res = await fetch(`${API_BASE_URL}/api/forms/${formId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(settingsPayload)
        });
        const data = await res.json();
        if (data.success) {
            setForm(data.form);
            showToast('Form settings updated successfully');
            if (onSaved) onSaved();
        } else {
            throw new Error(data.message || 'Failed to update settings');
        }
    };

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
                <Loader className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
                <p className="text-xs text-gray-500 font-semibold">Loading Form Builder...</p>
            </div>
        );
    }

    if (isPreviewMode) {
        return (
            <FormPreview
                form={form}
                questions={questions}
                onBack={() => setIsPreviewMode(false)}
            />
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-16">
            {/* Floating Toast */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold transition-all animate-in fade-in slide-in-from-bottom-2 ${
                        toast.type === 'error'
                            ? 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    }`}
                >
                    {toast.type === 'error' ? (
                        <AlertCircle className="w-4 h-4" />
                    ) : (
                        <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#18181c] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm sticky top-0 z-20 backdrop-blur-md bg-white/90 dark:bg-[#18181c]/90">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className="p-2 text-gray-500 hover:text-purple-600 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                        title="Back to Forms"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                        <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                form?.status === 'published'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : form?.status === 'closed'
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                        >
                            {form?.status ? form.status.toUpperCase() : 'DRAFT'}
                        </span>
                        <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                            {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Settings Modal Button */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                        title="Form Settings"
                    >
                        <Settings className="w-4 h-4 text-purple-500" />
                        <span className="hidden sm:inline">Settings</span>
                    </button>

                    {/* Preview Button */}
                    <button
                        onClick={() => setIsPreviewMode(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                        title="Preview Form"
                    >
                        <Eye className="w-4 h-4 text-purple-500" />
                        <span className="hidden sm:inline">Preview</span>
                    </button>

                    {/* Save Questions */}
                    <button
                        onClick={handleSaveQuestions}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>

                    {/* Publish / Unpublish Button */}
                    <button
                        onClick={handlePublishToggle}
                        disabled={publishing}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                            form?.status === 'published'
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-600/20'
                        }`}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        {publishing
                            ? 'Updating...'
                            : form?.status === 'published'
                            ? 'Unpublish'
                            : 'Publish Form'}
                    </button>
                </div>
            </div>

            {/* Form Title & Description Card */}
            <div className="bg-white dark:bg-[#18181c] rounded-3xl border-t-8 border-t-purple-600 dark:border-t-purple-500 border border-gray-200 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        {form?.topic || 'General'}
                    </span>
                </div>

                <input
                    type="text"
                    placeholder="Form Title"
                    value={form?.title || ''}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full text-2xl sm:text-3xl font-black bg-transparent border-b border-transparent focus:border-purple-500 text-gray-900 dark:text-white outline-none pb-1 transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />

                <textarea
                    rows={2}
                    placeholder="Form description or instructions for students (optional)"
                    value={form?.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full text-xs text-gray-600 dark:text-gray-400 bg-transparent border-b border-transparent focus:border-purple-500 outline-none transition-colors placeholder:text-gray-400 resize-none"
                />
            </div>

            {/* Questions List */}
            <div className="space-y-4">
                {questions.map((q, idx) => (
                    <FormQuestion
                        key={q._id || idx}
                        question={q}
                        index={idx}
                        totalQuestions={questions.length}
                        isActive={activeQuestionIdx === idx}
                        onSelect={() => setActiveQuestionIdx(idx)}
                        onUpdate={handleUpdateQuestion}
                        onDuplicate={handleDuplicateQuestion}
                        onDelete={handleDeleteQuestion}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                    />
                ))}
            </div>

            {/* Add Question Floating / Bottom Bar */}
            <div className="bg-white dark:bg-[#18181c] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        + Add Question:
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleAddQuestion('short_answer')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-[#222228] hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/5 transition-colors"
                    >
                        <AlignLeft className="w-3.5 h-3.5 text-purple-500" /> Short Answer
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAddQuestion('paragraph')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-[#222228] hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/5 transition-colors"
                    >
                        <FileText className="w-3.5 h-3.5 text-purple-500" /> Paragraph
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAddQuestion('multiple_choice')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-[#222228] hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/5 transition-colors"
                    >
                        <Radio className="w-3.5 h-3.5 text-purple-500" /> Multiple Choice
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAddQuestion('checkboxes')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-[#222228] hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/5 transition-colors"
                    >
                        <CheckSquare className="w-3.5 h-3.5 text-purple-500" /> Checkboxes
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAddQuestion('dropdown')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-[#222228] hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/5 transition-colors"
                    >
                        <ListFilter className="w-3.5 h-3.5 text-purple-500" /> Dropdown
                    </button>
                </div>
            </div>

            {/* Settings Modal */}
            <FormSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                form={form}
                onSave={handleSaveSettings}
            />
        </div>
    );
};

export default FormBuilder;
