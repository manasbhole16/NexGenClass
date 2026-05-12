import React, { useState, useEffect } from 'react';
import { Users, Calendar, Save, Check, X, AlertCircle, BarChart2 } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const TeacherAttendanceDashboard = ({ user }) => {
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState(null); // The actual records array
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('take'); // 'take' or 'report'

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/rooms/my-rooms`, { credentials: 'include' });
                const json = await res.json();
                if (json.success) {
                    // Only show rooms where user is owner
                    const ownedRooms = json.rooms.filter(r => r.owner === user._id);
                    setRooms(ownedRooms);
                    if (ownedRooms.length > 0) setSelectedRoom(ownedRooms[0]._id);
                }
            } catch (err) {
                console.error("Failed to fetch rooms", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
    }, [user]);

    useEffect(() => {
        if (selectedRoom && selectedDate && activeTab === 'take') {
            fetchAttendance();
        } else if (selectedRoom && activeTab === 'report') {
            fetchReport();
        }
    }, [selectedRoom, selectedDate, activeTab]);

    const fetchAttendance = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance/room/${selectedRoom}/date/${selectedDate}`, { credentials: 'include' });
            const json = await res.json();
            
            const room = rooms.find(r => r._id === selectedRoom);
            const students = room ? room.members.filter(m => m._id !== user._id) : [];

            if (json.success && json.attendance) {
                // Merge existing records with potentially new students
                const existingRecords = json.attendance.records;
                const merged = students.map(student => {
                    const studentId = student?._id || student;
                    const existing = existingRecords.find(r => {
                        const existingId = r.student?._id || r.student;
                        return String(existingId) === String(studentId);
                    });
                    return existing ? { ...existing, student } : { student, status: 'Present', remarks: '' };
                });
                setAttendanceData(merged);
            } else {
                // Initialize new attendance sheet
                const initial = students.map(student => ({
                    student,
                    status: 'Present', // Default to present
                    remarks: ''
                }));
                setAttendanceData(initial);
            }
        } catch (err) {
            console.error("Failed to fetch attendance", err);
        }
    };

    const fetchReport = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance/room/${selectedRoom}/report`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                // Filter out the teacher from the report just in case
                json.report = json.report.filter(r => r.student._id !== user._id);
                setReportData(json);
            }
        } catch (err) {
            console.error("Failed to fetch report", err);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setAttendanceData(prev => prev.map(record => 
            record.student._id === studentId ? { ...record, status } : record
        ));
    };

    const handleRemarksChange = (studentId, remarks) => {
        setAttendanceData(prev => prev.map(record => 
            record.student._id === studentId ? { ...record, remarks } : record
        ));
    };

    const markAllAs = (status) => {
        setAttendanceData(prev => prev.map(record => ({ ...record, status })));
    };

    const saveAttendance = async () => {
        setSaving(true);
        try {
            const payload = {
                roomId: selectedRoom,
                date: selectedDate,
                records: attendanceData.map(r => ({
                    student: r.student?._id || r.student,
                    status: r.status,
                    remarks: r.remarks || ''
                }))
            };
            const res = await fetch(`${API_BASE_URL}/api/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const json = await res.json();
            if (json.success) {
                alert("Attendance saved successfully!");
            } else {
                alert("Failed to save attendance: " + (json.message || "Unknown error"));
            }
        } catch (err) {
            console.error(err);
            alert("Error saving attendance. Please check your connection.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-64 text-purple-600 animate-pulse">Loading Classes...</div>;

    if (rooms.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <Users className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200">No Classes Found</h2>
                <p className="text-gray-500 mt-2">You need to create a class before taking attendance.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Controls */}
            <div className="bg-white dark:bg-[#18181b] p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row gap-4 flex-1">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Class</label>
                        <select 
                            value={selectedRoom} 
                            onChange={(e) => setSelectedRoom(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl p-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                        >
                            {rooms.map(room => (
                                <option key={room._id} value={room._id}>{room.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    {activeTab === 'take' && (
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Date</label>
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl p-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            />
                        </div>
                    )}
                </div>

                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl mt-6 md:mt-0 self-start md:self-end">
                    <button 
                        onClick={() => setActiveTab('take')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'take' ? 'bg-white dark:bg-[#27272a] text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        Take Attendance
                    </button>
                    <button 
                        onClick={() => setActiveTab('report')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'report' ? 'bg-white dark:bg-[#27272a] text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        Reports
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {activeTab === 'take' && attendanceData && (
                <div className="bg-white dark:bg-[#18181b] rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-purple-500" />
                                Attendance Sheet
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">{attendanceData.length} Students</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => markAllAs('Present')} className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 rounded-lg text-sm font-bold transition-colors">
                                All Present
                            </button>
                            <button onClick={saveAttendance} disabled={saving} className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-500/30">
                                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-white/5 text-gray-500 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-bold">Student</th>
                                    <th className="p-4 font-bold">Status</th>
                                    <th className="p-4 font-bold">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {attendanceData.map((record) => (
                                    <tr key={record.student._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                                                    {record.student.fullname[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">{record.student.fullname}</p>
                                                    <p className="text-xs text-gray-500">{record.student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleStatusChange(record.student._id, 'Present')}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${record.status === 'Present' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-transparent text-gray-500 border-gray-200 dark:border-white/10 hover:border-emerald-500 hover:text-emerald-500'}`}
                                                >
                                                    Present
                                                </button>
                                                <button 
                                                    onClick={() => handleStatusChange(record.student._id, 'Absent')}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${record.status === 'Absent' ? 'bg-red-500 text-white border-red-600 shadow-sm' : 'bg-transparent text-gray-500 border-gray-200 dark:border-white/10 hover:border-red-500 hover:text-red-500'}`}
                                                >
                                                    Absent
                                                </button>
                                                <button 
                                                    onClick={() => handleStatusChange(record.student._id, 'Late')}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${record.status === 'Late' ? 'bg-yellow-500 text-white border-yellow-600 shadow-sm' : 'bg-transparent text-gray-500 border-gray-200 dark:border-white/10 hover:border-yellow-500 hover:text-yellow-500'}`}
                                                >
                                                    Late
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <input 
                                                type="text" 
                                                value={record.remarks} 
                                                onChange={(e) => handleRemarksChange(record.student._id, e.target.value)}
                                                placeholder="Optional note..."
                                                className="w-full bg-transparent border-b border-gray-200 dark:border-white/10 focus:border-purple-500 outline-none p-1 text-sm text-gray-700 dark:text-gray-300 transition-colors"
                                            />
                                        </td>
                                    </tr>
                                ))}
                                {attendanceData.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="p-8 text-center text-gray-500">No students found in this class.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Reports Area */}
            {activeTab === 'report' && reportData && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white">
                            <BarChart2 className="w-8 h-8 mb-4 opacity-50" />
                            <h3 className="text-3xl font-black">{reportData.totalClasses}</h3>
                            <p className="text-indigo-100 font-medium">Total Classes Conducted</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#18181b] rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-purple-500" />
                                Student Attendance Overview
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-white/5 text-gray-500 text-xs uppercase tracking-wider">
                                        <th className="p-4 font-bold">Student</th>
                                        <th className="p-4 font-bold">Present</th>
                                        <th className="p-4 font-bold">Absent</th>
                                        <th className="p-4 font-bold">Percentage</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {reportData.report.map((stat) => (
                                        <tr key={stat.student._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-bold text-gray-900 dark:text-white">
                                                {stat.student.fullname}
                                            </td>
                                            <td className="p-4 text-emerald-600 dark:text-emerald-400 font-medium">{stat.present + stat.late}</td>
                                            <td className="p-4 text-red-600 dark:text-red-400 font-medium">{stat.absent}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-bold ${stat.percentage < 75 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {stat.percentage}%
                                                    </span>
                                                    <div className="w-24 bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                                        <div 
                                                            className={`h-1.5 rounded-full ${stat.percentage < 75 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                                            style={{ width: `${stat.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {reportData.report.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="p-8 text-center text-gray-500">No data available.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherAttendanceDashboard;
