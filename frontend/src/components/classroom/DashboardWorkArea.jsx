import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, AlertCircle, FileText, ChevronRight, CheckSquare, Sparkles } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const DashboardWorkArea = ({ user, onOpenAssignment }) => {
    const isTeacher = user?.role === 'teacher';
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(isTeacher ? 'review' : 'upcoming');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/rooms/dashboard/summary`, { credentials: 'include' });
                const data = await res.json();
                if (data.success && data.summary) {
                    setSummary(data.summary);
                }
            } catch (err) {
                console.error("Failed to load dashboard summary", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [user?.role]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/5 rounded-2xl p-6 mb-8 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/4 mb-4" />
                <div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-3/4" />
            </div>
        );
    }

    if (!summary) return null;

    // ---------------------------------------------
    // TEACHER VIEW: To-Review / Work In Progress
    // ---------------------------------------------
    if (isTeacher) {
        const pendingCount = summary.pendingGradingCount || 0;
        const pendingSubs = summary.pendingSubmissions || [];
        const recentlyDue = summary.recentlyDueTasks || [];

        return (
            <div className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-6 mb-8 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                            <CheckSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">To review</h2>
                            <p className="text-xs text-gray-500">Assignments requiring grading and review</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('review')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'review'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                        >
                            Submissions to grade ({pendingCount})
                        </button>
                        <button
                            onClick={() => setActiveTab('recentlyDue')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'recentlyDue'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                        >
                            Recently due ({recentlyDue.length})
                        </button>
                    </div>
                </div>

                {activeTab === 'review' ? (
                    pendingSubs.length === 0 ? (
                        <div className="py-6 text-center text-gray-500 space-y-1">
                            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/80 mb-1" />
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">All caught up!</p>
                            <p className="text-xs text-gray-400">No submissions waiting for grading right now.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {pendingSubs.slice(0, 6).map(sub => (
                                <div
                                    key={sub._id}
                                    onClick={() => {
                                        if (sub.taskId?.room) navigate(`/room/${sub.taskId.room}`);
                                    }}
                                    className="p-3.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl hover:border-purple-400 dark:hover:border-purple-500/40 hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 truncate max-w-[180px]">
                                            {sub.taskId?.title || 'Assignment'}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold uppercase">
                                            {sub.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-800 dark:text-gray-200 font-medium truncate">
                                        Student: {sub.studentId?.fullname || 'Student'}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Submitted {new Date(sub.updatedAt || sub.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    recentlyDue.length === 0 ? (
                        <div className="py-6 text-center text-gray-500 space-y-1">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">No recently due assignments</p>
                            <p className="text-xs text-gray-400">Assignments with past due dates will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {recentlyDue.slice(0, 6).map(task => (
                                <div
                                    key={task._id}
                                    onClick={() => {
                                        if (task.room?._id || task.room) navigate(`/room/${task.room?._id || task.room}`);
                                    }}
                                    className="p-3.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl hover:border-purple-400 dark:hover:border-purple-500/40 hover:shadow-md transition-all cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                            {task.title}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            {task.room?.name || 'Class'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-red-500 mt-1">
                                        Past due: {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        );
    }

    // ---------------------------------------------
    // STUDENT VIEW: Recently Due / Assigned Work
    // ---------------------------------------------
    const upcomingTasks = summary.upcomingTasks || [];
    const missingTasks = summary.missingTasks || [];

    if (upcomingTasks.length === 0 && missingTasks.length === 0) return null;

    return (
        <div className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-6 mb-8 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Assigned work</h2>
                        <p className="text-xs text-gray-500">Upcoming deadlines and pending classwork</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'upcoming'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                    >
                        Upcoming ({upcomingTasks.length})
                    </button>
                    {missingTasks.length > 0 && (
                        <button
                            onClick={() => setActiveTab('missing')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'missing'
                                    ? 'bg-red-600 text-white'
                                    : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                            }`}
                        >
                            Missing ({missingTasks.length})
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'upcoming' ? (
                upcomingTasks.length === 0 ? (
                    <div className="py-6 text-center text-gray-500 space-y-1">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Woohoo, no work due soon!</p>
                        <p className="text-xs text-gray-400">All your upcoming assignments are completed.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {upcomingTasks.slice(0, 6).map(task => (
                            <div
                                key={task._id}
                                onClick={() => {
                                    if (task.room?._id || task.room) navigate(`/room/${task.room?._id || task.room}`);
                                }}
                                className="p-3.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl hover:border-purple-400 dark:hover:border-purple-500/40 hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                        {task.title}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-semibold truncate max-w-[100px]">
                                        {task.room?.name || 'Class'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
                                    Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'No due date'}
                                </p>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {missingTasks.slice(0, 6).map(task => (
                        <div
                            key={task._id}
                            onClick={() => {
                                if (task.room?._id || task.room) navigate(`/room/${task.room?._id || task.room}`);
                            }}
                            className="p-3.5 bg-red-500/[0.03] border border-red-200 dark:border-red-500/20 rounded-xl hover:border-red-400 hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                    {task.title}
                                </span>
                                <span className="text-[10px] text-red-500 font-bold">
                                    MISSING
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Was due: {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} &bull; {task.room?.name || 'Class'}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardWorkArea;
