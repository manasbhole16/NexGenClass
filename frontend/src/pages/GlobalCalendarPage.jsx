import React, { useState } from 'react';
import { ArrowLeft, UserCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import AcademicPlanner from '../components/calendar/AcademicPlanner';

const GlobalCalendarPage = ({ user, onLogout }) => {
    const [showProfileInfo, setShowProfileInfo] = useState(false);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {/* Top Navigation Header */}
            <header className="p-4 md:px-8 md:py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0f0f12] sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/rooms" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600">
                            Academic Planner 2.0
                        </h1>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-bold hidden sm:block">
                            Unified schedule for assignments, quizzes, attendance, forms, and tasks.
                        </p>
                    </div>
                </div>
                
                {/* Profile Pill */}
                <div className="relative">
                    <div 
                        className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-purple-600/20 cursor-pointer active:scale-95 transition-all" 
                        title="Profile Info" 
                        onClick={() => setShowProfileInfo(!showProfileInfo)}
                    >
                        {user?.fullname?.[0]?.toUpperCase() || 'U'}
                    </div>

                    {showProfileInfo && (
                        <div className="absolute top-12 right-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl z-50 flex flex-col gap-3 animate-fadeIn">
                            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-black text-lg text-white">
                                    {user?.fullname?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-bold text-xs truncate text-slate-900 dark:text-white">{user?.fullname}</p>
                                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                                    <p className="text-[10px] uppercase text-purple-600 dark:text-purple-400 font-black mt-0.5">{user?.role}</p>
                                </div>
                            </div>
                            <button onClick={onLogout} className="w-full px-4 py-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-bold transition-colors">
                                Log Out
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
                <AcademicPlanner user={user} />
            </main>
        </div>
    );
};

export default GlobalCalendarPage;
