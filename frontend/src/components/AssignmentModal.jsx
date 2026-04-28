import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../apiConfig';
import { X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const AssignmentModal = ({ isOpen, onClose, task, user, roomDetails }) => {
    const [submissionContent, setSubmissionContent] = useState('');
    const [mySubmission, setMySubmission] = useState(null);
    const [allSubmissions, setAllSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);

    const isTeacher = roomDetails?.owner === user?._id;

    useEffect(() => {
        if (isOpen && task) {
            if (isTeacher) {
                fetchSubmissions();
            } else {
                fetchMySubmission();
            }
        }
    }, [isOpen, task, isTeacher]);

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
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/submissions/${task._id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: submissionContent, roomId: roomDetails._id }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setMySubmission(data.submission);
            }
        } catch (err) { console.error(err); }
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

    if (!isOpen || !task) return null;

    const isLate = task.dueDate && new Date() > new Date(task.dueDate);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#18181b] rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-medium">
                                {task.category || 'Classwork'}
                            </span>
                            {task.dueDate && (
                                <span className={`text-xs flex items-center gap-1 font-medium ${isLate && !mySubmission ? 'text-red-400' : 'text-gray-400'}`}>
                                    <Clock className="w-3 h-3" />
                                    Due {format(new Date(task.dueDate), 'MMM d, yyyy h:mm a')}
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-white">{task.title}</h2>
                        <p className="text-sm text-gray-400 mt-1">{task.maxMarks || 100} points</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400 hover:text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
                    
                    {/* Left: Task Details */}
                    <div className="flex-1 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2 border-b border-white/10 pb-2">Instructions</h3>
                            <p className="text-gray-300 whitespace-pre-wrap">{task.description || 'No instructions provided.'}</p>
                        </div>
                    </div>

                    {/* Right: Submission/Grading Area */}
                    <div className="md:w-80 border-l border-white/10 pl-0 md:pl-8 flex flex-col gap-6">
                        
                        {!isTeacher ? (
                            // Student View
                            <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Your work</h3>
                                    {mySubmission ? (
                                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${mySubmission.status === 'late' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            {mySubmission.status === 'late' ? 'Turned in late' : 'Turned in'}
                                        </span>
                                    ) : (
                                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${isLate ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {isLate ? 'Missing' : 'Assigned'}
                                        </span>
                                    )}
                                </div>
                                
                                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                    <textarea
                                        value={submissionContent}
                                        onChange={(e) => setSubmissionContent(e.target.value)}
                                        placeholder="Add private comment or link to your work..."
                                        className="w-full h-32 bg-black/30 border border-white/10 rounded-lg p-3 text-sm focus:border-purple-500 outline-none resize-none transition-colors"
                                        disabled={mySubmission?.status === 'graded'}
                                    />
                                    {mySubmission?.status === 'graded' ? (
                                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-center">
                                            <p className="text-sm font-medium text-purple-300">Grade: {mySubmission.marksAwarded} / {task.maxMarks || 100}</p>
                                        </div>
                                    ) : (
                                        <button 
                                            type="submit" 
                                            disabled={loading}
                                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
                                        >
                                            {mySubmission ? 'Resubmit' : 'Turn in'}
                                        </button>
                                    )}
                                </form>
                            </div>
                        ) : (
                            // Teacher View
                            <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg flex-1 overflow-y-auto">
                                <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                                    Student Work
                                    <span className="text-sm font-normal text-gray-400">{allSubmissions.length} Turned in</span>
                                </h3>
                                
                                <div className="space-y-4">
                                    {allSubmissions.map(sub => (
                                        <div key={sub._id} className="bg-black/30 p-3 rounded-lg border border-white/5">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-sm">{sub.studentId?.fullname}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sub.status === 'late' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                    {sub.status === 'late' ? 'Late' : 'Done'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mb-3 line-clamp-2">{sub.content || 'No content provided'}</p>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number"
                                                    defaultValue={sub.marksAwarded || ''}
                                                    placeholder=" / 100"
                                                    onBlur={(e) => handleGrade(sub._id, e.target.value)}
                                                    className="w-20 bg-transparent border-b border-white/20 text-sm focus:border-purple-500 outline-none px-1 text-center"
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
