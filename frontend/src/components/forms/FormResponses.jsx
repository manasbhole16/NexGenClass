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
    EyeOff,
    X,
    FileSpreadsheet,
    Mail,
    Filter,
    BarChart3,
    ListFilter,
    AlertCircle,
    File,
    Download,
    Award,
    Flag,
    FileText,
    CheckSquare,
    Square,
    Save,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Shield
} from 'lucide-react';

const FormResponses = ({ formId, roomId, onBack }) => {
    const [form, setForm] = useState(null);
    const [responses, setResponses] = useState([]);
    const [participation, setParticipation] = useState([]);
    const [stats, setStats] = useState({
        totalResponses: 0,
        totalSubmissions: 0,
        totalDrafts: 0,
        reviewedCount: 0,
        flaggedCount: 0,
        hiddenCount: 0,
        studentsResponded: 0,
        totalStudents: 0,
        completionRate: 0,
        responseRate: 0
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('responses'); // 'responses' | 'roster'
    
    // Filtering, Search & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterReviewStatus, setFilterReviewStatus] = useState('All');
    const [filterFlagged, setFilterFlagged] = useState('All');
    const [filterGradingStatus, setFilterGradingStatus] = useState('All');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);

    // Note Modal
    const [activeNoteResponse, setActiveNoteResponse] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    // Detail Modal
    const [selectedResponseDetail, setSelectedResponseDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadResponsesData = async (pageNum = page) => {
        try {
            setLoading(true);

            // 1. Fetch form info
            const formRes = await fetch(`${API_BASE_URL}/api/forms/${formId}`, { credentials: 'include' });
            const formData = await formRes.json();
            if (formData.success) setForm(formData.form);

            // 2. Fetch responses with filters
            let queryParams = new URLSearchParams({
                page: pageNum,
                limit: 25
            });
            if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
            if (filterReviewStatus !== 'All') queryParams.append('reviewStatus', filterReviewStatus);
            if (filterFlagged !== 'All') queryParams.append('flagged', filterFlagged);
            if (filterGradingStatus !== 'All') queryParams.append('gradingStatus', filterGradingStatus);

            const respRes = await fetch(`${API_BASE_URL}/api/forms/${formId}/responses?${queryParams.toString()}`, { credentials: 'include' });
            const respData = await respRes.json();
            if (respData.success) {
                setResponses(respData.responses || []);
                setPage(respData.page || 1);
                setTotalPages(respData.totalPages || 1);
                setStats({
                    totalResponses: respData.totalResponses || 0,
                    totalSubmissions: respData.totalSubmissions || 0,
                    totalDrafts: respData.totalDrafts || 0,
                    reviewedCount: respData.reviewedCount || 0,
                    flaggedCount: respData.flaggedCount || 0,
                    hiddenCount: respData.hiddenCount || 0,
                    studentsResponded: 0,
                    totalStudents: respData.totalStudents || 0,
                    completionRate: respData.completionRate || 0,
                    responseRate: respData.responseRate || 0
                });
            }

            // 3. Fetch participation roster
            const partRes = await fetch(`${API_BASE_URL}/api/forms/${formId}/response-status`, { credentials: 'include' });
            const partData = await partRes.json();
            if (partData.success) {
                setParticipation(partData.participation || []);
                setStats(prev => ({
                    ...prev,
                    studentsResponded: partData.respondedCount || 0,
                    totalStudents: partData.totalStudents || prev.totalStudents
                }));
            }
        } catch (err) {
            console.error('Failed to load response dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (formId) loadResponsesData(1);
    }, [formId, filterReviewStatus, filterFlagged, filterGradingStatus]);

    // Handle single response moderation
    const handleModerateResponse = async (responseId, updates) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/responses/${responseId}/moderate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (data.success) {
                showToast("Response moderation updated.");
                loadResponsesData(page);
            } else {
                showToast(data.message || "Failed to update response", "error");
            }
        } catch (e) {
            showToast("Error updating response", "error");
        }
    };

    // Handle bulk moderation
    const handleBulkAction = async (action) => {
        if (selectedIds.length === 0) return;
        setBulkLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/responses/bulk-moderate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action,
                    responseIds: selectedIds
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Applied '${action}' to ${data.modifiedCount} response(s).`);
                setSelectedIds([]);
                loadResponsesData(page);
            } else {
                showToast(data.message || "Bulk action failed", "error");
            }
        } catch (e) {
            showToast("Error executing bulk action", "error");
        } finally {
            setBulkLoading(false);
        }
    };

    // Save Internal Note
    const handleSaveNote = async () => {
        if (!activeNoteResponse) return;
        setSavingNote(true);
        try {
            await handleModerateResponse(activeNoteResponse._id, { internalNote: noteText });
            setActiveNoteResponse(null);
            showToast("Internal teacher note saved.");
        } finally {
            setSavingNote(false);
        }
    };

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

    const toggleSelectAll = () => {
        if (selectedIds.length === responses.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(responses.map(r => r._id));
        }
    };

    const toggleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    if (loading && responses.length === 0) {
        return (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
                <Loader className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
                <p className="text-xs text-gray-500 font-semibold">Loading Form Responses...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-16">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-purple-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Forms
                </button>

                {/* Export Buttons */}
                <div className="flex items-center gap-2">
                    <a
                        href={`${API_BASE_URL}/api/forms/${formId}/export/csv`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" /> CSV
                    </a>
                    <a
                        href={`${API_BASE_URL}/api/forms/${formId}/export/xlsx`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 border border-purple-200 dark:border-purple-800/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel (XLSX)
                    </a>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in ${
                    toast.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                }`}>
                    {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}

            {/* Header / KPI Row */}
            <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                {form?.topic || 'General'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600">
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
                            onClick={() => setActiveTab('responses')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'responses'
                                    ? 'bg-white dark:bg-[#18181c] text-purple-600 dark:text-purple-400 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            All Submissions ({stats.totalSubmissions})
                        </button>
                        <button
                            onClick={() => setActiveTab('roster')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'roster'
                                    ? 'bg-white dark:bg-[#18181c] text-purple-600 dark:text-purple-400 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Student Roster ({stats.studentsResponded}/{stats.totalStudents})
                        </button>
                    </div>
                </div>

                {/* 5 Metric KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Submissions</span>
                        <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.totalSubmissions}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Reviewed</span>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.reviewedCount}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Flagged</span>
                        <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.flaggedCount}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Active Drafts</span>
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.totalDrafts}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Completion Rate</span>
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.completionRate}%</p>
                    </div>
                </div>
            </div>

            {/* TAB 1: ALL SUBMISSIONS + MODERATION */}
            {activeTab === 'responses' && (
                <div className="space-y-4">
                    {/* Search & Filter Bar */}
                    <div className="bg-white dark:bg-[#18181c] rounded-2xl border border-gray-200 dark:border-white/10 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                        <form
                            onSubmit={(e) => { e.preventDefault(); loadResponsesData(1); }}
                            className="relative flex-1 min-w-[240px]"
                        >
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by student name, email, or answer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                            />
                        </form>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Review Status Filter */}
                            <select
                                value={filterReviewStatus}
                                onChange={(e) => setFilterReviewStatus(e.target.value)}
                                className="px-3 py-2 text-xs bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-200 focus:outline-none"
                            >
                                <option value="All">Review: All</option>
                                <option value="pending">Review: Pending</option>
                                <option value="reviewed">Review: Reviewed</option>
                                <option value="flagged">Review: Flagged</option>
                                <option value="hidden">Review: Hidden</option>
                            </select>

                            {/* Flagged Filter */}
                            <select
                                value={filterFlagged}
                                onChange={(e) => setFilterFlagged(e.target.value)}
                                className="px-3 py-2 text-xs bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-200 focus:outline-none"
                            >
                                <option value="All">Flags: All</option>
                                <option value="true">Flagged Only</option>
                                <option value="false">Unflagged</option>
                            </select>

                            {/* Grading Status Filter */}
                            <select
                                value={filterGradingStatus}
                                onChange={(e) => setFilterGradingStatus(e.target.value)}
                                className="px-3 py-2 text-xs bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-200 focus:outline-none"
                            >
                                <option value="All">Grading: All</option>
                                <option value="graded">Graded</option>
                                <option value="pending">Pending Evaluation</option>
                                <option value="partially_graded">Partially Graded</option>
                            </select>
                        </div>
                    </div>

                    {/* Bulk Action Toolbar */}
                    {selectedIds.length > 0 && (
                        <div className="bg-purple-950/40 border border-purple-800/50 rounded-2xl p-3.5 px-5 flex items-center justify-between gap-4 animate-in fade-in shadow-lg">
                            <div className="flex items-center gap-2 text-xs font-semibold text-purple-200">
                                <CheckSquare className="w-4 h-4 text-purple-400" />
                                {selectedIds.length} response(s) selected
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleBulkAction('mark_reviewed')}
                                    disabled={bulkLoading}
                                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
                                >
                                    Mark Reviewed
                                </button>
                                <button
                                    onClick={() => handleBulkAction('flag')}
                                    disabled={bulkLoading}
                                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors"
                                >
                                    Flag
                                </button>
                                <button
                                    onClick={() => handleBulkAction('hide')}
                                    disabled={bulkLoading}
                                    className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
                                >
                                    Hide
                                </button>
                                <button
                                    onClick={() => handleBulkAction('restore')}
                                    disabled={bulkLoading}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                                >
                                    Restore
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Responses Table */}
                    <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                                        <th className="p-4 w-10 text-center">
                                            <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">
                                                {selectedIds.length > 0 && selectedIds.length === responses.length ? (
                                                    <CheckSquare className="w-4 h-4 text-purple-400" />
                                                ) : (
                                                    <Square className="w-4 h-4" />
                                                )}
                                            </button>
                                        </th>
                                        <th className="p-4">Student</th>
                                        <th className="p-4">Submission Date</th>
                                        <th className="p-4">Score</th>
                                        <th className="p-4">Moderation</th>
                                        <th className="p-4">Teacher Note</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {responses.map((r) => {
                                        const isSelected = selectedIds.includes(r._id);
                                        return (
                                            <tr
                                                key={r._id}
                                                className={`hover:bg-purple-50/20 dark:hover:bg-purple-500/[0.02] transition-colors ${
                                                    r.hidden ? 'opacity-60 bg-gray-900/30' : ''
                                                }`}
                                            >
                                                {/* Select Checkbox */}
                                                <td className="p-4 text-center">
                                                    <button onClick={() => toggleSelectOne(r._id)}>
                                                        {isSelected ? (
                                                            <CheckSquare className="w-4 h-4 text-purple-400" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-gray-500" />
                                                        )}
                                                    </button>
                                                </td>

                                                {/* Student Profile */}
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-purple-600/10 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center border border-purple-500/20">
                                                            {r.studentId?.fullname?.[0]?.toUpperCase() || 'S'}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                                {r.studentId?.fullname || 'Student'}
                                                                {r.flagged && (
                                                                    <Flag className="w-3 h-3 text-rose-500 fill-rose-500" />
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-gray-400">{r.studentId?.email}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Date */}
                                                <td className="p-4 text-gray-500 dark:text-gray-400">
                                                    {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : 'Draft'}
                                                </td>

                                                {/* Score */}
                                                <td className="p-4">
                                                    <span className="font-bold text-gray-900 dark:text-white">
                                                        {r.score !== undefined ? r.score : 0} / {r.totalMarks || form?.totalMarks || 0}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 ml-1.5">
                                                        ({r.percentage || 0}%)
                                                    </span>
                                                </td>

                                                {/* Moderation Status */}
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                        r.reviewStatus === 'reviewed'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : r.reviewStatus === 'flagged' || r.flagged
                                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                            : r.reviewStatus === 'hidden' || r.hidden
                                                            ? 'bg-gray-800 text-gray-400 border-gray-700'
                                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    }`}>
                                                        {r.hidden ? 'Hidden' : r.reviewStatus ? r.reviewStatus.toUpperCase() : 'PENDING'}
                                                    </span>
                                                </td>

                                                {/* Teacher Note */}
                                                <td className="p-4">
                                                    {r.internalNote ? (
                                                        <button
                                                            onClick={() => {
                                                                setActiveNoteResponse(r);
                                                                setNoteText(r.internalNote || '');
                                                            }}
                                                            className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 truncate max-w-[140px]"
                                                            title={r.internalNote}
                                                        >
                                                            <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">{r.internalNote}</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setActiveNoteResponse(r);
                                                                setNoteText('');
                                                            }}
                                                            className="text-[11px] text-gray-500 hover:text-gray-300 flex items-center gap-1"
                                                        >
                                                            + Add note
                                                        </button>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleModerateResponse(r._id, { reviewStatus: r.reviewStatus === 'reviewed' ? 'pending' : 'reviewed' })}
                                                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                                                                r.reviewStatus === 'reviewed'
                                                                    ? 'text-emerald-400 bg-emerald-500/10'
                                                                    : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                                                            }`}
                                                            title={r.reviewStatus === 'reviewed' ? 'Mark Pending' : 'Mark Reviewed'}
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleModerateResponse(r._id, { flagged: !r.flagged })}
                                                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                                                                r.flagged
                                                                    ? 'text-rose-400 bg-rose-500/10'
                                                                    : 'text-gray-400 hover:text-rose-400 hover:bg-rose-500/10'
                                                            }`}
                                                            title={r.flagged ? 'Unflag' : 'Flag Response'}
                                                        >
                                                            <Flag className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleModerateResponse(r._id, { hidden: !r.hidden })}
                                                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                                                                r.hidden
                                                                    ? 'text-amber-400 bg-amber-500/10'
                                                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                                            }`}
                                                            title={r.hidden ? 'Restore Response' : 'Hide Response'}
                                                        >
                                                            {r.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewResponseDetail(r._id)}
                                                            className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                                                            title="Inspect Answers"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {responses.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-gray-500">
                                                No student submissions found matching your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => loadResponsesData(page - 1)}
                                    className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1 transition-colors"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                                </button>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => loadResponsesData(page + 1)}
                                    className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1 transition-colors"
                                >
                                    Next <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: STUDENT PARTICIPATION ROSTER */}
            {activeTab === 'roster' && (
                <div className="bg-white dark:bg-[#18181c] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                                    <th className="p-4">Student</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Participation Status</th>
                                    <th className="p-4">Submission Time</th>
                                    <th className="p-4">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {participation.map((p) => (
                                    <tr key={p.studentId} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="p-4 font-semibold text-gray-900 dark:text-white">
                                            {p.studentName}
                                        </td>
                                        <td className="p-4 text-gray-500 dark:text-gray-400">
                                            {p.email}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                p.responded
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            }`}>
                                                {p.responded ? 'SUBMITTED' : 'NOT SUBMITTED'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500 dark:text-gray-400">
                                            {p.submittedAt ? new Date(p.submittedAt).toLocaleString() : '—'}
                                        </td>
                                        <td className="p-4 font-bold text-gray-900 dark:text-white">
                                            {p.score !== null && p.score !== undefined ? `${p.score} pts` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Teacher Note Modal */}
            {activeNoteResponse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#181a20] border border-gray-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                <MessageSquare className="w-4 h-4 text-purple-400" />
                                Internal Teacher Note
                            </div>
                            <button onClick={() => setActiveNoteResponse(null)} className="text-gray-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-400">
                            Private moderation note for {activeNoteResponse.studentId?.fullname || 'Student'} (Hidden from students).
                        </p>
                        <textarea
                            rows={4}
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Enter grading observations, audit notes, or moderation remarks..."
                            className="w-full p-3 text-xs bg-black/40 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setActiveNoteResponse(null)}
                                className="px-4 py-2 rounded-xl bg-gray-800 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveNote}
                                disabled={savingNote}
                                className="px-4 py-2 rounded-xl bg-purple-600 text-xs text-white hover:bg-purple-500 flex items-center gap-1.5 transition-all"
                            >
                                <Save className="w-3.5 h-3.5" />
                                Save Note
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inspection / Answers Detail Modal */}
            {selectedResponseDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#181a20] border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#1e2029]">
                            <div>
                                <h3 className="text-sm font-bold text-white">
                                    Submission: {selectedResponseDetail.response?.studentId?.fullname}
                                </h3>
                                <p className="text-xs text-gray-400">
                                    Score: {selectedResponseDetail.response?.score} / {selectedResponseDetail.response?.totalMarks} pts ({selectedResponseDetail.response?.percentage}%)
                                </p>
                            </div>
                            <button onClick={() => setSelectedResponseDetail(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-4">
                            {selectedResponseDetail.answers?.map((ans, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="font-semibold text-xs text-white">
                                            Q{idx + 1}. {ans.questionId?.questionText || 'Question'}
                                        </div>
                                        <span className="text-[11px] font-bold text-purple-400">
                                            {ans.awardedMarks} / {ans.maxMarks} pts
                                        </span>
                                    </div>

                                    {/* Display Answer Content */}
                                    <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800 text-xs text-gray-300">
                                        {ans.textAnswer && <p>{ans.textAnswer}</p>}
                                        {ans.selectedOption && <p className="font-medium text-purple-300">{ans.selectedOption}</p>}
                                        {ans.selectedOptions?.length > 0 && <p className="font-medium text-purple-300">{ans.selectedOptions.join(', ')}</p>}
                                        {ans.scaleValue !== null && ans.scaleValue !== undefined && <p>Rating: {ans.scaleValue}</p>}
                                        {ans.dateAnswer && <p>Date: {ans.dateAnswer}</p>}
                                        {ans.timeAnswer && <p>Time: {ans.timeAnswer}</p>}
                                        {ans.fileAnswer?.fileName && (
                                            <a href={ans.fileAnswer.fileUrl} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline flex items-center gap-1">
                                                <File className="w-3.5 h-3.5" /> {ans.fileAnswer.fileName}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-gray-800 bg-[#1e2029] flex justify-end">
                            <button
                                onClick={() => setSelectedResponseDetail(null)}
                                className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-semibold text-white hover:bg-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormResponses;
