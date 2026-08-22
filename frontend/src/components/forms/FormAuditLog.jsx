import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import {
    History,
    X,
    Clock,
    User,
    Shield,
    Activity,
    Search,
    Filter,
    RefreshCw,
    CheckCircle2,
    Share2,
    Users,
    FileText,
    Flag,
    Eye,
    ChevronDown,
    ChevronRight,
    AlertCircle
} from 'lucide-react';

const FormAuditLog = ({ isOpen, onClose, formId, formTitle }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterAction, setFilterAction] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (isOpen && formId) {
            loadAuditLogs(1);
        }
    }, [isOpen, formId]);

    const loadAuditLogs = async (pageNum = 1) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/forms/${formId}/audit-logs?page=${pageNum}&limit=30`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setLogs(data.logs || []);
                setPage(data.page || 1);
                setTotalPages(data.totalPages || 1);
            }
        } catch (e) {
            console.error("Failed to fetch audit logs", e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const filteredLogs = logs.filter(log => {
        if (filterAction !== 'All' && log.action !== filterAction) return false;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const actorName = log.actorId?.fullname?.toLowerCase() || '';
            const actionText = log.action?.toLowerCase() || '';
            return actorName.includes(query) || actionText.includes(query);
        }
        return true;
    });

    const getActionBadge = (action) => {
        switch (action) {
            case 'form_created':
                return { label: 'Created Form', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
            case 'form_published':
                return { label: 'Published', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
            case 'form_closed':
                return { label: 'Closed', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
            case 'form_archived':
                return { label: 'Archived', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
            case 'questions_updated':
                return { label: 'Questions Updated', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
            case 'collaborator_added':
                return { label: 'Collaborator Added', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
            case 'collaborator_removed':
                return { label: 'Collaborator Removed', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
            case 'share_link_created':
                return { label: 'Share Link Created', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
            case 'share_link_revoked':
                return { label: 'Share Link Revoked', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
            case 'response_flagged':
                return { label: 'Response Flagged', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
            case 'response_reviewed':
                return { label: 'Response Reviewed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
            case 'bulk_moderation':
                return { label: 'Bulk Moderation', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
            default:
                return { label: action.replace(/_/g, ' '), color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#181a20] border border-gray-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-[#1e2029]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Form Audit Trail</h2>
                            <p className="text-xs text-gray-400">Immutable chronological record of events for "{formTitle}"</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => loadAuditLogs(page)}
                            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            title="Refresh Audit Logs"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-gray-800 bg-[#181a20] flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Filter by actor or event..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-xl text-gray-300"
                    >
                        <option value="All">All Actions</option>
                        <option value="form_created">Form Created</option>
                        <option value="questions_updated">Questions Updated</option>
                        <option value="form_published">Published</option>
                        <option value="collaborator_added">Collaborators</option>
                        <option value="share_link_created">Share Links</option>
                        <option value="response_reviewed">Moderation</option>
                        <option value="bulk_moderation">Bulk Moderation</option>
                    </select>
                </div>

                {/* Timeline Log List */}
                <div className="p-5 overflow-y-auto flex-1 space-y-3">
                    {loading && logs.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-xs text-gray-500">
                            Loading audit records...
                        </div>
                    ) : filteredLogs.length > 0 ? (
                        <div className="space-y-2.5">
                            {filteredLogs.map(log => {
                                const badge = getActionBadge(log.action);
                                const isExpanded = expandedLogId === log._id;
                                return (
                                    <div
                                        key={log._id}
                                        className="p-3.5 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-gray-700 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-purple-600/20 text-purple-400 font-semibold text-xs flex items-center justify-center border border-purple-500/30">
                                                    {log.actorId?.fullname?.[0]?.toUpperCase() || 'A'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-white">{log.actorId?.fullname || 'System'}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}>
                                                            {badge.label}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                                                        <Clock className="w-3 h-3 text-gray-500" />
                                                        {new Date(log.createdAt).toLocaleString()}
                                                        {log.ipAddress && (
                                                            <span className="text-gray-500">• IP: {log.ipAddress}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <button
                                                    onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                                                    className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                                                >
                                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </div>

                                        {isExpanded && log.metadata && (
                                            <div className="mt-3 p-3 rounded-lg bg-black/50 border border-gray-800 text-[11px] text-gray-300 font-mono overflow-x-auto">
                                                <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-xs text-gray-500">
                            No audit log events found.
                        </div>
                    )}
                </div>

                {/* Footer / Pagination */}
                <div className="p-4 border-t border-gray-800 bg-[#1e2029] flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                        Page {page} of {totalPages} ({logs.length} events)
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => loadAuditLogs(page - 1)}
                            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-xs text-white transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => loadAuditLogs(page + 1)}
                            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-xs text-white transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormAuditLog;
