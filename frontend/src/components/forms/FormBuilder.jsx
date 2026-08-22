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
    Sparkles,
    Sliders,
    Calendar,
    Clock,
    UploadCloud,
    Trash2,
    MoveRight,
    FolderPlus,
    Share2,
    History,
    Users
} from 'lucide-react';
import FormQuestion from './FormQuestion';
import FormSettingsModal from './FormSettingsModal';
import FormPreview from './FormPreview';
import FormShareModal from './FormShareModal';
import FormAuditLog from './FormAuditLog';

const FormBuilder = ({ formId, roomId, onBack, onSaved }) => {
    const [form, setForm] = useState(null);
    const [sections, setSections] = useState([{ sectionId: 'default', title: 'Section 1', description: '', order: 0 }]);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
                if (Array.isArray(data.form.sections) && data.form.sections.length > 0) {
                    setSections(data.form.sections);
                } else {
                    setSections([{ sectionId: 'default', title: 'Section 1', description: '', order: 0 }]);
                }

                if (Array.isArray(data.questions) && data.questions.length > 0) {
                    setQuestions(
                        data.questions.map((q, idx) => ({
                            _id: q._id,
                            sectionId: q.sectionId || 'default',
                            imageUrl: q.imageUrl || '',
                            questionText: q.questionText || '',
                            description: q.description || '',
                            type: q.type || 'short_answer',
                            options:
                                Array.isArray(q.options) && q.options.length > 0
                                    ? q.options
                                    : ['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type)
                                    ? [{ text: 'Option 1' }, { text: 'Option 2' }]
                                    : [],
                            scaleConfig: q.scaleConfig || (q.type === 'linear_scale' ? { min: 1, max: 5, minLabel: '', maxLabel: '' } : undefined),
                            fileUploadConfig: q.fileUploadConfig || (q.type === 'file_upload' ? { maxFileSizeMB: 10, allowedTypes: ['all'] } : undefined),
                            validation: q.validation || { enabled: false, ruleType: 'none', value: null, customError: '' },
                            marks: q.marks !== undefined ? q.marks : 1,
                            correctAnswer: q.correctAnswer || '',
                            correctAnswers: q.correctAnswers || [],
                            required: !!q.required,
                            order: q.order !== undefined ? q.order : idx
                        }))
                    );
                } else {
                    // Default first question
                    setQuestions([
                        {
                            questionText: 'Untitled Question',
                            sectionId: 'default',
                            description: '',
                            type: 'multiple_choice',
                            options: [{ text: 'Option 1' }, { text: 'Option 2' }],
                            marks: 1,
                            correctAnswer: '',
                            correctAnswers: [],
                            required: false,
                            order: 0
                        }
                    ]);
                }
                setHasUnsavedChanges(false);
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
        setHasUnsavedChanges(true);
    };

    const handleAddQuestion = (type = 'multiple_choice', targetSectionId = null) => {
        const defaultOptions = ['multiple_choice', 'checkboxes', 'dropdown'].includes(type)
            ? [{ text: 'Option 1' }, { text: 'Option 2' }]
            : [];

        const secId = targetSectionId || sections[0]?.sectionId || 'default';

        const newQ = {
            questionText: '',
            sectionId: secId,
            description: '',
            type,
            options: defaultOptions,
            scaleConfig: type === 'linear_scale' ? { min: 1, max: 5, minLabel: '', maxLabel: '' } : undefined,
            fileUploadConfig: type === 'file_upload' ? { maxFileSizeMB: 10, allowedTypes: ['all'] } : undefined,
            validation: { enabled: false, ruleType: 'none', value: null, customError: '' },
            marks: 1,
            correctAnswer: '',
            correctAnswers: [],
            required: false,
            order: questions.length
        };

        setQuestions([...questions, newQ]);
        setActiveQuestionIdx(questions.length);
        setHasUnsavedChanges(true);
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
        const reindexed = updated.map((q, i) => ({ ...q, order: i }));
        setQuestions(reindexed);
        setActiveQuestionIdx(idx + 1);
        setHasUnsavedChanges(true);
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
        setHasUnsavedChanges(true);
        showToast('Question deleted');
    };

    const handleMoveQuestion = (idx, direction) => {
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= questions.length) return;

        const updated = [...questions];
        const [moved] = updated.splice(idx, 1);
        updated.splice(targetIdx, 0, moved);

        const reindexed = updated.map((q, i) => ({ ...q, order: i }));
        setQuestions(reindexed);
        setActiveQuestionIdx(targetIdx);
        setHasUnsavedChanges(true);
    };

    // Section Management
    const handleAddSection = () => {
        const newSecId = `sec_${Date.now()}`;
        const newSections = [
            ...sections,
            { sectionId: newSecId, title: `Section ${sections.length + 1}`, description: '', order: sections.length }
        ];
        setSections(newSections);
        setHasUnsavedChanges(true);
        showToast('New section added');
    };

    const handleUpdateSection = (sIdx, field, val) => {
        const updated = [...sections];
        updated[sIdx] = { ...updated[sIdx], [field]: val };
        setSections(updated);
        setHasUnsavedChanges(true);
    };

    const handleDeleteSection = (sIdx) => {
        if (sections.length <= 1) {
            showToast('A form must have at least one section', 'error');
            return;
        }
        const deletingId = sections[sIdx].sectionId;
        const remaining = sections.filter((_, idx) => idx !== sIdx);
        const reindexed = remaining.map((s, idx) => ({ ...s, order: idx }));
        setSections(reindexed);

        // Reassign orphaned questions to first section
        const targetFallback = reindexed[0].sectionId;
        const updatedQuestions = questions.map((q) =>
            q.sectionId === deletingId ? { ...q, sectionId: targetFallback } : q
        );
        setQuestions(updatedQuestions);
        setHasUnsavedChanges(true);
        showToast('Section deleted');
    };

    // Save Form & Questions to Backend
    const handleSaveForm = async () => {
        try {
            setSaving(true);

            // 1. Update form details & sections
            await fetch(`${API_BASE_URL}/api/forms/${formId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: form?.title,
                    description: form?.description,
                    topic: form?.topic,
                    sections
                })
            });

            // 2. Save questions
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ questions })
            });

            const data = await res.json();
            if (data.success) {
                setHasUnsavedChanges(false);
                showToast('Form and questions saved successfully!');
                if (onSaved) onSaved();
            } else {
                showToast(data.message || 'Failed to save questions', 'error');
            }
        } catch (err) {
            console.error('Error saving form:', err);
            showToast('Network error while saving form', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Publish / Unpublish Toggle
    const handleTogglePublish = async () => {
        try {
            setPublishing(true);
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/publish`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setForm(data.form);
                showToast(
                    data.form.status === 'published' ? 'Form published! Students can now submit.' : 'Form switched to draft mode.'
                );
            } else {
                showToast(data.message || 'Failed to update publish state', 'error');
            }
        } catch (err) {
            console.error('Error toggling publish:', err);
            showToast('Network error updating publish status', 'error');
        } finally {
            setPublishing(false);
        }
    };

    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

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
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold animate-in slide-in-from-bottom-5 duration-200 ${
                        toast.type === 'error'
                            ? 'bg-red-500 text-white border-red-600'
                            : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-800'
                    }`}
                >
                    {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Top Toolbar */}
            <div className="sticky top-2 z-40 bg-white/80 dark:bg-[#18181c]/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        title="Back to Forms"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-xs sm:max-w-sm">
                                {form?.title || 'Untitled Form'}
                            </h2>
                            {hasUnsavedChanges && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    Unsaved Changes
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-400">
                            {questions.length} questions • Total Marks: <span className="font-bold text-purple-600">{totalMarks}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Share & Access Button */}
                    <button
                        type="button"
                        onClick={() => setIsShareOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 rounded-xl text-xs font-bold transition-all"
                    >
                        <Share2 className="w-3.5 h-3.5" /> Share & Access
                    </button>

                    {/* Audit Log Button */}
                    <button
                        type="button"
                        onClick={() => setIsAuditLogOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
                    >
                        <History className="w-3.5 h-3.5 text-purple-500" /> Audit Trail
                    </button>

                    {/* Preview Button */}
                    <button
                        type="button"
                        onClick={() => setIsPreviewMode(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
                    >
                        <Eye className="w-3.5 h-3.5 text-purple-500" /> Preview
                    </button>

                    {/* Settings Button */}
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
                    >
                        <Settings className="w-3.5 h-3.5 text-purple-500" /> Settings
                    </button>

                    {/* Save Button */}
                    <button
                        type="button"
                        onClick={handleSaveForm}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all"
                    >
                        {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Form
                    </button>

                    {/* Publish / Status Toggle */}
                    <button
                        type="button"
                        onClick={handleTogglePublish}
                        disabled={publishing}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                            form?.status === 'published'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:text-purple-600'
                        }`}
                    >
                        {publishing ? (
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                        ) : form?.status === 'published' ? (
                            <Globe className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                            <Lock className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        {form?.status === 'published' ? 'Published' : 'Draft'}
                    </button>
                </div>
            </div>

            {/* Form Title & Description Card */}
            <div className="bg-white dark:bg-[#18181c] rounded-3xl border-t-8 border-t-purple-600 dark:border-t-purple-500 border border-gray-200 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-4">
                <input
                    type="text"
                    placeholder="Form Title"
                    value={form?.title || ''}
                    onChange={(e) => {
                        setForm({ ...form, title: e.target.value });
                        setHasUnsavedChanges(true);
                    }}
                    className="w-full text-2xl sm:text-3xl font-black text-gray-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-purple-500 pb-1 placeholder:text-gray-400"
                />
                <textarea
                    rows={2}
                    placeholder="Form description or instructions for students..."
                    value={form?.description || ''}
                    onChange={(e) => {
                        setForm({ ...form, description: e.target.value });
                        setHasUnsavedChanges(true);
                    }}
                    className="w-full text-xs sm:text-sm text-gray-600 dark:text-gray-300 bg-transparent outline-none border-b border-transparent focus:border-purple-500 pb-1 placeholder:text-gray-400 resize-none"
                />
            </div>

            {/* Sections & Questions */}
            {sections.map((section, sIdx) => {
                const sectionQuestions = questions.filter(
                    (q) => q.sectionId === section.sectionId || (sIdx === 0 && (!q.sectionId || q.sectionId === 'default'))
                );

                return (
                    <div key={section.sectionId || sIdx} className="space-y-4">
                        {/* Section Header Card */}
                        <div className="p-4 bg-purple-50/70 dark:bg-purple-500/5 rounded-2xl border border-purple-200 dark:border-purple-500/20 flex items-center justify-between gap-4">
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-black uppercase">
                                        Section {sIdx + 1} of {sections.length}
                                    </span>
                                    <input
                                        type="text"
                                        value={section.title || ''}
                                        onChange={(e) => handleUpdateSection(sIdx, 'title', e.target.value)}
                                        className="bg-transparent font-bold text-sm text-gray-900 dark:text-white outline-none border-b border-transparent focus:border-purple-500"
                                        placeholder="Section Title"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={section.description || ''}
                                    onChange={(e) => handleUpdateSection(sIdx, 'description', e.target.value)}
                                    className="bg-transparent text-xs text-gray-500 dark:text-gray-400 outline-none w-full placeholder:text-gray-400"
                                    placeholder="Section description (optional)"
                                />
                            </div>

                            {sections.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteSection(sIdx)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white dark:hover:bg-white/5 transition-colors"
                                    title="Delete Section"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Questions in this section */}
                        {questions.map((question, qIdx) => {
                            const isMatch =
                                question.sectionId === section.sectionId ||
                                (sIdx === 0 && (!question.sectionId || question.sectionId === 'default'));

                            if (!isMatch) return null;

                            return (
                                <FormQuestion
                                    key={question._id || qIdx}
                                    question={question}
                                    index={qIdx}
                                    totalQuestions={questions.length}
                                    sections={sections}
                                    isActive={activeQuestionIdx === qIdx}
                                    onSelect={() => setActiveQuestionIdx(qIdx)}
                                    onUpdate={handleUpdateQuestion}
                                    onDuplicate={handleDuplicateQuestion}
                                    onDelete={handleDeleteQuestion}
                                    onMoveUp={(i) => handleMoveQuestion(i, 'up')}
                                    onMoveDown={(i) => handleMoveQuestion(i, 'down')}
                                />
                            );
                        })}
                    </div>
                );
            })}

            {/* Add Action Bar (Floating / Bottom) */}
            <div className="bg-white dark:bg-[#18181c] rounded-2xl border border-gray-200 dark:border-white/10 p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Quick Add:</span>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleAddQuestion('multiple_choice')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-gray-700 dark:text-gray-300 hover:text-purple-600 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 transition-all"
                    >
                        <Radio className="w-3.5 h-3.5 text-purple-500" /> Multiple Choice
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAddQuestion('checkboxes')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-gray-700 dark:text-gray-300 hover:text-purple-600 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 transition-all"
                    >
                        <CheckSquare className="w-3.5 h-3.5 text-purple-500" /> Checkboxes
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAddQuestion('short_answer')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-gray-700 dark:text-gray-300 hover:text-purple-600 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 transition-all"
                    >
                        <AlignLeft className="w-3.5 h-3.5 text-purple-500" /> Short Text
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAddQuestion('linear_scale')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-gray-700 dark:text-gray-300 hover:text-purple-600 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 transition-all"
                    >
                        <Sliders className="w-3.5 h-3.5 text-purple-500" /> Linear Scale
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAddQuestion('date')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-gray-700 dark:text-gray-300 hover:text-purple-600 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 transition-all"
                    >
                        <Calendar className="w-3.5 h-3.5 text-purple-500" /> Date
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAddQuestion('time')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-gray-700 dark:text-gray-300 hover:text-purple-600 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 transition-all"
                    >
                        <Clock className="w-3.5 h-3.5 text-purple-500" /> Time
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAddQuestion('file_upload')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-gray-700 dark:text-gray-300 hover:text-purple-600 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 transition-all"
                    >
                        <UploadCloud className="w-3.5 h-3.5 text-purple-500" /> File Upload
                    </button>

                    <button
                        type="button"
                        onClick={handleAddSection}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-100 rounded-xl text-xs font-bold border border-purple-200 dark:border-purple-500/20 transition-all"
                    >
                        <FolderPlus className="w-3.5 h-3.5" /> Add Section
                    </button>
                </div>
            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <FormSettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    form={form}
                    onSave={async (updatedSettings) => {
                        const res = await fetch(`${API_BASE_URL}/api/forms/${formId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify(updatedSettings)
                        });
                        const data = await res.json();
                        if (data.success) {
                            setForm(data.form);
                            showToast('Settings saved successfully');
                        } else {
                            throw new Error(data.message || 'Failed to save settings');
                        }
                    }}
                />
            )}

            {/* Share & Collaborators Modal */}
            {isShareOpen && (
                <FormShareModal
                    isOpen={isShareOpen}
                    onClose={() => setIsShareOpen(false)}
                    form={form}
                    roomId={roomId}
                    onUpdateForm={(updatedForm) => setForm(updatedForm)}
                />
            )}

            {/* Audit Log Modal */}
            {isAuditLogOpen && (
                <FormAuditLog
                    isOpen={isAuditLogOpen}
                    onClose={() => setIsAuditLogOpen(false)}
                    formId={formId}
                    formTitle={form?.title}
                />
            )}
        </div>
    );
};

export default FormBuilder;
