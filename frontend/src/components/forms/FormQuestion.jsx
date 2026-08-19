import React from 'react';
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
    ListFilter,
    Award,
    CheckCircle2
} from 'lucide-react';

const QUESTION_TYPES = [
    { id: 'short_answer', label: 'Short answer', icon: AlignLeft },
    { id: 'paragraph', label: 'Paragraph', icon: FileText },
    { id: 'multiple_choice', label: 'Multiple choice', icon: Radio },
    { id: 'checkboxes', label: 'Checkboxes', icon: CheckSquare },
    { id: 'dropdown', label: 'Dropdown', icon: ListFilter }
];

const FormQuestion = ({
    question,
    index,
    totalQuestions,
    onUpdate,
    onDuplicate,
    onDelete,
    onMoveUp,
    onMoveDown,
    isActive,
    onSelect
}) => {
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
        onUpdate(index, {
            ...question,
            type: newType,
            options: newOptions,
            correctAnswer: '',
            correctAnswers: []
        });
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

    return (
        <div
            onClick={onSelect}
            className={`bg-white dark:bg-[#18181c] rounded-2xl border transition-all duration-200 p-5 sm:p-6 shadow-sm ${
                isActive
                    ? 'border-l-4 border-l-purple-600 dark:border-l-purple-500 border-purple-300 dark:border-purple-500/40 shadow-purple-500/5 ring-1 ring-purple-500/20'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
            }`}
        >
            {/* Header: Question Number, Type Selector, Marks */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs">
                        {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Question</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
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
                            className="w-12 text-center bg-white dark:bg-[#18181c] border border-purple-200 dark:border-purple-500/30 rounded-lg text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-purple-500 py-0.5"
                        />
                    </div>

                    {/* Question Type Selector */}
                    <div className="relative flex-1 sm:w-52">
                        <select
                            value={question.type}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            className="w-full pl-3 pr-8 py-2 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500 transition-colors cursor-pointer appearance-none"
                        >
                            {QUESTION_TYPES.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Question Text Input */}
            <div className="space-y-2 mb-4">
                <input
                    type="text"
                    placeholder="Enter question title..."
                    value={question.questionText}
                    onChange={(e) => onUpdate(index, { ...question, questionText: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-purple-500 focus:bg-white dark:focus:bg-[#18181c] transition-all placeholder:text-gray-400"
                />

                <input
                    type="text"
                    placeholder="Question description / subtitle (optional)"
                    value={question.description || ''}
                    onChange={(e) => onUpdate(index, { ...question, description: e.target.value })}
                    className="w-full px-3.5 py-1.5 bg-transparent border-b border-transparent focus:border-purple-400 text-xs text-gray-600 dark:text-gray-400 outline-none placeholder:text-gray-400/70 transition-colors"
                />
            </div>

            {/* Dynamic Question Body */}
            <div className="mb-5 pt-1">
                {question.type === 'short_answer' && (
                    <div className="w-full sm:w-2/3 py-2 px-3 border-b-2 border-dashed border-gray-300 dark:border-white/20 text-xs text-gray-400 select-none">
                        Short answer text preview (Graded manually)
                    </div>
                )}

                {question.type === 'paragraph' && (
                    <div className="w-full py-4 px-3 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl text-xs text-gray-400 select-none">
                        Long answer text preview (Graded manually)
                    </div>
                )}

                {isChoiceType && (
                    <div className="space-y-2.5">
                        <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                            <span>Click the check icon to select the correct answer key for auto-scoring:</span>
                        </div>

                        {(question.options || []).map((opt, optIdx) => {
                            const optText = typeof opt === 'string' ? opt : opt.text;
                            const isCorrect =
                                question.type === 'checkboxes'
                                    ? (question.correctAnswers || []).includes(optText)
                                    : question.correctAnswer === optText;

                            return (
                                <div key={optIdx} className="flex items-center gap-3">
                                    {/* Correct Answer Indicator Button */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleCorrectOption(optText);
                                        }}
                                        className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                                            isCorrect
                                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                                                : 'border-gray-300 dark:border-white/10 text-gray-400 hover:text-emerald-500 hover:border-emerald-400'
                                        }`}
                                        title={isCorrect ? 'Correct Answer (Click to remove)' : 'Mark as Correct Answer'}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </button>

                                    <input
                                        type="text"
                                        placeholder={`Option ${optIdx + 1}`}
                                        value={optText}
                                        onChange={(e) => handleOptionTextChange(optIdx, e.target.value)}
                                        className={`flex-1 px-3 py-1.5 bg-gray-50/70 dark:bg-[#222228]/80 border rounded-lg text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500 transition-colors ${
                                            isCorrect ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-gray-200 dark:border-white/10'
                                        }`}
                                    />

                                    {(question.options || []).length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(optIdx)}
                                            className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                                            title="Remove Option"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add option
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Toolbar: Ordering, Duplication, Deletion, Required */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
                {/* Reorder Buttons */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveUp(index);
                        }}
                        className="p-1.5 text-gray-400 hover:text-purple-500 disabled:opacity-30 disabled:hover:text-gray-400 rounded-lg transition-colors"
                        title="Move Up"
                    >
                        <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        disabled={index === totalQuestions - 1}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveDown(index);
                        }}
                        className="p-1.5 text-gray-400 hover:text-purple-500 disabled:opacity-30 disabled:hover:text-gray-400 rounded-lg transition-colors"
                        title="Move Down"
                    >
                        <ArrowDown className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {/* Duplicate */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(index);
                        }}
                        className="p-1.5 text-gray-400 hover:text-purple-500 rounded-lg transition-colors"
                        title="Duplicate Question"
                    >
                        <Copy className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(index);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                        title="Delete Question"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-[1px] bg-gray-200 dark:bg-white/10" />

                    {/* Required Toggle */}
                    <label
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 cursor-pointer select-none"
                    >
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Required</span>
                        <div
                            onClick={() => onUpdate(index, { ...question, required: !question.required })}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                                question.required ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'
                            }`}
                        >
                            <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                                    question.required ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default FormQuestion;
