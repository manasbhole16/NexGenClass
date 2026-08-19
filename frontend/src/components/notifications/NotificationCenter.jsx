import React, { useState, useEffect, useRef } from 'react';
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
    X, 
    ExternalLink, 
    Layers, 
    Sparkles 
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import { io } from 'socket.io-client';

const NotificationCenter = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread'
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (user?._id) {
            fetchUnreadCount();
            fetchRecentNotifications();

            // Socket.IO real-time notification listener
            const socket = io(API_BASE_URL, { withCredentials: true });
            socket.emit("joinUser", { userId: user._id });

            socket.on("notification:new", (newNotif) => {
                setNotifications(prev => [newNotif, ...prev.filter(n => n._id !== newNotif._id)].slice(0, 30));
                setUnreadCount(prev => prev + 1);
            });

            return () => {
                socket.disconnect();
            };
        }
    }, [user?._id]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (err) {
            console.error("Failed to fetch unread count", err);
        }
    };

    const fetchRecentNotifications = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/notifications?limit=25`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id, e) => {
        if (e) e.stopPropagation();
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

    const handleDelete = async (id, e) => {
        if (e) e.stopPropagation();
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

    const handleNotificationClick = async (notif) => {
        if (!notif.isRead) {
            handleMarkAsRead(notif._id);
        }
        setIsOpen(false);

        // Smart deep-linking based on notification type and entity
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
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const getIconForType = (type) => {
        if (type.startsWith('assignment_due_soon') || type.startsWith('assignment_overdue')) {
            return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        }
        if (type.startsWith('assignment_graded') || type.startsWith('quiz_graded')) {
            return <Award className="w-4 h-4 text-emerald-500" />;
        }
        if (type.startsWith('assignment_')) {
            return <BookOpen className="w-4 h-4 text-pink-500" />;
        }
        if (type.startsWith('quiz_')) {
            return <Brain className="w-4 h-4 text-purple-500" />;
        }
        if (type.startsWith('announcement_')) {
            return <MessageSquare className="w-4 h-4 text-blue-500" />;
        }
        if (type.startsWith('classroom_')) {
            return <Users className="w-4 h-4 text-indigo-500" />;
        }
        return <Sparkles className="w-4 h-4 text-pink-500" />;
    };

    const filteredList = notifications.filter(n => {
        if (activeFilter === 'unread') return !n.isRead;
        return true;
    });

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Trigger */}
            <button
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchRecentNotifications(); }}
                className="relative p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all active:scale-95 focus:outline-none"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-pink-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-pink-600/40 animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown Popover */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-scaleUp">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-950/40">
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-slate-900 dark:text-white">Activity & Alerts</h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 border border-pink-500/20">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1"
                            >
                                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                            </button>
                        )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-900">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-3 py-1 rounded-xl transition-all ${
                                activeFilter === 'all' 
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' 
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            onClick={() => setActiveFilter('unread')}
                            className={`px-3 py-1 rounded-xl transition-all ${
                                activeFilter === 'unread' 
                                    ? 'bg-pink-600 text-white shadow-sm' 
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/60">
                        {loading && notifications.length === 0 ? (
                            <div className="py-12 text-center text-xs text-slate-400 font-medium">Loading alerts...</div>
                        ) : filteredList.length === 0 ? (
                            <div className="py-12 px-6 text-center space-y-2">
                                <Sparkles className="w-8 h-8 text-pink-500/40 mx-auto" />
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">You're all caught up!</p>
                                <p className="text-[11px] text-slate-400">No {activeFilter === 'unread' ? 'unread' : ''} notifications at this moment.</p>
                            </div>
                        ) : (
                            filteredList.map(notif => (
                                <div
                                    key={notif._id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors flex items-start gap-3 relative group ${
                                        !notif.isRead ? 'bg-pink-500/[0.03] dark:bg-pink-500/[0.04]' : ''
                                    }`}
                                >
                                    {/* Unread Status Dot */}
                                    {!notif.isRead && (
                                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-pink-500 rounded-full" />
                                    )}

                                    {/* Icon / Avatar */}
                                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700">
                                        {getIconForType(notif.type)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={`text-xs truncate ${!notif.isRead ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-300'}`}>
                                                {notif.title}
                                            </p>
                                            <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                                {formatTimeAgo(notif.createdAt)}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {notif.message}
                                        </p>

                                        {notif.roomId?.name && (
                                            <span className="inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 mt-1">
                                                {notif.roomId.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Quick Actions (Visible on hover) */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                                        {!notif.isRead && (
                                            <button
                                                onClick={(e) => handleMarkAsRead(notif._id, e)}
                                                title="Mark as read"
                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => handleDelete(notif._id, e)}
                                            title="Delete notification"
                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-950/40">
                        <button
                            onClick={() => { setIsOpen(false); navigate('/notifications'); }}
                            className="text-xs font-black text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition-colors inline-flex items-center gap-1"
                        >
                            Open Activity Center <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
