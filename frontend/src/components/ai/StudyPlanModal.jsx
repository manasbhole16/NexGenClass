import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Target, CheckCircle, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const StudyPlanModal = ({ isOpen, onClose, roomId }) => {
    const [loading, setLoading] = useState(false);
    const [planData, setPlanData] = useState(null);
    const [weakAreasInput, setWeakAreasInput] = useState('');
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleGeneratePlan = async () => {
        setLoading(true);
        setError(null);
        try {
            const weakAreas = weakAreasInput.split(',').map(s => s.trim()).filter(Boolean);
            const res = await fetch(`${API_BASE_URL}/api/ai/study-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ roomId, weakAreas })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to generate study plan');
            setPlanData(data.plan);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
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
                    <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                <Target className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Personalized Study Plan</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">AI Adaptive Academic Schedule</p>
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
                        {!planData && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                        Focus Areas / Topics to Reinforce (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Memory Management, Dynamic Programming, SQL Joins (comma-separated)"
                                        value={weakAreasInput}
                                        onChange={e => setWeakAreasInput(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl text-xs outline-none text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        The AI automatically analyzes your upcoming deadlines and attendance to structure this plan.
                                    </p>
                                </div>

                                <button
                                    onClick={handleGeneratePlan}
                                    disabled={loading}
                                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {loading ? 'Synthesizing Academic Plan...' : 'Generate 7-Day Academic Study Plan'}
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                                {error}
                            </div>
                        )}

                        {planData && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Goal of the Week</span>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">{planData.weeklyGoal}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{planData.summary}</p>
                                </div>

                                {/* 7-Day Grid */}
                                <div className="space-y-2.5">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Daily Study Schedule</h4>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {(planData.schedule || []).map((dayItem, idx) => (
                                            <div key={idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{dayItem.day}</span>
                                                        <span className="text-[10px] bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-full font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {dayItem.duration}
                                                        </span>
                                                    </div>
                                                    <h5 className="text-xs font-bold text-gray-900 dark:text-white">{dayItem.focus}</h5>
                                                    <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside space-y-0.5">
                                                        {(dayItem.tasks || []).map((t, ti) => (
                                                            <li key={ti}>{t}</li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <span className={`self-start sm:self-center text-[10px] font-bold px-2.5 py-1 rounded-full ${dayItem.priority === 'High' ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                                    {dayItem.priority} Priority
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setPlanData(null)}
                                    className="w-full py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    Regenerate or Adjust Inputs
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default StudyPlanModal;
