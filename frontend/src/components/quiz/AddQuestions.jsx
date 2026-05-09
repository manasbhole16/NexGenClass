import React, { useState } from 'react';
import API_BASE_URL from '../../apiConfig';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle2, Globe, Lock, Sparkles, Loader } from 'lucide-react';

const AddQuestions = ({ quiz, onBack, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);
    const [aiNotes, setAiNotes] = useState('');
    const [aiCount, setAiCount] = useState(6);
    const [aiDifficulty, setAiDifficulty] = useState('50/30/20');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [questions, setQuestions] = useState([
        { questionText: '', options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }], correctAnswer: 0, marks: 1, difficulty: 'medium', explanation: '' }
    ]);
    const [isPublished, setIsPublished] = useState(quiz.isPublished);

    const handleAddQuestion = () => {
        setQuestions([...questions, { questionText: '', options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }], correctAnswer: 0, marks: 1, difficulty: 'medium', explanation: '' }]);
    };

    const handleRemoveQuestion = (idx) => {
        const newQs = [...questions];
        newQs.splice(idx, 1);
        setQuestions(newQs);
    };

    const handleChange = (idx, field, val) => {
        const newQs = [...questions];
        newQs[idx][field] = val;
        setQuestions(newQs);
    };

    const handleOptionChange = (qIdx, optIdx, val) => {
        const newQs = [...questions];
        newQs[qIdx].options[optIdx].text = val;
        setQuestions(newQs);
    };

    const parseDifficultyMix = () => {
        if (aiDifficulty === '50/30/20') return { easy: 50, medium: 30, hard: 20 };
        if (aiDifficulty === '40/40/20') return { easy: 40, medium: 40, hard: 20 };
        if (aiDifficulty === '30/40/30') return { easy: 30, medium: 40, hard: 30 };
        return { easy: 50, medium: 30, hard: 20 };
    };

    const handleGenerate = async () => {
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
                    difficultyMix: parseDifficultyMix()
                }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                const nextQuestions = data.questions.map((q) => ({
                    questionText: q.questionText || '',
                    options: Array.isArray(q.options) ? q.options : [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
                    correctAnswer: Number.isFinite(Number(q.correctAnswer)) ? Number(q.correctAnswer) : 0,
                    marks: Number.isFinite(Number(q.marks)) ? Number(q.marks) : 1,
                    difficulty: q.difficulty || 'medium',
                    explanation: q.explanation || ''
                }));
                setQuestions(nextQuestions.length ? nextQuestions : questions);
            } else {
                setAiError(data.message || 'AI generation failed');
            }
        } catch (e) {
            setAiError('AI generation failed');
            console.error(e);
        } finally {
            setAiLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert("Questions saved successfully!");
                onSuccess();
            } else alert(data.message);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const togglePublish = async () => {
        try {
            setPublishLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}/publish`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) setIsPublished(data.quiz.isPublished);
        } catch (e) {
            console.error(e);
        } finally {
            setPublishLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white">Edit Questions: {quiz.title}</h2>
                        <p className="text-xs text-gray-400">Total Marks: {quiz.totalMarks} | Time: {quiz.timeLimit}m</p>
                    </div>
                </div>
                <button
                    onClick={togglePublish}
                    disabled={publishLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isPublished ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-gray-700/50 text-gray-300'}`}
                >
                    {isPublished ? <><Globe className="w-4 h-4" /> Published</> : <><Lock className="w-4 h-4" /> Draft</>}
                </button>
            </div>

            <div className="space-y-6 h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-2">
                <div className="bg-black/20 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Generate from notes</h3>
                            <p className="text-xs text-gray-400">Paste lesson text and generate questions with explanations.</p>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={aiLoading || !aiNotes.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold transition-all disabled:opacity-50"
                        >
                            {aiLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Generate
                        </button>
                    </div>
                    <textarea
                        value={aiNotes}
                        onChange={(e) => setAiNotes(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-pink-500 outline-none h-28 resize-none"
                        placeholder="Paste lesson notes or topic summary..."
                    />
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider font-bold">Question count</label>
                            <input
                                type="number"
                                min="1"
                                value={aiCount}
                                onChange={(e) => setAiCount(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-pink-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider font-bold">Difficulty mix</label>
                            <select
                                value={aiDifficulty}
                                onChange={(e) => setAiDifficulty(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-pink-500 outline-none"
                            >
                                <option value="50/30/20">50% easy / 30% medium / 20% hard</option>
                                <option value="40/40/20">40% easy / 40% medium / 20% hard</option>
                                <option value="30/40/30">30% easy / 40% medium / 30% hard</option>
                            </select>
                        </div>
                    </div>
                    {aiError && <p className="mt-3 text-xs text-red-400">{aiError}</p>}
                </div>

                {questions.map((q, qIdx) => (
                    <div key={qIdx} className="bg-black/20 border border-white/5 rounded-2xl p-6 relative group">
                        <button onClick={() => handleRemoveQuestion(qIdx)} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <div className="mb-4 pr-8">
                            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider font-bold">Question {qIdx + 1}</label>
                            <input
                                type="text"
                                value={q.questionText}
                                onChange={e => handleChange(qIdx, 'questionText', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-pink-500 outline-none"
                                placeholder={`Enter question ${qIdx + 1}...`}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider font-bold">Marks</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={q.marks}
                                    onChange={e => handleChange(qIdx, 'marks', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-pink-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider font-bold">Difficulty</label>
                                <select
                                    value={q.difficulty || 'medium'}
                                    onChange={e => handleChange(qIdx, 'difficulty', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-pink-500 outline-none"
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className={`flex items-center gap-3 p-2 rounded-xl border ${q.correctAnswer === optIdx ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                                    <button
                                        onClick={() => handleChange(qIdx, 'correctAnswer', optIdx)}
                                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${q.correctAnswer === optIdx ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-500 hover:border-gray-400'}`}
                                    >
                                        {q.correctAnswer === optIdx && <CheckCircle2 className="w-4 h-4" />}
                                    </button>
                                    <input
                                        type="text"
                                        value={opt.text}
                                        onChange={e => handleOptionChange(qIdx, optIdx, e.target.value)}
                                        className="w-full bg-transparent outline-none text-sm"
                                        placeholder={`Option ${optIdx + 1}`}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="mt-4">
                            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider font-bold">Answer explanation</label>
                            <textarea
                                value={q.explanation || ''}
                                onChange={e => handleChange(qIdx, 'explanation', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-pink-500 outline-none h-20 resize-none"
                                placeholder="Explain why the answer is correct..."
                            />
                        </div>
                    </div>
                ))}

                <button onClick={handleAddQuestion} className="w-full py-4 border-2 border-dashed border-white/10 text-gray-400 hover:text-white hover:border-white/30 rounded-2xl flex items-center justify-center gap-2 transition-all">
                    <Plus className="w-5 h-5" /> Add Another Question
                </button>
            </div>

            <div className="flex justify-end gap-4 border-t border-white/10 pt-4 mt-auto">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(219,39,119,0.3)] disabled:opacity-50"
                >
                    <Save className="w-4 h-4" /> Save Questions
                </button>
            </div>
        </div>
    );
};

export default AddQuestions;
