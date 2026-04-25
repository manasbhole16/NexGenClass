import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Clock, Tag, MoreHorizontal } from 'lucide-react'
import { format } from 'date-fns'

const TaskCard = ({ task }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task._id, data: { ...task } })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    }

    const priorityColors = {
        Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        High: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        Urgent: 'bg-red-500/20 text-red-400 border-red-500/30'
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group relative bg-[#18181b] hover:bg-[#27272a] border border-white/5 hover:border-white/10 p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all shadow-lg hover:shadow-xl mb-3"
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-xs px-2 py-1 rounded-md border ${priorityColors[task.priority] || priorityColors.Medium}`}>
                    {task.priority}
                </span>
                <button className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>

            <h3 className="text-white font-medium mb-1">{task.title}</h3>

            {task.description && (
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{task.description}</p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex gap-2">
                    {task.tags?.map((tag, i) => (
                        <span key={i} className="flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {tag}
                        </span>
                    ))}
                </div>
                {task.dueDate && (
                    <div className={`flex items-center gap-1 ${new Date(task.dueDate) < new Date() ? 'text-red-400' : ''}`}>
                        <Clock className="w-3 h-3" />
                        {format(new Date(task.dueDate), 'MMM d')}
                    </div>
                )}
            </div>
        </motion.div>
    )
}

export default TaskCard
