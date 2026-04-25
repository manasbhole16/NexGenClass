import React, { useState, useEffect, useRef } from 'react';
import API_BASE_URL from '../../apiConfig';
import { ArrowLeft, Loader, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

const AttemptQuiz = ({ quiz, onBack, onComplete }) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState([]); // [{questionId, selectedOption}]
    const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60); // seconds
    const timerRef = useRef(null);

    useEffect(() => {
        fetchQuizDetails();
        return () => clearInterval(timerRef.current);
    }, []);

    useEffect(() => {
        if (!loading && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleAutoSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [loading]);

    const fetchQuizDetails = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setQuestions(data.questions);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Note: uses state refs functionally or directly via form sumbit for auto-submit
    const handleAutoSubmit = async () => {
        // Fetch current state from DOM or rely on a submit ref if necessary.
        // For simplicity, we just submit the `answers` state as it is at timeout.
        submitQuizData();
    };

    const handleSelectOption = (questionId, optionIdx) => {
        const existing = answers.find(a => a.questionId === questionId);
        if (existing) {
            setAnswers(answers.map(a => a.questionId === questionId ? { ...a, selectedOption: optionIdx } : a));
        } else {
            setAnswers([...answers, { questionId, selectedOption: optionIdx }]);
        }
    };

    const submitQuizData = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/attempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                onComplete();
            } else {
                alert(data.message);
                onBack(); // Exit if already attempted or err
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader className="w-8 h-8 animate-spin text-pink-500" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-4 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} disabled={submitting} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-300" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white line-clamp-1">{quiz.title}</h2>
                        <p className="text-xs text-gray-400">{questions.length} Questions</p>
                    </div>
                </div>
                
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold font-mono text-lg ${timeLeft < 60 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-black/40 text-pink-400'}`}>
                    <Clock className="w-5 h-5" />
                    {formatTime(timeLeft)}
                </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-400/90 leading-relaxed">
                    Once you start, the timer cannot be paused. The quiz will be automatically submitted when the time expires. Make sure not to refresh the page.
                </p>
            </div>

            <div className="space-y-6 pb-20">
                {questions.map((q, idx) => (
                    <div key={q._id} className="bg-black/20 border border-white/5 rounded-2xl p-6 md:p-8">
                        <div className="flex justify-between items-start gap-4 mb-6">
                            <h3 className="text-lg font-medium text-gray-200">
                                <span className="text-pink-500 font-bold mr-2">{idx + 1}.</span>
                                {q.questionText}
                            </h3>
                            <span className="text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded whitespace-nowrap">
                                {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {q.options.map((opt, optIdx) => {
                                const isSelected = answers.find(a => a.questionId === q._id)?.selectedOption === optIdx;
                                return (
                                    <label key={optIdx} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-pink-500' : 'border-gray-500'}`}>
                                            {isSelected && <div className="w-2.5 h-2.5 bg-pink-500 rounded-full" />}
                                        </div>
                                        <span className="text-gray-300 select-none text-sm md:text-base">{opt.text}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#030305]/80 backdrop-blur-xl border-t border-white/10 z-20 flex justify-center">
                <button
                    onClick={submitQuizData}
                    disabled={submitting}
                    className="w-full max-w-md bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(219,39,119,0.3)] transition-all disabled:opacity-50"
                >
                    {submitting ? <Loader className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Submit Quiz</>}
                </button>
            </div>
        </div>
    );
};

export default AttemptQuiz;
