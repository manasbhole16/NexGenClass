import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CalendarView = ({ tasks }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToToday = () => setCurrentMonth(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const safeTasks = Array.isArray(tasks) ? tasks : [];

    // Helper to get local date string YYYY-MM-DD
    const getLocalDateString = (date) => {
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return null;
            return format(d, 'yyyy-MM-dd');
        } catch (err) { return null; }
    };

    // Helper for UTC dates to local YYYY-MM-DD (prevents one-day shift)
    const getUTCDateString = (date) => {
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return null;
            return d.toISOString().split('T')[0];
        } catch (err) { return null; }
    };

    const priorityColors = {
        Low: 'border-l-blue-500 bg-blue-500/10 text-blue-300',
        Medium: 'border-l-yellow-500 bg-yellow-500/10 text-yellow-300',
        High: 'border-l-orange-500 bg-orange-500/10 text-orange-300',
        Urgent: 'border-l-red-500 bg-red-500/10 text-red-300'
    };

    return (
        <div className="bg-[#0f0f12] rounded-3xl border border-white/5 overflow-hidden flex flex-col h-full shadow-2xl">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/5 flex flex-col gap-4 sm:flex-row justify-between sm:items-center bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg md:text-xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={goToToday} className="px-3 py-1.5 text-[10px] md:text-sm font-bold bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5 mr-2">Today</button>
                    <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/5"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/5"><ChevronRight className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-7 overflow-y-auto custom-scrollbar">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 md:p-3 text-center text-[10px] md:text-xs font-bold text-gray-500 border-b border-white/5 uppercase tracking-wider">
                        {day}
                    </div>
                ))}

                {calendarDays.map((day, i) => {
                    const localKey = getLocalDateString(day);
                    const dayTasks = safeTasks.filter(t => {
                        if (!t.dueDate) return false;
                        const taskUTCKey = getUTCDateString(t.dueDate);
                        // Try matching UTC string first (database style), then fallback to local (frontend created style)
                        return taskUTCKey === localKey || getLocalDateString(t.dueDate) === localKey;
                    });
                    const isOutside = !isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div key={i} className={`min-h-[80px] md:min-h-[140px] border-r border-b border-white/5 p-1 md:p-2 transition-colors hover:bg-white/[0.01] ${isOutside ? 'opacity-30' : ''} ${isToday ? 'bg-purple-500/5' : ''}`}>
                            <div className="flex justify-between items-center mb-1 md:mb-2 px-1">
                                <span className={`text-[10px] md:text-xs font-medium ${isToday ? 'bg-purple-500 text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center' : 'text-gray-400'}`}>
                                    {format(day, 'd')}
                                </span>
                                {dayTasks.length > 0 && <span className="text-[8px] md:text-[10px] text-purple-400 font-bold bg-purple-500/10 px-1 md:px-1.5 rounded-full">{dayTasks.length}</span>}
                            </div>
                            <div className="space-y-1">
                                {dayTasks.slice(0, 3).map(task => (
                                    <motion.div
                                        key={task._id}
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`px-1.5 py-1 rounded border-l-2 text-[8px] md:text-[10px] truncate font-medium shadow-sm transition-all ${priorityColors[task.priority] || priorityColors.Medium}`}
                                        title={task.title}
                                    >
                                        {task.title}
                                    </motion.div>
                                ))}
                                {dayTasks.length > 3 && (
                                    <div className="text-[8px] text-gray-500 pl-1 font-medium italic">
                                        + {dayTasks.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
