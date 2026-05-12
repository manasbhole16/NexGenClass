import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar as CalendarIcon, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const StudentAttendanceDashboard = ({ user }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/attendance/student`, { credentials: 'include' });
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
        fetchAttendance();
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-64 text-purple-600 animate-pulse">Loading Attendance...</div>;
    }

    if (!data) return null;

    const getStatusColor = (percentage) => {
        if (percentage >= 75) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        if (percentage >= 60) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        return 'text-red-500 bg-red-500/10 border-red-500/20';
    };

    const getProgressBarColor = (percentage) => {
        if (percentage >= 75) return 'bg-emerald-500';
        if (percentage >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    <h2 className="text-3xl font-bold mb-2">My Attendance</h2>
                    <p className="text-purple-200">Track your presence across all classes.</p>
                </div>

                <div className={`rounded-3xl p-8 shadow-xl border flex flex-col items-center justify-center transition-all ${getStatusColor(data.overallPercentage)}`}>
                    <div className="text-5xl font-black mb-2">{data.overallPercentage}%</div>
                    <p className="text-sm font-semibold uppercase tracking-wider">Overall Attendance</p>
                    {data.overallPercentage < 75 && (
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">
                            <AlertTriangle className="w-4 h-4" /> Below threshold
                        </div>
                    )}
                </div>
            </div>

            {/* Subject Breakdown */}
            <div>
                <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    Subject-wise Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.subjects.map((sub, idx) => (
                        <div key={idx} className="bg-white dark:bg-[#18181b] rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white truncate" title={sub.room.name}>{sub.room.name}</h4>
                                    <p className="text-xs text-gray-500">{sub.room.code}</p>
                                </div>
                                <div className={`text-xl font-bold ${getStatusColor(sub.percentage).split(' ')[0]}`}>
                                    {sub.percentage}%
                                </div>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 mb-4 overflow-hidden">
                                <div 
                                    className={`h-2.5 rounded-full transition-all duration-1000 ${getProgressBarColor(sub.percentage)}`} 
                                    style={{ width: `${sub.percentage}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Attended: {sub.present + sub.late}/{sub.totalClasses}</span>
                                <span>Missed: {sub.absent}</span>
                            </div>
                        </div>
                    ))}
                    {data.subjects.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            No enrolled classes found.
                        </div>
                    )}
                </div>
            </div>

            {/* Recent History */}
            <div>
                <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-500" />
                    Recent History
                </h3>
                <div className="bg-white dark:bg-[#18181b] rounded-2xl shadow-lg border border-gray-100 dark:border-white/5 overflow-hidden">
                    {data.history.length > 0 ? (
                        <div className="divide-y divide-gray-100 dark:divide-white/5">
                            {data.history.map((record, i) => (
                                <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{record.roomName}</p>
                                        <p className="text-sm text-gray-500">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {record.remarks && <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[150px]">{record.remarks}</span>}
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1
                                            ${record.status === 'Present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 
                                              record.status === 'Absent' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 
                                              'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'}`}
                                        >
                                            {record.status === 'Present' && <CheckCircle className="w-3 h-3" />}
                                            {record.status === 'Absent' && <AlertTriangle className="w-3 h-3" />}
                                            {record.status === 'Late' && <Clock className="w-3 h-3" />}
                                            {record.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">No attendance records found.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentAttendanceDashboard;
