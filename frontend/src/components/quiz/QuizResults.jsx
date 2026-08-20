import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import { 
    ArrowLeft, 
    Loader, 
    Users, 
    Target, 
    CheckCircle2, 
    AlertCircle, 
    Search, 
    Filter, 
    Award, 
    Clock, 
    MessageSquare, 
    Check, 
    X, 
    TrendingUp, 
    FileText,
    Calendar,
    Save,
    ShieldAlert,
    Share2,
    Download
} from 'lucide-react';

const QuizResults = ({ quiz, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState({ analytics: {}, attempts: [], questions: [] });
    const [selectedAttempt, setSelectedAttempt] = useState(null);
    const [evaluations, setEvaluations] = useState({}); // { [questionId]: { marksAwarded: number, feedback: string } }
    const [overallFeedback, setOverallFeedback] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [releaseLoading, setReleaseLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/results`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setResults({ analytics: data.analytics || {}, attempts: data.attempts || [], questions: data.questions || [] });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAttemptForGrading = (attempt) => {
        setSelectedAttempt(attempt);
        setOverallFeedback(attempt.teacherFeedback || '');
        
        const initialEvals = {};
        if (Array.isArray(attempt.answers)) {
            attempt.answers.forEach(ans => {
                const qId = ans.questionId?._id || ans.questionId;
                if (qId) {
                    initialEvals[qId.toString()] = {
                        marksAwarded: ans.marksAwarded !== undefined ? ans.marksAwarded : 0,
                        feedback: ans.feedback || ''
                    };
                }
            });
        }
        setEvaluations(initialEvals);
    };

    const handleQuestionEvalChange = (questionId, field, value) => {
        setEvaluations(prev => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                [field]: value
            }
        }));
    };

    const handleEvaluateSubmit = async () => {
        if (!selectedAttempt) return;
        setSubmitLoading(true);

        const questionEvaluations = Object.entries(evaluations).map(([questionId, data]) => ({
            questionId,
            marksAwarded: Number(data.marksAwarded) || 0,
            feedback: data.feedback || ''
        }));

        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/attempt/${selectedAttempt._id}/evaluate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionEvaluations,
                    teacherFeedback: overallFeedback
                }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert('Evaluation finalized successfully!');
                setSelectedAttempt(null);
                fetchResults();
            } else {
                alert(data.message || 'Failed to save evaluation.');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred while saving the evaluation.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleReleaseResults = async () => {
        if (!window.confirm("Are you sure you want to release grades and answer explanations to all students?")) return;
        setReleaseLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/release-results`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert("Results released successfully!");
                fetchResults();
            } else {
                alert(data.message || "Failed to release results.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setReleaseLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-[calc(100vh-180px)] flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-pink-500" />
            </div>
        );
    }

    const { analytics = {}, attempts = [], questions = [] } = results;

    const filteredAttempts = attempts.filter(att => {
        const studentName = att.studentId?.fullname?.toLowerCase() || '';
        const studentEmail = att.studentId?.email?.toLowerCase() || '';
        const matchesQuery = !searchQuery || studentName.includes(searchQuery.toLowerCase()) || studentEmail.includes(searchQuery.toLowerCase());
        
        if (statusFilter === 'all') return matchesQuery;
        if (statusFilter === 'pending') return matchesQuery && att.status === 'submitted';
        if (statusFilter === 'graded') return matchesQuery && att.status === 'graded';
        if (statusFilter === 'expired') return matchesQuery && att.status === 'expired';
        if (statusFilter === 'suspicious') return matchesQuery && Array.isArray(att.suspiciousEvents) && att.suspiciousEvents.length > 0;
        return matchesQuery;
    });

    const subjectiveQuestions = questions.filter(q => q.type === 'short_answer' || q.type === 'long_answer');

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                {quiz.title} — Assessment Evaluation
                            </h2>
                            <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-lg bg-pink-500/10 text-pink-500 border border-pink-500/20">
                                {quiz.topic || 'General'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Total Marks: <span className="font-bold text-slate-700 dark:text-slate-300">{quiz.totalMarks}</span> • Time Limit: <span className="font-bold text-slate-700 dark:text-slate-300">{quiz.timeLimit}m</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Export CSV */}
                    <a
                        href={`${API_BASE_URL}/api/quiz/${quiz._id}/export/csv`}
                        download
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                    </a>

                    {/* Release Results Toggle */}
                    <button
                        onClick={handleReleaseResults}
                        disabled={releaseLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                    >
                        {releaseLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                        <span>Release Results to Students</span>
                    </button>
                </div>
            </div>

            {/* Analytics Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-black uppercase tracking-wider">Attempts</span>
                        <Users className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{analytics.totalAttempts || 0}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{analytics.gradedCount || 0} Graded • {analytics.pendingCount || 0} Pending</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-black uppercase tracking-wider">Average</span>
                        <Target className="w-4 h-4 text-pink-500" />
                    </div>
                    <p className="text-2xl font-black text-pink-600 dark:text-pink-400">{analytics.averageScore || 0} <span className="text-xs text-slate-400 font-normal">/ {quiz.totalMarks}</span></p>
                    <p className="text-[11px] text-slate-400 font-medium">Class Avg: {analytics.averagePercentage || 0}%</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-black uppercase tracking-wider">Pass Rate</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-emerald-500">{analytics.passRate || 0}%</p>
                    <p className="text-[11px] text-slate-400 font-medium">Min: {analytics.passingScore || (quiz.totalMarks * 0.5)} pts</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-black uppercase tracking-wider">High / Low</span>
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{analytics.highestScore || 0} <span className="text-xs text-slate-400 font-normal">/ {analytics.lowestScore || 0}</span></p>
                    <p className="text-[11px] text-slate-400 font-medium">Points range</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-black uppercase tracking-wider">Action Needed</span>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-amber-500">{analytics.pendingCount || 0}</p>
                    <p className="text-[11px] text-slate-400 font-medium">Subjective grading</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 ml-1" />
                    <input
                        type="text"
                        placeholder="Search student by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none font-medium"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                    {[
                        { id: 'all', label: 'All Attempts' },
                        { id: 'pending', label: `Pending (${analytics.pendingCount || 0})` },
                        { id: 'graded', label: 'Graded' },
                        { id: 'expired', label: 'Expired' },
                        { id: 'suspicious', label: 'Integrity Alerts' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setStatusFilter(f.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                statusFilter === f.id 
                                    ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Student Attempts Table */}
            {filteredAttempts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm">
                    <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <p className="font-bold text-base text-slate-800 dark:text-slate-200">No student attempts found</p>
                    <p className="text-xs text-slate-400 mt-1">Student submissions will appear here for review and grading.</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-black uppercase tracking-wider text-slate-400">
                                <th className="p-4 pl-6">Student</th>
                                <th className="p-4 text-center">Attempt</th>
                                <th className="p-4 text-center">Submitted At</th>
                                <th className="p-4 text-center">Score</th>
                                <th className="p-4 text-center">Integrity</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right pr-6">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium text-slate-800 dark:text-slate-200">
                            {filteredAttempts.map(att => {
                                const suspiciousCount = Array.isArray(att.suspiciousEvents) ? att.suspiciousEvents.length : 0;
                                return (
                                    <tr key={att._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold text-xs shrink-0">
                                                    {att.studentId?.fullname?.[0]?.toUpperCase() || 'S'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{att.studentId?.fullname || 'Unknown Student'}</p>
                                                    <p className="text-[11px] text-slate-400">{att.studentId?.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4 text-center font-bold">
                                            #{att.attemptNumber}
                                        </td>

                                        <td className="p-4 text-center text-slate-500 dark:text-slate-400">
                                            {att.submittedAt ? new Date(att.submittedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </td>

                                        <td className="p-4 text-center">
                                            <span className="font-black text-sm text-pink-600 dark:text-pink-400">
                                                {att.score}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold ml-1">
                                                ({att.percentage || 0}%)
                                            </span>
                                        </td>

                                        <td className="p-4 text-center">
                                            {suspiciousCount > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20" title={`${suspiciousCount} tab-switch or window blur incidents logged`}>
                                                    <ShieldAlert className="w-3 h-3" /> {suspiciousCount} Alerts
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-emerald-500">Normal</span>
                                            )}
                                        </td>

                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                att.status === 'graded' 
                                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                                    : att.status === 'submitted' 
                                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                            }`}>
                                                {att.status === 'submitted' ? 'Needs Review' : att.status}
                                            </span>
                                        </td>

                                        <td className="p-4 pr-6 text-right">
                                            <button
                                                onClick={() => handleSelectAttemptForGrading(att)}
                                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                    att.status === 'submitted'
                                                        ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-600/20'
                                                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                {att.status === 'submitted' ? 'Grade Answers' : 'Review Attempt'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TEACHER EVALUATION MODAL                                                  */}
            {/* ========================================================================= */}
            {selectedAttempt && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-6 animate-scaleUp">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    Evaluating: {selectedAttempt.studentId?.fullname} (Attempt #{selectedAttempt.attemptNumber})
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Current Score: <span className="font-bold text-pink-500">{selectedAttempt.score}</span> / {quiz.totalMarks} • Status: <span className="uppercase font-bold">{selectedAttempt.status}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedAttempt(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Suspicious Events Alert Banner in Evaluation */}
                        {Array.isArray(selectedAttempt.suspiciousEvents) && selectedAttempt.suspiciousEvents.length > 0 && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                    <ShieldAlert className="w-4 h-4" /> Integrity Telemetry ({selectedAttempt.suspiciousEvents.length} Incidents)
                                </div>
                                <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                                    {selectedAttempt.suspiciousEvents.map((ev, idx) => (
                                        <p key={idx} className="text-[11px] text-slate-600 dark:text-slate-400">
                                            • <span className="font-bold text-amber-500">{new Date(ev.timestamp).toLocaleTimeString()}:</span> {ev.details || ev.eventType}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Subjective Short / Long Answers Grading Section */}
                        {subjectiveQuestions.length > 0 ? (
                            <div className="space-y-6">
                                <h4 className="text-xs font-black uppercase tracking-wider text-pink-500 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4" /> Subjective Questions Requiring Teacher Evaluation
                                </h4>

                                {subjectiveQuestions.map((q, idx) => {
                                    const userAns = selectedAttempt.answers?.find(a => a.questionId?.toString() === q._id?.toString() || a.questionId === q._id);
                                    const currentAward = evaluations[q._id.toString()]?.marksAwarded ?? (userAns?.marksAwarded || 0);
                                    const currentFeedback = evaluations[q._id.toString()]?.feedback ?? (userAns?.feedback || '');

                                    return (
                                        <div key={q._id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                                            <div className="flex justify-between items-start gap-3">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                    <span className="text-pink-500 mr-2">Q{idx + 1}.</span> {q.questionText}
                                                </p>
                                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                                    Max {q.marks} Pts
                                                </span>
                                            </div>

                                            {/* Student's answer */}
                                            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                                                <p className="text-[10px] font-black uppercase text-slate-400">Student Response:</p>
                                                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">
                                                    {userAns?.textAnswer || <span className="italic text-slate-400">No response provided.</span>}
                                                </p>
                                            </div>

                                            {/* Reference answer */}
                                            {q.referenceAnswer && (
                                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-1">
                                                    <p className="text-[10px] font-black uppercase text-emerald-500">Grading Rubric / Reference:</p>
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">
                                                        {q.referenceAnswer}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Teacher Scoring Inputs */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                                        Marks (0 - {q.marks})
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={q.marks}
                                                        value={currentAward}
                                                        onChange={(e) => handleQuestionEvalChange(q._id.toString(), 'marksAwarded', Math.min(q.marks, Math.max(0, Number(e.target.value))))}
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-pink-500"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                                        Question Specific Feedback
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={currentFeedback}
                                                        onChange={(e) => handleQuestionEvalChange(q._id.toString(), 'feedback', e.target.value)}
                                                        placeholder="Provide constructive feedback for this answer..."
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-pink-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                All questions in this quiz are objective and have been automatically graded.
                            </div>
                        )}

                        {/* Overall Attempt Feedback */}
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Overall Teacher Remarks / Feedback
                            </label>
                            <textarea
                                value={overallFeedback}
                                onChange={(e) => setOverallFeedback(e.target.value)}
                                placeholder="Add overall assessment remarks visible to the student..."
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs outline-none focus:border-pink-500 h-20 resize-none text-slate-900 dark:text-white font-medium"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setSelectedAttempt(null)}
                                className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleEvaluateSubmit}
                                disabled={submitLoading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                            >
                                {submitLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Finalize & Save Evaluation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizResults;
