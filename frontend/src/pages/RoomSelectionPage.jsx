import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
    Plus, Users, BookOpen, Loader, LogOut, MoreVertical,
    FileText, Bell, Award, GraduationCap, Folder, CheckSquare, 
    Search, Clock, CheckCircle2, ChevronRight, MessageSquare, ClipboardCheck
} from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import API_BASE_URL from '../apiConfig';
import DashboardWorkArea from '../components/classroom/DashboardWorkArea';
import NotificationCenter from '../components/notifications/NotificationCenter';
import { getBannerGradient } from '../utils/themeUtils';
import classBanner from '../assets/class_banner.jpg';
import { useRooms } from '../context/RoomsContext';

// Lazy load secondary heavy components
const StudentGlobalAnalytics = lazy(() => import('../components/analytics/StudentGlobalAnalytics'));
const CreateClassModal = lazy(() => import('../components/classroom/CreateClassModal'));
const EditClassModal = lazy(() => import('../components/classroom/EditClassModal'));

const ClassroomSkeletonGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-800 rounded-[20px] overflow-hidden shadow-sm flex flex-col h-72 animate-pulse">
                <div className="h-[120px] bg-gradient-to-r from-purple-500/10 to-indigo-500/10 p-4 relative flex flex-col justify-between">
                    <div className="h-5 bg-gray-200 dark:bg-white/10 rounded-md w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-white/10 rounded-md w-1/2" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between bg-white dark:bg-[#1f2937] space-y-3">
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-2/3" />
                        <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/4" />
                </div>
            </div>
        ))}
    </div>
);

const RoomSelectionPage = ({ user, onLogout }) => {
    const { rooms, loading, addRoom, updateRoom, removeRoom } = useRooms();
    const [tasks, setTasks] = useState([]); // For global tasks
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [joinCode, setJoinCode] = useState('');
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
        fetchGlobalTasks();

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

    async function fetchGlobalTasks() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks?roomId=all`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setTasks(data.tasks || []);
            }
        } catch (err) {
            console.error("Failed to load global tasks", err);
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
                addRoom(data.room);
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
                removeRoom(roomId);
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
                removeRoom(roomId);
                setActiveDropdown(null);
            } else {
                alert(data.message || "Failed to delete classroom");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const totalTasksCount = tasks.length;
    const completedTasksCount = tasks.filter(t => t.completed).length;
    const completionPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    const upcomingTasks = tasks
        .filter(t => !t.completed && t.dueDate)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 4);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0a0a0c] text-[#111827] dark:text-white font-sans flex flex-col lg:flex-row transition-colors duration-300">
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Section */}
                <header className="px-6 py-6 md:px-10 lg:pt-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-20">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-1 text-[#111827] dark:text-white">
                            Welcome back, {user?.fullname?.split(' ')[0] || 'Student'} 👋
                        </h1>
                        <p className="text-[#64748B] dark:text-gray-400">Ready to learn something amazing today?</p>
                    </div>

                    <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-4">
                        {/* Search Bar */}
                        <div className="relative w-full sm:w-[280px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search for classes..." 
                                className="w-full bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#EDE9FE] dark:focus:ring-[#6D28D9]/20 transition-all text-[#111827] dark:text-white placeholder:text-gray-400"
                            />
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {/* Notification Center */}
                            <NotificationCenter user={user} />

                            {/* Join/Create Class Button */}
                            {isTeacher ? (
                                <div className="relative group">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setPlusMenuOpen(!plusMenuOpen); }}
                                        className="h-10 px-4 bg-[#6D28D9] text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#5b21b6] hover:shadow-md transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Create Class</span>
                                    </button>
                                    {plusMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => { setIsCreateModalOpen(true); setPlusMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-[#111827] dark:text-gray-200 hover:bg-[#F8FAFC] dark:hover:bg-gray-800 font-medium transition-colors">Create Class</button>
                                            <button onClick={() => { setIsJoinModalOpen(true); setPlusMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-[#111827] dark:text-gray-200 hover:bg-[#F8FAFC] dark:hover:bg-gray-800 font-medium transition-colors">Join Class</button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsJoinModalOpen(true)}
                                    className="h-10 px-4 bg-[#6D28D9] text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#5b21b6] hover:shadow-md transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Join Class</span>
                                </button>
                            )}

                            {/* User Profile Avatar */}
                            <div className="relative">
                                <button onClick={() => setShowProfileInfo(!showProfileInfo)} className="w-10 h-10 rounded-xl bg-[#EDE9FE] dark:bg-[#6D28D9]/20 text-[#6D28D9] dark:text-[#8B5CF6] font-bold flex items-center justify-center border border-[#6D28D9]/20 hover:scale-105 transition-transform">
                                    {user?.fullname?.[0]?.toUpperCase() || 'U'}
                                </button>
                                {showProfileInfo && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl z-50 p-4" onClick={(e) => e.stopPropagation()}>
                                        <p className="font-bold text-sm text-[#111827] dark:text-white line-clamp-1">{user?.fullname}</p>
                                        <p className="text-xs text-[#64748B] dark:text-gray-400 mb-3">{user?.email}</p>
                                        <button onClick={onLogout} className="w-full py-2 bg-red-50 dark:bg-red-900/20 text-[#DC2626] rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2">
                                            <LogOut className="w-3.5 h-3.5" /> Log Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="px-6 md:px-10 py-4 flex-1">
                    {/* Tabs for Student */}
                    {!isTeacher && (
                        <div className="flex items-center gap-8 border-b border-gray-200 dark:border-gray-800 mb-8">
                            <button 
                                onClick={() => setActiveTab('classes')}
                                className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'classes' ? 'border-[#6D28D9] text-[#6D28D9]' : 'border-transparent text-[#64748B] hover:text-[#111827] dark:hover:text-white'}`}
                            >
                                My Classes
                            </button>
                            <button 
                                onClick={() => setActiveTab('analytics')}
                                className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'analytics' ? 'border-[#6D28D9] text-[#6D28D9]' : 'border-transparent text-[#64748B] hover:text-[#111827] dark:hover:text-white'}`}
                            >
                                Global Analytics
                            </button>
                        </div>
                    )}

                    {/* Classes Grid */}
                    {activeTab === 'classes' || isTeacher ? (
                        <>
                            {/* Recently Due / Work Area (Teacher/Student Feature) */}
                            <DashboardWorkArea user={user} />
                            
                            {loading ? (
                                <ClassroomSkeletonGrid />
                            ) : rooms.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {rooms.map(room => {
                                        const isRoomOwner = (room.owner?._id || room.owner) === user?._id;
                                        const bannerGradient = getBannerGradient(room.banner || 'purple');

                                        return (
                                            <motion.div 
                                                key={room._id} 
                                                initial={{ opacity: 0, y: 15 }} 
                                                animate={{ opacity: 1, y: 0 }} 
                                                whileHover={{ y: -4 }} 
                                                className="bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-800 rounded-[20px] overflow-hidden shadow-sm hover:shadow-xl transition-all group relative flex flex-col h-auto cursor-pointer"
                                                onClick={() => navigate(`/room/${room._id}`)}
                                            >
                                                {/* Card Banner */}
                                                <div className={`h-[120px] relative ${bannerGradient} overflow-hidden`}>
                                                    {/* Banner Image overlay */}
                                                    <img src={classBanner} alt="Class Banner" className="w-full h-full object-cover opacity-60 mix-blend-multiply dark:mix-blend-normal" />
                                                    
                                                    {/* Overlay Gradient */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                                    
                                                    {/* Course Menu */}
                                                    <div className="absolute top-3 right-3">
                                                        <button 
                                                            className="p-1.5 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdown(activeDropdown === room._id ? null : room._id);
                                                            }}
                                                        >
                                                            <MoreVertical className="w-5 h-5" />
                                                        </button>
                                                        
                                                        {activeDropdown === room._id && (
                                                            <div className="absolute top-9 right-0 bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50 w-40 py-1" onClick={(e) => e.stopPropagation()}>
                                                                {isRoomOwner ? (
                                                                    <>
                                                                        <button onClick={(e) => { e.stopPropagation(); setEditingRoom(room); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-sm text-[#111827] dark:text-gray-200 hover:bg-[#F8FAFC] dark:hover:bg-gray-800 font-medium transition-colors">Edit Class</button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(room._id); }} className="w-full text-left px-4 py-2 text-sm text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors">Delete Class</button>
                                                                    </>
                                                                ) : (
                                                                    <button onClick={(e) => { e.stopPropagation(); handleUnenroll(room._id); }} className="w-full text-left px-4 py-2 text-sm text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors">Unenroll</button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Instructor Info */}
                                                    <div className="absolute bottom-3 left-4 flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40">
                                                            <Users className="w-3 h-3 text-white" />
                                                        </div>
                                                        <span className="text-white text-xs font-medium drop-shadow-md">
                                                            {isRoomOwner ? 'Owner' : 'Instructor'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Card Body */}
                                                <div className="p-5 flex-1 flex flex-col justify-between bg-white dark:bg-[#1f2937]">
                                                    <div>
                                                        <h2 className="text-xl font-bold text-[#111827] dark:text-white line-clamp-1 mb-1 group-hover:text-[#6D28D9] transition-colors">{room.name}</h2>
                                                        <div className="text-xs text-[#64748B] dark:text-gray-400 font-mono font-medium">Code: {room.code}</div>
                                                    </div>
                                                    
                                                    {/* Quick Links inside Card */}
                                                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#6D28D9] dark:hover:text-[#8B5CF6] transition-colors">
                                                                <FileText className="w-4 h-4" /> Stream
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#6D28D9] dark:hover:text-[#8B5CF6] transition-colors">
                                                                <Users className="w-4 h-4" /> People
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/room/${room._id}/classwork`); }}
                                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-[#6D28D9] dark:hover:text-[#8B5CF6] transition-colors"
                                                                title="Open Classwork"
                                                            >
                                                                <Folder className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/room/${room._id}`); }}
                                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-[#6D28D9] dark:hover:text-[#8B5CF6] transition-colors"
                                                                title="Open Gradebook"
                                                            >
                                                                <Award className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#1f2937] rounded-[24px] border border-gray-100 dark:border-gray-800 text-center shadow-sm">
                                    <div className="w-20 h-20 bg-[#F5F3FF] dark:bg-[#6D28D9]/10 rounded-full flex items-center justify-center mb-4">
                                        <BookOpen className="w-8 h-8 text-[#6D28D9]" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-2">{isTeacher ? "Create your first class" : "No classes yet"}</h3>
                                    <p className="text-[#64748B] dark:text-gray-400 max-w-sm mb-6">
                                        {isTeacher ? "Start by creating a new classroom to post assignments." : "Join a class using your class code to get started."}
                                    </p>
                                    <button onClick={() => { isTeacher ? setIsCreateModalOpen(true) : setIsJoinModalOpen(true) }} className="px-6 py-2.5 bg-[#6D28D9] text-white rounded-xl font-bold hover:bg-[#5b21b6] transition-colors flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> {isTeacher ? 'Create Class' : 'Join Class'}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-white dark:bg-[#1f2937] rounded-[24px] p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                            <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mr-3" />Loading analytics...</div>}>
                                <StudentGlobalAnalytics rooms={rooms} />
                            </Suspense>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side Widgets Panel */}
            <div className="w-full lg:w-[340px] xl:w-[380px] bg-white dark:bg-[#0a0a0c] border-l border-gray-100 dark:border-gray-800 p-6 lg:p-8 flex flex-col gap-8 flex-shrink-0">
                
                {/* To-Do Overview */}
                <div>
                    <h3 className="text-lg font-bold text-[#111827] dark:text-white mb-4">To-do Overview</h3>
                    <div className="bg-[#F5F3FF] dark:bg-[#1f2937] rounded-2xl p-5 border border-[#EDE9FE] dark:border-gray-700 flex items-center gap-5 shadow-sm">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path className="text-gray-200 dark:text-gray-700" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="text-[#6D28D9] transition-all duration-1000" strokeDasharray={`${completionPercentage}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span className="absolute text-sm font-bold text-[#111827] dark:text-white">{completionPercentage}%</span>
                        </div>
                        <div>
                            <p className="font-bold text-[#111827] dark:text-white leading-tight mb-0.5">{completedTasksCount} of {totalTasksCount} tasks</p>
                            <p className="text-xs text-[#64748B] dark:text-gray-400">completed overall</p>
                        </div>
                    </div>
                </div>

                {/* Upcoming Tasks */}
                <div>
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-lg font-bold text-[#111827] dark:text-white">Upcoming Tasks</h3>
                        <Link to="/room/personal" className="text-sm font-medium text-[#6D28D9] hover:underline">View all</Link>
                    </div>
                    
                    {upcomingTasks.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            {upcomingTasks.map((task, i) => {
                                const isDueToday = new Date(task.dueDate).toDateString() === new Date().toDateString();
                                return (
                                    <div key={task._id || i} className="bg-white dark:bg-[#1f2937] p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-[#EDE9FE] dark:hover:border-gray-600 transition-colors cursor-pointer group">
                                        <h4 className="font-semibold text-sm text-[#111827] dark:text-gray-100 mb-1 line-clamp-1 group-hover:text-[#6D28D9]">{task.title}</h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${isDueToday ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'}`}>
                                                {isDueToday ? 'Due Today' : 'Upcoming'}
                                            </div>
                                            <span className="text-xs text-[#64748B] flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(task.dueDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-[#1f2937] rounded-xl p-6 text-center border border-gray-100 dark:border-gray-700">
                            <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium text-[#111827] dark:text-white">No upcoming tasks</p>
                            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">You're all caught up!</p>
                        </div>
                    )}
                </div>

                {/* Quick Access */}
                <div>
                    <h3 className="text-lg font-bold text-[#111827] dark:text-white mb-4">Quick Access</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Link to="/room/personal" className="flex flex-col items-center p-4 bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-700 rounded-xl hover:border-[#6D28D9]/30 hover:shadow-sm transition-all group text-center">
                            <div className="w-10 h-10 rounded-full bg-[#F5F3FF] dark:bg-[#6D28D9]/10 text-[#6D28D9] flex items-center justify-center mb-2 group-hover:bg-[#6D28D9] group-hover:text-white transition-colors">
                                <FileText className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-semibold text-[#111827] dark:text-white">Assignments</span>
                        </Link>
                        <Link to="/rooms" className="flex flex-col items-center p-4 bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-700 rounded-xl hover:border-[#3B82F6]/30 hover:shadow-sm transition-all group text-center">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 text-[#3B82F6] flex items-center justify-center mb-2 group-hover:bg-[#3B82F6] group-hover:text-white transition-colors">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-semibold text-[#111827] dark:text-white">Materials</span>
                        </Link>
                        <Link to="/attendance" className="flex flex-col items-center p-4 bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-700 rounded-xl hover:border-[#16A34A]/30 hover:shadow-sm transition-all group text-center">
                            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-500/10 text-[#16A34A] flex items-center justify-center mb-2 group-hover:bg-[#16A34A] group-hover:text-white transition-colors">
                                <ClipboardCheck className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-semibold text-[#111827] dark:text-white">Attendance</span>
                        </Link>
                        <Link to="/analytics" className="flex flex-col items-center p-4 bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-700 rounded-xl hover:border-[#F59E0B]/30 hover:shadow-sm transition-all group text-center">
                            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/10 text-[#F59E0B] flex items-center justify-center mb-2 group-hover:bg-[#F59E0B] group-hover:text-white transition-colors">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-semibold text-[#111827] dark:text-white">Grades</span>
                        </Link>
                    </div>
                </div>

                {/* Recent Activity (Empty State representation) */}
                <div>
                    <h3 className="text-lg font-bold text-[#111827] dark:text-white mb-4">Recent Activity</h3>
                    <div className="bg-white dark:bg-[#1f2937] p-5 rounded-xl border border-gray-100 dark:border-gray-700 text-center flex flex-col items-center justify-center shadow-sm">
                        <MessageSquare className="w-6 h-6 text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm font-medium text-[#111827] dark:text-white">No recent activity</p>
                        <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">Updates and announcements will appear here.</p>
                    </div>
                </div>

            </div>

            {/* Create Class Modal */}
            <Suspense fallback={null}>
                {isCreateModalOpen && (
                    <CreateClassModal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        onClassCreated={(newRoom) => {
                            addRoom(newRoom);
                            navigate(`/room/${newRoom._id}`);
                        }}
                    />
                )}
            </Suspense>

            {/* Edit Class Modal */}
            <Suspense fallback={null}>
                {editingRoom && (
                    <EditClassModal
                        isOpen={!!editingRoom}
                        room={editingRoom}
                        onClose={() => setEditingRoom(null)}
                        onClassUpdated={(updated) => {
                            updateRoom(updated);
                        }}
                    />
                )}
            </Suspense>

            {/* Google Classroom Style Join Modal */}
            {isJoinModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-[#1f2937] rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-[#111827]">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Join class</h2>
                            <button onClick={() => setIsJoinModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl font-bold">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            {/* Signed-in user card */}
                            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">You are currently signed in as</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="w-9 h-9 rounded-full bg-[#6D28D9] flex items-center justify-center font-bold text-white text-sm">
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
                                    className="text-xs text-[#6D28D9] dark:text-[#8B5CF6] hover:underline font-semibold px-3 py-1.5 border border-[#6D28D9]/30 rounded-lg hover:bg-[#6D28D9]/10 transition-colors"
                                >
                                    Switch account
                                </button>
                            </div>

                            {/* Class Code Input */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Class code</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Ask your teacher for the 6-character class code, then enter it below.
                                </p>
                                <form id="joinForm" onSubmit={handleJoinRoom}>
                                    <input
                                        className="w-full md:w-2/3 bg-gray-50 dark:bg-[#111827] border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:border-[#6D28D9] outline-none text-gray-900 dark:text-white text-lg tracking-widest font-mono uppercase transition-colors"
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
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-[#111827]">
                            <button
                                type="button"
                                onClick={() => setIsJoinModalOpen(false)}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="joinForm"
                                disabled={joinLoading || !isValidCode}
                                className="px-6 py-2 bg-[#6D28D9] hover:bg-[#5b21b6] disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
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
