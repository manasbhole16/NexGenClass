import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Tag, Loader, Sparkles, Plus, Trash2, Paperclip, Link as LinkIcon, BookOpen, Layers, Users, FileText } from 'lucide-react'
import API_BASE_URL from '../apiConfig'

const NewTaskModal = ({ isOpen, onClose, onSave, onTyping, roomId, roomDetails, existingTopics = [] }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'Todo',
        dueDate: '',
        dueTime: '23:59',
        tags: '',
        maxMarks: 100,
        taskType: 'assignment',
        topic: 'General'
    })
    const [customTopic, setCustomTopic] = useState('')
    const [isCustomTopic, setIsCustomTopic] = useState(false)
    const [loading, setLoading] = useState(false)
    const [aiPrompt, setAiPrompt] = useState('')
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState(null)
    const [subtasks, setSubtasks] = useState([])
    const [rubric, setRubric] = useState([])
    const [attachments, setAttachments] = useState([])
    const [linkInput, setLinkInput] = useState({ title: '', url: '' })
    const [showLinkInput, setShowLinkInput] = useState(false)
    const [assignedStudents, setAssignedStudents] = useState([]) // empty = all
    const [isDraft, setIsDraft] = useState(false)

    const isClassroom = Boolean(roomId && roomId !== 'personal')
    const membersList = roomDetails?.members || []

    const handleFocus = () => onTyping?.(true)
    const handleBlur = () => onTyping?.(false)

    const normalizeDate = (value) => {
        if (!value) return ''
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return ''
        return date.toISOString().split('T')[0]
    }

    const handleGenerateDraft = async () => {
        if (!aiPrompt.trim()) return
        setAiLoading(true)
        setAiError(null)
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt, roomId }),
                credentials: 'include'
            })
            const data = await res.json()
            if (data.success) {
                const draft = data.draft
                setFormData((prev) => ({
                    ...prev,
                    title: draft.title || prev.title,
                    description: draft.description || prev.description,
                    dueDate: normalizeDate(draft.dueDateSuggestion) || prev.dueDate,
                    tags: Array.isArray(draft.tags) ? draft.tags.join(', ') : prev.tags
                }))
                setSubtasks(Array.isArray(draft.subtasks) ? draft.subtasks : [])
                setRubric(Array.isArray(draft.rubric) ? draft.rubric : [])
            } else {
                setAiError(data.message || 'AI generation failed')
            }
        } catch (err) {
            setAiError('AI generation failed')
            console.error(err)
        } finally {
            setAiLoading(false)
        }
    }

    const handleSubtaskChange = (index, value) => {
        setSubtasks((prev) => prev.map((s, i) => i === index ? { ...s, title: value } : s))
    }

    const handleAddSubtask = () => {
        setSubtasks((prev) => [...prev, { title: '' }])
    }

    const handleRemoveSubtask = (index) => {
        setSubtasks((prev) => prev.filter((_, i) => i !== index))
    }

    const handleRubricChange = (index, field, value) => {
        setRubric((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
    }

    const handleAddRubric = () => {
        setRubric((prev) => [...prev, { criterion: '', points: 10, description: '' }])
    }

    const handleRemoveRubric = (index) => {
        setRubric((prev) => prev.filter((_, i) => i !== index))
    }

    // Teacher File Attachments (Base64 conversion)
    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return

        files.forEach(file => {
            const reader = new FileReader()
            reader.onload = (event) => {
                const fileUrl = event.target.result
                setAttachments(prev => [
                    ...prev,
                    {
                        title: file.name,
                        fileName: file.name,
                        fileUrl: fileUrl,
                        fileType: file.type || 'application/octet-stream'
                    }
                ])
            }
            reader.readAsDataURL(file)
        })
    }

    const handleAddLink = () => {
        if (!linkInput.url.trim()) return
        setAttachments(prev => [
            ...prev,
            {
                title: linkInput.title.trim() || linkInput.url.trim(),
                fileName: linkInput.title.trim() || 'External Link',
                fileUrl: linkInput.url.trim(),
                fileType: 'link'
            }
        ])
        setLinkInput({ title: '', url: '' })
        setShowLinkInput(false)
    }

    const handleRemoveAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e, draftMode = false) => {
        if (e) e.preventDefault()
        setLoading(true)
        try {
            const cleanedSubtasks = Array.isArray(subtasks)
                ? subtasks
                    .map((s) => ({ title: String(s.title || '').trim() }))
                    .filter((s) => s.title)
                : []
            const cleanedRubric = Array.isArray(rubric)
                ? rubric
                    .map((r) => ({
                        criterion: String(r.criterion || '').trim(),
                        points: Number(r.points) || 0,
                        description: String(r.description || '').trim()
                    }))
                    .filter((r) => r.criterion)
                : []

            const finalTopic = isCustomTopic
                ? (customTopic.trim() || 'General')
                : (formData.topic || 'General')

            let finalDueDate = null
            if (formData.dueDate) {
                const timeStr = formData.dueTime || '23:59'
                finalDueDate = new Date(`${formData.dueDate}T${timeStr}:00`)
            }

            const taskData = {
                ...formData,
                topic: finalTopic,
                category: finalTopic,
                dueDate: finalDueDate,
                maxMarks: Number(formData.maxMarks) || 100,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                subtasks: cleanedSubtasks,
                rubric: cleanedRubric,
                attachments,
                assignedTo: assignedStudents,
                isDraft: draftMode
            }

            await onSave(taskData)
            // Reset form
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
                topic: 'General'
            })
            setCustomTopic('')
            setIsCustomTopic(false)
            setSubtasks([])
            setRubric([])
            setAttachments([])
            setAssignedStudents([])
            setAiPrompt('')
            setAiError(null)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const topicsAvailable = Array.from(new Set(['General', ...existingTopics])).filter(Boolean)

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
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-2xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {isClassroom ? 'Create Classwork' : 'New Personal Task'}
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {isClassroom ? 'Add assignments, reference materials, or module tasks' : 'Track your personal objectives'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={(e) => handleSubmit(e, false)} className="p-4 md:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                            
                            {/* AI Generator Box */}
                            <div className="bg-gradient-to-r from-purple-500/5 to-cyan-500/5 border border-purple-500/20 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    <label className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                        AI Classwork Assistant
                                    </label>
                                </div>
                                <textarea
                                    className="w-full bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 h-16 resize-none"
                                    placeholder="E.g. Create a 3-part Docker containerization lab with rubric and deliverables"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                />
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <p className="text-[11px] text-gray-500">Auto-generates title, instructions, checklist & rubric.</p>
                                    <button
                                        type="button"
                                        onClick={handleGenerateDraft}
                                        disabled={aiLoading || !aiPrompt.trim()}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                    >
                                        {aiLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                        Generate Draft
                                    </button>
                                </div>
                                {aiError && <p className="mt-2 text-xs text-red-400">{aiError}</p>}
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-purple-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
                                    placeholder="e.g. Lab 2: Container Orchestration with Kubernetes"
                                    value={formData.title}
                                    onBlur={handleBlur}
                                    onFocus={handleFocus}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            {/* Instructions / Description */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                                    Instructions
                                </label>
                                <textarea
                                    className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-purple-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 h-24 resize-none"
                                    placeholder="Detailed guidelines, objectives, and submission instructions for students..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {/* Topic, Type, and Points Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {isClassroom && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                                            <Layers className="w-3.5 h-3.5" /> Topic
                                        </label>
                                        {!isCustomTopic ? (
                                            <select
                                                className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none text-gray-900 dark:text-white"
                                                value={formData.topic}
                                                onChange={e => {
                                                    if (e.target.value === '__NEW__') {
                                                        setIsCustomTopic(true)
                                                    } else {
                                                        setFormData({ ...formData, topic: e.target.value })
                                                    }
                                                }}
                                            >
                                                {topicsAvailable.map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                                <option value="__NEW__">+ Create New Topic...</option>
                                            </select>
                                        ) : (
                                            <div className="flex gap-1">
                                                <input
                                                    className="w-full bg-white dark:bg-black/20 border border-purple-500 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none text-gray-900 dark:text-white"
                                                    placeholder="Enter topic name..."
                                                    value={customTopic}
                                                    onChange={e => setCustomTopic(e.target.value)}
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCustomTopic(false)}
                                                    className="px-2 text-xs text-gray-500 hover:text-gray-300"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                                        Type
                                    </label>
                                    <select
                                        className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none text-gray-900 dark:text-white"
                                        value={formData.taskType}
                                        onChange={e => setFormData({ ...formData, taskType: e.target.value })}
                                    >
                                        <option value="assignment">Assignment (Graded)</option>
                                        <option value="material">Reference Material (Ungraded)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                                        Points
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none text-gray-900 dark:text-white"
                                        value={formData.maxMarks}
                                        onChange={e => setFormData({ ...formData, maxMarks: e.target.value })}
                                        disabled={formData.taskType === 'material'}
                                    />
                                </div>
                            </div>

                            {/* Due Date & Priority */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                                        Due Date & Time
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="date"
                                                className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-purple-500 outline-none text-gray-900 dark:text-white dark:[color-scheme:dark]"
                                                value={formData.dueDate}
                                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                            />
                                        </div>
                                        <input
                                            type="time"
                                            className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none text-gray-900 dark:text-white dark:[color-scheme:dark]"
                                            value={formData.dueTime}
                                            onChange={e => setFormData({ ...formData, dueTime: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">
                                        Priority
                                    </label>
                                    <select
                                        className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none text-gray-900 dark:text-white"
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            {/* Reference Attachments & Links (Teacher) */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                        <Paperclip className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Reference Materials / Attachments
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs bg-purple-100 dark:bg-purple-500/10 hover:bg-purple-200 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1">
                                            <Paperclip className="w-3 h-3" /> Attach File
                                            <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowLinkInput(!showLinkInput)}
                                            className="text-xs bg-cyan-100 dark:bg-cyan-500/10 hover:bg-cyan-200 dark:hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <LinkIcon className="w-3 h-3" /> Add Link
                                        </button>
                                    </div>
                                </div>

                                {showLinkInput && (
                                    <div className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 p-3 rounded-xl mb-3 space-y-2">
                                        <input
                                            className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs focus:border-cyan-500 outline-none text-gray-900 dark:text-white"
                                            placeholder="Link Title (e.g. Starter Repository)"
                                            value={linkInput.title}
                                            onChange={e => setLinkInput({ ...linkInput, title: e.target.value })}
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs focus:border-cyan-500 outline-none text-gray-900 dark:text-white"
                                                placeholder="https://..."
                                                value={linkInput.url}
                                                onChange={e => setLinkInput({ ...linkInput, url: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddLink}
                                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {attachments.length > 0 ? (
                                    <div className="space-y-2">
                                        {attachments.map((att, i) => (
                                            <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 px-3 py-2 rounded-lg text-xs">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    {att.fileType === 'link' ? (
                                                        <LinkIcon className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                                                    ) : (
                                                        <FileText className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                                                    )}
                                                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{att.title || att.fileName}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAttachment(i)}
                                                    className="text-gray-400 hover:text-red-400 p-1 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 italic">No reference attachments or links added.</p>
                                )}
                            </div>

                            {/* Subtask Checklist */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400">
                                        Deliverables Checklist
                                    </label>
                                    <button type="button" onClick={handleAddSubtask} className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold">
                                        <Plus className="w-3 h-3" /> Add Item
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {subtasks.map((subtask, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <input
                                                className="flex-1 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs focus:border-purple-500 outline-none text-gray-900 dark:text-white"
                                                placeholder={`Deliverable ${index + 1}`}
                                                value={subtask.title || ''}
                                                onChange={(e) => handleSubtaskChange(index, e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSubtask(index)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Rubric Builder */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400">
                                        Grading Rubric
                                    </label>
                                    <button type="button" onClick={handleAddRubric} className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold">
                                        <Plus className="w-3 h-3" /> Add Criterion
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {rubric.map((item, index) => (
                                        <div key={index} className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    className="flex-1 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold focus:border-purple-500 outline-none text-gray-900 dark:text-white"
                                                    placeholder="Criterion (e.g. Code Architecture & Modularity)"
                                                    value={item.criterion || ''}
                                                    onChange={(e) => handleRubricChange(index, 'criterion', e.target.value)}
                                                />
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="w-20 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-right focus:border-purple-500 outline-none text-gray-900 dark:text-white"
                                                        value={item.points ?? 10}
                                                        onChange={(e) => handleRubricChange(index, 'points', e.target.value)}
                                                    />
                                                    <span className="text-xs text-gray-500 font-bold">pts</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRubric(index)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <textarea
                                                className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs focus:border-purple-500 outline-none text-gray-900 dark:text-white h-14 resize-none"
                                                placeholder="Grading expectations and guidelines for this criterion..."
                                                value={item.description || ''}
                                                onChange={(e) => handleRubricChange(index, 'description', e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons: Save Draft & Publish */}
                            <div className="pt-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                
                                <div className="flex items-center gap-3">
                                    {isClassroom && (
                                        <button
                                            type="button"
                                            onClick={() => handleSubmit(null, true)}
                                            disabled={loading || !formData.title.trim()}
                                            className="px-4 py-2 border border-purple-500/30 hover:border-purple-500 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                        >
                                            Save as Draft
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={loading || !formData.title.trim()}
                                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {loading && <Loader className="w-3.5 h-3.5 animate-spin" />}
                                        {isClassroom ? 'Publish Classwork' : 'Create Task'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default NewTaskModal
