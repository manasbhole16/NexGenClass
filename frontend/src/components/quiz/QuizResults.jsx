import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import { ArrowLeft, Loader, Users, Target, CheckCircle2, AlertCircle } from 'lucide-react';

const QuizResults = ({ quiz, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState({ analytics: { totalAttempts: 0, averageScore: 0 }, attempts: [], questions: [] });
    const [selectedAttempt, setSelectedAttempt] = useState(null);
    const [gradeData, setGradeData] = useState({ addedScore: 0, teacherFeedback: '' });
    const [submitLoading, setSubmitLoading] = useState(false);

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/results`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setResults({ analytics: data.analytics, attempts: data.attempts, questions: data.questions || [] });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEvaluateSubmit = async () => {
        if (!selectedAttempt) return;
        setSubmitLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/evaluate/${selectedAttempt._id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gradeData),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert('Evaluation saved successfully!');
                setSelectedAttempt(null);
                fetchResults(); // Refresh table
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader className="w-8 h-8 animate-spin text-pink-500" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => selectedAttempt ? setSelectedAttempt(null) : onBack()} className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedAttempt ? `Grade: ${selectedAttempt.studentId.fullname}` : `Results: ${quiz.title}`}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {selectedAttempt ? `Current Score: ${selectedAttempt.score} / ${quiz.totalMarks}` : `Total Marks: ${quiz.totalMarks}`}
                    </p>
                </div>
            </div>

            {selectedAttempt ? (
                <div className="space-y-6">
                    {/* Render Short Answer Questions for grading */}
                    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-500" /> Responses Pending Evaluation
                        </h3>
                        
                        <div className="space-y-6">
                            {results.questions.filter(q => q.type === 'short_answer').map((q, idx) => {
                                const ans = selectedAttempt.answers.find(a => a.questionId === q._id);
                                return (
                                    <div key={q._id} className="border-l-2 border-pink-500 pl-4 py-2">
                                        <p className="font-medium text-gray-900 dark:text-gray-200 mb-2">Q: {q.questionText} <span className="text-xs text-gray-500 ml-2">({q.marks} Marks)</span></p>
                                        
                                        <div className="bg-gray-50 dark:bg-black/30 rounded-lg p-3 mb-2">
                                            <p className="text-xs text-gray-500 mb-1 font-bold uppercase">Student's Answer</p>
                                            <p className="text-sm text-gray-800 dark:text-gray-300">{ans?.textAnswer || <span className="italic text-gray-400">No answer provided</span>}</p>
                                        </div>
                                        
                                        {q.referenceAnswer && (
                                            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/30">
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 font-bold uppercase">Reference Answer</p>
                                                <p className="text-sm text-gray-800 dark:text-gray-300">{q.referenceAnswer}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider font-bold">Add Marks</label>
                            <input
                                type="number"
                                value={gradeData.addedScore}
                                onChange={e => setGradeData({ ...gradeData, addedScore: Number(e.target.value) })}
                                className="w-full bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2 focus:border-pink-500 outline-none text-gray-900 dark:text-white"
                                placeholder="Enter marks to add..."
                            />
                            <p className="text-xs text-gray-500 mt-1">This will be added to the auto-graded score of {selectedAttempt.score}.</p>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider font-bold">Teacher Feedback</label>
                            <textarea
                                value={gradeData.teacherFeedback}
                                onChange={e => setGradeData({ ...gradeData, teacherFeedback: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2 focus:border-pink-500 outline-none h-24 resize-none text-gray-900 dark:text-white"
                                placeholder="Great explanation, but you missed..."
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleEvaluateSubmit}
                        disabled={submitLoading}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {submitLoading ? <Loader className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Submit Evaluation</>}
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-50 dark:bg-gradient-to-br dark:from-purple-600/20 dark:to-cyan-600/20 border border-gray-200 dark:border-white/10 rounded-2xl p-6 flex items-center gap-4">
                    <div className="p-4 bg-purple-100 dark:bg-purple-500/20 rounded-xl"><Users className="w-8 h-8 text-purple-600 dark:text-purple-400" /></div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Attempts</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{results.analytics.totalAttempts}</p>
                    </div>
                </div>
                <div className="bg-pink-50 dark:bg-gradient-to-br dark:from-pink-600/20 dark:to-orange-600/20 border border-gray-200 dark:border-white/10 rounded-2xl p-6 flex items-center gap-4">
                    <div className="p-4 bg-pink-100 dark:bg-pink-500/20 rounded-xl"><Target className="w-8 h-8 text-pink-600 dark:text-pink-400" /></div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Average Score</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{results.analytics.averageScore.toFixed(1)} <span className="text-lg text-gray-500">/ {quiz.totalMarks}</span></p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#0f0f12] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden mt-8 shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                            <th className="p-4 font-bold text-sm text-gray-700 dark:text-gray-300">Student Name</th>
                            <th className="p-4 font-bold text-sm text-gray-700 dark:text-gray-300">Email</th>
                            <th className="p-4 font-bold text-sm text-gray-700 dark:text-gray-300 text-center">Status</th>
                            <th className="p-4 font-bold text-sm text-gray-700 dark:text-gray-300 text-right">Score</th>
                            <th className="p-4 font-bold text-sm text-gray-700 dark:text-gray-300">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.attempts.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-gray-500">No attempts yet.</td>
                            </tr>
                        ) : (
                            results.attempts.map(attempt => (
                                <tr key={attempt._id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-900 dark:text-gray-200">
                                    <td className="p-4 font-medium">{attempt.studentId.fullname}</td>
                                    <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{attempt.studentId.email}</td>
                                    <td className="p-4 text-center">
                                        {attempt.isEvaluated ? (
                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-1 rounded-full">Evaluated</span>
                                        ) : (
                                            <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-500/20 px-2 py-1 rounded-full">Needs Grading</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="font-bold text-pink-400">{attempt.score}</span> / {quiz.totalMarks}
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => {
                                                setSelectedAttempt(attempt);
                                                setGradeData({ addedScore: 0, teacherFeedback: attempt.teacherFeedback || '' });
                                            }}
                                            className="text-sm font-bold text-pink-600 hover:text-pink-500 transition-colors"
                                        >
                                            View & Grade
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
                </>
            )}
        </div>
    );
};

export default QuizResults;
