import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import {
    BrainCircuit,
    Sparkles,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Loader2,
    RefreshCw,
    Award
} from 'lucide-react';

// Realistic sample mastery dataset for instant preview/fallback
const MOCK_MASTERY_DATA = [
    {
        topicTag: 'Dynamic_Programming',
        masteryPercentage: 88,
        totalEarnedScore: 22,
        totalPossibleScore: 25,
        totalQuestions: 8,
        correctCount: 7,
        averageTimeSpent: 42.5,
        bloomLevels: ['Applying', 'Analyzing']
    },
    {
        topicTag: 'Graph_Algorithms',
        masteryPercentage: 92,
        totalEarnedScore: 23,
        totalPossibleScore: 25,
        totalQuestions: 7,
        correctCount: 6,
        averageTimeSpent: 35.0,
        bloomLevels: ['Understanding', 'Applying']
    },
    {
        topicTag: 'Binary_Search_Trees',
        masteryPercentage: 65,
        totalEarnedScore: 13,
        totalPossibleScore: 20,
        totalQuestions: 6,
        correctCount: 4,
        averageTimeSpent: 28.2,
        bloomLevels: ['Remembering', 'Understanding']
    },
    {
        topicTag: 'Recursion_Backtracking',
        masteryPercentage: 45,
        totalEarnedScore: 9,
        totalPossibleScore: 20,
        totalQuestions: 5,
        correctCount: 2,
        averageTimeSpent: 55.4,
        bloomLevels: ['Analyzing', 'Evaluating']
    },
    {
        topicTag: 'Greedy_Strategies',
        masteryPercentage: 78,
        totalEarnedScore: 14,
        totalPossibleScore: 18,
        totalQuestions: 5,
        correctCount: 4,
        averageTimeSpent: 30.1,
        bloomLevels: ['Understanding', 'Applying']
    },
    {
        topicTag: 'Divide_and_Conquer',
        masteryPercentage: 82,
        totalEarnedScore: 18,
        totalPossibleScore: 22,
        totalQuestions: 6,
        correctCount: 5,
        averageTimeSpent: 38.6,
        bloomLevels: ['Applying', 'Analyzing']
    }
];

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="rounded-xl bg-slate-950/95 border border-indigo-500/40 p-3 shadow-2xl backdrop-blur-xl text-xs">
                <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    {data.topicTag.replace(/_/g, ' ')}
                </div>
                <div className="text-indigo-300 font-semibold mb-1">
                    Mastery: <span className="text-white text-sm">{data.masteryPercentage}%</span>
                </div>
                <div className="text-slate-400 space-y-0.5 text-[11px]">
                    <div>Score: {data.totalEarnedScore} / {data.totalPossibleScore} pts</div>
                    <div>Accuracy: {data.correctCount} / {data.totalQuestions} questions</div>
                    {data.averageTimeSpent && (
                        <div>Avg Time: {data.averageTimeSpent}s per question</div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const TopicMasteryRadar = ({ studentId = '665123456789012345678999', studentName = 'Student' }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isMockMode, setIsMockMode] = useState(false);

    const fetchMastery = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/student/${studentId}/mastery`, {
                credentials: 'include'
            });
            const json = await res.json();
            if (res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
                setData(json.data);
                setIsMockMode(false);
            } else {
                // Fallback to sample data for immediate visual representation
                setData(MOCK_MASTERY_DATA);
                setIsMockMode(true);
            }
        } catch (err) {
            console.warn('Using fallback realistic mock data for Radar chart:', err);
            setData(MOCK_MASTERY_DATA);
            setIsMockMode(true);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMastery();
    }, [studentId]);

    // Calculate strengths and weaknesses
    const sortedData = [...data].sort((a, b) => b.masteryPercentage - a.masteryPercentage);
    const strongestTopic = sortedData[0];
    const weakestTopic = sortedData[sortedData.length - 1];
    const overallAvg = data.length > 0
        ? Math.round(data.reduce((acc, d) => acc + d.masteryPercentage, 0) / data.length)
        : 0;

    // Format label for angle axis (clean up underscores)
    const formatAxisLabel = (value) => {
        if (!value) return '';
        return value.replace(/_/g, ' ');
    };

    return (
        <div className="w-full rounded-3xl bg-slate-900/70 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                        <BrainCircuit className="w-3 h-3" />
                        Cognitive Knowledge Graph
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        Concept Mastery Radar
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Real-time aggregated diagnostic profiling across algorithmic topics
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    {isMockMode && (
                        <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                            Demo Mode
                        </span>
                    )}
                    <button
                        onClick={fetchMastery}
                        disabled={isRefreshing}
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors disabled:opacity-50"
                        title="Refresh Analytics"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-80 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                    <span className="text-xs">Computing concept aggregation pipeline...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Radar Chart Display */}
                    <div className="lg:col-span-7 h-72 sm:h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                                <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                                <PolarAngleAxis
                                    dataKey="topicTag"
                                    tickFormatter={formatAxisLabel}
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                />
                                <PolarRadiusAxis
                                    angle={30}
                                    domain={[0, 100]}
                                    stroke="#475569"
                                    tick={{ fill: '#64748b', fontSize: 9 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Radar
                                    name="Mastery %"
                                    dataKey="masteryPercentage"
                                    stroke="#6366f1"
                                    fill="#6366f1"
                                    fillOpacity={0.4}
                                    strokeWidth={2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Insights & Metrics Cards */}
                    <div className="lg:col-span-5 space-y-3.5">
                        {/* Overall Average Card */}
                        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                            <div>
                                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overall Proficiency</div>
                                <div className="text-2xl font-black text-white mt-0.5">{overallAvg}%</div>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Strongest Concept */}
                        {strongestTopic && (
                            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Highest Mastery Concept
                                </div>
                                <div className="text-sm font-bold text-white truncate">
                                    {strongestTopic.topicTag.replace(/_/g, ' ')}
                                </div>
                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                                    <span>Mastery: <strong className="text-emerald-300">{strongestTopic.masteryPercentage}%</strong></span>
                                    <span>Accuracy: <strong className="text-white">{strongestTopic.correctCount}/{strongestTopic.totalQuestions}</strong></span>
                                </div>
                            </div>
                        )}

                        {/* Critical Growth Area */}
                        {weakestTopic && (
                            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Recommended Diagnostic Focus
                                </div>
                                <div className="text-sm font-bold text-white truncate">
                                    {weakestTopic.topicTag.replace(/_/g, ' ')}
                                </div>
                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                                    <span>Mastery: <strong className="text-amber-300">{weakestTopic.masteryPercentage}%</strong></span>
                                    <span>Accuracy: <strong className="text-white">{weakestTopic.correctCount}/{weakestTopic.totalQuestions}</strong></span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopicMasteryRadar;
