import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Mail, Lock, User, Loader } from 'lucide-react'
import API_BASE_URL from '../apiConfig'

const SignupPage = ({ onSignup }) => {
    const [formData, setFormData] = useState({ fullname: '', email: '', password: '', role: 'student' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            })
            const data = await res.json()
            if (res.ok && data.success) {
                onSignup(data.user)
                navigate('/rooms')
            } else {
                setError(data.message || 'Signup failed')
            }
        } catch (err) {
            setError('Connection failed.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#030305] text-white flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[120px]" />
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl relative"
            >
                <Link to="/" className="absolute top-4 left-4 md:top-6 md:left-6 p-2 hover:bg-white/5 rounded-lg transition-colors group">
                    <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                </Link>
                <h2 className={`text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${formData.role === 'student' ? 'from-purple-400 to-pink-400' : 'from-cyan-400 to-blue-400'} text-center mb-6 md:mb-8 mt-6 md:mt-0`}>
                    Join NexGen as {formData.role === 'student' ? 'Student' : 'Teacher'}
                </h2>

                {/* Role Tabs */}
                <div className="flex bg-black/40 p-1 rounded-xl mb-6">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'student' })}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.role === 'student' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Student
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'teacher' })}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.role === 'teacher' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Teacher
                    </button>
                </div>

                {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                        <div className="relative font-medium text-gray-400 mb-1">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                required
                                className={`w-full bg-black/20 border border-white/10 rounded-xl px-10 py-3 focus:border-${formData.role === 'student' ? 'purple' : 'cyan'}-500 outline-none text-white transition-colors`}
                                placeholder="Your Name"
                                value={formData.fullname}
                                onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                        <div className="relative font-medium text-gray-400 mb-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="email"
                                required
                                className={`w-full bg-black/20 border border-white/10 rounded-xl px-10 py-3 focus:border-${formData.role === 'student' ? 'purple' : 'cyan'}-500 outline-none text-white transition-colors`}
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                        <div className="relative font-medium text-gray-400 mb-1">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="password"
                                required
                                className={`w-full bg-black/20 border border-white/10 rounded-xl px-10 py-3 focus:border-${formData.role === 'student' ? 'purple' : 'cyan'}-500 outline-none text-white transition-colors`}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 bg-gradient-to-r ${formData.role === 'student' ? 'from-purple-600 to-pink-600 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)]' : 'from-cyan-600 to-blue-600 hover:shadow-[0_0_20px_rgba(8,145,178,0.3)]'} rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50`}
                    >
                        {loading ? <Loader className="w-5 h-5 animate-spin" /> : <>Sign Up <ArrowRight className="w-5 h-5" /></>}
                    </button>
                </form>

                <p className="mt-6 text-center text-gray-400">
                    Already have an account? <Link to="/login" className="text-purple-400 hover:text-purple-300">Sign in</Link>
                </p>
            </motion.div>
        </div>
    )
}

export default SignupPage
