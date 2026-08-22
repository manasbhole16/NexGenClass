import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Award, CheckCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const RubricGeneratorModal = ({ isOpen, onClose, onAddRubric, assignmentTitle = '', maxMarks = 100 }) => {
    const [title, setTitle] = useState(assignmentTitle || '');
    const [instructions, setInstructions] = useState('');
    const [points, setPoints] = useState(maxMarks || 100);
    const [loading, setLoading] = useState(false);
    const [rubricItems, setRubricItems] = useState([]);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/generate-rubric`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    assignmentTitle: title || 'Coursework Assignment',
                    instructions,
                    maxMarks: points
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to generate rubric');
            setRubricItems(data.rubric || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = () => {
        if (onAddRubric && rubricItems.length > 0) {
            onAddRubric(rubricItems);
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
                    className="bg-white dark:bg-[#121216] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Rubric Designer</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Generate structured grading criteria</p>
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
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                        {rubricItems.length === 0 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                        Assignment Title
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Lab 2: Distributed Database Implementation"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl text-xs outline-none text-gray-900 dark:text-white font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                        Deliverable Expectations / Instructions
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Outline key requirements, design constraints, test coverage expectations..."
                                        value={instructions}
                                        onChange={e => setInstructions(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl text-xs outline-none text-gray-900 dark:text-white font-medium resize-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Total Marks</label>
                                    <input
                                        type="number"
                                        min="10"
                                        max="500"
                                        value={points}
                                        onChange={e => setPoints(Number(e.target.value))}
                                        className="w-32 px-3 py-2 bg-gray-50 dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-purple-600 outline-none"
                                    />
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={loading || !title.trim()}
                                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {loading ? 'Synthesizing Rubric...' : 'Generate Rubric with AI'}
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                                {error}
                            </div>
                        )}

                        {rubricItems.length > 0 && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                        Generated Criteria ({rubricItems.reduce((acc, r) => acc + (r.points || 0), 0)} pts total)
                                    </span>
                                    <button
                                        onClick={() => setRubricItems([])}
                                        className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white font-medium"
                                    >
                                        Re-generate
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {rubricItems.map((item, idx) => (
                                        <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">{item.criterion}</span>
                                                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                                    {item.points} pts
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">{item.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {rubricItems.length > 0 && (
                        <div className="p-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3 bg-gray-50 dark:bg-white/[0.01]">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApprove}
                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center gap-1.5"
                            >
                                <CheckCircle className="w-4 h-4" /> Apply Rubric to Assignment
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default RubricGeneratorModal;
