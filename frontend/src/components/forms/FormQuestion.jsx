import React, { useState } from 'react';
import {
    Trash2,
    Copy,
    ArrowUp,
    ArrowDown,
    Plus,
    X,
    AlignLeft,
    FileText,
    CheckSquare,
    Radio,
    ChevronDown,
    ChevronUp,
    ListFilter,
    Award,
    CheckCircle2,
    Sliders,
    Calendar,
    Clock,
    UploadCloud,
    Image,
    HelpCircle,
    ShieldAlert,
    MoveRight
} from 'lucide-react';

const QUESTION_TYPES = [
    { id: 'short_answer', label: 'Short answer', icon: AlignLeft },
    { id: 'paragraph', label: 'Paragraph', icon: FileText },
    { id: 'multiple_choice', label: 'Multiple choice', icon: Radio },
    { id: 'checkboxes', label: 'Checkboxes', icon: CheckSquare },
    { id: 'dropdown', label: 'Dropdown', icon: ListFilter },
    { id: 'linear_scale', label: 'Linear scale', icon: Sliders },
    { id: 'date', label: 'Date', icon: Calendar },
    { id: 'time', label: 'Time', icon: Clock },
    { id: 'file_upload', label: 'File upload', icon: UploadCloud }
];

const VALIDATION_RULES_MAP = {
    short_answer: [
        { id: 'none', label: 'No validation' },
        { id: 'min_length', label: 'Minimum character length' },
        { id: 'max_length', label: 'Maximum character length' },
        { id: 'min_value', label: 'Minimum number value' },
        { id: 'max_value', label: 'Maximum number value' },
        { id: 'exact_value', label: 'Exact number value' },
        { id: 'regex', label: 'Regular expression pattern' }
    ],
    paragraph: [
        { id: 'none', label: 'No validation' },
        { id: 'min_length', label: 'Minimum character length' },
        { id: 'max_length', label: 'Maximum character length' }
    ],
    checkboxes: [
        { id: 'none', label: 'No validation' },
        { id: 'min_select', label: 'Select at least' },
        { id: 'max_select', label: 'Select at most' },
        { id: 'exact_select', label: 'Select exactly' }
    ]
};

const FormQuestion = ({
    question,
    index,
    totalQuestions,
    sections = [],
    onUpdate,
    onDuplicate,
    onDelete,
    onMoveUp,
    onMoveDown,
    isActive,
    onSelect
}) => {
    const [showDescription, setShowDescription] = useState(!!question.description);
    const [showValidation, setShowValidation] = useState(!!question.validation?.enabled);
    const [showImageInput, setShowImageInput] = useState(!!question.imageUrl);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isChoiceType = ['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type);

    const handleTypeChange = (newType) => {
        let newOptions = question.options;
        if (['multiple_choice', 'checkboxes', 'dropdown'].includes(newType)) {
            if (!Array.isArray(newOptions) || newOptions.length < 2) {
                newOptions = [{ text: 'Option 1' }, { text: 'Option 2' }];
            }
        } else {
            newOptions = [];
        }

        const nextQ = {
            ...question,
            type: newType,
            options: newOptions,
            correctAnswer: '',
            correctAnswers: []
        };

        if (newType === 'linear_scale' && !nextQ.scaleConfig) {
            nextQ.scaleConfig = { min: 1, max: 5, minLabel: '', maxLabel: '' };
        }
        if (newType === 'file_upload' && !nextQ.fileUploadConfig) {
            nextQ.fileUploadConfig = { maxFileSizeMB: 10, allowedTypes: ['all'] };
        }

        onUpdate(index, nextQ);
    };

    const handleOptionTextChange = (optIdx, newText) => {
        const oldOpt = question.options?.[optIdx];
        const oldText = typeof oldOpt === 'string' ? oldOpt : oldOpt?.text;

        const updatedOptions = [...(question.options || [])];
        updatedOptions[optIdx] = { text: newText };

        let updatedCorrectAnswer = question.correctAnswer;
        let updatedCorrectAnswers = question.correctAnswers || [];

        if (updatedCorrectAnswer === oldText) {
            updatedCorrectAnswer = newText;
        }
        if (updatedCorrectAnswers.includes(oldText)) {
            updatedCorrectAnswers = updatedCorrectAnswers.map((t) => (t === oldText ? newText : t));
        }

        onUpdate(index, {
            ...question,
            options: updatedOptions,
            correctAnswer: updatedCorrectAnswer,
            correctAnswers: updatedCorrectAnswers
        });
    };

    const handleAddOption = () => {
        const updatedOptions = [...(question.options || [])];
        updatedOptions.push({ text: `Option ${updatedOptions.length + 1}` });
        onUpdate(index, { ...question, options: updatedOptions });
    };

    const handleRemoveOption = (optIdx) => {
        if ((question.options || []).length <= 2) return;
        const removingOpt = question.options[optIdx];
        const removingText = typeof removingOpt === 'string' ? removingOpt : removingOpt?.text;

        const updatedOptions = question.options.filter((_, idx) => idx !== optIdx);
        let updatedCorrectAnswer = question.correctAnswer === removingText ? '' : question.correctAnswer;
        let updatedCorrectAnswers = (question.correctAnswers || []).filter((t) => t !== removingText);

        onUpdate(index, {
            ...question,
            options: updatedOptions,
            correctAnswer: updatedCorrectAnswer,
            correctAnswers: updatedCorrectAnswers
        });
    };

    const handleToggleCorrectOption = (optText) => {
        if (question.type === 'multiple_choice' || question.type === 'dropdown') {
            const isAlreadyCorrect = question.correctAnswer === optText;
            onUpdate(index, {
                ...question,
                correctAnswer: isAlreadyCorrect ? '' : optText
            });
        } else if (question.type === 'checkboxes') {
            const currentList = question.correctAnswers || [];
            const isAlreadyCorrect = currentList.includes(optText);
            const nextList = isAlreadyCorrect
                ? currentList.filter((t) => t !== optText)
                : [...currentList, optText];
            onUpdate(index, {
                ...question,
                correctAnswers: nextList
            });
        }
    };

    const currentValidationRules = VALIDATION_RULES_MAP[question.type] || [];

    return (
        <div
            onClick={onSelect}
            className={`bg-white dark:bg-[#18181c] rounded-2xl border transition-all duration-200 p-5 sm:p-6 shadow-sm ${
                isActive
                    ? 'border-l-4 border-l-purple-600 dark:border-l-purple-500 border-purple-300 dark:border-purple-500/40 shadow-purple-500/5 ring-1 ring-purple-500/20'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
            }`}
        >
            {/* Header: Question Number, Type Selector, Section, Marks, Collapse */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs">
                        {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Question</span>

                    {/* Section Tag / Selector */}
                    {sections && sections.length > 1 && (
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                            <MoveRight className="w-3 h-3 text-gray-400" />
                            <select
                                value={question.sectionId || 'default'}
                                onChange={(e) => onUpdate(index, { ...question, sectionId: e.target.value })}
                                className="bg-transparent text-[11px] font-bold text-purple-600 dark:text-purple-400 outline-none cursor-pointer"
                            >
                                {sections.map((s, sIdx) => (
                                    <option key={s.sectionId || sIdx} value={s.sectionId || 'default'} className="dark:bg-[#18181c] text-gray-900 dark:text-white">
                                        {s.title || `Section ${sIdx + 1}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
                    {/* Marks Configuration */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50/70 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl">
                        <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">Marks:</span>
                        <input
                            type="number"
                            min="0"
                            value={question.marks !== undefined ? question.marks : 1}
                            onChange={(e) =>
                                onUpdate(index, {
                                    ...question,
                                    marks: Math.max(0, parseInt(e.target.value, 10) || 0)
                                })
                            }
                            className="w-12 bg-transparent text-xs font-bold text-purple-700 dark:text-purple-300 text-center outline-none"
                        />
                    </div>

                    {/* Question Type Selector */}
                    <div className="relative flex-1 sm:flex-initial">
                        <select
                            value={question.type}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            className="w-full sm:w-48 appearance-none px-3.5 py-1.5 pr-8 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500 transition-colors cursor-pointer"
                        >
                            {QUESTION_TYPES.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Collapse Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        title={isCollapsed ? "Expand card" : "Collapse card"}
                    >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Main Question Body */}
            {!isCollapsed && (
                <div className="space-y-4">
                    {/* Question Prompt Input */}
                    <div>
                        <input
                            type="text"
                            placeholder="Enter your question title..."
                            value={question.questionText}
                            onChange={(e) => onUpdate(index, { ...question, questionText: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50/70 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-purple-500 focus:bg-white dark:focus:bg-[#18181c] transition-all"
                        />
                    </div>

                    {/* Description input if enabled */}
                    {showDescription && (
                        <div>
                            <input
                                type="text"
                                placeholder="Add help text or instructions for students..."
                                value={question.description || ''}
                                onChange={(e) => onUpdate(index, { ...question, description: e.target.value })}
                                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-white/[0.02] border border-dashed border-gray-300 dark:border-white/10 rounded-xl text-xs text-gray-600 dark:text-gray-300 placeholder:text-gray-400 outline-none focus:border-purple-500"
                            />
                        </div>
                    )}

                    {/* Image URL input & Preview */}
                    {showImageInput && (
                        <div className="space-y-2 p-3 bg-gray-50 dark:bg-[#222228]/50 rounded-xl border border-gray-200 dark:border-white/10">
                            <div className="flex items-center gap-2">
                                <Image className="w-4 h-4 text-purple-500" />
                                <input
                                    type="text"
                                    placeholder="Paste image URL (https://... or data:image/...)"
                                    value={question.imageUrl || ''}
                                    onChange={(e) => onUpdate(index, { ...question, imageUrl: e.target.value })}
                                    className="flex-1 px-3 py-1.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg text-xs outline-none focus:border-purple-500 text-gray-800 dark:text-gray-200"
                                />
                                {question.imageUrl && (
                                    <button
                                        type="button"
                                        onClick={() => onUpdate(index, { ...question, imageUrl: '' })}
                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {question.imageUrl && (
                                <div className="mt-2 max-w-sm rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
                                    <img src={question.imageUrl} alt="Question visual" className="w-full h-auto max-h-48 object-contain bg-black/5" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Dynamic Question Type Settings */}

                    {/* 1. Short Answer */}
                    {question.type === 'short_answer' && (
                        <div className="space-y-2">
                            <div className="p-3 bg-gray-50 dark:bg-[#222228]/50 rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-xs text-gray-400">
                                Short answer text line (one-line response)
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Answer Key (Optional):</span>
                                <input
                                    type="text"
                                    placeholder="Exact correct answer string for auto-grading..."
                                    value={question.correctAnswer || ''}
                                    onChange={(e) => onUpdate(index, { ...question, correctAnswer: e.target.value })}
                                    className="flex-1 px-3 py-1.5 bg-purple-50/50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg text-xs font-medium text-purple-700 dark:text-purple-300 outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* 2. Paragraph */}
                    {question.type === 'paragraph' && (
                        <div className="p-3 bg-gray-50 dark:bg-[#222228]/50 rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-xs text-gray-400">
                            Long answer text box (multi-line response)
                        </div>
                    )}

                    {/* 3. Linear Scale */}
                    {question.type === 'linear_scale' && (
                        <div className="p-4 bg-gray-50 dark:bg-[#222228]/60 rounded-xl border border-gray-200 dark:border-white/10 space-y-3">
                            <div className="flex items-center gap-4 flex-wrap text-xs font-semibold text-gray-700 dark:text-gray-300">
                                <div className="flex items-center gap-2">
                                    <span>Min:</span>
                                    <select
                                        value={question.scaleConfig?.min !== undefined ? question.scaleConfig.min : 1}
                                        onChange={(e) =>
                                            onUpdate(index, {
                                                ...question,
                                                scaleConfig: { ...question.scaleConfig, min: Number(e.target.value) }
                                            })
                                        }
                                        className="px-2.5 py-1 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg"
                                    >
                                        <option value="0">0</option>
                                        <option value="1">1</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>to Max:</span>
                                    <select
                                        value={question.scaleConfig?.max !== undefined ? question.scaleConfig.max : 5}
                                        onChange={(e) =>
                                            onUpdate(index, {
                                                ...question,
                                                scaleConfig: { ...question.scaleConfig, max: Number(e.target.value) }
                                            })
                                        }
                                        className="px-2.5 py-1 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg"
                                    >
                                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                                            <option key={v} value={v}>
                                                {v}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500">Min Label (Optional):</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Strongly Disagree / Poor"
                                        value={question.scaleConfig?.minLabel || ''}
                                        onChange={(e) =>
                                            onUpdate(index, {
                                                ...question,
                                                scaleConfig: { ...question.scaleConfig, minLabel: e.target.value }
                                            })
                                        }
                                        className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500">Max Label (Optional):</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Strongly Agree / Excellent"
                                        value={question.scaleConfig?.maxLabel || ''}
                                        onChange={(e) =>
                                            onUpdate(index, {
                                                ...question,
                                                scaleConfig: { ...question.scaleConfig, maxLabel: e.target.value }
                                            })
                                        }
                                        className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Date */}
                    {question.type === 'date' && (
                        <div className="p-3 bg-gray-50 dark:bg-[#222228]/50 rounded-xl border border-dashed border-gray-200 dark:border-white/10 flex items-center gap-3 text-xs text-gray-500">
                            <Calendar className="w-4 h-4 text-purple-500" />
                            <span>Date picker field (Month / Day / Year)</span>
                        </div>
                    )}

                    {/* 5. Time */}
                    {question.type === 'time' && (
                        <div className="p-3 bg-gray-50 dark:bg-[#222228]/50 rounded-xl border border-dashed border-gray-200 dark:border-white/10 flex items-center gap-3 text-xs text-gray-500">
                            <Clock className="w-4 h-4 text-purple-500" />
                            <span>Time picker field (Hours : Minutes)</span>
                        </div>
                    )}

                    {/* 6. File Upload Config */}
                    {question.type === 'file_upload' && (
                        <div className="p-4 bg-gray-50 dark:bg-[#222228]/60 rounded-xl border border-gray-200 dark:border-white/10 space-y-3">
                            <div className="flex items-center gap-4 flex-wrap text-xs font-semibold text-gray-700 dark:text-gray-300">
                                <div className="flex items-center gap-2">
                                    <span>Max File Size:</span>
                                    <select
                                        value={question.fileUploadConfig?.maxFileSizeMB || 10}
                                        onChange={(e) =>
                                            onUpdate(index, {
                                                ...question,
                                                fileUploadConfig: {
                                                    ...question.fileUploadConfig,
                                                    maxFileSizeMB: Number(e.target.value)
                                                }
                                            })
                                        }
                                        className="px-2.5 py-1 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg"
                                    >
                                        <option value="1">1 MB</option>
                                        <option value="5">5 MB</option>
                                        <option value="10">10 MB</option>
                                        <option value="25">25 MB</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>Allowed Types:</span>
                                    <span className="text-[11px] text-gray-400 font-normal">PDF, Documents, Images</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Choice Types (MCQ, Checkboxes, Dropdown) */}
                    {isChoiceType && (
                        <div className="space-y-2.5">
                            {(question.options || []).map((opt, optIdx) => {
                                const optText = typeof opt === 'string' ? opt : opt.text;
                                const isCorrect =
                                    question.type === 'checkboxes'
                                        ? (question.correctAnswers || []).includes(optText)
                                        : question.correctAnswer === optText;

                                return (
                                    <div
                                        key={optIdx}
                                        className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                                            isCorrect
                                                ? 'bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20'
                                                : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                                        }`}
                                    >
                                        {/* Icon type symbol */}
                                        <div className="text-gray-400 flex-shrink-0">
                                            {question.type === 'multiple_choice' && <Radio className="w-4 h-4" />}
                                            {question.type === 'checkboxes' && <CheckSquare className="w-4 h-4" />}
                                            {question.type === 'dropdown' && (
                                                <span className="text-xs font-bold text-gray-400">{optIdx + 1}.</span>
                                            )}
                                        </div>

                                        {/* Option text input */}
                                        <input
                                            type="text"
                                            value={optText}
                                            onChange={(e) => handleOptionTextChange(optIdx, e.target.value)}
                                            className="flex-1 px-3 py-1.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500"
                                        />

                                        {/* Mark as Correct Answer Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggleCorrectOption(optText)}
                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                                isCorrect
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                                            }`}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {isCorrect ? 'Correct Answer' : 'Mark Correct'}
                                        </button>

                                        {/* Remove option button */}
                                        {(question.options || []).length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOption(optIdx)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 py-1.5 px-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Option
                            </button>
                        </div>
                    )}

                    {/* Question Validation Rules Panel */}
                    {showValidation && (
                        <div className="p-3.5 bg-amber-50/60 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Response Validation Rule
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowValidation(false);
                                        onUpdate(index, { ...question, validation: { enabled: false, ruleType: 'none', value: null } });
                                    }}
                                    className="text-amber-700 dark:text-amber-400 hover:text-red-500"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <select
                                    value={question.validation?.ruleType || 'none'}
                                    onChange={(e) =>
                                        onUpdate(index, {
                                            ...question,
                                            validation: { ...question.validation, enabled: e.target.value !== 'none', ruleType: e.target.value }
                                        })
                                    }
                                    className="px-2.5 py-1.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg font-medium"
                                >
                                    {currentValidationRules.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Threshold / Pattern / Count"
                                    value={question.validation?.value !== undefined && question.validation?.value !== null ? question.validation.value : ''}
                                    onChange={(e) =>
                                        onUpdate(index, {
                                            ...question,
                                            validation: { ...question.validation, value: e.target.value }
                                        })
                                    }
                                    className="px-2.5 py-1.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg"
                                />
                                <input
                                    type="text"
                                    placeholder="Custom error message..."
                                    value={question.validation?.customError || ''}
                                    onChange={(e) =>
                                        onUpdate(index, {
                                            ...question,
                                            validation: { ...question.validation, customError: e.target.value }
                                        })
                                    }
                                    className="px-2.5 py-1.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-lg"
                                />
                            </div>
                        </div>
                    )}

                    {/* Bottom Toolbar: Extras & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            {/* Required toggle */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!question.required}
                                    onChange={(e) => onUpdate(index, { ...question, required: e.target.checked })}
                                    className="w-4 h-4 text-purple-600 rounded border-gray-300 dark:border-white/20 focus:ring-purple-500"
                                />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Required</span>
                            </label>

                            {/* Add description toggle */}
                            <button
                                type="button"
                                onClick={() => setShowDescription(!showDescription)}
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${
                                    showDescription ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                + Description
                            </button>

                            {/* Add image toggle */}
                            <button
                                type="button"
                                onClick={() => setShowImageInput(!showImageInput)}
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${
                                    showImageInput ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                + Image
                            </button>

                            {/* Validation toggle (if applicable) */}
                            {currentValidationRules.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowValidation(!showValidation);
                                        if (!showValidation) {
                                            onUpdate(index, { ...question, validation: { enabled: true, ruleType: currentValidationRules[1].id, value: '' } });
                                        }
                                    }}
                                    className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${
                                        showValidation ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    + Validation
                                </button>
                            )}
                        </div>

                        {/* Duplication, Deletion, Reordering */}
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <button
                                type="button"
                                onClick={() => onMoveUp(index)}
                                disabled={index === 0}
                                className="p-1.5 hover:text-purple-600 disabled:opacity-30 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                                title="Move question up"
                            >
                                <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => onMoveDown(index)}
                                disabled={index === totalQuestions - 1}
                                className="p-1.5 hover:text-purple-600 disabled:opacity-30 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                                title="Move question down"
                            >
                                <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => onDuplicate(index)}
                                className="p-1.5 hover:text-purple-600 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                                title="Duplicate question"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(index)}
                                className="p-1.5 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                                title="Delete question"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormQuestion;
