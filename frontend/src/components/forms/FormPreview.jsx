import React, { useState } from 'react';
import {
    ArrowLeft,
    Eye,
    Mail,
    CheckCircle2,
    Clock,
    AlertCircle,
    Info,
    CheckSquare,
    Radio,
    ChevronDown
} from 'lucide-react';

const FormPreview = ({ form, questions, onBack }) => {
    const [responses, setResponses] = useState({});

    const handleTextChange = (qId, val) => {
        setResponses((prev) => ({ ...prev, [qId]: val }));
    };

    const handleRadioChange = (qId, val) => {
        setResponses((prev) => ({ ...prev, [qId]: val }));
    };

    const handleCheckboxChange = (qId, optionText) => {
        setResponses((prev) => {
            const current = Array.isArray(prev[qId]) ? prev[qId] : [];
            const exists = current.includes(optionText);
            const updated = exists ? current.filter((x) => x !== optionText) : [...current, optionText];
            return { ...prev, [qId]: updated };
        });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-12">
            {/* Top Bar with Back Action */}
            <div className="flex items-center justify-between gap-4 bg-white dark:bg-[#18181c] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 text-purple-500" /> Back to Builder
                </button>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold">
                    <Eye className="w-3.5 h-3.5" /> Preview Mode
                </div>
            </div>

            {/* Preview Notice Banner */}
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-700 dark:text-amber-400 text-xs">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                    This is a student preview mode. You can test filling out choices and fields, but responses will not be saved.
                </span>
            </div>

            {/* Form Header Card */}
            <div className="bg-white dark:bg-[#18181c] rounded-3xl border-t-8 border-t-purple-600 dark:border-t-purple-500 border border-gray-200 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-4">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            {form.topic || 'General'}
                        </span>
                        <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                form.status === 'published'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : form.status === 'closed'
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                        >
                            {form.status ? form.status.toUpperCase() : 'DRAFT'}
                        </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                        {form.title || 'Untitled Form'}
                    </h1>

                    {form.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {form.description}
                        </p>
                    )}
                </div>

                {form.collectEmail && (
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400">
                        <Mail className="w-4 h-4 text-purple-500" />
                        <span>The respondent's email address will be collected automatically.</span>
                    </div>
                )}

                <div className="text-xs text-red-500 dark:text-red-400 font-semibold pt-1">
                    * Indicates required question
                </div>
            </div>

            {/* Questions List */}
            {questions.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 text-gray-500">
                    <p className="text-sm">No questions added to this form yet.</p>
                </div>
            ) : (
                questions.map((q, idx) => (
                    <div
                        key={q._id || idx}
                        className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 p-6 sm:p-7 shadow-sm space-y-4 transition-all"
                    >
                        {/* Question Title & Description */}
                        <div>
                            <div className="flex items-start gap-2">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {idx + 1}. {q.questionText}
                                </span>
                                {q.required && <span className="text-red-500 font-bold">*</span>}
                            </div>
                            {q.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {q.description}
                                </p>
                            )}
                        </div>

                        {/* Interactive Preview of Answer Field */}
                        <div className="pt-2">
                            {q.type === 'short_answer' && (
                                <input
                                    type="text"
                                    placeholder="Your answer"
                                    value={responses[q._id || idx] || ''}
                                    onChange={(e) => handleTextChange(q._id || idx, e.target.value)}
                                    className="w-full sm:w-3/4 px-3 py-2.5 bg-gray-50 dark:bg-[#222228] border-b-2 border-gray-300 dark:border-white/20 focus:border-purple-500 outline-none text-xs text-gray-900 dark:text-white rounded-t-lg transition-colors placeholder:text-gray-400"
                                />
                            )}

                            {q.type === 'paragraph' && (
                                <textarea
                                    rows={3}
                                    placeholder="Your answer"
                                    value={responses[q._id || idx] || ''}
                                    onChange={(e) => handleTextChange(q._id || idx, e.target.value)}
                                    className="w-full p-3 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl focus:border-purple-500 outline-none text-xs text-gray-900 dark:text-white transition-colors placeholder:text-gray-400 resize-none"
                                />
                            )}

                            {q.type === 'multiple_choice' && (
                                <div className="space-y-2.5">
                                    {(q.options || []).map((opt, optIdx) => {
                                        const optText = typeof opt === 'string' ? opt : opt.text;
                                        const isSelected = responses[q._id || idx] === optText;

                                        return (
                                            <label
                                                key={optIdx}
                                                onClick={() => handleRadioChange(q._id || idx, optText)}
                                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                            >
                                                <div
                                                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                                        isSelected
                                                            ? 'border-purple-600 bg-purple-600 text-white'
                                                            : 'border-gray-300 dark:border-gray-600'
                                                    }`}
                                                >
                                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>
                                                <span className="text-xs text-gray-800 dark:text-gray-200">
                                                    {optText}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {q.type === 'checkboxes' && (
                                <div className="space-y-2.5">
                                    {(q.options || []).map((opt, optIdx) => {
                                        const optText = typeof opt === 'string' ? opt : opt.text;
                                        const selectedList = responses[q._id || idx] || [];
                                        const isChecked = selectedList.includes(optText);

                                        return (
                                            <label
                                                key={optIdx}
                                                onClick={() => handleCheckboxChange(q._id || idx, optText)}
                                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                            >
                                                <div
                                                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                                        isChecked
                                                            ? 'border-purple-600 bg-purple-600 text-white'
                                                            : 'border-gray-300 dark:border-gray-600'
                                                    }`}
                                                >
                                                    {isChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="text-xs text-gray-800 dark:text-gray-200">
                                                    {optText}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {q.type === 'dropdown' && (
                                <div className="relative w-full sm:w-64">
                                    <select
                                        value={responses[q._id || idx] || ''}
                                        onChange={(e) => handleTextChange(q._id || idx, e.target.value)}
                                        className="w-full pl-3 pr-8 py-2.5 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500 cursor-pointer appearance-none"
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
                                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4">
                <button
                    disabled
                    title="Submission is disabled in preview mode"
                    className="px-6 py-2.5 bg-purple-600 text-white text-xs font-bold rounded-xl opacity-60 cursor-not-allowed shadow-md"
                >
                    Submit (Preview Only)
                </button>

                <button
                    onClick={() => setResponses({})}
                    className="text-xs text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 font-semibold"
                >
                    Clear Preview Form
                </button>
            </div>
        </div>
    );
};

export default FormPreview;
