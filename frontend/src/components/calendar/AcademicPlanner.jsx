import React, { useState, useEffect, useMemo } from 'react';
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay, 
    addMonths, 
    subMonths, 
    addWeeks, 
    subWeeks, 
    addDays, 
    subDays,
    isPast,
    isToday as checkIsToday
} from 'date-fns';
import { 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    Plus, 
    Search, 
    Filter, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    FileText, 
    Brain, 
    FileSpreadsheet, 
    Video, 
    BookOpen, 
    CheckSquare, 
    Layers, 
    X, 
    ArrowRight, 
    User, 
    AlertCircle,
    CalendarDays,
    ListFilter,
    Sparkles,
    Check,
    TrendingUp,
    ExternalLink
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import { io } from 'socket.io-client';

const EVENT_CONFIG = {
    assignment: {
        label: 'Assignment',
        icon: FileText,
        color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        badge: 'bg-indigo-600 text-white',
        dot: 'bg-indigo-500'
    },
    quiz: {
        label: 'Quiz / Exam',
        icon: Brain,
        color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
        badge: 'bg-pink-600 text-white',
        dot: 'bg-pink-500'
    },
    form: {
        label: 'Google Form',
        icon: FileSpreadsheet,
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        badge: 'bg-amber-600 text-white',
        dot: 'bg-amber-500'
    },
    attendance: {
        label: 'Class Session',
        icon: BookOpen,
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        badge: 'bg-emerald-600 text-white',
        dot: 'bg-emerald-500'
    },
    task: {
        label: 'Personal Task',
        icon: CheckSquare,
        color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        badge: 'bg-cyan-600 text-white',
        dot: 'bg-cyan-500'
    },
    event: {
        label: 'Live Class',
        icon: Video,
        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        badge: 'bg-purple-600 text-white',
        dot: 'bg-purple-500'
    }
};

const AcademicPlanner = ({ user, onOpenAssignment, onOpenQuiz }) => {
    // Current date navigation
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day', 'agenda', 'upcoming'
    
    // Data & Filters
    const [events, setEvents] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [upcomingAgenda, setUpcomingAgenda] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Filter controls
    const [selectedRoom, setSelectedRoom] = useState('all');
    const [selectedEventType, setSelectedEventType] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modals
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskFormData, setTaskFormData] = useState({
        title: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'Medium'
    });

    const isTeacher = user?.role === 'teacher';

    // Fetch Classrooms
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/rooms/my-rooms`, { credentials: 'include' });
                const json = await res.json();
                if (json.success) setRooms(json.rooms || []);
            } catch (err) {
                console.error("Failed to load rooms", err);
            }
        };
        fetchRooms();
    }, []);

    // Socket.IO Real-time Synchronization
    useEffect(() => {
        const socket = io(API_BASE_URL.replace('/api', ''), { withCredentials: true });
        
        socket.emit('joinUser', { userId: user?._id });
        if (rooms.length > 0) {
            rooms.forEach(r => socket.emit('joinRoom', { roomId: r._id, user }));
        }

        const handleUpdate = () => {
            fetchEvents();
            if (viewMode === 'upcoming') fetchUpcoming();
        };

        socket.on('taskCreated', handleUpdate);
        socket.on('taskUpdated', handleUpdate);
        socket.on('taskDeleted', handleUpdate);
        socket.on('attendance_updated', handleUpdate);
        socket.on('quizCreated', handleUpdate);

        return () => {
            socket.disconnect();
        };
    }, [user, rooms, viewMode]);

    // Fetch Events when period or filter changes
    useEffect(() => {
        fetchEvents();
        if (viewMode === 'upcoming') fetchUpcoming();
    }, [currentDate, selectedRoom, selectedEventType, selectedStatus, viewMode]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const mStart = startOfWeek(startOfMonth(currentDate));
            const mEnd = endOfWeek(endOfMonth(currentDate));

            const params = new URLSearchParams({
                startDate: mStart.toISOString().split('T')[0],
                endDate: mEnd.toISOString().split('T')[0],
                roomId: selectedRoom,
                eventType: selectedEventType,
                status: selectedStatus,
                search: searchQuery
            });

            const res = await fetch(`${API_BASE_URL}/api/calendar/events?${params.toString()}`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setEvents(json.events || []);
            }
        } catch (err) {
            console.error("Failed to load calendar events", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUpcoming = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/calendar/upcoming`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setUpcomingAgenda(json.agenda);
            }
        } catch (err) {
            console.error("Failed to load upcoming agenda", err);
        }
    };

    const handleToggleTask = async (taskId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/calendar/tasks/${taskId}/toggle`, {
                method: 'PATCH',
                credentials: 'include'
            });
            const json = await res.json();
            if (json.success) {
                fetchEvents();
                if (selectedEvent && selectedEvent.sourceId === taskId) {
                    setSelectedEvent(prev => ({
                        ...prev,
                        status: prev.status === 'completed' ? 'pending' : 'completed'
                    }));
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/api/calendar/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskFormData),
                credentials: 'include'
            });
            const json = await res.json();
            if (json.success) {
                setShowTaskModal(false);
                setTaskFormData({ title: '', description: '', dueDate: new Date().toISOString().split('T')[0], priority: 'Medium' });
                fetchEvents();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Navigation handlers
    const nextPeriod = () => {
        if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
        else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
    };

    const prevPeriod = () => {
        if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
        else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
        else if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
    };

    const goToToday = () => setCurrentDate(new Date());

    // Group events by YYYY-MM-DD for fast month lookup
    const eventsByDate = useMemo(() => {
        const map = {};
        events.forEach(e => {
            if (!map[e.date]) map[e.date] = [];
            map[e.date].push(e);
        });
        return map;
    }, [events]);

    // Calendar Interval Calculations
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Week View Interval
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Metrics for summary banner
    const overdueCount = events.filter(e => e.status === 'overdue').length;
    const todayEvents = eventsByDate[new Date().toISOString().split('T')[0]] || [];

    return (
        <div className="h-full flex flex-col space-y-5 animate-fadeIn">
            {/* Top Academic Planner Toolbar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Header Title & Date Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                                <CalendarDays className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                                    {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
                                    {viewMode === 'week' && `Week of ${format(weekStart, 'MMM d, yyyy')}`}
                                    {viewMode === 'day' && format(currentDate, 'EEEE, MMM d, yyyy')}
                                    {viewMode === 'agenda' && 'Academic Agenda'}
                                    {viewMode === 'upcoming' && 'Upcoming Deadlines & Workload'}
                                </h2>
                                <p className="text-[11px] text-slate-400 font-bold">
                                    {events.length} Scheduled Academic Items &bull; {overdueCount > 0 ? <span className="text-rose-500">{overdueCount} Overdue</span> : <span className="text-emerald-500">All Up to Date</span>}
                                </p>
                            </div>
                        </div>

                        {/* Navigation Arrows */}
                        {viewMode !== 'upcoming' && (
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 ml-2">
                                <button onClick={goToToday} className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all">
                                    Today
                                </button>
                                <button onClick={prevPeriod} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button onClick={nextPeriod} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* View Switcher Tabs & Quick Create */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
                            {[
                                { id: 'month', label: 'Month' },
                                { id: 'week', label: 'Week' },
                                { id: 'day', label: 'Day' },
                                { id: 'agenda', label: 'Agenda' },
                                { id: 'upcoming', label: 'Upcoming' }
                            ].map(view => (
                                <button
                                    key={view.id}
                                    onClick={() => setViewMode(view.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                        viewMode === view.id
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {view.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowTaskModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Add Task
                        </button>
                    </div>
                </div>

                {/* Filter Chips & Search Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                        {/* Classroom Filter */}
                        <select
                            value={selectedRoom}
                            onChange={(e) => setSelectedRoom(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl outline-none"
                        >
                            <option value="all">All Classrooms</option>
                            <option value="personal">Personal Work Only</option>
                            {rooms.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                        </select>

                        {/* Event Type Filter */}
                        <select
                            value={selectedEventType}
                            onChange={(e) => setSelectedEventType(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl outline-none"
                        >
                            <option value="all">All Types</option>
                            <option value="assignment">Assignments</option>
                            <option value="quiz">Quizzes & Exams</option>
                            <option value="form">Google Forms</option>
                            <option value="attendance">Class Sessions</option>
                            <option value="task">Personal Tasks</option>
                            <option value="event">Live Classes</option>
                        </select>

                        {/* Workload Status Filter */}
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl outline-none"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending / Due</option>
                            <option value="overdue">Overdue Items</option>
                            <option value="completed">Completed / Submitted</option>
                        </select>
                    </div>

                    {/* Search Input */}
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 min-w-[200px]">
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search planner..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none font-medium w-full"
                        />
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* VIEW 1: MONTH VIEW                                       */}
            {/* ======================================================== */}
            {viewMode === 'month' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col flex-1 min-h-[550px]">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-black uppercase tracking-wider text-slate-400 text-center py-2.5">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/60 text-xs overflow-y-auto custom-scrollbar">
                        {calendarDays.map((day, idx) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayEvents = eventsByDate[dateStr] || [];
                            const isOutside = !isSameMonth(day, monthStart);
                            const isToday = isSameDay(day, new Date());

                            return (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        if (dayEvents.length === 1) setSelectedEvent(dayEvents[0]);
                                    }}
                                    className={`min-h-[105px] p-2 flex flex-col justify-between transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30 ${
                                        isOutside ? 'opacity-35 bg-slate-50/30 dark:bg-slate-950/20' : ''
                                    } ${isToday ? 'bg-purple-500/5' : ''}`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className={`text-xs font-black ${
                                            isToday 
                                                ? 'w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30' 
                                                : 'text-slate-700 dark:text-slate-300'
                                        }`}>
                                            {format(day, 'd')}
                                        </span>
                                        {dayEvents.length > 0 && (
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {dayEvents.length} items
                                            </span>
                                        )}
                                    </div>

                                    {/* Event Pills */}
                                    <div className="space-y-1 overflow-y-auto max-h-[85px] custom-scrollbar pr-0.5">
                                        {dayEvents.map(event => {
                                            const cfg = EVENT_CONFIG[event.eventType] || EVENT_CONFIG.assignment;
                                            const isOverdue = event.status === 'overdue';
                                            const isDone = event.status === 'completed' || event.status === 'graded' || event.status === 'submitted';

                                            return (
                                                <div
                                                    key={event.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEvent(event);
                                                    }}
                                                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold truncate flex items-center gap-1.5 cursor-pointer hover:shadow-md transition-all ${
                                                        isOverdue 
                                                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' 
                                                            : isDone 
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 line-through opacity-75' 
                                                                : cfg.color
                                                    }`}
                                                    title={`${event.title} (${event.classroom?.name || 'Personal'})`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOverdue ? 'bg-rose-500' : cfg.dot}`} />
                                                    <span className="truncate">{event.title}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 2: WEEK VIEW                                        */}
            {/* ======================================================== */}
            {viewMode === 'week' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col flex-1">
                    <div className="grid grid-cols-7 divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-center py-3">
                        {weekDays.map(day => (
                            <div key={day.toISOString()} className="space-y-0.5">
                                <p className="text-[10px] font-black uppercase text-slate-400">{format(day, 'EEE')}</p>
                                <p className={`text-sm font-black ${isSameDay(day, new Date()) ? 'text-purple-600' : 'text-slate-900 dark:text-white'}`}>
                                    {format(day, 'd MMM')}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800/60 flex-1 min-h-[450px] p-2">
                        {weekDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayEvents = eventsByDate[dateStr] || [];

                            return (
                                <div key={dateStr} className="space-y-2 p-1">
                                    {dayEvents.map(event => {
                                        const cfg = EVENT_CONFIG[event.eventType] || EVENT_CONFIG.assignment;
                                        return (
                                            <div
                                                key={event.id}
                                                onClick={() => setSelectedEvent(event)}
                                                className={`p-2.5 rounded-2xl border text-xs font-bold space-y-1 cursor-pointer hover:shadow-md transition-all ${cfg.color}`}
                                            >
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-black uppercase">
                                                    <span>{event.startTime || 'All Day'}</span>
                                                    <span>{event.classroom?.code || 'Task'}</span>
                                                </div>
                                                <p className="font-black text-slate-900 dark:text-white line-clamp-2">{event.title}</p>
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase inline-block ${cfg.badge}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 3: DAY VIEW                                         */}
            {/* ======================================================== */}
            {viewMode === 'day' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 flex-1">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">
                                {format(currentDate, 'EEEE, MMMM do, yyyy')}
                            </h3>
                            <p className="text-xs text-slate-400">Scheduled events and due deliverables for today.</p>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 bg-purple-500/10 text-purple-600 rounded-xl">
                            {(eventsByDate[format(currentDate, 'yyyy-MM-dd')] || []).length} Items
                        </span>
                    </div>

                    <div className="space-y-3">
                        {(eventsByDate[format(currentDate, 'yyyy-MM-dd')] || []).length === 0 ? (
                            <div className="text-center py-16 text-slate-400 text-xs font-bold space-y-2">
                                <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                                <p>No scheduled classes or deadlines for this day.</p>
                            </div>
                        ) : (
                            (eventsByDate[format(currentDate, 'yyyy-MM-dd')] || []).map(event => {
                                const cfg = EVENT_CONFIG[event.eventType] || EVENT_CONFIG.assignment;
                                const Icon = cfg.icon;

                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => setSelectedEvent(event)}
                                        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all ${cfg.color}`}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.badge}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                                                        {event.classroom?.name || 'Personal'}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400">{event.startTime || 'Due Today'}</span>
                                                </div>
                                                <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{event.title}</h4>
                                            </div>
                                        </div>

                                        <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase ${
                                            event.status === 'overdue' ? 'bg-rose-500 text-white' :
                                            event.status === 'completed' || event.status === 'graded' ? 'bg-emerald-500 text-white' :
                                            'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}>
                                            {event.status}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 4: AGENDA / LIST VIEW                               */}
            {/* ======================================================== */}
            {viewMode === 'agenda' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 flex-1">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Complete Chronological Agenda</h3>
                            <p className="text-xs text-slate-400">All upcoming and historical academic deadlines in order.</p>
                        </div>
                        <span className="text-xs font-bold text-slate-400">{events.length} Total Events</span>
                    </div>

                    <div className="space-y-4">
                        {events.length === 0 ? (
                            <div className="text-center py-16 text-slate-400 text-xs font-bold">
                                No events found matching your filter parameters.
                            </div>
                        ) : (
                            events.map(event => {
                                const cfg = EVENT_CONFIG[event.eventType] || EVENT_CONFIG.assignment;
                                const Icon = cfg.icon;
                                const isOverdue = event.status === 'overdue';

                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => setSelectedEvent(event)}
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-purple-500/40 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.badge}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400">
                                                        {event.classroom?.name || 'Personal'} &bull; {event.date}
                                                    </span>
                                                </div>
                                                <h4 className="font-black text-sm text-slate-900 dark:text-white truncate mt-0.5">{event.title}</h4>
                                                {event.topic && <p className="text-[11px] text-slate-400 font-medium">Topic: {event.topic}</p>}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-center">
                                            {event.eventType === 'task' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleTask(event.sourceId);
                                                    }}
                                                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                                                        event.status === 'completed'
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    <Check className="w-3 h-3" /> {event.status === 'completed' ? 'Done' : 'Mark Done'}
                                                </button>
                                            )}

                                            <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                                                isOverdue ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
                                                event.status === 'completed' || event.status === 'graded' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                                                'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}>
                                                {event.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 5: UPCOMING & OVERDUE WORKLOAD                       */}
            {/* ======================================================== */}
            {viewMode === 'upcoming' && (
                <div className="space-y-6 flex-1">
                    {/* Overdue Section */}
                    {upcomingAgenda?.overdue?.length > 0 && (
                        <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-6 shadow-sm space-y-4">
                            <h3 className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" /> Overdue Workload ({upcomingAgenda.overdue.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {upcomingAgenda.overdue.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedEvent(item)}
                                        className="p-4 bg-white dark:bg-slate-900 border border-rose-500/30 rounded-2xl shadow-sm flex items-center justify-between gap-3 cursor-pointer hover:border-rose-500 transition-all"
                                    >
                                        <div className="min-w-0">
                                            <span className="text-[10px] font-black uppercase text-rose-500">Past Due: {item.date}</span>
                                            <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">{item.title}</h4>
                                            <p className="text-xs text-slate-400">{item.classroom?.name || 'Personal'}</p>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-rose-500 text-white">
                                            Action Required
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Today & Tomorrow Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Today */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-purple-500" /> Today's Schedule ({upcomingAgenda?.today?.length || 0})
                            </h3>
                            <div className="space-y-3">
                                {(upcomingAgenda?.today || []).length === 0 ? (
                                    <p className="text-xs text-slate-400 py-8 text-center font-bold">Nothing due today! Enjoy your day.</p>
                                ) : (
                                    upcomingAgenda.today.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedEvent(item)}
                                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 cursor-pointer hover:border-purple-500 transition-all"
                                        >
                                            <div>
                                                <h4 className="font-black text-xs text-slate-900 dark:text-white">{item.title}</h4>
                                                <p className="text-[10px] text-slate-400">{item.classroom?.name || 'Personal'} &bull; {item.startTime || 'Today'}</p>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-600">
                                                {item.eventType}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Tomorrow */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-indigo-500" /> Tomorrow ({upcomingAgenda?.tomorrow?.length || 0})
                            </h3>
                            <div className="space-y-3">
                                {(upcomingAgenda?.tomorrow || []).length === 0 ? (
                                    <p className="text-xs text-slate-400 py-8 text-center font-bold">No deliverables due tomorrow.</p>
                                ) : (
                                    upcomingAgenda.tomorrow.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedEvent(item)}
                                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 cursor-pointer hover:border-indigo-500 transition-all"
                                        >
                                            <div>
                                                <h4 className="font-black text-xs text-slate-900 dark:text-white">{item.title}</h4>
                                                <p className="text-[10px] text-slate-400">{item.classroom?.name || 'Personal'} &bull; {item.startTime || 'Tomorrow'}</p>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-600">
                                                {item.eventType}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Later This Week */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">Upcoming This Week ({upcomingAgenda?.thisWeek?.length || 0})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(upcomingAgenda?.thisWeek || []).map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedEvent(item)}
                                    className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-purple-500 transition-all space-y-1"
                                >
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                                        <span>{item.date}</span>
                                        <span>{item.eventType}</span>
                                    </div>
                                    <h4 className="font-black text-xs text-slate-900 dark:text-white truncate">{item.title}</h4>
                                    <p className="text-[11px] text-slate-400 truncate">{item.classroom?.name || 'Personal Task'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL 1: EVENT DETAILS DIALOG                            */}
            {/* ======================================================== */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
                        <button
                            onClick={() => setSelectedEvent(null)}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${EVENT_CONFIG[selectedEvent.eventType]?.badge}`}>
                                    {EVENT_CONFIG[selectedEvent.eventType]?.label}
                                </span>
                                <span className="text-xs font-bold text-slate-400">
                                    {selectedEvent.classroom ? selectedEvent.classroom.name : 'Personal To-Do'}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedEvent.title}</h3>
                            {selectedEvent.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{selectedEvent.description}</p>
                            )}
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400">Due / Scheduled</span>
                                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedEvent.date} {selectedEvent.startTime ? `(${selectedEvent.startTime})` : ''}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400">Status</span>
                                <p className="font-bold text-purple-600 uppercase mt-0.5">{selectedEvent.status}</p>
                            </div>
                            {selectedEvent.topic && (
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-400">Topic</span>
                                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedEvent.topic}</p>
                                </div>
                            )}
                            {selectedEvent.maxMarks > 0 && (
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-400">Points</span>
                                    <p className="font-bold text-emerald-500 mt-0.5">{selectedEvent.maxMarks} Pts</p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            {selectedEvent.eventType === 'task' && (
                                <button
                                    onClick={() => handleToggleTask(selectedEvent.sourceId)}
                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md"
                                >
                                    {selectedEvent.status === 'completed' ? 'Mark Incomplete' : 'Mark as Completed'}
                                </button>
                            )}

                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL 2: CREATE PERSONAL TASK DIALOG                     */}
            {/* ======================================================== */}
            {showTaskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
                    <form onSubmit={handleCreateTask} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
                        <button
                            type="button"
                            onClick={() => setShowTaskModal(false)}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <CheckSquare className="w-5 h-5 text-purple-600" /> New Academic Task
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Create a personal reminder or study task on your planner.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Task Title *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Read Chapters 4-6 on Operating Systems"
                                    value={taskFormData.title}
                                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500 font-bold"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="Optional study notes or checklist..."
                                    value={taskFormData.description}
                                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500 font-medium resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Due Date</label>
                                    <input
                                        type="date"
                                        value={taskFormData.dueDate}
                                        onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500 font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Priority</label>
                                    <select
                                        value={taskFormData.priority}
                                        onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500 font-bold"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowTaskModal(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-600/25 active:scale-95"
                            >
                                Save Task
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AcademicPlanner;
