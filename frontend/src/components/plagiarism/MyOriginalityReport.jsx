import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, CheckCircle, Info, BookOpen, Loader2 } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const MyOriginalityReport = ({ isOpen, onClose, submissionId }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE_URL}/api/plagiarism/submissions/${submissionId}`, { credentials: 'include' });
                const data = await res.json();
                if (res.ok) {
                    setReport(data.report);
                }
            } catch (e) {
                console.error('Failed to fetch student originality report:', e);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen && submissionId) {
            fetchReport();
        }
    }, [isOpen, submissionId]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="bg-white dark:bg-[#121216] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Originality Report</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Academic integrity guidance</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        {loading ? (
                            <div className="py-12 text-center">
                                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
                                <p className="text-xs text-gray-500 font-medium">Retrieving originality insights...</p>
                            </div>
                        ) : !report ? (
                            <div className="py-8 text-center space-y-2 text-xs text-gray-500">
                                <CheckCircle className="w-8 h-8 text-purple-600 mx-auto opacity-70" />
                                <p className="font-bold text-gray-800 dark:text-gray-200">No originality report generated yet.</p>
                                <p>Your instructor has not run an originality check on this submission.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                                    <span className="text-[10px] uppercase font-extrabold text-purple-600 dark:text-purple-400 tracking-wider">
                                        Similarity Indicator
                                    </span>
                                    <div className="text-3xl font-extrabold text-purple-700 dark:text-purple-300 mt-1">
                                        {report.overallSimilarityPercent}%
                                    </div>
                                    <span className="text-xs text-purple-600/80 font-bold uppercase mt-1 block">
                                        Category: {report.category?.replace('_', ' ')}
                                    </span>
                                </div>

                                <div className="p-3.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-2xl flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                                    <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                                    <p className="leading-relaxed">
                                        Similarity highlights overlapping phrases with course materials and peer submissions. Make sure to properly cite all references and sources.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MyOriginalityReport;
