import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CalendarView = ({ tasks }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextPeriod = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevPeriod = () => setCurrentMonth(subMonths(currentMonth, 1));
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
        Low: 'border-l-blue-500 bg-blue-500 text-white',
        Medium: 'border-l-green-500 bg-green-500 text-white',
        High: 'border-l-orange-500 bg-orange-500 text-white',
        Urgent: 'border-l-red-500 bg-red-500 text-white'
    };

    return (
        <div className="bg-[#0f0f12] rounded-3xl border border-white/5 overflow-hidden flex flex-col h-full shadow-2xl">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/5 flex flex-col gap-4 sm:flex-row justify-between sm:items-center bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg md:text-xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
                </div>
                <div className="flex items-center gap-3">

                    <div className="flex items-center gap-2">
                        <button onClick={goToToday} className="px-3 py-1.5 text-[10px] md:text-sm font-bold bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5 mr-2">Today</button>
                        <button onClick={prevPeriod} className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/5"><ChevronLeft className="w-5 h-5" /></button>
                        <button onClick={nextPeriod} className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/5"><ChevronRight className="w-5 h-5" /></button>
                    </div>
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
                        return taskUTCKey === localKey || getLocalDateString(t.dueDate) === localKey;
                    });
                    const isOutside = !isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div key={i} className={`min-h-[100px] border-r border-b border-white/5 p-1 transition-colors hover:bg-white/[0.01] ${isOutside ? 'opacity-40' : ''} ${isToday ? 'bg-purple-500/5' : ''}`}>
                            <div className="flex justify-between items-center mb-3">
                                <span className={`text-sm font-medium ${isToday ? 'bg-purple-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg' : 'text-gray-400'}`}>
                                    {format(day, 'd')}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {dayTasks.map(task => (
                                    <motion.div
                                        key={task._id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`px-2 py-1.5 rounded-lg shadow-sm font-medium text-xs truncate transition-all cursor-pointer hover:opacity-80 ${priorityColors[task.priority] || priorityColors.Medium}`}
                                        title={task.title}
                                    >
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <span className="w-2 h-2 rounded-full bg-white/50" />
                                            {format(new Date(task.dueDate), 'h:mm a')}
                                        </div>
                                        {task.title}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
