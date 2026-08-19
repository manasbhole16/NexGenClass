import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import {
    ArrowLeft,
    BarChart3,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileSpreadsheet,
    Filter,
    HelpCircle,
    Loader,
    Lock,
    Mail,
    PieChart,
    RefreshCw,
    Search,
    Shield,
    Sliders,
    Star,
    Award,
    TrendingUp,
    Users,
    X,
    FileText,
    CheckSquare,
    Radio,
    Save
} from 'lucide-react';

const FormAnalytics = ({ formId, roomId, onBack }) => {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'questions' | 'grading' | 'export'
    const [loading, setLoading] = useState(true);
    const [overviewData, setOverviewData] = useState(null);
    const [questionAnalytics, setQuestionAnalytics] = useState(null);
    const [rosterData, setRosterData] = useState([]);
    const [responsesList, setResponsesList] = useState([]);
    const [error, setError] = useState(null);

    // Grading modal state
    const [selectedStudentResponse, setSelectedStudentResponse] = useState(null);
    const [gradingLoading, setGradingLoading] = useState(false);
    const [gradingGrades, setGradingGrades] = useState({});
    const [gradingSubmitting, setGradingSubmitting] = useState(false);
    const [gradingError, setGradingError] = useState(null);
    const [gradingSuccess, setGradingSuccess] = useState(null);

    // Filter and search
    const [searchQuery, setSearchQuery] = useState('');
    const [gradingFilter, setGradingFilter] = useState('All'); // 'All' | 'pending' | 'partially_graded' | 'graded'

    // Export loading states
    const [exportingCSV, setExportingCSV] = useState(false);
    const [exportingXLSX, setExportingXLSX] = useState(false);
    const [exportMessage, setExportMessage] = useState(null);

    const loadAllAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch Overview Analytics
            const ovRes = await fetch(`${API_BASE_URL}/api/forms/${formId}/analytics`, { credentials: 'include' });
            const ovData = await ovRes.json();
            if (ovData.success) {
                setOverviewData(ovData);
            } else {
                setError(ovData.message || 'Failed to load form analytics');
            }

            // 2. Fetch Question Analytics
            const qRes = await fetch(`${API_BASE_URL}/api/forms/${formId}/question-analytics`, { credentials: 'include' });
            const qData = await qRes.json();
            if (qData.success) {
                setQuestionAnalytics(qData);
            }

            // 3. Fetch Participation Roster
            const rRes = await fetch(`${API_BASE_URL}/api/forms/${formId}/response-status`, { credentials: 'include' });
            const rData = await rRes.json();
            if (rData.success) {
                setRosterData(rData.participation || []);
            }

            // 4. Fetch All Submissions
            const respRes = await fetch(`${API_BASE_URL}/api/forms/${formId}/responses`, { credentials: 'include' });
            const respData = await respRes.json();
            if (respData.success) {
                setResponsesList(respData.responses || []);
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('Network error while loading analytics data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (formId) {
            loadAllAnalytics();
        }
    }, [formId]);

    // Open Student Grading Drawer/Modal
    const handleOpenGrading = async (responseId) => {
        try {
            setGradingLoading(true);
            setGradingError(null);
            setGradingSuccess(null);

            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/responses/${responseId}`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setSelectedStudentResponse(data);
                // Prepopulate grades state
                const initialGrades = {};
                (data.answers || []).forEach((ans) => {
                    initialGrades[ans.questionId] = {
                        awardedMarks: ans.awardedMarks !== undefined ? ans.awardedMarks : 0,
                        feedback: ans.feedback || ''
                    };
                });
                setGradingGrades(initialGrades);
            } else {
                setGradingError(data.message || 'Could not load response detail.');
            }
        } catch (err) {
            console.error('Error opening grading modal:', err);
            setGradingError('Network error loading response detail.');
        } finally {
            setGradingLoading(false);
        }
    };

    const handleSaveGrading = async () => {
        if (!selectedStudentResponse?.response?._id) return;
        try {
            setGradingSubmitting(true);
            setGradingError(null);
            setGradingSuccess(null);

            const gradesPayload = Object.entries(gradingGrades).map(([qId, val]) => ({
                questionId: qId,
                awardedMarks: Number(val.awardedMarks) || 0,
                feedback: val.feedback || ''
            }));

            const res = await fetch(
                `${API_BASE_URL}/api/forms/${formId}/responses/${selectedStudentResponse.response._id}/grade`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ grades: gradesPayload })
                }
            );

            const data = await res.json();
            if (data.success) {
                setGradingSuccess('Grading saved successfully!');
                // Reload data in background
                loadAllAnalytics();
                setTimeout(() => {
                    setSelectedStudentResponse(null);
                    setGradingSuccess(null);
                }, 1200);
            } else {
                setGradingError(data.message || 'Failed to save grading.');
            }
        } catch (err) {
            console.error('Error saving grading:', err);
            setGradingError('Network error saving grading.');
        } finally {
            setGradingSubmitting(false);
        }
    };

    // CSV Download
    const handleDownloadCSV = async () => {
        try {
            setExportingCSV(true);
            setExportMessage(null);
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/export/csv`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to generate CSV export.');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `form_${formId}_responses.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setExportMessage('CSV exported successfully!');
        } catch (err) {
            console.error('CSV Export error:', err);
            setExportMessage('Error exporting CSV.');
        } finally {
            setExportingCSV(false);
        }
    };

    // Excel Download
    const handleDownloadXLSX = async () => {
        try {
            setExportingXLSX(true);
            setExportMessage(null);
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/export/xlsx`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to generate Excel export.');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `form_${formId}_report.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setExportMessage('Excel workbook exported successfully!');
        } catch (err) {
            console.error('Excel Export error:', err);
            setExportMessage('Error exporting Excel report.');
        } finally {
            setExportingXLSX(false);
        }
    };

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
                <Loader className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
                <p className="text-xs text-gray-500 font-semibold">Loading Form Analytics & Insights...</p>
            </div>
        );
    }

    // Filtered Roster for Grading
    const filteredRoster = rosterData.filter((st) => {
        const matchesSearch =
            !searchQuery ||
            st.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            st.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
            gradingFilter === 'All' ||
            (gradingFilter === 'pending' && (!st.responded || st.gradingStatus === 'pending')) ||
            (gradingFilter === 'partially_graded' && st.gradingStatus === 'partially_graded') ||
            (gradingFilter === 'graded' && st.gradingStatus === 'graded');
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Top Navigation & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-purple-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Forms
                </button>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadAllAnalytics}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
                        title="Refresh analytics"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                </div>
            </div>

            {/* Title & Tabs Card */}
            <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                Analytics & Grading
                            </span>
                            {overviewData?.scoring?.hasScoring && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <Award className="w-3 h-3" /> Auto-Scoring Active
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                            {overviewData?.formTitle || 'Form Analytics'}
                        </h1>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex flex-wrap items-center gap-1 bg-gray-100 dark:bg-[#222228] p-1 rounded-2xl">
                        {[
                            { id: 'overview', label: 'Overview', icon: BarChart3 },
                            { id: 'questions', label: 'Questions', icon: HelpCircle },
                            { id: 'grading', label: 'Grading & Review', icon: Award },
                            { id: 'export', label: 'Export', icon: Download }
                        ].map((t) => {
                            const Icon = t.icon;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                        activeTab === t.id
                                            ? 'bg-white dark:bg-[#18181c] text-purple-600 dark:text-purple-400 shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* KPI Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <div className="bg-purple-50/50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 rounded-2xl p-4">
                        <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Total Responses</div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                            {overviewData?.totalResponses || 0}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                            {overviewData?.uniqueRespondents || 0} unique students
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl p-4">
                        <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Response Rate</div>
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                            {overviewData?.responseRate || 0}%
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                            {overviewData?.enrolledStudents || 0} enrolled students
                        </div>
                    </div>

                    <div className="bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl p-4">
                        <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Average Score</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {overviewData?.scoring?.averageScore || 0}{' '}
                            <span className="text-xs font-semibold text-gray-400">
                                / {overviewData?.scoring?.totalMarks || 0}
                            </span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                            Avg Percentage: {overviewData?.scoring?.averagePercentage || 0}%
                        </div>
                    </div>

                    <div className="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 rounded-2xl p-4">
                        <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Score Range</div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                            {overviewData?.scoring?.highestScore || 0}
                            <span className="text-sm font-bold text-gray-400"> max / </span>
                            {overviewData?.scoring?.lowestScore || 0}
                            <span className="text-xs font-semibold text-gray-400"> min</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                            {overviewData?.pendingResponses || 0} pending response(s)
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB 1: OVERVIEW & SCORE DISTRIBUTION */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Score Distribution Chart Card */}
                    <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                                    Score Distribution
                                </h3>
                            </div>
                            <span className="text-xs text-gray-400">
                                {overviewData?.scoring?.scoredResponsesCount || 0} graded submission(s)
                            </span>
                        </div>

                        {/* Distribution Bars */}
                        <div className="space-y-3 pt-2">
                            {(overviewData?.scoring?.scoreDistribution || []).map((dist) => {
                                const totalScored = overviewData?.scoring?.scoredResponsesCount || 1;
                                const barPercent = Math.round((dist.count / totalScored) * 100);

                                return (
                                    <div key={dist.range} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                                            <span>{dist.range}</span>
                                            <span>
                                                {dist.count} student(s) ({barPercent}%)
                                            </span>
                                        </div>
                                        <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                                                style={{ width: `${barPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: QUESTION ANALYTICS */}
            {activeTab === 'questions' && (
                <div className="space-y-6">
                    {(questionAnalytics?.questions || []).map((q, idx) => (
                        <div
                            key={q.questionId || idx}
                            className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 p-6 sm:p-7 shadow-sm space-y-4"
                        >
                            {/* Question Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
                                <div>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 mr-2">
                                        Q{idx + 1} • {q.questionType.replace('_', ' ').toUpperCase()}
                                    </span>
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                        Marks: {q.marks || 1}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400">
                                    Answered: <strong className="text-gray-700 dark:text-gray-200">{q.answeredCount}</strong> / {q.totalResponses}
                                </div>
                            </div>

                            <h3 className="font-bold text-base text-gray-900 dark:text-white">
                                {q.questionText}
                            </h3>

                            {/* Option Distribution Bars for Objective Questions */}
                            {['multiple_choice', 'checkboxes', 'dropdown'].includes(q.questionType) && (
                                <div className="space-y-3 pt-2">
                                    {(q.optionsBreakdown || []).map((opt, oIdx) => (
                                        <div key={oIdx} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs font-semibold">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-800 dark:text-gray-200">{opt.text}</span>
                                                    {opt.isCorrect && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircle2 className="w-3 h-3" /> Correct Key
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-gray-500">
                                                    {opt.count} ({opt.percentage}%)
                                                </span>
                                            </div>
                                            <div className="h-2.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        opt.isCorrect
                                                            ? 'bg-emerald-500'
                                                            : 'bg-purple-600 dark:bg-purple-500'
                                                    }`}
                                                    style={{ width: `${opt.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Text Response List for Descriptive Questions */}
                            {['short_answer', 'paragraph'].includes(q.questionType) && (
                                <div className="space-y-3 pt-2">
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                        Student Responses ({q.textResponses?.length || 0}):
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                        {(q.textResponses || []).length === 0 ? (
                                            <div className="text-xs text-gray-400 italic">No responses provided.</div>
                                        ) : (
                                            q.textResponses.map((tr, trIdx) => (
                                                <div
                                                    key={trIdx}
                                                    className="p-3 bg-gray-50 dark:bg-[#222228] rounded-xl border border-gray-200 dark:border-white/5 text-xs space-y-1"
                                                >
                                                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                                        <span>{tr.studentName}</span>
                                                        <span className="text-purple-600 dark:text-purple-400 font-bold">
                                                            {tr.awardedMarks !== undefined ? `Awarded: ${tr.awardedMarks}/${tr.maxMarks}` : 'Ungraded'}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 dark:text-gray-300 italic whitespace-pre-wrap">
                                                        "{tr.textAnswer}"
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* TAB 3: GRADING & REVIEW ROSTER */}
            {activeTab === 'grading' && (
                <div className="space-y-4">
                    {/* Search & Filter Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="relative flex-1 min-w-[240px] max-w-md">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by student name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500"
                            />
                        </div>

                        <div className="flex items-center gap-1 bg-white dark:bg-[#18181c] p-1 rounded-xl border border-gray-200 dark:border-white/10">
                            {['All', 'pending', 'partially_graded', 'graded'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setGradingFilter(st)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                                        gradingFilter === st
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                    }`}
                                >
                                    {st.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grading Roster Table */}
                    <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                        {filteredRoster.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 text-xs">
                                No students match your search or filter.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-white/5">
                                {filteredRoster.map((st) => (
                                    <div
                                        key={st.studentId}
                                        className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                                                {st.studentName ? st.studentName.charAt(0).toUpperCase() : 'S'}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {st.studentName}
                                                </div>
                                                <div className="text-[11px] text-gray-500">{st.email}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {st.responded ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                                            Score: {st.score !== null ? st.score : 0} / {st.totalMarks || overviewData?.scoring?.totalMarks || 0}
                                                        </div>
                                                        <span
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                                                st.gradingStatus === 'graded'
                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                                    : st.gradingStatus === 'partially_graded'
                                                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                                    : 'bg-gray-100 dark:bg-white/5 text-gray-500'
                                                            }`}
                                                        >
                                                            {st.gradingStatus ? st.gradingStatus.replace('_', ' ') : 'Pending'}
                                                        </span>
                                                    </div>

                                                    <button
                                                        onClick={() => handleOpenGrading(st.responseId)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                                                    >
                                                        <Award className="w-3.5 h-3.5" /> Grade
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-bold text-gray-400 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                                                    Not Responded
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: EXPORTS */}
            {activeTab === 'export' && (
                <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 p-8 shadow-sm space-y-6">
                    <div>
                        <h3 className="font-black text-xl text-gray-900 dark:text-white">
                            Export Form Responses & Gradebook
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Download comprehensive submission records, student answers, and question analytics.
                        </p>
                    </div>

                    {exportMessage && (
                        <div className="p-3.5 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl text-xs font-bold text-purple-700 dark:text-purple-300">
                            {exportMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {/* CSV Export Card */}
                        <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex flex-col justify-between space-y-4">
                            <div className="space-y-2">
                                <div className="p-3 w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-base text-gray-900 dark:text-white">CSV Spreadsheet</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Standard comma-separated file compatible with Google Sheets, Excel, and analytics software.
                                </p>
                            </div>

                            <button
                                onClick={handleDownloadCSV}
                                disabled={exportingCSV}
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50"
                            >
                                <Download className="w-4 h-4" />
                                {exportingCSV ? 'Exporting...' : 'Download CSV'}
                            </button>
                        </div>

                        {/* Excel Export Card */}
                        <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex flex-col justify-between space-y-4">
                            <div className="space-y-2">
                                <div className="p-3 w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-base text-gray-900 dark:text-white">Excel Report (.xlsx)</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Formatted workbook with 3 tabs: Responses, Question Analytics, and Participation.
                                </p>
                            </div>

                            <button
                                onClick={handleDownloadXLSX}
                                disabled={exportingXLSX}
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50"
                            >
                                <Download className="w-4 h-4" />
                                {exportingXLSX ? 'Generating Excel...' : 'Download Excel (.xlsx)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Individual Grading Modal */}
            {selectedStudentResponse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#18181c] w-full max-w-3xl rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                            <div>
                                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                                    Grading: {selectedStudentResponse.student?.fullname}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {selectedStudentResponse.student?.email} • Total Score:{' '}
                                    <strong className="text-purple-600 dark:text-purple-400">
                                        {selectedStudentResponse.score || 0} / {selectedStudentResponse.totalMarks || 0}
                                    </strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedStudentResponse(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                            {gradingError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl">
                                    {gradingError}
                                </div>
                            )}
                            {gradingSuccess && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold rounded-xl">
                                    {gradingSuccess}
                                </div>
                            )}

                            {(selectedStudentResponse.answers || []).map((ans, idx) => {
                                const currentGrade = gradingGrades[ans.questionId] || { awardedMarks: 0, feedback: '' };

                                return (
                                    <div
                                        key={ans.questionId || idx}
                                        className="p-5 rounded-2xl bg-gray-50 dark:bg-[#222228]/60 border border-gray-200 dark:border-white/5 space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 mr-2">
                                                    Q{idx + 1}
                                                </span>
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {ans.questionText}
                                                </span>
                                            </div>

                                            {/* Marks Input for Teacher */}
                                            <div className="flex items-center gap-1.5 flex-shrink-0 bg-white dark:bg-[#18181c] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10">
                                                <span className="text-xs font-bold text-gray-500">Marks:</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={ans.maxMarks}
                                                    value={currentGrade.awardedMarks}
                                                    onChange={(e) => {
                                                        const val = Math.min(
                                                            ans.maxMarks,
                                                            Math.max(0, parseInt(e.target.value, 10) || 0)
                                                        );
                                                        setGradingGrades((prev) => ({
                                                            ...prev,
                                                            [ans.questionId]: {
                                                                ...prev[ans.questionId],
                                                                awardedMarks: val
                                                            }
                                                        }));
                                                    }}
                                                    className="w-12 text-center bg-gray-50 dark:bg-[#222228] border border-gray-300 dark:border-white/20 rounded-lg text-xs font-black text-purple-600 dark:text-purple-400 outline-none"
                                                />
                                                <span className="text-xs font-bold text-gray-400">/ {ans.maxMarks}</span>
                                            </div>
                                        </div>

                                        {/* Student Answer */}
                                        <div className="p-3 bg-white dark:bg-[#18181c] rounded-xl border border-gray-200 dark:border-white/10 text-xs space-y-1">
                                            <div className="text-[10px] font-bold text-gray-400">Student's Answer:</div>
                                            {['short_answer', 'paragraph'].includes(ans.type) && (
                                                <p className="font-semibold text-gray-900 dark:text-white whitespace-pre-wrap">
                                                    {ans.textAnswer || <span className="italic text-gray-400 font-normal">No answer submitted</span>}
                                                </p>
                                            )}
                                            {['multiple_choice', 'dropdown'].includes(ans.type) && (
                                                <div className="font-bold text-purple-600 dark:text-purple-400">
                                                    {ans.selectedOption || <span className="italic text-gray-400 font-normal">No option selected</span>}
                                                </div>
                                            )}
                                            {ans.type === 'checkboxes' && (
                                                <div className="font-bold text-purple-600 dark:text-purple-400">
                                                    {(ans.selectedOptions || []).join(', ') || <span className="italic text-gray-400 font-normal">No options selected</span>}
                                                </div>
                                            )}
                                        </div>

                                        {/* Answer Key (if configured) */}
                                        {(ans.correctAnswer || (ans.correctAnswers && ans.correctAnswers.length > 0)) && (
                                            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>
                                                    Answer Key: {ans.correctAnswer || (ans.correctAnswers || []).join(', ')}
                                                </span>
                                            </div>
                                        )}

                                        {/* Feedback Input */}
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Add teacher feedback / remarks (optional)..."
                                                value={currentGrade.feedback}
                                                onChange={(e) =>
                                                    setGradingGrades((prev) => ({
                                                        ...prev,
                                                        [ans.questionId]: {
                                                            ...prev[ans.questionId],
                                                            feedback: e.target.value
                                                        }
                                                    }))
                                                }
                                                className="w-full px-3 py-2 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-purple-500 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                            <button
                                type="button"
                                onClick={() => setSelectedStudentResponse(null)}
                                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveGrading}
                                disabled={gradingSubmitting}
                                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {gradingSubmitting ? 'Saving...' : 'Save & Submit Grades'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormAnalytics;
