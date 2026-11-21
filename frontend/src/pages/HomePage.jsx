import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, ArrowLeft, Lock, Globe, LogOut, Settings, Trash2, Users,
    MessageSquare, ClipboardList, LayoutDashboard, Award, BrainCircuit, BarChart2,
    Calendar, CheckCircle, FileText, Filter, ChevronDown, ChevronRight, Layers,
    BookOpen, CheckSquare, Paperclip, Clock, Sparkles, FileSpreadsheet, MoreVertical,
    Edit2, ArrowUp, ArrowDown, Send, Folder, FolderPlus, X, Brain, Video
} from 'lucide-react';
import TaskCard from '../components/board/TaskCard';
import API_BASE_URL from '../apiConfig';
import { useSocket } from '../context/SocketContext';
import PresenceAvatars from '../components/board/PresenceAvatars';
import RoomChat from '../components/board/RoomChat';
import ClassStreamTab from '../components/classroom/ClassStreamTab';
import NotificationCenter from '../components/notifications/NotificationCenter';

// Lazy-loaded heavy modules for progressive dashboard loading
const QuizModule = lazy(() => import('../components/quiz/QuizModule'));
const FormModule = lazy(() => import('../components/forms/FormModule'));
const ClassroomAnalytics = lazy(() => import('../components/analytics/ClassroomAnalytics'));
const ClassPeopleTab = lazy(() => import('../components/classroom/ClassPeopleTab'));
const ClassGradesTab = lazy(() => import('../components/classroom/ClassGradesTab'));
const ClassSettingsModal = lazy(() => import('../components/classroom/ClassSettingsModal'));
const ClassroomFilesTab = lazy(() => import('../components/files/ClassroomFilesTab'));
const StudyAssistant = lazy(() => import('../components/ai/StudyAssistant'));
const LiveClassroom = lazy(() => import('../components/live/LiveClassroom'));
const NewTaskModal = lazy(() => import('../components/NewTaskModal'));
const AssignmentModal = lazy(() => import('../components/AssignmentModal'));

const TabLoader = () => (
    <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
        <span className="text-xs font-semibold text-gray-400">Loading module...</span>
    </div>
);

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
                <span className="text-xs bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-gray-600 dark:text-gray-400 font-mono">
                    {tasks.length}
                </span>
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
    const [modalTaskType, setModalTaskType] = useState('assignment');
    const [modalInitialTopic, setModalInitialTopic] = useState('General');

    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUser, setTypingUser] = useState(null);
    const [roomDetails, setRoomDetails] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const socket = useSocket();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('stream'); // 'stream' | 'classwork' | 'people' | 'grades' | 'quizzes' | 'forms' | 'analytics'
    const [classworkView, setClassworkView] = useState('list'); // 'list' | 'kanban'
    const [showProfileInfo, setShowProfileInfo] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTopicFilter, setSelectedTopicFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [collapsedTopics, setCollapsedTopics] = useState({});
    const [showCreateDropdown, setShowCreateDropdown] = useState(false);

    // Topic Management Modals
    const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [isRenameTopicOpen, setIsRenameTopicOpen] = useState(false);
    const [renamingTopicOld, setRenamingTopicOld] = useState('');
    const [renamingTopicNew, setRenamingTopicNew] = useState('');
    const [activeTopicMenu, setActiveTopicMenu] = useState(null);
    const [activeTaskMenu, setActiveTaskMenu] = useState(null);

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
        let isMounted = true;

        const loadData = async () => {
            try {
                if (isPersonal) {
                    const res = await fetch(`${API_BASE_URL}/api/tasks?roomId=${roomId}`, { credentials: 'include' });
                    const data = await res.json();
                    if (isMounted && data.success) setTasks(data.tasks || []);
                } else {
                    const [roomRes, tasksRes] = await Promise.all([
                        fetch(`${API_BASE_URL}/api/rooms/${roomId}`, { credentials: 'include' }),
                        fetch(`${API_BASE_URL}/api/tasks?roomId=${roomId}`, { credentials: 'include' })
                    ]);
                    const [roomData, tasksData] = await Promise.all([
                        roomRes.json(),
                        tasksRes.json()
                    ]);
                    if (isMounted) {
                        if (roomData.success && roomData.room) setRoomDetails(roomData.room);
                        if (tasksData.success && tasksData.tasks) setTasks(tasksData.tasks);
                    }
                }
            } catch (err) {
                console.error("Failed to load classroom data in parallel", err);
            }
        };

        loadData();

        if (!socket) return;

        if (user && !isPersonal) {
            socket.emit('joinRoom', { roomId, user });
        }

        const handlePresence = (users) => setOnlineUsers(users);
        const handleTypingEvt = ({ user: tUser, isTyping }) => setTypingUser(isTyping ? tUser : null);
        const handleTaskCreated = (newTask) => {
            if (isPersonal && !newTask.room) setTasks(prev => [newTask, ...prev]);
            else if (newTask.room === roomId) setTasks(prev => [newTask, ...prev]);
        };
        const handleTaskUpdated = (updatedTask) => {
            if (isPersonal && !updatedTask.room) setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
            else if (updatedTask.room === roomId) setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
        };
        const handleTaskDeleted = ({ id, roomId: taskRoomId }) => {
            const match = isPersonal ? (taskRoomId === 'personal' || !taskRoomId) : taskRoomId === roomId;
            if (match) setTasks(prev => prev.filter(t => t._id !== id));
        };
        const handleSubmissionUpdate = () => fetchTasks();
        const handleClassroomUpdated = (updatedRoom) => {
            if (updatedRoom._id === roomId) {
                setRoomDetails(prev => ({ ...prev, ...updatedRoom }));
            }
        };
        const handleTopicChanged = () => {
            fetchTasks();
            fetchRoomDetails();
        };
        const handleClassroomDeleted = ({ roomId: delId }) => {
            if (delId === roomId) {
                alert("This classroom has been deleted by the instructor.");
                navigate('/rooms');
            }
        };
        const handleStudentJoined = (data) => {
            if (data?.roomId === roomId || !data?.roomId) fetchRoomDetails();
        };
        const handleStudentRemoved = (data) => {
            if (data?.roomId === roomId || !data?.roomId) {
                if (data?.userId === user?._id) {
                    alert("You have been removed from this classroom.");
                    navigate('/rooms');
                } else {
                    fetchRoomDetails();
                }
            }
        };

        socket.on('presenceUpdate', handlePresence);
        socket.on('userTyping', handleTypingEvt);
        socket.on('taskCreated', handleTaskCreated);
        socket.on('taskUpdated', handleTaskUpdated);
        socket.on('taskDeleted', handleTaskDeleted);
        socket.on('submissionUpdate', handleSubmissionUpdate);
        socket.on('classroom_updated', handleClassroomUpdated);
        socket.on('classroom_settings_updated', handleClassroomUpdated);
        socket.on('topicRenamed', handleTopicChanged);
        socket.on('topicDeleted', handleTopicChanged);
        socket.on('classroom_deleted', handleClassroomDeleted);
        socket.on('student_joined', handleStudentJoined);
        socket.on('student_removed', handleStudentRemoved);

        return () => {
            isMounted = false;
            if (user && !isPersonal) {
                socket.emit('leaveRoom', { roomId, user });
            }
            socket.off('presenceUpdate', handlePresence);
            socket.off('userTyping', handleTypingEvt);
            socket.off('taskCreated', handleTaskCreated);
            socket.off('taskUpdated', handleTaskUpdated);
            socket.off('taskDeleted', handleTaskDeleted);
            socket.off('submissionUpdate', handleSubmissionUpdate);
            socket.off('classroom_updated', handleClassroomUpdated);
            socket.off('classroom_settings_updated', handleClassroomUpdated);
            socket.off('topicRenamed', handleTopicChanged);
            socket.off('topicDeleted', handleTopicChanged);
            socket.off('classroom_deleted', handleClassroomDeleted);
            socket.off('student_joined', handleStudentJoined);
            socket.off('student_removed', handleStudentRemoved);
        };
    }, [roomId, user, socket]);

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) return;
        const activeTask = tasks.find(t => t._id === active.id);
        const overColumnId = over.id;
        if (activeTask && activeTask.status !== overColumnId) {
            const updated = { ...activeTask, status: overColumnId };
            setTasks(tasks.map(t => t._id === active.id ? updated : t));
            try {
                await fetch(`${API_BASE_URL}/api/tasks/${active.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: overColumnId }),
                    credentials: 'include'
                });
            } catch (err) {
                console.error("Task update error", err);
            }
        }
        setActiveId(null);
    };

    const handleCreateTask = async (taskData) => {
        try {
            const payload = {
                ...taskData,
                roomId: isPersonal ? 'personal' : roomId
            };
            const res = await fetch(`${API_BASE_URL}/api/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                fetchTasks();
                fetchRoomDetails();
            } else {
                alert(data.message || "Failed to create task");
            }
        } catch (err) {
            console.error("Error creating task", err);
        }
    };

    const handleTyping = (isTyping) => {
        if (!socket || isPersonal) return;
        socket.emit('typing', { roomId, user, isTyping });
    };

    // TOPIC CRUD HANDLERS
    const handleCreateTopic = async (e) => {
        if (e) e.preventDefault();
        if (!newTopicName.trim() || isPersonal) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/topics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTopicName.trim() }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setNewTopicName('');
                setIsCreateTopicOpen(false);
                fetchRoomDetails();
            } else {
                alert(data.message || "Failed to create topic");
            }
        } catch (err) {
            console.error("Failed to create topic", err);
        }
    };

    const handleRenameTopic = async (e) => {
        if (e) e.preventDefault();
        if (!renamingTopicNew.trim() || !renamingTopicOld || isPersonal) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/topics`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName: renamingTopicOld, newName: renamingTopicNew.trim() }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setIsRenameTopicOpen(false);
                setRenamingTopicOld('');
                setRenamingTopicNew('');
                fetchRoomDetails();
                fetchTasks();
            } else {
                alert(data.message || "Failed to rename topic");
            }
        } catch (err) {
            console.error("Failed to rename topic", err);
        }
    };

    const handleDeleteTopic = async (topicName) => {
        if (!window.confirm(`Are you sure you want to delete topic "${topicName}"? All classwork under this topic will be safely moved to 'General'.`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/topics`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topicName }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setActiveTopicMenu(null);
                fetchRoomDetails();
                fetchTasks();
            } else {
                alert(data.message || "Failed to delete topic");
            }
        } catch (err) {
            console.error("Failed to delete topic", err);
        }
    };

    const handleMoveTopic = async (topicName, direction) => {
        const currentTopics = (roomDetails?.topics || []).map(t => t.name);
        const index = currentTopics.indexOf(topicName);
        if (index === -1) return;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= currentTopics.length) return;

        const reordered = [...currentTopics];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(newIndex, 0, moved);

        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/topics/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topics: reordered }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setActiveTopicMenu(null);
                fetchRoomDetails();
            }
        } catch (err) {
            console.error("Failed to reorder topics", err);
        }
    };

    // Quick Task Actions
    const handleQuickPublishTask = async (taskId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isDraft: false }),
                credentials: 'include'
            });
            if (res.ok) {
                setActiveTaskMenu(null);
                fetchTasks();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleQuickDeleteTask = async (taskId) => {
        if (!window.confirm("Are you sure you want to delete this classwork?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                setActiveTaskMenu(null);
                fetchTasks();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleMoveTaskToTopic = async (taskId, newTopic) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: newTopic }),
                credentials: 'include'
            });
            if (res.ok) {
                setActiveTaskMenu(null);
                fetchTasks();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Derived Topic lists
    const roomTopicsList = useMemo(() => {
        const list = (roomDetails?.topics || []).map(t => t.name).filter(Boolean);
        const taskTopics = tasks.map(t => (t.topic || t.category || 'General').trim()).filter(Boolean);
        const combined = Array.from(new Set(['General', ...list, ...taskTopics]));
        return combined;
    }, [roomDetails, tasks]);

    const allTopics = roomTopicsList;

    // Filtered tasks for Classwork Tab
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const topic = (t.topic || t.category || 'General').trim() || 'General';
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

    // Tasks grouped by topic in correct order
    const tasksByTopic = useMemo(() => {
        const groups = {};
        // Initialize all room topics first to ensure order is preserved
        allTopics.forEach(tName => {
            if (selectedTopicFilter === 'All' || selectedTopicFilter === tName) {
                groups[tName] = [];
            }
        });

        filteredTasks.forEach(task => {
            const topic = (task.topic || task.category || 'General').trim() || 'General';
            if (!groups[topic]) groups[topic] = [];
            groups[topic].push(task);
        });

        // Filter out empty topics if user is searching or if student
        const result = {};
        Object.entries(groups).forEach(([name, items]) => {
            if (items.length > 0 || (isTeacher && !searchQuery.trim() && selectedTopicFilter === 'All')) {
                result[name] = items;
            }
        });

        return result;
    }, [filteredTasks, allTopics, isTeacher, searchQuery, selectedTopicFilter]);

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
                                <div className="absolute top-12 right-0 w-64 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-2xl z-50 flex flex-col gap-3 animate-in fade-in">
                                    <div className="flex items-center gap-3 border-b border-gray-200 dark:border-white/10 pb-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                                            {user?.fullname?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-bold text-sm truncate text-gray-900 dark:text-white">{user?.fullname}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                                            <span className="inline-block text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                                                {user?.role}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onLogout}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" /> Log Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-1 sm:gap-6 overflow-x-auto custom-scrollbar pt-2 border-t border-gray-100 dark:border-white/5">
                    {!isPersonal && (
                        <button
                            onClick={() => setActiveTab('stream')}
                            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                                activeTab === 'stream'
                                    ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Stream
                        </button>
                    )}

                    <button
                        onClick={() => setActiveTab('classwork')}
                        className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                            activeTab === 'classwork'
                                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <ClipboardList className="w-4 h-4" />
                        {isPersonal ? 'Tasks' : 'Classwork'}
                    </button>

                    {!isPersonal && (
                        <>
                            <button
                                onClick={() => setActiveTab('people')}
                                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === 'people'
                                        ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <Users className="w-4 h-4" /> People
                            </button>

                            <button
                                onClick={() => setActiveTab('grades')}
                                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === 'grades'
                                        ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <Award className="w-4 h-4" /> Grades
                            </button>

                            <button
                                onClick={() => setActiveTab('quizzes')}
                                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === 'quizzes'
                                        ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <BrainCircuit className="w-4 h-4" /> Quizzes
                            </button>

                            <button
                                onClick={() => setActiveTab('forms')}
                                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === 'forms'
                                        ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <FileSpreadsheet className="w-4 h-4" /> Forms
                            </button>

                            <button
                                onClick={() => setActiveTab('resources')}
                                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === 'resources'
                                        ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <Folder className="w-4 h-4" /> Resources
                            </button>

                            <button
                                onClick={() => setActiveTab('analytics')}
                                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === 'analytics'
                                        ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <BarChart2 className="w-4 h-4" /> Analytics
                            </button>

                            <button
                                onClick={() => setActiveTab('live')}
                                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === 'live'
                                        ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <Video className="w-4 h-4" /> Live Class
                            </button>

                            <button
                                onClick={() => setActiveTab('ai')}
                                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === 'ai'
                                        ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                                        : 'border-transparent text-purple-600/70 dark:text-purple-400/70 hover:text-purple-600 dark:hover:text-purple-300'
                                }`}
                            >
                                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                                {isTeacher ? 'Teaching Copilot' : 'AI Assistant'}
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* TAB 1: STREAM */}
            {activeTab === 'stream' && !isPersonal && (
                <ClassStreamTab
                    roomId={roomId}
                    roomDetails={roomDetails}
                    user={user}
                    onOpenAssignment={(task) => setSelectedAssignment(task)}
                    onOpenPeople={() => setActiveTab('people')}
                />
            )}

            {/* TAB 2: CLASSWORK 2.0 */}
            {activeTab === 'classwork' && (
                <div className="flex flex-col h-[calc(100vh-220px)] max-w-5xl mx-auto w-full">
                    
                    {/* Top Action Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        
                        {/* Search & View Switcher */}
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search classwork or materials..."
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
                            <div className="relative flex items-center gap-2">
                                <button
                                    onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95 text-xs"
                                >
                                    <Plus className="w-4 h-4" /> Create <ChevronDown className="w-3.5 h-3.5" />
                                </button>

                                {showCreateDropdown && (
                                    <div className="absolute right-0 top-12 w-56 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl z-30 space-y-1 animate-in fade-in">
                                        <button
                                            onClick={() => {
                                                setShowCreateDropdown(false);
                                                setModalTaskType('assignment');
                                                setModalInitialTopic('General');
                                                setIsModalOpen(true);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl transition-colors text-left"
                                        >
                                            <FileText className="w-4 h-4 text-purple-500" /> Assignment
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowCreateDropdown(false);
                                                setModalTaskType('material');
                                                setModalInitialTopic('General');
                                                setIsModalOpen(true);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-xl transition-colors text-left"
                                        >
                                            <BookOpen className="w-4 h-4 text-cyan-500" /> Reference Material
                                        </button>
                                        {!isPersonal && (
                                            <button
                                                onClick={() => {
                                                    setShowCreateDropdown(false);
                                                    setIsCreateTopicOpen(true);
                                                }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors text-left"
                                            >
                                                <FolderPlus className="w-4 h-4 text-emerald-500" /> Topic
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setShowCreateDropdown(false); setActiveTab('quizzes'); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:text-pink-600 dark:hover:text-pink-400 rounded-xl transition-colors text-left"
                                        >
                                            <Brain className="w-4 h-4 text-pink-500" /> Quiz / Assessment
                                        </button>
                                        <button
                                            onClick={() => { setShowCreateDropdown(false); setActiveTab('forms'); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl transition-colors text-left"
                                        >
                                            <FileSpreadsheet className="w-4 h-4 text-purple-500" /> Google Form
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
                                className={`px-3.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
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
                                    className={`px-3.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
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
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8 w-full">
                            {Object.keys(tasksByTopic).length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/5 rounded-3xl text-gray-500 space-y-3">
                                    <ClipboardList className="w-12 h-12 mx-auto text-purple-500/40" />
                                    <h3 className="font-bold text-base text-gray-800 dark:text-gray-200">No classwork found</h3>
                                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                        {isTeacher
                                            ? "Click '+ Create' above to assign coursework or create a topic module."
                                            : "This is where you'll see coursework and reference materials assigned by your instructor."}
                                    </p>
                                </div>
                            ) : (
                                Object.entries(tasksByTopic).map(([topicName, topicTasks]) => {
                                    const isCollapsed = collapsedTopics[topicName];

                                    return (
                                        <div key={topicName} className="space-y-3">
                                            
                                            {/* Topic Header Banner */}
                                            <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-white/10 group">
                                                <div
                                                    onClick={() => toggleTopicCollapse(topicName)}
                                                    className="flex items-center gap-2 cursor-pointer select-none"
                                                >
                                                    {isCollapsed ? (
                                                        <ChevronRight className="w-4 h-4 text-purple-500" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-purple-500" />
                                                    )}
                                                    <h2 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center gap-2">
                                                        <Layers className="w-4 h-4 text-purple-500" /> {topicName}
                                                    </h2>
                                                    <span className="text-xs text-gray-400 font-medium ml-1">
                                                        ({topicTasks.length} {topicTasks.length === 1 ? 'item' : 'items'})
                                                    </span>
                                                </div>

                                                {/* Topic Actions Menu for Teacher */}
                                                {isTeacher && !isPersonal && (
                                                    <div className="relative flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setModalTaskType('assignment');
                                                                setModalInitialTopic(topicName);
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="p-1 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg text-xs font-bold flex items-center gap-1"
                                                            title="Add assignment to this topic"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveTopicMenu(activeTopicMenu === topicName ? null : topicName)}
                                                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>

                                                        {activeTopicMenu === topicName && (
                                                            <div className="absolute right-0 top-7 w-44 bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-2xl p-1.5 shadow-2xl z-20 space-y-1 animate-in fade-in">
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveTopicMenu(null);
                                                                        setRenamingTopicOld(topicName);
                                                                        setRenamingTopicNew(topicName);
                                                                        setIsRenameTopicOpen(true);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 rounded-xl"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" /> Rename Topic
                                                                </button>
                                                                <button
                                                                    onClick={() => handleMoveTopic(topicName, 'up')}
                                                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-xl"
                                                                >
                                                                    <ArrowUp className="w-3.5 h-3.5" /> Move Up
                                                                </button>
                                                                <button
                                                                    onClick={() => handleMoveTopic(topicName, 'down')}
                                                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-xl"
                                                                >
                                                                    <ArrowDown className="w-3.5 h-3.5" /> Move Down
                                                                </button>
                                                                {topicName !== 'General' && (
                                                                    <button
                                                                        onClick={() => handleDeleteTopic(topicName)}
                                                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" /> Delete Topic
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Topic Task Items */}
                                            {!isCollapsed && (
                                                <div className="space-y-2.5">
                                                    {topicTasks.length === 0 ? (
                                                        <div className="py-6 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl text-center text-xs text-gray-400">
                                                            No items in this topic module yet.
                                                        </div>
                                                    ) : (
                                                        topicTasks.map(task => {
                                                            const isDueSoon = task.dueDate && new Date(task.dueDate) > new Date() && (new Date(task.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000);
                                                            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

                                                            return (
                                                                <div
                                                                    key={task._id}
                                                                    className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:shadow-xl hover:border-purple-400 dark:hover:border-purple-500/50 transition-all cursor-pointer group relative"
                                                                >
                                                                    <div
                                                                        onClick={() => setSelectedAssignment(task)}
                                                                        className="flex items-center gap-3.5 overflow-hidden flex-1"
                                                                    >
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

                                                                        {/* Card Context Menu for Teacher */}
                                                                        {isTeacher && (
                                                                            <div className="relative">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setActiveTaskMenu(activeTaskMenu === task._id ? null : task._id);
                                                                                    }}
                                                                                    className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg"
                                                                                >
                                                                                    <MoreVertical className="w-4 h-4" />
                                                                                </button>

                                                                                {activeTaskMenu === task._id && (
                                                                                    <div className="absolute right-0 top-7 w-40 bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-2xl p-1.5 shadow-2xl z-30 space-y-1 animate-in fade-in">
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setActiveTaskMenu(null);
                                                                                                setSelectedAssignment(task);
                                                                                            }}
                                                                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-xl text-left"
                                                                                        >
                                                                                            <Edit2 className="w-3.5 h-3.5" /> View / Edit
                                                                                        </button>
                                                                                        {task.isDraft && (
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleQuickPublishTask(task._id);
                                                                                                }}
                                                                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl text-left"
                                                                                            >
                                                                                                <Send className="w-3.5 h-3.5" /> Publish Now
                                                                                            </button>
                                                                                        )}
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleQuickDeleteTask(task._id);
                                                                                            }}
                                                                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-left"
                                                                                        >
                                                                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
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
                <Suspense fallback={<TabLoader />}>
                    <ClassPeopleTab
                        roomId={roomId}
                        roomDetails={roomDetails}
                        user={user}
                        onMemberUpdated={fetchRoomDetails}
                        onUnenrolled={() => navigate('/rooms')}
                    />
                </Suspense>
            )}

            {/* TAB 4: GRADES */}
            {activeTab === 'grades' && (
                <Suspense fallback={<TabLoader />}>
                    <ClassGradesTab
                        roomId={roomId}
                        roomDetails={roomDetails}
                        user={user}
                        tasks={tasks}
                        onOpenAssignment={(task) => setSelectedAssignment(task)}
                    />
                </Suspense>
            )}

            {/* TAB 5: QUIZZES */}
            {activeTab === 'quizzes' && (
                <Suspense fallback={<TabLoader />}>
                    <div className="max-w-5xl mx-auto">
                        <QuizModule roomId={isPersonal ? 'personal' : roomId} user={user} />
                    </div>
                </Suspense>
            )}

            {/* TAB 6: GOOGLE FORMS 1.0 */}
            {activeTab === 'forms' && (
                <Suspense fallback={<TabLoader />}>
                    <div className="max-w-5xl mx-auto">
                        <FormModule roomId={isPersonal ? 'personal' : roomId} user={user} roomDetails={roomDetails} />
                    </div>
                </Suspense>
            )}

            {/* TAB 7: RESOURCES / GOOGLE DRIVE-STYLE FILES */}
            {activeTab === 'resources' && !isPersonal && (
                <Suspense fallback={<TabLoader />}>
                    <div className="max-w-5xl mx-auto">
                        <ClassroomFilesTab roomId={roomId} isTeacher={isTeacher} user={user} />
                    </div>
                </Suspense>
            )}

            {/* TAB 8: ANALYTICS */}
            {activeTab === 'analytics' && (
                <Suspense fallback={<TabLoader />}>
                    <div className="max-w-5xl mx-auto">
                        <ClassroomAnalytics roomId={roomId} />
                    </div>
                </Suspense>
            )}

            {/* TAB 9: LIVE CLASSROOM & WHITEBOARD 2.0 */}
            {activeTab === 'live' && !isPersonal && (
                <Suspense fallback={<TabLoader />}>
                    <div className="max-w-6xl mx-auto h-[750px]">
                        <LiveClassroom roomId={roomId} user={user} isTeacher={isTeacher} />
                    </div>
                </Suspense>
            )}

            {/* TAB 10: AI ACADEMIC COPILOT & STUDY ASSISTANT */}
            {activeTab === 'ai' && (
                <Suspense fallback={<TabLoader />}>
                    <div className="max-w-5xl mx-auto h-[750px]">
                        <StudyAssistant roomId={roomId} user={user} />
                    </div>
                </Suspense>
            )}

            {/* Modals */}
            <Suspense fallback={null}>
                {isModalOpen && (
                    <NewTaskModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleCreateTask}
                        onTyping={handleTyping}
                        roomId={isPersonal ? 'personal' : roomId}
                        roomDetails={roomDetails}
                        existingTopics={allTopics}
                        initialTaskType={modalTaskType}
                        initialTopic={modalInitialTopic}
                    />
                )}
            </Suspense>

            <Suspense fallback={null}>
                {selectedAssignment && (
                    <AssignmentModal
                        isOpen={!!selectedAssignment}
                        onClose={() => setSelectedAssignment(null)}
                        task={selectedAssignment}
                        user={user}
                        roomDetails={roomDetails}
                        onUpdate={fetchTasks}
                        onDelete={fetchTasks}
                    />
                )}
            </Suspense>

            <Suspense fallback={null}>
                {isSettingsOpen && (
                    <ClassSettingsModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        roomId={roomId}
                        onSettingsSaved={(updated) => setRoomDetails(updated)}
                    />
                )}
            </Suspense>

            {/* Create Topic Modal */}
            <AnimatePresence>
                {isCreateTopicOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsCreateTopicOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative z-10 space-y-4"
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <FolderPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    Add Topic Module
                                </h3>
                                <button onClick={() => setIsCreateTopicOpen(false)} className="text-gray-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateTopic} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Topic name (e.g. Unit 1: Foundations)"
                                    value={newTopicName}
                                    onChange={e => setNewTopicName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-2xl text-xs font-semibold outline-none focus:border-purple-500 text-gray-900 dark:text-white"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateTopicOpen(false)}
                                        className="px-4 py-2 border border-gray-200 dark:border-white/10 text-xs font-bold rounded-xl text-gray-600 dark:text-gray-400"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newTopicName.trim()}
                                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                                    >
                                        Add Topic
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Rename Topic Modal */}
            <AnimatePresence>
                {isRenameTopicOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsRenameTopicOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative z-10 space-y-4"
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Edit2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    Rename Topic
                                </h3>
                                <button onClick={() => setIsRenameTopicOpen(false)} className="text-gray-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleRenameTopic} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="New topic name"
                                    value={renamingTopicNew}
                                    onChange={e => setRenamingTopicNew(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-2xl text-xs font-semibold outline-none focus:border-purple-500 text-gray-900 dark:text-white"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsRenameTopicOpen(false)}
                                        className="px-4 py-2 border border-gray-200 dark:border-white/10 text-xs font-bold rounded-xl text-gray-600 dark:text-gray-400"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!renamingTopicNew.trim()}
                                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                                    >
                                        Rename
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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