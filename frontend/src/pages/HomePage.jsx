import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { Plus, Search, ArrowLeft, Lock, Globe, LogOut, Settings, Trash2, Users, MessageSquare, ClipboardList, LayoutDashboard } from 'lucide-react'
import TaskCard from '../components/board/TaskCard'
import NewTaskModal from '../components/NewTaskModal'
import AssignmentModal from '../components/AssignmentModal'
import { io } from 'socket.io-client'
import API_BASE_URL from '../apiConfig'
import PresenceAvatars from '../components/board/PresenceAvatars'
import RoomChat from '../components/board/RoomChat'
import CalendarView from '../components/board/CalendarView'
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
    const [selectedAssignment, setSelectedAssignment] = useState(null)
    const [onlineUsers, setOnlineUsers] = useState([])
    const [typingUser, setTypingUser] = useState(null)
    const [roomDetails, setRoomDetails] = useState(null)
    const [showSettings, setShowSettings] = useState(false)
    const [socket, setSocket] = useState(null)
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('stream') // 'stream', 'classwork', 'people'
    const [classworkView, setClassworkView] = useState('list') // 'list', 'kanban'
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
            <header className="flex flex-col mb-8 border-b border-white/5 pb-4">
                <div className="flex flex-col gap-6 md:flex-row justify-between items-start md:items-center mb-6">
                    <div className="flex items-center gap-4">
                        <Link to="/rooms" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><ArrowLeft className="w-5 h-5 text-gray-400" /></Link>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {isPersonal ? <Lock className="w-4 h-4 text-indigo-400" /> : <Globe className="w-4 h-4 text-purple-400" />}
                                <h1 className="text-2xl md:text-3xl font-bold">{isPersonal ? 'My Private Space' : roomDetails?.name || 'Class Board'}</h1>
                            </div>
                            <p className="text-gray-400 text-xs font-mono">{isPersonal ? 'Private' : `Code: ${roomDetails?.code || '...'}`}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 ml-auto md:ml-0">
                        {(!isPersonal && roomDetails?.owner === user?._id) && (
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-all text-sm font-bold shadow-lg shadow-purple-600/20 active:scale-95">
                                <Plus className="w-4 h-4" /> Create
                            </button>
                        )}
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
                        <div className="hidden md:flex items-center gap-3 pl-4 border-l border-white/10">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-bold shadow-lg">
                                {user?.fullname?.[0] || 'U'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex gap-8 px-4">
                    <button 
                        onClick={() => setActiveTab('stream')}
                        className={`pb-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'stream' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'}`}
                    >
                        Stream
                    </button>
                    <button 
                        onClick={() => setActiveTab('classwork')}
                        className={`pb-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'classwork' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'}`}
                    >
                        Classwork
                    </button>
                    {!isPersonal && (
                        <button 
                            onClick={() => setActiveTab('people')}
                            className={`pb-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'people' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'}`}
                        >
                            People
                        </button>
                    )}
                </div>
            </header>

            <NewTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleCreateTask}
                onTyping={handleTyping}
            />

            <AssignmentModal 
                isOpen={!!selectedAssignment}
                onClose={() => setSelectedAssignment(null)}
                task={selectedAssignment}
                user={user}
                roomDetails={roomDetails}
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

            {/* Content Area Based on Tabs */}
            {activeTab === 'stream' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Banner */}
                    <div className="h-48 md:h-64 rounded-2xl bg-gradient-to-r from-purple-800 to-indigo-900 p-8 flex flex-col justify-end shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-black/20" />
                        <h1 className="text-3xl md:text-4xl font-bold text-white relative z-10">{roomDetails?.name || 'Classroom'}</h1>
                        <p className="text-purple-200 mt-2 relative z-10">{roomDetails?.owner === user?._id ? 'You are the instructor' : 'Instructor view'}</p>
                    </div>

                    {/* Announce Box */}
                    {roomDetails?.owner === user?._id && (
                        <div className="bg-[#18181b] border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-md cursor-pointer hover:bg-[#1f1f23] transition-colors" onClick={() => setIsModalOpen(true)}>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center font-bold">
                                {user?.fullname?.[0]}
                            </div>
                            <span className="text-gray-400 flex-1">Announce something to your class</span>
                        </div>
                    )}

                    {/* Stream Items (Assignments/Announcements) */}
                    <div className="space-y-4">
                        {tasks.map(task => (
                            <div key={task._id} className="bg-[#18181b] border border-white/10 rounded-2xl p-5 hover:bg-[#1f1f23] transition-colors shadow-md flex gap-4 cursor-pointer">
                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                    <ClipboardList className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-gray-300">
                                        <span className="font-semibold text-white">Teacher</span> posted a new {task.taskType || 'assignment'}: <span className="font-medium">{task.title}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">{new Date(task.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                <p>This is where you'll see updates for this class</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'classwork' && (
                <div className="flex flex-col h-[calc(100vh-220px)]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-2 bg-[#18181b] p-1 rounded-lg border border-white/5">
                            <button onClick={() => setClassworkView('list')} className={`p-2 rounded-md transition-colors ${classworkView === 'list' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
                                <ClipboardList className="w-5 h-5" />
                            </button>
                            <button onClick={() => setClassworkView('kanban')} className={`p-2 rounded-md transition-colors ${classworkView === 'kanban' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
                                <LayoutDashboard className="w-5 h-5" />
                            </button>
                        </div>
                        {isPersonal || roomDetails?.owner === user?._id ? (
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-full font-bold hover:bg-purple-700 transition-colors shadow-lg">
                                <Plus className="w-4 h-4" /> Create
                            </button>
                        ) : null}
                    </div>

                    {classworkView === 'list' ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 max-w-4xl mx-auto w-full">
                            {['Experiment', 'Report', 'Lab', ''].map(category => {
                                const catTasks = tasks.filter(t => (t.category || '') === category);
                                if (catTasks.length === 0) return null;
                                return (
                                    <div key={category || 'Uncategorized'} className="mb-8">
                                        <h2 className="text-xl font-bold mb-4 text-purple-300 border-b border-white/10 pb-2">{category || 'Classwork'}</h2>
                                        <div className="space-y-3">
                                            {catTasks.map(task => (
                                                <div 
                                                    key={task._id} 
                                                    onClick={() => setSelectedAssignment(task)}
                                                    className="bg-[#18181b] border border-white/10 rounded-xl p-4 flex justify-between items-center hover:shadow-lg hover:border-purple-500/50 transition-all group cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                                                            <ClipboardList className="w-5 h-5 text-purple-400" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-medium text-lg text-gray-200 group-hover:text-white transition-colors">{task.title}</h3>
                                                            {task.dueDate && (
                                                                <p className="text-xs text-gray-500">Due {new Date(task.dueDate).toLocaleDateString()}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs font-medium px-3 py-1 bg-white/5 rounded-full text-gray-400">
                                                        {task.taskType || 'Assignment'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
                            <div className="flex gap-6 flex-1 overflow-x-auto pb-4 custom-scrollbar">
                                {COLUMNS.map(col => <Column key={col.id} col={col} tasks={tasks.filter(t => t.status === col.id)} setIsModalOpen={setIsModalOpen} />)}
                            </div>
                            <DragOverlay>{activeId ? <TaskCard task={tasks.find(t => t._id === activeId)} /> : null}</DragOverlay>
                        </DndContext>
                    )}
                </div>
            )}

            {activeTab === 'people' && !isPersonal && (
                <div className="max-w-4xl mx-auto space-y-8">
                    <div>
                        <div className="flex justify-between items-center border-b border-purple-500/30 pb-2 mb-4">
                            <h2 className="text-2xl font-bold text-purple-400">Teachers</h2>
                        </div>
                        <div className="flex items-center gap-4 p-4">
                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
                                T
                            </div>
                            <span className="font-medium text-lg">Instructor</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center border-b border-purple-500/30 pb-2 mb-4">
                            <h2 className="text-2xl font-bold text-purple-400">Classmates</h2>
                            <span className="text-gray-400">{roomDetails?.members?.length || 0} students</span>
                        </div>
                        <div className="space-y-1">
                            {roomDetails?.members?.map((member, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-white">
                                        S
                                    </div>
                                    <span className="font-medium">Student {i+1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default HomePage