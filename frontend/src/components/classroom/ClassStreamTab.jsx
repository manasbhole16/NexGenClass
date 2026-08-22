import React, { useState, useEffect } from 'react';
import {
    Copy, Check, Eye, MoreVertical, MessageSquare, Send, Trash2, Edit3,
    ClipboardList, Calendar, Sparkles, ChevronDown, ChevronUp, ExternalLink, Settings, ShieldAlert
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import { getBannerGradient } from '../../utils/themeUtils';

const ClassStreamTab = ({
    roomId,
    roomDetails,
    user,
    tasks = [],
    socket,
    onOpenAssignment,
    onOpenSettings,
    onNavigateToClasswork
}) => {
    const isOwner = roomDetails?.owner === user?._id || roomDetails?.owner?._id === user?._id;
    const isTeacher = isOwner || user?.role === 'teacher';

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAnnouncing, setIsAnnouncing] = useState(false);
    const [announcementText, setAnnouncementText] = useState('');
    const [posting, setPosting] = useState(false);

    // Editing Announcement
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');

    // Comment inputs state { [announcementId]: string }
    const [commentInputs, setCommentInputs] = useState({});
    const [expandedComments, setExpandedComments] = useState({});
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Code copy / modal state
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [showCodeBig, setShowCodeBig] = useState(false);

    const whoCanPost = roomDetails?.streamSettings?.whoCanPost || 'students_post_comment';
    const canPostAnnouncement = isTeacher || whoCanPost === 'students_post_comment';
    const canPostComment = isTeacher || whoCanPost !== 'teachers_only';
    const classworkOnStream = roomDetails?.streamSettings?.classworkOnStream || 'show_all';

    // Banner gradient
    const bannerGradient = getBannerGradient(roomDetails?.banner || 'purple');

    // Fetch Stream Announcements
    useEffect(() => {
        if (!roomId || roomId === 'personal') return;

        const fetchStream = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/stream`, { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    setAnnouncements(data.announcements || []);
                }
            } catch (err) {
                console.error("Failed to load stream announcements", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStream();
    }, [roomId]);

    // Socket.IO event listeners for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleNewAnnouncement = (newAnn) => {
            setAnnouncements(prev => {
                if (prev.some(a => a._id === newAnn._id)) return prev;
                return [newAnn, ...prev];
            });
        };

        const handleAnnouncementUpdated = (updatedAnn) => {
            setAnnouncements(prev => prev.map(a => a._id === updatedAnn._id ? updatedAnn : a));
        };

        const handleAnnouncementDeleted = ({ announcementId }) => {
            setAnnouncements(prev => prev.filter(a => a._id !== announcementId));
        };

        const handleNewComment = ({ announcementId, comments }) => {
            setAnnouncements(prev => prev.map(a => {
                if (a._id === announcementId) {
                    return { ...a, comments };
                }
                return a;
            }));
        };

        const handleCommentDeleted = ({ announcementId, commentId }) => {
            setAnnouncements(prev => prev.map(a => {
                if (a._id === announcementId) {
                    return {
                        ...a,
                        comments: (a.comments || []).filter(c => c._id !== commentId)
                    };
                }
                return a;
            }));
        };

        socket.on("new_announcement", handleNewAnnouncement);
        socket.on("announcement_updated", handleAnnouncementUpdated);
        socket.on("announcement_deleted", handleAnnouncementDeleted);
        socket.on("new_announcement_comment", handleNewComment);
        socket.on("announcement_comment_deleted", handleCommentDeleted);

        return () => {
            socket.off("new_announcement", handleNewAnnouncement);
            socket.off("announcement_updated", handleAnnouncementUpdated);
            socket.off("announcement_deleted", handleAnnouncementDeleted);
            socket.off("new_announcement_comment", handleNewComment);
            socket.off("announcement_comment_deleted", handleCommentDeleted);
        };
    }, [socket]);

    // Create Announcement
    const handlePostAnnouncement = async () => {
        if (!announcementText.trim()) return;
        setPosting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: announcementText }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setAnnouncementText('');
                setIsAnnouncing(false);
                setAnnouncements(prev => {
                    if (prev.some(a => a._id === data.announcement._id)) return prev;
                    return [data.announcement, ...prev];
                });
            } else {
                alert(data.message || "Failed to post announcement");
            }
        } catch (err) {
            console.error("Error creating announcement", err);
        } finally {
            setPosting(false);
        }
    };

    // Save Edited Announcement
    const handleSaveEdit = async (id) => {
        if (!editText.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/stream/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editText }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setAnnouncements(prev => prev.map(a => a._id === id ? data.announcement : a));
                setEditingId(null);
                setEditText('');
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error("Error updating announcement", err);
        }
    };

    // Delete Announcement
    const handleDeleteAnnouncement = async (id) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/stream/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setAnnouncements(prev => prev.filter(a => a._id !== id));
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error("Error deleting announcement", err);
        }
    };

    // Add Comment
    const handleAddComment = async (announcementId) => {
        const commentText = commentInputs[announcementId];
        if (!commentText || !commentText.trim()) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/stream/${announcementId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentText.trim() }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setAnnouncements(prev => prev.map(a => {
                    if (a._id === announcementId) {
                        return { ...a, comments: data.comments };
                    }
                    return a;
                }));
                setCommentInputs({ ...commentInputs, [announcementId]: '' });
                setExpandedComments({ ...expandedComments, [announcementId]: true });
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error("Error adding comment", err);
        }
    };

    // Delete Comment
    const handleDeleteComment = async (announcementId, commentId) => {
        if (!window.confirm("Delete this comment?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/stream/${announcementId}/comments/${commentId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setAnnouncements(prev => prev.map(a => {
                    if (a._id === announcementId) {
                        return {
                            ...a,
                            comments: (a.comments || []).filter(c => c._id !== commentId)
                        };
                    }
                    return a;
                }));
            }
        } catch (err) {
            console.error("Error deleting comment", err);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(roomDetails?.code || '');
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const copyLink = () => {
        const inviteUrl = `${window.location.origin}/rooms?code=${roomDetails?.code || ''}`;
        navigator.clipboard.writeText(inviteUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    // Upcoming assignments (next 14 days)
    const now = new Date();
    const upcomingTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= now).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Combine Announcements and Classwork for the feed
    const combinedFeed = [];

    announcements.forEach(a => {
        combinedFeed.push({ type: 'announcement', data: a, timestamp: new Date(a.createdAt).getTime() });
    });

    if (classworkOnStream !== 'hide') {
        tasks.forEach(t => {
            if (t.taskType === 'announcement') return; // Handled by announcements
            combinedFeed.push({ type: 'assignment', data: t, timestamp: new Date(t.createdAt).getTime() });
        });
    }

    combinedFeed.sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className="max-w-6xl mx-auto space-y-6" onClick={() => setActiveDropdown(null)}>
            {/* Classroom Banner */}
            <div className={`h-48 md:h-60 rounded-2xl bg-gradient-to-r ${bannerGradient} p-6 md:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden text-white`}>
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                
                {/* Header Top info & customize button */}
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        {roomDetails?.section && (
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-purple-200 border border-white/10">
                                {roomDetails.section}
                            </span>
                        )}
                        {roomDetails?.subject && (
                            <span className="ml-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-cyan-200 border border-white/10">
                                {roomDetails.subject}
                            </span>
                        )}
                    </div>

                    {isOwner && (
                        <button
                            onClick={onOpenSettings}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/20 rounded-lg text-xs font-semibold transition-all active:scale-95 text-white"
                        >
                            <Settings className="w-3.5 h-3.5" /> Customize
                        </button>
                    )}
                </div>

                {/* Banner Title & Details */}
                <div className="relative z-10">
                    <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight drop-shadow-md">
                        {roomDetails?.name || 'Classroom'}
                    </h1>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1.5 text-xs md:text-sm text-purple-100">
                        {roomDetails?.owner?.fullname && (
                            <span className="font-semibold text-white">Instructor: {roomDetails.owner.fullname}</span>
                        )}
                        {roomDetails?.room && (
                            <span>&bull; Room {roomDetails.room}</span>
                        )}
                    </div>
                    {roomDetails?.description && (
                        <p className="text-xs md:text-sm text-gray-200/90 mt-1 max-w-2xl line-clamp-2">
                            {roomDetails.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Two-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar Widgets (Class code & Upcoming) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Class Code Card (Visible to Teacher or if code sharing is enabled) */}
                    <div className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Class code
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setShowCodeBig(true)}
                                    className="p-1.5 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                    title="Display full screen"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400 tracking-wider">
                                {roomDetails?.code || '------'}
                            </span>
                            <button
                                onClick={copyCode}
                                className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="Copy code"
                            >
                                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>

                        <button
                            onClick={copyLink}
                            className="w-full py-2 px-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border border-gray-200 dark:border-white/5 transition-colors"
                        >
                            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedLink ? "Link copied" : "Copy invite link"}
                        </button>
                    </div>

                    {/* Upcoming Assignments Card */}
                    <div className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Upcoming
                            </span>
                            {upcomingTasks.length > 0 && (
                                <button
                                    onClick={onNavigateToClasswork}
                                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                    View all
                                </button>
                            )}
                        </div>

                        {upcomingTasks.length === 0 ? (
                            <div className="text-center py-4 text-gray-400 text-xs">
                                <p className="font-medium text-gray-700 dark:text-gray-300">Woohoo, no work due soon!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingTasks.slice(0, 3).map(task => (
                                    <div
                                        key={task._id}
                                        onClick={() => onOpenAssignment && onOpenAssignment(task)}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 p-2 rounded-lg transition-colors"
                                    >
                                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                            {task.title}
                                        </p>
                                        <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">
                                            Due {new Date(task.dueDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column (Stream Feed & Announcement Box) */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Announce Box */}
                    {canPostAnnouncement ? (
                        isAnnouncing ? (
                            <div className="bg-white dark:bg-[#18181c] border border-purple-500/40 rounded-2xl p-5 shadow-lg flex flex-col gap-4 animate-in fade-in duration-150">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                                        {user?.fullname?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                        Announce to {roomDetails?.name || 'class'}
                                    </span>
                                </div>

                                <textarea
                                    value={announcementText}
                                    onChange={e => setAnnouncementText(e.target.value)}
                                    placeholder="Announce something to your class..."
                                    className="w-full bg-transparent border-none focus:ring-0 outline-none resize-none text-gray-900 dark:text-white text-sm min-h-[100px]"
                                    autoFocus
                                />

                                <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-white/5 pt-3">
                                    <button
                                        onClick={() => { setIsAnnouncing(false); setAnnouncementText(''); }}
                                        className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handlePostAnnouncement}
                                        disabled={posting || !announcementText.trim()}
                                        className="px-5 py-2 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white shadow-md transition-all active:scale-95"
                                    >
                                        {posting ? "Posting..." : "Post"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => setIsAnnouncing(true)}
                                className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-sm cursor-pointer hover:border-purple-400 dark:hover:border-purple-500/50 hover:shadow-md transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 text-white font-bold flex items-center justify-center flex-shrink-0 shadow-md">
                                    {user?.fullname?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <span className="text-gray-500 dark:text-gray-400 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                    Announce something to your class...
                                </span>
                            </div>
                        )
                    ) : (
                        <div className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/5 rounded-xl p-4 text-xs text-gray-500 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            Only instructors can create announcements in this classroom.
                        </div>
                    )}

                    {/* Stream Items Feed */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center py-12 text-gray-500">
                                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
                                Loading stream...
                            </div>
                        ) : combinedFeed.length === 0 ? (
                            <div className="text-center py-16 px-4 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/5 rounded-2xl text-gray-500 space-y-2">
                                <MessageSquare className="w-10 h-10 mx-auto text-purple-400/50" />
                                <h3 className="font-bold text-gray-800 dark:text-gray-200">This is where you'll see updates for this class</h3>
                                <p className="text-xs text-gray-500">
                                    Use the stream to share announcements, post assignments, and communicate with your class.
                                </p>
                            </div>
                        ) : (
                            combinedFeed.map(item => {
                                if (item.type === 'announcement') {
                                    const a = item.data;
                                    const isAuthor = a.author?._id === user?._id || a.author === user?._id;
                                    const canManageAnnouncement = isAuthor || isOwner;
                                    const isEditing = editingId === a._id;
                                    const comments = a.comments || [];
                                    const isExpanded = expandedComments[a._id];

                                    return (
                                        <div
                                            key={a._id}
                                            className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4"
                                        >
                                            {/* Header */}
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center flex-shrink-0">
                                                        {a.author?.fullname?.[0]?.toUpperCase() || a.authorName?.[0]?.toUpperCase() || 'T'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-sm text-gray-900 dark:text-white">
                                                                {a.author?.fullname || a.authorName || 'Instructor'}
                                                            </p>
                                                            {(a.authorRole === 'teacher' || a.author?.role === 'teacher') && (
                                                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                                                                    Teacher
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400">
                                                            {new Date(a.createdAt).toLocaleDateString([], {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>

                                                {canManageAnnouncement && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdown(activeDropdown === a._id ? null : a._id);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>

                                                        {activeDropdown === a._id && (
                                                            <div
                                                                className="absolute right-0 top-7 bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl py-1 z-30 w-32"
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingId(a._id);
                                                                        setEditText(a.content);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5" /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleDeleteAnnouncement(a._id);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Body */}
                                            {isEditing ? (
                                                <div className="space-y-3 pt-2">
                                                    <textarea
                                                        value={editText}
                                                        onChange={e => setEditText(e.target.value)}
                                                        className="w-full p-3 bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-sm outline-none focus:border-purple-500 text-gray-900 dark:text-white"
                                                        rows="3"
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveEdit(a._id)}
                                                            className="px-4 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
                                                    {a.content}
                                                </p>
                                            )}

                                            {/* Comments Thread Section */}
                                            <div className="border-t border-gray-100 dark:border-white/5 pt-3 space-y-3">
                                                {comments.length > 0 && (
                                                    <button
                                                        onClick={() => setExpandedComments({
                                                            ...expandedComments,
                                                            [a._id]: !isExpanded
                                                        })}
                                                        className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                                                    >
                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                        {comments.length} {comments.length === 1 ? 'class comment' : 'class comments'}
                                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                    </button>
                                                )}

                                                {/* Expanded Comments */}
                                                {isExpanded && comments.length > 0 && (
                                                    <div className="space-y-2.5 pl-2">
                                                        {comments.map(c => {
                                                            const isCommentAuthor = c.author?._id === user?._id || c.author === user?._id;
                                                            const canDeleteComment = isCommentAuthor || isOwner;

                                                            return (
                                                                <div key={c._id} className="flex items-start justify-between gap-3 text-xs bg-gray-50/50 dark:bg-white/[0.02] p-2.5 rounded-xl">
                                                                    <div className="flex items-start gap-2.5">
                                                                        <div className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                            {c.author?.fullname?.[0]?.toUpperCase() || c.authorName?.[0]?.toUpperCase() || 'M'}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-bold text-gray-900 dark:text-white mr-2">
                                                                                {c.author?.fullname || c.authorName || 'Member'}
                                                                            </span>
                                                                            <span className="text-[10px] text-gray-400">
                                                                                {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                            <p className="text-gray-700 dark:text-gray-300 mt-0.5">
                                                                                {c.content}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {canDeleteComment && (
                                                                        <button
                                                                            onClick={() => handleDeleteComment(a._id, c._id)}
                                                                            className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                                                            title="Delete comment"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Add Comment Input */}
                                                {canPostComment && (
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                                            {user?.fullname?.[0]?.toUpperCase() || 'U'}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Add class comment..."
                                                            value={commentInputs[a._id] || ''}
                                                            onChange={e => setCommentInputs({ ...commentInputs, [a._id]: e.target.value })}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleAddComment(a._id);
                                                                }
                                                            }}
                                                            className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full px-3.5 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500"
                                                        />
                                                        <button
                                                            onClick={() => handleAddComment(a._id)}
                                                            disabled={!(commentInputs[a._id] || '').trim()}
                                                            className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded-full disabled:opacity-30 transition-colors"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // Assignment Post
                                    const task = item.data;
                                    return (
                                        <div
                                            key={task._id}
                                            onClick={() => onOpenAssignment && onOpenAssignment(task)}
                                            className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-5 hover:border-purple-400 dark:hover:border-purple-500/50 hover:shadow-md transition-all flex items-center justify-between gap-4 cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                                <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                                    <ClipboardList className="w-5 h-5" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm text-gray-800 dark:text-gray-200">
                                                        <span className="font-bold text-gray-900 dark:text-white">Instructor</span> posted a new {task.taskType || 'assignment'}:{' '}
                                                        <span className="font-semibold text-purple-600 dark:text-purple-400 group-hover:underline">
                                                            {task.title}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {task.dueDate && (
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
                                                    Due {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                    );
                                }
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Big Code Modal */}
            {showCodeBig && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150" onClick={() => setShowCodeBig(false)}>
                    <div className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-10 max-w-lg w-full text-center shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xs uppercase tracking-widest text-purple-600 dark:text-purple-400 font-bold">Class Code</h3>
                        <div className="text-6xl md:text-7xl font-mono font-black text-gray-900 dark:text-white tracking-widest my-6 select-all">
                            {roomDetails?.code}
                        </div>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={copyCode}
                                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                            >
                                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copiedCode ? "Copied" : "Copy code"}
                            </button>
                            <button
                                onClick={() => setShowCodeBig(false)}
                                className="px-6 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white rounded-xl font-bold text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassStreamTab;
