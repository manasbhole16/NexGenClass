import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, ArrowLeft, Lock, Globe, LogOut, Settings, Trash2, Users,
    MessageSquare, ClipboardList, LayoutDashboard, Award, BrainCircuit, BarChart2,
    Calendar, CheckCircle, FileText, Filter, ChevronDown, ChevronRight, Layers,
    BookOpen, CheckSquare, Paperclip, Clock, Sparkles, FileSpreadsheet
} from 'lucide-react';
import TaskCard from '../components/board/TaskCard';
import NewTaskModal from '../components/NewTaskModal';
import AssignmentModal from '../components/AssignmentModal';
import { io } from 'socket.io-client';
import API_BASE_URL from '../apiConfig';
import PresenceAvatars from '../components/board/PresenceAvatars';
import RoomChat from '../components/board/RoomChat';
import QuizModule from '../components/quiz/QuizModule';
import FormModule from '../components/forms/FormModule';
import ClassroomAnalytics from '../components/analytics/ClassroomAnalytics';

// Google Classroom Core Experience Components
import ClassStreamTab from '../components/classroom/ClassStreamTab';
import ClassPeopleTab from '../components/classroom/ClassPeopleTab';
import ClassGradesTab from '../components/classroom/ClassGradesTab';
import ClassSettingsModal from '../components/classroom/ClassSettingsModal';
import NotificationCenter from '../components/notifications/NotificationCenter';

const COLUMNS = [
    { id: 'Backlog', title: 'Backlog', color: 'bg-gray-500/20' },
    { id: 'Todo', title: 'To Do', color: 'bg-blue-500/20' },
    { id: 'In Progress', title: 'In Progress', color: 'bg-purple-500/20' },
    { id: 'Done', title: 'Done', color: 'bg-emerald-500/20' }
];

const Column = ({ col, tasks, setIsModalOpen, isTeacher }) => {
    const { setNodeRef } = useDroppable({ id: col.id });
    return (
        <div ref={setNodeRef} className="bg-white dark:bg-[#0f0f12] rounded-2xl p-4 flex flex-col h-full border border-gray-200 dark:border-white/5 min-w-[280px] transition-colors duration-300">
            <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${col.color.replace('/20', '')}`} />
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">{col.title}</h3>
                </div>
                {isTeacher && (
                    <Plus onClick={() => setIsModalOpen(true)} className="w-4 h-4 text-gray-500 cursor-pointer hover:text-purple-500" />
                )}
            </div>
            <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 min-h-[100px]">
                    {tasks.map(task => <TaskCard key={task._id} task={task} />)}
                </div>
            </SortableContext>
        </div>
    );
};

const HomePage = ({ user, onLogout }) => {
    const { roomId } = useParams();
    const isPersonal = roomId === 'personal' || !roomId;
    const [tasks, setTasks] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUser, setTypingUser] = useState(null);
    const [roomDetails, setRoomDetails] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [socket, setSocket] = useState(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('stream'); // 'stream' | 'classwork' | 'people' | 'grades' | 'quizzes' | 'analytics'
    const [classworkView, setClassworkView] = useState('list'); // 'list' | 'kanban'
    const [showProfileInfo, setShowProfileInfo] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTopicFilter, setSelectedTopicFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [collapsedTopics, setCollapsedTopics] = useState({});
    const [showCreateDropdown, setShowCreateDropdown] = useState(false);
    const navigate = useNavigate();

    const isTeacher = roomDetails?.owner === user?._id || roomDetails?.owner?._id === user?._id || user?.role === 'teacher';

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const fetchRoomDetails = async () => {
        if (isPersonal) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.room) {
                setRoomDetails(data.room);
            }
        } catch (err) {
            console.error("Failed to fetch room details", err);
        }
    };

    const fetchTasks = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks?roomId=${roomId}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setTasks(data.tasks || []);
        } catch (err) {
            console.error("Failed to fetch tasks", err);
        }
    };

    useEffect(() => {
        fetchRoomDetails();
        fetchTasks();

        const s = io(API_BASE_URL, {
            withCredentials: true,
            transports: ['polling', 'websocket']
        });
        setSocket(s);

        if (user && !isPersonal) {
            s.emit('joinRoom', { roomId, user });
        }

        s.on('presenceUpdate', (users) => {
            setOnlineUsers(users);
        });

        s.on('userTyping', ({ user: tUser, isTyping }) => {
            if (isTyping) setTypingUser(tUser);
            else setTypingUser(null);
        });

        s.on('taskCreated', (newTask) => {
            if (isPersonal && !newTask.room) setTasks(prev => [newTask, ...prev]);
            else if (newTask.room === roomId) setTasks(prev => [newTask, ...prev]);
        });

        s.on('taskUpdated', (updatedTask) => {
            if (isPersonal && !updatedTask.room) setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
            else if (updatedTask.room === roomId) setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
        });

        s.on('taskDeleted', ({ id, roomId: taskRoomId }) => {
            const match = isPersonal ? (taskRoomId === 'personal' || !taskRoomId) : taskRoomId === roomId;
            if (match) setTasks(prev => prev.filter(t => t._id !== id));
        });

        s.on('submissionUpdate', () => {
            fetchTasks();
        });

        s.on('classroom_updated', (updatedRoom) => {
            if (updatedRoom._id === roomId) {
                setRoomDetails(prev => ({ ...prev, ...updatedRoom }));
            }
        });

        s.on('classroom_settings_updated', (updatedRoom) => {
            if (updatedRoom._id === roomId) {
                setRoomDetails(prev => ({ ...prev, ...updatedRoom }));
            }
        });

        s.on('classroom_deleted', ({ roomId: delId }) => {
            if (delId === roomId) {
                alert("This classroom has been deleted by the instructor.");
                navigate('/rooms');
            }
        });

        return () => s.disconnect();
    }, [roomId, isPersonal, user?._id]);

    const handleCreateTask = async (taskData) => {
        try {
            await fetch(`${API_BASE_URL}/api/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...taskData, roomId }),
                credentials: 'include'
            });
            setIsModalOpen(false);
            fetchTasks();
        } catch (err) {
            console.error("Error creating task", err);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) return;
        const activeTask = tasks.find(t => t._id === active.id);
        const overId = over.id;
        let newStatus = activeTask.status;
        if (COLUMNS.find(c => c.id === overId)) newStatus = overId;
        else {
            const overTask = tasks.find(t => t._id === overId);
            if (overTask) newStatus = overTask.status;
        }

        if (activeTask.status !== newStatus) {
            setTasks(prev => prev.map(t => t._id === active.id ? { ...t, status: newStatus } : t));
            await fetch(`${API_BASE_URL}/api/tasks/${active.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
                credentials: 'include'
            });
        }
        setActiveId(null);
    };

    const handleTyping = (isTyping) => {
        if (socket && !isPersonal) {
            socket.emit('typing', { roomId, user, isTyping });
        }
    };

    // Extract unique topics for grouping and filter chips
    const allTopics = useMemo(() => {
        const set = new Set();
        tasks.forEach(t => {
            const tName = (t.topic || t.category || 'General').trim();
            if (tName) set.add(tName);
        });
        return Array.from(set);
    }, [tasks]);

    // Filtered tasks for Classwork Tab
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const topic = (t.topic || t.category || 'General').trim();
            const matchesSearch = !searchQuery.trim() ||
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesTopic = selectedTopicFilter === 'All' || topic === selectedTopicFilter;

            let matchesStatus = true;
            if (statusFilter === 'Draft') {
                matchesStatus = Boolean(t.isDraft);
            } else if (statusFilter === 'Published') {
                matchesStatus = !t.isDraft;
            }

            return matchesSearch && matchesTopic && matchesStatus;
        });
    }, [tasks, searchQuery, selectedTopicFilter, statusFilter]);

    // Tasks grouped by topic
    const tasksByTopic = useMemo(() => {
        const groups = {};
        filteredTasks.forEach(task => {
            const topic = (task.topic || task.category || 'General').trim() || 'General';
            if (!groups[topic]) groups[topic] = [];
            groups[topic].push(task);
        });
        return groups;
    }, [filteredTasks]);

    const toggleTopicCollapse = (topicName) => {
        setCollapsedTopics(prev => ({
            ...prev,
            [topicName]: !prev[topicName]
        }));
    };

    return (
        <div className="min-h-screen p-4 md:p-8 transition-colors duration-300">
            {/* Top Classroom Navigation Bar */}
            <header className="flex flex-col mb-8 border-b border-gray-200 dark:border-white/5 pb-2">
                <div className="flex flex-col gap-4 md:flex-row justify-between items-start md:items-center mb-4">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/rooms"
                            className="p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-400"
                            title="Back to classes"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                {isPersonal ? (
                                    <Lock className="w-4 h-4 text-indigo-500" />
                                ) : (
                                    <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                )}
                                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                    {isPersonal ? 'My Private Space' : roomDetails?.name || 'Classroom'}
                                </h1>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                                {isPersonal ? 'Private tasks' : (
                                    <>
                                        <span>Code: {roomDetails?.code || '...'}</span>
                                        {roomDetails?.section && <span>&bull; {roomDetails.section}</span>}
                                        {roomDetails?.room && <span>&bull; Room {roomDetails.room}</span>}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Header Controls */}
                    <div className="flex items-center gap-3 ml-auto md:ml-0">
                        {/* Settings Button for Teacher */}
                        {!isPersonal && isTeacher && (
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                                title="Class settings"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        )}

                        {/* Presence Avatars */}
                        {!isPersonal && onlineUsers.length > 0 && (
                            <div className="hidden sm:block">
                                <PresenceAvatars users={onlineUsers} currentUserId={user?._id} />
                            </div>
                        )}

                        {/* Notification Center */}
                        <NotificationCenter user={user} />

                        {/* User Profile Avatar */}
                        <div className="relative">
                            <div
                                className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-white shadow-md cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setShowProfileInfo(!showProfileInfo)}
                            >
                                {user?.fullname?.[0]?.toUpperCase() || 'U'}
                            </div>

                            {showProfileInfo && (
                                <div className="absolute top-12 right-0 w-64 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-2xl z-50 flex flex-col gap-3 animate-in fade-in duration-100">
                                    <div className="flex items-center gap-3 border-b border-gray-100 dark:border-white/5 pb-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
                                            {user?.fullname?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{user?.fullname}</p>
                                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                            <p className="text-[10px] uppercase font-bold text-purple-400 mt-0.5">{user?.role}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onLogout}
                                        className="w-full px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Google Classroom Core Tabs Navigation */}
                <div className="flex gap-6 overflow-x-auto custom-scrollbar px-2 -mb-2">
                    <button
                        onClick={() => setActiveTab('stream')}
                        className={`pb-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                            activeTab === 'stream'
                                ? 'border-purple-600 text-purple-600 dark:border-purple-500 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        Stream
                    </button>
                    <button
                        onClick={() => setActiveTab('classwork')}
                        className={`pb-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                            activeTab === 'classwork'
                                ? 'border-purple-600 text-purple-600 dark:border-purple-500 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        Classwork
                    </button>
                    {!isPersonal && (
                        <button
                            onClick={() => setActiveTab('people')}
                            className={`pb-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                                activeTab === 'people'
                                ? 'border-purple-600 text-purple-600 dark:border-purple-500 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            People
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('grades')}
                        className={`pb-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                            activeTab === 'grades'
                                ? 'border-purple-600 text-purple-600 dark:border-purple-500 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        Grades
                    </button>
                    <button
                        onClick={() => setActiveTab('quizzes')}
                        className={`pb-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                            activeTab === 'quizzes'
                                ? 'border-purple-600 text-purple-600 dark:border-purple-500 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        Quizzes
                    </button>
                    <button
                        onClick={() => setActiveTab('forms')}
                        className={`pb-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                            activeTab === 'forms'
                                ? 'border-purple-600 text-purple-600 dark:border-purple-500 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        Forms
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`pb-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                            activeTab === 'analytics'
                                ? 'border-purple-600 text-purple-600 dark:border-purple-500 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        Analytics
                    </button>
                </div>
            </header>

            {/* TAB 1: STREAM */}
            {activeTab === 'stream' && (
                <ClassStreamTab
                    roomId={roomId}
                    roomDetails={roomDetails}
                    user={user}
                    tasks={tasks}
                    socket={socket}
                    onOpenAssignment={(task) => setSelectedAssignment(task)}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onNavigateToClasswork={() => setActiveTab('classwork')}
                />
            )}

            {/* TAB 2: CLASSWORK 2.0 */}
            {activeTab === 'classwork' && (
                <div className="flex flex-col h-[calc(100vh-220px)] max-w-5xl mx-auto w-full">
                    
                    {/* Top Action Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        
                        {/* Search & Topic Chips */}
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search classwork..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:border-purple-500 outline-none text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* View Switcher: List vs Kanban */}
                            <div className="flex gap-1 bg-white dark:bg-[#18181b] p-1 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                                <button
                                    onClick={() => setClassworkView('list')}
                                    className={`p-2 rounded-lg transition-colors ${
                                        classworkView === 'list'
                                            ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                    title="Topic List View"
                                >
                                    <ClipboardList className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setClassworkView('kanban')}
                                    className={`p-2 rounded-lg transition-colors ${
                                        classworkView === 'kanban'
                                            ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                    title="Kanban Board View"
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Teacher Actions / Create Dropdown */}
                        {(isPersonal || isTeacher) && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95 text-xs"
                                >
                                    <Plus className="w-4 h-4" /> Create <ChevronDown className="w-3.5 h-3.5" />
                                </button>

                                {showCreateDropdown && (
                                    <div className="absolute right-0 top-12 w-52 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl z-30 space-y-1 animate-in fade-in">
                                        <button
                                            onClick={() => { setShowCreateDropdown(false); setIsModalOpen(true); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl transition-colors text-left"
                                        >
                                            <FileText className="w-4 h-4 text-purple-500" /> Assignment
                                        </button>
                                        <button
                                            onClick={() => { setShowCreateDropdown(false); setActiveTab('forms'); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl transition-colors text-left"
                                        >
                                            <FileSpreadsheet className="w-4 h-4 text-purple-500" /> Google Form
                                        </button>
                                        <button
                                            onClick={() => { setShowCreateDropdown(false); setIsModalOpen(true); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-xl transition-colors text-left"
                                        >
                                            <BookOpen className="w-4 h-4 text-cyan-500" /> Reference Material
                                        </button>
                                        <button
                                            onClick={() => { setShowCreateDropdown(false); setIsModalOpen(true); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors text-left"
                                        >
                                            <Layers className="w-4 h-4 text-emerald-500" /> Topic
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Topic Filter Chips */}
                    {allTopics.length > 0 && classworkView === 'list' && (
                        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-3 mb-4">
                            <button
                                onClick={() => setSelectedTopicFilter('All')}
                                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                                    selectedTopicFilter === 'All'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                                }`}
                            >
                                All Topics
                            </button>
                            {allTopics.map(topic => (
                                <button
                                    key={topic}
                                    onClick={() => setSelectedTopicFilter(topic)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                                        selectedTopicFilter === topic
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                                    }`}
                                >
                                    {topic}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Classwork Views: List (Topics) vs Kanban */}
                    {classworkView === 'list' ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 w-full">
                            {Object.keys(tasksByTopic).length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/5 rounded-2xl text-gray-500 space-y-3">
                                    <ClipboardList className="w-12 h-12 mx-auto text-purple-500/40" />
                                    <h3 className="font-bold text-base text-gray-800 dark:text-gray-200">No classwork found</h3>
                                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                        {isTeacher
                                            ? "Click '+ Create' above to assign tasks, assignments, or add course materials."
                                            : "This is where you'll see assignments and coursework assigned by your instructor."}
                                    </p>
                                </div>
                            ) : (
                                Object.entries(tasksByTopic).map(([topicName, topicTasks]) => {
                                    const isCollapsed = collapsedTopics[topicName];

                                    return (
                                        <div key={topicName} className="space-y-3">
                                            
                                            {/* Topic Header Banner */}
                                            <div
                                                onClick={() => toggleTopicCollapse(topicName)}
                                                className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-white/10 cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isCollapsed ? (
                                                        <ChevronRight className="w-4 h-4 text-purple-500" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-purple-500" />
                                                    )}
                                                    <h2 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center gap-2">
                                                        <Layers className="w-4 h-4 text-purple-500" /> {topicName}
                                                    </h2>
                                                </div>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {topicTasks.length} {topicTasks.length === 1 ? 'item' : 'items'}
                                                </span>
                                            </div>

                                            {/* Topic Task Items */}
                                            {!isCollapsed && (
                                                <div className="space-y-2.5">
                                                    {topicTasks.map(task => {
                                                        const isDueSoon = task.dueDate && new Date(task.dueDate) > new Date() && (new Date(task.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000);
                                                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

                                                        return (
                                                            <div
                                                                key={task._id}
                                                                onClick={() => setSelectedAssignment(task)}
                                                                className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:shadow-xl hover:border-purple-400 dark:hover:border-purple-500/50 transition-all cursor-pointer group"
                                                            >
                                                                <div className="flex items-center gap-3.5 overflow-hidden">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${
                                                                        task.taskType === 'material'
                                                                            ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                                                                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                                                    }`}>
                                                                        {task.taskType === 'material' ? (
                                                                            <BookOpen className="w-5 h-5" />
                                                                        ) : (
                                                                            <FileText className="w-5 h-5" />
                                                                        )}
                                                                    </div>
                                                                    <div className="overflow-hidden">
                                                                        <div className="flex items-center gap-2">
                                                                            <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                                                                                {task.title}
                                                                            </h3>
                                                                            {task.isDraft && (
                                                                                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">
                                                                                    Draft
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {task.dueDate && (
                                                                            <p className={`text-xs flex items-center gap-1 mt-0.5 ${
                                                                                isOverdue ? 'text-red-400 font-semibold' : isDueSoon ? 'text-amber-500 font-semibold' : 'text-gray-500 dark:text-gray-400'
                                                                            }`}>
                                                                                <Clock className="w-3 h-3" />
                                                                                Due {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2 self-end sm:self-center">
                                                                    {Array.isArray(task.attachments) && task.attachments.length > 0 && (
                                                                        <span className="text-xs bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-lg text-gray-500 flex items-center gap-1" title={`${task.attachments.length} attachments`}>
                                                                            <Paperclip className="w-3 h-3" /> {task.attachments.length}
                                                                        </span>
                                                                    )}
                                                                    {task.taskType !== 'material' && (
                                                                        <span className="text-xs font-bold px-3 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full">
                                                                            {task.maxMarks || 100} pts
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
                            <div className="flex gap-6 flex-1 overflow-x-auto pb-4 custom-scrollbar">
                                {COLUMNS.map(col => (
                                    <Column
                                        key={col.id}
                                        col={col}
                                        tasks={tasks.filter(t => t.status === col.id)}
                                        setIsModalOpen={setIsModalOpen}
                                        isTeacher={isTeacher}
                                    />
                                ))}
                            </div>
                            <DragOverlay>{activeId ? <TaskCard task={tasks.find(t => t._id === activeId)} /> : null}</DragOverlay>
                        </DndContext>
                    )}
                </div>
            )}

            {/* TAB 3: PEOPLE */}
            {activeTab === 'people' && !isPersonal && (
                <ClassPeopleTab
                    roomId={roomId}
                    roomDetails={roomDetails}
                    user={user}
                    onMemberUpdated={fetchRoomDetails}
                    onUnenrolled={() => navigate('/rooms')}
                />
            )}

            {/* TAB 4: GRADES */}
            {activeTab === 'grades' && (
                <ClassGradesTab
                    roomId={roomId}
                    roomDetails={roomDetails}
                    user={user}
                    tasks={tasks}
                    onOpenAssignment={(task) => setSelectedAssignment(task)}
                />
            )}

            {/* TAB 5: QUIZZES */}
            {activeTab === 'quizzes' && (
                <div className="max-w-5xl mx-auto">
                    <QuizModule roomId={isPersonal ? 'personal' : roomId} user={user} />
                </div>
            )}

            {/* TAB 6: GOOGLE FORMS 1.0 */}
            {activeTab === 'forms' && (
                <div className="max-w-5xl mx-auto">
                    <FormModule roomId={isPersonal ? 'personal' : roomId} user={user} roomDetails={roomDetails} />
                </div>
            )}

            {/* TAB 7: ANALYTICS */}
            {activeTab === 'analytics' && (
                <div className="max-w-5xl mx-auto">
                    <ClassroomAnalytics roomId={roomId} />
                </div>
            )}

            {/* Modals */}
            <NewTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleCreateTask}
                onTyping={handleTyping}
                roomId={isPersonal ? 'personal' : roomId}
                roomDetails={roomDetails}
                existingTopics={allTopics}
            />

            <AssignmentModal
                isOpen={!!selectedAssignment}
                onClose={() => setSelectedAssignment(null)}
                task={selectedAssignment}
                user={user}
                roomDetails={roomDetails}
                onUpdate={fetchTasks}
                onDelete={fetchTasks}
            />

            <ClassSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                roomId={roomId}
                onSettingsSaved={(updated) => setRoomDetails(updated)}
            />

            {/* Floating Room Chat */}
            {!isPersonal && (
                <>
                    <RoomChat
                        roomId={roomId}
                        user={user}
                        isOpen={isChatOpen}
                        onClose={() => setIsChatOpen(false)}
                        socket={socket}
                        isOwner={roomDetails?.owner === user?._id}
                    />
                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className="fixed right-4 bottom-4 md:right-6 md:bottom-6 w-12 h-12 md:w-14 md:h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform z-40 group"
                    >
                        <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
                        <div className="absolute -top-10 right-0 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold shadow-lg">
                            Class Chat
                        </div>
                    </button>
                </>
            )}
        </div>
    );
};

export default HomePage;