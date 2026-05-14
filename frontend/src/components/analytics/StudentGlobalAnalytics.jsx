import React, { useState, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Calendar, FileText, CheckCircle, Clock, BookOpen, GraduationCap } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StudentGlobalAnalytics = ({ rooms = [] }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        attendanceData: null,
        submissions: [],
        tasks: [],
        attempts: [],
        overallAttendance: 0,
        pendingCount: 0,
        completionRate: 0,
        averageGrade: 0,
        upcomingCount: 0
    });

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Fetch all required data in parallel
                const [attRes, subRes, taskRes, attemptRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/attendance/student`, { credentials: 'include' }).then(r => r.json()),
                    fetch(`${API_BASE_URL}/api/submissions/me?roomId=all`, { credentials: 'include' }).then(r => r.json()),
                    fetch(`${API_BASE_URL}/api/tasks?roomId=all`, { credentials: 'include' }).then(r => r.json()),
                    fetch(`${API_BASE_URL}/api/quizzes/attempts/me?roomId=all`, { credentials: 'include' }).then(r => r.json())
                ]);

                const attendanceData = attRes.success ? attRes : null;
                const submissions = subRes.success ? subRes.submissions : [];
                const tasks = taskRes.success ? taskRes.tasks : [];
                const attempts = attemptRes.success ? attemptRes.attempts : [];

                // Calculate Pending Assignments (tasks that require submission but have none)
                const assignmentTasks = tasks.filter(t => t.taskType === 'assignment' || t.taskType === 'Experiment' || t.taskType === 'Lab');
                const submittedTaskIds = new Set(submissions.map(s => s.taskId?._id?.toString() || s.taskId?.toString()));
                const pendingCount = assignmentTasks.filter(t => !submittedTaskIds.has(t._id.toString())).length;

                // Calculate Completion Rate
                const completionRate = assignmentTasks.length > 0 
                    ? Math.round((submittedTaskIds.size / assignmentTasks.length) * 100) 
                    : 100;

                // Calculate Average Grade (combining graded submissions and quiz attempts)
                let totalScore = 0;
                let maxPossible = 0;
                
                submissions.filter(s => s.status === 'graded' && s.marksAwarded !== null).forEach(s => {
                    totalScore += s.marksAwarded;
                    maxPossible += (s.taskId?.maxMarks || 100);
                });

                attempts.forEach(a => {
                    totalScore += a.score;
                    maxPossible += (a.quizId?.totalMarks || 100);
                });

                const averageGrade = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

                // Upcoming Deadlines
                const now = new Date();
                const upcomingTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) > now);
                const upcomingCount = upcomingTasks.length; // Can also add unpublished quizzes if applicable

                setStats({
                    attendanceData,
                    submissions,
                    tasks,
                    attempts,
                    overallAttendance: attendanceData?.overallPercentage || 0,
                    pendingCount,
                    completionRate,
                    averageGrade,
                    upcomingCount
                });

            } catch (err) {
                console.error("Error fetching analytics", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [rooms]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading Analytics Dashboard...</div>;
    }

    // --- Chart Configurations ---

    // 1. Performance Over Time (Line Chart)
    // Combine submissions and attempts and sort by date
    const historyData = [
        ...stats.submissions.filter(s => s.status === 'graded').map(s => ({
            date: new Date(s.updatedAt),
            score: (s.marksAwarded / (s.taskId?.maxMarks || 100)) * 100,
            type: 'Assignment'
        })),
        ...stats.attempts.map(a => ({
            date: new Date(a.createdAt),
            score: (a.score / (a.quizId?.totalMarks || 100)) * 100,
            type: 'Quiz'
        }))
    ].sort((a, b) => a.date - b.date);

    const performanceLineData = {
        labels: historyData.map(h => h.date.toLocaleDateString()),
        datasets: [
            {
                label: 'Performance Trend (%)',
                data: historyData.map(h => h.score),
                borderColor: '#8b5cf6', // purple-500
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#06b6d4', // cyan-500
            }
        ]
    };

    // 2. Attendance Distribution (Doughnut)
    const attDoughnutData = {
        labels: ['Present/Late', 'Absent'],
        datasets: [
            {
                data: [stats.overallAttendance, 100 - stats.overallAttendance],
                backgroundColor: ['#10b981', '#ef4444'], // emerald, red
                borderWidth: 0,
            }
        ]
    };

    // 3. Subject-wise marks (Bar Chart)
    const subjectMarks = {};
    stats.submissions.filter(s => s.status === 'graded' && s.roomId).forEach(s => {
        const roomName = s.roomId.name || 'Unknown';
        if (!subjectMarks[roomName]) subjectMarks[roomName] = { total: 0, max: 0 };
        subjectMarks[roomName].total += s.marksAwarded;
        subjectMarks[roomName].max += (s.taskId?.maxMarks || 100);
    });
    stats.attempts.forEach(a => {
        const roomName = a.roomId?.name || 'Unknown';
        if (!subjectMarks[roomName]) subjectMarks[roomName] = { total: 0, max: 0 };
        subjectMarks[roomName].total += a.score;
        subjectMarks[roomName].max += (a.quizId?.totalMarks || 100);
    });

    const barLabels = Object.keys(subjectMarks);
    const barData = barLabels.map(l => Math.round((subjectMarks[l].total / subjectMarks[l].max) * 100));

    const subjectBarData = {
        labels: barLabels.length ? barLabels : ['No Data'],
        datasets: [
            {
                label: 'Average Score (%)',
                data: barLabels.length ? barData : [0],
                backgroundColor: 'rgba(6, 182, 212, 0.6)', // cyan
                borderColor: '#06b6d4',
                borderWidth: 1,
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
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { color: '#9ca3af' } }
        },
        cutout: '70%'
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <Calendar className="w-8 h-8 text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overallAttendance}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Overall Attendance</p>
                </div>
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completionRate}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Assignment Completion</p>
                </div>
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <GraduationCap className="w-8 h-8 text-purple-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageGrade}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Average Grade</p>
                </div>
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <FileText className="w-8 h-8 text-red-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingCount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pending Assignments</p>
                </div>
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <Clock className="w-8 h-8 text-orange-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.upcomingCount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming Deadlines</p>
                </div>
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <BookOpen className="w-8 h-8 text-cyan-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{rooms.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Subjects Enrolled</p>
                </div>
            </div>

            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Line Chart: Performance Over Time */}
                <div className="lg:col-span-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Performance Over Time</h3>
                    <div className="h-72">
                        {historyData.length > 0 ? (
                            <Line data={performanceLineData} options={commonOptions} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm">Not enough data to map trends</div>
                        )}
                    </div>
                </div>

                {/* Doughnut Chart: Attendance */}
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Attendance Overview</h3>
                    <div className="flex-1 min-h-[200px] relative">
                        <Doughnut data={attDoughnutData} options={doughnutOptions} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white mt-[-20px]">{stats.overallAttendance}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Bar Chart: Subject-wise Marks */}
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Subject-wise Average Marks</h3>
                    <div className="h-64">
                        <Bar data={subjectBarData} options={commonOptions} />
                    </div>
                </div>

                {/* Progress Rings/List: Subject Attendance Breakdown */}
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Attendance by Subject</h3>
                    <div className="space-y-4 overflow-y-auto max-h-64 custom-scrollbar pr-2">
                        {stats.attendanceData?.subjects?.length > 0 ? (
                            stats.attendanceData.subjects.map((sub, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">{sub.room?.name}</p>
                                        <p className="text-xs text-gray-500">{sub.totalClasses} classes total</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div 
                                                className={`h-2 rounded-full ${sub.percentage >= 75 ? 'bg-emerald-500' : sub.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                style={{ width: `${sub.percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-bold w-8 text-right text-gray-900 dark:text-white">{sub.percentage}%</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">No subject data available.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentGlobalAnalytics;
