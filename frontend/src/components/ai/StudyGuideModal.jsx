import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, CheckCircle, HelpCircle, AlertTriangle, Download, Sparkles, Copy, Check } from 'lucide-react';

const StudyGuideModal = ({ isOpen, onClose, guide }) => {
    const [copied, setCopied] = React.useState(false);

    if (!isOpen || !guide) return null;

    const handleCopy = () => {
        const text = `STUDY GUIDE: ${guide.topic}\n\nOVERVIEW:\n${guide.overview}\n\nKEY CONCEPTS:\n${(guide.keyConcepts || []).map(c => `- ${c.concept}: ${c.explanation}`).join('\n')}\n\nDEFINITIONS:\n${(guide.definitions || []).map(d => `- ${d.term}: ${d.definition}`).join('\n')}\n\nREVISION CHECKLIST:\n${(guide.revisionChecklist || []).map(r => `[ ] ${r}`).join('\n')}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Study Guide</h3>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                        Verified Context
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{guide.topic}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopy}
                                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied' : 'Copy Guide'}
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {/* Overview */}
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 space-y-2">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" /> Topic Overview
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{guide.overview}</p>
                        </div>

                        {/* Key Concepts */}
                        {guide.keyConcepts && guide.keyConcepts.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Core Concepts</h4>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {guide.keyConcepts.map((kc, idx) => (
                                        <div key={idx} className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">{kc.concept}</span>
                                                {kc.importance && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kc.importance === 'High' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                                                        {kc.importance} Priority
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">{kc.explanation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Definitions */}
                        {guide.definitions && guide.definitions.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Key Terminology</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {guide.definitions.map((d, idx) => (
                                        <div key={idx} className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-0.5">
                                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{d.term}</span>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">{d.definition}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Common Mistakes */}
                        {guide.commonMistakes && guide.commonMistakes.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Common Pitfalls to Avoid
                                </h4>
                                <div className="space-y-1.5">
                                    {guide.commonMistakes.map((m, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10">
                                            <span className="text-amber-500 font-bold">•</span>
                                            <span>{m}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Revision Checklist */}
                        {guide.revisionChecklist && guide.revisionChecklist.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                                    <CheckCircle className="w-3.5 h-3.5" /> Exam Revision Checklist
                                </h4>
                                <div className="space-y-2">
                                    {guide.revisionChecklist.map((item, idx) => (
                                        <label key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                            <input type="checkbox" className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 dark:bg-gray-800" />
                                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{item}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default StudyGuideModal;
