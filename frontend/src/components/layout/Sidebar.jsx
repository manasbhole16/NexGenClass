import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, CheckSquare, GraduationCap, ClipboardCheck, Bell, ChevronDown, ChevronRight, BookOpen, Layers, MessageSquare } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import { useRooms } from '../../context/RoomsContext';

const Sidebar = ({ user }) => {
    const { rooms } = useRooms();
    const [isTeachingOpen, setIsTeachingOpen] = useState(true);
    const [isEnrolledOpen, setIsEnrolledOpen] = useState(true);
    const location = useLocation();

    const isTeacher = user?.role === 'teacher';

    const teachingRooms = rooms.filter(r => (r.owner?._id || r.owner) === user?._id);
    const enrolledRooms = rooms.filter(r => (r.owner?._id || r.owner) !== user?._id);

    const navItems = [
        { name: 'Home', icon: Home, path: '/rooms' },
        { name: 'Notifications', icon: Bell, path: '/notifications' },
        { name: 'Calendar', icon: Calendar, path: '/calendar' },
        { name: 'To-do / Tasks', icon: CheckSquare, path: '/room/personal' },
        { name: 'Attendance', icon: ClipboardCheck, path: '/attendance' },
        { name: 'Messages', icon: MessageSquare, path: '/messages' },
    ];

    return (
        <aside className="w-64 xl:w-[280px] h-full bg-white dark:bg-[#0a0a0c] border-r border-gray-100 dark:border-white/5 flex flex-col pt-6 flex-shrink-0 hidden md:flex transition-colors duration-300">
            {/* Logo area */}
            <div className="px-6 mb-8 flex items-center gap-3">
                <div className="w-9 h-9 bg-[#6D28D9] rounded-xl flex items-center justify-center shadow-md shadow-[#6D28D9]/20">
                    <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#111827] dark:text-white">
                        NextGen<span className="text-[#6D28D9]">Class</span>
                    </h1>
                    <span className="text-[10px] text-[#64748B] dark:text-gray-400 uppercase tracking-widest font-bold block -mt-0.5">
                        Academic Platform
                    </span>
                </div>
            </div>

            {/* Main Nav */}
            <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 custom-scrollbar pb-6">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-[15px] ${
                                isActive 
                                ? 'bg-[#F5F3FF] dark:bg-[#6D28D9]/10 text-[#6D28D9] dark:text-[#8B5CF6]' 
                                : 'text-[#64748B] dark:text-gray-400 hover:text-[#111827] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <item.icon className={`w-[22px] h-[22px] ${isActive ? 'text-[#6D28D9] dark:text-[#8B5CF6]' : 'text-gray-400'}`} />
                            {item.name}
                        </NavLink>
                    );
                })}

                {/* Teaching Section (if teacher has created rooms) */}
                {isTeacher && teachingRooms.length > 0 && (
                    <div className="my-6 border-t border-gray-100 dark:border-white/5 pt-4">
                        <button
                            onClick={() => setIsTeachingOpen(!isTeachingOpen)}
                            className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-[#111827] dark:hover:text-white transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5" /> Teaching
                            </span>
                            {isTeachingOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        {isTeachingOpen && (
                            <div className="mt-3 space-y-1">
                                {teachingRooms.map(room => {
                                    const isActive = location.pathname === `/room/${room._id}`;
                                    return (
                                        <NavLink
                                            key={room._id}
                                            to={`/room/${room._id}`}
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-[15px] ${
                                                isActive 
                                                ? 'bg-[#F5F3FF] dark:bg-[#6D28D9]/10 text-[#6D28D9] dark:text-white font-medium' 
                                                : 'text-[#64748B] dark:text-gray-400 hover:text-[#111827] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] dark:bg-[#6D28D9]/20 text-[#6D28D9] flex items-center justify-center font-bold text-xs uppercase shadow-sm flex-shrink-0">
                                                {room.name.charAt(0)}
                                            </div>
                                            <span className="truncate">{room.name}</span>
                                        </NavLink>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Enrolled Section */}
                {enrolledRooms.length > 0 && (
                    <div className="my-6 border-t border-gray-100 dark:border-white/5 pt-4">
                        <button
                            onClick={() => setIsEnrolledOpen(!isEnrolledOpen)}
                            className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-[#111827] dark:hover:text-white transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5" /> Enrolled Classes
                            </span>
                            {isEnrolledOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        {isEnrolledOpen && (
                            <div className="mt-3 space-y-1">
                                {enrolledRooms.map(room => {
                                    const isActive = location.pathname === `/room/${room._id}`;
                                    return (
                                        <NavLink
                                            key={room._id}
                                            to={`/room/${room._id}`}
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-[15px] ${
                                                isActive 
                                                ? 'bg-[#F0F9FF] dark:bg-cyan-500/10 text-[#0284C7] dark:text-cyan-400 font-medium' 
                                                : 'text-[#64748B] dark:text-gray-400 hover:text-[#111827] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-[#E0F2FE] dark:bg-cyan-500/20 text-[#0284C7] dark:text-cyan-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm flex-shrink-0">
                                                {room.name.charAt(0)}
                                            </div>
                                            <span className="truncate">{room.name}</span>
                                        </NavLink>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Promotional Card */}
                <div className="mt-8 px-4">
                    <div className="bg-[#F5F3FF] dark:bg-[#1f2937] rounded-2xl p-4 border border-[#EDE9FE] dark:border-gray-800">
                        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm mb-3">
                            <GraduationCap className="w-5 h-5 text-[#8B5CF6]" />
                        </div>
                        <h4 className="text-sm font-bold text-[#111827] dark:text-white mb-1">Keep learning!</h4>
                        <p className="text-xs text-[#64748B] dark:text-gray-400">Track your progress and stay ahead in your classes.</p>
                    </div>
                </div>
            </nav>

            <div className="p-4 border-t border-gray-100 dark:border-white/5">
                <ThemeToggle className="w-full flex justify-center" />
            </div>
        </aside>
    );
};

export default Sidebar;
