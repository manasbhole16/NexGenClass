import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Calendar, CheckCircle, Clock, GraduationCap, FileText, Activity } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ClassroomAnalytics = ({ roomId }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        subjectAttendance: 0,
        submissionRate: 0,
        averageQuizScore: 0,
        upcomingTasks: [],
        recentActivity: [],
        historyData: []
    });

    useEffect(() => {
        const fetchClassroomAnalytics = async () => {
            try {
                const safeFetch = async (url) => {
                    try {
                        const res = await fetch(url, { credentials: 'include' });
                        if (!res.ok) return { success: false };
                        return await res.json();
                    } catch (e) {
                        return { success: false };
                    }
                };

                const [attRes, subRes, taskRes, attemptRes] = await Promise.all([
                    safeFetch(`${API_BASE_URL}/api/attendance/student`),
                    safeFetch(`${API_BASE_URL}/api/submissions/me?roomId=${roomId}`),
                    safeFetch(`${API_BASE_URL}/api/tasks?roomId=${roomId}`),
                    safeFetch(`${API_BASE_URL}/api/quiz/attempts/me?roomId=${roomId}`)
                ]);

                // Attendance
                let subjectAttendance = 0;
                if (attRes.success && attRes.subjects) {
                    const subj = attRes.subjects.find(s => s.room?._id === roomId || s.room === roomId);
                    if (subj) subjectAttendance = subj.percentage;
                }

                // Submissions & Tasks
                const submissions = subRes.success ? subRes.submissions : [];
                const tasks = taskRes.success ? taskRes.tasks : [];
                const assignmentTasks = tasks.filter(t => t.taskType === 'assignment' || t.taskType === 'Experiment' || t.taskType === 'Lab');
                const submissionRate = assignmentTasks.length > 0
                    ? Math.round((submissions.length / assignmentTasks.length) * 100)
                    : 100;

                // Upcoming Tasks
                const now = new Date();
                const upcomingTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) > now).slice(0, 3); // top 3

                // Quizzes & Average Score
                const attempts = attemptRes.success ? attemptRes.attempts : [];
                let totalQuizScore = 0;
                let maxQuizPossible = 0;
                attempts.forEach(a => {
                    totalQuizScore += a.score;
                    maxQuizPossible += (a.quizId?.totalMarks || 100);
                });
                const averageQuizScore = maxQuizPossible > 0 ? Math.round((totalQuizScore / maxQuizPossible) * 100) : 0;

                // History for Line Chart (Quiz Performance)
                const historyData = attempts.map(a => ({
                    date: new Date(a.createdAt),
                    score: (a.score / (a.quizId?.totalMarks || 100)) * 100,
                    title: a.quizId?.title || 'Quiz'
                })).sort((a, b) => a.date - b.date);

                // Recent Activity Timeline
                // Combine submissions and attempts
                const recentActivity = [
                    ...submissions.map(s => ({
                        id: s._id,
                        type: 'submission',
                        title: `Submitted: ${s.taskId?.title || 'Assignment'}`,
                        date: new Date(s.submittedAt || s.createdAt),
                        status: s.status
                    })),
                    ...attempts.map(a => ({
                        id: a._id,
                        type: 'quiz',
                        title: `Attempted: ${a.quizId?.title || 'Quiz'}`,
                        date: new Date(a.createdAt),
                        score: a.score
                    }))
                ].sort((a, b) => b.date - a.date).slice(0, 5); // Latest 5 activities

                setStats({
                    subjectAttendance,
                    submissionRate,
                    averageQuizScore,
                    upcomingTasks,
                    recentActivity,
                    historyData
                });

            } catch (err) {
                console.error("Error fetching classroom analytics", err);
            } finally {
                setLoading(false);
            }
        };

        if (roomId) fetchClassroomAnalytics();
    }, [roomId]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading Classroom Analytics...</div>;
    }

    // Chart Configuration
    const performanceLineData = {
        labels: stats.historyData.map(h => h.date.toLocaleDateString()),
        datasets: [
            {
                label: 'Quiz/Test Score (%)',
                data: stats.historyData.map(h => h.score),
                borderColor: '#10b981', // emerald-500
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#06b6d4',
            }
        ]
    };

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#9ca3af' } }
        },
        scales: {
            y: { 
                grid: { color: 'rgba(255,255,255,0.05)' }, 
                ticks: { color: '#9ca3af' },
                min: 0,
                max: 100
            },
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in py-4">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex items-center shadow-sm">
                    <div className="p-3 bg-blue-500/10 rounded-lg mr-4">
                        <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Subject Attendance</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.subjectAttendance}%</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex items-center shadow-sm">
                    <div className="p-3 bg-emerald-500/10 rounded-lg mr-4">
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Submission Rate</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.submissionRate}%</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex items-center shadow-sm">
                    <div className="p-3 bg-purple-500/10 rounded-lg mr-4">
                        <GraduationCap className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Avg. Quiz Score</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageQuizScore}%</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Line Chart: Performance */}
                <div className="lg:col-span-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quiz/Test Performance</h3>
                    <div className="h-64">
                        {stats.historyData.length > 0 ? (
                            <Line data={performanceLineData} options={commonOptions} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm">Not enough quiz data to map trends</div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Upcoming Tasks */}
                    <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-orange-500" /> Upcoming Tasks
                        </h3>
                        <div className="space-y-3">
                            {stats.upcomingTasks.length > 0 ? (
                                stats.upcomingTasks.map(t => (
                                    <div key={t._id} className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/5">
                                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{t.title}</p>
                                        <p className="text-xs text-orange-500 mt-1">Due: {new Date(t.dueDate).toLocaleDateString()}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">No upcoming tasks.</p>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-cyan-500" /> Recent Activity
                        </h3>
                        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 dark:before:via-white/10 before:to-transparent">
                            {stats.recentActivity.length > 0 ? (
                                stats.recentActivity.map((act, i) => (
                                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-[#18181b] bg-gray-100 dark:bg-gray-800 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                                            {act.type === 'submission' ? <FileText className="w-4 h-4 text-blue-500" /> : <GraduationCap className="w-4 h-4 text-purple-500" />}
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1f1f23] shadow-sm">
                                            <p className="font-medium text-sm text-gray-900 dark:text-white">{act.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{act.date.toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 pl-8">No recent activity found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClassroomAnalytics;
