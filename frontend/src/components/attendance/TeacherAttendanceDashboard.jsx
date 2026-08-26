import React, { useState, useEffect } from 'react';
import { 
    Users, 
    Calendar, 
    Save, 
    Check, 
    X, 
    AlertCircle, 
    BarChart2, 
    Clock, 
    Plus, 
    Download, 
    Search, 
    Filter, 
    Edit2, 
    Trash2, 
    CheckCircle2, 
    AlertTriangle, 
    Layers, 
    ChevronDown, 
    Printer,
    FileSpreadsheet,
    ShieldCheck
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import { useSocket } from '../../context/SocketContext';
import { useRooms } from '../../context/RoomsContext';

const TeacherAttendanceDashboard = ({ user }) => {
    const { rooms } = useRooms();
    const [selectedRoom, setSelectedRoom] = useState('');
    const [activeTab, setActiveTab] = useState('take'); // 'take', 'history', 'report', 'analytics'
    
    // Session State
    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [sessionTitle, setSessionTitle] = useState('Regular Lecture');
    const [sessionType, setSessionType] = useState('lecture');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [attendanceData, setAttendanceData] = useState([]);
    
    // Reports & Analytics State
    const [reportData, setReportData] = useState(null);
    const [statsData, setStatsData] = useState(null);
    
    // UI Controls
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const socket = useSocket();

    const ownedRooms = rooms.filter(r => (r.owner === user?._id || r.owner?._id === user?._id));

    useEffect(() => {
        if (!selectedRoom && ownedRooms.length > 0) {
            setSelectedRoom(ownedRooms[0]._id);
        }
    }, [ownedRooms, selectedRoom]);

    // Socket.IO real-time sync via shared socket
    useEffect(() => {
        if (!socket || !selectedRoom) return;

        const handleAttendanceUpdated = (data) => {
            if (data?.roomId === selectedRoom) {
                fetchSessions();
                if (activeTab === 'report') fetchReport();
                if (activeTab === 'analytics') fetchStats();
            }
        };

        socket.on('attendance_updated', handleAttendanceUpdated);

        return () => {
            socket.off('attendance_updated', handleAttendanceUpdated);
        };
    }, [socket, selectedRoom, activeTab]);

    useEffect(() => {
        if (selectedRoom) {
            fetchSessions();
            if (activeTab === 'take') fetchAttendanceForActiveSession();
            if (activeTab === 'report') fetchReport();
            if (activeTab === 'analytics') fetchStats();
        }
    }, [selectedRoom, activeTab]);

    const fetchSessions = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance/room/${selectedRoom}/sessions`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setSessions(json.sessions || []);
            }
        } catch (err) {
            console.error("Failed to fetch sessions", err);
        }
    };

    const fetchAttendanceForActiveSession = async () => {
        try {
            const currentRoom = rooms.find(r => r._id === selectedRoom);
            const studentMembers = currentRoom ? (currentRoom.members || []).filter(m => (m.role || 'student').toLowerCase() === 'student' && (m._id || m) !== user._id) : [];

            const res = await fetch(`${API_BASE_URL}/api/attendance/room/${selectedRoom}/date/${selectedDate}`, { credentials: 'include' });
            const json = await res.json();

            if (json.success && json.attendance) {
                const existing = json.attendance;
                setSelectedSessionId(existing._id);
                setSessionTitle(existing.title || 'Regular Lecture');
                setSessionType(existing.sessionType || 'lecture');
                setStartTime(existing.startTime || '09:00');
                setEndTime(existing.endTime || '10:00');

                // Merge students
                const records = studentMembers.map(student => {
                    const sId = student._id || student;
                    const match = existing.records.find(r => (r.student?._id || r.student)?.toString() === sId.toString());
                    return {
                        student: typeof student === 'object' ? student : { _id: student, fullname: 'Student', email: '' },
                        status: match ? match.status : 'Present',
                        remarks: match ? match.remarks : ''
                    };
                });
                setAttendanceData(records);
            } else {
                // Initialize default roster
                setSelectedSessionId('');
                const initial = studentMembers.map(student => ({
                    student: typeof student === 'object' ? student : { _id: student, fullname: 'Student', email: '' },
                    status: 'Present',
                    remarks: ''
                }));
                setAttendanceData(initial);
            }
        } catch (err) {
            console.error("Failed to fetch active attendance", err);
        }
    };

    const fetchReport = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance/room/${selectedRoom}/report`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setReportData(json);
            }
        } catch (err) {
            console.error("Failed to fetch report", err);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance/room/${selectedRoom}/stats`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setStatsData(json);
            }
        } catch (err) {
            console.error("Failed to fetch stats", err);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setAttendanceData(prev => prev.map(r => 
            (r.student._id || r.student) === studentId ? { ...r, status } : r
        ));
    };

    const handleRemarksChange = (studentId, remarks) => {
        setAttendanceData(prev => prev.map(r => 
            (r.student._id || r.student) === studentId ? { ...r, remarks } : r
        ));
    };

    const markAllAs = (status) => {
        setAttendanceData(prev => prev.map(r => ({ ...r, status })));
    };

    const markRemainingAs = (status) => {
        setAttendanceData(prev => prev.map(r => r.status ? r : { ...r, status }));
    };

    const saveAttendance = async () => {
        setSaving(true);
        setSaveMessage('');
        try {
            const payload = {
                roomId: selectedRoom,
                sessionId: selectedSessionId || undefined,
                title: sessionTitle,
                sessionType,
                date: selectedDate,
                startTime,
                endTime,
                records: attendanceData.map(r => ({
                    student: r.student._id || r.student,
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
                setSaveMessage("Attendance saved & synchronized successfully!");
                setSelectedSessionId(json.attendance._id);
                fetchSessions();
                setTimeout(() => setSaveMessage(''), 4000);
            } else {
                alert(json.message || "Failed to save attendance.");
            }
        } catch (err) {
            console.error(err);
            alert("Network error saving attendance.");
        } finally {
            setSaving(false);
        }
    };

    const handleExportCSV = () => {
        window.open(`${API_BASE_URL}/api/attendance/room/${selectedRoom}/export`, '_blank');
    };

    const handleDeleteSession = async (sessionId) => {
        if (!window.confirm("Are you sure you want to delete this attendance session?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance/session/${sessionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const json = await res.json();
            if (json.success) {
                fetchSessions();
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-pink-500 font-bold">
                <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mr-3" />
                Loading Attendance Dashboard...
            </div>
        );
    }

    if (rooms.length === 0) {
        return (
            <div className="max-w-xl mx-auto text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-3">
                <Users className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No Classroom Found</h3>
                <p className="text-xs text-slate-500">Create or join a classroom first to take and track attendance.</p>
            </div>
        );
    }

    // Counts for current session
    const presentCount = attendanceData.filter(r => r.status === 'Present').length;
    const lateCount = attendanceData.filter(r => r.status === 'Late').length;
    const absentCount = attendanceData.filter(r => r.status === 'Absent').length;
    const totalStudents = attendanceData.length;
    const sessionPct = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

    const filteredRecords = attendanceData.filter(r => {
        if (!searchQuery) return true;
        const name = (r.student.fullname || '').toLowerCase();
        const email = (r.student.email || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
    });

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
            {/* Top Classroom Selector & Navigation Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Classroom</label>
                        <select 
                            value={selectedRoom} 
                            onChange={(e) => setSelectedRoom(e.target.value)}
                            className="w-full sm:w-64 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-bold focus:border-pink-500 outline-none"
                        >
                            {rooms.map(room => (
                                <option key={room._id} value={room._id}>{room.name}</option>
                            ))}
                        </select>
                    </div>

                    {activeTab === 'take' && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Session Date</label>
                            <input 
                                type="date" 
                                value={selectedDate} 
                                onChange={(e) => { setSelectedDate(e.target.value); }}
                                className="w-full sm:w-44 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-bold focus:border-pink-500 outline-none"
                            />
                        </div>
                    )}
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
                    {[
                        { id: 'take', label: 'Take Attendance' },
                        { id: 'history', label: 'Sessions History' },
                        { id: 'report', label: 'Class Matrix' },
                        { id: 'analytics', label: 'Analytics' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                activeTab === tab.id 
                                    ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20' 
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB 1: TAKE ATTENDANCE & ROSTER */}
            {activeTab === 'take' && (
                <div className="space-y-6">
                    {/* Session Config & Bulk Metrics Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    type="text"
                                    value={sessionTitle}
                                    onChange={(e) => setSessionTitle(e.target.value)}
                                    placeholder="Session Topic / Lecture Name"
                                    className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:border-pink-500 outline-none w-56 sm:w-72"
                                />

                                <select
                                    value={sessionType}
                                    onChange={(e) => setSessionType(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:border-pink-500 outline-none uppercase"
                                >
                                    <option value="lecture">Lecture</option>
                                    <option value="lab">Lab Practical</option>
                                    <option value="tutorial">Tutorial</option>
                                    <option value="seminar">Seminar</option>
                                    <option value="exam">Exam</option>
                                    <option value="general">General</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={saveAttendance}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-pink-600/25 active:scale-95"
                                >
                                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save & Sync'}
                                </button>
                            </div>
                        </div>

                        {saveMessage && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                                <CheckCircle2 className="w-4 h-4" /> {saveMessage}
                            </div>
                        )}

                        {/* Quick Stats & Bulk Actions Row */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <button 
                                    onClick={() => markAllAs('Present')} 
                                    className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-black transition-colors"
                                >
                                    All Present
                                </button>
                                <button 
                                    onClick={() => markAllAs('Absent')} 
                                    className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-black transition-colors"
                                >
                                    All Absent
                                </button>
                                <button 
                                    onClick={() => markRemainingAs('Present')} 
                                    className="px-3.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-black transition-colors"
                                >
                                    Remaining Present
                                </button>
                            </div>

                            {/* Summary Pills */}
                            <div className="flex items-center gap-2 text-xs font-black">
                                <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    {presentCount} Present
                                </span>
                                <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    {lateCount} Late
                                </span>
                                <span className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                    {absentCount} Absent
                                </span>
                                <span className="px-3 py-1 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20">
                                    {sessionPct}% Rate
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Search & Student Roster Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 max-w-sm">
                                <Search className="w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filter roster by student name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none font-medium placeholder-slate-400"
                                />
                            </div>
                            <span className="text-xs font-bold text-slate-400">{filteredRecords.length} Enrolled</span>
                        </div>

                        {filteredRecords.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-xs font-bold">
                                No students match your search filter.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-950/40 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                            <th className="p-4">Student</th>
                                            <th className="p-4 text-center">Attendance Status</th>
                                            <th className="p-4">Remarks / Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                                        {filteredRecords.map((record) => {
                                            const sId = record.student._id || record.student;
                                            return (
                                                <tr key={sId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-black text-xs shrink-0">
                                                                {record.student.fullname?.[0]?.toUpperCase() || 'S'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white">{record.student.fullname || 'Student'}</p>
                                                                <p className="text-[11px] text-slate-400">{record.student.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {[
                                                                { val: 'Present', color: 'emerald' },
                                                                { val: 'Late', color: 'amber' },
                                                                { val: 'Absent', color: 'rose' }
                                                            ].map(opt => {
                                                                const isSelected = record.status === opt.val;
                                                                return (
                                                                    <button
                                                                        key={opt.val}
                                                                        onClick={() => handleStatusChange(sId, opt.val)}
                                                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                                                                            isSelected 
                                                                                ? opt.color === 'emerald' 
                                                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                                                    : opt.color === 'amber'
                                                                                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                                                        : 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                                                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                                                        }`}
                                                                    >
                                                                        {opt.val}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <input
                                                            type="text"
                                                            placeholder="Add remark..."
                                                            value={record.remarks || ''}
                                                            onChange={(e) => handleRemarksChange(sId, e.target.value)}
                                                            className="w-full max-w-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-pink-500"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: SESSIONS HISTORY */}
            {activeTab === 'history' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Classroom Attendance Sessions</h3>
                            <p className="text-xs text-slate-400">All recorded lectures, labs, and attendance events.</p>
                        </div>
                        <span className="text-xs font-bold text-slate-400">{sessions.length} Recorded Sessions</span>
                    </div>

                    {sessions.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs font-bold">
                            No attendance sessions recorded yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sessions.map(session => {
                                const p = (session.records || []).filter(r => r.status === 'Present').length;
                                const l = (session.records || []).filter(r => r.status === 'Late').length;
                                const tot = (session.records || []).length;
                                const rate = tot > 0 ? Math.round(((p + l) / tot) * 100) : 0;

                                return (
                                    <div 
                                        key={session._id} 
                                        className="p-5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4 hover:border-pink-500/40 transition-all"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-pink-500/10 text-pink-500 border border-pink-500/20">
                                                    {session.sessionType || 'lecture'}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400">{session.date}</span>
                                            </div>
                                            <h4 className="font-black text-sm text-slate-900 dark:text-white">{session.title}</h4>
                                            <p className="text-xs text-slate-500 font-medium">
                                                {p} Present &bull; {l} Late &bull; {tot - p - l} Absent
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <span className="text-lg font-black text-pink-500">{rate}%</span>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Turnout</p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setSelectedDate(session.date);
                                                    setSessionTitle(session.title);
                                                    setSessionType(session.sessionType || 'lecture');
                                                    setSelectedSessionId(session._id);
                                                    setActiveTab('take');
                                                }}
                                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors"
                                                title="Edit Session Attendance"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleDeleteSession(session._id)}
                                                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
                                                title="Delete Session"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: CLASSROOM ATTENDANCE MATRIX & CSV REPORT */}
            {activeTab === 'report' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Classroom Attendance Matrix</h3>
                            <p className="text-xs text-slate-400">Cumulative student performance and session turnout report.</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                            >
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                            >
                                <Printer className="w-4 h-4" /> Print Report
                            </button>
                        </div>
                    </div>

                    {!reportData || !reportData.report || reportData.report.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs font-bold">
                            No attendance records available for matrix report.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-950/40 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        <th className="p-4">Student</th>
                                        <th className="p-4 text-center">Cumulative %</th>
                                        <th className="p-4 text-center">Present</th>
                                        <th className="p-4 text-center">Late</th>
                                        <th className="p-4 text-center">Absent</th>
                                        <th className="p-4 text-center">Total Sessions</th>
                                        <th className="p-4 text-center">Threshold Alert</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                                    {reportData.report.map(stat => (
                                        <tr key={stat.student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4 font-bold text-slate-900 dark:text-white">
                                                {stat.student.fullname}
                                                <p className="text-[10px] text-slate-400 font-normal">{stat.student.email}</p>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                                                    stat.percentage >= 75 ? 'bg-emerald-500/10 text-emerald-500' :
                                                    stat.percentage >= 60 ? 'bg-amber-500/10 text-amber-500' :
                                                    'bg-rose-500/10 text-rose-500'
                                                }`}>
                                                    {stat.percentage}%
                                                </span>
                                            </td>
                                            <td className="p-4 text-center font-bold text-emerald-500">{stat.present}</td>
                                            <td className="p-4 text-center font-bold text-amber-500">{stat.late}</td>
                                            <td className="p-4 text-center font-bold text-rose-500">{stat.absent}</td>
                                            <td className="p-4 text-center font-bold text-slate-400">{stat.total}</td>
                                            <td className="p-4 text-center">
                                                {stat.isBelowThreshold ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center gap-1 mx-auto max-w-[110px]">
                                                        <AlertTriangle className="w-3 h-3" /> Low &lt; 75%
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center gap-1 mx-auto max-w-[110px]">
                                                        <ShieldCheck className="w-3 h-3" /> In Good Standing
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 4: ATTENDANCE ANALYTICS */}
            {activeTab === 'analytics' && statsData && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                            <p className="text-[10px] font-black uppercase text-slate-400">Class Average</p>
                            <p className="text-3xl font-black text-pink-500 mt-1">{statsData.overallClassPercentage}%</p>
                            <p className="text-xs text-slate-400 mt-1">Average turnout rate</p>
                        </div>
                        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                            <p className="text-[10px] font-black uppercase text-slate-400">Total Sessions</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{statsData.totalSessions}</p>
                            <p className="text-xs text-slate-400 mt-1">Recorded classes</p>
                        </div>
                        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                            <p className="text-[10px] font-black uppercase text-slate-400">Present Marks</p>
                            <p className="text-3xl font-black text-emerald-500 mt-1">{statsData.totals?.present || 0}</p>
                            <p className="text-xs text-slate-400 mt-1">On-time attendances</p>
                        </div>
                        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                            <p className="text-[10px] font-black uppercase text-slate-400">Absent Marks</p>
                            <p className="text-3xl font-black text-rose-500 mt-1">{statsData.totals?.absent || 0}</p>
                            <p className="text-xs text-slate-400 mt-1">Missed student sessions</p>
                        </div>
                    </div>

                    {/* Turnout Trend by Session */}
                    {statsData.sessionTrend?.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Session Turnout Timeline</h3>
                            <div className="space-y-3">
                                {statsData.sessionTrend.map(item => (
                                    <div key={item.sessionId} className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
                                            <p className="text-[10px] text-slate-400">{item.date} &bull; {item.sessionType}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-32 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden hidden sm:block">
                                                <div className="bg-pink-500 h-full rounded-full transition-all" style={{ width: `${item.percentage}%` }} />
                                            </div>
                                            <span className="font-black text-pink-500 w-12 text-right">{item.percentage}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeacherAttendanceDashboard;
