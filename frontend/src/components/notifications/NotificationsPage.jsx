import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    Check,
    CheckCheck,
    Trash2,
    BookOpen,
    Brain,
    MessageSquare,
    Award,
    Users,
    AlertTriangle,
    Clock,
    Search,
    Filter,
    Layers,
    Sparkles,
    ExternalLink,
    ArrowLeft
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const NotificationsPage = ({ user }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications(page);
    }, [page, activeFilter]);

    const fetchNotifications = async (targetPage = 1) => {
        try {
            setLoading(true);
            let url = `${API_BASE_URL}/api/notifications?page=${targetPage}&limit=30`;
            if (activeFilter === 'unread') {
                url += `&unreadOnly=true`;
            }

            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
                setTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleClearRead = async () => {
        if (!window.confirm("Are you sure you want to clear all read notifications?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/clear-read`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                setNotifications(prev => prev.filter(n => !n.isRead));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                const target = notifications.find(n => n._id === id);
                if (target && !target.isRead) {
                    setUnreadCount(prev => Math.max(0, prev - 1));
                }
                setNotifications(prev => prev.filter(n => n._id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleNavigate = (notif) => {
        if (!notif.isRead) {
            handleMarkAsRead(notif._id);
        }
        if (notif.roomId) {
            const rId = notif.roomId._id || notif.roomId;
            if (notif.type.startsWith('assignment_')) {
                navigate(`/room/${rId}?tab=classwork`);
            } else if (notif.type.startsWith('quiz_')) {
                navigate(`/room/${rId}?tab=quizzes`);
            } else if (notif.type.startsWith('announcement_') || notif.type.startsWith('classroom_')) {
                navigate(`/room/${rId}?tab=stream`);
            } else {
                navigate(`/room/${rId}`);
            }
        } else if (notif.entityType === 'task') {
            navigate('/room/personal');
        } else {
            navigate('/rooms');
        }
    };

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diffMs = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getIconForType = (type) => {
        if (type.startsWith('assignment_due_soon') || type.startsWith('assignment_overdue')) {
            return <AlertTriangle className="w-5 h-5 text-amber-500" />;
        }
        if (type.startsWith('assignment_graded') || type.startsWith('quiz_graded')) {
            return <Award className="w-5 h-5 text-emerald-500" />;
        }
        if (type.startsWith('assignment_')) {
            return <BookOpen className="w-5 h-5 text-pink-500" />;
        }
        if (type.startsWith('quiz_')) {
            return <Brain className="w-5 h-5 text-purple-500" />;
        }
        if (type.startsWith('announcement_')) {
            return <MessageSquare className="w-5 h-5 text-blue-500" />;
        }
        if (type.startsWith('classroom_')) {
            return <Users className="w-5 h-5 text-indigo-500" />;
        }
        return <Sparkles className="w-5 h-5 text-pink-500" />;
    };

    // Filter categories
    const filteredNotifications = notifications.filter(n => {
        const matchesSearch = !searchQuery || 
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.roomId?.name?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (activeFilter === 'all') return true;
        if (activeFilter === 'unread') return !n.isRead;
        if (activeFilter === 'assignments') return n.type.startsWith('assignment_');
        if (activeFilter === 'quizzes') return n.type.startsWith('quiz_');
        if (activeFilter === 'announcements') return n.type.startsWith('announcement_') || n.type.startsWith('classroom_');
        if (activeFilter === 'grades') return n.type.includes('graded') || n.type.includes('returned');
        return true;
    });

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn pb-16">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Activity Center</h1>
                            {unreadCount > 0 && (
                                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-500 border border-pink-500/20">
                                    {unreadCount} unread
                                </span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Stay updated on assignments, tests, grade releases, and classroom announcements.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all shadow-sm"
                        >
                            <CheckCheck className="w-4 h-4 text-pink-500" /> Mark All Read
                        </button>
                    )}
                    <button
                        onClick={handleClearRead}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 hover:text-red-500 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl transition-all shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" /> Clear Read
                    </button>
                </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 ml-1" />
                    <input
                        type="text"
                        placeholder="Search alerts by keyword or class..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none font-medium"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar max-w-full pb-1 sm:pb-0">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'unread', label: 'Unread' },
                        { id: 'assignments', label: 'Assignments' },
                        { id: 'quizzes', label: 'Quizzes' },
                        { id: 'announcements', label: 'Announcements' },
                        { id: 'grades', label: 'Grades' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveFilter(tab.id); setPage(1); }}
                            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                activeFilter === tab.id 
                                    ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Notifications Feed */}
            {loading ? (
                <div className="py-24 text-center text-xs text-slate-400 font-medium">Loading activity alerts...</div>
            ) : filteredNotifications.length === 0 ? (
                <div className="max-w-md mx-auto text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3 shadow-sm">
                    <Sparkles className="w-12 h-12 text-pink-500/40 mx-auto" />
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-200">You're all caught up!</h3>
                    <p className="text-xs text-slate-400">No notifications match your current filter criteria.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredNotifications.map(notif => (
                        <div
                            key={notif._id}
                            className={`p-4 sm:p-5 bg-white dark:bg-slate-900 border rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-pink-500/30 ${
                                !notif.isRead 
                                    ? 'border-pink-500/30 bg-pink-500/[0.02] dark:bg-pink-500/[0.03]' 
                                    : 'border-slate-200 dark:border-slate-800'
                            }`}
                        >
                            <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 mt-0.5">
                                    {getIconForType(notif.type)}
                                </div>

                                <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className={`text-sm ${!notif.isRead ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-300'}`}>
                                            {notif.title}
                                        </h4>
                                        {notif.roomId?.name && (
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                                {notif.roomId.name}
                                            </span>
                                        )}
                                        {!notif.isRead && (
                                            <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
                                        )}
                                    </div>

                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                        {notif.message}
                                    </p>

                                    <p className="text-[11px] text-slate-400 font-medium">
                                        {formatTimeAgo(notif.createdAt)}
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={() => handleNavigate(notif)}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-all shadow-sm"
                                >
                                    Open <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                                {!notif.isRead && (
                                    <button
                                        onClick={() => handleMarkAsRead(notif._id)}
                                        title="Mark as read"
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(notif._id)}
                                    title="Delete"
                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
