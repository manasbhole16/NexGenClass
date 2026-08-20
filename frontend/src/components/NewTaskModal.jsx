import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Calendar, Clock, Tag, Loader, Sparkles, Plus, Trash2, Paperclip,
    Link as LinkIcon, BookOpen, Layers, Users, FileText, CheckCircle,
    Eye, EyeOff, HelpCircle, ExternalLink, Github, HardDrive
} from 'lucide-react';
import API_BASE_URL from '../apiConfig';

const NewTaskModal = ({
    isOpen,
    onClose,
    onSave,
    onTyping,
    roomId,
    roomDetails,
    existingTopics = [],
    initialTaskType = 'assignment',
    initialTopic = 'General'
}) => {
    const isClassroom = Boolean(roomId && roomId !== 'personal');
    const membersList = (roomDetails?.members || []).filter(m => (m._id || m) !== (roomDetails?.owner?._id || roomDetails?.owner));

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'Todo',
        dueDate: '',
        dueTime: '23:59',
        tags: '',
        maxMarks: 100,
        taskType: initialTaskType,
        topic: initialTopic,
        isUngraded: false
    });

    const [isCustomTopic, setIsCustomTopic] = useState(false);
    const [customTopic, setCustomTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPreview, setIsPreview] = useState(false);

    // AI Assist
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [showAiBox, setShowAiBox] = useState(false);

    // Deliverables & Rubric
    const [subtasks, setSubtasks] = useState([]);
    const [rubric, setRubric] = useState([]);

    // Attachments & Links
    const [attachments, setAttachments] = useState([]);
    const [linkInput, setLinkInput] = useState({ title: '', url: '' });
    const [showLinkInput, setShowLinkInput] = useState(false);

    // Audience: Empty array means all students, otherwise array of student IDs
    const [assignTarget, setAssignTarget] = useState('all'); // 'all' | 'custom'
    const [assignedStudents, setAssignedStudents] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                taskType: initialTaskType || 'assignment',
                topic: initialTopic || 'General'
            }));
            setIsPreview(false);
            setShowAiBox(false);
        }
    }, [isOpen, initialTaskType, initialTopic]);

    const handleFocus = () => onTyping?.(true);
    const handleBlur = () => onTyping?.(false);

    const normalizeDate = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    };

    const handleGenerateDraft = async () => {
        if (!aiPrompt.trim()) return;
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt, roomId }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                const draft = data.draft;
                setFormData(prev => ({
                    ...prev,
                    title: draft.title || prev.title,
                    description: draft.description || prev.description,
                    dueDate: normalizeDate(draft.dueDateSuggestion) || prev.dueDate,
                    tags: Array.isArray(draft.tags) ? draft.tags.join(', ') : prev.tags
                }));
                if (Array.isArray(draft.subtasks)) setSubtasks(draft.subtasks);
                if (Array.isArray(draft.rubric)) setRubric(draft.rubric);
                setShowAiBox(false);
            } else {
                setAiError(data.message || 'AI generation failed');
            }
        } catch (err) {
            setAiError('AI generation service error');
            console.error(err);
        } finally {
            setAiLoading(false);
        }
    };

    // Subtasks handlers
    const handleSubtaskChange = (index, value) => {
        setSubtasks(prev => prev.map((s, i) => (i === index ? { ...s, title: value } : s)));
    };
    const handleAddSubtask = () => {
        setSubtasks(prev => [...prev, { title: '' }]);
    };
    const handleRemoveSubtask = (index) => {
        setSubtasks(prev => prev.filter((_, i) => i !== index));
    };

    // Rubric handlers
    const handleRubricChange = (index, field, value) => {
        setRubric(prev => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    };
    const handleAddRubric = () => {
        setRubric(prev => [...prev, { criterion: '', points: 10, description: '' }]);
    };
    const handleRemoveRubric = (index) => {
        setRubric(prev => prev.filter((_, i) => i !== index));
    };

    // File attachments (Base64)
    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const fileUrl = event.target.result;
                setAttachments(prev => [
                    ...prev,
                    {
                        title: file.name,
                        fileName: file.name,
                        fileUrl: fileUrl,
                        fileType: file.type || 'file'
                    }
                ]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleAddLink = () => {
        if (!linkInput.url.trim()) return;
        let iconType = 'link';
        const urlLower = linkInput.url.toLowerCase();
        if (urlLower.includes('github.com')) iconType = 'github';
        else if (urlLower.includes('drive.google.com') || urlLower.includes('docs.google.com')) iconType = 'drive';

        setAttachments(prev => [
            ...prev,
            {
                title: linkInput.title.trim() || linkInput.url.trim(),
                fileName: linkInput.title.trim() || 'External Resource',
                fileUrl: linkInput.url.trim(),
                fileType: iconType
            }
        ]);
        setLinkInput({ title: '', url: '' });
        setShowLinkInput(false);
    };

    const handleRemoveAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleToggleStudent = (studentId) => {
        setAssignedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const handleSubmit = async (e, draftMode = false) => {
        if (e) e.preventDefault();
        if (!formData.title.trim()) {
            alert("Title is required.");
            return;
        }

        setLoading(true);
        try {
            const cleanedSubtasks = subtasks
                .map(s => ({ title: String(s.title || '').trim() }))
                .filter(s => s.title);

            const cleanedRubric = rubric
                .map(r => ({
                    criterion: String(r.criterion || '').trim(),
                    points: Number(r.points) || 0,
                    description: String(r.description || '').trim()
                }))
                .filter(r => r.criterion);

            const finalTopic = isCustomTopic
                ? (customTopic.trim() || 'General')
                : (formData.topic || 'General');

            let finalDueDate = null;
            if (formData.dueDate) {
                const timeStr = formData.dueTime || '23:59';
                finalDueDate = new Date(`${formData.dueDate}T${timeStr}:00`);
            }

            const targetStudentList = assignTarget === 'custom' ? assignedStudents : [];

            const taskData = {
                ...formData,
                title: formData.title.trim(),
                description: formData.description.trim(),
                topic: finalTopic,
                category: finalTopic,
                dueDate: finalDueDate,
                maxMarks: formData.isUngraded ? 0 : (Number(formData.maxMarks) || 100),
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                subtasks: cleanedSubtasks,
                rubric: cleanedRubric,
                attachments,
                assignedTo: targetStudentList,
                isDraft: draftMode
            };

            await onSave(taskData);

            // Reset
            setFormData({
                title: '',
                description: '',
                priority: 'Medium',
                status: 'Todo',
                dueDate: '',
                dueTime: '23:59',
                tags: '',
                maxMarks: 100,
                taskType: 'assignment',
                topic: 'General',
                isUngraded: false
            });
            setCustomTopic('');
            setIsCustomTopic(false);
            setSubtasks([]);
            setRubric([]);
            setAttachments([]);
            setAssignedStudents([]);
            setAssignTarget('all');
            onClose();
        } catch (err) {
            console.error("Task Save Error", err);
        } finally {
            setLoading(false);
        }
    };

    const roomTopicNames = (roomDetails?.topics || []).map(t => t.name);
    const topicsAvailable = Array.from(new Set(['General', ...roomTopicNames, ...existingTopics])).filter(Boolean);
    const totalRubricScore = rubric.reduce((sum, r) => sum + (Number(r.points) || 0), 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 15 }}
                        className="w-full max-w-4xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl relative z-10 overflow-hidden max-h-[92vh] flex flex-col"
                    >
                        {/* 1. Modal Top Bar */}
                        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/30">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-2xl ${
                                    formData.taskType === 'material'
                                        ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                                        : 'bg-purple-600/10 text-purple-600 dark:text-purple-400'
                                }`}>
                                    {formData.taskType === 'material' ? <BookOpen className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                                        {isClassroom
                                            ? (formData.taskType === 'material' ? 'Create Reference Material' : 'Create Classwork Assignment')
                                            : 'Create Personal Objective'}
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {isClassroom ? 'Google Classroom-inspired coursework publishing' : 'Private to-do item'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPreview(!isPreview)}
                                    className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors"
                                >
                                    {isPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {isPreview ? "Exit Preview" : "Preview"}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* 2. Main Content Area */}
                        {isPreview ? (
                            /* Preview Mode */
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl flex items-center justify-between">
                                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                        Student View Preview
                                    </span>
                                    <span className="text-xs text-gray-500">How enrolled students will see this item</span>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                                            {isCustomTopic ? customTopic : formData.topic}
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                                            {formData.isUngraded ? 'Ungraded' : `${formData.maxMarks || 100} pts`}
                                        </span>
                                        {formData.dueDate && (
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Due {formData.dueDate} {formData.dueTime}
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">{formData.title || 'Untitled Assignment'}</h1>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase text-gray-500">Instructions</h3>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                        {formData.description || 'No instructions provided.'}
                                    </p>
                                </div>

                                {attachments.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold uppercase text-gray-500">Attached Materials ({attachments.length})</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {attachments.map((att, i) => (
                                                <div key={i} className="p-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl flex items-center gap-3">
                                                    <Paperclip className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{att.title || att.fileName}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {rubric.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold uppercase text-gray-500">Grading Rubric ({totalRubricScore} pts)</h3>
                                        <div className="space-y-2">
                                            {rubric.map((r, i) => (
                                                <div key={i} className="p-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl flex justify-between items-start">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white">{r.criterion || 'Criterion'}</p>
                                                        {r.description && <p className="text-[11px] text-gray-500 mt-0.5">{r.description}</p>}
                                                    </div>
                                                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{r.points} pts</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Editor Mode: Two-Column Form Layout */
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                
                                {/* LEFT 2 COLUMNS: Core Content */}
                                <div className="lg:col-span-2 space-y-5">
                                    
                                    {/* Task Type Toggle */}
                                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-black/40 rounded-xl w-fit">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, taskType: 'assignment' })}
                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                formData.taskType === 'assignment'
                                                    ? 'bg-purple-600 text-white shadow-sm'
                                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                            }`}
                                        >
                                            Assignment
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, taskType: 'material' })}
                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                formData.taskType === 'material'
                                                    ? 'bg-cyan-600 text-white shadow-sm'
                                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                            }`}
                                        >
                                            Reference Material
                                        </button>
                                    </div>

                                    {/* AI Assistant Toggle Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowAiBox(!showAiBox)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-xl text-xs font-bold hover:bg-purple-500/20 transition-all"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        {showAiBox ? "Hide AI Generator" : "Draft with AI Assistant"}
                                    </button>

                                    {/* AI Generator Box */}
                                    {showAiBox && (
                                        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 rounded-2xl space-y-3 animate-in fade-in">
                                            <label className="block text-xs font-bold text-purple-900 dark:text-purple-200">
                                                Describe your curriculum objective:
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={aiPrompt}
                                                    onChange={e => setAiPrompt(e.target.value)}
                                                    placeholder="e.g., Week 4 Python Data Structures assignment on Dictionaries and Sets with rubrics"
                                                    className="flex-1 px-3 py-2 bg-white dark:bg-black/40 border border-purple-300 dark:border-purple-700/40 rounded-xl text-xs outline-none text-gray-900 dark:text-white focus:border-purple-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateDraft}
                                                    disabled={aiLoading || !aiPrompt.trim()}
                                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                                                >
                                                    {aiLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                    {aiLoading ? "Generating..." : "Generate"}
                                                </button>
                                            </div>
                                            {aiError && <p className="text-[11px] text-red-500">{aiError}</p>}
                                        </div>
                                    )}

                                    {/* Title Input */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                                            Title *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            onFocus={handleFocus}
                                            onBlur={handleBlur}
                                            placeholder={formData.taskType === 'material' ? "e.g., Lecture 5: Quantum Computing Slides" : "e.g., Lab 3: Matrix Multiplication Benchmark"}
                                            className="w-full px-4 py-3 bg-white dark:bg-[#1f1f23] border border-gray-300 dark:border-white/10 rounded-2xl text-sm font-semibold outline-none focus:border-purple-500 text-gray-900 dark:text-white transition-colors"
                                        />
                                    </div>

                                    {/* Instructions / Description */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                                            Instructions & Content (Optional)
                                        </label>
                                        <textarea
                                            rows="4"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            onFocus={handleFocus}
                                            onBlur={handleBlur}
                                            placeholder="Provide thorough assignment instructions, submission requirements, and resources..."
                                            className="w-full px-4 py-3 bg-white dark:bg-[#1f1f23] border border-gray-300 dark:border-white/10 rounded-2xl text-xs sm:text-sm outline-none focus:border-purple-500 text-gray-900 dark:text-white transition-colors resize-y leading-relaxed"
                                        />
                                    </div>

                                    {/* Attachments Section */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                                <Paperclip className="w-3.5 h-3.5 text-purple-500" /> Attached Resources ({attachments.length})
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                    id="teacher-file-input"
                                                />
                                                <label
                                                    htmlFor="teacher-file-input"
                                                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer transition-colors flex items-center gap-1"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Upload Files
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowLinkInput(!showLinkInput)}
                                                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1"
                                                >
                                                    <LinkIcon className="w-3.5 h-3.5" /> Add Link
                                                </button>
                                            </div>
                                        </div>

                                        {/* Link Input Sub-form */}
                                        {showLinkInput && (
                                            <div className="p-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl space-y-2 animate-in fade-in">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Resource Title (e.g. GitHub Repo / Drive Docs)"
                                                        value={linkInput.title}
                                                        onChange={e => setLinkInput({ ...linkInput, title: e.target.value })}
                                                        className="px-3 py-1.5 bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-xl text-xs outline-none text-gray-900 dark:text-white"
                                                    />
                                                    <input
                                                        type="url"
                                                        placeholder="https://..."
                                                        value={linkInput.url}
                                                        onChange={e => setLinkInput({ ...linkInput, url: e.target.value })}
                                                        className="px-3 py-1.5 bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-xl text-xs outline-none text-gray-900 dark:text-white font-mono"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowLinkInput(false)}
                                                        className="px-3 py-1 text-xs text-gray-500"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddLink}
                                                        disabled={!linkInput.url.trim()}
                                                        className="px-4 py-1 bg-purple-600 text-white font-bold rounded-lg text-xs"
                                                    >
                                                        Add Resource
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Attachment Chips */}
                                        {attachments.length > 0 && (
                                            <div className="space-y-2">
                                                {attachments.map((att, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl text-xs">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            {att.fileType === 'github' ? (
                                                                <Github className="w-4 h-4 text-gray-800 dark:text-white flex-shrink-0" />
                                                            ) : att.fileType === 'drive' ? (
                                                                <HardDrive className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                            ) : att.fileType === 'link' ? (
                                                                <LinkIcon className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                                                            ) : (
                                                                <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                                            )}
                                                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate" title={att.fileUrl}>
                                                                {att.title || att.fileName}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAttachment(index)}
                                                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Rubric Builder (Only for Assignments) */}
                                    {formData.taskType === 'assignment' && (
                                        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-white/10">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                                    Grading Rubric ({totalRubricScore} pts)
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={handleAddRubric}
                                                    className="px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold flex items-center gap-1"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Add Criterion
                                                </button>
                                            </div>

                                            {rubric.map((r, i) => (
                                                <div key={i} className="p-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl space-y-2">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Criterion (e.g. Code Efficiency, Accuracy)"
                                                            value={r.criterion}
                                                            onChange={e => handleRubricChange(i, 'criterion', e.target.value)}
                                                            className="flex-1 px-3 py-1.5 bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-xl text-xs font-semibold outline-none text-gray-900 dark:text-white"
                                                        />
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="500"
                                                            placeholder="Pts"
                                                            value={r.points}
                                                            onChange={e => handleRubricChange(i, 'points', Number(e.target.value))}
                                                            className="w-20 px-3 py-1.5 bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold text-purple-600 outline-none text-right"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveRubric(i)}
                                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Description / Expectations (optional)"
                                                        value={r.description}
                                                        onChange={e => handleRubricChange(i, 'description', e.target.value)}
                                                        className="w-full px-3 py-1 bg-white dark:bg-[#18181c] border border-gray-300 dark:border-white/10 rounded-xl text-xs outline-none text-gray-600 dark:text-gray-400"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                </div>

                                {/* RIGHT SIDEBAR: Settings & Targets */}
                                <div className="space-y-5 bg-gray-50 dark:bg-black/20 p-5 rounded-3xl border border-gray-200 dark:border-white/10 h-fit">
                                    
                                    {/* 1. For / Assigned Target */}
                                    {isClassroom && (
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5 text-purple-500" /> For (Audience)
                                            </label>
                                            <div className="flex gap-2 mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setAssignTarget('all'); setAssignedStudents([]); }}
                                                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                        assignTarget === 'all'
                                                            ? 'bg-purple-600 text-white shadow-sm'
                                                            : 'bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300'
                                                    }`}
                                                >
                                                    All Students
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAssignTarget('custom')}
                                                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                        assignTarget === 'custom'
                                                            ? 'bg-purple-600 text-white shadow-sm'
                                                            : 'bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300'
                                                    }`}
                                                >
                                                    Select ({assignedStudents.length})
                                                </button>
                                            </div>

                                            {assignTarget === 'custom' && (
                                                <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl">
                                                    {membersList.map(s => (
                                                        <label key={s._id} className="flex items-center gap-2 text-xs p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={assignedStudents.includes(s._id)}
                                                                onChange={() => handleToggleStudent(s._id)}
                                                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                            />
                                                            <span className="truncate text-gray-800 dark:text-gray-200">{s.fullname}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. Points / Max Marks */}
                                    {formData.taskType === 'assignment' && (
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                                    Points / Marks
                                                </label>
                                                <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.isUngraded}
                                                        onChange={e => setFormData({ ...formData, isUngraded: e.target.checked })}
                                                        className="rounded text-purple-600"
                                                    />
                                                    Ungraded
                                                </label>
                                            </div>
                                            {!formData.isUngraded && (
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="1000"
                                                    value={formData.maxMarks}
                                                    onChange={e => setFormData({ ...formData, maxMarks: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-400 outline-none"
                                                />
                                            )}
                                        </div>
                                    )}

                                    {/* 3. Due Date & Time */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-purple-500" /> Due Date
                                        </label>
                                        <div className="space-y-2">
                                            <input
                                                type="date"
                                                value={formData.dueDate}
                                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl text-xs outline-none text-gray-800 dark:text-gray-200"
                                            />
                                            {formData.dueDate && (
                                                <input
                                                    type="time"
                                                    value={formData.dueTime}
                                                    onChange={e => setFormData({ ...formData, dueTime: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl text-xs outline-none text-gray-800 dark:text-gray-200 font-mono"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* 4. Topic Dropdown */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                                <Layers className="w-3.5 h-3.5 text-purple-500" /> Topic
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setIsCustomTopic(!isCustomTopic)}
                                                className="text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline"
                                            >
                                                {isCustomTopic ? "Select existing" : "+ New topic"}
                                            </button>
                                        </div>

                                        {isCustomTopic ? (
                                            <input
                                                type="text"
                                                placeholder="Enter new topic name..."
                                                value={customTopic}
                                                onChange={e => setCustomTopic(e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-purple-400 dark:border-purple-600/40 rounded-xl text-xs outline-none text-gray-800 dark:text-gray-200"
                                                autoFocus
                                            />
                                        ) : (
                                            <select
                                                value={formData.topic}
                                                onChange={e => {
                                                    if (e.target.value === '__CREATE_NEW__') {
                                                        setIsCustomTopic(true);
                                                    } else {
                                                        setFormData({ ...formData, topic: e.target.value });
                                                    }
                                                }}
                                                className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-xl text-xs outline-none text-gray-800 dark:text-gray-200 font-medium"
                                            >
                                                {topicsAvailable.map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                                <option value="__CREATE_NEW__">+ Create New Topic...</option>
                                            </select>
                                        )}
                                    </div>

                                </div>
                            </form>
                        )}

                        {/* 3. Modal Footer Actions */}
                        <div className="p-4 md:p-6 border-t border-gray-200 dark:border-white/10 flex flex-wrap justify-end gap-3 bg-gray-50 dark:bg-black/30">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>

                            {isClassroom && (
                                <button
                                    type="button"
                                    onClick={(e) => handleSubmit(e, true)}
                                    disabled={loading || !formData.title.trim()}
                                    className="px-5 py-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                    Save as Draft
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={(e) => handleSubmit(e, false)}
                                disabled={loading || !formData.title.trim()}
                                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                {formData.taskType === 'material' ? 'Post Material' : 'Assign'}
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NewTaskModal;
