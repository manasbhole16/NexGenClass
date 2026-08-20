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
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Sliders,
    Calendar,
    UploadCloud,
    File
} from 'lucide-react';

const FormPreview = ({ form, questions = [], onBack }) => {
    const sections = Array.isArray(form?.sections) && form.sections.length > 0
        ? form.sections
        : [{ sectionId: 'default', title: 'Section 1', description: '', order: 0 }];

    const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
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

    const currentSection = sections[currentSectionIdx] || sections[0];
    const currentSectionQuestions = questions.filter(
        (q) =>
            q.sectionId === currentSection?.sectionId ||
            (currentSectionIdx === 0 && (!q.sectionId || q.sectionId === 'default'))
    );

    const progressPercent = sections.length > 0 ? Math.round(((currentSectionIdx + 1) / sections.length) * 100) : 100;

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-16">
            {/* Top Bar with Back Action */}
            <div className="flex items-center justify-between gap-4 bg-white dark:bg-[#18181c] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 text-purple-500" /> Back to Builder
                </button>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold">
                    <Eye className="w-3.5 h-3.5" /> Interactive Preview Mode
                </div>
            </div>

            {/* Preview Notice Banner */}
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-700 dark:text-amber-400 text-xs">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                    This is a student preview simulator. You can test filling out all question types and multi-step section transitions, but responses will not be saved to the database.
                </span>
            </div>

            {/* Progress Bar (if multi-section) */}
            {sections.length > 1 && (
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

            {/* Form Header Card (on section 1) */}
            {currentSectionIdx === 0 && (
                <div className="bg-white dark:bg-[#18181c] rounded-3xl border-t-8 border-t-purple-600 dark:border-t-purple-500 border border-gray-200 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-4">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                {form?.topic || 'General'}
                            </span>
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600">
                                {form?.status ? form.status.toUpperCase() : 'DRAFT'}
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                            {form?.title || 'Untitled Form'}
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
                            <span>The respondent's email address will be collected automatically.</span>
                        </div>
                    )}

                    <div className="text-xs text-red-500 font-semibold pt-1">
                        * Indicates required question
                    </div>
                </div>
            )}

            {/* Current Section Card (if beyond section 1) */}
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

            {/* Questions List */}
            {currentSectionQuestions.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 text-gray-500">
                    <p className="text-sm">No questions in this section.</p>
                </div>
            ) : (
                currentSectionQuestions.map((q, idx) => (
                    <div
                        key={q._id || idx}
                        className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 p-6 sm:p-7 shadow-sm space-y-4 transition-all"
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
                                <div className="space-y-2">
                                    {(q.options || []).map((opt, optIdx) => {
                                        const optText = typeof opt === 'string' ? opt : opt.text;
                                        const isSelected = responses[q._id || idx] === optText;
                                        return (
                                            <label
                                                key={optIdx}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'bg-purple-50/60 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-200'
                                                        : 'bg-gray-50/50 dark:bg-[#222228]/50 border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.03] text-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`preview_q_${q._id || idx}`}
                                                    checked={isSelected}
                                                    onChange={() => handleRadioChange(q._id || idx, optText)}
                                                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                                />
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
                                        const currentSelections = Array.isArray(responses[q._id || idx]) ? responses[q._id || idx] : [];
                                        const isSelected = currentSelections.includes(optText);
                                        return (
                                            <label
                                                key={optIdx}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'bg-purple-50/60 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-200'
                                                        : 'bg-gray-50/50 dark:bg-[#222228]/50 border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.03] text-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleCheckboxChange(q._id || idx, optText)}
                                                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                                />
                                                <span className="text-xs">{optText}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {q.type === 'dropdown' && (
                                <div className="relative w-full sm:w-3/4">
                                    <select
                                        value={responses[q._id || idx] || ''}
                                        onChange={(e) => handleTextChange(q._id || idx, e.target.value)}
                                        className="w-full appearance-none px-3.5 py-2.5 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500 transition-colors cursor-pointer"
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
                                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            )}

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
                                            const isSelected = responses[q._id || idx] === val;
                                            return (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => handleRadioChange(q._id || idx, val)}
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

                            {q.type === 'date' && (
                                <input
                                    type="date"
                                    value={responses[q._id || idx] || ''}
                                    onChange={(e) => handleTextChange(q._id || idx, e.target.value)}
                                    className="px-4 py-2.5 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                                />
                            )}

                            {q.type === 'time' && (
                                <input
                                    type="time"
                                    value={responses[q._id || idx] || ''}
                                    onChange={(e) => handleTextChange(q._id || idx, e.target.value)}
                                    className="px-4 py-2.5 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                                />
                            )}

                            {q.type === 'file_upload' && (
                                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-[#222228]/50 hover:bg-purple-50/30 dark:hover:bg-purple-500/5 cursor-pointer transition-all">
                                    <UploadCloud className="w-6 h-6 text-purple-500 mb-1" />
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        Upload file preview
                                    </span>
                                    <span className="text-[10px] text-gray-400 mt-0.5">
                                        Max size: {q.fileUploadConfig?.maxFileSizeMB || 10} MB
                                    </span>
                                </label>
                            )}
                        </div>
                    </div>
                ))
            )}

            {/* Bottom Preview Controls */}
            <div className="flex items-center justify-between gap-4 pt-4">
                {currentSectionIdx > 0 ? (
                    <button
                        type="button"
                        onClick={() => setCurrentSectionIdx((prev) => Math.max(0, prev - 1))}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-bold transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous Section
                    </button>
                ) : (
                    <div />
                )}

                {currentSectionIdx < sections.length - 1 ? (
                    <button
                        type="button"
                        onClick={() => setCurrentSectionIdx((prev) => Math.min(sections.length - 1, prev + 1))}
                        className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all"
                    >
                        Next Section <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => alert("Preview submission simulation complete!")}
                        className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-500/25 transition-all"
                    >
                        {form?.submitButtonText || 'Submit Form (Preview)'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default FormPreview;
