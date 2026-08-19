import React, { useState } from 'react';
import API_BASE_URL from '../../apiConfig';
import { 
    PlusCircle, 
    Trash2, 
    CheckCircle2, 
    Layers, 
    Clock, 
    Sparkles, 
    Save, 
    Loader2, 
    Tag, 
    BrainCircuit, 
    HelpCircle,
    ArrowRight,
    CopyCheck
} from 'lucide-react';

const BLOOM_LEVELS = [
    { level: 'Remembering', desc: 'Recall facts & basic concepts', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    { level: 'Understanding', desc: 'Explain ideas or concepts', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
    { level: 'Applying', desc: 'Use information in new situations', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    { level: 'Analyzing', desc: 'Draw connections among ideas', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
    { level: 'Evaluating', desc: 'Justify a stance or decision', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
    { level: 'Creating', desc: 'Produce new or original work', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' }
];

const PRESET_TOPIC_TAGS = [
    'Dynamic_Programming',
    'Graph_Algorithms',
    'Binary_Search_Trees',
    'Recursion_Backtracking',
    'Greedy_Strategies',
    'Divide_and_Conquer',
    'System_Design_Fundamentals'
];

const SAMPLE_QUESTIONS = [
    {
        questionId: 'q-dp-01',
        text: 'What is the optimal substructure property in Dynamic Programming, and how does memoization prevent redundant computation?',
        topicTag: 'Dynamic_Programming',
        bloomTaxonomy: 'Analyzing',
        options: [
            'It stores solutions to subproblems in a lookup table so each subproblem is computed only once.',
            'It guarantees greedy choices always yield the global optimum without backtracking.',
            'It transforms recursion trees into iterative binary search trees.',
            'It requires sorting input elements before solving the subproblems.'
        ],
        correctOptionIndex: 0,
        weightage: 3
    },
    {
        questionId: 'q-tree-02',
        text: 'In a balanced Binary Search Tree (AVL or Red-Black) with N nodes, what is the worst-case time complexity of searching for a key?',
        topicTag: 'Binary_Search_Trees',
        bloomTaxonomy: 'Understanding',
        options: [
            'O(N)',
            'O(log N)',
            'O(N log N)',
            'O(1)'
        ],
        correctOptionIndex: 1,
        weightage: 2
    },
    {
        questionId: 'q-graph-03',
        text: 'You are designing an emergency route planner that finds the shortest path with non-negative edge weights. Which algorithm should you implement?',
        topicTag: 'Graph_Algorithms',
        bloomTaxonomy: 'Applying',
        options: [
            'Bellman-Ford Algorithm',
            'Floyd-Warshall Algorithm',
            "Dijkstra's Algorithm with Min-Heap",
            'Tarjan Strongly Connected Components'
        ],
        correctOptionIndex: 2,
        weightage: 3
    }
];

const QuizBuilder = ({ courseId = '665123456789012345678901', onAssessmentCreated, onCancel }) => {
    const [title, setTitle] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(25);
    const [selectedCourseId, setSelectedCourseId] = useState(courseId);
    const [questions, setQuestions] = useState([
        {
            questionId: `q-${Date.now()}-1`,
            text: '',
            topicTag: 'Dynamic_Programming',
            bloomTaxonomy: 'Understanding',
            options: ['', '', '', ''],
            correctOptionIndex: 0,
            weightage: 2
        }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState(null);

    // Load sample mock assessment data for instant testing
    const handleLoadSampleData = () => {
        setTitle('CS301: Advanced Algorithms & Concept Mastery Exam');
        setDurationMinutes(30);
        setQuestions(SAMPLE_QUESTIONS);
        showFeedback('Sample assessment data loaded!', 'success');
    };

    const showFeedback = (msg, type = 'info') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 4000);
    };

    // Question manipulation
    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            {
                questionId: `q-${Date.now()}-${questions.length + 1}`,
                text: '',
                topicTag: 'Dynamic_Programming',
                bloomTaxonomy: 'Applying',
                options: ['', '', '', ''],
                correctOptionIndex: 0,
                weightage: 2
            }
        ]);
    };

    const handleRemoveQuestion = (index) => {
        if (questions.length <= 1) {
            showFeedback('Assessment must contain at least one question.', 'error');
            return;
        }
        setQuestions(questions.filter((_, idx) => idx !== index));
    };

    const handleUpdateQuestion = (index, field, value) => {
        const updated = [...questions];
        updated[index][field] = value;
        setQuestions(updated);
    };

    // Option manipulation
    const handleUpdateOption = (qIndex, optIndex, value) => {
        const updated = [...questions];
        updated[qIndex].options[optIndex] = value;
        setQuestions(updated);
    };

    const handleAddOption = (qIndex) => {
        const updated = [...questions];
        if (updated[qIndex].options.length >= 6) {
            showFeedback('Maximum 6 options allowed per question.', 'error');
            return;
        }
        updated[qIndex].options.push('');
        setQuestions(updated);
    };

    const handleRemoveOption = (qIndex, optIndex) => {
        const updated = [...questions];
        if (updated[qIndex].options.length <= 2) {
            showFeedback('A minimum of 2 options are required.', 'error');
            return;
        }
        updated[qIndex].options = updated[qIndex].options.filter((_, idx) => idx !== optIndex);
        if (updated[qIndex].correctOptionIndex >= updated[qIndex].options.length) {
            updated[qIndex].correctOptionIndex = 0;
        }
        setQuestions(updated);
    };

    // Validation & Submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            showFeedback('Please enter an assessment title.', 'error');
            return;
        }

        // Validate all questions
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.text.trim()) {
                showFeedback(`Question #${i + 1} text cannot be empty.`, 'error');
                return;
            }
            if (!q.topicTag.trim()) {
                showFeedback(`Question #${i + 1} must have a valid topicTag.`, 'error');
                return;
            }
            for (let j = 0; j < q.options.length; j++) {
                if (!q.options[j].trim()) {
                    showFeedback(`Question #${i + 1}, Option #${j + 1} cannot be empty.`, 'error');
                    return;
                }
            }
        }

        setIsSubmitting(true);
        try {
            const payload = {
                title: title.trim(),
                courseId: selectedCourseId,
                durationMinutes: Number(durationMinutes),
                questions: questions.map(q => ({
                    questionId: q.questionId,
                    text: q.text.trim(),
                    topicTag: q.topicTag.trim(),
                    bloomTaxonomy: q.bloomTaxonomy,
                    options: q.options.map(opt => opt.trim()),
                    correctOptionIndex: Number(q.correctOptionIndex),
                    weightage: Number(q.weightage) || 1
                }))
            };

            const response = await fetch(`${API_BASE_URL}/api/assessments/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            const data = await response.json();
            if (response.ok && data.success) {
                showFeedback('Assessment published successfully with concept tags!', 'success');
                if (onAssessmentCreated) {
                    onAssessmentCreated(data.data);
                }
            } else {
                showFeedback(data.message || 'Failed to create assessment', 'error');
            }
        } catch (error) {
            console.error('QuizBuilder submission error:', error);
            showFeedback('Network error while publishing assessment.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalWeight = questions.reduce((sum, q) => sum + (Number(q.weightage) || 1), 0);

    return (
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl backdrop-blur-xl mb-8">
                <div className="absolute -right-10 -top-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
                            <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                            Academic Intelligence Engine
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            Concept-Tagged Quiz Builder
                        </h1>
                        <p className="text-slate-400 text-sm mt-1 max-w-xl">
                            Create diagnostic assessments tagged with cognitive complexity (Bloom's Taxonomy) and granular concept tags for real-time telemetry analysis.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleLoadSampleData}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-all shadow-sm hover:shadow-indigo-500/10 hover:border-indigo-500/40"
                        >
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            Load Sample Data
                        </button>
                    </div>
                </div>
            </div>

            {/* Notification alert */}
            {notification && (
                <div className={`mb-6 p-4 rounded-2xl border text-sm font-medium transition-all ${
                    notification.type === 'success' 
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                        : notification.type === 'error'
                        ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                        : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
                }`}>
                    {notification.msg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* General Settings Card */}
                <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-md shadow-xl">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-400" />
                        Assessment Metadata
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                Assessment Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Dynamic Programming & Graph Theory Mastery"
                                className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                Duration (Minutes)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="300"
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(e.target.value)}
                                className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* Summary bar */}
                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
                        <div className="flex items-center gap-6">
                            <span>Total Questions: <strong className="text-white font-semibold">{questions.length}</strong></span>
                            <span>Total Weightage / Score: <strong className="text-indigo-400 font-semibold">{totalWeight} pts</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Concept Telemetry Ingestion Enabled</span>
                        </div>
                    </div>
                </div>

                {/* Questions Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-indigo-400" />
                            Concept-Tagged Questions ({questions.length})
                        </h2>

                        <button
                            type="button"
                            onClick={handleAddQuestion}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-all shadow-sm"
                        >
                            <PlusCircle className="w-4 h-4" />
                            Add Question
                        </button>
                    </div>

                    {questions.map((q, qIndex) => (
                        <div
                            key={q.questionId || qIndex}
                            className="rounded-2xl bg-slate-900/50 border border-slate-800/90 p-6 backdrop-blur-md shadow-lg relative group transition-all hover:border-slate-700"
                        >
                            {/* Question Header & Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
                                <div className="flex items-center gap-3">
                                    <span className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-center">
                                        {qIndex + 1}
                                    </span>
                                    <span className="text-xs font-medium text-slate-400">
                                        Cognitive Diagnostic Item
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-slate-400 font-medium">Weightage:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={q.weightage}
                                            onChange={(e) => handleUpdateQuestion(qIndex, 'weightage', Number(e.target.value))}
                                            className="w-16 bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white text-center focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleRemoveQuestion(qIndex)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                        title="Delete Question"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Cognitive Metatags Bar */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                {/* Topic Tag */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5 text-cyan-400" />
                                        Concept / Topic Tag
                                    </label>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={q.topicTag}
                                            onChange={(e) => handleUpdateQuestion(qIndex, 'topicTag', e.target.value)}
                                            placeholder="e.g., Dynamic_Programming, Binary_Trees"
                                            className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-xs text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                                        />
                                        <div className="flex flex-wrap gap-1.5">
                                            {PRESET_TOPIC_TAGS.slice(0, 4).map((preset) => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => handleUpdateQuestion(qIndex, 'topicTag', preset)}
                                                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                                                        q.topicTag === preset
                                                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                                                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                                                    }`}
                                                >
                                                    {preset}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Bloom's Taxonomy Level */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                                        Bloom's Taxonomy Cognitive Level
                                    </label>
                                    <select
                                        value={q.bloomTaxonomy}
                                        onChange={(e) => handleUpdateQuestion(qIndex, 'bloomTaxonomy', e.target.value)}
                                        className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-xs text-purple-300 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                                    >
                                        {BLOOM_LEVELS.map((bloom) => (
                                            <option key={bloom.level} value={bloom.level} className="bg-slate-900 text-white">
                                                {bloom.level} - ({bloom.desc})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-medium ${
                                            BLOOM_LEVELS.find(b => b.level === q.bloomTaxonomy)?.color || ''
                                        }`}>
                                            Target Cognitive Domain: {q.bloomTaxonomy}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Question Text */}
                            <div className="mb-5">
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Question Text / Prompt
                                </label>
                                <textarea
                                    rows={2}
                                    value={q.text}
                                    onChange={(e) => handleUpdateQuestion(qIndex, 'text', e.target.value)}
                                    placeholder="Write the concept-testing scenario or question..."
                                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm transition-all"
                                />
                            </div>

                            {/* Options List */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        Options (Select radio for correct answer)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => handleAddOption(qIndex)}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                                    >
                                        + Add Option
                                    </button>
                                </div>

                                {q.options.map((opt, optIndex) => (
                                    <div
                                        key={optIndex}
                                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                                            q.correctOptionIndex === optIndex
                                                ? 'bg-emerald-950/30 border-emerald-500/50'
                                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateQuestion(qIndex, 'correctOptionIndex', optIndex)}
                                            className={`p-1 rounded-full transition-colors ${
                                                q.correctOptionIndex === optIndex
                                                    ? 'text-emerald-400 bg-emerald-500/20'
                                                    : 'text-slate-600 hover:text-slate-400'
                                            }`}
                                            title="Set as correct answer"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>

                                        <span className="text-xs font-mono font-bold text-slate-400 w-5">
                                            {String.fromCharCode(65 + optIndex)}.
                                        </span>

                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => handleUpdateOption(qIndex, optIndex, e.target.value)}
                                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
                                        />

                                        {q.options.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOption(qIndex, optIndex)}
                                                className="text-slate-500 hover:text-rose-400 p-1 text-xs"
                                                title="Remove Option"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Actions Bar */}
                <div className="sticky bottom-4 z-20 rounded-2xl bg-slate-900/90 border border-indigo-500/30 p-4 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleAddQuestion}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                        >
                            <PlusCircle className="w-4 h-4 text-indigo-400" />
                            Add Another Question
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Publishing Engine...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Publish Concept Assessment
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default QuizBuilder;
