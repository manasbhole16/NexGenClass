import React, { useState, useEffect } from 'react';
import { 
    X, 
    Search, 
    FileText, 
    Check, 
    ExternalLink, 
    Layers, 
    Sparkles,
    FolderPlus
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const ResourcePickerModal = ({ isOpen, onClose, onSelectResource, roomId }) => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        if (isOpen && roomId) {
            fetchResources();
        }
    }, [isOpen, roomId, activeCategory]);

    const fetchResources = async () => {
        try {
            setLoading(true);
            let url = `${API_BASE_URL}/api/files?roomId=${roomId}&limit=50`;
            if (activeCategory !== 'all') {
                url += `&category=${activeCategory}`;
            }

            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setResources(data.files || []);
            }
        } catch (err) {
            console.error("Failed to load classroom resources", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const filteredResources = resources.filter(r => 
        !searchQuery || 
        r.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleConfirm = () => {
        const selected = resources.find(r => r._id === selectedId);
        if (selected) {
            onSelectResource({
                title: selected.originalName,
                fileName: selected.originalName,
                fileUrl: selected.url || selected.externalUrl,
                fileType: selected.mimeType,
                fileId: selected._id,
                size: selected.size
            });
            onClose();
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-label="Add from Classroom Resources"
        >
            <div 
                className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                            <FolderPlus className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                            <h3 className="font-black text-base text-slate-900 dark:text-white">Classroom Resources</h3>
                            <p className="text-xs text-slate-400">Select an existing document to attach to this assignment.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Filter & Search */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search resources by title or keyword..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs font-bold">
                        {['all', 'document', 'pdf', 'image', 'video', 'spreadsheet', 'presentation', 'code', 'archive'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-3 py-1 rounded-xl capitalize whitespace-nowrap transition-all ${
                                    activeCategory === cat
                                        ? 'bg-pink-600 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List of Resources */}
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/60">
                    {loading ? (
                        <div className="py-16 text-center text-xs text-slate-400 font-medium">Loading classroom resources...</div>
                    ) : filteredResources.length === 0 ? (
                        <div className="py-16 text-center space-y-2">
                            <Sparkles className="w-8 h-8 text-pink-500/30 mx-auto" />
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No resources found</p>
                            <p className="text-[11px] text-slate-400">Upload resources in the Resources tab or add a new file directly.</p>
                        </div>
                    ) : (
                        filteredResources.map(res => (
                            <div
                                key={res._id}
                                onClick={() => setSelectedId(res._id)}
                                className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                    selectedId === res._id
                                        ? 'bg-pink-500/10 border border-pink-500/30'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                        <FileText className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {res.originalName}
                                        </h4>
                                        <p className="text-[11px] text-slate-400">
                                            {formatBytes(res.size)} • {res.category}
                                        </p>
                                    </div>
                                </div>

                                <div className="shrink-0">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                        selectedId === res._id
                                            ? 'bg-pink-600 border-pink-600 text-white'
                                            : 'border-slate-300 dark:border-slate-600'
                                    }`}>
                                        {selectedId === res._id && <Check className="w-3 h-3" />}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedId}
                        className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-pink-600/20 disabled:opacity-40 transition-all"
                    >
                        Attach Selected Resource
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResourcePickerModal;
