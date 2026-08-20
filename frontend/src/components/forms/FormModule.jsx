import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import {
    Plus,
    Search,
    Loader,
    FileSpreadsheet,
    FileText,
    Eye,
    Edit3,
    Trash2,
    CheckCircle2,
    Clock,
    Layers,
    Globe,
    Lock,
    Mail,
    AlertCircle,
    X,
    Filter,
    ChevronDown,
    Users,
    BarChart3,
    Award,
    Copy,
    Bookmark,
    Archive,
    ArchiveRestore,
    XCircle,
    ArrowUpDown,
    Check,
    Sparkles
} from 'lucide-react';
import FormBuilder from './FormBuilder';
import FormPreview from './FormPreview';
import FormResponse from './FormResponse';
import FormResponses from './FormResponses';
import FormAnalytics from './FormAnalytics';

const FormModule = ({ roomId, user, roomDetails }) => {
    const [view, setView] = useState('list'); // 'list' | 'builder' | 'preview' | 'response' | 'responses' | 'analytics'
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFormId, setSelectedFormId] = useState(null);
    const [previewData, setPreviewData] = useState({ form: null, questions: [] });
    
    // Search, Filter & Sort
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'draft' | 'published' | 'closed' | 'archived' | 'templates'
    const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'oldest' | 'title' | 'updated'

    // Create Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newTopic, setNewTopic] = useState('General');
    const [newDescription, setNewDescription] = useState('');
    const [creating, setCreating] = useState(false);
    const [toast, setToast] = useState(null);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const isTeacher =
        user?.role === 'teacher' ||
        roomDetails?.owner === user?._id ||
        roomDetails?.owner?._id === user?._id;

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchForms = async () => {
        if (!roomId || roomId === 'personal') return;
        try {
            setLoading(true);
            let url = `${API_BASE_URL}/api/forms/room/${roomId}?sort=${sortOption}`;
            
            if (isTeacher) {
                if (statusFilter === 'archived') {
                    url += '&archived=true';
                } else if (statusFilter === 'templates') {
                    url += '&isTemplate=true';
                } else if (['draft', 'published', 'closed'].includes(statusFilter)) {
                    url += `&status=${statusFilter}&archived=false&isTemplate=false`;
                }
            }

            if (searchQuery.trim()) {
                url += `&search=${encodeURIComponent(searchQuery.trim())}`;
            }

            if (selectedTopic !== 'All') {
                url += `&topic=${encodeURIComponent(selectedTopic)}`;
            }

            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setForms(data.forms || []);
            }
        } catch (err) {
            console.error('Failed to load forms:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForms();
    }, [roomId, statusFilter, sortOption, searchQuery, selectedTopic]);

    // Fast form creation
    const handleCreateForm = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) {
            showToast('Form title is required', 'error');
            return;
        }

        setCreating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/forms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: newTitle.trim(),
                    topic: newTopic.trim() || 'General',
                    description: newDescription.trim(),
                    roomId
                })
            });
            const data = await res.json();
            if (data.success) {
                setIsCreateModalOpen(false);
                setNewTitle('');
                setNewDescription('');
                setNewTopic('General');
                setSelectedFormId(data.form._id);
                setView('builder');
                fetchForms();
            } else {
                showToast(data.message || 'Failed to create form', 'error');
            }
        } catch (err) {
            showToast(err.message || 'Network error creating form', 'error');
        } finally {
            setCreating(false);
        }
    };

    // Duplicate Form (F4.1)
    const handleDuplicateForm = async (formId, e) => {
        e.stopPropagation();
        try {
            setActionLoadingId(formId);
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/duplicate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                showToast('Form duplicated successfully!');
                fetchForms();
            } else {
                showToast(data.message || 'Failed to duplicate form', 'error');
            }
        } catch (err) {
            showToast('Error duplicating form', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Save as Template (F4.2)
    const handleSaveAsTemplate = async (formId, e) => {
        e.stopPropagation();
        try {
            setActionLoadingId(formId);
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                showToast('Form saved as a reusable template!');
                fetchForms();
            } else {
                showToast(data.message || 'Failed to create template', 'error');
            }
        } catch (err) {
            showToast('Error saving template', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Use Template to Create Form (F4.2)
    const handleCreateFromTemplate = async (templateId, e) => {
        e.stopPropagation();
        try {
            setActionLoadingId(templateId);
            const res = await fetch(`${API_BASE_URL}/api/forms/${templateId}/from-template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ roomId })
            });
            const data = await res.json();
            if (data.success) {
                showToast('New form created from template!');
                setSelectedFormId(data.form._id);
                setView('builder');
                fetchForms();
            } else {
                showToast(data.message || 'Failed to create from template', 'error');
            }
        } catch (err) {
            showToast('Error creating form from template', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Archive / Unarchive Form (F4.3)
    const handleToggleArchive = async (formId, isArchived, e) => {
        e.stopPropagation();
        try {
            setActionLoadingId(formId);
            const endpoint = isArchived ? 'unarchive' : 'archive';
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/${endpoint}`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                showToast(isArchived ? 'Form unarchived' : 'Form moved to archive');
                fetchForms();
            } else {
                showToast(data.message || 'Failed to update archive status', 'error');
            }
        } catch (err) {
            showToast('Error updating archive status', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Close Form (F4.4)
    const handleCloseForm = async (formId, e) => {
        e.stopPropagation();
        try {
            setActionLoadingId(formId);
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/close`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                showToast('Form closed to new submissions');
                fetchForms();
            } else {
                showToast(data.message || 'Failed to close form', 'error');
            }
        } catch (err) {
            showToast('Error closing form', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Toggle publish
    const handleTogglePublish = async (formId, e) => {
        e.stopPropagation();
        try {
            setActionLoadingId(formId);
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/publish`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Form status changed to ${data.form?.status?.toUpperCase()}`);
                fetchForms();
            }
        } catch (err) {
            showToast('Failed to toggle publish', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Delete form
    const handleDeleteForm = async (formId, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this form? This cannot be undone.')) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                showToast('Form deleted successfully');
                fetchForms();
            }
        } catch (err) {
            showToast('Failed to delete form', 'error');
        }
    };

    // Open direct preview
    const handleOpenPreview = async (formId) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setPreviewData({ form: data.form, questions: data.questions || [] });
                setView('preview');
            }
        } catch (err) {
            console.error('Error fetching preview:', err);
        } finally {
            setLoading(false);
        }
    };

    const topics = ['All', ...Array.from(new Set(forms.map((f) => f.topic).filter(Boolean)))];

    if (view === 'builder' && selectedFormId) {
        return (
            <FormBuilder
                formId={selectedFormId}
                roomId={roomId}
                onBack={() => {
                    setSelectedFormId(null);
                    setView('list');
                    fetchForms();
                }}
                onSaved={fetchForms}
            />
        );
    }

    if (view === 'response' && selectedFormId) {
        return (
            <FormResponse
                formId={selectedFormId}
                roomId={roomId}
                onBack={() => {
                    setSelectedFormId(null);
                    setView('list');
                    fetchForms();
                }}
            />
        );
    }

    if (view === 'responses' && selectedFormId) {
        return (
            <FormResponses
                formId={selectedFormId}
                roomId={roomId}
                onBack={() => {
                    setSelectedFormId(null);
                    setView('list');
                    fetchForms();
                }}
            />
        );
    }

    if (view === 'analytics' && selectedFormId) {
        return (
            <FormAnalytics
                formId={selectedFormId}
                roomId={roomId}
                onBack={() => {
                    setSelectedFormId(null);
                    setView('list');
                    fetchForms();
                }}
            />
        );
    }

    if (view === 'preview') {
        return (
            <FormPreview
                form={previewData.form}
                questions={previewData.questions}
                onBack={() => {
                    setView('list');
                }}
            />
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold transition-all animate-in fade-in slide-in-from-bottom-2 ${
                        toast.type === 'error'
                            ? 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    }`}
                >
                    {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header / Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-2.5 text-gray-900 dark:text-white">
                        <FileSpreadsheet className="text-purple-600 dark:text-purple-400 w-7 h-7" /> Google Forms
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Build feedback surveys, course assessments, auto-scored evaluations, and response analytics
                    </p>
                </div>

                {isTeacher && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95 text-xs"
                    >
                        <Plus className="w-4 h-4" /> Create Form
                    </button>
                )}
            </div>

            {/* Search, Filter & Sort Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
                    <div className="relative w-full">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search forms by title, topic, or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Status / Scope Filter (Teachers have Archived and Templates options) */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-3 pr-7 py-2 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 outline-none focus:border-purple-500 cursor-pointer appearance-none"
                        >
                            <option value="All">All Forms</option>
                            <option value="draft">Drafts</option>
                            <option value="published">Published</option>
                            <option value="closed">Closed</option>
                            {isTeacher && <option value="archived">Archived</option>}
                            {isTeacher && <option value="templates">Templates</option>}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Sorting Dropdown */}
                    <div className="relative">
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="pl-3 pr-7 py-2 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 outline-none focus:border-purple-500 cursor-pointer appearance-none"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="title">Title (A-Z)</option>
                            <option value="updated">Recently Updated</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Topic Filter Chips */}
            {topics.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
                    {topics.map((t) => (
                        <button
                            key={t}
                            onClick={() => setSelectedTopic(t)}
                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                                selectedTopic === t
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            )}

            {/* Forms Grid */}
            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader className="w-7 h-7 animate-spin text-purple-500" />
                </div>
            ) : forms.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/5 rounded-3xl text-gray-500 space-y-3 shadow-sm">
                    <FileSpreadsheet className="w-12 h-12 mx-auto text-purple-500/30" />
                    <h3 className="font-bold text-base text-gray-800 dark:text-gray-200">No forms found</h3>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                        {isTeacher
                            ? "Click '+ Create Form' above to create custom questionnaires, surveys, and forms."
                            : 'Forms published by your instructor will appear here.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {forms.map((f) => (
                        <div
                            key={f._id}
                            onClick={() => {
                                setSelectedFormId(f._id);
                                if (isTeacher) {
                                    if (f.isTemplate) {
                                        // Open builder for template
                                        setView('builder');
                                    } else {
                                        setView('builder');
                                    }
                                } else {
                                    setView('response');
                                }
                            }}
                            className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl p-5 hover:shadow-xl hover:border-purple-400 dark:hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                            {f.topic || 'General'}
                                        </span>
                                        {f.isTemplate ? (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                                <Bookmark className="w-3 h-3" /> TEMPLATE
                                            </span>
                                        ) : f.archived ? (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                <Archive className="w-3 h-3" /> ARCHIVED
                                            </span>
                                        ) : (
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    f.status === 'published'
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : f.status === 'closed'
                                                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                }`}
                                            >
                                                {f.status ? f.status.toUpperCase() : 'DRAFT'}
                                            </span>
                                        )}
                                        {f.totalMarks > 0 && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                                                <Award className="w-2.5 h-2.5" /> {f.totalMarks} pts
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Buttons for Teachers */}
                                    {isTeacher && (
                                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                            {/* Template Usage */}
                                            {f.isTemplate && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleCreateFromTemplate(f._id, e)}
                                                    className="p-1.5 text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-500/10 rounded-lg transition-colors"
                                                    title="Create new form from this template"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Duplicate */}
                                            <button
                                                type="button"
                                                onClick={(e) => handleDuplicateForm(f._id, e)}
                                                className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                                                title="Duplicate Form"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>

                                            {/* Save as Template */}
                                            {!f.isTemplate && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleSaveAsTemplate(f._id, e)}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                                                    title="Save as Reusable Template"
                                                >
                                                    <Bookmark className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Analytics & Grading */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFormId(f._id);
                                                    setView('analytics');
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                                                title="Analytics, Scoring & Exports"
                                            >
                                                <BarChart3 className="w-4 h-4" />
                                            </button>

                                            {/* Responses */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFormId(f._id);
                                                    setView('responses');
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-purple-500 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                                                title="View Responses & Participation"
                                            >
                                                <Users className="w-4 h-4" />
                                            </button>

                                            {/* Preview */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenPreview(f._id);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-purple-500 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                                                title="Preview Form"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            {/* Archive / Unarchive */}
                                            <button
                                                type="button"
                                                onClick={(e) => handleToggleArchive(f._id, f.archived, e)}
                                                className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                                                title={f.archived ? 'Unarchive Form' : 'Archive Form'}
                                            >
                                                {f.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                            </button>

                                            {/* Publish Toggle */}
                                            {!f.archived && !f.isTemplate && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleTogglePublish(f._id, e)}
                                                    className={`p-1.5 rounded-lg transition-colors ${
                                                        f.status === 'published'
                                                            ? 'text-emerald-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                                                            : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                                                    }`}
                                                    title={f.status === 'published' ? 'Unpublish Form' : 'Publish Form'}
                                                >
                                                    <Globe className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Delete */}
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteForm(f._id, e)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                title="Delete Form"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                                    {f.title}
                                </h3>

                                {f.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                        {f.description}
                                    </p>
                                )}
                            </div>

                            {/* Card Footer */}
                            <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100 dark:border-white/5 text-[11px] text-gray-400">
                                <div className="flex items-center gap-2">
                                    {f.collectEmail && (
                                        <span className="flex items-center gap-1" title="Collects Email">
                                            <Mail className="w-3 h-3 text-purple-500" />
                                        </span>
                                    )}
                                    {f.limitOneResponse && (
                                        <span className="flex items-center gap-1" title="1 Response Limit">
                                            <Lock className="w-3 h-3 text-purple-500" />
                                        </span>
                                    )}
                                    {f.createdAt && (
                                        <span>
                                            {new Date(f.createdAt).toLocaleDateString([], {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    )}
                                </div>

                                <div className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                    {isTeacher ? (f.isTemplate ? 'Use / Edit Template' : 'Edit Form') : 'Fill Out Form'} →
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Create Form Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#18181c] w-full max-w-md rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-base text-gray-900 dark:text-white">Create New Form</h3>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateForm} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Form Title *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. End of Term Feedback Survey"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Topic / Category</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Feedback, Unit 1, Surveys"
                                    value={newTopic}
                                    onChange={(e) => setNewTopic(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Description (Optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Brief instructions for students..."
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#222228] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500 resize-none"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create & Open Builder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormModule;
