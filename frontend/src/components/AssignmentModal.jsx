import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../apiConfig';
import { X, CheckCircle, Clock, AlertCircle, UploadCloud, FileText, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const AssignmentModal = ({ isOpen, onClose, task, user, roomDetails }) => {
    const [submissionContent, setSubmissionContent] = useState('');
    const [mySubmission, setMySubmission] = useState(null);
    const [allSubmissions, setAllSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState(null);

    const hasRoomContext = Boolean(roomDetails?._id);
    const isTeacher = hasRoomContext && roomDetails?.owner === user?._id;

    useEffect(() => {
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
            }
        } catch (err) { console.error(err); }
    };

    const fetchMySubmission = async () => {
        try {
            if (!roomDetails?._id) return;
            const res = await fetch(`${API_BASE_URL}/api/submissions/me?roomId=${roomDetails._id}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                const submission = data.submissions.find(s => s.taskId === task._id);
                if (submission) {
                    setMySubmission(submission);
                    setSubmissionContent(submission.content || '');
                }
            }
        } catch (err) { console.error(err); }
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
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
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
                setSelectedFile(null);
                setMessage({ type: 'success', text: 'Assignment submitted successfully!' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: data.message || "Failed to submit assignment" });
            }
        } catch (err) { 
            console.error(err); 
            setMessage({ type: 'error', text: "An error occurred during submission." });
        }
        setLoading(false);
    };

    const handleGrade = async (submissionId, marks) => {
        try {
            await fetch(`${API_BASE_URL}/api/submissions/${submissionId}/grade`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ marksAwarded: Number(marks) }),
                credentials: 'include'
            });
            fetchSubmissions(); // Refresh
        } catch (err) { console.error(err); }
    };

    const handleDeleteTask = async () => {
        if (!window.confirm("Are you sure you want to delete this assignment?")) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${task._id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                onClose();
                window.location.reload(); // Refresh the page to reflect deletion
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-gray-200 dark:border-white/10 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-white/5 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full font-medium">
                                {task.category || 'Classwork'}
                            </span>
                            {task.dueDate && (
                                <span className={`text-xs flex items-center gap-1 font-medium ${isLate && !mySubmission ? 'text-red-400' : 'text-gray-400'}`}>
                                    <Clock className="w-3 h-3" />
                                    Due {format(new Date(task.dueDate), 'MMM d, yyyy h:mm a')}
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{task.title}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.maxMarks || 100} points</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isTeacher && (
                            <button 
                                onClick={handleDeleteTask}
                                disabled={loading}
                                className="p-2 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 rounded-full transition-colors text-red-600 dark:text-red-400"
                                title="Delete Assignment"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
                    
                    {/* Left: Task Details */}
                    <div className="flex-1 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2 border-b border-gray-200 dark:border-white/10 pb-2 text-gray-900 dark:text-white">Instructions</h3>
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.description || 'No instructions provided.'}</p>
                        </div>
                        {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-2 border-b border-gray-200 dark:border-white/10 pb-2 text-gray-900 dark:text-white">Checklist</h3>
                                <ul className="space-y-2">
                                    {task.subtasks.map((item, index) => (
                                        <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                                            {item.title}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {Array.isArray(task.rubric) && task.rubric.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-2 border-b border-gray-200 dark:border-white/10 pb-2 text-gray-900 dark:text-white">Rubric</h3>
                                <div className="space-y-3">
                                    {task.rubric.map((item, index) => (
                                        <div key={index} className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.criterion}</p>
                                                <span className="text-xs text-purple-600 dark:text-purple-300 font-bold">{item.points} pts</span>
                                            </div>
                                            {item.description && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{item.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Submission/Grading Area */}
                    <div className="md:w-80 border-l border-gray-200 dark:border-white/10 pl-0 md:pl-8 flex flex-col gap-6">
                        {!hasRoomContext ? (
                            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-5 shadow-lg">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Personal task</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Submissions are only available inside a class room.
                                </p>
                            </div>
                        ) : !isTeacher ? (
                            // Student View
                            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-5 shadow-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Your work</h3>
                                    {mySubmission ? (
                                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${mySubmission.status === 'late' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            {mySubmission.status === 'late' ? '⚠️ Work submitted late' : '✅ Work completed on time'}
                                        </span>
                                    ) : (
                                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${isLate ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {isLate ? '⏳ Missing' : '📝 Assigned'}
                                        </span>
                                    )}
                                </div>

                                {message && (
                                    <div className={`mb-4 p-3 rounded-lg text-sm font-medium text-center ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                        {message.text}
                                    </div>
                                )}
                                
                                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                    <textarea
                                        value={submissionContent}
                                        onChange={(e) => setSubmissionContent(e.target.value)}
                                        placeholder="Add private comment or link to your work..."
                                        className="w-full h-24 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg p-3 text-sm focus:border-purple-500 outline-none resize-none transition-colors text-gray-900 dark:text-white"
                                        disabled={mySubmission?.status === 'graded'}
                                    />

                                    {/* Current Submission File */}
                                    {mySubmission?.fileName && (
                                        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                                <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{mySubmission.fileName}</span>
                                            </div>
                                            <a 
                                                href={`${API_BASE_URL}${mySubmission.fileUrl}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                    )}

                                    {/* File Input */}
                                    {mySubmission?.status !== 'graded' && (
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                onChange={(e) => setSelectedFile(e.target.files[0])} 
                                                className="hidden" 
                                                id="file-upload" 
                                            />
                                            <label 
                                                htmlFor="file-upload"
                                                className="flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-purple-500/50 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors cursor-pointer bg-white dark:bg-black/20 hover:bg-gray-50 dark:hover:bg-black/40"
                                            >
                                                <UploadCloud className="w-5 h-5" />
                                                {selectedFile ? selectedFile.name : 'Attach a file'}
                                            </label>
                                        </div>
                                    )}
                                    {mySubmission?.status === 'graded' ? (
                                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-center">
                                            <p className="text-sm font-medium text-purple-300">Grade: {mySubmission.marksAwarded} / {task.maxMarks || 100}</p>
                                        </div>
                                    ) : (
                                        <button 
                                            type="submit" 
                                            disabled={loading}
                                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2 relative"
                                        >
                                            {loading ? <span className="animate-pulse flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Uploading...</span> : (mySubmission ? 'Resubmit' : 'Turn in')}
                                        </button>
                                    )}
                                </form>
                            </div>
                        ) : (
                            // Teacher View
                            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-5 shadow-lg flex-1 overflow-y-auto">
                                <h3 className="font-bold text-lg mb-4 flex items-center justify-between text-gray-900 dark:text-white">
                                    Student Work
                                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{allSubmissions.length} Turned in</span>
                                </h3>
                                
                                <div className="space-y-4">
                                    {allSubmissions.map(sub => (
                                        <div key={sub._id} className="bg-white dark:bg-black/30 p-3 rounded-lg border border-gray-200 dark:border-white/5 shadow-sm">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-sm text-gray-900 dark:text-white">{sub.studentId?.fullname}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sub.status === 'late' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                    {sub.status === 'late' ? '⚠️ Late' : '✅ On Time'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{sub.content || 'No text content provided'}</p>
                                            
                                            {sub.fileName && (
                                                <div className="flex items-center justify-between bg-gray-50 dark:bg-black/40 p-2 rounded border border-gray-200 dark:border-white/5 mb-3">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate" title={sub.fileName}>{sub.fileName}</span>
                                                    </div>
                                                    <a 
                                                        href={`${API_BASE_URL}${sub.fileUrl}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                                                        title="Download attached file"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number"
                                                    defaultValue={sub.marksAwarded || ''}
                                                    placeholder=" / 100"
                                                    onBlur={(e) => handleGrade(sub._id, e.target.value)}
                                                    className="w-20 bg-transparent border-b border-gray-300 dark:border-white/20 text-sm focus:border-purple-500 outline-none px-1 text-center text-gray-900 dark:text-white"
                                                />
                                                <span className="text-xs text-gray-500">/ {task.maxMarks || 100}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {allSubmissions.length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">No submissions yet.</p>
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
