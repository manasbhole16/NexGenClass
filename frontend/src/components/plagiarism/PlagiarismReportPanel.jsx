import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    ShieldCheck, 
    AlertTriangle, 
    CheckCircle, 
    Users, 
    FileText, 
    Clock, 
    Loader2,
    Eye,
    MessageSquare,
    Info
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import SimilarityComparison from './SimilarityComparison';

const PlagiarismReportPanel = ({ isOpen, onClose, submissionId, taskId, isTeacher }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [selectedPeerIndex, setSelectedPeerIndex] = useState(0);
    const [reviewNotes, setReviewNotes] = useState('');
    const [reviewed, setReviewed] = useState(false);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/plagiarism/submissions/${submissionId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok) {
                setReport(data.report);
                if (data.report?.isReviewed) setReviewed(true);
            }
        } catch (e) {
            console.error('Failed to fetch report:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRunAnalysis = async () => {
        try {
            setAnalyzing(true);
            const res = await fetch(`${API_BASE_URL}/api/plagiarism/submissions/${submissionId}/analyze`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok) {
                setReport(data.report);
            }
        } catch (e) {
            console.error('Analysis error:', e);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleReview = async () => {
        if (!report?._id) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/plagiarism/reports/${report._id}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reviewNotes })
            });
            if (res.ok) {
                setReviewed(true);
            }
        } catch (e) {
            console.error('Review error:', e);
        }
    };

    useEffect(() => {
        if (isOpen && submissionId) {
            fetchReport();
        }
    }, [isOpen, submissionId]);

    if (!isOpen) return null;

    const getScoreColor = (score) => {
        if (score < 15) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        if (score < 30) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        if (score < 50) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        return 'text-red-500 bg-red-500/10 border-red-500/20';
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="bg-white dark:bg-[#121216] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                    Originality & Plagiarism Report
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Academic integrity verification & phrase similarity evidence
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isTeacher && (
                                <button
                                    onClick={handleRunAnalysis}
                                    disabled={analyzing}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                    {report ? 'Re-Analyze' : 'Run Analysis'}
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center space-y-3">
                                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                                <p className="text-xs text-gray-500 font-medium">Loading originality analysis...</p>
                            </div>
                        ) : !report ? (
                            <div className="py-16 text-center space-y-4 max-w-sm mx-auto">
                                <div className="w-14 h-14 rounded-3xl bg-purple-500/10 text-purple-600 mx-auto flex items-center justify-center">
                                    <ShieldCheck className="w-7 h-7" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">No Analysis Generated Yet</h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Click "Run Analysis" above to compare this submission against all peer student submissions.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Score Metrics Bar */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className={`p-4 rounded-2xl border flex flex-col justify-between ${getScoreColor(report.overallSimilarityPercent)}`}>
                                        <span className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">Overall Similarity</span>
                                        <div className="flex items-baseline gap-1 mt-2">
                                            <span className="text-3xl font-extrabold">{report.overallSimilarityPercent}%</span>
                                            <span className="text-xs uppercase font-bold">({report.category.replace('_', ' ')})</span>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex flex-col justify-between">
                                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500">Exact Match</span>
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{report.exactMatchPercent}%</span>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex flex-col justify-between">
                                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500">Matched Sources</span>
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{(report.matchedSubmissions || []).length}</span>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex flex-col justify-between">
                                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-500">Analyzed Words</span>
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{report.analyzedWordCount || 0}</span>
                                    </div>
                                </div>

                                {/* Academic Integrity Disclaimer Alert */}
                                <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-start gap-3 text-xs text-purple-900 dark:text-purple-200">
                                    <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                                    <p className="leading-relaxed">
                                        <strong className="font-bold">Academic Integrity Notice:</strong> Similarity score reflects overlapping textual phrases between submissions. It does not automatically constitute plagiarism. Instructors should evaluate citations, context, and collaboration permissions before determining academic integrity.
                                    </p>
                                </div>

                                {/* Matched Sources Tab / Selector */}
                                {(report.matchedSubmissions || []).length > 0 ? (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                            Matched Peer Submissions ({(report.matchedSubmissions || []).length})
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {report.matchedSubmissions.map((m, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setSelectedPeerIndex(idx)}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                                                        selectedPeerIndex === idx
                                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                                                            : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    <Users className="w-3.5 h-3.5" />
                                                    <span>{m.studentName || `Peer #${idx + 1}`}</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-extrabold">
                                                        {m.similarityPercent}%
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Side-by-Side Comparison Box */}
                                        <SimilarityComparison
                                            currentText={report.matchedSegments?.[0]?.text || "Analyzed submission textual content"}
                                            sourceText={report.matchedSegments?.[0]?.sourcePhrase || "Matched peer source phrase"}
                                            matchedSegments={report.matchedSegments || []}
                                        />
                                    </div>
                                ) : (
                                    <div className="p-6 text-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 space-y-1">
                                        <CheckCircle className="w-6 h-6 mx-auto" />
                                        <h5 className="text-xs font-bold">100% Original Work</h5>
                                        <p className="text-[11px] opacity-80">No significant similarity detected against classroom peer submissions.</p>
                                    </div>
                                )}

                                {/* Teacher Review Section */}
                                {isTeacher && (
                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                <Eye className="w-4 h-4 text-purple-600" /> Instructor Review Status
                                            </span>
                                            {reviewed && (
                                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Reviewed
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Add internal instructor notes (e.g. Authorized team project, Citations verified)..."
                                                value={reviewNotes}
                                                onChange={e => setReviewNotes(e.target.value)}
                                                className="flex-1 px-3 py-2 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                                            />
                                            <button
                                                onClick={handleReview}
                                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all"
                                            >
                                                Mark Reviewed
                                            </button>
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

export default PlagiarismReportPanel;
