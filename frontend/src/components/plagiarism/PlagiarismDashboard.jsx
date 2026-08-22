import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    ShieldCheck, 
    AlertTriangle, 
    CheckCircle, 
    Search, 
    Download, 
    RefreshCw, 
    Loader2, 
    Users, 
    Eye,
    FileText,
    Filter,
    BarChart3,
    Sparkles
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import PlagiarismReportPanel from './PlagiarismReportPanel';

const PlagiarismDashboard = ({ taskId, isTeacher = true }) => {
    const [summary, setSummary] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [batchAnalyzing, setBatchAnalyzing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/plagiarism/tasks/${taskId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok) {
                setSummary(data.summary);
                setReports(data.reports || []);
            }
        } catch (e) {
            console.error('Failed to fetch plagiarism overview:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (taskId) fetchDashboard();
    }, [taskId]);

    const handleBatchAnalyze = async () => {
        try {
            setBatchAnalyzing(true);
            const res = await fetch(`${API_BASE_URL}/api/plagiarism/tasks/${taskId}/analyze`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok) {
                fetchDashboard();
            }
        } catch (e) {
            console.error('Batch analyze error:', e);
        } finally {
            setBatchAnalyzing(false);
        }
    };

    const handleExportCSV = () => {
        window.open(`${API_BASE_URL}/api/plagiarism/tasks/${taskId}/export`, '_blank');
    };

    const filteredReports = reports.filter(r => {
        const matchesSearch = !searchQuery || (r.studentId?.fullname || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = categoryFilter === 'all' || r.category === categoryFilter;
        return matchesSearch && matchesCat;
    });

    const getScoreBadge = (score, cat) => {
        if (score < 15) return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">{score}% Low</span>;
        if (score < 30) return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px]">{score}% Moderate</span>;
        if (score < 50) return <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-[11px]">{score}% High</span>;
        return <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-[11px]">{score}% Very High</span>;
    };

    return (
        <div className="space-y-6">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-3xl bg-white dark:bg-[#121216] border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Analyzed Submissions</span>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{summary?.analyzedCount || 0}</span>
                        <span className="text-xs text-gray-400 font-semibold">/ {summary?.totalSubmissions || 0}</span>
                    </div>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-[#121216] border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Similarity</span>
                    <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
                        {summary?.averageSimilarity || 0}%
                    </span>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-[#121216] border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">High / Very High Flagged</span>
                    <span className="text-2xl font-extrabold text-orange-600 dark:text-orange-400 mt-2">
                        {(summary?.highCount || 0) + (summary?.veryHighCount || 0)}
                    </span>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-[#121216] border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reviewed By Teacher</span>
                    <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                        {summary?.reviewedCount || 0}
                    </span>
                </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-white dark:bg-[#121216] rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative w-full">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Search student name..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none"
                        />
                    </div>

                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-gray-300 outline-none"
                    >
                        <option value="all">All Similarity Levels</option>
                        <option value="low">Low (0–14%)</option>
                        <option value="moderate">Moderate (15–29%)</option>
                        <option value="high">High (30–49%)</option>
                        <option value="very_high">Very High (50%+)</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleBatchAnalyze}
                        disabled={batchAnalyzing}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {batchAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        Batch Analyze All
                    </button>

                    <button
                        onClick={handleExportCSV}
                        className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                        title="Export Plagiarism CSV Report"
                    >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>

                    <button
                        onClick={fetchDashboard}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Reports Roster Table */}
            <div className="bg-white dark:bg-[#121216] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Originality Roster ({filteredReports.length})
                    </h4>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] text-gray-500 font-bold uppercase text-[10px]">
                                <th className="p-3.5 pl-6">Student</th>
                                <th className="p-3.5">Similarity</th>
                                <th className="p-3.5">Exact Match</th>
                                <th className="p-3.5">Matched Peers</th>
                                <th className="p-3.5">Words</th>
                                <th className="p-3.5">Status</th>
                                <th className="p-3.5 pr-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium text-gray-700 dark:text-gray-300">
                            {filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400">
                                        No originality reports found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map(r => (
                                    <tr key={r._id} className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="p-3.5 pl-6 font-bold text-gray-900 dark:text-white">
                                            {r.studentId?.fullname || 'Student'}
                                        </td>
                                        <td className="p-3.5">
                                            {getScoreBadge(r.overallSimilarityPercent, r.category)}
                                        </td>
                                        <td className="p-3.5">{r.exactMatchPercent}%</td>
                                        <td className="p-3.5">{(r.matchedSubmissions || []).length} sources</td>
                                        <td className="p-3.5">{r.analyzedWordCount || 0}</td>
                                        <td className="p-3.5">
                                            {r.isReviewed ? (
                                                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Reviewed
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-400">Pending Review</span>
                                            )}
                                        </td>
                                        <td className="p-3.5 pr-6 text-right">
                                            <button
                                                onClick={() => setSelectedSubmissionId(r.submissionId)}
                                                className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 text-xs font-bold transition-colors"
                                            >
                                                Inspect Evidence
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Evidence Modal */}
            {selectedSubmissionId && (
                <PlagiarismReportPanel
                    isOpen={Boolean(selectedSubmissionId)}
                    onClose={() => setSelectedSubmissionId(null)}
                    submissionId={selectedSubmissionId}
                    taskId={taskId}
                    isTeacher={isTeacher}
                />
            )}
        </div>
    );
};

export default PlagiarismDashboard;
