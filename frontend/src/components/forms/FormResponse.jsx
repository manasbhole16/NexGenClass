import React, { useState, useEffect, useRef } from 'react';
import API_BASE_URL from '../../apiConfig';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    AlertCircle,
    Mail,
    Send,
    Edit3,
    CheckSquare,
    Radio,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Loader,
    Lock,
    Calendar,
    RotateCcw,
    Award,
    Star,
    Save,
    Printer,
    UploadCloud,
    File,
    X,
    Sliders,
    HelpCircle,
    Info,
    ShieldCheck
} from 'lucide-react';

const FormResponse = ({ formId, roomId, onBack }) => {
    const [form, setForm] = useState(null);
    const [sections, setSections] = useState([]);
    const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [existingResponse, setExistingResponse] = useState(null);
    const [studentResult, setStudentResult] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [lastSavedDraftAt, setLastSavedDraftAt] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedInfo, setSubmittedInfo] = useState(null);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState({});

    const autosaveTimerRef = useRef(null);

    // Load form details, questions, and existing draft / response
    const loadFormData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch form & questions
            const formRes = await fetch(`${API_BASE_URL}/api/forms/${formId}`, { credentials: 'include' });
            const formData = await formRes.json();

            if (!formData.success) {
                setError(formData.message || 'Could not load form');
                setLoading(false);
                return;
            }

            setForm(formData.form);
            const formSections =
                Array.isArray(formData.form.sections) && formData.form.sections.length > 0
                    ? formData.form.sections
                    : [{ sectionId: 'default', title: 'Section 1', description: '', order: 0 }];
            setSections(formSections);
            setQuestions(formData.questions || []);

            // 2. Fetch student's existing submitted response (if any)
            const respRes = await fetch(`${API_BASE_URL}/api/forms/${formId}/my-response`, { credentials: 'include' });
            const respData = await respRes.json();

            if (respData.success && respData.response) {
                setExistingResponse(respData.response);

                // Populate submitted answers
                const initialAnswers = {};
                (respData.response.answers || []).forEach((a) => {
                    initialAnswers[a.questionId] = {
                        textAnswer: a.textAnswer || '',
                        selectedOption: a.selectedOption || '',
                        selectedOptions: a.selectedOptions || [],
                        scaleValue: a.scaleValue !== undefined ? a.scaleValue : null,
                        dateAnswer: a.dateAnswer || '',
                        timeAnswer: a.timeAnswer || '',
                        fileAnswer: a.fileAnswer || null
                    };
                });
                setAnswers(initialAnswers);

                // Fetch score result
                try {
                    const resultRes = await fetch(
                        `${API_BASE_URL}/api/forms/${formId}/responses/${respData.response._id}/result`,
                        { credentials: 'include' }
                    );
                    const resultData = await resultRes.json();
                    if (resultData.success) {
                        setStudentResult(resultData);
                    }
                } catch (e) {
                    console.error('Error fetching score result:', e);
                }

                // If one response limit and editing disabled, show confirmation view
                if (formData.form.limitOneResponse && !formData.form.allowResponseEditing) {
                    setIsSubmitted(true);
                    setSubmittedInfo({
                        responseId: respData.response._id,
                        submittedAt: respData.response.submittedAt,
                        score: respData.response.score,
                        totalMarks: respData.response.totalMarks,
                        percentage: respData.response.percentage,
                        gradingStatus: respData.response.gradingStatus
                    });
                }
            } else {
                // Check if student has an active saved draft
                const draftRes = await fetch(`${API_BASE_URL}/api/forms/${formId}/draft`, { credentials: 'include' });
                const draftData = await draftRes.json();
                if (draftData.success && draftData.draft) {
                    const draftAnswers = {};
                    (draftData.draft.answers || []).forEach((a) => {
                        draftAnswers[a.questionId] = {
                            textAnswer: a.textAnswer || '',
                            selectedOption: a.selectedOption || '',
                            selectedOptions: a.selectedOptions || [],
                            scaleValue: a.scaleValue !== undefined ? a.scaleValue : null,
                            dateAnswer: a.dateAnswer || '',
                            timeAnswer: a.timeAnswer || '',
                            fileAnswer: a.fileAnswer || null
                        };
                    });
                    setAnswers(draftAnswers);
                    setLastSavedDraftAt(draftData.draft.draftSavedAt || draftData.draft.updatedAt);
                }
            }
        } catch (err) {
            console.error('Error loading form response data:', err);
            setError('Network error loading form details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (formId) {
            loadFormData();
        }
    }, [formId]);

    // Answer change handler with debounced draft autosave
    const handleAnswerChange = (qId, field, value) => {
        setAnswers((prev) => {
            const current = prev[qId] || {
                textAnswer: '',
                selectedOption: '',
                selectedOptions: [],
                scaleValue: null,
                dateAnswer: '',
                timeAnswer: '',
                fileAnswer: null
            };
            const updated = {
                ...prev,
                [qId]: { ...current, [field]: value }
            };

            // Trigger debounced autosave if draft saving allowed
            if (form?.allowDraftSaving !== false && !isSubmitted) {
                if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = setTimeout(() => {
                    handleAutoSaveDraft(updated);
                }, 3000);
            }

            return updated;
        });

        if (validationErrors[qId]) {
            setValidationErrors((prev) => {
                const next = { ...prev };
                delete next[qId];
                return next;
            });
        }
    };

    const handleCheckboxToggle = (qId, optionText) => {
        setAnswers((prev) => {
            const current = prev[qId] || {
                textAnswer: '',
                selectedOption: '',
                selectedOptions: [],
                scaleValue: null,
                dateAnswer: '',
                timeAnswer: '',
                fileAnswer: null
            };
            const existingOptions = current.selectedOptions || [];
            const exists = existingOptions.includes(optionText);
            const updatedList = exists
                ? existingOptions.filter((o) => o !== optionText)
                : [...existingOptions, optionText];

            const updated = {
                ...prev,
                [qId]: { ...current, selectedOptions: updatedList }
            };

            if (form?.allowDraftSaving !== false && !isSubmitted) {
                if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = setTimeout(() => {
                    handleAutoSaveDraft(updated);
                }, 3000);
            }

            return updated;
        });

        if (validationErrors[qId]) {
            setValidationErrors((prev) => {
                const next = { ...prev };
                delete next[qId];
                return next;
            });
        }
    };

    // File Upload Handler for File Upload questions
    const handleFileUpload = async (qId, file) => {
        if (!file) return;
        try {
            setUploadingFiles((prev) => ({ ...prev, [qId]: true }));
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            const data = await res.json();
            if (data.success && data.file) {
                handleAnswerChange(qId, 'fileAnswer', data.file);
            } else {
                setValidationErrors((prev) => ({ ...prev, [qId]: data.message || 'File upload failed' }));
            }
        } catch (err) {
            console.error('File upload error:', err);
            setValidationErrors((prev) => ({ ...prev, [qId]: 'Upload network error' }));
        } finally {
            setUploadingFiles((prev) => ({ ...prev, [qId]: false }));
        }
    };

    // Auto-save draft action
    const handleAutoSaveDraft = async (currentAnswersState) => {
        try {
            const formattedAnswers = Object.entries(currentAnswersState || answers).map(([qId, ans]) => ({
                questionId: qId,
                textAnswer: ans.textAnswer || '',
                selectedOption: ans.selectedOption || '',
                selectedOptions: ans.selectedOptions || [],
                scaleValue: ans.scaleValue !== undefined ? ans.scaleValue : null,
                dateAnswer: ans.dateAnswer || '',
                timeAnswer: ans.timeAnswer || '',
                fileAnswer: ans.fileAnswer || null
            }));

            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/draft`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ answers: formattedAnswers })
            });
            const data = await res.json();
            if (data.success) {
                setLastSavedDraftAt(new Date());
            }
        } catch (err) {
            console.error('Draft autosave error:', err);
        }
    };

    // Manual Save Draft Button
    const handleManualSaveDraft = async () => {
        setSavingDraft(true);
        await handleAutoSaveDraft(answers);
        setSavingDraft(false);
    };

    // Validate current section before moving Next
    const validateCurrentSection = () => {
        const currentSection = sections[currentSectionIdx];
        const currentSectionQuestions = questions.filter(
            (q) =>
                q.sectionId === currentSection.sectionId ||
                (currentSectionIdx === 0 && (!q.sectionId || q.sectionId === 'default'))
        );

        const errors = {};
        for (const q of currentSectionQuestions) {
            const ans = answers[q._id] || {};

            if (q.required) {
                if (['short_answer', 'paragraph'].includes(q.type) && !ans.textAnswer?.trim()) {
                    errors[q._id] = 'This question is required.';
                } else if (['multiple_choice', 'dropdown'].includes(q.type) && !ans.selectedOption?.trim()) {
                    errors[q._id] = 'Please select an option.';
                } else if (q.type === 'checkboxes' && (!ans.selectedOptions || ans.selectedOptions.length === 0)) {
                    errors[q._id] = 'Please select at least one option.';
                } else if (q.type === 'linear_scale' && (ans.scaleValue === null || ans.scaleValue === undefined)) {
                    errors[q._id] = 'Please select a rating.';
                } else if (q.type === 'date' && !ans.dateAnswer?.trim()) {
                    errors[q._id] = 'Please select a date.';
                } else if (q.type === 'time' && !ans.timeAnswer?.trim()) {
                    errors[q._id] = 'Please select a time.';
                } else if (q.type === 'file_upload' && (!ans.fileAnswer || !ans.fileAnswer.fileUrl)) {
                    errors[q._id] = 'Please upload a required file.';
                }
            }

            // Custom validation rules
            if (q.validation && q.validation.enabled && q.validation.ruleType && q.validation.ruleType !== 'none') {
                const rule = q.validation;
                const customMsg = rule.customError;
                if (['short_answer', 'paragraph'].includes(q.type) && ans.textAnswer) {
                    if (rule.ruleType === 'min_length' && ans.textAnswer.length < Number(rule.value)) {
                        errors[q._id] = customMsg || `Minimum ${rule.value} characters required.`;
                    }
                    if (rule.ruleType === 'max_length' && ans.textAnswer.length > Number(rule.value)) {
                        errors[q._id] = customMsg || `Maximum ${rule.value} characters allowed.`;
                    }
                    if (rule.ruleType === 'regex') {
                        try {
                            if (!new RegExp(rule.value).test(ans.textAnswer)) {
                                errors[q._id] = customMsg || 'Input does not match the required pattern.';
                            }
                        } catch (e) {}
                    }
                }
                if (q.type === 'checkboxes' && ans.selectedOptions?.length > 0) {
                    if (rule.ruleType === 'min_select' && ans.selectedOptions.length < Number(rule.value)) {
                        errors[q._id] = customMsg || `Select at least ${rule.value} options.`;
                    }
                    if (rule.ruleType === 'max_select' && ans.selectedOptions.length > Number(rule.value)) {
                        errors[q._id] = customMsg || `Select at most ${rule.value} options.`;
                    }
                    if (rule.ruleType === 'exact_select' && ans.selectedOptions.length !== Number(rule.value)) {
                        errors[q._id] = customMsg || `Select exactly ${rule.value} options.`;
                    }
                }
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNextSection = () => {
        if (validateCurrentSection()) {
            setCurrentSectionIdx((prev) => Math.min(sections.length - 1, prev + 1));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevSection = () => {
        setCurrentSectionIdx((prev) => Math.max(0, prev - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Final Submit Action
    const handleSubmit = async () => {
        if (!validateCurrentSection()) return;

        try {
            setSubmitting(true);
            setError(null);

            const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
                questionId: qId,
                textAnswer: ans.textAnswer || '',
                selectedOption: ans.selectedOption || '',
                selectedOptions: ans.selectedOptions || [],
                scaleValue: ans.scaleValue !== undefined ? ans.scaleValue : null,
                dateAnswer: ans.dateAnswer || '',
                timeAnswer: ans.timeAnswer || '',
                fileAnswer: ans.fileAnswer || null
            }));

            let url = `${API_BASE_URL}/api/forms/${formId}/responses`;
            let method = 'POST';

            if (existingResponse && form.allowResponseEditing) {
                url = `${API_BASE_URL}/api/forms/${formId}/responses/${existingResponse._id}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ answers: formattedAnswers })
            });

            const data = await res.json();
            if (data.success) {
                setIsSubmitted(true);
                setShowConfirmModal(false);
                setSubmittedInfo({
                    responseId: data.response?._id,
                    submittedAt: data.response?.submittedAt || new Date(),
                    score: data.score,
                    percentage: data.percentage,
                    totalMarks: data.totalMarks,
                    confirmationMessage: data.confirmationMessage || form.confirmationMessage
                });

                // Fetch score result if immediately available
                if (data.response?._id) {
                    try {
                        const resultRes = await fetch(
                            `${API_BASE_URL}/api/forms/${formId}/responses/${data.response._id}/result`,
                            { credentials: 'include' }
                        );
                        const resultData = await resultRes.json();
                        if (resultData.success) {
                            setStudentResult(resultData);
                        }
                    } catch (e) {}
                }
            } else {
                setError(data.message || 'Failed to submit response.');
                setShowConfirmModal(false);
            }
        } catch (err) {
            console.error('Error submitting response:', err);
            setError('Network error while submitting response.');
            setShowConfirmModal(false);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
                <Loader className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
                <p className="text-xs text-gray-500 font-semibold">Loading Form...</p>
            </div>
        );
    }

    if (error && !form) {
        return (
            <div className="max-w-xl mx-auto text-center py-16 space-y-4 bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 p-8 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Unable to Open Form</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{error}</p>
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
                >
                    Back to Forms
                </button>
            </div>
        );
    }

    // Confirmation & Receipt View
    if (isSubmitted) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 pb-16">
                <div className="bg-white dark:bg-[#18181c] rounded-3xl border-t-8 border-t-emerald-600 border border-gray-200 dark:border-white/10 p-8 shadow-sm text-center space-y-5">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>

                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                            {form?.title || 'Form Submission'}
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                            {submittedInfo?.confirmationMessage || form?.confirmationMessage || 'Your response has been recorded.'}
                        </p>
                    </div>

                    {/* Metadata Pill */}
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300">
                        <span>Submitted on: <strong>{new Date(submittedInfo?.submittedAt || Date.now()).toLocaleString()}</strong></span>
                        <span>•</span>
                        <span>ID: <code className="font-mono text-[11px] text-purple-600">{submittedInfo?.responseId || existingResponse?._id || 'N/A'}</code></span>
                    </div>

                    {/* Scorecard if results released */}
                    {studentResult?.resultsReleased && studentResult?.score !== undefined && (
                        <div className="p-5 bg-purple-50/70 dark:bg-purple-500/10 rounded-2xl border border-purple-200 dark:border-purple-500/20 max-w-md mx-auto space-y-2">
                            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Assessment Score</span>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="text-3xl font-black text-purple-700 dark:text-purple-300">
                                    {studentResult.score}
                                </span>
                                <span className="text-base font-bold text-gray-400">
                                    / {studentResult.totalMarks} ({studentResult.percentage}%)
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Printable Receipt Layout */}
                    <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-bold shadow hover:bg-gray-800 transition-all"
                        >
                            <Printer className="w-4 h-4" /> Print / Download Receipt
                        </button>

                        {form?.allowResponseEditing && (
                            <button
                                type="button"
                                onClick={() => setIsSubmitted(false)}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold border border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 transition-all"
                            >
                                <Edit3 className="w-4 h-4" /> Edit Response
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onBack}
                            className="px-4 py-2.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                        >
                            Back to Classroom
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentSection = sections[currentSectionIdx] || sections[0];
    const currentSectionQuestions = questions.filter(
        (q) =>
            q.sectionId === currentSection?.sectionId ||
            (currentSectionIdx === 0 && (!q.sectionId || q.sectionId === 'default'))
    );

    const progressPercent = sections.length > 0 ? Math.round(((currentSectionIdx + 1) / sections.length) * 100) : 100;

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {/* Top Navigation & Draft Status */}
            <div className="flex items-center justify-between gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-purple-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Forms
                </button>

                {form?.allowDraftSaving !== false && (
                    <div className="flex items-center gap-2.5">
                        {lastSavedDraftAt && (
                            <span className="text-[11px] text-gray-400">
                                Draft saved {new Date(lastSavedDraftAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleManualSaveDraft}
                            disabled={savingDraft}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
                        >
                            {savingDraft ? <Loader className="w-3.5 h-3.5 animate-spin text-purple-600" /> : <Save className="w-3.5 h-3.5 text-purple-500" />}
                            Save Draft
                        </button>
                    </div>
                )}
            </div>

            {/* Progress Bar (if enabled) */}
            {form?.showProgressBar !== false && sections.length > 1 && (
                <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400">
                        <span>Section {currentSectionIdx + 1} of {sections.length}: {currentSection?.title}</span>
                        <span>{progressPercent}% Complete</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-purple-600 dark:bg-purple-500 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Form Header Card (Only visible on section 1) */}
            {currentSectionIdx === 0 && (
                <div className="bg-white dark:bg-[#18181c] rounded-3xl border-t-8 border-t-purple-600 dark:border-t-purple-500 border border-gray-200 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                {form?.topic || 'General'}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                            {form?.title || 'Form'}
                        </h1>
                        {form?.description && (
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {form.description}
                            </p>
                        )}
                    </div>

                    {form?.collectEmail && (
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400">
                            <Mail className="w-4 h-4 text-purple-500" />
                            <span>Your email will be automatically attached to this submission.</span>
                        </div>
                    )}

                    <div className="text-xs text-red-500 font-semibold pt-1">
                        * Indicates required question
                    </div>
                </div>
            )}

            {/* Current Section Description Card (if beyond section 1) */}
            {currentSectionIdx > 0 && (
                <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 p-6 shadow-sm space-y-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-600 text-white">
                        Section {currentSectionIdx + 1}
                    </span>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentSection?.title}</h2>
                    {currentSection?.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{currentSection.description}</p>
                    )}
                </div>
            )}

            {/* Questions in Current Section */}
            {currentSectionQuestions.map((q, idx) => {
                const ans = answers[q._id] || {};
                const hasError = !!validationErrors[q._id];

                return (
                    <div
                        key={q._id || idx}
                        className={`bg-white dark:bg-[#18181c] rounded-3xl border p-6 sm:p-7 shadow-sm space-y-4 transition-all ${
                            hasError
                                ? 'border-red-500/50 ring-1 ring-red-500/20'
                                : 'border-gray-200 dark:border-white/10'
                        }`}
                    >
                        {/* Question Title & Description */}
                        <div>
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {q.questionText} {q.required && <span className="text-red-500 font-bold">*</span>}
                                </span>
                                {q.marks !== undefined && q.marks > 0 && (
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex-shrink-0">
                                        {q.marks} {q.marks === 1 ? 'pt' : 'pts'}
                                    </span>
                                )}
                            </div>
                            {q.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                                    {q.description}
                                </p>
                            )}
                            {q.imageUrl && (
                                <div className="mt-3 max-w-sm rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
                                    <img src={q.imageUrl} alt="Question prompt visual" className="w-full h-auto max-h-56 object-contain bg-black/5" />
                                </div>
                            )}
                        </div>

                        {/* Question Answer Inputs */}
                        <div className="pt-2">
                            {/* Short Answer */}
                            {q.type === 'short_answer' && (
                                <input
                                    type="text"
                                    placeholder="Your answer"
                                    value={ans.textAnswer || ''}
                                    onChange={(e) => handleAnswerChange(q._id, 'textAnswer', e.target.value)}
                                    className="w-full sm:w-3/4 px-3.5 py-2.5 bg-gray-50 dark:bg-[#222228] border-b-2 border-gray-300 dark:border-white/20 focus:border-purple-500 outline-none text-xs text-gray-900 dark:text-white rounded-t-lg transition-colors placeholder:text-gray-400"
                                />
                            )}

                            {/* Paragraph */}
                            {q.type === 'paragraph' && (
                                <textarea
                                    rows={3}
                                    placeholder="Your answer"
                                    value={ans.textAnswer || ''}
                                    onChange={(e) => handleAnswerChange(q._id, 'textAnswer', e.target.value)}
                                    className="w-full p-3.5 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl focus:border-purple-500 outline-none text-xs text-gray-900 dark:text-white transition-colors placeholder:text-gray-400 resize-none"
                                />
                            )}

                            {/* Multiple Choice */}
                            {q.type === 'multiple_choice' && (
                                <div className="space-y-2.5">
                                    {(q.options || []).map((opt, optIdx) => {
                                        const optText = typeof opt === 'string' ? opt : opt.text;
                                        const isSelected = ans.selectedOption === optText;

                                        return (
                                            <label
                                                key={optIdx}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'bg-purple-50/60 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-200 font-semibold'
                                                        : 'bg-gray-50/50 dark:bg-[#222228]/50 border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.03] text-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q_${q._id}`}
                                                    checked={isSelected}
                                                    onChange={() => handleAnswerChange(q._id, 'selectedOption', optText)}
                                                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="text-xs">{optText}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Checkboxes */}
                            {q.type === 'checkboxes' && (
                                <div className="space-y-2.5">
                                    {(q.options || []).map((opt, optIdx) => {
                                        const optText = typeof opt === 'string' ? opt : opt.text;
                                        const isSelected = (ans.selectedOptions || []).includes(optText);

                                        return (
                                            <label
                                                key={optIdx}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'bg-purple-50/60 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-200 font-semibold'
                                                        : 'bg-gray-50/50 dark:bg-[#222228]/50 border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.03] text-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleCheckboxToggle(q._id, optText)}
                                                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                                />
                                                <span className="text-xs">{optText}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Dropdown */}
                            {q.type === 'dropdown' && (
                                <div className="relative w-full sm:w-3/4">
                                    <select
                                        value={ans.selectedOption || ''}
                                        onChange={(e) => handleAnswerChange(q._id, 'selectedOption', e.target.value)}
                                        className="w-full appearance-none px-4 py-3 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500 transition-colors cursor-pointer"
                                    >
                                        <option value="">Choose an option...</option>
                                        {(q.options || []).map((opt, optIdx) => {
                                            const optText = typeof opt === 'string' ? opt : opt.text;
                                            return (
                                                <option key={optIdx} value={optText}>
                                                    {optText}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            )}

                            {/* Linear Scale */}
                            {q.type === 'linear_scale' && (
                                <div className="space-y-3 pt-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
                                        <span>{q.scaleConfig?.minLabel || `Rating ${q.scaleConfig?.min || 1}`}</span>
                                        <span>{q.scaleConfig?.maxLabel || `Rating ${q.scaleConfig?.max || 5}`}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1 sm:gap-2 flex-wrap">
                                        {Array.from(
                                            { length: (q.scaleConfig?.max || 5) - (q.scaleConfig?.min || 1) + 1 },
                                            (_, i) => (q.scaleConfig?.min || 1) + i
                                        ).map((val) => {
                                            const isSelected = ans.scaleValue === val;
                                            return (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => handleAnswerChange(q._id, 'scaleValue', val)}
                                                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl text-xs sm:text-sm font-bold border transition-all ${
                                                        isSelected
                                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/30'
                                                            : 'bg-gray-50 dark:bg-[#222228] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-purple-400'
                                                    }`}
                                                >
                                                    {val}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Date */}
                            {q.type === 'date' && (
                                <input
                                    type="date"
                                    value={ans.dateAnswer || ''}
                                    onChange={(e) => handleAnswerChange(q._id, 'dateAnswer', e.target.value)}
                                    className="px-4 py-2.5 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                                />
                            )}

                            {/* Time */}
                            {q.type === 'time' && (
                                <input
                                    type="time"
                                    value={ans.timeAnswer || ''}
                                    onChange={(e) => handleAnswerChange(q._id, 'timeAnswer', e.target.value)}
                                    className="px-4 py-2.5 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                                />
                            )}

                            {/* File Upload */}
                            {q.type === 'file_upload' && (
                                <div className="space-y-3">
                                    {ans.fileAnswer?.fileUrl ? (
                                        <div className="flex items-center justify-between p-3.5 bg-purple-50/70 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl">
                                            <div className="flex items-center gap-2.5">
                                                <File className="w-5 h-5 text-purple-600" />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                                                        {ans.fileAnswer.fileName}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {(ans.fileAnswer.fileSize / 1024).toFixed(1)} KB • Uploaded
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAnswerChange(q._id, 'fileAnswer', null)}
                                                className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white dark:hover:bg-white/5"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-[#222228]/50 hover:bg-purple-50/30 dark:hover:bg-purple-500/5 hover:border-purple-400 cursor-pointer transition-all">
                                            {uploadingFiles[q._id] ? (
                                                <Loader className="w-6 h-6 animate-spin text-purple-600" />
                                            ) : (
                                                <>
                                                    <UploadCloud className="w-6 h-6 text-purple-500 mb-1" />
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                        Click or drop file to upload
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 mt-0.5">
                                                        Max size: {q.fileUploadConfig?.maxFileSizeMB || 10} MB
                                                    </span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) handleFileUpload(q._id, e.target.files[0]);
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Error Message */}
                        {hasError && (
                            <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 pt-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {validationErrors[q._id]}
                            </p>
                        )}
                    </div>
                );
            })}

            {/* Bottom Step Navigation / Submit Bar */}
            <div className="flex items-center justify-between gap-4 pt-4">
                {currentSectionIdx > 0 ? (
                    <button
                        type="button"
                        onClick={handlePrevSection}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-bold transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                ) : (
                    <div />
                )}

                {currentSectionIdx < sections.length - 1 ? (
                    <button
                        type="button"
                        onClick={handleNextSection}
                        className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all"
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        disabled={submitting}
                        className="flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-500/25 disabled:opacity-50 transition-all"
                    >
                        {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {form?.submitButtonText || 'Submit Form'}
                    </button>
                )}
            </div>

            {/* Confirmation Modal before Submit */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#18181c] w-full max-w-md rounded-3xl border border-gray-200 dark:border-white/10 p-6 shadow-2xl space-y-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-gray-900 dark:text-white">Ready to submit?</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {form?.limitOneResponse
                                    ? 'This form only allows one response. Please make sure all answers are accurate.'
                                    : 'Confirm submission of your responses.'}
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                            >
                                Review Answers
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                            >
                                {submitting && <Loader className="w-3.5 h-3.5 animate-spin" />}
                                Confirm & Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormResponse;
