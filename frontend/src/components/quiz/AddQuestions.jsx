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
    Award,
    Database,
    Search,
    Filter,
    Image,
    X,
    Check
} from 'lucide-react';

const AddQuestions = ({ quiz, onBack, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    // Question Bank Drawer State
    const [showBankModal, setShowBankModal] = useState(false);
    const [bankQuestions, setBankQuestions] = useState([]);
    const [bankLoading, setBankLoading] = useState(false);
    const [bankSearch, setBankSearch] = useState('');
    const [bankTopicFilter, setBankTopicFilter] = useState('All');
    const [bankTypeFilter, setBankTypeFilter] = useState('All');
    const [selectedBankIds, setSelectedBankIds] = useState([]);
    const [bankTopics, setBankTopics] = useState(['All']);

    // AI Generation States
    const [aiNotes, setAiNotes] = useState('');
    const [aiCount, setAiCount] = useState(5);
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
            explanation: '',
            imageUrl: '',
            isBankQuestion: false
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
                        explanation: q.explanation || '',
                        imageUrl: q.imageUrl || '',
                        isBankQuestion: !!q.isBankQuestion
                    })));
                }
            } catch (err) {
                console.error("Failed to load existing questions:", err);
            }
        };
        loadQuestions();
    }, [quiz._id]);

    // Load Question Bank items
    const fetchQuestionBank = async () => {
        setBankLoading(true);
        try {
            const queryParams = new URLSearchParams({
                roomId: quiz.roomId || '',
                topic: bankTopicFilter,
                type: bankTypeFilter,
                search: bankSearch
            });
            const res = await fetch(`${API_BASE_URL}/api/quiz/bank/questions?${queryParams.toString()}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setBankQuestions(data.questions || []);
                if (Array.isArray(data.topics)) setBankTopics(data.topics);
            }
        } catch (err) {
            console.error("Failed to fetch Question Bank:", err);
        } finally {
            setBankLoading(false);
        }
    };

    useEffect(() => {
        if (showBankModal) {
            fetchQuestionBank();
        }
    }, [showBankModal, bankTopicFilter, bankTypeFilter]);

    const handleAddQuestion = (type = 'mcq') => {
        let defaultOptions = [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
        let defaultCorrectAnswer = 0;
        let defaultMarks = 2;

        if (type === 'true_false') {
            defaultOptions = [{ text: 'True' }, { text: 'False' }];
            defaultCorrectAnswer = 0;
            defaultMarks = 1;
        } else if (type === 'multiple_select') {
            defaultCorrectAnswer = [0];
            defaultMarks = 3;
        } else if (type === 'fill_blank') {
            defaultOptions = [];
            defaultCorrectAnswer = '';
            defaultMarks = 2;
        } else if (type === 'short_answer') {
            defaultOptions = [];
            defaultCorrectAnswer = '';
            defaultMarks = 5;
        } else if (type === 'long_answer') {
            defaultOptions = [];
            defaultCorrectAnswer = '';
            defaultMarks = 10;
        }

        setQuestions([
            ...questions,
            {
                type,
                questionText: '',
                options: defaultOptions,
                correctAnswer: defaultCorrectAnswer,
                referenceAnswer: '',
                marks: defaultMarks,
                difficulty: 'medium',
                explanation: '',
                imageUrl: '',
                isBankQuestion: false
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
            } else if (val === 'fill_blank') {
                newQs[idx].options = [];
                newQs[idx].correctAnswer = '';
            } else if (val === 'short_answer' || val === 'long_answer') {
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
        if (newQs[qIdx].type === 'mcq' && newQs[qIdx].correctAnswer >= newQs[qIdx].options.length) {
            newQs[qIdx].correctAnswer = 0;
        }
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
                return `Question #${i + 1}: Question prompt cannot be empty.`;
            }
            if (q.marks <= 0) {
                return `Question #${i + 1}: Marks must be greater than 0.`;
            }
            if (q.type === 'mcq' || q.type === 'multiple_select') {
                if (q.options.some(opt => !opt.text || !opt.text.trim())) {
                    return `Question #${i + 1}: All option fields must have text.`;
                }
            }
            if (q.type === 'multiple_select') {
                if (!Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0) {
                    return `Question #${i + 1}: Please select at least one correct option for Multiple Select.`;
                }
            }
            if (q.type === 'fill_blank') {
                if (!q.correctAnswer || (typeof q.correctAnswer === 'string' && !q.correctAnswer.trim())) {
                    return `Question #${i + 1}: Fill in the Blank requires a correct expected word/phrase.`;
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

    // Import questions from Question Bank into current quiz state
    const handleImportSelectedFromBank = () => {
        const selected = bankQuestions.filter(bq => selectedBankIds.includes(bq._id));
        if (selected.length === 0) return;

        const imported = selected.map(bq => ({
            type: bq.type,
            questionText: bq.questionText,
            options: Array.isArray(bq.options) ? bq.options : [],
            correctAnswer: bq.correctAnswer,
            referenceAnswer: bq.referenceAnswer || '',
            marks: bq.marks || 2,
            difficulty: bq.difficulty || 'medium',
            explanation: bq.explanation || '',
            imageUrl: bq.imageUrl || '',
            isBankQuestion: true
        }));

        setQuestions(prev => [...prev, ...imported]);
        setSelectedBankIds([]);
        setShowBankModal(false);
    };

    // AI Generation Handler
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
                const generated = data.questions.map((q) => ({
                    type: q.type || 'mcq',
                    questionText: q.questionText || '',
                    options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : [{ text: 'Option A' }, { text: 'Option B' }],
                    correctAnswer: Number.isFinite(Number(q.correctAnswer)) ? Number(q.correctAnswer) : 0,
                    referenceAnswer: q.referenceAnswer || '',
                    marks: Number(q.marks) || 2,
                    difficulty: q.difficulty || 'medium',
                    explanation: q.explanation || '',
                    imageUrl: '',
                    isBankQuestion: false
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

    // Live Metrics Summary Bar
    const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    const mcqCount = questions.filter(q => q.type === 'mcq').length;
    const msCount = questions.filter(q => q.type === 'multiple_select').length;
    const tfCount = questions.filter(q => q.type === 'true_false').length;
    const fbCount = questions.filter(q => q.type === 'fill_blank').length;
    const saCount = questions.filter(q => q.type === 'short_answer').length;
    const laCount = questions.filter(q => q.type === 'long_answer').length;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fadeIn">
            {/* Top Header & Toolbar */}
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
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Topic: <span className="font-bold text-slate-700 dark:text-slate-300">{quiz.topic || 'General'}</span> • Time Limit: <span className="font-bold text-slate-700 dark:text-slate-300">{quiz.timeLimit}m</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Question Bank Action Button */}
                    <button
                        type="button"
                        onClick={() => setShowBankModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-500/20 transition-all shadow-sm"
                    >
                        <Database className="w-4 h-4" />
                        <span>Question Bank</span>
                    </button>

                    {/* Preview Mode */}
                    <button
                        type="button"
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${isPreviewMode ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        <Eye className="w-4 h-4" />
                        {isPreviewMode ? 'Exit Preview' : 'Preview'}
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

            {/* Metrics Breakdown Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Qs</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{questions.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-pink-500">Total Marks</p>
                    <p className="text-xl font-black text-pink-600 dark:text-pink-400 mt-0.5">{totalMarks}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">MCQ</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{mcqCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Multi-Select</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{msCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">True/False</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{tfCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-purple-500">Fill Blank</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{fbCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Subjective</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{saCount + laCount}</p>
                </div>
            </div>

            {/* AI Generator Panel */}
            <div className="bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border border-indigo-500/20 rounded-3xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">AI Question Synthesis (NVIDIA NIM Engine)</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Paste lecture notes, syllabus concepts, or textbook passages to automatically synthesize questions.</p>
                
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

            {/* Preview Simulation Mode */}
            {isPreviewMode ? (
                <div className="space-y-4">
                    <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                        <Eye className="w-4 h-4" /> This is a student simulation preview. Correct answers and teacher rubrics are omitted in the live exam.
                    </div>
                    {questions.map((q, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-pink-500">Question {idx + 1} ({q.marks} Marks)</span>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{q.type.replace('_', ' ').toUpperCase()}</span>
                            </div>

                            {q.imageUrl && (
                                <img src={q.imageUrl} alt="Diagram" className="max-h-48 rounded-xl object-contain border border-slate-200 dark:border-slate-800" />
                            )}

                            <p className="text-base font-bold text-slate-900 dark:text-white">{q.questionText || 'Untitled Question'}</p>

                            {q.type === 'mcq' && (
                                <div className="space-y-2">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200">
                                            <Radio className="w-4 h-4 text-slate-400" />
                                            <span>{opt.text || `Option ${oIdx + 1}`}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {q.type === 'multiple_select' && (
                                <div className="space-y-2">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200">
                                            <CheckSquare className="w-4 h-4 text-slate-400" />
                                            <span>{opt.text || `Option ${oIdx + 1}`}</span>
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

                            {q.type === 'fill_blank' && (
                                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400 italic">
                                    Student text input for blank placeholder...
                                </div>
                            )}

                            {(q.type === 'short_answer' || q.type === 'long_answer') && (
                                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-400 italic">
                                    Student response textarea placeholder ({q.type === 'long_answer' ? 'Extended Essay' : 'Short Answer'})...
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                /* Question Editor Cards */
                <div className="space-y-6">
                    {questions.map((q, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-4">
                            {/* Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
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
                                        <option value="fill_blank">Fill in the Blank</option>
                                        <option value="short_answer">Short Answer (Subjective)</option>
                                        <option value="long_answer">Long Answer / Essay</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
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
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Question Statement *</label>
                                <textarea
                                    value={q.questionText}
                                    onChange={(e) => handleChange(idx, 'questionText', e.target.value)}
                                    placeholder="Enter your question statement clearly..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none h-20 resize-none text-slate-900 dark:text-white font-medium"
                                />
                            </div>

                            {/* Optional Image URL */}
                            <div className="flex items-center gap-2">
                                <Image className="w-4 h-4 text-slate-400 shrink-0" />
                                <input
                                    type="url"
                                    value={q.imageUrl || ''}
                                    onChange={(e) => handleChange(idx, 'imageUrl', e.target.value)}
                                    placeholder="Optional diagram / image URL (https://...)"
                                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            {/* Question Type Specific Editor */}
                            {/* 1. MCQ */}
                            {q.type === 'mcq' && (
                                <div className="space-y-2.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Options (Select radio button for single correct answer)
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
                                        className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 mt-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Another Option
                                    </button>
                                </div>
                            )}

                            {/* 2. Multiple Select */}
                            {q.type === 'multiple_select' && (
                                <div className="space-y-2.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Options (Check all boxes that apply as correct answers)
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
                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Another Option
                                    </button>
                                </div>
                            )}

                            {/* 3. True / False */}
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

                            {/* 4. Fill in the Blank */}
                            {q.type === 'fill_blank' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Expected Correct Answer * (Auto-graded case-insensitively)
                                    </label>
                                    <input
                                        type="text"
                                        value={q.correctAnswer || ''}
                                        onChange={(e) => handleChange(idx, 'correctAnswer', e.target.value)}
                                        placeholder="e.g. Mitochondria"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-900 dark:text-white font-medium"
                                    />
                                </div>
                            )}

                            {/* 5 & 6. Short / Long Answer */}
                            {(q.type === 'short_answer' || q.type === 'long_answer') && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Reference Rubric / Model Answer (For Teacher Review Only)
                                    </label>
                                    <textarea
                                        value={q.referenceAnswer}
                                        onChange={(e) => handleChange(idx, 'referenceAnswer', e.target.value)}
                                        placeholder="Outline expected key points, criteria, or concepts for grading..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none h-20 resize-none text-slate-900 dark:text-white font-medium"
                                    />
                                </div>
                            )}

                            {/* Explanation / Solution Breakdown */}
                            <div className="pt-2">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Explanation / Solution Breakdown (Shown to students in review mode)
                                </label>
                                <input
                                    type="text"
                                    value={q.explanation || ''}
                                    onChange={(e) => handleChange(idx, 'explanation', e.target.value)}
                                    placeholder="Optional educational explanation or rationale..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            {/* Question Bank Save Checkbox */}
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                                <input
                                    type="checkbox"
                                    id={`bank_save_${idx}`}
                                    checked={q.isBankQuestion || false}
                                    onChange={(e) => handleChange(idx, 'isBankQuestion', e.target.checked)}
                                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                                />
                                <label htmlFor={`bank_save_${idx}`} className="cursor-pointer select-none font-medium">
                                    Save this question to classroom Question Bank for future reuse
                                </label>
                            </div>
                        </div>
                    ))}

                    {/* Add Question Button Bar */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 p-4 bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl">
                        <span className="text-xs font-bold text-slate-500">+ Add Question:</span>
                        <button
                            type="button"
                            onClick={() => handleAddQuestion('mcq')}
                            className="px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:border-pink-500/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                        >
                            Single Choice (MCQ)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddQuestion('multiple_select')}
                            className="px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:border-indigo-500/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                        >
                            Multiple Select
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddQuestion('true_false')}
                            className="px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:border-emerald-500/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                        >
                            True / False
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddQuestion('fill_blank')}
                            className="px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:border-purple-500/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                        >
                            Fill in Blank
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddQuestion('short_answer')}
                            className="px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:border-amber-500/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                        >
                            Short Answer
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddQuestion('long_answer')}
                            className="px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:border-rose-500/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                        >
                            Long Essay
                        </button>
                    </div>

                    {/* Bottom Save Bar */}
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

            {/* ========================================================================= */}
            {/* QUESTION BANK MODAL / DRAWER                                              */}
            {/* ========================================================================= */}
            {showBankModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <Database className="w-5 h-5 text-indigo-500" />
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Question Bank Repository</h3>
                                    <p className="text-xs text-slate-400">Search and import previously saved questions into this assessment.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowBankModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search & Topic Filters */}
                        <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                <Search className="w-4 h-4 text-slate-400 ml-1" />
                                <input
                                    type="text"
                                    placeholder="Search by keywords..."
                                    value={bankSearch}
                                    onChange={(e) => setBankSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchQuestionBank()}
                                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none font-medium"
                                />
                            </div>

                            <select
                                value={bankTopicFilter}
                                onChange={(e) => setBankTopicFilter(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none"
                            >
                                {bankTopics.map(t => (
                                    <option key={t} value={t}>{t === 'All' ? 'All Topics' : t}</option>
                                ))}
                            </select>

                            <select
                                value={bankTypeFilter}
                                onChange={(e) => setBankTypeFilter(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none"
                            >
                                <option value="All">All Types</option>
                                <option value="mcq">MCQ</option>
                                <option value="multiple_select">Multiple Select</option>
                                <option value="true_false">True / False</option>
                                <option value="fill_blank">Fill in Blank</option>
                                <option value="short_answer">Short Answer</option>
                                <option value="long_answer">Long Essay</option>
                            </select>
                        </div>

                        {/* Questions List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 min-h-[250px]">
                            {bankLoading ? (
                                <div className="h-40 flex items-center justify-center">
                                    <Loader className="w-6 h-6 animate-spin text-indigo-500" />
                                </div>
                            ) : bankQuestions.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 space-y-2">
                                    <Database className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                                    <p className="text-xs font-bold">No bank questions match your search.</p>
                                    <p className="text-[11px]">Save questions to your Question Bank to build your reusable repository.</p>
                                </div>
                            ) : (
                                bankQuestions.map(bq => {
                                    const isSelected = selectedBankIds.includes(bq._id);
                                    return (
                                        <div
                                            key={bq._id}
                                            onClick={() => {
                                                if (isSelected) setSelectedBankIds(selectedBankIds.filter(id => id !== bq._id));
                                                else setSelectedBankIds([...selectedBankIds, bq._id]);
                                            }}
                                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                                                isSelected 
                                                    ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20' 
                                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-400'}`}>
                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                                                        {bq.type.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {bq.marks} pts • {bq.topic || 'General'}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed line-clamp-2">
                                                    {bq.questionText}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-500">
                                {selectedBankIds.length} question{selectedBankIds.length !== 1 ? 's' : ''} selected
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowBankModal(false)}
                                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={selectedBankIds.length === 0}
                                    onClick={handleImportSelectedFromBank}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-40"
                                >
                                    Import Selected ({selectedBankIds.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddQuestions;
