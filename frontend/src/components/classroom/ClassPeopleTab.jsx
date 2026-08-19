import React, { useState } from 'react';
import { Users, UserPlus, MoreVertical, Trash2, Mail, Copy, Check, Search, LogOut } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const ClassPeopleTab = ({ roomId, roomDetails, user, onMemberUpdated, onUnenrolled }) => {
    const isOwner = roomDetails?.owner === user?._id || roomDetails?.owner?._id === user?._id;
    const isTeacher = isOwner || user?.role === 'teacher';

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const members = roomDetails?.members || [];
    const ownerId = roomDetails?.owner?._id || roomDetails?.owner;

    // Separate teacher from students
    const teacherMember = members.find(m => (m._id || m) === ownerId) || (roomDetails?.owner?.fullname ? roomDetails.owner : null);
    const students = members.filter(m => (m._id || m) !== ownerId);

    const filteredStudents = students.filter(s =>
        (s.fullname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleKickMember = async (studentId) => {
        if (!window.confirm("Are you sure you want to remove this student from the classroom?")) return;
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/kick`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, userId: studentId }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                if (onMemberUpdated) onMemberUpdated();
            } else {
                alert(data.message || "Failed to remove student");
            }
        } catch (err) {
            console.error("Failed to kick member", err);
        } finally {
            setActionLoading(false);
            setActiveDropdown(null);
        }
    };

    const handleUnenroll = async () => {
        if (!window.confirm("Are you sure you want to unenroll from this classroom?")) return;
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/unenroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                if (onUnenrolled) onUnenrolled();
            } else {
                alert(data.message || "Failed to unenroll");
            }
        } catch (err) {
            console.error("Failed to unenroll", err);
        } finally {
            setActionLoading(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(roomDetails?.code || '');
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const copyLink = () => {
        const link = `${window.location.origin}/rooms?code=${roomDetails?.code || ''}`;
        navigator.clipboard.writeText(link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10" onClick={() => setActiveDropdown(null)}>
            {/* Teachers Section */}
            <div>
                <div className="flex justify-between items-center border-b-2 border-purple-600/40 pb-3 mb-6">
                    <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-400">Teachers</h2>
                </div>

                <div className="flex items-center justify-between p-4 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                            {teacherMember?.fullname?.[0]?.toUpperCase() || 'T'}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-base">
                                {teacherMember?.fullname || 'Instructor'}
                            </p>
                            <p className="text-xs text-gray-500">{teacherMember?.email || 'Instructor Account'}</p>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                        Primary Teacher
                    </span>
                </div>
            </div>

            {/* Students Section */}
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-purple-600/40 pb-3 mb-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-400">Classmates</h2>
                        <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded-full">
                            {students.length} {students.length === 1 ? 'student' : 'students'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {isOwner && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsInviteModalOpen(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm shadow-md transition-all active:scale-95"
                            >
                                <UserPlus className="w-4 h-4" /> Invite students
                            </button>
                        )}
                        {!isOwner && (
                            <button
                                onClick={handleUnenroll}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20 transition-colors"
                            >
                                <LogOut className="w-3.5 h-3.5" /> Leave class
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Filter */}
                {students.length > 5 && (
                    <div className="relative mb-4">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search students by name or email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-purple-500 text-gray-900 dark:text-white"
                        />
                    </div>
                )}

                {/* Students List */}
                <div className="space-y-2">
                    {filteredStudents.length === 0 ? (
                        <div className="p-8 text-center bg-white dark:bg-[#18181c] border border-dashed border-gray-300 dark:border-white/10 rounded-xl text-gray-500">
                            {students.length === 0
                                ? "No students have enrolled in this class yet. Share the class code or invite link to invite students."
                                : "No students found matching your search."}
                        </div>
                    ) : (
                        filteredStudents.map(student => (
                            <div
                                key={student._id}
                                className="flex items-center justify-between p-4 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/5 rounded-xl hover:border-gray-300 dark:hover:border-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-cyan-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                                        {student.fullname?.[0]?.toUpperCase() || 'S'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                            {student.fullname || 'Student'}
                                        </p>
                                        <p className="text-xs text-gray-500">{student.email}</p>
                                    </div>
                                </div>

                                {isOwner && (
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveDropdown(activeDropdown === student._id ? null : student._id);
                                            }}
                                            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {activeDropdown === student._id && (
                                            <div
                                                className="absolute right-0 top-8 bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl py-1 z-30 w-44 animate-in fade-in duration-100"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <button
                                                    onClick={() => handleKickMember(student._id)}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Remove student
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={() => setIsInviteModalOpen(false)}>
                    <div className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Invite Students</h3>
                            <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold">&times;</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1.5">
                                    Class Code
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2.5 font-mono text-lg font-bold text-purple-600 dark:text-purple-400 tracking-wider">
                                        {roomDetails?.code}
                                    </div>
                                    <button
                                        onClick={copyCode}
                                        className="px-4 py-2.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                                    >
                                        {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copiedCode ? "Copied" : "Copy"}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1.5">
                                    Invite Link
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${window.location.origin}/rooms?code=${roomDetails?.code || ''}`}
                                        className="flex-1 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-gray-300 outline-none truncate"
                                    />
                                    <button
                                        onClick={copyLink}
                                        className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                    >
                                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedLink ? "Copied" : "Copy link"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 text-right">
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassPeopleTab;
