import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import { 
    ArrowLeft, 
    Save, 
    Loader, 
    Layers, 
    Clock, 
    Award, 
    Shuffle, 
    Eye, 
    Calendar, 
    Sparkles, 
    ShieldAlert, 
    Lock, 
    CheckCircle2, 
    HelpCircle 
} from 'lucide-react';

const CreateQuiz = ({ roomId, onBack, onSuccess, initialQuiz = null }) => {
    const [loading, setLoading] = useState(false);
    const [availableTopics, setAvailableTopics] = useState(['General', 'Module 1', 'Module 2', 'Module 3', 'Midterm Prep', 'Final Exam']);
    const [customTopic, setCustomTopic] = useState('');
    const [isCustomTopic, setIsCustomTopic] = useState(false);

    const [formData, setFormData] = useState({
        title: initialQuiz?.title || '',
        description: initialQuiz?.description || '',
        topic: initialQuiz?.topic || 'General',
        timeLimit: initialQuiz?.timeLimit || 15,
        totalMarks: initialQuiz?.totalMarks || 10,
        passingMarks: initialQuiz?.passingMarks || 0,
        startDate: initialQuiz?.startDate ? new Date(initialQuiz.startDate).toISOString().slice(0, 16) : '',
        deadline: initialQuiz?.deadline ? new Date(initialQuiz.deadline).toISOString().slice(0, 16) : new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
        shuffleQuestions: initialQuiz?.shuffleQuestions || false,
        allowedAttempts: initialQuiz?.allowedAttempts || 1,
        showResultsImmediately: initialQuiz?.showResultsImmediately !== undefined ? initialQuiz.showResultsImmediately : true,
        resultVisibility: initialQuiz?.resultVisibility || 'immediate',
        resultReleaseDate: initialQuiz?.resultReleaseDate ? new Date(initialQuiz.resultReleaseDate).toISOString().slice(0, 16) : '',
        safeMode: initialQuiz?.safeMode || false,
        scheduledAt: initialQuiz?.scheduledAt ? new Date(initialQuiz.scheduledAt).toISOString().slice(0, 16) : '',
        isPublished: initialQuiz?.isPublished || false
    });

    useEffect(() => {
        // Fetch existing task/room topics for consistent topic selector
        const fetchTopics = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/tasks?roomId=${roomId}`, { credentials: 'include' });
                const data = await res.json();
                if (data.tasks) {
                    const taskTopics = Array.from(new Set(data.tasks.map(t => t.topic).filter(Boolean)));
                    setAvailableTopics(prev => Array.from(new Set([...prev, ...taskTopics])));
                }
            } catch (err) {
                console.error("Failed to load topics:", err);
            }
        };
        fetchTopics();
    }, [roomId]);

    const handleSubmit = async (e, shouldPublish = false) => {
        e?.preventDefault();
        setLoading(true);

        const finalTopic = isCustomTopic ? (customTopic.trim() || 'General') : formData.topic;

        const payload = {
            ...formData,
            roomId,
            topic: finalTopic,
            isPublished: shouldPublish || formData.isPublished,
            timeLimit: Math.max(1, Number(formData.timeLimit)),
            totalMarks: Math.max(0, Number(formData.totalMarks)),
            passingMarks: Math.max(0, Number(formData.passingMarks)),
            allowedAttempts: Math.max(1, Number(formData.allowedAttempts)),
            startDate: formData.startDate ? new Date(formData.startDate) : null,
            deadline: new Date(formData.deadline),
            resultReleaseDate: formData.resultReleaseDate ? new Date(formData.resultReleaseDate) : null,
            scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt) : null,
            showResultsImmediately: formData.resultVisibility === 'immediate'
        };

        try {
            const url = initialQuiz ? `${API_BASE_URL}/api/quiz/${initialQuiz._id}` : `${API_BASE_URL}/api/quiz/create`;
            const method = initialQuiz ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                onSuccess(data.quiz);
            } else {
                alert(data.message || 'Failed to save quiz.');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred while saving the quiz.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            {initialQuiz ? 'Edit Quiz Configuration' : 'Create Assessment 2.0'}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Configure parameters, scheduling, safe mode, and result visibility.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 mt-6">
                {/* Title */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Quiz Title *</label>
                    <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-900 dark:text-white font-medium"
                        placeholder="e.g. Unit 4: Distributed Systems & Consensus Algorithms"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Instructions / Exam Guidelines</label>
                    <textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none h-24 resize-none text-slate-900 dark:text-white font-medium"
                        placeholder="Provide student instructions, allowed references, exam conduct rules..."
                    />
                </div>

                {/* Topic Selector */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-pink-500" /> Topic / Classwork Unit
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                            value={isCustomTopic ? '__custom__' : formData.topic}
                            onChange={(e) => {
                                if (e.target.value === '__custom__') {
                                    setIsCustomTopic(true);
                                } else {
                                    setIsCustomTopic(false);
                                    setFormData({ ...formData, topic: e.target.value });
                                }
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-900 dark:text-white font-medium"
                        >
                            {availableTopics.map(top => (
                                <option key={top} value={top}>{top}</option>
                            ))}
                            <option value="__custom__">+ Create New Topic...</option>
                        </select>

                        {isCustomTopic && (
                            <input
                                type="text"
                                placeholder="Enter new topic name..."
                                value={customTopic}
                                onChange={(e) => setCustomTopic(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-pink-500/40 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-900 dark:text-white font-medium animate-fadeIn"
                            />
                        )}
                    </div>
                </div>

                {/* Timing, Marks & Passing Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-500" /> Time Limit (mins) *
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={formData.timeLimit}
                            onChange={e => setFormData({ ...formData, timeLimit: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-900 dark:text-white font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-emerald-500" /> Passing Marks
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={formData.passingMarks}
                            onChange={e => setFormData({ ...formData, passingMarks: e.target.value })}
                            placeholder="Optional minimum score"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-900 dark:text-white font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-indigo-500" /> Max Attempts
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            max="10"
                            value={formData.allowedAttempts}
                            onChange={e => setFormData({ ...formData, allowedAttempts: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-900 dark:text-white font-medium"
                        />
                    </div>
                </div>

                {/* Scheduling Dates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-indigo-500" /> Available From (Start Date)
                        </label>
                        <input
                            type="datetime-local"
                            value={formData.startDate}
                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-900 dark:text-white font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-rose-500" /> Due Deadline *
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.deadline}
                            onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none text-slate-900 dark:text-white font-medium"
                        />
                    </div>
                </div>

                {/* Advanced Security & Assessment Rules */}
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Security, Integrity & Result Controls</h3>
                    
                    {/* Shuffle Questions */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Shuffle className="w-4 h-4 text-indigo-500" />
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Randomize / Shuffle Questions</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Presents questions in random sequence for each student attempt.</p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.shuffleQuestions}
                            onChange={e => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                            className="w-5 h-5 accent-pink-600 rounded cursor-pointer"
                        />
                    </div>

                    {/* Safe Exam Mode */}
                    <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Safe Exam / Integrity Mode</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Monitors tab-switches, focus loss, and window blur events for teacher review.</p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.safeMode}
                            onChange={e => setFormData({ ...formData, safeMode: e.target.checked })}
                            className="w-5 h-5 accent-pink-600 rounded cursor-pointer"
                        />
                    </div>

                    {/* Result Visibility Selector */}
                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-3">
                        <div className="flex items-center gap-3">
                            <Eye className="w-4 h-4 text-emerald-500" />
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Result & Answer Breakdown Visibility</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Control when students can see their marks, rubrics, and correct solutions.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            {[
                                { id: 'immediate', label: 'Immediately', desc: 'Score shown upon submit' },
                                { id: 'manual_release', label: 'Manual Release', desc: 'Teacher unlocks results' },
                                { id: 'scheduled_release', label: 'Scheduled Date', desc: 'Auto-unlocks at date' }
                            ].map(vis => (
                                <button
                                    key={vis.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, resultVisibility: vis.id })}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        formData.resultVisibility === vis.id 
                                            ? 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400 ring-1 ring-pink-500/20' 
                                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <p className="text-xs font-bold">{vis.label}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{vis.desc}</p>
                                </button>
                            ))}
                        </div>

                        {formData.resultVisibility === 'scheduled_release' && (
                            <div className="pt-2">
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Result Release Timestamp</label>
                                <input
                                    type="datetime-local"
                                    value={formData.resultReleaseDate}
                                    onChange={e => setFormData({ ...formData, resultReleaseDate: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Draft & Configure Questions
                    </button>

                    <button
                        type="button"
                        disabled={loading}
                        onClick={(e) => handleSubmit(e, true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50"
                    >
                        {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Save & Publish
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateQuiz;
