import React, { useState, useEffect, useRef } from 'react';
import API_BASE_URL from '../../apiConfig';
import { 
    ArrowLeft, 
    Loader, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    Flag, 
    ChevronLeft, 
    ChevronRight, 
    Send, 
    HelpCircle, 
    CheckSquare, 
    Radio, 
    Award, 
    Layers, 
    Sparkles, 
    Save, 
    Check, 
    RotateCcw,
    ShieldAlert,
    ShieldCheck,
    Image
} from 'lucide-react';

const AttemptQuiz = ({ quiz, onBack, onComplete }) => {
    // Stage: 'instructions' | 'in_exam' | 'confirm_submit'
    const [stage, setStage] = useState('instructions');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'

    // Exam Data
    const [quizData, setQuizData] = useState(quiz);
    const [attemptId, setAttemptId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);

    // Student Answers & Flags
    const [answers, setAnswers] = useState([]); // [{ questionId, selectedOption, selectedOptions, textAnswer }]
    const [flaggedQuestions, setFlaggedQuestions] = useState([]); // [questionId]

    // Safe Mode / Exam Monitoring Telemetry
    const [safeModeEnabled, setSafeModeEnabled] = useState(false);
    const [suspiciousWarningCount, setSuspiciousWarningCount] = useState(0);
    const [showSafeModeWarningToast, setShowSafeModeWarningToast] = useState(false);

    // Timer State (Server Synchronized)
    const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60);
    const timerRef = useRef(null);
    const answersRef = useRef(answers);
    const flaggedRef = useRef(flaggedQuestions);
    const autoSaveTimeoutRef = useRef(null);

    answersRef.current = answers;
    flaggedRef.current = flaggedQuestions;

    // Check on mount if student already has an active attempt in progress
    useEffect(() => {
        const checkActiveAttempt = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/start`, {
                    method: 'POST',
                    credentials: 'include'
                });
                const data = await res.json();
                if (data.success) {
                    setQuizData(data.quiz || quiz);
                    setQuestions(data.questions || []);
                    setAttemptId(data.attempt._id);
                    setTimeLeft(data.attempt.remainingSeconds);
                    setSafeModeEnabled(!!data.attempt.safeMode || !!data.quiz?.safeMode);

                    if (Array.isArray(data.attempt.savedAnswers) && data.attempt.savedAnswers.length > 0) {
                        setAnswers(data.attempt.savedAnswers);
                    }
                    if (Array.isArray(data.attempt.flaggedQuestions)) {
                        setFlaggedQuestions(data.attempt.flaggedQuestions.map(id => id.toString()));
                    }

                    if (data.attempt.status === 'in_progress' && data.attempt.savedAnswers?.length > 0) {
                        setStage('in_exam');
                    }
                }
            } catch (err) {
                console.error("Failed to check active quiz attempt:", err);
            } finally {
                setLoading(false);
            }
        };
        checkActiveAttempt();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        };
    }, [quiz._id]);

    // Timer Countdown Effect
    useEffect(() => {
        if (stage === 'in_exam' && timeLeft > 0) {
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
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [stage]);

    // Safe Mode Integrity Event Listener (Tab switch / blur detection)
    useEffect(() => {
        if (stage !== 'in_exam' || !safeModeEnabled) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                logSafeModeViolation('tab_switch', 'Student switched browser tab or minimized window');
            }
        };

        const handleWindowBlur = () => {
            logSafeModeViolation('window_blur', 'Exam window lost active focus');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
        };
    }, [stage, safeModeEnabled, quiz._id]);

    const logSafeModeViolation = async (eventType, details) => {
        setSuspiciousWarningCount(prev => prev + 1);
        setShowSafeModeWarningToast(true);
        setTimeout(() => setShowSafeModeWarningToast(false), 4000);

        try {
            await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/log-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventType, details }),
                credentials: 'include'
            });
        } catch (err) {
            console.error("Failed to log integrity telemetry:", err);
        }
    };

    // Background autosave interval (every 15 seconds)
    useEffect(() => {
        if (stage !== 'in_exam') return;
        const interval = setInterval(() => {
            persistProgressToServer(answersRef.current, flaggedRef.current);
        }, 15000);
        return () => clearInterval(interval);
    }, [stage]);

    const persistProgressToServer = async (currentAnswers, currentFlags) => {
        try {
            setAutoSaveStatus('saving');
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/save-progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers: currentAnswers,
                    flaggedQuestions: currentFlags
                }),
                credentials: 'include'
            });
            if (res.ok) {
                setAutoSaveStatus('saved');
                setTimeout(() => setAutoSaveStatus('idle'), 2500);
            } else {
                setAutoSaveStatus('error');
            }
        } catch (err) {
            console.error("Autosave error:", err);
            setAutoSaveStatus('error');
        }
    };

    const triggerDebouncedAutosave = (newAnswers, newFlags) => {
        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        setAutoSaveStatus('saving');
        autoSaveTimeoutRef.current = setTimeout(() => {
            persistProgressToServer(newAnswers, newFlags);
        }, 1200);
    };

    const handleStartExam = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/start`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setQuizData(data.quiz || quiz);
                setQuestions(data.questions || []);
                setAttemptId(data.attempt._id);
                setTimeLeft(data.attempt.remainingSeconds);
                setSafeModeEnabled(!!data.attempt.safeMode || !!data.quiz?.safeMode);
                if (Array.isArray(data.attempt.savedAnswers)) {
                    setAnswers(data.attempt.savedAnswers);
                }
                if (Array.isArray(data.attempt.flaggedQuestions)) {
                    setFlaggedQuestions(data.attempt.flaggedQuestions.map(id => id.toString()));
                }
                setStage('in_exam');
            } else {
                alert(data.message || "Failed to start quiz attempt.");
            }
        } catch (err) {
            console.error(err);
            alert("Error starting quiz.");
        } finally {
            setLoading(false);
        }
    };

    // Answer Handlers for all 6 question types
    const handleMCQChange = (questionId, optIdx) => {
        const existing = answers.find(a => a.questionId === questionId);
        let nextAnswers;
        if (existing) {
            nextAnswers = answers.map(a => a.questionId === questionId ? { ...a, selectedOption: optIdx } : a);
        } else {
            nextAnswers = [...answers, { questionId, selectedOption: optIdx }];
        }
        setAnswers(nextAnswers);
        triggerDebouncedAutosave(nextAnswers, flaggedQuestions);
    };

    const handleMultipleSelectChange = (questionId, optIdx) => {
        const existing = answers.find(a => a.questionId === questionId);
        let selectedOptions = existing && Array.isArray(existing.selectedOptions) ? [...existing.selectedOptions] : [];

        if (selectedOptions.includes(optIdx)) {
            selectedOptions = selectedOptions.filter(idx => idx !== optIdx);
        } else {
            selectedOptions.push(optIdx);
        }

        let nextAnswers;
        if (existing) {
            nextAnswers = answers.map(a => a.questionId === questionId ? { ...a, selectedOptions } : a);
        } else {
            nextAnswers = [...answers, { questionId, selectedOptions }];
        }
        setAnswers(nextAnswers);
        triggerDebouncedAutosave(nextAnswers, flaggedQuestions);
    };

    const handleTextAnswerChange = (questionId, text) => {
        const existing = answers.find(a => a.questionId === questionId);
        let nextAnswers;
        if (existing) {
            nextAnswers = answers.map(a => a.questionId === questionId ? { ...a, textAnswer: text } : a);
        } else {
            nextAnswers = [...answers, { questionId, textAnswer: text }];
        }
        setAnswers(nextAnswers);
        triggerDebouncedAutosave(nextAnswers, flaggedQuestions);
    };

    const toggleFlagQuestion = (questionId) => {
        let nextFlags;
        if (flaggedQuestions.includes(questionId)) {
            nextFlags = flaggedQuestions.filter(id => id !== questionId);
        } else {
            nextFlags = [...flaggedQuestions, questionId];
        }
        setFlaggedQuestions(nextFlags);
        triggerDebouncedAutosave(answers, nextFlags);
    };

    const handleAutoSubmit = () => {
        submitFinalExam(true);
    };

    const submitFinalExam = async (isAuto = false) => {
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
                alert(data.message || "Failed to submit assessment.");
                onBack();
            }
        } catch (err) {
            console.error(err);
            alert("Network error during submission.");
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const currentQuestion = questions[currentIdx];

    const answeredCount = questions.filter(q => {
        const ans = answers.find(a => a.questionId === q._id);
        if (!ans) return false;
        if (q.type === 'short_answer' || q.type === 'long_answer' || q.type === 'fill_blank') {
            return ans.textAnswer && ans.textAnswer.trim().length > 0;
        }
        if (q.type === 'multiple_select') return Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0;
        return ans.selectedOption !== null && ans.selectedOption !== undefined;
    }).length;

    const flaggedCount = flaggedQuestions.length;
    const unansweredCount = questions.length - answeredCount;

    if (loading && stage === 'instructions') {
        return (
            <div className="h-[calc(100vh-180px)] flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-pink-500" />
            </div>
        );
    }

    // ==========================================
    // STAGE 1: QUIZ INSTRUCTIONS SCREEN
    // ==========================================
    if (stage === 'instructions') {
        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={onBack} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-black uppercase tracking-wider text-pink-500">Academic Assessment Portal</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-black uppercase px-3 py-1 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20">
                            {quizData.topic || 'General Examination'}
                        </span>
                        <div className="flex items-center gap-2">
                            {safeModeEnabled && (
                                <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                                    <ShieldAlert className="w-3.5 h-3.5" /> Safe Exam Mode
                                </span>
                            )}
                            <span className="text-xs font-bold text-slate-400">
                                Allowed Attempts: <span className="text-slate-700 dark:text-slate-200">{quizData.allowedAttempts || 1}</span>
                            </span>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">
                            {quizData.title}
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {quizData.description || "Read each question carefully. Once started, the timer runs continuously on the server and cannot be paused. Your answers auto-save as you make progress."}
                        </p>
                    </div>

                    {/* Parameters Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Questions</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{questions.length || quizData.totalQuestions || 'Multiple'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Total Marks</p>
                            <p className="text-lg font-black text-pink-500 mt-0.5">{quizData.totalMarks} Pts</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Duration</p>
                            <p className="text-lg font-black text-amber-500 mt-0.5">{quizData.timeLimit} Mins</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Passing Score</p>
                            <p className="text-lg font-black text-emerald-500 mt-0.5">
                                {quizData.passingMarks ? `${quizData.passingMarks} Pts` : 'None'}
                            </p>
                        </div>
                    </div>

                    {/* Safe Mode Alert */}
                    {safeModeEnabled && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3.5">
                            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed space-y-1">
                                <p className="font-bold">Exam Integrity Monitoring Active:</p>
                                <p className="text-slate-600 dark:text-slate-400">
                                    This assessment runs with Safe Exam Mode. Switching tabs, opening other windows, or losing window focus is logged and provided to your teacher for review.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Start Action */}
                    <button
                        onClick={handleStartExam}
                        disabled={loading}
                        className="w-full py-4 bg-pink-600 hover:bg-pink-700 text-white font-black text-base rounded-2xl transition-all shadow-xl shadow-pink-600/30 flex items-center justify-center gap-2 active:scale-98"
                    >
                        {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        Start Assessment
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // STAGE 2: ACTIVE EXAM RUNNER
    // ==========================================
    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12 relative">
            {/* Safe Mode Warning Toast */}
            {showSafeModeWarningToast && (
                <div className="fixed top-6 right-6 z-50 bg-amber-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-bounce">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Focus lost! Tab switch event logged ({suspiciousWarningCount}).</span>
                </div>
            )}

            {/* Top Examination Header & Server Timer Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-xl">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-500 font-black flex items-center justify-center border border-pink-500/20 shrink-0">
                        {currentIdx + 1}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">{quizData.title}</h2>
                            {safeModeEnabled && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 hidden sm:inline-block">
                                    Safe Mode
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">Question {currentIdx + 1} of {questions.length}</p>
                    </div>
                </div>

                {/* Center / Right: Timer & Autosave Status */}
                <div className="flex items-center gap-3 ml-auto">
                    {/* Autosave Status Badge */}
                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-400 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                        {autoSaveStatus === 'saving' && <><Loader className="w-3 h-3 animate-spin text-pink-500" /> <span className="text-[11px]">Saving...</span></>}
                        {autoSaveStatus === 'saved' && <><Check className="w-3 h-3 text-emerald-500" /> <span className="text-[11px] text-emerald-500">Saved</span></>}
                        {autoSaveStatus === 'error' && <><RotateCcw className="w-3 h-3 text-amber-500" /> <span className="text-[11px] text-amber-500">Saved locally</span></>}
                        {autoSaveStatus === 'idle' && <><Save className="w-3 h-3 text-slate-400" /> <span className="text-[11px]">Autosave ON</span></>}
                    </div>

                    {/* Server Authoritative Timer Countdown */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black font-mono text-base sm:text-lg transition-all border ${
                        timeLeft < 60 
                            ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse shadow-lg shadow-red-500/20' 
                            : timeLeft < 300 
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
                    }`}>
                        <Clock className="w-4 h-4 text-current shrink-0" />
                        <span>{formatTime(timeLeft)}</span>
                    </div>

                    {/* Submit / Finish Button */}
                    <button
                        onClick={() => setStage('confirm_submit')}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-pink-600/20 active:scale-95 flex items-center gap-1.5"
                    >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit</span>
                    </button>
                </div>
            </div>

            {/* Main Exam Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Navigator & Legend (4 cols) */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Exam Navigator</h3>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{answeredCount} / {questions.length} Answered</span>
                    </div>

                    {/* Question Palette Grid */}
                    <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
                        {questions.map((q, idx) => {
                            const ans = answers.find(a => a.questionId === q._id);
                            let isAnswered = false;
                            if (ans) {
                                if (q.type === 'short_answer' || q.type === 'long_answer' || q.type === 'fill_blank') {
                                    isAnswered = !!(ans.textAnswer && ans.textAnswer.trim().length > 0);
                                } else if (q.type === 'multiple_select') {
                                    isAnswered = !!(Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0);
                                } else {
                                    isAnswered = ans.selectedOption !== null && ans.selectedOption !== undefined;
                                }
                            }
                            const isFlagged = flaggedQuestions.includes(q._id.toString());
                            const isCurrent = idx === currentIdx;

                            return (
                                <button
                                    key={q._id}
                                    type="button"
                                    onClick={() => setCurrentIdx(idx)}
                                    className={`relative aspect-square rounded-2xl font-black text-xs transition-all flex flex-col items-center justify-center gap-0.5 border ${
                                        isCurrent 
                                            ? 'ring-2 ring-pink-500 border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400 shadow-md' 
                                            : isAnswered 
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                                                : isFlagged 
                                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
                                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                    }`}
                                >
                                    <span>{idx + 1}</span>
                                    {isFlagged && (
                                        <Flag className="w-2.5 h-2.5 text-amber-500 fill-amber-500 absolute top-1 right-1" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span>Answered ({answeredCount})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <span>Flagged ({flaggedCount})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <span>Pending ({unansweredCount})</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Question Statement & Interactive Inputs (8 cols) */}
                {currentQuestion && (
                    <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                        {/* Question Prompt Header */}
                        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {currentQuestion.type.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className="text-xs font-bold text-pink-500">
                                    {currentQuestion.marks} {currentQuestion.marks === 1 ? 'Mark' : 'Marks'}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => toggleFlagQuestion(currentQuestion._id.toString())}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                    flaggedQuestions.includes(currentQuestion._id.toString())
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <Flag className={`w-3.5 h-3.5 ${flaggedQuestions.includes(currentQuestion._id.toString()) ? 'fill-amber-500' : ''}`} />
                                {flaggedQuestions.includes(currentQuestion._id.toString()) ? 'Flagged for Review' : 'Flag Question'}
                            </button>
                        </div>

                        {/* Optional Diagram / Image */}
                        {currentQuestion.imageUrl && (
                            <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                <img src={currentQuestion.imageUrl} alt="Exam Question Graphic" className="max-h-64 rounded-xl object-contain mx-auto" />
                            </div>
                        )}

                        {/* Question Statement */}
                        <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                            {currentQuestion.questionText}
                        </div>

                        {/* Response Input Interface */}
                        <div className="space-y-3 pt-2">
                            {/* 1. Single Choice MCQ */}
                            {currentQuestion.type === 'mcq' && currentQuestion.options.map((opt, oIdx) => {
                                const selected = answers.find(a => a.questionId === currentQuestion._id)?.selectedOption === oIdx;
                                return (
                                    <label
                                        key={oIdx}
                                        onClick={() => handleMCQChange(currentQuestion._id, oIdx)}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                                            selected 
                                                ? 'border-pink-500 bg-pink-500/5 ring-1 ring-pink-500/20' 
                                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${selected ? 'border-pink-500 bg-pink-600 text-white' : 'border-slate-400'}`}>
                                            {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 select-none">{opt.text}</span>
                                    </label>
                                );
                            })}

                            {/* 2. Multiple Select (Checkboxes) */}
                            {currentQuestion.type === 'multiple_select' && (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-indigo-500 mb-2">Select all options that apply:</p>
                                    {currentQuestion.options.map((opt, oIdx) => {
                                        const currentAns = answers.find(a => a.questionId === currentQuestion._id);
                                        const isChecked = Array.isArray(currentAns?.selectedOptions) && currentAns.selectedOptions.includes(oIdx);
                                        return (
                                            <label
                                                key={oIdx}
                                                onClick={() => handleMultipleSelectChange(currentQuestion._id, oIdx)}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                                                    isChecked 
                                                        ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20' 
                                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${isChecked ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-400'}`}>
                                                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                </div>
                                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 select-none">{opt.text}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 3. True / False */}
                            {currentQuestion.type === 'true_false' && (
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'True', val: 0 },
                                        { label: 'False', val: 1 }
                                    ].map(item => {
                                        const selected = answers.find(a => a.questionId === currentQuestion._id)?.selectedOption === item.val;
                                        return (
                                            <button
                                                key={item.val}
                                                type="button"
                                                onClick={() => handleMCQChange(currentQuestion._id, item.val)}
                                                className={`p-4 rounded-2xl font-black text-sm border flex items-center justify-center gap-2 transition-all ${
                                                    selected 
                                                        ? 'bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-600/20' 
                                                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                                }`}
                                            >
                                                {selected && <CheckCircle2 className="w-4 h-4" />}
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 4. Fill in the Blank */}
                            {currentQuestion.type === 'fill_blank' && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500">Your Answer (Type the missing word / phrase):</label>
                                    <input
                                        type="text"
                                        value={answers.find(a => a.questionId === currentQuestion._id)?.textAnswer || ''}
                                        onChange={(e) => handleTextAnswerChange(currentQuestion._id, e.target.value)}
                                        placeholder="Type your response here..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-900 dark:text-white font-medium"
                                    />
                                </div>
                            )}

                            {/* 5 & 6. Short / Long Subjective Answer */}
                            {(currentQuestion.type === 'short_answer' || currentQuestion.type === 'long_answer') && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500">
                                        Your Written Response ({currentQuestion.type === 'long_answer' ? 'Extended Essay / Detailed Solution' : 'Short Answer'}):
                                    </label>
                                    <textarea
                                        value={answers.find(a => a.questionId === currentQuestion._id)?.textAnswer || ''}
                                        onChange={(e) => handleTextAnswerChange(currentQuestion._id, e.target.value)}
                                        placeholder="Type your explanation, reasoning, or full solution..."
                                        className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none resize-y text-slate-900 dark:text-white font-medium ${currentQuestion.type === 'long_answer' ? 'min-h-[220px]' : 'min-h-[140px]'}`}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Navigation Footer */}
                        <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                                disabled={currentIdx === 0}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs disabled:opacity-30 transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                <ChevronLeft className="w-4 h-4" /> Previous
                            </button>

                            {currentIdx < questions.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs transition-all shadow-sm hover:opacity-90"
                                >
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setStage('confirm_submit')}
                                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-black text-xs transition-all shadow-lg shadow-pink-600/25"
                                >
                                    Review & Submit <Send className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================== */}
            {/* STAGE 3: SUBMISSION CONFIRMATION MODAL    */}
            {/* ========================================== */}
            {stage === 'confirm_submit' && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-scaleUp">
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center mx-auto border border-pink-500/20">
                                <Send className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Ready to finalize your assessment?</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Review your progress below before submitting.</p>
                        </div>

                        {/* Breakdown Metrics */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                            <div className="flex justify-between font-bold">
                                <span className="text-slate-500">Answered Questions:</span>
                                <span className="text-emerald-500 font-black">{answeredCount} of {questions.length}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span className="text-slate-500">Unanswered Questions:</span>
                                <span className="text-amber-500 font-black">{unansweredCount}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span className="text-slate-500">Flagged for Review:</span>
                                <span className="text-pink-500 font-black">{flaggedCount}</span>
                            </div>
                        </div>

                        {unansweredCount > 0 && (
                            <p className="text-[11px] text-amber-500 font-medium text-center">
                                Notice: You have {unansweredCount} unanswered questions remaining.
                            </p>
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setStage('in_exam')}
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                            >
                                Continue Exam
                            </button>
                            <button
                                type="button"
                                onClick={() => submitFinalExam(false)}
                                disabled={submitting}
                                className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs rounded-xl transition-all shadow-lg shadow-pink-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader className="w-4 h-4 animate-spin" /> : "Submit Assessment"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttemptQuiz;
