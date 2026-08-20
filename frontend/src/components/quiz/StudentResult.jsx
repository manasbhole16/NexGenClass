import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import { 
    ArrowLeft, 
    Loader, 
    Trophy, 
    Star, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    AlertCircle, 
    HelpCircle, 
    Layers, 
    MessageSquare, 
    Check, 
    Eye, 
    Calendar,
    ChevronDown,
    ChevronUp,
    ShieldCheck,
    FileText
} from 'lucide-react';
import Confetti from 'react-confetti';

const StudentResult = ({ quiz, user, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [resultData, setResultData] = useState(null);
    const [selectedAttemptNum, setSelectedAttemptNum] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showQuestionBreakdown, setShowQuestionBreakdown] = useState(true);

    useEffect(() => {
        fetchResult(selectedAttemptNum);
    }, [selectedAttemptNum]);

    const fetchResult = async (attemptNum = null) => {
        try {
            setLoading(true);
            const query = attemptNum ? `?attemptNumber=${attemptNum}` : '';
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/result/${user._id}${query}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setResultData(data);
                if (data.attempt?.attemptNumber && !selectedAttemptNum) {
                    setSelectedAttemptNum(data.attempt.attemptNumber);
                }
                const passing = (data.quiz?.passingMarks || 0);
                const score = data.attempt?.score || 0;
                const isPassed = passing > 0 ? score >= passing : (data.attempt?.percentage >= 60);
                if (data.attempt?.isEvaluated && isPassed) {
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
        return (
            <div className="h-[calc(100vh-180px)] flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-pink-500" />
            </div>
        );
    }

    if (!resultData || !resultData.attempt) {
        return (
            <div className="max-w-2xl mx-auto text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 animate-fadeIn">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Assessment Record Found</h3>
                <p className="text-xs text-slate-400">You have not completed or submitted an attempt for this quiz yet.</p>
                <button onClick={onBack} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all">
                    Back to Quizzes
                </button>
            </div>
        );
    }

    const { attempt, questions = [], allAttempts = [], isResultHidden } = resultData;
    const totalPossibleMarks = quiz.totalMarks || (questions.length > 0 ? questions.reduce((sum, q) => sum + q.marks, 0) : 100);
    const percentage = attempt.percentage !== undefined ? attempt.percentage : (totalPossibleMarks > 0 ? Math.round((attempt.score / totalPossibleMarks) * 100) : 0);
    const passingMarks = quiz.passingMarks || resultData.quiz?.passingMarks || 0;
    const isPassed = passingMarks > 0 ? attempt.score >= passingMarks : percentage >= 50;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fadeIn relative">
            {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={250} />}

            {/* Header & Back Action */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-xs transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Quizzes
                </button>

                {/* Multiple Attempts Switcher */}
                {allAttempts.length > 1 && (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                        {allAttempts.map(att => (
                            <button
                                key={att.attemptNumber}
                                onClick={() => setSelectedAttemptNum(att.attemptNumber)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    attempt.attemptNumber === att.attemptNumber 
                                        ? 'bg-pink-600 text-white shadow-md' 
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                Attempt {att.attemptNumber} {att.isEvaluated ? `(${att.percentage || 0}%)` : '• Pending'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ========================================================= */}
            {/* HIDDEN RESULTS STATE (When results are unreleased)        */}
            {/* ========================================================= */}
            {isResultHidden ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-lg">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto border border-indigo-500/20">
                        <Clock className="w-8 h-8 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                            {quiz.topic || 'Assessment Completed'}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-3">
                            Attempt Submitted Successfully
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                            {resultData.message || "Your exam has been submitted securely. Detailed scores, answers, and teacher feedback will be available once released by your instructor."}
                        </p>
                    </div>

                    <div className="p-4 max-w-sm mx-auto bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 space-y-1">
                        <p>Attempt Number: #{attempt.attemptNumber}</p>
                        <p>Submitted At: {new Date(attempt.submittedAt).toLocaleString()}</p>
                    </div>
                </div>
            ) : (
                /* ========================================================= */
                /* EVALUATED / RELEASED RESULTS DISPLAY                      */
                /* ========================================================= */
                <div className="space-y-6">
                    {/* Main Score Hero Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden text-center space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-black uppercase px-3 py-1 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20">
                                {quiz.topic || 'Academic Quiz'}
                            </span>
                            <div className="flex items-center gap-2">
                                {attempt.isEvaluated && (
                                    <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${isPassed ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                        {isPassed ? 'Passed' : 'Needs Improvement'}
                                    </span>
                                )}
                                <span className="text-xs font-bold text-slate-400">
                                    Attempt {attempt.attemptNumber} of {quiz.allowedAttempts || 1}
                                </span>
                            </div>
                        </div>

                        {/* Status Icon & Message */}
                        <div className="flex flex-col items-center">
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-xl ${
                                !attempt.isEvaluated 
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                    : percentage >= 75 
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-emerald-500/10' 
                                        : 'bg-pink-500/10 text-pink-500 border border-pink-500/20'
                            }`}>
                                {!attempt.isEvaluated ? (
                                    <Clock className="w-10 h-10 animate-spin-slow" />
                                ) : percentage >= 75 ? (
                                    <Trophy className="w-10 h-10" />
                                ) : (
                                    <Star className="w-10 h-10" />
                                )}
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                {!attempt.isEvaluated 
                                    ? 'Subjective Answers Pending Review' 
                                    : percentage >= 80 
                                        ? 'Excellent Performance!' 
                                        : percentage >= 50 
                                            ? 'Good Effort!' 
                                            : 'Keep Practicing!'}
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                                {!attempt.isEvaluated 
                                    ? 'Your objective responses have been auto-graded. Your teacher will evaluate subjective short/long answers shortly.' 
                                    : `You have earned ${attempt.score} out of ${totalPossibleMarks} total marks.`}
                            </p>
                        </div>

                        {/* Marks & Percentage Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Total Score</p>
                                <p className="text-2xl font-black text-pink-500 mt-0.5">{attempt.score} <span className="text-xs text-slate-400">/ {totalPossibleMarks}</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Percentage</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{percentage}%</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Evaluation</p>
                                <p className={`text-xs font-black mt-2 uppercase ${attempt.isEvaluated ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {attempt.isEvaluated ? 'Graded' : 'Pending Review'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Submitted</p>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-2">
                                    {new Date(attempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>

                        {/* Overall Teacher Feedback */}
                        {attempt.teacherFeedback && (
                            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl text-left max-w-2xl mx-auto space-y-1">
                                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-500 uppercase tracking-wider">
                                    <MessageSquare className="w-3.5 h-3.5" /> Instructor Evaluation Notes
                                </div>
                                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                    {attempt.teacherFeedback}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Question by Question Review Accordion */}
                    {questions.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">Itemized Question Review</h3>
                                    <p className="text-xs text-slate-400">Inspect your submitted answers and solution keys.</p>
                                </div>
                                <button
                                    onClick={() => setShowQuestionBreakdown(!showQuestionBreakdown)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"
                                >
                                    {showQuestionBreakdown ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </button>
                            </div>

                            {showQuestionBreakdown && (
                                <div className="space-y-6">
                                    {questions.map((q, idx) => {
                                        const userAns = attempt.answers?.find(a => a.questionId?.toString() === q._id?.toString() || a.questionId === q._id);
                                        const marksAwarded = userAns?.marksAwarded || 0;
                                        const isFullMarks = marksAwarded === q.marks && q.marks > 0;
                                        const isPartial = marksAwarded > 0 && marksAwarded < q.marks;

                                        return (
                                            <div key={q._id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                                                {/* Card Header */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-400 uppercase">
                                                            {q.type.replace('_', ' ')}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                                            isFullMarks ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                            isPartial ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                            'bg-red-500/10 text-red-500 border border-red-500/20'
                                                        }`}>
                                                            {marksAwarded} / {q.marks} Pts
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Question Prompt */}
                                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                                                    {q.questionText}
                                                </p>

                                                {/* 1. MCQ Review */}
                                                {q.type === 'mcq' && (
                                                    <div className="space-y-2">
                                                        {q.options.map((opt, oIdx) => {
                                                            const isUserPick = userAns?.selectedOption === oIdx;
                                                            const isCorrect = Number(q.correctAnswer) === oIdx;

                                                            return (
                                                                <div key={oIdx} className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium ${
                                                                    isCorrect 
                                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
                                                                        : isUserPick 
                                                                            ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300' 
                                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                                                }`}>
                                                                    <div className="flex items-center gap-2.5">
                                                                        <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                                                                        <span>{opt.text}</span>
                                                                    </div>
                                                                    {isUserPick && (
                                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Your Selection</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* 2. Multiple Select Review */}
                                                {q.type === 'multiple_select' && (
                                                    <div className="space-y-2">
                                                        {q.options.map((opt, oIdx) => {
                                                            const isUserPick = Array.isArray(userAns?.selectedOptions) && userAns.selectedOptions.includes(oIdx);
                                                            const isCorrect = Array.isArray(q.correctAnswer) && q.correctAnswer.includes(oIdx);

                                                            return (
                                                                <div key={oIdx} className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium ${
                                                                    isCorrect 
                                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
                                                                        : isUserPick 
                                                                            ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300' 
                                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                                                }`}>
                                                                    <div className="flex items-center gap-2.5">
                                                                        <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                                                                        <span>{opt.text}</span>
                                                                    </div>
                                                                    {isUserPick && (
                                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Your Selection</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* 3. True / False Review */}
                                                {q.type === 'true_false' && (
                                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                                        {[
                                                            { label: 'True', val: 0 },
                                                            { label: 'False', val: 1 }
                                                        ].map(item => {
                                                            const isUserPick = userAns?.selectedOption === item.val;
                                                            const isCorrect = Number(q.correctAnswer) === item.val;

                                                            return (
                                                                <div key={item.val} className={`p-3 rounded-xl border flex items-center justify-between font-bold ${
                                                                    isCorrect 
                                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                                                                        : isUserPick 
                                                                            ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' 
                                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                                                                }`}>
                                                                    <span>{item.label}</span>
                                                                    {isUserPick && <span className="text-[10px] uppercase font-black">Your Pick</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* 4. Fill in the Blank Review */}
                                                {q.type === 'fill_blank' && (
                                                    <div className="space-y-2 text-xs">
                                                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                                                            <p className="font-bold text-slate-400 uppercase text-[10px]">Your Response:</p>
                                                            <p className="text-slate-800 dark:text-slate-200 font-medium">{userAns?.textAnswer || 'No response entered.'}</p>
                                                        </div>
                                                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-1">
                                                            <p className="font-bold text-emerald-500 uppercase text-[10px]">Correct Answer:</p>
                                                            <p className="text-slate-700 dark:text-slate-300 font-medium">{String(q.correctAnswer || '')}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 5 & 6. Short / Long Subjective Review */}
                                                {(q.type === 'short_answer' || q.type === 'long_answer') && (
                                                    <div className="space-y-3 text-xs">
                                                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                                                            <p className="font-bold text-slate-400 uppercase text-[10px]">Your Written Response:</p>
                                                            <p className="text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">{userAns?.textAnswer || 'No response entered.'}</p>
                                                        </div>

                                                        {q.referenceAnswer && (
                                                            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-1">
                                                                <p className="font-bold text-emerald-500 uppercase text-[10px]">Model Solution / Criteria:</p>
                                                                <p className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">{q.referenceAnswer}</p>
                                                            </div>
                                                        )}

                                                        {userAns?.feedback && (
                                                            <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-1">
                                                                <p className="font-bold text-indigo-500 uppercase text-[10px]">Teacher Feedback:</p>
                                                                <p className="text-slate-700 dark:text-slate-300 font-medium">{userAns.feedback}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Explanation */}
                                                {q.explanation && (
                                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 space-y-0.5">
                                                        <p className="font-bold uppercase text-[10px]">Solution Explanation:</p>
                                                        <p>{q.explanation}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentResult;
