import React, { useState } from 'react';
import QuizBuilder from '../components/quiz/QuizBuilder';
import SecureExamRunner from '../components/quiz/SecureExamRunner';
import TopicMasteryRadar from '../components/analytics/TopicMasteryRadar';
import { BrainCircuit, PlusCircle, PlayCircle, Radar } from 'lucide-react';

const AssessmentEnginePage = ({ user }) => {
    const [activeTab, setActiveTab] = useState('radar'); // 'radar', 'builder', 'exam'
    const [lastCreatedAssessment, setLastCreatedAssessment] = useState(null);

    const studentId = user?._id || '665123456789012345678999';

    return (
        <div className="min-h-full bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
            {/* Top Navigation Tabs */}
            <div className="max-w-5xl mx-auto mb-8">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-indigo-500/20 p-2 rounded-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-2 px-3 py-1.5 text-indigo-400 font-bold text-sm">
                        <BrainCircuit className="w-5 h-5" />
                        <span>Academic Intelligence Engine</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setActiveTab('radar')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'radar'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            <Radar className="w-4 h-4" />
                            Concept Mastery Radar
                        </button>

                        <button
                            onClick={() => setActiveTab('builder')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'builder'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            <PlusCircle className="w-4 h-4" />
                            Quiz Builder
                        </button>

                        <button
                            onClick={() => setActiveTab('exam')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'exam'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            <PlayCircle className="w-4 h-4" />
                            Secure Exam Runner
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Render */}
            <div className="max-w-5xl mx-auto">
                {activeTab === 'radar' && (
                    <TopicMasteryRadar studentId={studentId} studentName={user?.fullname || 'Student'} />
                )}

                {activeTab === 'builder' && (
                    <QuizBuilder
                        onAssessmentCreated={(assessment) => {
                            setLastCreatedAssessment(assessment);
                            setActiveTab('exam');
                        }}
                    />
                )}

                {activeTab === 'exam' && (
                    <SecureExamRunner
                        assessmentId={lastCreatedAssessment?._id || 'mock-assessment-01'}
                        studentId={studentId}
                        onComplete={() => {
                            // After finishing exam, switch to radar to see updated mastery
                            setTimeout(() => setActiveTab('radar'), 2500);
                        }}
                        onExit={() => setActiveTab('radar')}
                    />
                )}
            </div>
        </div>
    );
};

export default AssessmentEnginePage;
