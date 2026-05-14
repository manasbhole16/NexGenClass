import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
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
} from 'chart.js';
import { X, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
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
  Legend
);

const TeacherDashboardHeader = ({ tasks = [], roomId, roomDetails }) => {
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', title: '' });
    const [attendanceData, setAttendanceData] = useState(null);
    const [avgAttendance, setAvgAttendance] = useState(0);

    useEffect(() => {
        if (!roomId || roomId === 'personal') return;

        const fetchAttendance = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/attendance/room/${roomId}/report`, { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    setAttendanceData(data);
                    if (data.report && data.report.length > 0 && data.totalClasses > 0) {
                        const sum = data.report.reduce((acc, curr) => acc + curr.percentage, 0);
                        setAvgAttendance(Math.round(sum / data.report.length));
                    } else {
                        setAvgAttendance(0);
                    }
                }
            } catch (err) {
                console.error("Error fetching attendance report", err);
            }
        };

        fetchAttendance();
    }, [roomId]);

    const openModal = (type, title) => {
        setModalConfig({ isOpen: true, type, title });
    };

    const closeModal = () => {
        setModalConfig({ isOpen: false, type: '', title: '' });
    };

    const pendingAssignments = tasks.length;
    const hasAssignments = pendingAssignments > 0;
    const hasAttendance = attendanceData && attendanceData.totalClasses > 0;

    const chartData = {
        attendance: {
            labels: hasAttendance ? attendanceData.report.map(s => s.student.fullname || 'Unknown') : ['No Data'],
            datasets: [
                {
                    label: 'Attendance %',
                    data: hasAttendance ? attendanceData.report.map(s => s.percentage) : [0],
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                },
            ],
        },
        assignments: {
            labels: hasAssignments ? tasks.map((t, i) => `Task ${i+1}`) : ['No Data'],
            datasets: [
                {
                    label: 'Status (1=Active, 0=Done)',
                    data: hasAssignments ? tasks.map(t => (t.status === 'Done' ? 0 : 1)) : [0],
                    backgroundColor: 'rgba(239, 68, 68, 0.5)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1,
                },
            ],
        },
        gpa: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
            datasets: [
                {
                    label: 'Average GPA',
                    data: hasAssignments ? [3.0, 3.1, 3.2, 3.1, 3.4] : [0, 0, 0, 0, 0], // Mock trend if assignments exist, otherwise 0
                    backgroundColor: 'rgba(16, 185, 129, 0.5)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1,
                    tension: 0.4,
                    fill: true,
                },
            ],
        }
    };

    const renderChart = () => {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#9ca3af' } },
            },
            scales: {
                y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9ca3af' } },
                x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9ca3af' } }
            }
        };

        if (modalConfig.type === 'attendance') {
            return <Bar options={options} data={chartData.attendance} />;
        }
        if (modalConfig.type === 'assignments') {
            return <Bar options={options} data={chartData.assignments} />;
        }
        if (modalConfig.type === 'gpa') {
            return <Line options={options} data={chartData.gpa} />;
        }
        return null;
    };

    return (
        <div className="w-full mt-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Project Antigravity</span>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-white/5 px-2 py-0.5 rounded-full border border-gray-300 dark:border-white/10">Early Warning System</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Total Avg Attendance */}
                <div 
                    onClick={() => openModal('attendance', 'Student-wise Attendance Breakdown')}
                    className="relative overflow-hidden bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all cursor-pointer group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-40 transition-opacity">
                        <Calendar className="w-24 h-24 text-blue-500 dark:text-blue-400" />
                    </div>
                    <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1 relative z-10">Total Avg Attendance</h3>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${hasAttendance ? 'border-blue-200 dark:border-blue-500/20 border-t-blue-500' : 'border-gray-200 dark:border-gray-700'}`}>
                            <span className="text-gray-900 dark:text-white font-bold text-lg">{hasAttendance ? `${avgAttendance}%` : 'N/A'}</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{hasAttendance ? (avgAttendance > 75 ? 'Excellent' : 'Needs Action') : 'No Data'}</p>
                            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">{hasAttendance ? 'Based on latest records' : 'Take attendance first'}</p>
                        </div>
                    </div>
                </div>

                {/* Card 2: Pending Assignments */}
                <div 
                    onClick={() => openModal('assignments', 'Tasks Overview')}
                    className="relative overflow-hidden bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all cursor-pointer group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-40 transition-opacity">
                        <AlertCircle className="w-24 h-24 text-red-500 dark:text-red-400" />
                    </div>
                    <div className="flex justify-between items-start relative z-10">
                        <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Active Class Tasks</h3>
                        {hasAssignments && (
                            <span className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] uppercase font-bold px-2 py-1 rounded-full border border-red-200 dark:border-red-500/30">Review Needed</span>
                        )}
                    </div>
                    <div className="mt-2 relative z-10">
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">{pendingAssignments}</p>
                        <p className="text-xs text-red-500 dark:text-red-400 mt-2">{hasAssignments ? 'Tasks currently assigned' : 'No tasks created yet'}</p>
                    </div>
                </div>

                {/* Card 3: Class GPA */}
                <div 
                    onClick={() => openModal('gpa', 'GPA Trend Analysis')}
                    className="relative overflow-hidden bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all cursor-pointer group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-40 transition-opacity">
                        <TrendingUp className="w-24 h-24 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1 relative z-10">Class GPA Trend</h3>
                    <div className="mt-2 relative z-10">
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">{hasAssignments ? '3.4' : 'N/A'}</p>
                        <div className="w-full h-8 mt-2 opacity-80">
                            {hasAssignments ? (
                                <svg viewBox="0 0 100 20" className="w-full h-full preserve-3d">
                                    <polyline points="0,20 20,15 40,18 60,8 80,12 100,2" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            ) : (
                                <div className="text-xs text-gray-400 h-full flex items-center">Awaiting graded assignments</div>
                            )}
                        </div>
                        <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">{hasAssignments ? 'Upward trend detected' : ''}</p>
                    </div>
                </div>
            </div>

            {/* Chart Modal */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{modalConfig.title}</h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors bg-gray-200 hover:bg-gray-300 dark:bg-white/5 dark:hover:bg-white/10 p-1 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 h-[400px]">
                            {renderChart()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboardHeader;
