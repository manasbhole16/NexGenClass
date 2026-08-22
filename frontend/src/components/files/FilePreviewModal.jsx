import React, { useEffect } from 'react';
import { 
    X, 
    Download, 
    ExternalLink, 
    FileText, 
    Image as ImageIcon, 
    FileCode, 
    Film, 
    FileArchive, 
    FileSpreadsheet,
    FileQuestion,
    Eye
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const FilePreviewModal = ({ file, isOpen, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !file) return null;

    const fileUrl = file.url?.startsWith('http') || file.url?.startsWith('data:')
        ? file.url
        : `${API_BASE_URL.replace('/api', '')}${file.url || ''}`;

    const downloadUrl = file._id 
        ? `${API_BASE_URL}/api/files/${file._id}/download` 
        : fileUrl;

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const renderPreviewContent = () => {
        if (file.isExternalLink) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <ExternalLink className="w-16 h-16 text-pink-500" />
                    <div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white">{file.originalName}</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-md break-all">{file.externalUrl}</p>
                    </div>
                    <a
                        href={file.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-pink-600/20 transition-all"
                    >
                        Open External Resource <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            );
        }

        const category = file.category || 'other';
        const mime = (file.mimeType || '').toLowerCase();

        // 1. PDF Embedded Viewer
        if (category === 'pdf' || mime === 'application/pdf') {
            return (
                <iframe
                    src={`${fileUrl}#toolbar=0`}
                    title={file.originalName}
                    className="w-full h-[65vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white"
                />
            );
        }

        // 2. Images
        if (category === 'image' || mime.startsWith('image/')) {
            return (
                <div className="flex items-center justify-center p-4 bg-slate-950/40 rounded-2xl max-h-[65vh] overflow-hidden">
                    <img
                        src={fileUrl}
                        alt={file.originalName}
                        className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md"
                    />
                </div>
            );
        }

        // 3. Video Player
        if (category === 'video' || mime.startsWith('video/')) {
            return (
                <div className="flex items-center justify-center p-4 bg-slate-950 rounded-2xl max-h-[65vh]">
                    <video controls className="max-h-[60vh] max-w-full rounded-xl">
                        <source src={fileUrl} type={file.mimeType} />
                        Your browser does not support the video tag.
                    </video>
                </div>
            );
        }

        // 4. Default / Documents / Spreadsheets / Code
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                <div className="w-20 h-20 rounded-3xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                    <FileText className="w-10 h-10 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="space-y-1">
                    <h4 className="text-base font-black text-slate-900 dark:text-white max-w-md truncate">
                        {file.originalName}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatBytes(file.size)} • {file.mimeType || 'Document'}
                    </p>
                </div>
                <p className="text-xs text-slate-400 max-w-sm">
                    This file format does not support in-browser visual preview. Click below to download and open locally.
                </p>
                <a
                    href={downloadUrl}
                    download={file.originalName}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-2xl shadow-sm hover:opacity-90 transition-all"
                >
                    <Download className="w-4 h-4" /> Download File
                </a>
            </div>
        );
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-label="File Preview"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                            <Eye className="w-5 h-5 text-pink-500" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                                {file.originalName}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {formatBytes(file.size)} {file.uploadedBy?.fullname ? `• Uploaded by ${file.uploadedBy.fullname}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {!file.isExternalLink && (
                            <a
                                href={downloadUrl}
                                download={file.originalName}
                                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                                title="Download"
                            >
                                <Download className="w-4 h-4" />
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {renderPreviewContent()}
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;
