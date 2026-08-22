import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    FileText, 
    CheckCircle2, 
    Clock, 
    BookOpen, 
    GraduationCap, 
    TrendingUp, 
    AlertTriangle, 
    Award, 
    Brain, 
    Layers, 
    AlertCircle,
    ChevronRight,
    RefreshCw,
    ShieldAlert
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import { io } from 'socket.io-client';

const StudentGlobalAnalytics = ({ rooms = [] }) => {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState('all');

    const fetchStudentAnalytics = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedRoom && selectedRoom !== 'all') params.append('roomId', selectedRoom);

            const res = await fetch(`${API_BASE_URL}/api/analytics/student?${params.toString()}`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setAnalytics(json);
            }
        } catch (err) {
            console.error("Failed to load student global analytics:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudentAnalytics();
    }, [selectedRoom]);

    // Socket.IO Real-time Sync
    useEffect(() => {
        const socket = io(API_BASE_URL.replace('/api', ''), { withCredentials: true });
        
        const handleUpdate = () => {
            fetchStudentAnalytics();
        };

        socket.on('taskCreated', handleUpdate);
        socket.on('taskUpdated', handleUpdate);
        socket.on('submissionCreated', handleUpdate);
        socket.on('attendance_updated', handleUpdate);
        socket.on('quizCreated', handleUpdate);

        return () => {
            socket.disconnect();
        };
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
                <p className="text-xs font-bold text-slate-400">Loading your comprehensive academic intelligence...</p>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Academic Analytics Unavailable</h3>
                <p className="text-xs text-slate-400">Could not retrieve your academic records at this time.</p>
            </div>
        );
    }

    const { summary, attendance, assignments, quizzes, performanceTimeline, subjectComparison, attentionAlerts, upcomingDeliverables } = analytics;

    return (
        <div className="space-y-6 animate-fadeIn pb-12">
            {/* Top Student Health Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Academic Intelligence 2.0</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">Student Academic Health</h2>
                        <p className="text-xs text-slate-400 font-medium">Your real-time consolidated performance across all enrolled classrooms.</p>
                    </div>

                    {/* Classroom Scope Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-400">Filter Scope:</label>
                        <select
                            value={selectedRoom}
                            onChange={(e) => setSelectedRoom(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl outline-none"
                        >
                            <option value="all">All Enrolled Classes</option>
                            {rooms.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* 6 Core Student KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                    {/* KPI 1: Overall Attendance */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-black uppercase">Attendance</span>
                            <Calendar className="w-4 h-4 text-cyan-500" />
                        </div>
                        <p className={`text-2xl font-black ${summary.overallAttendancePercent < 75 ? 'text-rose-500' : 'text-cyan-600 dark:text-cyan-400'}`}>
                            {summary.overallAttendancePercent}%
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">
                            {summary.attendedSessions} / {summary.totalAttendanceSessions} sessions
                        </p>
                    </div>

                    {/* KPI 2: Assignment Completion */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-black uppercase">Completion</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.assignmentCompletionRate}%</p>
                        <p className="text-[10px] text-slate-400 font-bold">
                            {summary.submittedAssignments} / {summary.totalAssignments} tasks
                        </p>
                    </div>

                    {/* KPI 3: Avg Assignment Grade */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-black uppercase">Avg Grade</span>
                            <Award className="w-4 h-4 text-indigo-500" />
                        </div>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{summary.averageAssignmentGrade}%</p>
                        <p className="text-[10px] text-slate-400 font-bold">Graded coursework</p>
                    </div>

                    {/* KPI 4: Quiz Average */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-black uppercase">Quiz Avg</span>
                            <Brain className="w-4 h-4 text-pink-500" />
                        </div>
                        <p className="text-2xl font-black text-pink-600 dark:text-pink-400">{summary.averageQuizScore}%</p>
                        <p className="text-[10px] text-slate-400 font-bold">
                            {summary.completedQuizzesCount} / {summary.totalQuizzes} completed
                        </p>
                    </div>

                    {/* KPI 5: Pending Work */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-black uppercase">Pending</span>
                            <Clock className="w-4 h-4 text-purple-500" />
                        </div>
                        <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{summary.pendingDeliverablesCount}</p>
                        <p className="text-[10px] text-slate-400 font-bold">Deliverables left</p>
                    </div>

                    {/* KPI 6: Overdue Work */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-black uppercase">Overdue</span>
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                        </div>
                        <p className={`text-2xl font-black ${summary.overdueDeliverablesCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                            {summary.overdueDeliverablesCount}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">Action required</p>
                    </div>
                </div>
            </div>

            {/* Transparent Attention Alerts */}
            {attentionAlerts && attentionAlerts.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 shadow-sm space-y-3">
                    <h3 className="text-base font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" /> Academic Attention Insights ({attentionAlerts.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {attentionAlerts.map((alert, idx) => (
                            <div key={idx} className="p-3.5 bg-white dark:bg-slate-900 border border-amber-500/20 rounded-2xl space-y-1">
                                <span className="text-[10px] font-black uppercase text-amber-600">{alert.title}</span>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{alert.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Performance Over Time & Subject Comparison Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Section 1: Performance Over Time Timeline */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Performance Over Time</h3>
                                <p className="text-xs text-slate-400">Chronological trend of your graded coursework and assessments.</p>
                            </div>
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>

                        <div className="space-y-3 mt-4">
                            {performanceTimeline.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-xs font-bold">
                                    No graded submissions or assessments recorded yet.
                                </div>
                            ) : (
                                performanceTimeline.slice(-6).map((item, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-purple-600">{item.roomName} &bull; {item.date}</span>
                                            <h4 className="font-bold text-xs text-slate-900 dark:text-white">{item.title}</h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{item.score}%</span>
                                            <p className="text-[10px] text-slate-400">{item.rawScore} / {item.maxMarks} pts</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 2: Subject / Classroom Comparison Matrix */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Subject Breakdown</h3>
                            <p className="text-xs text-slate-400">Performance comparison across all enrolled classrooms.</p>
                        </div>
                        <Layers className="w-5 h-5 text-indigo-600" />
                    </div>

                    <div className="space-y-3">
                        {subjectComparison.map(subj => (
                            <div key={subj.roomId} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-black text-xs text-slate-900 dark:text-white">{subj.roomName}</h4>
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600">
                                        {subj.code}
                                    </span>
                                </div>

                                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] font-black uppercase text-slate-400 block">Attendance</span>
                                        <strong className={subj.attendancePercent < 75 ? 'text-rose-500' : 'text-cyan-600'}>{subj.attendancePercent}%</strong>
                                    </div>
                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] font-black uppercase text-slate-400 block">Assign %</span>
                                        <strong className="text-emerald-600">{subj.assignmentCompletionPercent}%</strong>
                                    </div>
                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] font-black uppercase text-slate-400 block">Avg Grade</span>
                                        <strong className="text-indigo-600">{subj.averageAssignmentGrade}%</strong>
                                    </div>
                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] font-black uppercase text-slate-400 block">Quiz Avg</span>
                                        <strong className="text-pink-600">{subj.averageQuizScore}%</strong>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Upcoming Deadlines (Phase 5 Unified Planner Integration) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Next Upcoming Deliverables</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {upcomingDeliverables.length === 0 ? (
                        <p className="text-xs text-slate-400 font-bold col-span-full py-4 text-center">No pending deadlines on your academic planner.</p>
                    ) : (
                        upcomingDeliverables.map((item, idx) => (
                            <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                                    <span>{item.type}</span>
                                    <span>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Upcoming'}</span>
                                </div>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{item.title}</h4>
                                <p className="text-[10px] text-purple-600 font-bold truncate">{item.roomName}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentGlobalAnalytics;
