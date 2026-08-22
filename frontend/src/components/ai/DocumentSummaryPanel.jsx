import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, FileText, Loader2, Copy, Check, ListChecks, BookOpen, AlertCircle } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const DocumentSummaryPanel = ({ isOpen, onClose, file }) => {
    const [summaryType, setSummaryType] = useState('standard');
    const [loading, setLoading] = useState(false);
    const [summaryData, setSummaryData] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    if (!isOpen || !file) return null;

    const handleGenerateSummary = async (type = summaryType) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/summarize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ fileId: file._id, summaryType: type })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to summarize');
            setSummaryData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!summaryData) return;
        const text = `SUMMARY: ${summaryData.title}\n\n${summaryData.summary}\n\nKEY POINTS:\n${(summaryData.keyPoints || []).map(p => `- ${p}`).join('\n')}\n\nTAKEAWAYS:\n${(summaryData.takeaways || []).map(t => `- ${t}`).join('\n')}`;
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
                    className="bg-white dark:bg-[#121216] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate max-w-sm">{file.originalName}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">AI Document Summarization</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Summary Options */}
                    <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 bg-gray-200/60 dark:bg-white/5 p-1 rounded-xl">
                            {['brief', 'standard', 'detailed', 'exam_revision'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        setSummaryType(type);
                                        handleGenerateSummary(type);
                                    }}
                                    className={`px-3 py-1 text-xs font-bold capitalize rounded-lg transition-all ${
                                        summaryType === type
                                            ? 'bg-white dark:bg-[#1c1c22] text-purple-600 dark:text-purple-400 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {type.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        {summaryData && (
                            <button
                                onClick={handleCopy}
                                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-1.5"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {!summaryData && !loading && !error && (
                            <div className="py-12 text-center space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 mx-auto flex items-center justify-center">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Ready to summarize</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
                                        Click summarize to extract key concepts, definitions, and exam takeaways from this document.
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleGenerateSummary()}
                                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
                                >
                                    Generate AI Summary
                                </button>
                            </div>
                        )}

                        {loading && (
                            <div className="py-16 text-center space-y-3">
                                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Extracting context & generating structured summary...</p>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {summaryData && !loading && (
                            <div className="space-y-5 animate-in fade-in">
                                {/* Main summary */}
                                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-1.5">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">Executive Summary</span>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{summaryData.summary}</p>
                                </div>

                                {/* Key points */}
                                {summaryData.keyPoints && summaryData.keyPoints.length > 0 && (
                                    <div className="space-y-2">
                                        <h5 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                            <ListChecks className="w-3.5 h-3.5" /> Key Concepts & Points
                                        </h5>
                                        <div className="space-y-1.5">
                                            {summaryData.keyPoints.map((pt, idx) => (
                                                <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                                                    <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="leading-relaxed">{pt}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Takeaways */}
                                {summaryData.takeaways && summaryData.takeaways.length > 0 && (
                                    <div className="space-y-2">
                                        <h5 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                            <BookOpen className="w-3.5 h-3.5" /> Learning Takeaways
                                        </h5>
                                        <div className="grid grid-cols-1 gap-2">
                                            {summaryData.takeaways.map((t, idx) => (
                                                <div key={idx} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-gray-700 dark:text-gray-300">
                                                    {t}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DocumentSummaryPanel;
