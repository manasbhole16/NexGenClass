import React, { useState } from 'react';
import {
    Users, UserPlus, MoreVertical, Trash2, Mail, Copy, Check, Search,
    LogOut, Maximize2, ShieldAlert, AlertTriangle, X, UserCheck, ExternalLink
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const ClassPeopleTab = ({ roomId, roomDetails, user, onMemberUpdated, onUnenrolled }) => {
    const isOwner = roomDetails?.owner === user?._id || roomDetails?.owner?._id === user?._id;
    const isTeacher = isOwner || user?.role === 'teacher';

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedStudentEmail, setCopiedStudentEmail] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Confirmation Modals State
    const [studentToRemove, setStudentToRemove] = useState(null);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [showCodeBig, setShowCodeBig] = useState(false);

    const members = roomDetails?.members || [];
    const ownerId = roomDetails?.owner?._id || roomDetails?.owner;

    // Separate teacher from students
    const teacherMember = members.find(m => (m._id || m) === ownerId) || (roomDetails?.owner?.fullname ? roomDetails.owner : null);
    const students = members.filter(m => (m._id || m) !== ownerId);

    const filteredStudents = students.filter(s =>
        (s.fullname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleKickMember = async () => {
        if (!studentToRemove) return;
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/kick`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, userId: studentToRemove._id }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                if (onMemberUpdated) onMemberUpdated();
                setStudentToRemove(null);
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
                setIsLeaveModalOpen(false);
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

    const copyEmail = (email, id) => {
        navigator.clipboard.writeText(email);
        setCopiedStudentEmail(id);
        setTimeout(() => setCopiedStudentEmail(null), 2000);
    };

    const formatDate = (dateString) => {
        if (!dateString) return null;
        try {
            return new Date(dateString).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-12" onClick={() => setActiveDropdown(null)}>
            
            {/* 1. TEACHERS SECTION */}
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b-2 border-purple-600/40 pb-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-400 tracking-tight">Teachers</h2>
                        <span className="text-xs font-semibold px-2.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                            1
                        </span>
                    </div>
                </div>

                <div className="p-4 sm:p-5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md flex-shrink-0">
                            {teacherMember?.fullname?.[0]?.toUpperCase() || 'T'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900 dark:text-white text-base">
                                    {teacherMember?.fullname || 'Instructor'}
                                </p>
                                {isOwner && (
                                    <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold px-2 py-0.5 rounded-md border border-purple-500/20">
                                        You
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                                <Mail className="w-3 h-3" /> {teacherMember?.email || 'Instructor'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                            Primary Teacher
                        </span>
                        {teacherMember?.email && (
                            <a
                                href={`mailto:${teacherMember.email}`}
                                className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                title={`Email ${teacherMember.fullname || 'teacher'}`}
                            >
                                <Mail className="w-4 h-4" />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. STUDENTS / CLASSMATES SECTION */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-purple-600/40 pb-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-400 tracking-tight">
                            {isTeacher ? "Students" : "Classmates"}
                        </h2>
                        <span className="text-xs font-semibold px-2.5 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-full">
                            {students.length} {students.length === 1 ? 'student' : 'students'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {isOwner && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsInviteModalOpen(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                            >
                                <UserPlus className="w-4 h-4" /> Invite students
                            </button>
                        )}
                        {!isOwner && (
                            <button
                                onClick={() => setIsLeaveModalOpen(true)}
                                disabled={actionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 transition-colors"
                            >
                                <LogOut className="w-3.5 h-3.5" /> Leave class
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                {students.length > 0 && (
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by student name or email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs sm:text-sm outline-none focus:border-purple-500 text-gray-900 dark:text-white transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Students List */}
                <div className="space-y-2.5">
                    {filteredStudents.length === 0 ? (
                        <div className="py-12 px-6 text-center bg-white dark:bg-[#18181c] border border-dashed border-gray-300 dark:border-white/10 rounded-2xl text-gray-500 space-y-3">
                            <Users className="w-12 h-12 mx-auto text-purple-400/40" />
                            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">
                                {students.length === 0 ? "No students enrolled yet" : "No matching students found"}
                            </h3>
                            <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                {students.length === 0
                                    ? (isTeacher
                                        ? "Share the class code with your students so they can join this classroom."
                                        : "You are the first student to join this classroom.")
                                    : `No students matched "${searchQuery}".`}
                            </p>
                            {isOwner && students.length === 0 && (
                                <button
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition-all mt-2"
                                >
                                    <UserPlus className="w-4 h-4" /> Get Class Code & Link
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredStudents.map(student => {
                            const isCurrentUser = student._id === user?._id;
                            const joinedDate = formatDate(student.createdAt);

                            return (
                                <div
                                    key={student._id}
                                    className="flex items-center justify-between p-4 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl hover:border-purple-400/50 dark:hover:border-purple-500/30 transition-all shadow-sm group"
                                >
                                    <div className="flex items-center gap-3.5 overflow-hidden">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                            {student.fullname?.[0]?.toUpperCase() || 'S'}
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                                    {student.fullname || 'Student'}
                                                </p>
                                                {isCurrentUser && (
                                                    <span className="text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold px-2 py-0.5 rounded-md border border-cyan-500/20">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                {student.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {joinedDate && (
                                            <span className="hidden md:inline-flex text-[11px] text-gray-400 items-center gap-1 font-mono">
                                                <UserCheck className="w-3 h-3 text-emerald-500" /> Joined {joinedDate}
                                            </span>
                                        )}

                                        {/* Action options */}
                                        {isOwner ? (
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdown(activeDropdown === student._id ? null : student._id);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                                    title="Student options"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>

                                                {activeDropdown === student._id && (
                                                    <div
                                                        className="absolute right-0 top-10 bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl py-1.5 z-30 w-48 animate-in fade-in duration-100"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        {student.email && (
                                                            <a
                                                                href={`mailto:${student.email}`}
                                                                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                                            >
                                                                <Mail className="w-3.5 h-3.5" /> Email student
                                                            </a>
                                                        )}
                                                        {student.email && (
                                                            <button
                                                                onClick={() => copyEmail(student.email, student._id)}
                                                                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-left"
                                                            >
                                                                {copiedStudentEmail === student._id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                                {copiedStudentEmail === student._id ? "Email copied!" : "Copy email"}
                                                            </button>
                                                        )}
                                                        <div className="border-t border-gray-100 dark:border-white/5 my-1" />
                                                        <button
                                                            onClick={() => {
                                                                setActiveDropdown(null);
                                                                setStudentToRemove(student);
                                                            }}
                                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Remove from class
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            student.email && (
                                                <a
                                                    href={`mailto:${student.email}`}
                                                    className="p-2 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                                    title={`Email ${student.fullname || 'classmate'}`}
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </a>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 3. INVITE MODAL (Teacher only) */}
            {isInviteModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
                    onClick={() => setIsInviteModalOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Invite Students</h3>
                            </div>
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Class Code
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-2xl px-4 py-3 font-mono text-xl font-bold text-purple-600 dark:text-purple-400 tracking-widest text-center shadow-inner">
                                        {roomDetails?.code || '------'}
                                    </div>
                                    <button
                                        onClick={copyCode}
                                        className="px-4 py-3 bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                                        title="Copy class code"
                                    >
                                        {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copiedCode ? "Copied" : "Copy"}
                                    </button>
                                    <button
                                        onClick={() => { setIsInviteModalOpen(false); setShowCodeBig(true); }}
                                        className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-2xl transition-colors"
                                        title="Display code full screen"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Shareable Invite Link
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${window.location.origin}/rooms?code=${roomDetails?.code || ''}`}
                                        className="flex-1 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-2xl px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300 outline-none truncate font-mono"
                                    />
                                    <button
                                        onClick={copyLink}
                                        className="px-4 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors flex-shrink-0"
                                    >
                                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedLink ? "Copied" : "Copy link"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 text-right">
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. REMOVE STUDENT CONFIRMATION MODAL (Teacher only) */}
            {studentToRemove && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
                    onClick={() => setStudentToRemove(null)}
                >
                    <div
                        className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-6 h-6" />
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Remove {studentToRemove.fullname || 'Student'}?
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                This student will be removed from <strong className="text-gray-900 dark:text-white">{roomDetails?.name}</strong> and will no longer have access to classroom assignments, announcements, or grades.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setStudentToRemove(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleKickMember}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                            >
                                {actionLoading ? "Removing..." : "Remove Student"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. LEAVE CLASSROOM CONFIRMATION MODAL (Student only) */}
            {isLeaveModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
                    onClick={() => setIsLeaveModalOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                            <LogOut className="w-6 h-6" />
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Leave {roomDetails?.name}?
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                You will be unenrolled from this class. You won't be able to view course materials or submit assignments unless you re-enroll with the class code.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsLeaveModalOpen(false)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUnenroll}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                            >
                                {actionLoading ? "Leaving..." : "Leave Classroom"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. FULL SCREEN CLASS CODE MODAL */}
            {showCodeBig && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in"
                    onClick={() => setShowCodeBig(false)}
                >
                    <div
                        className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{roomDetails?.name}</h3>
                            <button
                                onClick={() => setShowCodeBig(false)}
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="py-8 bg-gray-50 dark:bg-black/40 rounded-2xl border border-gray-200 dark:border-white/10">
                            <p className="text-5xl md:text-6xl font-mono font-black text-purple-600 dark:text-purple-400 tracking-widest select-all">
                                {roomDetails?.code || '------'}
                            </p>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={copyCode}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
                            >
                                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copiedCode ? "Copied to Clipboard" : "Copy Class Code"}
                            </button>
                            <button
                                onClick={() => setShowCodeBig(false)}
                                className="px-6 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white font-bold text-xs rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ClassPeopleTab;
