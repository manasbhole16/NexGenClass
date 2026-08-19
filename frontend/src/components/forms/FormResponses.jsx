import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import {
    ArrowLeft,
    Users,
    CheckCircle2,
    Clock,
    Search,
    Loader,
    Eye,
    X,
    FileSpreadsheet,
    Mail,
    Filter,
    BarChart3,
    ListFilter,
    AlertCircle
} from 'lucide-react';

const FormResponses = ({ formId, roomId, onBack }) => {
    const [form, setForm] = useState(null);
    const [responses, setResponses] = useState([]);
    const [participation, setParticipation] = useState([]);
    const [stats, setStats] = useState({ totalResponses: 0, studentsResponded: 0, totalStudents: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'responses'
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Responded' | 'Not Responded'
    const [selectedResponseDetail, setSelectedResponseDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const loadResponsesData = async () => {
        try {
            setLoading(true);

            // 1. Fetch form info
            const formRes = await fetch(`${API_BASE_URL}/api/forms/${formId}`, { credentials: 'include' });
            const formData = await formRes.json();
            if (formData.success) setForm(formData.form);

            // 2. Fetch all responses
            const respRes = await fetch(`${API_BASE_URL}/api/forms/${formId}/responses`, { credentials: 'include' });
            const respData = await respRes.json();
            if (respData.success) {
                setResponses(respData.responses || []);
            }

            // 3. Fetch participation roster
            const partRes = await fetch(`${API_BASE_URL}/api/forms/${formId}/response-status`, { credentials: 'include' });
            const partData = await partRes.json();
            if (partData.success) {
                setParticipation(partData.participation || []);
                setStats({
                    totalResponses: respData.totalResponses || 0,
                    studentsResponded: partData.respondedCount || 0,
                    totalStudents: partData.totalStudents || 0
                });
            }
        } catch (err) {
            console.error('Failed to load response dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (formId) loadResponsesData();
    }, [formId]);

    // View individual response detail
    const handleViewResponseDetail = async (responseId) => {
        try {
            setLoadingDetail(true);
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/responses/${responseId}`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setSelectedResponseDetail(data);
            }
        } catch (err) {
            console.error('Error loading individual response:', err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const responseRate = stats.totalStudents > 0
        ? Math.round((stats.studentsResponded / stats.totalStudents) * 100)
        : 0;

    // Filter participation roster
    const filteredParticipation = participation.filter((p) => {
        const matchesSearch =
            !searchQuery ||
            p.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
            filterStatus === 'All' ||
            (filterStatus === 'Responded' && p.responded) ||
            (filterStatus === 'Not Responded' && !p.responded);
        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
                <Loader className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
                <p className="text-xs text-gray-500 font-semibold">Loading Form Responses...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-purple-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Forms
                </button>
            </div>

            {/* Header / KPI Row */}
            <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                {form?.topic || 'General'}
                            </span>
                            <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    form?.status === 'published'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}
                            >
                                {form?.status ? form.status.toUpperCase() : 'DRAFT'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                            {form?.title || 'Form Responses'}
                        </h1>
                    </div>

                    {/* Tabs Switcher */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#222228] p-1 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('roster')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'roster'
                                    ? 'bg-white dark:bg-[#18181c] text-purple-600 dark:text-purple-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                            }`}
                        >
                            Class Roster ({participation.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('responses')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'responses'
                                    ? 'bg-white dark:bg-[#18181c] text-purple-600 dark:text-purple-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                            }`}
                        >
                            All Submissions ({responses.length})
                        </button>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="bg-purple-50/50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 rounded-2xl p-4">
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">Total Responses</div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                            {stats.totalResponses}
                        </div>
                    </div>

                    <div className="bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl p-4">
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">Students Responded</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {stats.studentsResponded} <span className="text-xs font-semibold text-gray-400">/ {stats.totalStudents}</span>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl p-4">
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">Response Rate</div>
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                            {responseRate}%
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB 1: ROSTER PARTICIPATION VIEW */}
            {activeTab === 'roster' && (
                <div className="space-y-4">
                    {/* Search and Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="relative flex-1 min-w-[240px] max-w-md">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by student name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500"
                            />
                        </div>

                        <div className="flex items-center gap-1 bg-white dark:bg-[#18181c] p-1 rounded-xl border border-gray-200 dark:border-white/10">
                            {['All', 'Responded', 'Not Responded'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setFilterStatus(st)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        filterStatus === st
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Participation Roster Table */}
                    <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                        {filteredParticipation.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 text-xs">
                                No students match your search or filter.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-white/5">
                                {filteredParticipation.map((p) => (
                                    <div
                                        key={p.studentId}
                                        className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                                                    p.responded
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-gray-100 dark:bg-white/5 text-gray-500'
                                                }`}
                                            >
                                                {p.studentName ? p.studentName.charAt(0).toUpperCase() : 'S'}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {p.studentName}
                                                </div>
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    {p.email}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {p.responded ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right hidden sm:block">
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircle2 className="w-3 h-3" /> Responded
                                                        </span>
                                                        {p.submittedAt && (
                                                            <div className="text-[10px] text-gray-400">
                                                                {new Date(p.submittedAt).toLocaleDateString([], {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {p.responseId && (
                                                        <button
                                                            onClick={() => handleViewResponseDetail(p.responseId)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-xl transition-colors"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" /> View
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                                                    <Clock className="w-3 h-3" /> Not Responded
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: ALL RESPONSES TABLE */}
            {activeTab === 'responses' && (
                <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                    {responses.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 text-xs">
                            No responses submitted yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-white/5">
                            {responses.map((r) => (
                                <div
                                    key={r._id}
                                    className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                                            {r.studentId?.fullname ? r.studentId.fullname.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-900 dark:text-white">
                                                {r.studentId?.fullname || 'Anonymous'}
                                            </div>
                                            <div className="text-[11px] text-gray-500">
                                                {r.studentId?.email || 'No email'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right text-[11px] text-gray-400 hidden sm:block">
                                            {new Date(r.submittedAt).toLocaleString([], {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>

                                        <button
                                            onClick={() => handleViewResponseDetail(r._id)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-xl transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> View
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Individual Response Detail Modal */}
            {selectedResponseDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#18181c] w-full max-w-2xl rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                            <div>
                                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                                    {selectedResponseDetail.student?.fullname}'s Submission
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {selectedResponseDetail.student?.email} • Submitted on{' '}
                                    {new Date(selectedResponseDetail.submittedAt).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedResponseDetail(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Questions & Answers */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                            {selectedResponseDetail.answers.map((ans, idx) => (
                                <div
                                    key={ans.questionId || idx}
                                    className="p-4 rounded-2xl bg-gray-50 dark:bg-[#222228]/60 border border-gray-100 dark:border-white/5 space-y-2"
                                >
                                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                                        {idx + 1}. {ans.questionText}
                                        {ans.required && <span className="text-red-500 ml-1">*</span>}
                                    </div>

                                    {ans.description && (
                                        <p className="text-[11px] text-gray-400">{ans.description}</p>
                                    )}

                                    {/* Display student's exact answer */}
                                    <div className="pt-1">
                                        {['short_answer', 'paragraph'].includes(ans.type) && (
                                            <div className="p-2.5 bg-white dark:bg-[#18181c] rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                                {ans.textAnswer || <span className="text-gray-400 italic font-normal">No response provided</span>}
                                            </div>
                                        )}

                                        {['multiple_choice', 'dropdown'].includes(ans.type) && (
                                            <div className="p-2.5 bg-white dark:bg-[#18181c] rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-purple-600 dark:text-purple-400">
                                                {ans.selectedOption || <span className="text-gray-400 italic font-normal">No option selected</span>}
                                            </div>
                                        )}

                                        {ans.type === 'checkboxes' && (
                                            <div className="space-y-1">
                                                {ans.selectedOptions && ans.selectedOptions.length > 0 ? (
                                                    ans.selectedOptions.map((opt, oIdx) => (
                                                        <div
                                                            key={oIdx}
                                                            className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-white dark:bg-[#18181c] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            <span>{opt}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No options selected</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormResponses;
