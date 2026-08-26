import React, { useState, useEffect } from 'react';
import { 
    Users, 
    Calendar, 
    CheckCircle2, 
    AlertTriangle, 
    BookOpen, 
    FileText, 
    Brain, 
    TrendingUp, 
    Download, 
    Filter, 
    Clock, 
    Award, 
    Search, 
    ChevronRight, 
    AlertCircle, 
    BarChart3, 
    Layers, 
    RefreshCw,
    X,
    Printer
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import { useSocket } from '../../context/SocketContext';

const ClassroomAnalytics = ({ roomId }) => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'roster', 'attention', 'assignments', 'quizzes', 'attendance'
    const [analytics, setAnalytics] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState('all');
    const [searchRoster, setSearchRoster] = useState('');
    const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterAttentionOnly, setFilterAttentionOnly] = useState(false);
    const socket = useSocket();

    // Fetch Classroom Analytics from API
    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedTopic && selectedTopic !== 'all') params.append('topic', selectedTopic);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await fetch(`${API_BASE_URL}/api/analytics/class/${roomId}?${params.toString()}`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setAnalytics(json);
            }
        } catch (err) {
            console.error("Failed to load classroom analytics:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (roomId && roomId !== 'personal') {
            fetchAnalytics();
        }
    }, [roomId, selectedTopic]);

    // Socket.IO Real-Time Sync
    useEffect(() => {
        if (!socket || !roomId || roomId === 'personal') return;

        const handleUpdate = () => {
            fetchAnalytics();
        };

        socket.on('taskCreated', handleUpdate);
        socket.on('taskUpdated', handleUpdate);
        socket.on('submissionCreated', handleUpdate);
        socket.on('attendance_updated', handleUpdate);
        socket.on('quizCreated', handleUpdate);

        return () => {
            socket.off('taskCreated', handleUpdate);
            socket.off('taskUpdated', handleUpdate);
            socket.off('submissionCreated', handleUpdate);
            socket.off('attendance_updated', handleUpdate);
            socket.off('quizCreated', handleUpdate);
        };
    }, [socket, roomId]);

    const handleExportCSV = () => {
        window.open(`${API_BASE_URL}/api/analytics/class/${roomId}/export`, '_blank');
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
                <p className="text-xs font-bold text-slate-400">Computing classroom intelligence & metrics...</p>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Classroom Analytics Unavailable</h3>
                <p className="text-xs text-slate-400">Could not retrieve academic metrics for this classroom.</p>
            </div>
        );
    }

    const { summary, classroom, attendance, assignments, quizzes, gradeDistribution, studentRoster, needsAttentionRoster } = analytics;

    // Filter Roster
    const filteredRoster = (studentRoster || []).filter(s => 
        s.fullname.toLowerCase().includes(searchRoster.toLowerCase()) ||
        s.email.toLowerCase().includes(searchRoster.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Top Classroom Header & Quick Export */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-purple-500/10 text-purple-600 border border-purple-500/20">
                                {classroom.code}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">{classroom.subject || 'Academic Classroom'}</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">{classroom.name} Analytics</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-all"
                            title="Print Report"
                        >
                            <Printer className="w-4 h-4" /> Print
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95"
                        >
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    </div>
                </div>

                {/* 6 Top KPI Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                    {/* KPI 1: Enrolled Students */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-black uppercase">Students</span>
                            <Users className="w-4 h-4 text-purple-500" />
                        </div>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{summary.totalStudents}</p>
                        <p className="text-[10px] text-slate-400 font-bold">Enrolled in class</p>
                    </div>

                    {/* KPI 2: Class Average Grade */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-black uppercase">Class Avg</span>
                            <Award className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{summary.classAverageGrade}%</p>
                        <p className="text-[10px] text-slate-400 font-bold">Overall composite</p>
                    </div>

                    {/* KPI 3: Submission Rate */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-black uppercase">Submission</span>
                            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                        </div>
                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{summary.assignmentSubmissionRate}%</p>
                        <p className="text-[10px] text-slate-400 font-bold">{summary.totalAssignments} total tasks</p>
                    </div>

                    {/* KPI 4: Quiz Average */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-black uppercase">Quiz Avg</span>
                            <Brain className="w-4 h-4 text-pink-500" />
                        </div>
                        <p className="text-xl font-black text-pink-600 dark:text-pink-400">{summary.averageQuizScore}%</p>
                        <p className="text-[10px] text-slate-400 font-bold">{summary.totalQuizzes} assessments</p>
                    </div>

                    {/* KPI 5: Class Attendance */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-black uppercase">Attendance</span>
                            <Calendar className="w-4 h-4 text-cyan-500" />
                        </div>
                        <p className={`text-xl font-black ${summary.classAttendancePercentage < 75 ? 'text-rose-500' : 'text-cyan-600 dark:text-cyan-400'}`}>
                            {summary.classAttendancePercentage}%
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">{summary.totalSessions} sessions</p>
                    </div>

                    {/* KPI 6: At-Risk / Needs Attention */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-black uppercase">Attention</span>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className={`text-xl font-black ${summary.needsAttentionCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-500'}`}>
                            {summary.needsAttentionCount}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">Students at risk</p>
                    </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Overview & Distribution' },
                        { id: 'roster', label: `Student Roster (${studentRoster?.length || 0})` },
                        { id: 'attention', label: `Needs Attention (${needsAttentionRoster?.length || 0})` },
                        { id: 'assignments', label: 'Assignment Item Stats' },
                        { id: 'quizzes', label: 'Quiz Item Stats' },
                        { id: 'attendance', label: 'Attendance Timeline' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ======================================================== */}
            {/* TAB 1: OVERVIEW & GRADE DISTRIBUTION                     */}
            {/* ======================================================== */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Grade Distribution Buckets */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Classroom Grade Distribution</h3>
                                <p className="text-xs text-slate-400">Distribution of overall student composite scores.</p>
                            </div>
                            <BarChart3 className="w-5 h-5 text-purple-600" />
                        </div>

                        <div className="space-y-3">
                            {Object.entries(gradeDistribution || {}).map(([range, count]) => {
                                const total = summary.totalStudents || 1;
                                const percent = Math.round((count / total) * 100);

                                return (
                                    <div key={range} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-slate-700 dark:text-slate-300">{range}%</span>
                                            <span className="text-slate-400">{count} student(s) ({percent}%)</span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Attendance Quick Breakdown */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">Attendance Summary</h3>
                        <div className="space-y-3">
                            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Total Present Marks</span>
                                <span className="text-base font-black text-emerald-600">{attendance.presentCount}</span>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Total Late Marks</span>
                                <span className="text-base font-black text-amber-600">{attendance.lateCount}</span>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Total Absent Marks</span>
                                <span className="text-base font-black text-rose-600">{attendance.absentCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: COMPLETE STUDENT PERFORMANCE ROSTER               */}
            {/* ======================================================== */}
            {activeTab === 'roster' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Enrolled Student Roster</h3>
                            <p className="text-xs text-slate-400">Individual academic performance metrics across all assignments and sessions.</p>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 min-w-[220px]">
                            <Search className="w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by student name..."
                                value={searchRoster}
                                onChange={(e) => setSearchRoster(e.target.value)}
                                className="bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none font-medium w-full"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                                    <th className="py-3 px-3">Student Name</th>
                                    <th className="py-3 px-3">Attendance</th>
                                    <th className="py-3 px-3">Assignment %</th>
                                    <th className="py-3 px-3">Avg Assignment</th>
                                    <th className="py-3 px-3">Avg Quiz</th>
                                    <th className="py-3 px-3">Missing</th>
                                    <th className="py-3 px-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                {filteredRoster.map(s => (
                                    <tr 
                                        key={s.studentId}
                                        onClick={() => setSelectedStudentDetail(s)}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                                    >
                                        <td className="py-3 px-3">
                                            <p className="font-bold text-slate-900 dark:text-white">{s.fullname}</p>
                                            <p className="text-[10px] text-slate-400">{s.email}</p>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`font-bold ${s.attendancePercentage < 75 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                                                {s.attendancePercentage}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{s.assignmentCompletionRate}%</td>
                                        <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">{s.averageAssignmentGrade}%</td>
                                        <td className="py-3 px-3 font-bold text-pink-600 dark:text-pink-400">{s.averageQuizScore}%</td>
                                        <td className="py-3 px-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${s.missingAssignmentsCount > 0 ? 'bg-rose-500/10 text-rose-600' : 'text-slate-400'}`}>
                                                {s.missingAssignmentsCount}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                                                s.status === 'Needs Attention'
                                                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                            }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: NEEDS ATTENTION / AT-RISK STUDENTS                */}
            {/* ======================================================== */}
            {activeTab === 'attention' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" /> Students Requiring Attention ({needsAttentionRoster?.length || 0})
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Flagged automatically based on transparent observable criteria (Attendance &lt; 75%, missing assignments, or low grades).
                        </p>
                    </div>

                    {needsAttentionRoster.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs font-bold space-y-2">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                            <p>Great news! All enrolled students are currently meeting academic health criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {needsAttentionRoster.map(s => (
                                <div key={s.studentId} className="p-4 bg-slate-50 dark:bg-slate-950 border border-amber-500/30 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-black text-sm text-slate-900 dark:text-white">{s.fullname}</h4>
                                            <p className="text-[10px] text-slate-400">{s.email}</p>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                            Needs Attention
                                        </span>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-slate-400">Trigger Reasons:</p>
                                        {s.attentionReasons.map((r, idx) => (
                                            <p key={idx} className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                                                &bull; {r}
                                            </p>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-400">
                                        <div>Att: <strong className="text-slate-900 dark:text-white">{s.attendancePercentage}%</strong></div>
                                        <div>Assign: <strong className="text-slate-900 dark:text-white">{s.assignmentCompletionRate}%</strong></div>
                                        <div>Quiz: <strong className="text-slate-900 dark:text-white">{s.averageQuizScore}%</strong></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: ASSIGNMENT ITEM STATS                             */}
            {/* ======================================================== */}
            {activeTab === 'assignments' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Assignment-Level Performance & Turnout</h3>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                                    <th className="py-3 px-3">Title</th>
                                    <th className="py-3 px-3">Topic</th>
                                    <th className="py-3 px-3">Turned In</th>
                                    <th className="py-3 px-3">Missing</th>
                                    <th className="py-3 px-3">Late</th>
                                    <th className="py-3 px-3">Graded</th>
                                    <th className="py-3 px-3">Avg Score</th>
                                    <th className="py-3 px-3">Completion Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                {(assignments.itemStats || []).map(item => (
                                    <tr key={item.taskId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{item.title}</td>
                                        <td className="py-3 px-3 text-slate-400">{item.topic || 'General'}</td>
                                        <td className="py-3 px-3 font-bold text-emerald-600">{item.submittedCount}</td>
                                        <td className="py-3 px-3 text-rose-500 font-bold">{item.missingCount}</td>
                                        <td className="py-3 px-3 text-amber-500 font-bold">{item.lateCount}</td>
                                        <td className="py-3 px-3 text-purple-600 font-bold">{item.gradedCount}</td>
                                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{item.averageScore} / {item.maxMarks} ({item.averagePercentage}%)</td>
                                        <td className="py-3 px-3 font-bold text-indigo-600">{item.submissionRate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 5: QUIZ ITEM STATS                                   */}
            {/* ======================================================== */}
            {activeTab === 'quizzes' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Quiz & Assessment Performance</h3>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                                    <th className="py-3 px-3">Quiz Title</th>
                                    <th className="py-3 px-3">Topic</th>
                                    <th className="py-3 px-3">Total Marks</th>
                                    <th className="py-3 px-3">Attempts Count</th>
                                    <th className="py-3 px-3">Average %</th>
                                    <th className="py-3 px-3">Pass Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                {(quizzes.itemStats || []).map(item => (
                                    <tr key={item.quizId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{item.title}</td>
                                        <td className="py-3 px-3 text-slate-400">{item.topic || 'General'}</td>
                                        <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">{item.totalMarks}</td>
                                        <td className="py-3 px-3 font-bold text-indigo-600">{item.attemptsCount}</td>
                                        <td className="py-3 px-3 font-bold text-pink-600">{item.averagePercentage}%</td>
                                        <td className="py-3 px-3 font-bold text-emerald-600">{item.passRate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 6: ATTENDANCE TIMELINE                               */}
            {/* ======================================================== */}
            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Attendance Session Breakdown</h3>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                                    <th className="py-3 px-3">Date</th>
                                    <th className="py-3 px-3">Session Title</th>
                                    <th className="py-3 px-3">Type</th>
                                    <th className="py-3 px-3">Present</th>
                                    <th className="py-3 px-3">Late</th>
                                    <th className="py-3 px-3">Absent</th>
                                    <th className="py-3 px-3">Turnout %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                {(attendance.sessionTrend || []).map(sess => (
                                    <tr key={sess.sessionId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{sess.date}</td>
                                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{sess.title}</td>
                                        <td className="py-3 px-3 font-black uppercase text-[10px] text-purple-600">{sess.sessionType}</td>
                                        <td className="py-3 px-3 text-emerald-600 font-bold">{sess.present}</td>
                                        <td className="py-3 px-3 text-amber-500 font-bold">{sess.late}</td>
                                        <td className="py-3 px-3 text-rose-500 font-bold">{sess.absent}</td>
                                        <td className="py-3 px-3 font-bold text-indigo-600">{sess.turnoutPercentage}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassroomAnalytics;
