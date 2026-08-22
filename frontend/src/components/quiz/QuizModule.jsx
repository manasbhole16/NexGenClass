import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import { 
    Loader, 
    Plus, 
    BookOpen, 
    Clock, 
    Brain, 
    CheckCircle2, 
    ChevronRight, 
    Share2, 
    Play, 
    Trash2, 
    Edit, 
    Layers, 
    Shuffle, 
    Award, 
    Search,
    Filter,
    BarChart3,
    ShieldAlert,
    Calendar,
    RotateCcw
} from 'lucide-react';
import CreateQuiz from './CreateQuiz';
import AddQuestions from './AddQuestions';
import AttemptQuiz from './AttemptQuiz';
import QuizResults from './QuizResults';
import StudentResult from './StudentResult';
import QuizAnalytics from './QuizAnalytics';

const QuizModule = ({ roomId, user }) => {
    const [view, setView] = useState('list'); // 'list', 'create', 'edit', 'add-questions', 'attempt', 'results', 'analytics', 'student-result'
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const isTeacher = user?.role === 'teacher';

    useEffect(() => {
        fetchQuizzes();
    }, [roomId, view]);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/quiz/room/${roomId}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setQuizzes(data.quizzes || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateQuizSubmit = async (quizData) => {
        setSelectedQuiz(quizData);
        setView('add-questions');
        fetchQuizzes();
    };

    const handleQuestionsSaved = () => {
        setView('list');
        fetchQuizzes();
    };

    const handleAttemptComplete = () => {
        setView('student-result');
        fetchQuizzes();
    };

    const topics = ['All', ...Array.from(new Set(quizzes.map(q => q.topic).filter(Boolean)))];

    const filteredQuizzes = quizzes.filter(q => {
        const matchesTopic = selectedTopic === 'All' || q.topic === selectedTopic;
        const matchesSearch = !searchQuery || q.title.toLowerCase().includes(searchQuery.toLowerCase()) || q.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTopic && matchesSearch;
    });

    if (loading && view === 'list') {
        return (
            <div className="h-[calc(100vh-180px)] flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-pink-500" />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar pr-2 space-y-6">
            {view === 'list' && (
                <div className="space-y-6">
                    {/* Header & Create Action */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black flex items-center gap-2.5 text-slate-900 dark:text-white">
                                <Brain className="text-pink-500 w-7 h-7" /> Class Assessments & Quizzes
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Evaluate conceptual understanding, run timed examinations, and track student outcomes.
                            </p>
                        </div>
                        {isTeacher && (
                            <button
                                onClick={() => { setSelectedQuiz(null); setView('create'); }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-pink-600/25 active:scale-95"
                            >
                                <Plus className="w-4 h-4" /> Create Assessment
                            </button>
                        )}
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                            <Search className="w-4 h-4 text-slate-400 ml-1" />
                            <input
                                type="text"
                                placeholder="Search assessments by title or topic..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none font-medium"
                            />
                        </div>

                        {/* Topic Filter Chips */}
                        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar max-w-full pb-1 sm:pb-0">
                            {topics.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setSelectedTopic(t)}
                                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedTopic === t ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quiz Grid */}
                    {filteredQuizzes.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm">
                            <Brain className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                            <p className="font-bold text-base text-slate-800 dark:text-slate-200">No assessments match your filter</p>
                            <p className="text-xs text-slate-400 mt-1">Create a new quiz or adjust your search keywords.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredQuizzes.map(quiz => (
                                <div 
                                    key={quiz._id} 
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 hover:border-pink-500/40 hover:shadow-xl transition-all group flex flex-col justify-between shadow-sm relative overflow-hidden space-y-4"
                                >
                                    <div>
                                        {/* Top Card Badges */}
                                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3">
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                                {quiz.topic || 'General'}
                                            </span>
                                            
                                            <div className="flex items-center gap-1.5">
                                                {quiz.safeMode && (
                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5" title="Integrity Mode Active">
                                                        <ShieldAlert className="w-3 h-3" /> Safe
                                                    </span>
                                                )}

                                                {isTeacher ? (
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${quiz.isPublished ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                                        {quiz.isPublished ? 'Published' : 'Draft'}
                                                    </span>
                                                ) : (
                                                    quiz.hasAttempted ? (
                                                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Attempted
                                                        </span>
                                                    ) : quiz.isInProgress ? (
                                                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                                                            <RotateCcw className="w-3 h-3 animate-spin" /> In Progress
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-500 border border-pink-500/20">
                                                            Available
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="font-black text-base text-slate-900 dark:text-white group-hover:text-pink-500 transition-colors line-clamp-1 mb-1.5">
                                            {quiz.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {quiz.description || 'No instructions provided.'}
                                        </p>
                                    </div>

                                    <div>
                                        {/* Meta Stats */}
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium py-3 border-t border-slate-100 dark:border-slate-800/80 mb-4">
                                            <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-500" /> {quiz.timeLimit}m</div>
                                            <div className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-emerald-500" /> {quiz.totalMarks} Pts</div>
                                            {quiz.passingMarks > 0 && (
                                                <div className="flex items-center gap-1 text-indigo-500" title={`Passing score: ${quiz.passingMarks} pts`}>
                                                    <span>Pass: {quiz.passingMarks}</span>
                                                </div>
                                            )}
                                            {quiz.shuffleQuestions && (
                                                <div className="flex items-center gap-1" title="Questions shuffled for each student"><Shuffle className="w-3.5 h-3.5 text-indigo-500" /> Shuffled</div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {isTeacher ? (
                                            <div className="flex items-center gap-1.5">
                                                <button 
                                                    onClick={() => { setSelectedQuiz(quiz); setView('analytics'); }}
                                                    className="p-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center"
                                                    title="View Analytics & Reports"
                                                >
                                                    <BarChart3 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => { setSelectedQuiz(quiz); setView('results'); }}
                                                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all text-center"
                                                >
                                                    Grade
                                                </button>
                                                <button 
                                                    onClick={() => { setSelectedQuiz(quiz); setView('add-questions'); }}
                                                    className="flex-1 py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/20 rounded-xl text-xs font-bold transition-all text-center"
                                                >
                                                    Questions
                                                </button>
                                                <button 
                                                    onClick={() => { setSelectedQuiz(quiz); setView('edit'); }}
                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-all"
                                                    title="Edit Configuration"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={async () => {
                                                        if(window.confirm(`Are you sure you want to delete "${quiz.title}"?`)) {
                                                            try {
                                                                const res = await fetch(`${API_BASE_URL}/api/quiz/${quiz._id}`, { method: 'DELETE', credentials: 'include' });
                                                                if(res.ok) fetchQuizzes();
                                                            } catch(err) { console.error(err); }
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                                                    title="Delete Quiz"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => { setSelectedQuiz(quiz); setView(quiz.hasAttempted ? 'student-result' : 'attempt'); }}
                                                className={`w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
                                                    quiz.hasAttempted 
                                                    ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700' 
                                                    : 'bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-600/25 active:scale-98'
                                                }`}
                                            >
                                                {quiz.hasAttempted ? 'View Evaluation & Review' : (quiz.isInProgress ? <><RotateCcw className="w-3.5 h-3.5" /> Resume Quiz Attempt</> : <><Play className="w-3.5 h-3.5 fill-current" /> Start Quiz Attempt</>)}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* View Routing */}
            {view === 'create' && <CreateQuiz roomId={roomId} onBack={() => setView('list')} onSuccess={handleCreateQuizSubmit} />}
            {view === 'edit' && selectedQuiz && <CreateQuiz roomId={roomId} initialQuiz={selectedQuiz} onBack={() => setView('list')} onSuccess={() => { setView('list'); fetchQuizzes(); }} />}
            {view === 'add-questions' && selectedQuiz && <AddQuestions quiz={selectedQuiz} onBack={() => setView('list')} onSuccess={handleQuestionsSaved} />}
            {view === 'attempt' && selectedQuiz && <AttemptQuiz quiz={selectedQuiz} onBack={() => setView('list')} onComplete={handleAttemptComplete} />}
            {view === 'results' && selectedQuiz && <QuizResults quiz={selectedQuiz} onBack={() => setView('list')} />}
            {view === 'analytics' && selectedQuiz && <QuizAnalytics quiz={selectedQuiz} onBack={() => setView('list')} />}
            {view === 'student-result' && selectedQuiz && <StudentResult user={user} quiz={selectedQuiz} onBack={() => setView('list')} />}
        </div>
    );
};

export default QuizModule;
