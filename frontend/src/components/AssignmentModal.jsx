import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../apiConfig';
import {
    X, CheckCircle, Clock, AlertCircle, UploadCloud, FileText, Download,
    Trash2, Link as LinkIcon, Paperclip, Award, RefreshCw, CheckSquare,
    Layers, Users, User, Edit3, Send, Github, HardDrive, Check, Search, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

const AssignmentModal = ({ isOpen, onClose, task, user, roomDetails, onUpdate, onDelete }) => {
    const hasRoomContext = Boolean(roomDetails?._id);
    const ownerId = roomDetails?.owner?._id || roomDetails?.owner;
    const isTeacher = hasRoomContext && (ownerId === user?._id || user?.role === 'teacher');

    // Tab state for Teacher
    const [teacherActiveTab, setTeacherActiveTab] = useState('instructions'); // 'instructions' | 'submissions'
    const [isEditingTask, setIsEditingTask] = useState(false);

    // Edit form state
    const [editFormData, setEditFormData] = useState({
        title: '',
        description: '',
        maxMarks: 100,
        topic: 'General',
        dueDate: ''
    });

    // Student submission state
    const [submissionContent, setSubmissionContent] = useState('');
    const [mySubmission, setMySubmission] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [studentLinks, setStudentLinks] = useState([]);
    const [studentLinkInput, setStudentLinkInput] = useState({ title: '', url: '' });
    const [showStudentLinkInput, setShowStudentLinkInput] = useState(false);

    // Teacher grading state
    const [allSubmissions, setAllSubmissions] = useState([]);
    const [selectedStudentSub, setSelectedStudentSub] = useState(null);
    const [submissionFilter, setSubmissionFilter] = useState('all'); // 'all' | 'submitted' | 'graded' | 'missing'
    const [studentSearch, setStudentSearch] = useState('');
    const [rubricGrades, setRubricGrades] = useState({});
    const [teacherFeedbackMap, setTeacherFeedbackMap] = useState({});
    const [manualGradeInput, setManualGradeInput] = useState('');

    // Shared feedback message & loading
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        setMySubmission(null);
        setAllSubmissions([]);
        setSelectedStudentSub(null);
        setSubmissionContent('');
        setSelectedFiles([]);
        setStudentLinks([]);
        setMessage(null);
        setRubricGrades({});
        setTeacherFeedbackMap({});
        setIsEditingTask(false);
        setTeacherActiveTab('instructions');

        if (isOpen && task) {
            setEditFormData({
                title: task.title || '',
                description: task.description || '',
                maxMarks: task.maxMarks || 100,
                topic: task.topic || 'General',
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
            });

            if (hasRoomContext) {
                if (isTeacher) {
                    fetchSubmissions();
                } else {
                    fetchMySubmission();
                }
            }
        }
    }, [isOpen, task, isTeacher, hasRoomContext]);

    const fetchSubmissions = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/submissions/task/${task._id}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setAllSubmissions(data.submissions || []);
                const rMap = {};
                const fMap = {};
                data.submissions.forEach(sub => {
                    if (Array.isArray(sub.rubricEvaluation) && sub.rubricEvaluation.length > 0) {
                        rMap[sub._id] = sub.rubricEvaluation;
                    }
                    if (sub.teacherFeedback || sub.feedback) {
                        fMap[sub._id] = sub.teacherFeedback || sub.feedback;
                    }
                });
                setRubricGrades(rMap);
                setTeacherFeedbackMap(fMap);

                if (data.submissions.length > 0 && !selectedStudentSub) {
                    setSelectedStudentSub(data.submissions[0]);
                    setManualGradeInput(data.submissions[0].marksAwarded !== null ? String(data.submissions[0].marksAwarded) : '');
                }
            }
        } catch (err) {
            console.error("Failed to load submissions", err);
        }
    };

    const fetchMySubmission = async () => {
        try {
            if (!roomDetails?._id) return;
            const res = await fetch(`${API_BASE_URL}/api/submissions/me?roomId=${roomDetails._id}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                const sub = data.submissions.find(s => {
                    const sTaskId = s.taskId?._id || s.taskId;
                    return String(sTaskId) === String(task._id);
                });
                if (sub) {
                    setMySubmission(sub);
                    setSubmissionContent(sub.content || '');
                }
            }
        } catch (err) {
            console.error("Failed to load student submission", err);
        }
    };

    // Student File Selection
    const handleFileSelection = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setSelectedFiles(prev => [...prev, ...files].slice(0, 5));
        }
    };

    const handleRemoveSelectedFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddStudentLink = () => {
        if (!studentLinkInput.url.trim()) return;
        let fileType = 'link';
        const urlLower = studentLinkInput.url.toLowerCase();
        if (urlLower.includes('github.com')) fileType = 'github';
        else if (urlLower.includes('drive.google.com') || urlLower.includes('docs.google.com')) fileType = 'drive';

        setStudentLinks(prev => [
            ...prev,
            {
                fileUrl: studentLinkInput.url.trim(),
                fileName: studentLinkInput.title.trim() || studentLinkInput.url.trim(),
                fileType
            }
        ]);
        setStudentLinkInput({ title: '', url: '' });
        setShowStudentLinkInput(false);
    };

    const handleRemoveStudentLink = (index) => {
        setStudentLinks(prev => prev.filter((_, i) => i !== index));
    };

    // Student Turn In / Submit Action
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!hasRoomContext) return;
        setLoading(true);
        try {
            let res;
            if (selectedFiles.length > 0) {
                const formData = new FormData();
                selectedFiles.forEach(file => {
                    formData.append('files', file);
                });
                formData.append('content', submissionContent);
                formData.append('roomId', roomDetails._id);

                res = await fetch(`${API_BASE_URL}/api/submissions/${task._id}/upload`, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });
            } else {
                const combinedAttachments = [...studentLinks];
                res = await fetch(`${API_BASE_URL}/api/submissions/${task._id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: submissionContent,
                        roomId: roomDetails._id,
                        attachments: combinedAttachments
                    }),
                    credentials: 'include'
                });
            }

            const data = await res.json();
            if (data.success) {
                setMySubmission(data.submission);
                setSelectedFiles([]);
                setStudentLinks([]);
                setMessage({ type: 'success', text: 'Assignment turned in successfully!' });
                if (onUpdate) onUpdate(data.submission);
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: data.message || "Failed to turn in assignment" });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: "Error submitting assignment." });
        } finally {
            setLoading(false);
        }
    };

    // Student Unsubmit Action
    const handleUnsubmit = async () => {
        if (!window.confirm("Are you sure you want to unsubmit? You can make changes and turn in again before the deadline.")) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/submissions/${task._id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unsubmit: true, roomId: roomDetails._id }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setMySubmission(data.submission);
                setMessage({ type: 'success', text: 'Assignment unsubmitted. You can now modify your work.' });
                if (onUpdate) onUpdate(data.submission);
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: data.message || "Failed to unsubmit" });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: "Error un-submitting." });
        } finally {
            setLoading(false);
        }
    };

    // Teacher Rubric Score change
    const handleRubricScoreChange = (subId, criterion, value) => {
        setRubricGrades(prev => {
            const currentSubRubric = prev[subId] || (task.rubric || []).map(r => ({
                criterion: r.criterion,
                pointsAwarded: r.points,
                maxPoints: r.points,
                feedback: ''
            }));

            const updated = currentSubRubric.map(item => {
                if (item.criterion === criterion) {
                    return { ...item, pointsAwarded: Number(value) };
                }
                return item;
            });

            return { ...prev, [subId]: updated };
        });
    };

    // Teacher Grade & Return Action
    const handleGrade = async (subId) => {
        try {
            const subRubric = rubricGrades[subId];
            const feedback = teacherFeedbackMap[subId] || '';

            const payload = {
                teacherFeedback: feedback,
                feedback: feedback
            };

            if (subRubric && subRubric.length > 0) {
                payload.rubricEvaluation = subRubric;
            } else {
                payload.marksAwarded = Number(manualGradeInput);
                payload.grade = String(manualGradeInput);
            }

            const res = await fetch(`${API_BASE_URL}/api/submissions/${subId}/grade`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                fetchSubmissions();
                if (onUpdate) onUpdate(data.submission);
                setMessage({ type: 'success', text: 'Grade and feedback returned to student successfully!' });
                setTimeout(() => setMessage(null), 3000);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Teacher Edit Task Action
    const handleSaveTaskEdit = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${task._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editFormData.title.trim(),
                    description: editFormData.description.trim(),
                    maxMarks: Number(editFormData.maxMarks) || 100,
                    topic: editFormData.topic.trim(),
                    dueDate: editFormData.dueDate ? new Date(editFormData.dueDate) : null
                }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setIsEditingTask(false);
                if (onUpdate) onUpdate(data.task);
                setMessage({ type: 'success', text: 'Assignment updated successfully!' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                alert(data.message || "Failed to update assignment");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Teacher Publish Draft
    const handlePublishDraft = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${task._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isDraft: false }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                if (onUpdate) onUpdate(data.task);
                setMessage({ type: 'success', text: 'Draft assignment published to classroom!' });
                setTimeout(() => setMessage(null), 3000);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Teacher Delete Task Action
    const handleDeleteTask = async () => {
        if (!window.confirm("Are you sure you want to delete this classwork? All student submissions and grades will also be permanently deleted.")) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${task._id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                if (onDelete) onDelete(task._id);
                onClose();
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.message || "Failed to delete task" });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !task) return null;

    const isLate = task.dueDate && new Date() > new Date(task.dueDate);
    const hasRubric = Array.isArray(task.rubric) && task.rubric.length > 0;
    const hasAttachments = Array.isArray(task.attachments) && task.attachments.length > 0;
    const hasChecklist = Array.isArray(task.subtasks) && task.subtasks.length > 0;

    // Filtered submissions for Teacher roster view
    const enrolledStudents = (roomDetails?.members || []).filter(m => (m._id || m) !== ownerId);
    const submittedCount = allSubmissions.filter(s => s.status === 'submitted' || s.status === 'late').length;
    const gradedCount = allSubmissions.filter(s => s.status === 'graded').length;
    const missingCount = Math.max(0, enrolledStudents.length - (submittedCount + gradedCount));

    const filteredSubmissions = allSubmissions.filter(sub => {
        const studentName = sub.studentId?.fullname || '';
        const matchesSearch = !studentSearch.trim() || studentName.toLowerCase().includes(studentSearch.toLowerCase());
        let matchesStatus = true;
        if (submissionFilter === 'submitted') matchesStatus = sub.status === 'submitted' || sub.status === 'late';
        else if (submissionFilter === 'graded') matchesStatus = sub.status === 'graded';

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* 1. Header */}
                <div className="p-5 md:p-6 border-b border-gray-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-black/30">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 px-3 py-0.5 rounded-full font-bold flex items-center gap-1 border border-purple-500/20">
                                <Layers className="w-3 h-3" /> {task.topic || 'General'}
                            </span>
                            {task.taskType === 'material' ? (
                                <span className="text-xs bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-2.5 py-0.5 rounded-full font-bold border border-cyan-500/20">
                                    Reference Material
                                </span>
                            ) : (
                                <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20">
                                    {task.maxMarks || 100} Points
                                </span>
                            )}
                            {task.isDraft && (
                                <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full font-bold border border-amber-500/20">
                                    Draft
                                </span>
                            )}
                            {task.dueDate && (
                                <span className={`text-xs flex items-center gap-1 font-medium ${isLate && !mySubmission ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                                    <Clock className="w-3.5 h-3.5" />
                                    Due {format(new Date(task.dueDate), 'MMM d, yyyy h:mm a')}
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
                            {task.title}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                        {isTeacher && task.isDraft && (
                            <button
                                onClick={handlePublishDraft}
                                disabled={loading}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                            >
                                <Send className="w-3.5 h-3.5" /> Publish
                            </button>
                        )}
                        {isTeacher && (
                            <button
                                onClick={() => setIsEditingTask(!isEditingTask)}
                                className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-gray-600 dark:text-gray-300 transition-colors"
                                title="Edit Assignment Details"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                        )}
                        {isTeacher && (
                            <button
                                onClick={handleDeleteTask}
                                disabled={loading}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors"
                                title="Delete Classwork"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-gray-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Teacher Navigation Tabs */}
                {isTeacher && (
                    <div className="flex border-b border-gray-200 dark:border-white/10 px-6 bg-white dark:bg-[#18181c]">
                        <button
                            onClick={() => setTeacherActiveTab('instructions')}
                            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                                teacherActiveTab === 'instructions'
                                    ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Instructions & Materials
                        </button>
                        <button
                            onClick={() => setTeacherActiveTab('submissions')}
                            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                                teacherActiveTab === 'submissions'
                                    ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Student Work
                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-[10px]">
                                {allSubmissions.length}
                            </span>
                        </button>
                    </div>
                )}

                {message && (
                    <div className={`px-6 py-2 text-xs font-bold text-center ${
                        message.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                        {message.text}
                    </div>
                )}

                {/* 2. Modal Body */}
                <div className="flex-1 overflow-y-auto p-5 md:p-8">
                    
                    {/* TEACHER EDIT MODE */}
                    {isEditingTask ? (
                        <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Edit Assignment Details</h3>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Title</label>
                                <input
                                    type="text"
                                    value={editFormData.title}
                                    onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl text-sm font-semibold outline-none focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Instructions</label>
                                <textarea
                                    rows="4"
                                    value={editFormData.description}
                                    onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl text-xs outline-none focus:border-purple-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Points</label>
                                    <input
                                        type="number"
                                        value={editFormData.maxMarks}
                                        onChange={e => setEditFormData({ ...editFormData, maxMarks: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Topic</label>
                                    <input
                                        type="text"
                                        value={editFormData.topic}
                                        onChange={e => setEditFormData({ ...editFormData, topic: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        value={editFormData.dueDate}
                                        onChange={e => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl text-xs"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditingTask(false)}
                                    className="px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveTaskEdit}
                                    disabled={loading}
                                    className="px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md"
                                >
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    ) : isTeacher && teacherActiveTab === 'submissions' ? (
                        
                        /* TEACHER SUBMISSIONS ROSTER & GRADING VIEW */
                        <div className="space-y-6">
                            
                            {/* Summary Statistics Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-center">
                                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{submittedCount}</p>
                                    <p className="text-xs font-bold text-gray-500 uppercase mt-0.5">Turned In</p>
                                </div>
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{gradedCount}</p>
                                    <p className="text-xs font-bold text-gray-500 uppercase mt-0.5">Graded</p>
                                </div>
                                <div className="p-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-center">
                                    <p className="text-2xl font-black text-gray-700 dark:text-gray-300">{missingCount}</p>
                                    <p className="text-xs font-bold text-gray-500 uppercase mt-0.5">Assigned</p>
                                </div>
                            </div>

                            {/* Submissions Split Pane: Student List on Left, Grading Panel on Right */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                
                                {/* Left Roster */}
                                <div className="lg:col-span-1 space-y-3">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Search student..."
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl text-xs outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                                        {filteredSubmissions.length === 0 ? (
                                            <p className="text-xs text-gray-400 text-center py-6">No matching submissions</p>
                                        ) : (
                                            filteredSubmissions.map(sub => {
                                                const isSelected = selectedStudentSub?._id === sub._id;
                                                return (
                                                    <div
                                                        key={sub._id}
                                                        onClick={() => {
                                                            setSelectedStudentSub(sub);
                                                            setManualGradeInput(sub.marksAwarded !== null ? String(sub.marksAwarded) : '');
                                                        }}
                                                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                                            isSelected
                                                                ? 'bg-purple-500/10 border-purple-500/40 text-purple-600 dark:text-purple-400 shadow-sm'
                                                                : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/5 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <div className="overflow-hidden">
                                                            <p className="font-bold text-xs text-gray-900 dark:text-white truncate">
                                                                {sub.studentId?.fullname || 'Student'}
                                                            </p>
                                                            <p className="text-[10px] text-gray-500 truncate">
                                                                {sub.status === 'graded' ? `Graded: ${sub.marksAwarded} pts` : sub.status === 'late' ? 'Turned in late' : 'Turned in'}
                                                            </p>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                            sub.status === 'graded' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'
                                                        }`}>
                                                            {sub.status === 'graded' ? `${sub.marksAwarded}/${task.maxMarks || 100}` : 'Done'}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Right Grading Panel */}
                                <div className="lg:col-span-2 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-3xl p-5 space-y-5">
                                    {selectedStudentSub ? (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-white/10">
                                                <div>
                                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                                                        {selectedStudentSub.studentId?.fullname}
                                                    </h3>
                                                    <p className="text-xs text-gray-500">{selectedStudentSub.studentId?.email}</p>
                                                </div>
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                                    selectedStudentSub.status === 'graded' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'
                                                }`}>
                                                    {selectedStudentSub.status === 'graded' ? 'Graded' : 'Turned In'}
                                                </span>
                                            </div>

                                            {/* Student's Text Answer */}
                                            {selectedStudentSub.content && (
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Student Response</label>
                                                    <div className="p-3 bg-white dark:bg-[#18181c] rounded-xl border border-gray-200 dark:border-white/10 text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                                        {selectedStudentSub.content}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Student's Attachments */}
                                            {Array.isArray(selectedStudentSub.attachments) && selectedStudentSub.attachments.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Submitted Files / Links</label>
                                                    <div className="space-y-1.5">
                                                        {selectedStudentSub.attachments.map((att, idx) => (
                                                            <div key={idx} className="p-2.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-between text-xs">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    {att.fileType === 'github' ? <Github className="w-4 h-4 text-gray-800 dark:text-white flex-shrink-0" />
                                                                    : att.fileType === 'drive' ? <HardDrive className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                                    : <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />}
                                                                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{att.fileName || 'Attachment'}</span>
                                                                </div>
                                                                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-purple-600 hover:text-purple-700 flex items-center gap-1 font-bold">
                                                                    <Download className="w-3.5 h-3.5" /> Open
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Rubric Evaluation */}
                                            {hasRubric ? (
                                                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-white/10">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Rubric Scoring</label>
                                                    {(rubricGrades[selectedStudentSub._id] || task.rubric).map((rItem, rIdx) => (
                                                        <div key={rIdx} className="p-2.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl flex justify-between items-center text-xs">
                                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{rItem.criterion}</span>
                                                            <div className="flex items-center gap-1.5">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={rItem.points || rItem.maxPoints}
                                                                    value={rItem.pointsAwarded ?? rItem.points}
                                                                    onChange={e => handleRubricScoreChange(selectedStudentSub._id, rItem.criterion, e.target.value)}
                                                                    className="w-14 px-2 py-1 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/20 rounded-lg text-right font-bold text-purple-600"
                                                                />
                                                                <span className="text-gray-400 text-xs">/ {rItem.points || rItem.maxPoints}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-white/10">
                                                    <label className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400">Award Grade:</label>
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={task.maxMarks || 100}
                                                            value={manualGradeInput}
                                                            onChange={e => setManualGradeInput(e.target.value)}
                                                            className="w-24 px-3 py-1.5 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl text-sm font-bold text-purple-600 outline-none"
                                                            placeholder="0"
                                                        />
                                                        <span className="text-xs text-gray-400 font-bold">/ {task.maxMarks || 100} pts</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Teacher Feedback Textarea */}
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Private Feedback</label>
                                                <textarea
                                                    rows="2"
                                                    value={teacherFeedbackMap[selectedStudentSub._id] || ''}
                                                    onChange={e => setTeacherFeedbackMap({ ...teacherFeedbackMap, [selectedStudentSub._id]: e.target.value })}
                                                    placeholder="Add constructive feedback for the student..."
                                                    className="w-full p-2.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-purple-500 resize-none"
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleGrade(selectedStudentSub._id)}
                                                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Send className="w-3.5 h-3.5" /> Grade & Return
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 text-center py-12">Select a student from the roster to view submission and grade</p>
                                    )}
                                </div>
                            </div>
                        </div>

                    ) : (

                        /* INSTRUCTIONS TAB (Teacher or Student) */
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                            
                            {/* Left 2 Cols: Description, Attachments, Rubric */}
                            <div className="lg:col-span-2 space-y-6">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Instructions</h3>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                        {task.description || 'No instructions provided.'}
                                    </p>
                                </div>

                                {/* Reference Materials */}
                                {hasAttachments && (
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                            <Paperclip className="w-3.5 h-3.5 text-purple-500" /> Reference Materials ({task.attachments.length})
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {task.attachments.map((att, i) => (
                                                <div key={i} className="p-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                                        {att.fileType === 'github' ? <Github className="w-4 h-4 text-gray-800 dark:text-white flex-shrink-0" />
                                                        : att.fileType === 'drive' ? <HardDrive className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                        : <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />}
                                                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{att.title || att.fileName}</span>
                                                    </div>
                                                    <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-purple-600 hover:text-purple-700">
                                                        <Download className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Deliverables Checklist */}
                                {hasChecklist && (
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                            <CheckSquare className="w-3.5 h-3.5 text-purple-500" /> Deliverables Checklist
                                        </h3>
                                        <ul className="space-y-1.5">
                                            {task.subtasks.map((item, index) => (
                                                <li key={index} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    {item.title}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Rubric Criteria */}
                                {hasRubric && (
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                            <Award className="w-3.5 h-3.5 text-purple-500" /> Grading Rubric ({task.rubric.reduce((s, r) => s + (r.points || 0), 0)} pts)
                                        </h3>
                                        <div className="space-y-2">
                                            {task.rubric.map((r, i) => (
                                                <div key={i} className="p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl flex justify-between items-start">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white">{r.criterion}</p>
                                                        {r.description && <p className="text-[11px] text-gray-500 mt-0.5">{r.description}</p>}
                                                    </div>
                                                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{r.points} pts</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right 1 Col: Student Submission Area */}
                            {!isTeacher && hasRoomContext && (
                                <div className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-3xl p-5 space-y-4 h-fit">
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-white/10">
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">Your Work</h3>
                                        {mySubmission?.status === 'graded' ? (
                                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                                                Graded: {mySubmission.grade || mySubmission.marksAwarded} / {task.maxMarks || 100}
                                            </span>
                                        ) : mySubmission?.status === 'late' ? (
                                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                                                Turned in late
                                            </span>
                                        ) : mySubmission?.status === 'submitted' ? (
                                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                                                Turned in
                                            </span>
                                        ) : (
                                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isLate ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {isLate ? 'Missing' : 'Assigned'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Graded Score Card */}
                                    {mySubmission?.status === 'graded' && (
                                        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Grade:</span>
                                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                                    {mySubmission.grade || mySubmission.marksAwarded} / {task.maxMarks || 100} pts
                                                </span>
                                            </div>
                                            {(mySubmission.teacherFeedback || mySubmission.feedback) && (
                                                <p className="text-xs text-gray-700 dark:text-gray-300 italic pt-1 border-t border-emerald-500/20">
                                                    "{mySubmission.teacherFeedback || mySubmission.feedback}"
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Submitted Attachments */}
                                    {Array.isArray(mySubmission?.attachments) && mySubmission.attachments.length > 0 && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold uppercase text-gray-500">Submitted Resources:</label>
                                            {mySubmission.attachments.map((att, i) => (
                                                <div key={i} className="p-2.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-between text-xs">
                                                    <span className="font-semibold truncate text-gray-800 dark:text-gray-200">{att.fileName}</span>
                                                    <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 font-bold">
                                                        <Download className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Submission Form */}
                                    {mySubmission?.status !== 'graded' && (
                                        <form onSubmit={handleSubmit} className="space-y-3">
                                            <textarea
                                                value={submissionContent}
                                                onChange={e => setSubmissionContent(e.target.value)}
                                                placeholder="Add text response, notes, or comments..."
                                                disabled={mySubmission?.status === 'submitted' || mySubmission?.status === 'late'}
                                                className="w-full h-20 p-3 bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-2xl text-xs outline-none resize-none focus:border-purple-500"
                                            />

                                            {/* Selected files preview */}
                                            {selectedFiles.length > 0 && (
                                                <div className="space-y-1">
                                                    {selectedFiles.map((file, idx) => (
                                                        <div key={idx} className="p-1.5 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 rounded-lg flex justify-between items-center text-xs">
                                                            <span className="truncate text-purple-700 dark:text-purple-300 font-medium">{file.name}</span>
                                                            <button type="button" onClick={() => handleRemoveSelectedFile(idx)} className="text-red-500">✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Added links preview */}
                                            {studentLinks.length > 0 && (
                                                <div className="space-y-1">
                                                    {studentLinks.map((link, idx) => (
                                                        <div key={idx} className="p-1.5 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/30 rounded-lg flex justify-between items-center text-xs">
                                                            <span className="truncate text-cyan-700 dark:text-cyan-300 font-medium">{link.fileName}</span>
                                                            <button type="button" onClick={() => handleRemoveStudentLink(idx)} className="text-red-500">✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Add File / Link Buttons */}
                                            {mySubmission?.status !== 'submitted' && mySubmission?.status !== 'late' && (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="file"
                                                        multiple
                                                        onChange={handleFileSelection}
                                                        className="hidden"
                                                        id="student-file-input"
                                                    />
                                                    <label
                                                        htmlFor="student-file-input"
                                                        className="flex-1 py-2 border border-gray-300 dark:border-white/10 hover:border-purple-500 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                                    >
                                                        <UploadCloud className="w-3.5 h-3.5" /> File
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowStudentLinkInput(!showStudentLinkInput)}
                                                        className="flex-1 py-2 border border-gray-300 dark:border-white/10 hover:border-purple-500 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-1 transition-colors"
                                                    >
                                                        <LinkIcon className="w-3.5 h-3.5" /> Link
                                                    </button>
                                                </div>
                                            )}

                                            {/* Student Link Input Box */}
                                            {showStudentLinkInput && (
                                                <div className="p-2.5 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl space-y-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Link Title (e.g. GitHub repo)"
                                                        value={studentLinkInput.title}
                                                        onChange={e => setStudentLinkInput({ ...studentLinkInput, title: e.target.value })}
                                                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg text-xs outline-none"
                                                    />
                                                    <input
                                                        type="url"
                                                        placeholder="https://..."
                                                        value={studentLinkInput.url}
                                                        onChange={e => setStudentLinkInput({ ...studentLinkInput, url: e.target.value })}
                                                        className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg text-xs outline-none font-mono"
                                                    />
                                                    <div className="flex justify-end gap-1.5">
                                                        <button type="button" onClick={() => setShowStudentLinkInput(false)} className="px-2.5 py-1 text-xs text-gray-400">Cancel</button>
                                                        <button type="button" onClick={handleAddStudentLink} disabled={!studentLinkInput.url.trim()} className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold">Add</button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Buttons: Turn In / Unsubmit / Resubmit */}
                                            {mySubmission?.status === 'submitted' || mySubmission?.status === 'late' ? (
                                                <button
                                                    type="button"
                                                    onClick={handleUnsubmit}
                                                    disabled={loading}
                                                    className="w-full py-2.5 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold rounded-xl text-xs hover:bg-purple-500/10 transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" /> Unsubmit Work
                                                </button>
                                            ) : (
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    {mySubmission?.status === 'unsubmitted' ? 'Resubmit Assignment' : 'Turn In'}
                                                </button>
                                            )}
                                        </form>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AssignmentModal;
