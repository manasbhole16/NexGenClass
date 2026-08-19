import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../apiConfig';
import { X, CheckCircle, Clock, AlertCircle, UploadCloud, FileText, Download, Trash2, Link as LinkIcon, Paperclip, Award, RefreshCw, CheckSquare, Layers } from 'lucide-react';
import { format } from 'date-fns';

const AssignmentModal = ({ isOpen, onClose, task, user, roomDetails, onUpdate, onDelete }) => {
    const [submissionContent, setSubmissionContent] = useState('');
    const [mySubmission, setMySubmission] = useState(null);
    const [allSubmissions, setAllSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [message, setMessage] = useState(null);
    const [activeGradingSubId, setActiveGradingSubId] = useState(null);
    const [rubricGrades, setRubricGrades] = useState({});
    const [teacherFeedbackMap, setTeacherFeedbackMap] = useState({});

    const hasRoomContext = Boolean(roomDetails?._id);
    const isTeacher = hasRoomContext && (roomDetails?.owner === user?._id || user?.role === 'teacher');

    useEffect(() => {
        setMySubmission(null);
        setAllSubmissions([]);
        setSubmissionContent('');
        setSelectedFiles([]);
        setMessage(null);
        setRubricGrades({});
        setTeacherFeedbackMap({});

        if (isOpen && task && hasRoomContext) {
            if (isTeacher) {
                fetchSubmissions();
            } else {
                fetchMySubmission();
            }
        }
    }, [isOpen, task, isTeacher, hasRoomContext]);

    const fetchSubmissions = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/submissions/task/${task._id}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setAllSubmissions(data.submissions);
                // Pre-populate rubric evaluations if already graded
                const rMap = {};
                const fMap = {};
                data.submissions.forEach(sub => {
                    if (sub.rubricEvaluation && sub.rubricEvaluation.length > 0) {
                        rMap[sub._id] = sub.rubricEvaluation;
                    }
                    if (sub.teacherFeedback || sub.feedback) {
                        fMap[sub._id] = sub.teacherFeedback || sub.feedback;
                    }
                });
                setRubricGrades(rMap);
                setTeacherFeedbackMap(fMap);
            }
        } catch (err) { console.error(err); }
    };

    const fetchMySubmission = async () => {
        try {
            if (!roomDetails?._id) return;
            const res = await fetch(`${API_BASE_URL}/api/submissions/me?roomId=${roomDetails._id}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                const submission = data.submissions.find(s => {
                    const sTaskId = s.taskId?._id || s.taskId;
                    return String(sTaskId) === String(task._id);
                });
                if (submission) {
                    setMySubmission(submission);
                    setSubmissionContent(submission.content || '');
                }
            }
        } catch (err) { console.error(err); }
    };

    const handleFileSelection = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setSelectedFiles(prev => [...prev, ...files].slice(0, 5));
        }
    };

    const handleRemoveSelectedFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!hasRoomContext) {
            setMessage({ type: 'error', text: 'Personal tasks do not accept submissions.' });
            return;
        }
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
                res = await fetch(`${API_BASE_URL}/api/submissions/${task._id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: submissionContent, roomId: roomDetails._id }),
                    credentials: 'include'
                });
            }

            const data = await res.json();
            if (data.success) {
                setMySubmission(data.submission);
                setSelectedFiles([]);
                setMessage({ type: 'success', text: 'Assignment turned in successfully!' });
                if (onUpdate) onUpdate(data.submission);
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: data.message || "Failed to turn in assignment" });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: "An error occurred during submission." });
        }
        setLoading(false);
    };

    const handleUnsubmit = async () => {
        if (!window.confirm("Are you sure you want to unsubmit? You can make changes and turn in again.")) return;
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
                setMessage({ type: 'success', text: 'Assignment unsubmitted. You can now edit and resubmit.' });
                if (onUpdate) onUpdate(data.submission);
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: data.message || "Failed to unsubmit" });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: "Error un-submitting." });
        }
        setLoading(false);
    };

    const handleRubricScoreChange = (subId, criterion, field, value) => {
        setRubricGrades(prev => {
            const currentSubRubric = prev[subId] || (task.rubric || []).map(r => ({
                criterion: r.criterion,
                pointsAwarded: r.points,
                maxPoints: r.points,
                feedback: ''
            }));

            const updated = currentSubRubric.map(item => {
                if (item.criterion === criterion) {
                    return { ...item, [field]: value };
                }
                return item;
            });

            return { ...prev, [subId]: updated };
        });
    };

    const handleGrade = async (subId, manualMarks) => {
        try {
            const subRubric = rubricGrades[subId];
            const feedback = teacherFeedbackMap[subId] || '';

            const payload = {
                teacherFeedback: feedback,
                feedback: feedback
            };

            if (subRubric && subRubric.length > 0) {
                payload.rubricEvaluation = subRubric;
            } else if (manualMarks !== undefined) {
                payload.marksAwarded = Number(manualMarks);
                payload.grade = String(manualMarks);
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
                setMessage({ type: 'success', text: 'Grade returned to student successfully!' });
                setTimeout(() => setMessage(null), 3000);
            }
        } catch (err) { console.error(err); }
    };

    const handleDeleteTask = async () => {
        if (!window.confirm("Are you sure you want to delete this classwork assignment? All student submissions will also be deleted.")) return;
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
            setMessage({ type: 'error', text: "An error occurred during deletion." });
        }
        setLoading(false);
    };

    if (!isOpen || !task) return null;

    const isLate = task.dueDate && new Date() > new Date(task.dueDate);
    const hasRubric = Array.isArray(task.rubric) && task.rubric.length > 0;
    const hasChecklist = Array.isArray(task.subtasks) && task.subtasks.length > 0;
    const hasAttachments = Array.isArray(task.attachments) && task.attachments.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200 dark:border-white/10 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="p-5 md:p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-start bg-gray-50 dark:bg-black/20">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                                <Layers className="w-3 h-3" /> {task.topic || task.category || 'General'}
                            </span>
                            {task.taskType === 'material' ? (
                                <span className="text-xs bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-2.5 py-1 rounded-full font-bold">
                                    Reference Material
                                </span>
                            ) : (
                                <span className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                                    {task.maxMarks || 100} Points
                                </span>
                            )}
                            {task.isDraft && (
                                <span className="text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full font-bold">
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
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{task.title}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {isTeacher && (
                            <button 
                                onClick={handleDeleteTask}
                                disabled={loading}
                                className="p-2 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 rounded-xl transition-colors text-red-600 dark:text-red-400"
                                title="Delete Classwork"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors">
                            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                </div>

                {message && (
                    <div className={`px-6 py-2.5 text-xs font-bold text-center ${message.type === 'error' ? 'bg-red-500/10 text-red-500 border-b border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-b border-emerald-500/20'}`}>
                        {message.text}
                    </div>
                )}

                {/* Body: Left Details & Right Actions */}
                <div className="flex-1 overflow-y-auto p-5 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8">
                    
                    {/* Left: Task Content & Reference Materials */}
                    <div className="flex-1 space-y-6">
                        
                        {/* Instructions */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Instructions</h3>
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                {task.description || 'No instructions provided.'}
                            </p>
                        </div>

                        {/* Reference Materials / Teacher Attachments */}
                        {hasAttachments && (
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                                    <Paperclip className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Reference Materials
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {task.attachments.map((att, i) => (
                                        <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 p-2.5 rounded-xl">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {att.fileType === 'link' ? (
                                                    <LinkIcon className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                                                ) : (
                                                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                                )}
                                                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate" title={att.title || att.fileName}>
                                                    {att.title || att.fileName}
                                                </span>
                                            </div>
                                            <a 
                                                href={att.fileUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-1 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                                title="Open or Download Attachment"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Deliverables Checklist */}
                        {hasChecklist && (
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                                    <CheckSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Deliverables Checklist
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

                        {/* Rubric Criteria Table */}
                        {hasRubric && (
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                                    <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Grading Rubric ({task.rubric.reduce((s, r) => s + (r.points || 0), 0)} pts total)
                                </h3>
                                <div className="space-y-2">
                                    {task.rubric.map((item, index) => (
                                        <div key={index} className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white">{item.criterion}</p>
                                                <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">{item.points} pts</span>
                                            </div>
                                            {item.description && (
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Role-Aware Submission or Grading Area */}
                    <div className="md:w-96 border-t md:border-t-0 md:border-l border-gray-200 dark:border-white/10 pt-6 md:pt-0 md:pl-6 flex flex-col gap-4">
                        
                        {!hasRoomContext ? (
                            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-center">
                                <p className="text-xs text-gray-500">Personal tasks do not accept submissions.</p>
                            </div>
                        ) : !isTeacher ? (
                            
                            /* STUDENT VIEW */
                            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Your Work</h3>
                                    {mySubmission?.status === 'graded' ? (
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-400">
                                            Graded: {mySubmission.grade || mySubmission.marksAwarded} / {task.maxMarks || 100}
                                        </span>
                                    ) : mySubmission?.status === 'late' ? (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                                            Turned In (Late)
                                        </span>
                                    ) : mySubmission?.status === 'submitted' ? (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                            Turned In
                                        </span>
                                    ) : mySubmission?.status === 'unsubmitted' ? (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                            Unsubmitted
                                        </span>
                                    ) : (
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${isLate ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {isLate ? 'Missing' : 'Assigned'}
                                        </span>
                                    )}
                                </div>

                                {/* Graded Feedback & Rubric Scores Breakdown */}
                                {mySubmission?.status === 'graded' && (
                                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3.5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Total Score:</span>
                                            <span className="text-base font-extrabold text-purple-600 dark:text-purple-400">
                                                {mySubmission.grade || mySubmission.marksAwarded} / {task.maxMarks || 100}
                                            </span>
                                        </div>

                                        {Array.isArray(mySubmission.rubricEvaluation) && mySubmission.rubricEvaluation.length > 0 && (
                                            <div className="space-y-1.5 pt-2 border-t border-purple-500/20">
                                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Rubric Breakdown:</span>
                                                {mySubmission.rubricEvaluation.map((r, i) => (
                                                    <div key={i} className="flex justify-between text-xs text-gray-800 dark:text-gray-200">
                                                        <span>{r.criterion}</span>
                                                        <span className="font-bold text-purple-500">{r.pointsAwarded}/{r.maxPoints} pts</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {(mySubmission.teacherFeedback || mySubmission.feedback) && (
                                            <div className="pt-2 border-t border-purple-500/20">
                                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">Teacher Feedback:</span>
                                                <p className="text-xs text-gray-700 dark:text-gray-300 italic">{mySubmission.teacherFeedback || mySubmission.feedback}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Attached Submission Files */}
                                {Array.isArray(mySubmission?.attachments) && mySubmission.attachments.length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Submitted Files:</span>
                                        {mySubmission.attachments.map((att, i) => (
                                            <div key={i} className="bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 p-2.5 rounded-lg flex items-center justify-between">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                                    <span className="text-xs text-gray-800 dark:text-gray-200 truncate">{att.fileName}</span>
                                                </div>
                                                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-purple-500 transition-colors">
                                                    <Download className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Submission Form for Editable state */}
                                {mySubmission?.status !== 'graded' && (
                                    <form onSubmit={handleSubmit} className="space-y-3">
                                        <textarea
                                            value={submissionContent}
                                            onChange={(e) => setSubmissionContent(e.target.value)}
                                            placeholder="Add notes, repository link, or private comments..."
                                            disabled={mySubmission?.status === 'submitted' || mySubmission?.status === 'late'}
                                            className="w-full h-20 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl p-3 text-xs focus:border-purple-500 outline-none resize-none text-gray-900 dark:text-white"
                                        />

                                        {/* Selected New Files */}
                                        {selectedFiles.length > 0 && (
                                            <div className="space-y-1.5">
                                                {selectedFiles.map((file, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 px-2.5 py-1.5 rounded-lg text-xs">
                                                        <span className="truncate text-purple-700 dark:text-purple-300 font-medium">{file.name}</span>
                                                        <button type="button" onClick={() => handleRemoveSelectedFile(i)} className="text-red-500 hover:text-red-700">
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Multi-File Upload Picker */}
                                        {mySubmission?.status !== 'submitted' && mySubmission?.status !== 'late' && (
                                            <div>
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={handleFileSelection}
                                                    className="hidden"
                                                    id="student-file-upload"
                                                />
                                                <label
                                                    htmlFor="student-file-upload"
                                                    className="flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-purple-500 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-purple-600 cursor-pointer transition-colors"
                                                >
                                                    <UploadCloud className="w-4 h-4" /> Add Files (PDF, Code, ZIP)
                                                </label>
                                            </div>
                                        )}

                                        {/* Turn In / Unsubmit Buttons */}
                                        {(mySubmission?.status === 'submitted' || mySubmission?.status === 'late') ? (
                                            <button
                                                type="button"
                                                onClick={handleUnsubmit}
                                                disabled={loading}
                                                className="w-full py-2.5 border border-purple-500/30 hover:border-purple-500 text-purple-600 dark:text-purple-400 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" /> Unsubmit Assignment
                                            </button>
                                        ) : (
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                {loading ? <UploadCloud className="w-4 h-4 animate-pulse" /> : <CheckCircle className="w-4 h-4" />}
                                                {mySubmission?.status === 'unsubmitted' ? 'Resubmit Assignment' : 'Turn In'}
                                            </button>
                                        )}
                                    </form>
                                )}
                            </div>
                        ) : (
                            
                            /* TEACHER VIEW */
                            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-lg space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-white/10">
                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Student Work</h3>
                                    <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">
                                        {allSubmissions.filter(s => s.status === 'submitted' || s.status === 'late').length} Turned in / {allSubmissions.filter(s => s.status === 'graded').length} Graded
                                    </span>
                                </div>

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                                    {allSubmissions.map(sub => {
                                        const subId = sub._id;
                                        const currentRubric = rubricGrades[subId] || (task.rubric || []).map(r => ({
                                            criterion: r.criterion,
                                            pointsAwarded: r.points,
                                            maxPoints: r.points,
                                            feedback: ''
                                        }));
                                        const totalRubricScore = currentRubric.reduce((sum, item) => sum + (Number(item.pointsAwarded) || 0), 0);

                                        return (
                                            <div key={subId} className="bg-white dark:bg-black/30 p-3.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                                                        {sub.studentId?.fullname || 'Student'}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sub.status === 'graded' ? 'bg-purple-500/20 text-purple-400' : sub.status === 'late' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                        {sub.status === 'graded' ? `Graded (${sub.marksAwarded} pts)` : sub.status === 'late' ? 'Turned In Late' : 'Turned In'}
                                                    </span>
                                                </div>

                                                {sub.content && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-black/40 p-2 rounded-lg">
                                                        {sub.content}
                                                    </p>
                                                )}

                                                {/* Submission Attachments */}
                                                {Array.isArray(sub.attachments) && sub.attachments.length > 0 && (
                                                    <div className="space-y-1">
                                                        {sub.attachments.map((att, idx) => (
                                                            <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-black/40 px-2.5 py-1.5 rounded text-xs border border-gray-100 dark:border-white/5">
                                                                <span className="truncate text-gray-700 dark:text-gray-300">{att.fileName}</span>
                                                                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-400">
                                                                    <Download className="w-3.5 h-3.5" />
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Criterion-by-Criterion Rubric Grading */}
                                                {hasRubric ? (
                                                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-white/10">
                                                        <div className="flex justify-between items-center text-xs font-bold text-gray-700 dark:text-gray-300">
                                                            <span>Rubric Scoring:</span>
                                                            <span className="text-purple-600 dark:text-purple-400">Total: {totalRubricScore} / {task.maxMarks || 100}</span>
                                                        </div>

                                                        {currentRubric.map((item, rIdx) => (
                                                            <div key={rIdx} className="bg-gray-50 dark:bg-black/40 p-2 rounded-lg text-xs space-y-1">
                                                                <div className="flex justify-between items-center font-medium text-gray-800 dark:text-gray-200">
                                                                    <span className="truncate">{item.criterion}</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max={item.maxPoints}
                                                                            className="w-14 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/20 rounded px-1.5 py-0.5 text-right font-bold text-purple-600 dark:text-purple-400"
                                                                            value={item.pointsAwarded ?? item.maxPoints}
                                                                            onChange={(e) => handleRubricScoreChange(subId, item.criterion, 'pointsAwarded', Number(e.target.value))}
                                                                        />
                                                                        <span className="text-gray-500 text-[10px]">/ {item.maxPoints}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
                                                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Grade:</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={task.maxMarks || 100}
                                                            defaultValue={sub.marksAwarded || ''}
                                                            id={`manual-grade-${subId}`}
                                                            placeholder={`/ ${task.maxMarks || 100}`}
                                                            className="w-24 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/20 rounded px-2 py-1 text-xs font-bold text-purple-600 dark:text-purple-400"
                                                        />
                                                    </div>
                                                )}

                                                {/* Teacher Feedback Textarea */}
                                                <textarea
                                                    value={teacherFeedbackMap[subId] || ''}
                                                    onChange={(e) => setTeacherFeedbackMap({ ...teacherFeedbackMap, [subId]: e.target.value })}
                                                    placeholder="Add feedback to student..."
                                                    rows="2"
                                                    className="w-full bg-white dark:bg-black/30 border border-gray-300 dark:border-white/20 rounded-lg p-2 text-xs text-gray-900 dark:text-white resize-none outline-none focus:border-purple-500"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const manualInput = document.getElementById(`manual-grade-${subId}`);
                                                        handleGrade(subId, manualInput ? manualInput.value : undefined);
                                                    }}
                                                    className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                                >
                                                    Save Grade & Return
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {allSubmissions.length === 0 && (
                                        <p className="text-xs text-gray-500 text-center py-6">No student submissions yet.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignmentModal;
