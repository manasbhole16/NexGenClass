import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Tag, Loader, Sparkles, Plus, Trash2 } from 'lucide-react'
import API_BASE_URL from '../apiConfig'

const NewTaskModal = ({ isOpen, onClose, onSave, onTyping, roomId }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'Todo',
        dueDate: '',
        tags: ''
    })
    const [loading, setLoading] = useState(false)
    const [aiPrompt, setAiPrompt] = useState('')
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState(null)
    const [subtasks, setSubtasks] = useState([])
    const [rubric, setRubric] = useState([])

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
        setRubric((prev) => [...prev, { criterion: '', points: 0, description: '' }])
    }

    const handleRemoveRubric = (index) => {
        setRubric((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
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
            const taskData = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                subtasks: cleanedSubtasks,
                rubric: cleanedRubric
            }
            // Pass data up to onSave and let parent handle fetch to update list.
            await onSave(taskData)
            setFormData({ title: '', description: '', priority: 'Medium', status: 'Todo', dueDate: '', tags: '' })
            setSubtasks([])
            setRubric([])
            setAiPrompt('')
            setAiError(null)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

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
                        className="w-full max-w-lg bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">New Task</h2>
                            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                                <label className="block text-sm text-gray-400 mb-2">Generate from prompt</label>
                                <textarea
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500 outline-none text-white placeholder-gray-600 h-20 resize-none"
                                    placeholder="E.g. Chapter 3 lab report on density"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                />
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <p className="text-xs text-gray-500">AI draft fills title, tags, checklist, rubric, and a due date suggestion.</p>
                                    <button
                                        type="button"
                                        onClick={handleGenerateDraft}
                                        disabled={aiLoading || !aiPrompt.trim()}
                                        className="flex items-center gap-2 px-3 py-2 bg-purple-600 rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                                    >
                                        {aiLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        Generate
                                    </button>
                                </div>
                                {aiError && <p className="mt-2 text-xs text-red-400">{aiError}</p>}
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                <input
                                    required
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500 outline-none text-white placeholder-gray-600"
                                    placeholder="What needs to be done?"
                                    value={formData.title}
                                    onBlur={handleBlur}
                                    onFocus={handleFocus}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Status</label>
                                    <select
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500 outline-none text-white"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="Backlog">Backlog</option>
                                        <option value="Todo">To Do</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Done">Done</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Priority</label>
                                    <select
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500 outline-none text-white"
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

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Due Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="date"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 focus:border-purple-500 outline-none text-white [color-scheme:dark]"
                                        value={formData.dueDate}
                                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Tags (comma separated)</label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 focus:border-purple-500 outline-none text-white placeholder-gray-600"
                                        placeholder="Dev, Bug, UI..."
                                        value={formData.tags}
                                        onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm text-gray-400">Checklist</label>
                                    <button type="button" onClick={handleAddSubtask} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                        <Plus className="w-3 h-3" /> Add item
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {subtasks.length === 0 && (
                                        <p className="text-xs text-gray-500">No checklist items yet.</p>
                                    )}
                                    {subtasks.map((subtask, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <input
                                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 focus:border-purple-500 outline-none text-white placeholder-gray-600"
                                                placeholder={`Checklist item ${index + 1}`}
                                                value={subtask.title || ''}
                                                onChange={(e) => handleSubtaskChange(index, e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSubtask(index)}
                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm text-gray-400">Rubric</label>
                                    <button type="button" onClick={handleAddRubric} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                        <Plus className="w-3 h-3" /> Add criterion
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {rubric.length === 0 && (
                                        <p className="text-xs text-gray-500">No rubric criteria yet.</p>
                                    )}
                                    {rubric.map((item, index) => (
                                        <div key={index} className="grid grid-cols-1 gap-2 bg-black/20 border border-white/10 rounded-lg p-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 focus:border-purple-500 outline-none text-white placeholder-gray-600"
                                                    placeholder="Criterion"
                                                    value={item.criterion || ''}
                                                    onChange={(e) => handleRubricChange(index, 'criterion', e.target.value)}
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-24 bg-black/20 border border-white/10 rounded-lg px-3 py-2 focus:border-purple-500 outline-none text-white placeholder-gray-600"
                                                    placeholder="Points"
                                                    value={item.points ?? 0}
                                                    onChange={(e) => handleRubricChange(index, 'points', e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRubric(index)}
                                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <textarea
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 focus:border-purple-500 outline-none text-white placeholder-gray-600 h-20 resize-none"
                                                placeholder="Description"
                                                value={item.description || ''}
                                                onChange={(e) => handleRubricChange(index, 'description', e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-purple-600 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                                >
                                    {loading && <Loader className="w-4 h-4 animate-spin" />}
                                    Create Task
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default NewTaskModal
