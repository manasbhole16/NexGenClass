import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, Clock, AlertCircle, FileText, Search, ExternalLink, ChevronRight, User, Brain } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const ClassGradesTab = ({ roomId, roomDetails, user, tasks = [], onOpenAssignment }) => {
    const ownerId = roomDetails?.owner?._id || roomDetails?.owner;
    const isTeacher = ownerId === user?._id || user?.role === 'teacher';
    const [submissionsMap, setSubmissionsMap] = useState({}); // { `${taskId}_${studentId}`: submission }
    const [quizzes, setQuizzes] = useState([]);
    const [quizAttemptsMap, setQuizAttemptsMap] = useState({}); // { `${quizId}_${studentId}`: attempt }
    const [loading, setLoading] = useState(false);
    const [selectedStudentFilter, setSelectedStudentFilter] = useState('all');
    const [studentActiveFilter, setStudentActiveFilter] = useState('all');

    const assignments = tasks.filter(t => (t.taskType || 'assignment') === 'assignment');
    const students = (roomDetails?.members || []).filter(m => (m._id || m) !== ownerId);

    useEffect(() => {
        if (!roomId || roomId === 'personal') return;

        const loadGradesData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Room Quizzes
                const quizRes = await fetch(`${API_BASE_URL}/api/quiz/room/${roomId}`, { credentials: 'include' }).catch(() => null);
                const quizData = quizRes ? await quizRes.json() : null;
                const loadedQuizzes = (quizData?.success && Array.isArray(quizData.quizzes)) ? quizData.quizzes : [];
                setQuizzes(loadedQuizzes);

                if (isTeacher) {
                    // Fetch submissions for all assignments
                    const subPromises = assignments.map(a =>
                        fetch(`${API_BASE_URL}/api/submissions/task/${a._id}`, { credentials: 'include' })
                            .then(r => r.json())
                            .catch(() => ({ success: false, submissions: [] }))
                    );
                    const subResults = await Promise.all(subPromises);
                    const newMap = {};
                    subResults.forEach((res, index) => {
                        if (res.success && Array.isArray(res.submissions)) {
                            const taskId = assignments[index]._id;
                            res.submissions.forEach(sub => {
                                const sId = sub.studentId?._id || sub.studentId;
                                if (sId) {
                                    newMap[`${taskId}_${sId}`] = sub;
                                }
                            });
                        }
                    });
                    setSubmissionsMap(newMap);

                    // Fetch attempts for all quizzes in room
                    const qAttemptPromises = loadedQuizzes.map(q =>
                        fetch(`${API_BASE_URL}/api/quiz/${q._id}/results`, { credentials: 'include' })
                            .then(r => r.json())
                            .catch(() => ({ success: false, attempts: [] }))
                    );
                    const qResults = await Promise.all(qAttemptPromises);
                    const newQMap = {};
                    qResults.forEach((res, index) => {
                        if (res.success && Array.isArray(res.attempts)) {
                            const qId = loadedQuizzes[index]._id;
                            res.attempts.forEach(att => {
                                const sId = att.studentId?._id || att.studentId;
                                if (sId) {
                                    // Store best or latest evaluated attempt
                                    const existing = newQMap[`${qId}_${sId}`];
                                    if (!existing || att.score > existing.score) {
                                        newQMap[`${qId}_${sId}`] = att;
                                    }
                                }
                            });
                        }
                    });
                    setQuizAttemptsMap(newQMap);
                } else {
                    // Fetch student's own submissions
                    const subRes = await fetch(`${API_BASE_URL}/api/submissions/me?roomId=${roomId}`, { credentials: 'include' });
                    const subData = await subRes.json();
                    if (subData.success && Array.isArray(subData.submissions)) {
                        const newMap = {};
                        subData.submissions.forEach(sub => {
                            const tId = sub.taskId?._id || sub.taskId;
                            if (tId) {
                                newMap[`${tId}_${user._id}`] = sub;
                            }
                        });
                        setSubmissionsMap(newMap);
                    }

                    // Fetch student's own quiz attempts
                    const qAttRes = await fetch(`${API_BASE_URL}/api/quiz/attempts/me?roomId=${roomId}`, { credentials: 'include' });
                    const qAttData = await qAttRes.json();
                    if (qAttData.success && Array.isArray(qAttData.attempts)) {
                        const newQMap = {};
                        qAttData.attempts.forEach(att => {
                            const qId = att.quizId?._id || att.quizId;
                            if (qId) {
                                const existing = newQMap[`${qId}_${user._id}`];
                                if (!existing || att.score > existing.score) {
                                    newQMap[`${qId}_${user._id}`] = att;
                                }
                            }
                        });
                        setQuizAttemptsMap(newQMap);
                    }
                }
            } catch (err) {
                console.error("Failed to load submissions and quizzes for grades", err);
            } finally {
                setLoading(false);
            }
        };

        loadGradesData();
    }, [roomId, isTeacher, assignments.length, user._id]);

    // Student View: Calculate specific assignment & quiz statuses
    const getStudentWorkList = () => {
        const now = new Date();
        const assignmentList = assignments.map(task => {
            const sub = submissionsMap[`${task._id}_${user._id}`];
            let status = 'assigned';
            let label = 'Assigned';
            let badgeColor = 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400';

            if (sub) {
                if (sub.status === 'graded' || (sub.marksAwarded !== null && sub.marksAwarded !== undefined)) {
                    status = 'returned';
                    label = `Graded: ${sub.marksAwarded ?? sub.grade}/${task.maxMarks || 100}`;
                    badgeColor = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                } else if (sub.status === 'late') {
                    status = 'submitted';
                    label = 'Turned in (Late)';
                    badgeColor = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                } else {
                    status = 'submitted';
                    label = 'Turned in';
                    badgeColor = 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
                }
            } else if (task.dueDate && new Date(task.dueDate) < now) {
                status = 'missing';
                label = 'Missing';
                badgeColor = 'bg-red-500/10 text-red-500 border border-red-500/20';
            }

            return {
                id: task._id,
                title: task.title,
                type: 'assignment',
                maxMarks: task.maxMarks || 100,
                dueDate: task.dueDate,
                sub,
                status,
                label,
                badgeColor
            };
        });

        const quizList = quizzes.map(q => {
            const att = quizAttemptsMap[`${q._id}_${user._id}`];
            let status = 'assigned';
            let label = 'Available';
            let badgeColor = 'bg-pink-500/10 text-pink-500 border border-pink-500/20';

            if (att) {
                if (att.isEvaluated || att.status === 'graded') {
                    status = 'returned';
                    label = `Graded: ${att.score}/${q.totalMarks}`;
                    badgeColor = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                } else {
                    status = 'submitted';
                    label = 'Submitted (Pending Review)';
                    badgeColor = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                }
            } else if (q.deadline && new Date(q.deadline) < now) {
                status = 'missing';
                label = 'Expired';
                badgeColor = 'bg-red-500/10 text-red-500 border border-red-500/20';
            }

            return {
                id: q._id,
                title: q.title,
                type: 'quiz',
                topic: q.topic,
                maxMarks: q.totalMarks || 10,
                dueDate: q.deadline,
                att,
                status,
                label,
                badgeColor
            };
        });

        return [...assignmentList, ...quizList];
    };

    // Calculate Overall Grade for a student (Combined Assignments + Quizzes)
    const calculateStudentGrade = (studentId) => {
        let totalScored = 0;
        let totalPossible = 0;
        let gradedCount = 0;

        assignments.forEach(task => {
            const sub = submissionsMap[`${task._id}_${studentId}`];
            if (sub && (sub.marksAwarded !== null && sub.marksAwarded !== undefined)) {
                totalScored += Number(sub.marksAwarded);
                totalPossible += Number(task.maxMarks || 100);
                gradedCount++;
            }
        });

        quizzes.forEach(q => {
            const att = quizAttemptsMap[`${q._id}_${studentId}`];
            if (att && att.isEvaluated) {
                totalScored += Number(att.score);
                totalPossible += Number(q.totalMarks || 10);
                gradedCount++;
            }
        });

        if (totalPossible === 0) return null;
        const percentage = Math.round((totalScored / totalPossible) * 100);
        return { percentage, totalScored, totalPossible, gradedCount };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-500">
                <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mr-3" />
                Loading classroom gradebook...
            </div>
        );
    }

    const totalWorkCount = assignments.length + quizzes.length;

    if (totalWorkCount === 0) {
        return (
            <div className="max-w-xl mx-auto text-center py-16 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                <div className="w-16 h-16 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No assessable work yet</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                    {isTeacher
                        ? "Create assignments or quizzes to start tracking student grades."
                        : "Your instructor hasn't posted any assessable assignments or quizzes yet."}
                </p>
            </div>
        );
    }

    // ----------------------------------------------------
    // TEACHER VIEW: Full Student × (Assignment + Quiz) Matrix
    // ----------------------------------------------------
    if (isTeacher) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Unified Classroom Gradebook</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {students.length} Students &bull; {assignments.length} Assignments &bull; {quizzes.length} Quizzes
                        </p>
                    </div>
                </div>

                {students.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                        No students enrolled in this classroom yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                                    <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 p-4 text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider min-w-[200px] border-r border-slate-200 dark:border-slate-800">
                                        Student
                                    </th>
                                    <th className="p-4 text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-wider min-w-[120px] text-center border-r border-slate-200 dark:border-slate-800">
                                        Overall Grade
                                    </th>
                                    {/* Assignments Columns */}
                                    {assignments.map(task => (
                                        <th
                                            key={task._id}
                                            className="p-4 text-xs font-bold text-slate-900 dark:text-white min-w-[160px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-r border-slate-200 dark:border-slate-800"
                                            onClick={() => onOpenAssignment && onOpenAssignment(task)}
                                            title="Click to view assignment"
                                        >
                                            <div className="truncate font-black">{task.title}</div>
                                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                Assignment &bull; Out of {task.maxMarks || 100}
                                            </div>
                                        </th>
                                    ))}
                                    {/* Quizzes Columns */}
                                    {quizzes.map(q => (
                                        <th
                                            key={q._id}
                                            className="p-4 text-xs font-bold text-pink-600 dark:text-pink-400 min-w-[160px] border-r border-slate-200 dark:border-slate-800"
                                        >
                                            <div className="truncate font-black flex items-center gap-1">
                                                <Brain className="w-3.5 h-3.5" /> {q.title}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                Quiz &bull; Out of {q.totalMarks}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                                {students.map(student => {
                                    const overall = calculateStudentGrade(student._id);
                                    return (
                                        <tr key={student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 p-4 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-black text-xs shrink-0">
                                                        {student.fullname?.[0]?.toUpperCase() || 'S'}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="truncate font-bold text-xs">{student.fullname}</p>
                                                        <p className="truncate text-[10px] text-slate-400">{student.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-4 text-center border-r border-slate-200 dark:border-slate-800 font-black text-xs">
                                                {overall ? (
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                                                        overall.percentage >= 80 ? 'bg-emerald-500/10 text-emerald-500' :
                                                        overall.percentage >= 60 ? 'bg-blue-500/10 text-blue-500' :
                                                        'bg-amber-500/10 text-amber-500'
                                                    }`}>
                                                        {overall.percentage}%
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Assignment Scores */}
                                            {assignments.map(task => {
                                                const sub = submissionsMap[`${task._id}_${student._id}`];
                                                return (
                                                    <td key={task._id} className="p-4 text-center border-r border-slate-200 dark:border-slate-800">
                                                        {sub && (sub.marksAwarded !== null && sub.marksAwarded !== undefined) ? (
                                                            <span className="font-bold text-emerald-500">{sub.marksAwarded} / {task.maxMarks || 100}</span>
                                                        ) : sub ? (
                                                            <span className="text-blue-500 font-medium">Turned in</span>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Quiz Scores */}
                                            {quizzes.map(q => {
                                                const att = quizAttemptsMap[`${q._id}_${student._id}`];
                                                return (
                                                    <td key={q._id} className="p-4 text-center border-r border-slate-200 dark:border-slate-800">
                                                        {att && att.isEvaluated ? (
                                                            <span className="font-black text-pink-600 dark:text-pink-400">{att.score} / {q.totalMarks}</span>
                                                        ) : att ? (
                                                            <span className="text-amber-500 font-medium">Pending Review</span>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }

    // ----------------------------------------------------
    // STUDENT VIEW: Individual Progress & Graded Items
    // ----------------------------------------------------
    const studentWork = getStudentWorkList();
    const overallGrade = calculateStudentGrade(user._id);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Overall Student Grade Hero */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center border border-pink-500/20">
                        <Award className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Your Academic Performance</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Cumulative grade across evaluated assignments and quizzes.</p>
                    </div>
                </div>

                <div className="text-center sm:text-right">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cumulative Score</p>
                    <p className="text-3xl font-black text-pink-600 dark:text-pink-400">
                        {overallGrade ? `${overallGrade.percentage}%` : '—'}
                    </p>
                    {overallGrade && (
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {overallGrade.totalScored} / {overallGrade.totalPossible} Total Points
                        </p>
                    )}
                </div>
            </div>

            {/* Student Graded Work List */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Assigned Work & Tests</h3>
                <div className="space-y-3">
                    {studentWork.map(item => (
                        <div
                            key={item.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'quiz' ? 'bg-pink-500/10 text-pink-500 border border-pink-500/20' : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'}`}>
                                    {item.type === 'quiz' ? <Brain className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.title}</h4>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        {item.type === 'quiz' ? `Quiz (${item.topic || 'General'})` : 'Assignment'} &bull; Max {item.maxMarks} Points
                                    </p>
                                </div>
                            </div>

                            <span className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap ${item.badgeColor}`}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ClassGradesTab;
