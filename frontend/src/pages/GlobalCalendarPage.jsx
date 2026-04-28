import React, { useState, useEffect } from 'react'
import API_BASE_URL from '../apiConfig'
import CalendarView from '../components/board/CalendarView'
import { ArrowLeft, UserCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

const GlobalCalendarPage = ({ user, onLogout }) => {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [showProfileInfo, setShowProfileInfo] = useState(false)

    useEffect(() => {
        const fetchAllTasks = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/tasks?roomId=all`, { credentials: 'include' })
                const data = await res.json()
                if (data.success) {
                    setTasks(data.tasks)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchAllTasks()
    }, [])

    return (
        <div className="min-h-screen bg-[#030305] text-white flex flex-col">
            <header className="p-4 md:p-8 border-b border-white/5 flex justify-between items-center bg-[#0a0a0c]">
                <div className="flex items-center gap-4">
                    <Link to="/rooms" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
                        Global Calendar
                    </h1>
                </div>
                
                <div className="relative">
                    <div 
                        className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-lg shadow-lg cursor-pointer" 
                        title="Profile Info" 
                        onClick={() => setShowProfileInfo(!showProfileInfo)}
                    >
                        {user?.fullname?.[0] || 'U'}
                    </div>

                    {showProfileInfo && (
                        <div className="absolute top-12 right-0 w-64 bg-[#18181b] border border-white/10 rounded-xl p-4 shadow-2xl z-50 flex flex-col gap-3">
                            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-xl">
                                    {user?.fullname?.[0] || 'U'}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-bold text-sm truncate">{user?.fullname}</p>
                                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                                    <p className="text-[10px] uppercase text-purple-400 font-bold mt-0.5">{user?.role}</p>
                                </div>
                            </div>
                            <button onClick={onLogout} className="w-full px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors">
                                Log Out
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 overflow-hidden h-[calc(100vh-100px)]">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-gray-500">Loading assignments...</div>
                ) : (
                    <CalendarView tasks={tasks} />
                )}
            </main>
        </div>
    )
}

export default GlobalCalendarPage
