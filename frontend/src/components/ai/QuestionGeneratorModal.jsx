import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, BrainCircuit, Plus, CheckCircle, Loader2, Edit2, Trash2 } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const QuestionGeneratorModal = ({ isOpen, onClose, onAddQuestions, roomId }) => {
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(3);
    const [difficulty, setDifficulty] = useState('medium');
    const [questionType, setQuestionType] = useState('mcq');
    const [marks, setMarks] = useState(2);
    const [loading, setLoading] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState([]);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/generate-questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    topic: topic.trim(),
                    count,
                    difficulty,
                    questionTypes: [questionType],
                    marks,
                    roomId
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to generate questions');
            setGeneratedQuestions(data.questions || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveQuestion = (index) => {
        setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const handleApproveAndAdd = () => {
        if (onAddQuestions && generatedQuestions.length > 0) {
            onAddQuestions(generatedQuestions);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="bg-white dark:bg-[#121216] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                                <BrainCircuit className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Question Generator</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Create & verify assessment questions</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {generatedQuestions.length === 0 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                        Topic / Concept Description
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CPU Scheduling Algorithms, Binary Search Trees, Normalization"
                                        value={topic}
                                        onChange={e => setTopic(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl text-xs outline-none text-gray-900 dark:text-white font-medium"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Question Type</label>
                                        <select
                                            value={questionType}
                                            onChange={e => setQuestionType(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none"
                                        >
                                            <option value="mcq">Multiple Choice (MCQ)</option>
                                            <option value="true_false">True / False</option>
                                            <option value="short_answer">Short Answer</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Difficulty</label>
                                        <select
                                            value={difficulty}
                                            onChange={e => setDifficulty(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Question Count</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={count}
                                            onChange={e => setCount(Number(e.target.value))}
                                            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={loading || !topic.trim()}
                                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {loading ? 'Synthesizing Questions...' : 'Generate Questions with AI'}
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                                {error}
                            </div>
                        )}

                        {generatedQuestions.length > 0 && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                        Review Generated Questions ({generatedQuestions.length})
                                    </span>
                                    <button
                                        onClick={() => setGeneratedQuestions([])}
                                        className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white font-medium"
                                    >
                                        Clear & Generate Again
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {generatedQuestions.map((q, idx) => (
                                        <div key={idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-2.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {idx + 1}. {q.questionText}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveQuestion(idx)}
                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {q.options && q.options.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2">
                                                    {q.options.map((opt, oi) => (
                                                        <div
                                                            key={oi}
                                                            className={`p-2 rounded-xl text-xs font-medium border ${
                                                                q.correctAnswer === oi
                                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                                                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400'
                                                            }`}
                                                        >
                                                            {String.fromCharCode(65 + oi)}. {opt.text}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {q.explanation && (
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                                                    Explanation: {q.explanation}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {generatedQuestions.length > 0 && (
                        <div className="p-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3 bg-gray-50 dark:bg-white/[0.01]">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApproveAndAdd}
                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center gap-1.5"
                            >
                                <CheckCircle className="w-4 h-4" /> Approve & Add to Quiz
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default QuestionGeneratorModal;
