import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, CheckSquare, BookOpen, ChevronDown, ChevronRight, GraduationCap } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const Sidebar = ({ user }) => {
    const [rooms, setRooms] = useState([]);
    const [isClassesOpen, setIsClassesOpen] = useState(true);
    const location = useLocation();

    useEffect(() => {
        if (user) {
            fetchRooms();
        }
    }, [user]);

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/my-rooms`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setRooms(data.rooms);
            }
        } catch (err) {
            console.error("Failed to fetch rooms for sidebar", err);
        }
    };

    const navItems = [
        { name: 'Home', icon: Home, path: '/rooms' },
        { name: 'Calendar', icon: Calendar, path: '/calendar' },
        { name: 'To-do', icon: CheckSquare, path: '/todo' },
    ];

    return (
        <div className="w-64 h-full bg-[#0a0a0c] border-r border-white/5 flex flex-col pt-6 flex-shrink-0 hidden md:flex">
            {/* Logo area */}
            <div className="px-6 mb-8 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
                    NextGen
                </h1>
            </div>

            {/* Main Nav */}
            <nav className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${
                                isActive 
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.name}
                        </NavLink>
                    );
                })}

                <div className="my-4 border-t border-white/5 pt-4">
                    <button 
                        onClick={() => setIsClassesOpen(!isClassesOpen)}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider hover:text-white transition-colors"
                    >
                        Enrolled Classes
                        {isClassesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    
                    {isClassesOpen && (
                        <div className="mt-2 space-y-1">
                            {rooms.map(room => {
                                const isActive = location.pathname === `/room/${room._id}`;
                                return (
                                    <NavLink
                                        key={room._id}
                                        to={`/room/${room._id}`}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${
                                            isActive 
                                            ? 'bg-white/10 text-white font-semibold' 
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px] uppercase">
                                            {room.name.charAt(0)}
                                        </div>
                                        <span className="truncate">{room.name}</span>
                                    </NavLink>
                                )
                            })}
                        </div>
                    )}
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
