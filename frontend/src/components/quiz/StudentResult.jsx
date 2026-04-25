import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import { ArrowLeft, Loader, Trophy, Star } from 'lucide-react';
import Confetti from 'react-confetti';

const StudentResult = ({ quiz, user, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        fetchResult();
    }, []);

    const fetchResult = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/result/${user._id}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setResult(data.attempt);
                // Show confetti if score is more than 50%
                if (data.attempt.score >= (quiz.totalMarks / 2)) {
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 5000);
                }
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

    if (!result) return <div className="text-gray-400 p-8">Result not found.</div>;

    const percentage = Math.round((result.score / quiz.totalMarks) * 100);

    return (
        <div className="max-w-2xl mx-auto space-y-8 relative">
            {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={200} />}
            
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Quizzes
            </button>

            <div className="bg-gradient-to-b from-pink-500/20 to-purple-500/5 border border-pink-500/30 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full">
                    <div className="absolute top-[-50%] left-[-50%] w-full h-full bg-pink-500/20 blur-[100px] rounded-full" />
                </div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(219,39,119,0.5)]">
                        {percentage >= 80 ? <Trophy className="w-12 h-12 text-white" /> : <Star className="w-12 h-12 text-white" />}
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{percentage >= 80 ? 'Outstanding!' : percentage >= 50 ? 'Good Job!' : 'Keep Practicing!'}</h2>
                    <p className="text-gray-300 mb-8 max-w-sm mx-auto">You have successfully completed the quiz <strong>"{quiz.title}"</strong>.</p>
                    
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full max-w-sm flex justify-around">
                        <div className="text-center">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-bold">Your Score</p>
                            <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-orange-400">
                                {result.score}
                            </p>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div className="text-center">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-bold">Total Marks</p>
                            <p className="text-3xl font-bold text-white">{quiz.totalMarks}</p>
                        </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 mt-6">
                        Submitted at: {new Date(result.submittedAt).toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StudentResult;
