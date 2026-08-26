import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    Calendar as CalendarIcon, 
    AlertTriangle, 
    CheckCircle2, 
    Clock, 
    ShieldCheck, 
    Search, 
    Filter, 
    Layers, 
    XCircle,
    TrendingUp,
    BarChart3
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import { useSocket } from '../../context/SocketContext';

const StudentAttendanceDashboard = ({ user }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('All');
    const socket = useSocket();

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/attendance/student/me`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setData(json);
            }
        } catch (err) {
            console.error("Failed to fetch student attendance", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, []);

    // Real-time Socket.IO listener via shared socket
    useEffect(() => {
        if (!socket) return;

        const handleAttendanceUpdate = () => {
            fetchAttendance();
        };

        socket.on('attendance_updated', handleAttendanceUpdate);

        return () => {
            socket.off('attendance_updated', handleAttendanceUpdate);
        };
    }, [socket]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-pink-500 font-bold">
                <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mr-3" />
                Loading Your Attendance Profile...
            </div>
        );
    }

    if (!data) {
        return (
            <div className="max-w-xl mx-auto text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-3">
                <CalendarIcon className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No Attendance Records Found</h3>
                <p className="text-xs text-slate-500">Your teachers have not recorded any attendance sessions yet.</p>
            </div>
        );
    }

    const { overallPercentage = 0, overallTotal = 0, overallAttended = 0, totals = {}, subjects = [], history = [] } = data;
    const isBelowThreshold = overallPercentage < 75;

    const subjectsList = ['All', ...subjects.map(s => s.room?.name).filter(Boolean)];

    const filteredHistory = history.filter(item => {
        const matchesSubject = selectedSubject === 'All' || item.roomName === selectedSubject;
        const matchesSearch = !searchQuery || 
            item.sessionTitle?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.roomName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.date?.includes(searchQuery);
        return matchesSubject && matchesSearch;
    });

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-12">
            {/* Header & Overall Performance Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Hero Banner */}
                <div className="md:col-span-2 bg-gradient-to-br from-pink-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden space-y-4">
                    <div className="space-y-1 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-white/10 rounded-full border border-white/20">
                            Academic Attendance 2.0
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black mt-2">Attendance Overview</h2>
                        <p className="text-xs text-pink-100 max-w-sm leading-relaxed">
                            Monitor your presence, maintain the 75% institutional threshold, and review past class sessions.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 relative z-10 text-center sm:text-left">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-pink-200">Total Classes</p>
                            <p className="text-xl font-black">{overallTotal}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-pink-200">Attended</p>
                            <p className="text-xl font-black">{overallAttended}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-pink-200">Missed</p>
                            <p className="text-xl font-black">{totals.absent || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Overall Score Card */}
                <div className={`rounded-3xl p-6 sm:p-8 shadow-sm border flex flex-col items-center justify-center text-center space-y-3 ${
                    isBelowThreshold 
                        ? 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400' 
                        : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}>
                    <div className="text-5xl font-black tracking-tight">{overallPercentage}%</div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Cumulative Attendance</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Across {subjects.length} Enrolled Classes</p>
                    </div>

                    {isBelowThreshold ? (
                        <span className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Below 75% Threshold
                        </span>
                    ) : (
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Good Standing
                        </span>
                    )}
                </div>
            </div>

            {/* Subject-Wise Cards Grid */}
            <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-pink-500" /> Class-Wise Breakdown
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {subjects.map((sub, idx) => {
                        const pct = sub.percentage || 0;
                        const isSubLow = pct < 75;

                        return (
                            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 hover:border-pink-500/30 transition-all">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="font-black text-sm text-slate-900 dark:text-white truncate" title={sub.room?.name}>
                                            {sub.room?.name || 'Classroom'}
                                        </h4>
                                        <p className="text-[11px] text-slate-400 font-medium">Instructor: {sub.room?.teacher || 'Faculty'}</p>
                                    </div>
                                    <span className={`text-base font-black ${isSubLow ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {pct}%
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-700 ${isSubLow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <span>Attended: {sub.present + sub.late} / {sub.totalClasses}</span>
                                    <span>Missed: {sub.absent}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Attendance History Timeline */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-indigo-500" /> Recorded Session History
                        </h3>
                        <p className="text-xs text-slate-400">View individual class sessions and attendance marks.</p>
                    </div>

                    {/* Filter & Search Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                            <Search className="w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search sessions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder-slate-400 w-32 sm:w-44"
                            />
                        </div>

                        {subjectsList.length > 2 && (
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                            >
                                {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                {filteredHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-bold">
                        No session records match your filter criteria.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredHistory.map((item, idx) => {
                            const isP = item.status === 'Present';
                            const isL = item.status === 'Late';

                            return (
                                <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 px-2 rounded-2xl transition-colors">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                                {item.roomName}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400">{item.date}</span>
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.sessionTitle || 'Class Session'}</h4>
                                        {item.remarks && (
                                            <p className="text-[11px] text-slate-400 italic">"{item.remarks}"</p>
                                        )}
                                    </div>

                                    <div className="self-start sm:self-center">
                                        <span className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                                            isP 
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                                : isL 
                                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                        }`}>
                                            {isP && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            {isL && <Clock className="w-3.5 h-3.5" />}
                                            {!isP && !isL && <XCircle className="w-3.5 h-3.5" />}
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentAttendanceDashboard;
