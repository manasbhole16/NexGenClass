import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import { 
    ArrowLeft, 
    Loader, 
    BarChart3, 
    TrendingUp, 
    Users, 
    Award, 
    Clock, 
    AlertTriangle, 
    CheckCircle2, 
    HelpCircle, 
    Download, 
    Search, 
    Filter, 
    FileText, 
    ChevronRight, 
    Layers, 
    Sparkles, 
    Zap,
    X,
    TrendingDown
} from 'lucide-react';

const QuizAnalytics = ({ quiz, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'questions' | 'students'
    const [analyticsData, setAnalyticsData] = useState(null);
    const [questionAnalytics, setQuestionAnalytics] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDetailLoading, setStudentDetailLoading] = useState(false);
    const [studentDetailData, setStudentDetailData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [bandFilter, setBandFilter] = useState('all');

    useEffect(() => {
        loadAllAnalytics();
    }, [quiz._id]);

    const loadAllAnalytics = async () => {
        try {
            setLoading(true);
            const [overviewRes, questionsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/analytics`, { credentials: 'include' }),
                fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/question-analytics`, { credentials: 'include' })
            ]);

            const overviewData = await overviewRes.json();
            const qData = await questionsRes.json();

            if (overviewData.success) {
                setAnalyticsData(overviewData);
            }
            if (qData.success) {
                setQuestionAnalytics(qData.questions || []);
            }
        } catch (err) {
            console.error("Failed to load quiz analytics:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenStudentDetail = async (studentId) => {
        setSelectedStudent(studentId);
        setStudentDetailLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/student/${studentId}/analytics`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setStudentDetailData(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setStudentDetailLoading(false);
        }
    };

    const handleExportCSV = () => {
        window.open(`${API_BASE_URL}/api/quiz/${quiz._id}/export/csv`, '_blank');
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0m 0s';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    if (loading) {
        return (
            <div className="h-[calc(100vh-180px)] flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-pink-500" />
            </div>
        );
    }

    if (!analyticsData || !analyticsData.summary) {
        return (
            <div className="max-w-2xl mx-auto text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
                <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Analytics Data Available</h3>
                <p className="text-xs text-slate-400">At least one student must complete an attempt to generate performance insights.</p>
                <button onClick={onBack} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all">
                    Back to Quizzes
                </button>
            </div>
        );
    }

    const { summary, scoreDistribution, timeAnalytics, topicAnalytics, insights, studentPerformances = [] } = analyticsData;

    const filteredStudents = studentPerformances.filter(st => {
        const matchesSearch = !searchQuery || st.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || st.studentEmail.toLowerCase().includes(searchQuery.toLowerCase());
        if (bandFilter === 'all') return matchesSearch;
        if (bandFilter === 'high') return matchesSearch && st.latestPercentage >= 80;
        if (bandFilter === 'mid') return matchesSearch && st.latestPercentage >= 60 && st.latestPercentage < 80;
        if (bandFilter === 'low') return matchesSearch && st.latestPercentage < 60;
        return matchesSearch;
    });

    const maxDistributionCount = Math.max(...Object.values(scoreDistribution || {}), 1);

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                {quiz.title} — Analytics & Reports
                            </h2>
                            <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                {quiz.topic || 'General'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Total Marks: <span className="font-bold text-slate-700 dark:text-slate-300">{quiz.totalMarks}</span> • Enrolled: <span className="font-bold text-slate-700 dark:text-slate-300">{summary.totalEnrolled || 0}</span> • Submissions: <span className="font-bold text-slate-700 dark:text-slate-300">{summary.totalAttempts || 0}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all shadow-sm"
                    >
                        <Download className="w-4 h-4" /> Export CSV Report
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                {[
                    { id: 'overview', label: 'Performance Overview', icon: BarChart3 },
                    { id: 'questions', label: `Question Item Analysis (${questionAnalytics.length})`, icon: HelpCircle },
                    { id: 'students', label: `Student Roster (${studentPerformances.length})`, icon: Users }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                                isActive 
                                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ================================================================= */}
            {/* TAB 1: PERFORMANCE OVERVIEW                                       */}
            {/* ================================================================= */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Top Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-400">Class Average</span>
                            <p className="text-3xl font-black text-pink-600 dark:text-pink-400">{summary.averagePercentage}%</p>
                            <p className="text-[11px] text-slate-400 font-medium">Mean Score: {summary.averageScore} / {quiz.totalMarks}</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-400">Median Score</span>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">{summary.medianScore} <span className="text-xs font-normal text-slate-400">pts</span></p>
                            <p className="text-[11px] text-slate-400 font-medium">Spread: {insights.scoreSpread} pts</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-400">Score Range</span>
                            <p className="text-3xl font-black text-emerald-500">{summary.highestScore} <span className="text-xs text-slate-400">/ {summary.lowestScore}</span></p>
                            <p className="text-[11px] text-slate-400 font-medium">High: {summary.highestScore} • Low: {summary.lowestScore}</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-400">Average Duration</span>
                            <p className="text-3xl font-black text-indigo-500">{formatDuration(timeAnalytics.averageDurationSeconds)}</p>
                            <p className="text-[11px] text-slate-400 font-medium">Fastest: {formatDuration(timeAnalytics.fastestDurationSeconds)}</p>
                        </div>
                    </div>

                    {/* Score Distribution & Insights Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Score Distribution Histogram (7 cols) */}
                        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Score Distribution</h3>
                                    <p className="text-xs text-slate-400">Percentage tiers across all student attempts.</p>
                                </div>
                                <BarChart3 className="w-5 h-5 text-slate-400" />
                            </div>

                            <div className="space-y-3 pt-2">
                                {Object.entries(scoreDistribution || {}).map(([tier, count]) => {
                                    const widthPct = Math.round((count / maxDistributionCount) * 100);
                                    return (
                                        <div key={tier} className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-600 dark:text-slate-300">{tier}</span>
                                                <span className="text-slate-400">{count} {count === 1 ? 'attempt' : 'attempts'}</span>
                                            </div>
                                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    style={{ width: `${Math.max(widthPct, count > 0 ? 6 : 0)}%` }}
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        tier === '81-100%' ? 'bg-emerald-500' :
                                                        tier === '61-80%' ? 'bg-blue-500' :
                                                        tier === '41-60%' ? 'bg-indigo-500' :
                                                        tier === '21-40%' ? 'bg-amber-500' :
                                                        'bg-red-500'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Diagnostic Insights Cards (5 cols) */}
                        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <Sparkles className="w-5 h-5 text-pink-500" />
                                <h3 className="text-sm font-black text-slate-900 dark:text-white">Diagnostic Insights</h3>
                            </div>

                            {insights.mostDifficultQuestion && (
                                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-bold text-red-500">
                                        <span className="flex items-center gap-1 font-black uppercase"><AlertTriangle className="w-3.5 h-3.5" /> Highest Error Rate</span>
                                        <span>{insights.mostDifficultQuestion.accuracy}% Accuracy</span>
                                    </div>
                                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium line-clamp-2">
                                        "{insights.mostDifficultQuestion.questionText}"
                                    </p>
                                </div>
                            )}

                            {insights.easiestQuestion && (
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-bold text-emerald-500">
                                        <span className="flex items-center gap-1 font-black uppercase"><CheckCircle2 className="w-3.5 h-3.5" /> Highest Mastery</span>
                                        <span>{insights.easiestQuestion.accuracy}% Accuracy</span>
                                    </div>
                                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium line-clamp-2">
                                        "{insights.easiestQuestion.questionText}"
                                    </p>
                                </div>
                            )}

                            {/* Topic Performance */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400">Topic Performance</span>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">{topicAnalytics.topic}</p>
                                <p className="text-xs text-slate-500">Avg: {topicAnalytics.averagePercentage}% across {topicAnalytics.attemptCount} submissions</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* TAB 2: QUESTION ITEM LEVEL ANALYTICS                              */}
            {/* ================================================================= */}
            {activeTab === 'questions' && (
                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs font-bold text-slate-500">
                        <span>Difficulty Legend: Easy (≥80% Correct), Moderate (60–79%), Difficult (&lt;60%)</span>
                        <span>Total Questions: {questionAnalytics.length}</span>
                    </div>

                    <div className="space-y-4">
                        {questionAnalytics.map((q) => (
                            <div key={q.questionId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-7 h-7 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 font-black text-xs flex items-center justify-center">
                                            {q.questionNumber}
                                        </span>
                                        <span className="text-xs font-bold uppercase text-slate-400">{q.type.replace('_', ' ')}</span>
                                        <span className="text-xs font-bold text-slate-500">({q.marks} Pts)</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                                            q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                            q.difficulty === 'Moderate' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                            'bg-red-500/10 text-red-500 border border-red-500/20'
                                        }`}>
                                            {q.difficulty}
                                        </span>
                                        <span className="text-xs font-black text-slate-900 dark:text-white px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                                            {q.accuracyPercentage}% Accuracy
                                        </span>
                                    </div>
                                </div>

                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                                    {q.questionText}
                                </p>

                                {/* Option Frequency Distribution */}
                                {Array.isArray(q.options) && q.options.length > 0 && (
                                    <div className="space-y-2 pt-2">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Option Selection Breakdown:</p>
                                        <div className="space-y-2">
                                            {q.options.map((opt, oIdx) => (
                                                <div key={oIdx} className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                                                            <span className={`font-medium ${opt.isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                {opt.text}
                                                            </span>
                                                            {opt.isCorrect && (
                                                                <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500">Correct</span>
                                                            )}
                                                        </div>
                                                        <span className="text-slate-400 font-bold">{opt.count} students ({opt.percentage}%)</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            style={{ width: `${opt.percentage}%` }}
                                                            className={`h-full rounded-full ${opt.isCorrect ? 'bg-emerald-500' : 'bg-pink-500/70'}`}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* TAB 3: STUDENT PERFORMANCE ROSTER                                 */}
            {/* ================================================================= */}
            {activeTab === 'students' && (
                <div className="space-y-6">
                    {/* Search & Performance Filter */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                            <Search className="w-4 h-4 text-slate-400 ml-1" />
                            <input
                                type="text"
                                placeholder="Search by student name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                            {[
                                { id: 'all', label: 'All Students' },
                                { id: 'high', label: 'Top Performers (≥80%)' },
                                { id: 'mid', label: 'Average (60-79%)' },
                                { id: 'low', label: 'Needs Support (<60%)' }
                            ].map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => setBandFilter(b.id)}
                                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        bandFilter === b.id 
                                            ? 'bg-pink-600 text-white shadow-md' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {b.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-black uppercase tracking-wider text-slate-400">
                                    <th className="p-4 pl-6">Student</th>
                                    <th className="p-4 text-center">Attempts</th>
                                    <th className="p-4 text-center">Best Score</th>
                                    <th className="p-4 text-center">Latest Result</th>
                                    <th className="p-4 text-center">Progression</th>
                                    <th className="p-4 text-right pr-6">Detail</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium text-slate-800 dark:text-slate-200">
                                {filteredStudents.map(st => (
                                    <tr key={st.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold text-xs shrink-0">
                                                    {st.studentName[0]?.toUpperCase() || 'S'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{st.studentName}</p>
                                                    <p className="text-[11px] text-slate-400">{st.studentEmail}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4 text-center font-bold text-slate-600 dark:text-slate-300">
                                            {st.attemptCount} {st.attemptCount === 1 ? 'attempt' : 'attempts'}
                                        </td>

                                        <td className="p-4 text-center font-black text-pink-600 dark:text-pink-400">
                                            {st.bestScore} pts
                                        </td>

                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                                st.latestPercentage >= 80 ? 'bg-emerald-500/10 text-emerald-500' :
                                                st.latestPercentage >= 60 ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-amber-500/10 text-amber-500'
                                            }`}>
                                                {st.latestScore} / {quiz.totalMarks} ({st.latestPercentage}%)
                                            </span>
                                        </td>

                                        <td className="p-4 text-center font-bold">
                                            {st.attemptCount > 1 ? (
                                                <span className={`flex items-center justify-center gap-1 ${st.improvementDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {st.improvementDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                                    {st.improvementDelta >= 0 ? `+${st.improvementDelta}%` : `${st.improvementDelta}%`}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 font-normal">Single Attempt</span>
                                            )}
                                        </td>

                                        <td className="p-4 pr-6 text-right">
                                            <button
                                                onClick={() => handleOpenStudentDetail(st.studentId)}
                                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                                            >
                                                Inspect
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* STUDENT DETAIL MODAL                                              */}
            {/* ================================================================= */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-scaleUp">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    {studentDetailData?.student?.fullname || 'Student Analytics'}
                                </h3>
                                <p className="text-xs text-slate-400">{studentDetailData?.student?.email}</p>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {studentDetailLoading ? (
                            <div className="py-12 flex justify-center"><Loader className="w-6 h-6 animate-spin text-pink-500" /></div>
                        ) : studentDetailData ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl text-center border border-slate-200 dark:border-slate-800">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400">Best Score</p>
                                        <p className="text-xl font-black text-pink-500 mt-0.5">{studentDetailData.bestScore} pts</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400">Attempts</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{studentDetailData.totalAttempts}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400">Improvement</p>
                                        <p className={`text-xl font-black mt-0.5 ${studentDetailData.improvementPercentage >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {studentDetailData.improvementPercentage >= 0 ? `+${studentDetailData.improvementPercentage}%` : `${studentDetailData.improvementPercentage}%`}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">Attempt Progression:</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {studentDetailData.attempts?.map(att => (
                                            <div key={att.attemptNumber} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs font-bold">
                                                <span>Attempt #{att.attemptNumber}</span>
                                                <span>{formatDuration(att.durationSeconds)}</span>
                                                <span className="text-pink-600 dark:text-pink-400">{att.score} / {quiz.totalMarks} ({att.percentage}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizAnalytics;
