import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import { ArrowLeft, Loader, Users, Target } from 'lucide-react';

const QuizResults = ({ quiz, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState({ analytics: { totalAttempts: 0, averageScore: 0 }, attempts: [] });

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/results`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setResults({ analytics: data.analytics, attempts: data.attempts });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader className="w-8 h-8 animate-spin text-pink-500" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-300" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold">Results: {quiz.title}</h2>
                    <p className="text-gray-400 text-sm">Total Marks: {quiz.totalMarks}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
                    <div className="p-4 bg-purple-500/20 rounded-xl"><Users className="w-8 h-8 text-purple-400" /></div>
                    <div>
                        <p className="text-sm text-gray-400">Total Attempts</p>
                        <p className="text-3xl font-bold text-white">{results.analytics.totalAttempts}</p>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-pink-600/20 to-orange-600/20 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
                    <div className="p-4 bg-pink-500/20 rounded-xl"><Target className="w-8 h-8 text-pink-400" /></div>
                    <div>
                        <p className="text-sm text-gray-400">Average Score</p>
                        <p className="text-3xl font-bold text-white">{results.analytics.averageScore.toFixed(1)} <span className="text-lg text-gray-500">/ {quiz.totalMarks}</span></p>
                    </div>
                </div>
            </div>

            <div className="bg-[#0f0f12] border border-white/10 rounded-2xl overflow-hidden mt-8">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                            <th className="p-4 font-bold text-sm text-gray-300">Student Name</th>
                            <th className="p-4 font-bold text-sm text-gray-300">Email</th>
                            <th className="p-4 font-bold text-sm text-gray-300 text-right">Score</th>
                            <th className="p-4 font-bold text-sm text-gray-300">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.attempts.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-gray-500">No attempts yet.</td>
                            </tr>
                        ) : (
                            results.attempts.map(attempt => (
                                <tr key={attempt._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium">{attempt.studentId.fullname}</td>
                                    <td className="p-4 text-gray-400 text-sm">{attempt.studentId.email}</td>
                                    <td className="p-4 text-right">
                                        <span className="font-bold text-pink-400">{attempt.score}</span> / {quiz.totalMarks}
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">
                                        {new Date(attempt.submittedAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default QuizResults;
