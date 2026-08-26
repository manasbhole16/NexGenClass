import React, { useState, useEffect, useRef } from 'react';
import { 
    Upload, 
    Link as LinkIcon, 
    Search, 
    Grid, 
    List, 
    Filter, 
    MoreVertical, 
    Download, 
    Eye, 
    Trash2, 
    Edit2, 
    Info, 
    FileText, 
    Image as ImageIcon, 
    FileCode, 
    Film, 
    FileArchive, 
    FileSpreadsheet, 
    Folder, 
    ExternalLink, 
    Plus, 
    Sparkles, 
    Check, 
    X,
    Layers,
    ChevronDown,
    ArrowUpDown,
    CloudUpload
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import FilePreviewModal from './FilePreviewModal';
import FileDetailsPanel from './FileDetailsPanel';
import DocumentSummaryPanel from '../ai/DocumentSummaryPanel';
import { useSocket } from '../../context/SocketContext';

const ClassroomFilesTab = ({ roomId, isTeacher, user }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modals
    const [previewFile, setPreviewFile] = useState(null);
    const [selectedDetailsFile, setSelectedDetailsFile] = useState(null);
    const [summaryModalFile, setSummaryModalFile] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [editingFile, setEditingFile] = useState(null);
    const [newFileName, setNewFileName] = useState('');

    // Upload state
    const [uploadingFiles, setUploadingFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Link state
    const [linkTitle, setLinkTitle] = useState('');
    const [linkUrl, setLinkUrl] = useState('');

    const socket = useSocket();

    useEffect(() => {
        if (roomId) {
            fetchFiles();
        }
    }, [roomId, activeCategory, sortBy, page]);

    // Real-time Socket.IO Listeners
    useEffect(() => {
        if (!socket || !roomId) return;

        const handleFileUploaded = ({ files: newFiles }) => {
            if (Array.isArray(newFiles)) {
                setFiles(prev => [...newFiles, ...prev.filter(f => !newFiles.some(nf => nf._id === f._id))]);
            }
        };

        const handleFileUpdated = ({ file: updatedFile }) => {
            if (updatedFile) {
                setFiles(prev => prev.map(f => f._id === updatedFile._id ? updatedFile : f));
            }
        };

        const handleFileDeleted = ({ fileId }) => {
            if (fileId) {
                setFiles(prev => prev.filter(f => f._id !== fileId));
            }
        };

        socket.on("file:uploaded", handleFileUploaded);
        socket.on("file:updated", handleFileUpdated);
        socket.on("file:deleted", handleFileDeleted);

        return () => {
            socket.off("file:uploaded", handleFileUploaded);
            socket.off("file:updated", handleFileUpdated);
            socket.off("file:deleted", handleFileDeleted);
        };
    }, [socket, roomId]);

    const fetchFiles = async () => {
        try {
            setLoading(true);
            let url = `${API_BASE_URL}/api/files?roomId=${roomId}&sort=${sortBy}&page=${page}&limit=30`;
            if (activeCategory !== 'all' && activeCategory !== 'my_uploads') {
                url += `&category=${activeCategory}`;
            }
            if (activeCategory === 'my_uploads') {
                url += `&uploader=${user?._id}`;
            }

            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setFiles(data.files || []);
                setTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            console.error("Failed to load files", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadFiles = async (filesList) => {
        if (!filesList || filesList.length === 0) return;
        try {
            setIsUploading(true);
            setUploadProgress(20);

            const formData = new FormData();
            formData.append('roomId', roomId);
            formData.append('entityType', 'classroom_resource');
            formData.append('visibility', 'classroom');

            for (let i = 0; i < filesList.length; i++) {
                formData.append('files', filesList[i]);
            }

            setUploadProgress(50);
            const res = await fetch(`${API_BASE_URL}/api/files/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const data = await res.json();
            setUploadProgress(100);

            if (data.success) {
                setFiles(prev => [...(data.files || [data.file]), ...prev]);
                setShowUploadModal(false);
                setUploadingFiles([]);
            } else {
                alert(data.message || 'Upload failed');
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Upload error occurred. Check file size limits.");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleAddLink = async (e) => {
        e.preventDefault();
        if (!linkTitle.trim() || !linkUrl.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/files/external-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    title: linkTitle.trim(),
                    url: linkUrl.trim()
                }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setFiles(prev => [data.file, ...prev]);
                setShowLinkModal(false);
                setLinkTitle('');
                setLinkUrl('');
            } else {
                alert(data.message || 'Failed to add link');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRenameFile = async () => {
        if (!editingFile || !newFileName.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/files/${editingFile._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ originalName: newFileName.trim() }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setFiles(prev => prev.map(f => f._id === editingFile._id ? data.file : f));
                setEditingFile(null);
                setNewFileName('');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteFile = async (file) => {
        if (!window.confirm(`Are you sure you want to delete "${file.originalName}"?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/files/${file._id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setFiles(prev => prev.filter(f => f._id !== file._id));
                if (selectedDetailsFile?._id === file._id) {
                    setSelectedDetailsFile(null);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getFileIcon = (category) => {
        switch (category) {
            case 'pdf': return <FileText className="w-5 h-5 text-rose-500" />;
            case 'image': return <ImageIcon className="w-5 h-5 text-emerald-500" />;
            case 'video': return <Film className="w-5 h-5 text-purple-500" />;
            case 'spreadsheet': return <FileSpreadsheet className="w-5 h-5 text-teal-500" />;
            case 'code': return <FileCode className="w-5 h-5 text-indigo-500" />;
            case 'archive': return <FileArchive className="w-5 h-5 text-amber-500" />;
            default: return <FileText className="w-5 h-5 text-pink-500" />;
        }
    };

    const filteredFiles = files.filter(f => 
        !searchQuery || 
        f.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fadeIn pb-16">
            {/* Header & Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-sm">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Folder className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                        Classroom Resources & Files
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Google Drive-style academic repository. Upload lecture notes, syllabus, slides, and shared code.
                    </p>
                </div>

                {isTeacher && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowLinkModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl transition-all shadow-sm"
                        >
                            <LinkIcon className="w-4 h-4 text-pink-500" /> Add Link
                        </button>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-pink-600/20 transition-all active:scale-95"
                        >
                            <Upload className="w-4 h-4" /> Upload Files
                        </button>
                    </div>
                )}
            </div>

            {/* Filter Pills, Search & View Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
                    <Search className="w-4 h-4 text-slate-400 ml-1" />
                    <input
                        type="text"
                        placeholder="Search resources by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none font-medium"
                    />
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    {/* Sort Dropdown */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        aria-label="Sort files"
                        className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-1.5 outline-none border-0 cursor-pointer"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="name_asc">Name (A-Z)</option>
                        <option value="name_desc">Name (Z-A)</option>
                        <option value="size_desc">Size (Largest)</option>
                        <option value="size_asc">Size (Smallest)</option>
                    </select>

                    {/* View Switcher */}
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-pink-600 shadow-sm' : 'text-slate-400'}`}
                            title="Grid View"
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-pink-600 shadow-sm' : 'text-slate-400'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs font-bold">
                {[
                    { id: 'all', label: 'All Files' },
                    { id: 'pdf', label: 'PDFs' },
                    { id: 'document', label: 'Documents' },
                    { id: 'image', label: 'Images' },
                    { id: 'spreadsheet', label: 'Spreadsheets' },
                    { id: 'code', label: 'Code' },
                    { id: 'video', label: 'Videos' },
                    { id: 'archive', label: 'Archives' },
                    { id: 'my_uploads', label: 'My Uploads' }
                ].map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => { setActiveCategory(cat.id); setPage(1); }}
                        className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                            activeCategory === cat.id
                                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20'
                                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="py-24 text-center text-xs text-slate-400 font-medium">Loading classroom documents...</div>
            ) : filteredFiles.length === 0 ? (
                <div className="max-w-md mx-auto text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3 shadow-sm">
                    <Sparkles className="w-12 h-12 text-pink-500/30 mx-auto" />
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-200">No resources available</h3>
                    <p className="text-xs text-slate-400">
                        {isTeacher 
                            ? "Upload study materials or link Google Drive documents for your class." 
                            : "Your instructor hasn't uploaded any documents matching this category yet."}
                    </p>
                </div>
            ) : viewMode === 'grid' ? (
                /* GRID VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredFiles.map(file => (
                        <div
                            key={file._id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-pink-500/40 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                                        {getFileIcon(file.category)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setSummaryModalFile(file)}
                                            className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 transition-colors"
                                            title="AI Summarize"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setSelectedDetailsFile(file)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                            title="Details"
                                        >
                                            <Info className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setPreviewFile(file)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                            title="Preview"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h4 
                                        onClick={() => setPreviewFile(file)}
                                        className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 cursor-pointer hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                                    >
                                        {file.originalName}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {formatBytes(file.size)} • {file.category}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                <span>{file.uploadedBy?.fullname?.split(' ')[0] || 'System'}</span>
                                <div className="flex items-center gap-1">
                                    {!file.isExternalLink ? (
                                        <a
                                            href={`${API_BASE_URL}/api/files/${file._id}/download`}
                                            download={file.originalName}
                                            className="p-1 hover:text-pink-600 transition-colors"
                                            title="Download"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </a>
                                    ) : (
                                        <a
                                            href={file.externalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 hover:text-pink-600 transition-colors"
                                            title="Open External"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    {isTeacher && (
                                        <button
                                            onClick={() => handleDeleteFile(file)}
                                            className="p-1 hover:text-rose-500 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* LIST VIEW */
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredFiles.map(file => (
                        <div
                            key={file._id}
                            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                    {getFileIcon(file.category)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 
                                        onClick={() => setPreviewFile(file)}
                                        className="text-xs font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-pink-600 transition-colors"
                                    >
                                        {file.originalName}
                                    </h4>
                                    <p className="text-[11px] text-slate-400">
                                        {formatBytes(file.size)} • Added by {file.uploadedBy?.fullname || 'Teacher'} on {new Date(file.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                                <button
                                    onClick={() => setSummaryModalFile(file)}
                                    className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold text-purple-600 dark:text-purple-400 transition-colors flex items-center gap-1"
                                    title="AI Summarize"
                                >
                                    <Sparkles className="w-3.5 h-3.5" /> Summarize
                                </button>
                                <button
                                    onClick={() => setPreviewFile(file)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                                >
                                    <Eye className="w-3.5 h-3.5 inline mr-1" /> Preview
                                </button>
                                {!file.isExternalLink ? (
                                    <a
                                        href={`${API_BASE_URL}/api/files/${file._id}/download`}
                                        download={file.originalName}
                                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                        title="Download"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                ) : (
                                    <a
                                        href={file.externalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-xl hover:bg-pink-50 text-pink-600 transition-colors"
                                        title="Open Link"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                                <button
                                    onClick={() => setSelectedDetailsFile(file)}
                                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    title="Details"
                                >
                                    <Info className="w-4 h-4" />
                                </button>
                                {isTeacher && (
                                    <button
                                        onClick={() => handleDeleteFile(file)}
                                        className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* PREVIEW MODAL */}
            {previewFile && (
                <FilePreviewModal
                    file={previewFile}
                    isOpen={!!previewFile}
                    onClose={() => setPreviewFile(null)}
                />
            )}

            {/* AI SUMMARY PANEL */}
            {summaryModalFile && (
                <DocumentSummaryPanel
                    file={summaryModalFile}
                    isOpen={!!summaryModalFile}
                    onClose={() => setSummaryModalFile(null)}
                />
            )}

            {/* DETAILS PANEL */}
            {selectedDetailsFile && (
                <FileDetailsPanel
                    file={selectedDetailsFile}
                    isOpen={!!selectedDetailsFile}
                    onClose={() => setSelectedDetailsFile(null)}
                    onPreview={(f) => { setSelectedDetailsFile(null); setPreviewFile(f); }}
                    onRename={(f) => { setSelectedDetailsFile(null); setEditingFile(f); setNewFileName(f.originalName); }}
                    onDelete={(f) => handleDeleteFile(f)}
                    isTeacher={isTeacher}
                />
            )}

            {/* UPLOAD MODAL */}
            {showUploadModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Upload Resources"
                >
                    <div 
                        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-scaleUp"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                                <CloudUpload className="w-5 h-5 text-pink-500" /> Upload Classroom Resources
                            </h3>
                            <button onClick={() => setShowUploadModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Drop Zone */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-pink-500 rounded-3xl p-8 text-center cursor-pointer space-y-3 transition-colors bg-slate-50/50 dark:bg-slate-950/30"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={(e) => setUploadingFiles(Array.from(e.target.files || []))}
                                className="hidden"
                            />
                            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto text-pink-600 dark:text-pink-400">
                                <Upload className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Click or drag files to upload
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Supports PDF, Word, Excel, Images, Videos, Code & Archives up to 25MB.
                                </p>
                            </div>
                        </div>

                        {/* Selected Files List */}
                        {uploadingFiles.length > 0 && (
                            <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                                {uploadingFiles.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl font-medium">
                                        <span className="truncate max-w-[280px]">{f.name}</span>
                                        <span className="text-slate-400 text-[11px]">{formatBytes(f.size)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {isUploading && (
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div className="bg-pink-600 h-2 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleUploadFiles(uploadingFiles)}
                                disabled={uploadingFiles.length === 0 || isUploading}
                                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-pink-600/20 disabled:opacity-40"
                            >
                                {isUploading ? 'Uploading...' : `Upload ${uploadingFiles.length} File(s)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LINK MODAL */}
            {showLinkModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Add Link"
                >
                    <form 
                        onSubmit={handleAddLink}
                        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-scaleUp"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                                <LinkIcon className="w-5 h-5 text-pink-500" /> Add External / Drive Resource
                            </h3>
                            <button type="button" onClick={() => setShowLinkModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="space-y-1">
                                <label className="font-bold text-slate-700 dark:text-slate-300">Resource Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Google Drive Lecture Slides"
                                    value={linkTitle}
                                    onChange={(e) => setLinkTitle(e.target.value)}
                                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-pink-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-slate-700 dark:text-slate-300">URL / Google Drive Link</label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://drive.google.com/..."
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-pink-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowLinkModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-md shadow-pink-600/20"
                            >
                                Save Resource
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* RENAME MODAL */}
            {editingFile && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Rename File"
                >
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-scaleUp">
                        <h3 className="font-black text-base text-slate-900 dark:text-white">Rename File</h3>
                        <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-pink-500"
                        />
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setEditingFile(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRenameFile}
                                className="px-4 py-2 rounded-2xl bg-pink-600 text-white text-xs font-bold shadow-md shadow-pink-600/20"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassroomFilesTab;
