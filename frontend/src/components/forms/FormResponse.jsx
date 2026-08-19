import React, { useState, useEffect } from 'react';
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
    Loader,
    Lock,
    Calendar,
    RotateCcw,
    Award,
    Star,
    ChevronUp
} from 'lucide-react';

const FormResponse = ({ formId, roomId, onBack }) => {
    const [form, setForm] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [existingResponse, setExistingResponse] = useState(null);
    const [studentResult, setStudentResult] = useState(null);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedInfo, setSubmittedInfo] = useState(null);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    // Load form details, questions, and existing response
    const loadFormData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch form and questions
            const formRes = await fetch(`${API_BASE_URL}/api/forms/${formId}`, {
                credentials: 'include'
            });
            const formData = await formRes.json();

            if (!formData.success) {
                setError(formData.message || 'Could not load form');
                setLoading(false);
                return;
            }

            setForm(formData.form);
            setQuestions(formData.questions || []);

            // 2. Fetch student's existing response (if any)
            const respRes = await fetch(`${API_BASE_URL}/api/forms/${formId}/my-response`, {
                credentials: 'include'
            });
            const respData = await respRes.json();

            if (respData.success && respData.response) {
                setExistingResponse(respData.response);
                // Pre-populate answers
                const initialAnswers = {};
                (respData.response.answers || []).forEach((a) => {
                    initialAnswers[a.questionId] = {
                        textAnswer: a.textAnswer || '',
                        selectedOption: a.selectedOption || '',
                        selectedOptions: a.selectedOptions || []
                    };
                });
                setAnswers(initialAnswers);

                // Fetch student result details
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

    const handleAnswerChange = (qId, field, value) => {
        setAnswers((prev) => {
            const current = prev[qId] || { textAnswer: '', selectedOption: '', selectedOptions: [] };
            return {
                ...prev,
                [qId]: { ...current, [field]: value }
            };
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
            const current = prev[qId] || { textAnswer: '', selectedOption: '', selectedOptions: [] };
            const existingOptions = current.selectedOptions || [];
            const exists = existingOptions.includes(optionText);
            const updated = exists
                ? existingOptions.filter((o) => o !== optionText)
                : [...existingOptions, optionText];

            return {
                ...prev,
                [qId]: { ...current, selectedOptions: updated }
            };
        });

        if (validationErrors[qId]) {
            setValidationErrors((prev) => {
                const next = { ...prev };
                delete next[qId];
                return next;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Client-side validation for required fields
        const newErrors = {};
        questions.forEach((q) => {
            if (q.required) {
                const userAns = answers[q._id];
                if (['short_answer', 'paragraph'].includes(q.type)) {
                    if (!userAns?.textAnswer || !userAns.textAnswer.trim()) {
                        newErrors[q._id] = 'This question is required.';
                    }
                } else if (['multiple_choice', 'dropdown'].includes(q.type)) {
                    if (!userAns?.selectedOption) {
                        newErrors[q._id] = 'Please select an option.';
                    }
                } else if (q.type === 'checkboxes') {
                    if (!userAns?.selectedOptions || userAns.selectedOptions.length === 0) {
                        newErrors[q._id] = 'Please select at least one option.';
                    }
                }
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setValidationErrors(newErrors);
            setError('Please answer all required questions before submitting.');
            return;
        }

        const formattedAnswers = questions.map((q) => {
            const a = answers[q._id] || {};
            return {
                questionId: q._id,
                textAnswer: a.textAnswer || '',
                selectedOption: a.selectedOption || '',
                selectedOptions: a.selectedOptions || []
            };
        });

        setSubmitting(true);
        try {
            let res;
            if (existingResponse && form.allowResponseEditing) {
                res = await fetch(`${API_BASE_URL}/api/forms/${formId}/responses/${existingResponse._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ answers: formattedAnswers })
                });
            } else {
                res = await fetch(`${API_BASE_URL}/api/forms/${formId}/responses`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ answers: formattedAnswers })
                });
            }

            const data = await res.json();
            if (data.success) {
                setIsSubmitted(true);
                setSubmittedInfo({
                    responseId: data.responseId || existingResponse?._id,
                    submittedAt: data.submittedAt || new Date().toISOString(),
                    score: data.score,
                    totalMarks: data.totalMarks,
                    percentage: data.percentage,
                    gradingStatus: data.gradingStatus
                });
                loadFormData();
            } else {
                setError(data.message || 'Failed to submit response.');
            }
        } catch (err) {
            console.error('Submission error:', err);
            setError('Network error submitting your response.');
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
            <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
                <div className="p-3 w-12 h-12 mx-auto rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Unable to Open Form</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">{error}</p>
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
                >
                    Back to Class
                </button>
            </div>
        );
    }

    // Availability Window / Status Checks
    const now = new Date();
    const isNotStarted = form?.startAt && now < new Date(form.startAt);
    const isExpired = form?.endAt && now > new Date(form.endAt);
    const isClosed = form?.status === 'closed';

    if (isNotStarted || isExpired || isClosed) {
        return (
            <div className="max-w-2xl mx-auto py-12 space-y-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-purple-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Forms
                </button>

                <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 p-8 text-center space-y-4 shadow-sm">
                    <div className="p-3 w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{form?.title}</h2>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                        {isNotStarted && `This form is not yet accepting responses. It will open on ${new Date(form.startAt).toLocaleString()}.`}
                        {isExpired && `This form closed on ${new Date(form.endAt).toLocaleString()} and is no longer accepting responses.`}
                        {isClosed && 'This form has been closed by the instructor.'}
                    </p>
                </div>
            </div>
        );
    }

    // Submission Confirmation & Result View
    if (isSubmitted) {
        const hasReleasedScore = studentResult?.resultsReleased;

        return (
            <div className="max-w-2xl mx-auto py-12 space-y-6 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-[#18181c] rounded-3xl border-t-8 border-t-purple-600 border border-gray-200 dark:border-white/10 p-8 text-center space-y-5 shadow-sm">
                    <div className="p-3 w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                            Your response has been recorded.
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Thank you for submitting your response for <strong className="text-gray-700 dark:text-gray-300">{form?.title}</strong>.
                        </p>
                    </div>

                    {/* Student Score / Grade Card if Released */}
                    {hasReleasedScore && (form?.totalMarks > 0 || studentResult?.totalMarks > 0) && (
                        <div className="p-5 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl space-y-3">
                            <div className="flex items-center justify-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400">
                                <Award className="w-4 h-4" /> Assessment Score
                            </div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">
                                {studentResult.score}{' '}
                                <span className="text-base font-semibold text-gray-400">
                                    / {studentResult.totalMarks} ({studentResult.percentage}%)
                                </span>
                            </div>
                            <div className="text-[11px] font-semibold text-gray-500 capitalize">
                                Status: {studentResult.gradingStatus?.replace('_', ' ')}
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowBreakdown(!showBreakdown)}
                                className="flex items-center gap-1 mx-auto text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-1"
                            >
                                {showBreakdown ? 'Hide Question Breakdown' : 'View Question Breakdown'}
                                {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    )}

                    {/* Question Breakdown Drawer */}
                    {showBreakdown && studentResult?.answers && (
                        <div className="text-left space-y-3 pt-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                            {studentResult.answers.map((ans, idx) => (
                                <div
                                    key={ans.questionId || idx}
                                    className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/5 space-y-1.5"
                                >
                                    <div className="flex items-center justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
                                        <span>
                                            Q{idx + 1}. {ans.questionText}
                                        </span>
                                        <span className="text-purple-600 dark:text-purple-400">
                                            {ans.awardedMarks} / {ans.maxMarks} pts
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-300">
                                        <strong>Your Answer:</strong> {ans.textAnswer || ans.selectedOption || (ans.selectedOptions || []).join(', ') || 'No answer'}
                                    </div>
                                    {ans.feedback && (
                                        <div className="text-[11px] text-purple-600 dark:text-purple-400 italic">
                                            Teacher Remark: {ans.feedback}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {submittedInfo?.submittedAt && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-white/5 rounded-full text-[11px] text-gray-500 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            Submitted on {new Date(submittedInfo.submittedAt).toLocaleString()}
                        </div>
                    )}

                    <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                        {form?.allowResponseEditing && (
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold transition-colors"
                            >
                                <Edit3 className="w-3.5 h-3.5" /> Edit your response
                            </button>
                        )}

                        {!form?.limitOneResponse && (
                            <button
                                onClick={() => {
                                    setIsSubmitted(false);
                                    setAnswers({});
                                    setExistingResponse(null);
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Submit another response
                            </button>
                        )}

                        <button
                            onClick={onBack}
                            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                        >
                            Return to Classroom
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-16">
            {/* Top Back Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-purple-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Forms
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-2.5 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-2xl text-xs font-semibold text-red-700 dark:text-red-300 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Editing Notice Banner */}
            {existingResponse && form?.allowResponseEditing && (
                <div className="flex items-center gap-2.5 p-3.5 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl text-xs text-purple-700 dark:text-purple-300 font-semibold">
                    <Edit3 className="w-4 h-4 flex-shrink-0" />
                    <span>You are editing your previously submitted response.</span>
                </div>
            )}

            {/* Form Header Card */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white dark:bg-[#18181c] rounded-3xl border-t-8 border-t-purple-600 dark:border-t-purple-500 border border-gray-200 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                {form?.topic || 'General'}
                            </span>
                            {form?.totalMarks > 0 && (
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    Total Marks: {form.totalMarks}
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                            {form?.title}
                        </h1>

                        {form?.description && (
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                {form.description}
                            </p>
                        )}
                    </div>

                    {form?.collectEmail && (
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400">
                            <Mail className="w-4 h-4 text-purple-500" />
                            <span>Your email address will be recorded upon submission.</span>
                        </div>
                    )}

                    <div className="text-xs text-red-500 font-semibold pt-1">
                        * Indicates required question
                    </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                    {questions.map((q, idx) => {
                        const userAns = answers[q._id] || { textAnswer: '', selectedOption: '', selectedOptions: [] };
                        const hasError = !!validationErrors[q._id];

                        return (
                            <div
                                key={q._id || idx}
                                className={`bg-white dark:bg-[#18181c] rounded-3xl border p-6 sm:p-7 shadow-sm space-y-4 transition-all ${
                                    hasError
                                        ? 'border-red-400 dark:border-red-500 ring-1 ring-red-400/20'
                                        : 'border-gray-200 dark:border-white/10'
                                }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                {idx + 1}. {q.questionText}
                                            </span>
                                            {q.required && <span className="text-red-500 font-bold">*</span>}
                                        </div>
                                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">
                                            {q.marks || 1} pt{q.marks === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                    {q.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {q.description}
                                        </p>
                                    )}
                                </div>

                                {/* Answer Input Field according to type */}
                                <div className="pt-2">
                                    {q.type === 'short_answer' && (
                                        <input
                                            type="text"
                                            placeholder="Your answer"
                                            value={userAns.textAnswer}
                                            onChange={(e) => handleAnswerChange(q._id, 'textAnswer', e.target.value)}
                                            className="w-full sm:w-3/4 px-3 py-2.5 bg-gray-50 dark:bg-[#222228] border-b-2 border-gray-300 dark:border-white/20 focus:border-purple-500 outline-none text-xs text-gray-900 dark:text-white rounded-t-lg transition-colors"
                                        />
                                    )}

                                    {q.type === 'paragraph' && (
                                        <textarea
                                            rows={3}
                                            placeholder="Your answer"
                                            value={userAns.textAnswer}
                                            onChange={(e) => handleAnswerChange(q._id, 'textAnswer', e.target.value)}
                                            className="w-full p-3 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl focus:border-purple-500 outline-none text-xs text-gray-900 dark:text-white transition-colors resize-none"
                                        />
                                    )}

                                    {q.type === 'multiple_choice' && (
                                        <div className="space-y-2">
                                            {(q.options || []).map((opt, optIdx) => {
                                                const optText = typeof opt === 'string' ? opt : opt.text;
                                                const isSelected = userAns.selectedOption === optText;

                                                return (
                                                    <label
                                                        key={optIdx}
                                                        onClick={() => handleAnswerChange(q._id, 'selectedOption', optText)}
                                                        className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                                                            isSelected
                                                                ? 'bg-purple-50/50 dark:bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-200 font-semibold'
                                                                : 'border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200'
                                                        }`}
                                                    >
                                                        <div
                                                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                                                isSelected
                                                                    ? 'border-purple-600 bg-purple-600 text-white'
                                                                    : 'border-gray-400 dark:border-gray-500'
                                                            }`}
                                                        >
                                                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                        </div>
                                                        <span className="text-xs">{optText}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {q.type === 'checkboxes' && (
                                        <div className="space-y-2">
                                            {(q.options || []).map((opt, optIdx) => {
                                                const optText = typeof opt === 'string' ? opt : opt.text;
                                                const isChecked = (userAns.selectedOptions || []).includes(optText);

                                                return (
                                                    <label
                                                        key={optIdx}
                                                        onClick={() => handleCheckboxToggle(q._id, optText)}
                                                        className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                                                            isChecked
                                                                ? 'bg-purple-50/50 dark:bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-200 font-semibold'
                                                                : 'border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200'
                                                        }`}
                                                    >
                                                        <div
                                                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                                                isChecked
                                                                    ? 'border-purple-600 bg-purple-600 text-white'
                                                                    : 'border-gray-400 dark:border-gray-500'
                                                            }`}
                                                        >
                                                            {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                        </div>
                                                        <span className="text-xs">{optText}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {q.type === 'dropdown' && (
                                        <div className="relative w-full sm:w-72">
                                            <select
                                                value={userAns.selectedOption}
                                                onChange={(e) => handleAnswerChange(q._id, 'selectedOption', e.target.value)}
                                                className="w-full pl-3.5 pr-8 py-2.5 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500 cursor-pointer appearance-none"
                                            >
                                                <option value="">Select an option...</option>
                                                {(q.options || []).map((opt, optIdx) => {
                                                    const optText = typeof opt === 'string' ? opt : opt.text;
                                                    return (
                                                        <option key={optIdx} value={optText}>
                                                            {optText}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    )}
                                </div>

                                {hasError && (
                                    <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold pt-1">
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{validationErrors[q._id]}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Form Action Controls */}
                <div className="flex items-center justify-between pt-4">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                        {submitting ? 'Submitting...' : existingResponse ? 'Update Response' : 'Submit Response'}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setAnswers({});
                            setValidationErrors({});
                        }}
                        className="text-xs text-gray-500 hover:text-purple-600 font-semibold transition-colors"
                    >
                        Clear Form
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FormResponse;
