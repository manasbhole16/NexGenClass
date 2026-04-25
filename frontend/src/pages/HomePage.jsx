import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { Plus, Search, ArrowLeft, Lock, Globe, LogOut, Settings, Trash2, Users, MessageSquare } from 'lucide-react'
import TaskCard from '../components/board/TaskCard'
import NewTaskModal from '../components/NewTaskModal'
import { io } from 'socket.io-client'
import API_BASE_URL from '../apiConfig'
import PresenceAvatars from '../components/board/PresenceAvatars'
import RoomChat from '../components/board/RoomChat'
import CalendarView from '../components/board/CalendarView'
import { LayoutGrid, Calendar as CalendarIconSlot, BookOpen } from 'lucide-react'
import QuizModule from '../components/quiz/QuizModule'

const COLUMNS = [
    { id: 'Backlog', title: 'Backlog', color: 'bg-gray-500/20' },
    { id: 'Todo', title: 'To Do', color: 'bg-blue-500/20' },
    { id: 'In Progress', title: 'In Progress', color: 'bg-purple-500/20' },
    { id: 'Done', title: 'Done', color: 'bg-emerald-500/20' }
]

const Column = ({ col, tasks, setIsModalOpen }) => {
    const { setNodeRef } = useDroppable({ id: col.id })
    return (
        <div ref={setNodeRef} className="bg-[#0f0f12] rounded-2xl p-4 flex flex-col h-full border border-white/5 min-w-[280px]">
            <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${col.color.replace('/20', '')}`} />
                    <h3 className="font-medium text-gray-200">{col.title}</h3>
                </div>
                <Plus onClick={() => setIsModalOpen(true)} className="w-4 h-4 text-gray-500 cursor-pointer hover:text-white" />
            </div>
            <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 min-h-[100px]">
                    {tasks.map(task => <TaskCard key={task._id} task={task} />)}
                </div>
            </SortableContext>
        </div>
    )
}

const HomePage = ({ user, onLogout }) => {
    const { roomId } = useParams()
    const isPersonal = roomId === 'personal' || !roomId
    const [tasks, setTasks] = useState([])
    const [activeId, setActiveId] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [onlineUsers, setOnlineUsers] = useState([])
    const [typingUser, setTypingUser] = useState(null)
    const [roomDetails, setRoomDetails] = useState(null)
    const [showSettings, setShowSettings] = useState(false)
    const [socket, setSocket] = useState(null)
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [viewMode, setViewMode] = useState('kanban') // 'kanban', 'calendar', 'quizzes'
    const navigate = useNavigate()

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    useEffect(() => {
        const fetchRoomDetails = async () => {
            if (isPersonal) return
            try {
                const res = await fetch(`${API_BASE_URL}/api/rooms/my-rooms`, { credentials: 'include' })
                const data = await res.json()
                if (data.success) {
                    const room = data.rooms.find(r => r._id === roomId)
                    setRoomDetails(room)
                }
            } catch (err) { console.error(err) }
        }

        fetchRoomDetails()
        fetchTasks()
        const s = io(API_BASE_URL)
        setSocket(s)

        if (user) {
            s.emit('joinRoom', { roomId, user })
        }

        s.on('presenceUpdate', (users) => {
            setOnlineUsers(users)
        })

        s.on('userTyping', ({ user: tUser, isTyping }) => {
            if (isTyping) setTypingUser(tUser)
            else setTypingUser(null)
        })

        s.on('taskCreated', (newTask) => {
            if (isPersonal && !newTask.room) setTasks(prev => [newTask, ...prev])
            else if (newTask.room === roomId) setTasks(prev => [newTask, ...prev])
        })

        s.on('taskUpdated', (updatedTask) => {
            if (isPersonal && !updatedTask.room) setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t))
            else if (updatedTask.room === roomId) setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t))
        })

        s.on('taskDeleted', ({ id, roomId: taskRoomId }) => {
            const match = isPersonal ? (taskRoomId === 'personal' || !taskRoomId) : taskRoomId === roomId
            if (match) setTasks(prev => prev.filter(t => t._id !== id))
        })

        return () => s.disconnect()
    }, [roomId, isPersonal, user])

    const fetchTasks = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks?roomId=${roomId}`, { credentials: 'include' })
            const data = await res.json()
            if (data.success) setTasks(data.tasks)
        } catch (err) { console.error(err) }
    }

    const handleCreateTask = async (taskData) => {
        try {
            await fetch(`${API_BASE_URL}/api/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...taskData, roomId }),
                credentials: 'include'
            })
            setIsModalOpen(false)
        } catch (err) { console.error(err) }
    }

    const handleDragEnd = async (event) => {
        const { active, over } = event
        if (!over) return
        const activeTask = tasks.find(t => t._id === active.id)
        const overId = over.id
        let newStatus = activeTask.status
        if (COLUMNS.find(c => c.id === overId)) newStatus = overId
        else {
            const overTask = tasks.find(t => t._id === overId)
            if (overTask) newStatus = overTask.status
        }

        if (activeTask.status !== newStatus) {
            setTasks(prev => prev.map(t => t._id === active.id ? { ...t, status: newStatus } : t))
            await fetch(`${API_BASE_URL}/api/tasks/${active.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
                credentials: 'include'
            })
        }
        setActiveId(null)
    }

    const handleDeleteRoom = async () => {
        if (!window.confirm("Are you sure you want to delete this class? This cannot be undone.")) return
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/delete/${roomId}`, {
                method: 'DELETE',
                credentials: 'include'
            })
            const data = await res.json()
            if (data.success) navigate('/rooms')
            else alert(data.message)
        } catch (err) { console.error(err) }
    }

    const handleTyping = (isTyping) => {
        if (socket && !isPersonal) {
            socket.emit('typing', { roomId, user, isTyping })
        }
    }

    return (
        <div className="min-h-screen bg-[#030305] text-white p-4 md:p-8">
            <header className="flex flex-col gap-6 md:flex-row justify-between items-start md:items-center mb-8">
                <div className="flex items-center gap-4">
                    <Link to="/rooms" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ArrowLeft className="w-5 h-5 text-gray-400" /></Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {isPersonal ? <Lock className="w-4 h-4 text-indigo-400" /> : <Globe className="w-4 h-4 text-purple-400" />}
                            <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
                                {isPersonal ? 'My Private Space' : 'Class Board'}
                            </h1>
                        </div>
                        <p className="text-gray-400 text-xs md:text-sm">{isPersonal ? 'Only you can see these tasks' : 'Collaborative board for the class'}</p>
                    </div>
                </div>

                {!isPersonal && (
                    <div className="flex-1 flex items-center md:justify-center overflow-x-auto hide-scrollbar">
                        <PresenceAvatars users={onlineUsers} typingUser={typingUser} />
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
                    {/* View Toggle - Always Visible & First */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" /> Board
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <CalendarIconSlot className="w-3.5 h-3.5" /> Calendar
                        </button>
                        {!isPersonal && (
                            <button
                                onClick={() => setViewMode('quizzes')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'quizzes' ? 'bg-pink-600 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <BookOpen className="w-3.5 h-3.5" /> Quizzes
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3 ml-auto md:ml-0">
                        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all text-xs font-bold shadow-lg shadow-indigo-600/20 active:scale-95">New Task</button>
                        {!isPersonal && roomDetails && roomDetails.owner === user?._id && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className={`p-2 rounded-lg transition-all ${showSettings ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                                >
                                    <Settings className="w-5 h-5" />
                                </button>
                                {showSettings && (
                                    <div className="absolute top-12 right-0 w-48 bg-[#18181b] border border-white/10 rounded-xl p-2 shadow-2xl z-50">
                                        <button
                                            onClick={handleDeleteRoom}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" /> Delete Class
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <button onClick={onLogout} className="p-2 bg-white/5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all group">
                            <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
                        </button>
                        <div className="hidden md:flex items-center gap-3 pl-4 border-l border-white/10">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-bold shadow-lg">
                                {user?.fullname?.[0] || 'U'}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <NewTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleCreateTask}
                onTyping={handleTyping}
            />

            {!isPersonal && (
                <RoomChat
                    roomId={roomId}
                    user={user}
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    socket={socket}
                    isOwner={roomDetails?.owner === user?._id}
                />
            )}

            {!isPersonal && (
                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="fixed right-4 bottom-4 md:right-6 md:bottom-6 w-12 h-12 md:w-14 md:h-14 bg-purple-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-50 group"
                >
                    <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    <div className="absolute -top-12 right-0 bg-white text-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold shadow-lg">
                        Room Chat
                    </div>
                </button>
            )}

            {viewMode === 'kanban' && (
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
                    <div className="flex gap-6 h-[calc(100vh-180px)] overflow-x-auto pb-4 custom-scrollbar">
                        {COLUMNS.map(col => <Column key={col.id} col={col} tasks={tasks.filter(t => t.status === col.id)} setIsModalOpen={setIsModalOpen} />)}
                    </div>
                    <DragOverlay>{activeId ? <TaskCard task={tasks.find(t => t._id === activeId)} /> : null}</DragOverlay>
                </DndContext>
            )}
            
            {viewMode === 'calendar' && (
                <div className="h-[calc(100vh-180px)]">
                    <CalendarView tasks={tasks} />
                </div>
            )}

            {viewMode === 'quizzes' && !isPersonal && (
                <QuizModule roomId={roomId} user={user} />
            )}
        </div>
    )
}

export default HomePage