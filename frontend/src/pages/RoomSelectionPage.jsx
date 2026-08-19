import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Plus, Users, ArrowRight, BookOpen, Loader, LogOut, Lock, MoreVertical,
    FileText, Bell, Award, UserCircle2, GraduationCap, Folder, CheckSquare, Sparkles
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API_BASE_URL from '../apiConfig';
import StudentGlobalAnalytics from '../components/analytics/StudentGlobalAnalytics';
import CreateClassModal from '../components/classroom/CreateClassModal';
import EditClassModal from '../components/classroom/EditClassModal';
import DashboardWorkArea from '../components/classroom/DashboardWorkArea';
import { getBannerGradient } from '../utils/themeUtils';

const RoomSelectionPage = ({ user, onLogout }) => {
    const [rooms, setRooms] = useState([]);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [joinLoading, setJoinLoading] = useState(false);
    const [showProfileInfo, setShowProfileInfo] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [activeTab, setActiveTab] = useState('classes'); // 'classes' | 'analytics'
    const [plusMenuOpen, setPlusMenuOpen] = useState(false);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const isTeacher = user?.role === 'teacher';
    const isValidCode = joinCode.length >= 5 && joinCode.length <= 8 && /^[a-zA-Z0-9]+$/.test(joinCode);

    useEffect(() => {
        fetchRooms();

        // Check if join code was passed in URL
        const urlCode = searchParams.get('code');
        if (urlCode) {
            setJoinCode(urlCode.toUpperCase());
            setIsJoinModalOpen(true);
        }

        const handleClickOutside = () => {
            setActiveDropdown(null);
            setPlusMenuOpen(false);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [searchParams]);

    async function fetchRooms() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/my-rooms`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setRooms(data.rooms || []);
            }
        } catch (err) {
            console.error("Failed to load classrooms", err);
        } finally {
            setLoading(false);
        }
    }

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        setJoinLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success && data.room) {
                if (!rooms.find(r => r._id === data.room._id)) {
                    setRooms([data.room, ...rooms]);
                }
                setIsJoinModalOpen(false);
                setJoinCode('');
                navigate(`/room/${data.room._id}`);
            } else {
                alert(data.message || "Invalid join code");
            }
        } catch (err) {
            console.error("Join class error", err);
        } finally {
            setJoinLoading(false);
        }
    };

    const handleUnenroll = async (roomId) => {
        if (!window.confirm("Are you sure you want to unenroll from this class?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/unenroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setRooms(rooms.filter(r => r._id !== roomId));
                setActiveDropdown(null);
            } else {
                alert(data.message || "Failed to unenroll");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteClass = async (roomId) => {
        if (!window.confirm("Are you sure you want to delete this class? All assignments and announcements will be removed.")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/delete/${roomId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setRooms(rooms.filter(r => r._id !== roomId));
                setActiveDropdown(null);
            } else {
                alert(data.message || "Failed to delete class");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 selection:bg-purple-500/30 transition-colors duration-300">
            {/* Top Dashboard Header */}
            <header className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
                        NexGenClass
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    {/* Plus / Add Class Action */}
                    {isTeacher ? (
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setPlusMenuOpen(!plusMenuOpen); }}
                                className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-all shadow-md active:scale-95 flex items-center justify-center"
                                title="Add class"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                            {plusMenuOpen && (
                                <div
                                    className="absolute right-0 top-12 w-44 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in duration-100"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => { setIsJoinModalOpen(true); setPlusMenuOpen(false); }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium"
                                    >
                                        Join class
                                    </button>
                                    <button
                                        onClick={() => { setIsCreateModalOpen(true); setPlusMenuOpen(false); }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium border-t border-gray-100 dark:border-white/5"
                                    >
                                        Create class
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsJoinModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Join Class
                        </button>
                    )}

                    {/* Profile Avatar */}
                    <div className="relative">
                        <div
                            className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-white shadow-md cursor-pointer hover:scale-105 transition-transform"
                            onClick={(e) => { e.stopPropagation(); setShowProfileInfo(!showProfileInfo); }}
                        >
                            {user?.fullname?.[0]?.toUpperCase() || 'U'}
                        </div>

                        {showProfileInfo && (
                            <div
                                className="absolute top-12 right-0 w-72 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-2xl z-50 space-y-4 animate-in fade-in duration-100"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center gap-3 border-b border-gray-100 dark:border-white/5 pb-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-xl text-white shadow-inner">
                                        {user?.fullname?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{user?.fullname}</p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] uppercase font-extrabold rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                            {user?.role}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={onLogout}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-sm font-semibold transition-colors"
                                >
                                    <LogOut className="w-4 h-4" /> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Student Analytics Tab Toggle if Student */}
            {!isTeacher && (
                <div className="flex items-center gap-6 mb-6 border-b border-gray-200 dark:border-white/5 px-2">
                    <button
                        onClick={() => setActiveTab('classes')}
                        className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                            activeTab === 'classes'
                                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        My Classes
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                            activeTab === 'analytics'
                                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        Global Performance
                    </button>
                </div>
            )}

            {/* Main Area */}
            {activeTab === 'classes' || isTeacher ? (
                <>
                    {/* Recently Due / Work Area */}
                    <DashboardWorkArea user={user} />

                    {/* Classes Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center py-24 text-gray-500">
                            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mr-3" />
                            Loading classes...
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="max-w-md mx-auto text-center py-20 px-6 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm space-y-4">
                            <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                                <GraduationCap className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {isTeacher ? "Create your first class" : "You haven't joined any classes yet"}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {isTeacher
                                    ? "Start by creating a new classroom to post assignments, announcements, and track student grades."
                                    : "Ask your teacher for a class code to join a classroom and access classwork."}
                            </p>
                            <div className="pt-2">
                                {isTeacher ? (
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
                                    >
                                        + Create Class
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsJoinModalOpen(true)}
                                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
                                    >
                                        + Join Class
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {rooms.map(room => {
                                const isRoomOwner = (room.owner?._id || room.owner) === user?._id;
                                const teacherName = room.owner?.fullname || (isRoomOwner ? user.fullname : 'Instructor');
                                const bannerGradient = getBannerGradient(room.banner || 'purple');

                                return (
                                    <motion.div
                                        key={room._id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ y: -4 }}
                                        className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all flex flex-col h-76 group relative"
                                    >
                                        {/* Card Header Banner */}
                                        <div
                                            className={`h-28 bg-gradient-to-r ${bannerGradient} p-4 relative cursor-pointer text-white flex flex-col justify-between`}
                                            onClick={() => navigate(`/room/${room._id}`)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="overflow-hidden pr-2">
                                                    <h2 className="text-lg font-bold truncate group-hover:underline" title={room.name}>
                                                        {room.name}
                                                    </h2>
                                                    {room.section && (
                                                        <p className="text-xs text-purple-200 font-medium mt-0.5 truncate">
                                                            {room.section}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Three dots dropdown */}
                                                <div className="relative">
                                                    <button
                                                        className="p-1 text-white/80 hover:text-white hover:bg-black/20 rounded-full transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDropdown(activeDropdown === room._id ? null : room._id);
                                                        }}
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>

                                                    {activeDropdown === room._id && (
                                                        <div
                                                            className="absolute top-8 right-0 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 w-40 py-1 overflow-hidden animate-in fade-in duration-100"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            {isRoomOwner ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => { setEditingRoom(room); setActiveDropdown(null); }}
                                                                        className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                                                    >
                                                                        Edit class
                                                                    </button>
                                                                    <button
                                                                        onClick={() => navigate(`/room/${room._id}`)}
                                                                        className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                                                    >
                                                                        Open class
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteClass(room._id)}
                                                                        className="w-full text-left px-4 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-t border-gray-100 dark:border-white/5"
                                                                    >
                                                                        Delete class
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleUnenroll(room._id)}
                                                                    className="w-full text-left px-4 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                                >
                                                                    Unenroll
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-xs text-gray-300 font-medium truncate">
                                                {teacherName}
                                            </p>

                                            {/* Teacher Avatar overlap */}
                                            <div className="absolute -bottom-6 right-4 w-14 h-14 rounded-full border-4 border-white dark:border-[#18181c] bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-lg text-white shadow-lg z-10">
                                                {teacherName?.[0]?.toUpperCase() || 'T'}
                                            </div>
                                        </div>

                                        {/* Card Body: Upcoming snippet */}
                                        <div
                                            className="p-4 flex-1 flex flex-col justify-between pt-7 cursor-pointer"
                                            onClick={() => navigate(`/room/${room._id}`)}
                                        >
                                            <div>
                                                {room.upcomingTask ? (
                                                    <div className="space-y-1">
                                                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Due soon</p>
                                                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                                            {room.upcomingTask.title}
                                                        </p>
                                                        <p className="text-[11px] text-purple-600 dark:text-purple-400">
                                                            Due {new Date(room.upcomingTask.dueDate).toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">No work due soon</p>
                                                )}
                                            </div>

                                            <div className="text-[11px] font-mono text-gray-400 mt-2">
                                                Code: <span className="font-bold text-purple-600 dark:text-purple-400">{room.code}</span>
                                            </div>
                                        </div>

                                        {/* Card Footer Quick Actions */}
                                        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/5 flex justify-end items-center gap-1 bg-gray-50/50 dark:bg-white/[0.02]">
                                            <button
                                                onClick={() => navigate(`/room/${room._id}`)}
                                                className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                                title="Open Classwork"
                                            >
                                                <Folder className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/room/${room._id}`)}
                                                className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                                title="Open Gradebook"
                                            >
                                                <Award className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <StudentGlobalAnalytics rooms={rooms} />
            )}

            {/* Create Class Modal */}
            <CreateClassModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onClassCreated={(newRoom) => {
                    setRooms([newRoom, ...rooms]);
                    navigate(`/room/${newRoom._id}`);
                }}
            />

            {/* Edit Class Modal */}
            <EditClassModal
                isOpen={!!editingRoom}
                room={editingRoom}
                onClose={() => setEditingRoom(null)}
                onClassUpdated={(updated) => {
                    setRooms(rooms.map(r => r._id === updated._id ? updated : r));
                }}
            />

            {/* Google Classroom Style Join Modal */}
            {isJoinModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-[#18181c] rounded-2xl border border-gray-200 dark:border-white/10 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Join class</h2>
                            <button onClick={() => setIsJoinModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl font-bold">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            {/* Signed-in user card */}
                            <div className="p-4 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">You are currently signed in as</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-sm">
                                            {user?.fullname?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-gray-900 dark:text-white">{user?.fullname}</p>
                                            <p className="text-xs text-gray-500">{user?.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onLogout}
                                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold px-3 py-1.5 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition-colors"
                                >
                                    Switch account
                                </button>
                            </div>

                            {/* Class Code Input */}
                            <div className="border border-gray-200 dark:border-white/10 rounded-xl p-5 space-y-3">
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Class code</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Ask your teacher for the 6-character class code, then enter it below.
                                </p>
                                <form id="joinForm" onSubmit={handleJoinRoom}>
                                    <input
                                        className="w-full md:w-2/3 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/20 rounded-xl px-4 py-3 focus:border-purple-500 outline-none text-gray-900 dark:text-white text-lg tracking-widest font-mono uppercase transition-colors"
                                        placeholder="CLASS CODE"
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                        autoFocus
                                        maxLength={8}
                                    />
                                    <p className="text-[11px] text-gray-400 mt-2">
                                        Use a class code with 5-8 letters or numbers, without spaces or symbols.
                                    </p>
                                </form>
                            </div>

                            <div className="text-xs text-gray-500 space-y-1">
                                <p className="font-semibold text-gray-700 dark:text-gray-300">To sign in with a class code:</p>
                                <ul className="list-disc pl-5 space-y-0.5">
                                    <li>Use an authorized NexGenClass account</li>
                                    <li>If joining issues occur, ask your instructor to verify the class code</li>
                                </ul>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 bg-gray-50/50 dark:bg-white/[0.02]">
                            <button
                                type="button"
                                onClick={() => setIsJoinModalOpen(false)}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="joinForm"
                                disabled={joinLoading || !isValidCode}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
                            >
                                {joinLoading ? "Joining..." : "Join"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomSelectionPage;
