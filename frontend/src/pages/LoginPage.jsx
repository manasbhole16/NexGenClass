import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, ArrowRight, Loader } from 'lucide-react'
import API_BASE_URL from '../apiConfig'

const LoginPage = ({ onLogin }) => {
    const [formData, setFormData] = useState({ email: '', password: '' })
    const [role, setRole] = useState('student')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, role }),
                credentials: 'include'
            })
            const data = await res.json()
            if (res.ok && data.success) {
                onLogin(data.user)
                navigate('/rooms')
            } else {
                setError(data.message || data || 'Login failed')
            }
        } catch (err) {
            setError('Server connection failed.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#030305] text-white flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-cyan-600/10 blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl relative"
            >
                <Link to="/" className="absolute top-4 left-4 md:top-6 md:left-6 p-2 hover:bg-white/5 rounded-lg transition-colors group">
                    <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                </Link>
                <div className="text-center mb-6 md:mb-8 mt-6 md:mt-0">
                    <h2 className={`text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${role === 'student' ? 'from-purple-400 to-pink-400' : 'from-cyan-400 to-blue-400'}`}>
                        {role === 'student' ? 'Student Login' : 'Teacher Portal'}
                    </h2>
                    <p className="text-gray-400 mt-2">Enter your classroom dashboard</p>
                </div>

                {/* Role Tabs */}
                <div className="flex bg-black/40 p-1 rounded-xl mb-6">
                    <button
                        type="button"
                        onClick={() => setRole('student')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${role === 'student' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Student
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('teacher')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${role === 'teacher' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Teacher
                    </button>
                </div>

                {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm italic">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="email"
                                required
                                className={`w-full bg-black/40 border border-white/10 rounded-xl px-12 py-3.5 focus:outline-none focus:border-${role === 'student' ? 'purple' : 'cyan'}-500 text-white transition-colors`}
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="password"
                                required
                                className={`w-full bg-black/40 border border-white/10 rounded-xl px-12 py-3.5 focus:outline-none focus:border-${role === 'student' ? 'purple' : 'cyan'}-500 text-white transition-colors`}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 bg-gradient-to-r ${role === 'student' ? 'from-purple-600 to-pink-600 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)]' : 'from-cyan-600 to-blue-600 hover:shadow-[0_0_20px_rgba(8,145,178,0.3)]'} rounded-xl font-bold transition-all flex items-center justify-center gap-2 group disabled:opacity-50`}
                    >
                        {loading ? <Loader className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                </form>

                <p className="mt-8 text-center text-gray-400 text-sm">
                    New here? <Link to="/signup" className="text-purple-400 hover:text-purple-300 transition-colors underline font-medium">Create a {role === 'student' ? 'Student' : 'Teacher'} Account</Link>
                </p>
            </motion.div>
        </div>
    )
}

export default LoginPage
