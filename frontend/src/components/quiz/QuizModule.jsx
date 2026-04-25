import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import { Loader, Plus, BookOpen, Clock, Brain, CheckCircle2, ChevronRight, Share2, Play } from 'lucide-react';
import CreateQuiz from './CreateQuiz';
import AddQuestions from './AddQuestions';
import AttemptQuiz from './AttemptQuiz';
import QuizResults from './QuizResults';
import StudentResult from './StudentResult';

const QuizModule = ({ roomId, user }) => {
    const [view, setView] = useState('list'); // 'list', 'create', 'add-questions', 'attempt', 'results'
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState(null);

    const isTeacher = user?.role === 'teacher';

    useEffect(() => {
        fetchQuizzes();
    }, [roomId, view]); // refetch when view changes (e.g. back to list)

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/quiz/room/${roomId}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setQuizzes(data.quizzes);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateQuizSubmit = async (quizData) => {
        setView('list');
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

    if (loading && view === 'list') {
        return <div className="h-[calc(100vh-180px)] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-purple-500" /></div>;
    }

    return (
        <div className="h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar pr-2">
            {view === 'list' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Brain className="text-pink-500 w-6 h-6" /> Class Quizzes
                            </h2>
                            <p className="text-sm text-gray-400 mt-1">Test your knowledge and track your progress.</p>
                        </div>
                        {isTeacher && (
                            <button
                                onClick={() => setView('create')}
                                className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(219,39,119,0.3)]"
                            >
                                <Plus className="w-4 h-4" /> Create Quiz
                            </button>
                        )}
                    </div>

                    {quizzes.length === 0 ? (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-gray-400">
                            No quizzes found for this class yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {quizzes.map(quiz => (
                                <div key={quiz._id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-pink-500/50 transition-all group">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg">{quiz.title}</h3>
                                        {isTeacher && (
                                            <span className={`text-xs px-2 py-1 rounded-full ${quiz.isPublished ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                {quiz.isPublished ? 'Published' : 'Draft'}
                                            </span>
                                        )}
                                        {!isTeacher && quiz.hasAttempted && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Attempted
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{quiz.description}</p>
                                    
                                    <div className="flex items-center gap-4 text-xs tracking-wider text-gray-500 font-medium mb-5">
                                        <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {quiz.timeLimit}m</div>
                                        <div className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {quiz.totalMarks} Marks</div>
                                    </div>

                                    {/* Action Buttons */}
                                    {isTeacher ? (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => { setSelectedQuiz(quiz); setView('results'); }}
                                                className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-all text-gray-300"
                                            >
                                                Results
                                            </button>
                                            <button 
                                                onClick={() => { setSelectedQuiz(quiz); setView('add-questions'); }}
                                                className="flex-1 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 rounded-lg text-sm font-bold transition-all"
                                            >
                                                Edit Qs
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => { setSelectedQuiz(quiz); setView(quiz.hasAttempted ? 'results' : 'attempt'); }}
                                            disabled={quiz.hasAttempted} // Disable if they just want to see it, OR let them see results
                                            className={`w-full py-2 flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all ${
                                                quiz.hasAttempted 
                                                ? 'bg-white/5 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' 
                                                : 'bg-pink-600 hover:bg-pink-700 text-white shadow-lg'
                                            }`}
                                        >
                                            {quiz.hasAttempted ? 'View Result' : <><Play className="w-4 h-4 fill-current" /> Start Attempt</>}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* View Sub-Components */}
            {view === 'create' && <CreateQuiz roomId={roomId} onBack={() => setView('list')} onSuccess={handleCreateQuizSubmit} />}
            {view === 'add-questions' && selectedQuiz && <AddQuestions quiz={selectedQuiz} onBack={() => setView('list')} onSuccess={handleQuestionsSaved} />}
            {view === 'attempt' && selectedQuiz && <AttemptQuiz quiz={selectedQuiz} onBack={() => setView('list')} onComplete={handleAttemptComplete} />}
            {view === 'results' && selectedQuiz && <QuizResults quiz={selectedQuiz} onBack={() => setView('list')} />}
            {view === 'student-result' && selectedQuiz && <StudentResult user={user} quiz={selectedQuiz} onBack={() => setView('list')} />}
        </div>
    );
};

export default QuizModule;
