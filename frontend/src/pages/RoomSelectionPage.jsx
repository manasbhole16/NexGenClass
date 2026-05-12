import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, ArrowRight, BookOpen, Loader, LogOut, Lock, MoreVertical, FileText, Bell, UserCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import API_BASE_URL from '../apiConfig'

const RoomSelectionPage = ({ user, onLogout }) => {
    const [rooms, setRooms] = useState([])
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [roomName, setRoomName] = useState('')
    const [joinCode, setJoinCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [showProfileInfo, setShowProfileInfo] = useState(false)
    const [activeDropdown, setActiveDropdown] = useState(null)
    const navigate = useNavigate()

    const isValidCode = joinCode.length >= 5 && joinCode.length <= 8 && /^[a-zA-Z0-9]+$/.test(joinCode);

    useEffect(() => {
        fetchRooms()
        
        const handleClickOutside = () => setActiveDropdown(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [])

    async function fetchRooms() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/my-rooms`, { credentials: 'include' })
            const data = await res.json()
            if (data.success) {
                setRooms(data.rooms)
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleCreateRoom = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: roomName }),
                credentials: 'include'
            })
            const data = await res.json()
            if (data.success) {
                setRooms([...rooms, data.room])
                setIsCreateModalOpen(false)
                setRoomName('')
            }
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    const handleJoinRoom = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: joinCode }),
                credentials: 'include'
            })
            const data = await res.json()
            if (data.success) {
                if (!rooms.find(r => r._id === data.room._id)) {
                    setRooms([...rooms, data.room])
                }
                setIsJoinModalOpen(false)
                setJoinCode('')
            } else {
                alert(data.message)
            }
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <header className="flex justify-between items-center mb-10 border-b border-gray-200 dark:border-white/5 pb-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">Dashboard</h1>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Debug Role: {user?.role || 'undefined'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {user?.role === 'teacher' ? (
                        <div className="relative group">
                            <button className="p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-400 focus:outline-none">
                                <Plus className="w-5 h-5" />
                            </button>
                            <div className="absolute right-0 top-full pt-2 w-40 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden py-1">
                                    <button onClick={() => setIsJoinModalOpen(true)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-medium">Join class</button>
                                    <button onClick={() => setIsCreateModalOpen(true)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-medium">Create class</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsJoinModalOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-sm font-medium">
                            <Plus className="w-4 h-4" /> Join Class
                        </button>
                    )}
                    <div className="relative">
                        <div 
                            className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-lg shadow-lg cursor-pointer" 
                            title="Profile Info" 
                            onClick={() => setShowProfileInfo(!showProfileInfo)}
                        >
                            {user?.fullname?.[0] || 'U'}
                        </div>

                        {showProfileInfo && (
                            <div className="absolute top-12 right-0 w-64 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-4 shadow-2xl z-50 flex flex-col gap-3">
                                <div className="flex items-center gap-3 border-b border-gray-200 dark:border-white/10 pb-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-xl text-white">
                                        {user?.fullname?.[0] || 'U'}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-sm truncate text-gray-900 dark:text-white">{user?.fullname}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                                        <p className="text-[10px] uppercase text-purple-400 font-bold mt-0.5">{user?.role}</p>
                                    </div>
                                </div>
                                <button onClick={onLogout} className="w-full px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors">
                                    Log Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {rooms.map(room => (
                    <motion.div key={room._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -5 }} className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all group relative flex flex-col h-72">
                        {/* Card Banner */}
                        <div 
                            className="h-24 bg-gradient-to-r from-purple-800 to-indigo-900 p-4 relative cursor-pointer"
                            onClick={() => navigate(`/room/${room._id}`)}
                        >
                            <div className="flex justify-between items-start">
                                <h2 className="text-lg font-bold text-white truncate max-w-[80%] hover:underline">{room.name}</h2>
                                <div className="relative">
                                    <button 
                                        className="p-1 hover:bg-black/20 rounded-full text-white transition-colors" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDropdown(activeDropdown === room._id ? null : room._id);
                                        }}
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                    
                                    {activeDropdown === room._id && (
                                        <div className="absolute top-8 right-0 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50 w-36 py-1" onClick={(e) => e.stopPropagation()}>
                                            {room.owner === user?._id ? (
                                                <>
                                                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors">Edit Class</button>
                                                    <button className="w-full text-left px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">Delete Class</button>
                                                </>
                                            ) : (
                                                <button className="w-full text-left px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">Unenroll</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-purple-200 mt-1">{room.owner === user?._id ? 'Owner' : 'Instructor'}</p>
                            
                            {/* Avatar pushing up into banner */}
                            <div className="absolute -bottom-6 right-4 w-16 h-16 rounded-full border-4 border-white dark:border-[#18181b] bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-xl text-white shadow-md z-10">
                                {room.name.charAt(0)}
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 flex-1 flex flex-col justify-between pt-8 cursor-pointer" onClick={() => navigate(`/room/${room._id}`)}>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-2">Code: {room.code}</div>
                            </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="px-4 py-3 border-t border-gray-200 dark:border-white/5 flex justify-end gap-2 bg-gray-50 dark:bg-[#1f1f23]">
                            <button className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Assignments">
                                <FileText className="w-5 h-5" />
                            </button>
                            <button className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Announcements">
                                <Bell className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Google Classroom Style Join Modal */}
            {isJoinModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#18181b] rounded-xl border border-gray-200 dark:border-white/10 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Join class</h2>
                            <button onClick={() => setIsJoinModalOpen(false)} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">&times;</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="mb-6 p-4 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">You're currently signed in as</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-white">
                                            {user?.fullname?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900 dark:text-white">{user?.fullname}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={onLogout} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium px-3 py-1.5 border border-purple-200 dark:border-purple-500/30 rounded hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors">
                                    Switch account
                                </button>
                            </div>

                            <div className="mb-6 border border-gray-200 dark:border-white/10 rounded-lg p-4">
                                <h3 className="font-bold mb-2 text-gray-900 dark:text-white">Class code</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Ask your teacher for the class code, then enter it here.</p>
                                <form id="joinForm" onSubmit={handleJoinRoom}>
                                    <input 
                                        className="w-full md:w-1/2 bg-transparent border border-gray-300 dark:border-white/20 rounded px-4 py-3 focus:border-purple-500 outline-none text-gray-900 dark:text-white text-lg tracking-widest font-mono uppercase" 
                                        placeholder="Class code" 
                                        value={joinCode} 
                                        onChange={e => setJoinCode(e.target.value)} 
                                        autoFocus 
                                        maxLength={8}
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Use a class code with 5-8 letters or numbers, and no spaces or symbols.</p>
                                </form>
                            </div>
                            
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                <p className="font-medium mb-1 text-gray-700 dark:text-gray-300">To sign in with a class code</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Use an authorized account</li>
                                    <li>Use a class code with 5-8 letters or numbers, and no spaces or symbols</li>
                                </ul>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#121214] rounded-b-xl">
                            <button type="button" onClick={() => setIsJoinModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium">Cancel</button>
                            <button 
                                type="submit" 
                                form="joinForm"
                                disabled={loading || !isValidCode} 
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white font-medium transition-all"
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#18181b] p-6 rounded-xl border border-gray-200 dark:border-white/10 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Create class</h2>
                        <form onSubmit={handleCreateRoom}>
                            <div className="mb-6">
                                <input className="w-full bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/20 rounded px-4 py-3 focus:border-purple-500 outline-none text-gray-900 dark:text-white transition-colors" placeholder="Class name (required)" value={roomName} onChange={e => setRoomName(e.target.value)} autoFocus required />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium">Cancel</button>
                                <button type="submit" disabled={loading || !roomName.trim()} className="px-6 py-2 bg-purple-600 rounded text-white font-medium disabled:opacity-50">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RoomSelectionPage
