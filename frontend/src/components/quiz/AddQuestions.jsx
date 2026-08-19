import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import { 
    ArrowLeft, 
    Save, 
    Plus, 
    Trash2, 
    Copy, 
    ArrowUp, 
    ArrowDown, 
    CheckCircle2, 
    Sparkles, 
    Loader, 
    Eye, 
    AlertTriangle, 
    HelpCircle, 
    CheckSquare, 
    Radio, 
    FileText, 
    Layers,
    Award
} from 'lucide-react';

const AddQuestions = ({ quiz, onBack, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    // AI Generation States
    const [aiNotes, setAiNotes] = useState('');
    const [aiCount, setAiCount] = useState(5);
    const [aiDifficulty, setAiDifficulty] = useState('50/30/20');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);

    const [questions, setQuestions] = useState([
        { 
            type: 'mcq', 
            questionText: '', 
            options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }], 
            correctAnswer: 0, 
            referenceAnswer: '', 
            marks: 2, 
            difficulty: 'medium', 
            explanation: '' 
        }
    ]);

    const [isPublished, setIsPublished] = useState(quiz.isPublished || false);

    // Fetch existing questions on mount if editing
    useEffect(() => {
        const loadQuestions = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}`, { credentials: 'include' });
                const data = await res.json();
                if (data.success && data.questions && data.questions.length > 0) {
                    setQuestions(data.questions.map((q, idx) => ({
                        _id: q._id,
                        type: q.type || 'mcq',
                        questionText: q.questionText || '',
                        options: Array.isArray(q.options) && q.options.length > 0 ? q.options : [{ text: '' }, { text: '' }],
                        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : (q.type === 'multiple_select' ? [0] : 0),
                        referenceAnswer: q.referenceAnswer || '',
                        marks: Number(q.marks) || 1,
                        order: q.order !== undefined ? q.order : idx,
                        difficulty: q.difficulty || 'medium',
                        explanation: q.explanation || ''
                    })));
                }
            } catch (err) {
                console.error("Failed to load existing questions:", err);
            }
        };
        loadQuestions();
    }, [quiz._id]);

    const handleAddQuestion = (type = 'mcq') => {
        let defaultOptions = [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
        let defaultCorrectAnswer = 0;

        if (type === 'true_false') {
            defaultOptions = [{ text: 'True' }, { text: 'False' }];
            defaultCorrectAnswer = 0;
        } else if (type === 'multiple_select') {
            defaultCorrectAnswer = [0];
        } else if (type === 'short_answer') {
            defaultOptions = [];
            defaultCorrectAnswer = '';
        }

        setQuestions([
            ...questions,
            {
                type,
                questionText: '',
                options: defaultOptions,
                correctAnswer: defaultCorrectAnswer,
                referenceAnswer: '',
                marks: type === 'short_answer' ? 5 : 2,
                difficulty: 'medium',
                explanation: ''
            }
        ]);
    };

    const handleDuplicateQuestion = (idx) => {
        const target = questions[idx];
        const clone = JSON.parse(JSON.stringify(target));
        delete clone._id;
        clone.questionText = `${clone.questionText} (Copy)`;
        const newQs = [...questions];
        newQs.splice(idx + 1, 0, clone);
        setQuestions(newQs);
    };

    const handleRemoveQuestion = (idx) => {
        if (questions.length <= 1) {
            alert("A quiz must have at least one question.");
            return;
        }
        const newQs = [...questions];
        newQs.splice(idx, 1);
        setQuestions(newQs);
    };

    const handleMoveQuestion = (idx, direction) => {
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= questions.length) return;
        const newQs = [...questions];
        const temp = newQs[idx];
        newQs[idx] = newQs[targetIdx];
        newQs[targetIdx] = temp;
        setQuestions(newQs);
    };

    const handleChange = (idx, field, val) => {
        const newQs = [...questions];
        newQs[idx][field] = val;

        if (field === 'type') {
            if (val === 'true_false') {
                newQs[idx].options = [{ text: 'True' }, { text: 'False' }];
                newQs[idx].correctAnswer = 0;
            } else if (val === 'mcq') {
                newQs[idx].options = [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
                newQs[idx].correctAnswer = 0;
            } else if (val === 'multiple_select') {
                newQs[idx].options = [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
                newQs[idx].correctAnswer = [0];
            } else if (val === 'short_answer') {
                newQs[idx].options = [];
                newQs[idx].correctAnswer = '';
            }
        }

        setQuestions(newQs);
    };

    const handleOptionChange = (qIdx, optIdx, val) => {
        const newQs = [...questions];
        newQs[qIdx].options[optIdx].text = val;
        setQuestions(newQs);
    };

    const handleAddOption = (qIdx) => {
        const newQs = [...questions];
        newQs[qIdx].options.push({ text: '' });
        setQuestions(newQs);
    };

    const handleRemoveOption = (qIdx, optIdx) => {
        const newQs = [...questions];
        if (newQs[qIdx].options.length <= 2) {
            alert("At least 2 options are required.");
            return;
        }
        newQs[qIdx].options.splice(optIdx, 1);
        // Fix single correct answer bounds
        if (newQs[qIdx].type === 'mcq' && newQs[qIdx].correctAnswer >= newQs[qIdx].options.length) {
            newQs[qIdx].correctAnswer = 0;
        }
        // Fix multiple select bounds
        if (newQs[qIdx].type === 'multiple_select') {
            newQs[qIdx].correctAnswer = (newQs[qIdx].correctAnswer || []).filter(c => c < newQs[qIdx].options.length);
            if (newQs[qIdx].correctAnswer.length === 0) newQs[qIdx].correctAnswer = [0];
        }
        setQuestions(newQs);
    };

    const handleMultipleSelectToggle = (qIdx, optIdx) => {
        const newQs = [...questions];
        let current = Array.isArray(newQs[qIdx].correctAnswer) ? [...newQs[qIdx].correctAnswer] : [];
        if (current.includes(optIdx)) {
            current = current.filter(i => i !== optIdx);
        } else {
            current.push(optIdx);
        }
        newQs[qIdx].correctAnswer = current;
        setQuestions(newQs);
    };

    const validateQuestions = () => {
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.questionText || !q.questionText.trim()) {
                return `Question #${i + 1}: Question text cannot be empty.`;
            }
            if (q.marks <= 0) {
                return `Question #${i + 1}: Marks must be greater than 0.`;
            }
            if (q.type === 'mcq' || q.type === 'multiple_select') {
                if (q.options.some(opt => !opt.text || !opt.text.trim())) {
                    return `Question #${i + 1}: All options must have text.`;
                }
            }
            if (q.type === 'multiple_select') {
                if (!Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0) {
                    return `Question #${i + 1}: Please select at least one correct option for Multiple Select.`;
                }
            }
        }
        return null;
    };

    const handleSave = async (publishImmediately = false) => {
        const error = validateQuestions();
        if (error) {
            alert(error);
            return;
        }

        setLoading(true);
        try {
            const orderedQuestions = questions.map((q, idx) => ({ ...q, order: idx }));

            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions: orderedQuestions }),
                credentials: 'include'
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Failed to save questions.');
                setLoading(false);
                return;
            }

            if (publishImmediately && !isPublished) {
                await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/publish`, {
                    method: 'POST',
                    credentials: 'include'
                });
            }

            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Failed to save questions.');
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePublish = async () => {
        setPublishLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/publish`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setIsPublished(data.quiz.isPublished);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setPublishLoading(false);
        }
    };

    const handleGenerateAI = async () => {
        if (!aiNotes.trim()) return;
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notesText: aiNotes,
                    questionCount: aiCount,
                    difficultyMix: { easy: 50, medium: 30, hard: 20 }
                }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success && data.questions) {
                const generated = data.questions.map((q, i) => ({
                    type: q.type || 'mcq',
                    questionText: q.questionText || '',
                    options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : [{ text: 'Option A' }, { text: 'Option B' }],
                    correctAnswer: Number.isFinite(Number(q.correctAnswer)) ? Number(q.correctAnswer) : 0,
                    referenceAnswer: q.referenceAnswer || '',
                    marks: Number(q.marks) || 2,
                    difficulty: q.difficulty || 'medium',
                    explanation: q.explanation || ''
                }));
                setQuestions(prev => [...prev, ...generated]);
                setAiNotes('');
            } else {
                setAiError(data.message || 'AI generation failed');
            }
        } catch (e) {
            setAiError('AI question generation encountered an error.');
            console.error(e);
        } finally {
            setAiLoading(false);
        }
    };

    // Live Statistics Calculations
    const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    const mcqCount = questions.filter(q => q.type === 'mcq').length;
    const msCount = questions.filter(q => q.type === 'multiple_select').length;
    const tfCount = questions.filter(q => q.type === 'true_false').length;
    const saCount = questions.filter(q => q.type === 'short_answer').length;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Top Toolbar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">{quiz.title}</h2>
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isPublished ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                {isPublished ? 'Published' : 'Draft'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Topic: <span className="font-bold text-slate-700 dark:text-slate-300">{quiz.topic || 'General'}</span> • Time Limit: <span className="font-bold text-slate-700 dark:text-slate-300">{quiz.timeLimit}m</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${isPreviewMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        <Eye className="w-4 h-4" />
                        {isPreviewMode ? 'Exit Preview' : 'Student Preview'}
                    </button>

                    <button
                        type="button"
                        onClick={handleTogglePublish}
                        disabled={publishLoading}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${isPublished ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'}`}
                    >
                        {publishLoading ? <Loader className="w-4 h-4 animate-spin" /> : (isPublished ? 'Unpublish' : 'Publish')}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSave(false)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-pink-600/20 disabled:opacity-50"
                    >
                        {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Questions
                    </button>
                </div>
            </div>

            {/* Live Metrics Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Questions</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{questions.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-pink-500">Total Marks</p>
                    <p className="text-xl font-black text-pink-600 dark:text-pink-400 mt-1">{totalMarks}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">MCQ</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{mcqCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Multi-Select</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{msCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">True/False</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{tfCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Short Answer</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{saCount}</p>
                </div>
            </div>

            {/* AI Generator Accordion Panel */}
            <div className="bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border border-indigo-500/20 rounded-3xl p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">AI Question Generator (NVIDIA NIM Engine)</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Paste lecture notes, syllabus concepts, or textbook extracts to automatically synthesize questions.</p>
                
                <textarea
                    value={aiNotes}
                    onChange={(e) => setAiNotes(e.target.value)}
                    placeholder="Paste lecture notes or reference material here..."
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none h-20 resize-none text-slate-900 dark:text-white mb-3"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-bold">Count:</label>
                        <select
                            value={aiCount}
                            onChange={(e) => setAiCount(Number(e.target.value))}
                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                        >
                            <option value={3}>3 Questions</option>
                            <option value={5}>5 Questions</option>
                            <option value={8}>8 Questions</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerateAI}
                        disabled={aiLoading || !aiNotes.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-indigo-600/20"
                    >
                        {aiLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Generate Questions
                    </button>
                </div>
                {aiError && <p className="text-xs text-red-500 font-bold mt-2">{aiError}</p>}
            </div>

            {/* Preview Mode */}
            {isPreviewMode ? (
                <div className="space-y-4">
                    <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                        <Eye className="w-4 h-4" /> This is a student simulation preview. Correct answers and teacher rubrics are omitted in the live exam.
                    </div>
                    {questions.map((q, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-black uppercase text-pink-500">Question {idx + 1} ({q.marks} Marks)</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{q.type.replace('_', ' ').toUpperCase()}</span>
                            </div>
                            <p className="text-base font-bold text-slate-900 dark:text-white mb-4">{q.questionText || 'Untitled Question'}</p>

                            {q.type === 'mcq' && (
                                <div className="space-y-2">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                                            <Radio className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm text-slate-800 dark:text-slate-200">{opt.text || `Option ${oIdx + 1}`}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {q.type === 'multiple_select' && (
                                <div className="space-y-2">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                                            <CheckSquare className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm text-slate-800 dark:text-slate-200">{opt.text || `Option ${oIdx + 1}`}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {q.type === 'true_false' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {['True', 'False'].map((tf, oIdx) => (
                                        <div key={oIdx} className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-bold text-slate-800 dark:text-slate-200">
                                            <Radio className="w-4 h-4 text-slate-400" /> {tf}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {q.type === 'short_answer' && (
                                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-400 italic">
                                    Student response textarea placeholder...
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                /* Question Editor List */
                <div className="space-y-6">
                    {questions.map((q, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700">
                            {/* Question Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 font-black text-sm flex items-center justify-center border border-pink-500/20">
                                        {idx + 1}
                                    </span>
                                    <select
                                        value={q.type}
                                        onChange={(e) => handleChange(idx, 'type', e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                    >
                                        <option value="mcq">Single Choice (MCQ)</option>
                                        <option value="multiple_select">Multiple Select (Checkboxes)</option>
                                        <option value="true_false">True / False</option>
                                        <option value="short_answer">Subjective Short Answer</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {/* Marks */}
                                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1">
                                        <Award className="w-3.5 h-3.5 text-amber-500" />
                                        <input
                                            type="number"
                                            min="1"
                                            value={q.marks}
                                            onChange={(e) => handleChange(idx, 'marks', Math.max(1, Number(e.target.value)))}
                                            className="w-12 bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none text-center"
                                        />
                                        <span className="text-[10px] text-slate-400 uppercase font-bold">pts</span>
                                    </div>

                                    {/* Move Buttons */}
                                    <button
                                        type="button"
                                        onClick={() => handleMoveQuestion(idx, -1)}
                                        disabled={idx === 0}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                                        title="Move Up"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMoveQuestion(idx, 1)}
                                        disabled={idx === questions.length - 1}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                                        title="Move Down"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>

                                    {/* Duplicate */}
                                    <button
                                        type="button"
                                        onClick={() => handleDuplicateQuestion(idx)}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-500"
                                        title="Duplicate Question"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>

                                    {/* Delete */}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveQuestion(idx)}
                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-slate-400 hover:text-red-500"
                                        title="Delete Question"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Question Text */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Question Prompt *</label>
                                <textarea
                                    value={q.questionText}
                                    onChange={(e) => handleChange(idx, 'questionText', e.target.value)}
                                    placeholder="Enter your question statement clearly..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none h-20 resize-none text-slate-900 dark:text-white font-medium"
                                />
                            </div>

                            {/* Question Type Specific Editor */}
                            {q.type === 'mcq' && (
                                <div className="space-y-2.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Options (Select the single radio button representing the correct answer)
                                    </label>
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name={`correct_mcq_${idx}`}
                                                checked={Number(q.correctAnswer) === oIdx}
                                                onChange={() => handleChange(idx, 'correctAnswer', oIdx)}
                                                className="w-5 h-5 accent-pink-600 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={opt.text}
                                                onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                                                placeholder={`Option ${oIdx + 1}`}
                                                className={`flex-1 bg-slate-50 dark:bg-slate-950 border ${Number(q.correctAnswer) === oIdx ? 'border-pink-500/60 ring-1 ring-pink-500/20' : 'border-slate-200 dark:border-slate-800'} rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-900 dark:text-white font-medium`}
                                            />
                                            {q.options.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveOption(idx, oIdx)}
                                                    className="text-slate-400 hover:text-red-500 p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => handleAddOption(idx)}
                                        className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 mt-2"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Another Option
                                    </button>
                                </div>
                            )}

                            {q.type === 'multiple_select' && (
                                <div className="space-y-2.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Options (Check all boxes that apply as correct solutions)
                                    </label>
                                    {q.options.map((opt, oIdx) => {
                                        const isSelected = Array.isArray(q.correctAnswer) && q.correctAnswer.includes(oIdx);
                                        return (
                                            <div key={oIdx} className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleMultipleSelectToggle(idx, oIdx)}
                                                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={opt.text}
                                                    onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                                                    placeholder={`Option ${oIdx + 1}`}
                                                    className={`flex-1 bg-slate-50 dark:bg-slate-950 border ${isSelected ? 'border-indigo-500/60 ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'} rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-900 dark:text-white font-medium`}
                                                />
                                                {q.options.length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveOption(idx, oIdx)}
                                                        className="text-slate-400 hover:text-red-500 p-1"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => handleAddOption(idx)}
                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-2"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Another Option
                                    </button>
                                </div>
                            )}

                            {q.type === 'true_false' && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Select the Correct Stance
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'True', val: 0 },
                                            { label: 'False', val: 1 }
                                        ].map(item => (
                                            <button
                                                key={item.val}
                                                type="button"
                                                onClick={() => handleChange(idx, 'correctAnswer', item.val)}
                                                className={`p-3 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2 transition-all ${Number(q.correctAnswer) === item.val ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-500/20' : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}
                                            >
                                                {Number(q.correctAnswer) === item.val && <CheckCircle2 className="w-4 h-4" />}
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {q.type === 'short_answer' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Reference Solution / Grading Criteria (For Teacher Review Only)
                                    </label>
                                    <textarea
                                        value={q.referenceAnswer}
                                        onChange={(e) => handleChange(idx, 'referenceAnswer', e.target.value)}
                                        placeholder="Outline expected key points, concepts, or formulas for grading..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none h-20 resize-none text-slate-900 dark:text-white font-medium"
                                    />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add Question Button Bar */}
                    <div className="flex flex-wrap items-center justify-center gap-3 p-4 bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl">
                        <span className="text-xs font-bold text-slate-500">+ Add Question:</span>
                        <button
                            type="button"
                            onClick={() => handleAddQuestion('mcq')}
                            className="px-4 py-2 bg-white dark:bg-slate-900 hover:border-pink-500/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                        >
                            Single Choice (MCQ)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddQuestion('multiple_select')}
                            className="px-4 py-2 bg-white dark:bg-slate-900 hover:border-indigo-500/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                        >
                            Multiple Select
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddQuestion('true_false')}
                            className="px-4 py-2 bg-white dark:bg-slate-900 hover:border-emerald-500/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                        >
                            True / False
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddQuestion('short_answer')}
                            className="px-4 py-2 bg-white dark:bg-slate-900 hover:border-amber-500/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                        >
                            Short Answer
                        </button>
                    </div>

                    {/* Bottom Save Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Back to Quizzes
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSave(false)}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50"
                        >
                            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save & Finish
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddQuestions;
