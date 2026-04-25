import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, ArrowRight, BookOpen, Loader, LogOut, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import API_BASE_URL from '../apiConfig'

const RoomSelectionPage = ({ user, onLogout }) => {
    const [rooms, setRooms] = useState([])
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [roomName, setRoomName] = useState('')
    const [joinCode, setJoinCode] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        fetchRooms()
    }, [])

    const fetchRooms = async () => {
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
        <div className="min-h-screen bg-[#030305] text-white p-4 md:p-8">
            <header className="flex justify-between items-center mb-10 md:mb-12">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-lg">
                        {user?.fullname?.[0] || 'U'}
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold">Welcome, {user?.fullname?.split(' ')[0]}!</h1>
                        <p className="text-gray-400 text-xs md:text-sm">Student Dashboard</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate('/room/personal')}
                    className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-indigo-900/40 to-indigo-600/20 border border-indigo-500/30 cursor-pointer group shadow-xl shadow-indigo-500/5"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                            <Lock className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                        </div>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-1">My Private Space</h3>
                    <p className="text-indigo-300 text-[10px] font-medium uppercase tracking-widest">Personal Board</p>
                </motion.div>

                <div className="p-5 md:p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
                    <h3 className="text-gray-400 mb-1 text-xs md:text-sm font-medium">Joined Classes</h3>
                    <p className="text-2xl md:text-3xl font-bold text-white">{rooms.length}</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pt-6 border-t border-white/5">
                <h2 className="text-xl font-bold">Your Classroom Groups</h2>
                <div className="flex gap-2 md:gap-4">
                    <button onClick={() => setIsJoinModalOpen(true)} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-xs md:text-sm">
                        <Plus className="w-4 h-4" /> Join Class
                    </button>
                    <button onClick={() => setIsCreateModalOpen(true)} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-bold hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all text-xs md:text-sm">
                        <Plus className="w-4 h-4" /> Create Class
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {rooms.map(room => (
                    <motion.div key={room._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -5 }} onClick={() => navigate(`/room/${room._id}`)} className="p-5 md:p-6 bg-[#18181b] border border-white/10 rounded-2xl cursor-pointer hover:border-purple-500/50 transition-all group relative">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center"><BookOpen className="w-6 h-6 text-gray-400 group-hover:text-purple-400 transition-colors" /></div>
                            <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-gray-400 font-mono italic">{room.code}</span>
                        </div>
                        <h2 className="text-xl font-bold mb-1">{room.name}</h2>
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center text-gray-500 text-xs gap-1"><Users className="w-3 h-3" />{room.members.length} Members</div>
                            <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-white transition-all group-hover:translate-x-1" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {(isCreateModalOpen || isJoinModalOpen) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#18181b] p-8 rounded-2xl border border-white/10 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6">{isCreateModalOpen ? 'Create Class' : 'Join Class'}</h2>
                        <form onSubmit={isCreateModalOpen ? handleCreateRoom : handleJoinRoom}>
                            <div className="mb-6">
                                <label className="block text-sm text-gray-400 mb-2">{isCreateModalOpen ? 'Class Name' : 'Class Code'}</label>
                                <input className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none text-white" placeholder={isCreateModalOpen ? 'e.g. History' : 'e.g. X7K9P2'} value={isCreateModalOpen ? roomName : joinCode} onChange={e => isCreateModalOpen ? setRoomName(e.target.value) : setJoinCode(e.target.value)} autoFocus />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => { setIsCreateModalOpen(false); setIsJoinModalOpen(false) }} className="px-4 py-2 text-gray-400">Cancel</button>
                                <button type="submit" disabled={loading} className="px-6 py-2 bg-purple-600 rounded-xl font-bold">{isCreateModalOpen ? 'Create' : 'Join'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RoomSelectionPage
