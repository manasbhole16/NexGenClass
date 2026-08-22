import React from 'react';
import { 
    X, 
    Download, 
    ExternalLink, 
    FileText, 
    Calendar, 
    User, 
    Layers, 
    Tag, 
    Trash2, 
    Edit2,
    Eye,
    HardDrive,
    Share2
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const FileDetailsPanel = ({ file, isOpen, onClose, onPreview, onRename, onDelete, isTeacher }) => {
    if (!isOpen || !file) return null;

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const downloadUrl = file._id 
        ? `${API_BASE_URL}/api/files/${file._id}/download` 
        : (file.url || '#');

    const handleCopyLink = () => {
        const link = file.isExternalLink ? file.externalUrl : `${window.location.origin}${file.url}`;
        navigator.clipboard.writeText(link);
        alert('File link copied to clipboard!');
    };

    return (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-slideLeft">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">File Details</h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 border border-pink-500/20">
                        {file.category || 'other'}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-6 flex-1 overflow-y-auto custom-scrollbar text-xs">
                {/* File Icon & Name */}
                <div className="text-center p-6 bg-slate-50 dark:bg-slate-950/40 rounded-3xl border border-slate-100 dark:border-slate-800/80 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto border border-pink-500/20">
                        <FileText className="w-8 h-8 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white break-words">
                            {file.originalName}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            {formatBytes(file.size)} • {file.extension || 'file'}
                        </p>
                    </div>
                </div>

                {/* Primary Actions */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onPreview(file)}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl shadow-sm hover:opacity-90 transition-all"
                    >
                        <Eye className="w-4 h-4" /> Preview
                    </button>
                    {!file.isExternalLink ? (
                        <a
                            href={downloadUrl}
                            download={file.originalName}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-2xl transition-all"
                        >
                            <Download className="w-4 h-4" /> Download
                        </a>
                    ) : (
                        <a
                            href={file.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-pink-600 text-white font-bold rounded-2xl shadow-sm hover:bg-pink-700 transition-all"
                        >
                            <ExternalLink className="w-4 h-4" /> Open Link
                        </a>
                    )}
                </div>

                {/* Metadata List */}
                <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Uploaded By
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold">
                            {file.uploadedBy?.fullname || 'System'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between pt-3">
                        <span className="text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Date Added
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold">
                            {new Date(file.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>

                    <div className="flex items-center justify-between pt-3">
                        <span className="text-slate-400 flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5" /> Storage Type
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold uppercase text-[10px]">
                            {file.storageProvider || 'Local Storage'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between pt-3">
                        <span className="text-slate-400 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" /> Category
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold capitalize">
                            {file.category}
                        </span>
                    </div>

                    {file.description && (
                        <div className="pt-3 space-y-1">
                            <span className="text-slate-400 block">Description</span>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                                {file.description}
                            </p>
                        </div>
                    )}
                </div>

                {/* Additional Management Actions */}
                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors"
                    >
                        <Share2 className="w-4 h-4 text-slate-400" /> Copy Resource Link
                    </button>

                    {isTeacher && (
                        <>
                            <button
                                onClick={() => onRename(file)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors"
                            >
                                <Edit2 className="w-4 h-4 text-slate-400" /> Rename / Edit Details
                            </button>
                            <button
                                onClick={() => onDelete(file)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Delete File
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileDetailsPanel;
