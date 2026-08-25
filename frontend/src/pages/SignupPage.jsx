import React, { useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Mail, Lock, User, Loader, GraduationCap, Eye, EyeOff } from 'lucide-react'
import API_BASE_URL from '../apiConfig'
import authImage from '../assets/auth_illustration.jpg'

const SignupPage = ({ onSignup }) => {
    const [formData, setFormData] = useState({ fullname: '', email: '', password: '', role: 'student' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!agreedToTerms) {
            setError('Please agree to the Terms & Conditions.')
            return
        }
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
        } catch (err) { // eslint-disable-line no-unused-vars
            setError('Connection failed.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-[#EDE9FE] selection:text-[#6D28D9]">
            
            {/* LEFT COLUMN: Illustration & Brand Message */}
            <div className="hidden lg:flex w-[45%] xl:w-[50%] bg-[#F5F3FF] flex-col relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#EDE9FE] blur-[100px] opacity-70"></div>
                
                {/* Logo Area */}
                <div className="p-8 relative z-10">
                    <Link to="/" className="flex items-center gap-2 group w-fit">
                        <div className="w-10 h-10 rounded-xl bg-[#6D28D9] flex items-center justify-center shadow-md shadow-[#6D28D9]/20 transition-all duration-300">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-[#111827]">
                            NextGen<span className="text-[#6D28D9]">Class</span>
                        </span>
                    </Link>
                </div>

                {/* Text Content */}
                <div className="px-12 pt-8 pb-4 relative z-10 max-w-xl">
                    <motion.h1 
                        key={formData.role}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold text-[#111827] mb-4 leading-tight"
                    >
                        {formData.role === 'student' 
                            ? "Start your learning journey" 
                            : "Build better learning experiences"}
                    </motion.h1>
                    <motion.p 
                        key={`${formData.role}-desc`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-[#64748B]"
                    >
                        {formData.role === 'student'
                            ? "Join your classes, collaborate with teachers, manage assignments, and stay on top of your learning."
                            : "Create classes, manage assignments, track attendance, and help students succeed."}
                    </motion.p>
                </div>

                {/* Illustration */}
                <div className="flex-1 relative flex items-end justify-center p-8 z-10">
                    <motion.img 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        src={authImage} 
                        alt="Academic learning illustration" 
                        className="w-full max-w-md object-contain drop-shadow-2xl rounded-2xl mix-blend-multiply"
                    />
                </div>
            </div>

            {/* RIGHT COLUMN: Auth Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
                {/* Mobile Logo & Back Button */}
                <div className="w-full max-w-[460px] flex justify-between items-center mb-8 lg:hidden">
                    <Link to="/" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-[#F5F3FF] hover:border-[#EDE9FE] hover:text-[#6D28D9] transition-all">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#6D28D9] flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-[#111827]">
                            NextGen<span className="text-[#6D28D9]">Class</span>
                        </span>
                    </Link>
                </div>

                {/* Desktop Back Button */}
                <Link to="/" className="hidden lg:flex absolute top-8 left-8 w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center hover:bg-[#F5F3FF] hover:border-[#EDE9FE] hover:text-[#6D28D9] text-gray-500 transition-all z-10 shadow-sm">
                    <ArrowLeft className="w-5 h-5" />
                </Link>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-[460px] bg-white rounded-[24px] shadow-sm shadow-gray-200/50 border border-gray-100 p-8 sm:p-10"
                >
                    <div className="text-center mb-8">
                        <h2 className="text-[28px] font-bold text-[#111827] mb-2 tracking-tight">Join NextGenClass</h2>
                        <p className="text-[#64748B]">Create your account to get started.</p>
                    </div>

                    {/* Role Toggle */}
                    <div className="flex bg-[#F8FAFC] p-1.5 rounded-xl mb-8 border border-gray-100">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, role: 'student' })}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                formData.role === 'student' 
                                ? 'bg-[#6D28D9] text-white shadow-sm' 
                                : 'text-[#64748B] hover:text-[#111827] hover:bg-gray-100'
                            }`}
                        >
                            Student
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, role: 'teacher' })}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                formData.role === 'teacher' 
                                ? 'bg-[#6D28D9] text-white shadow-sm' 
                                : 'text-[#64748B] hover:text-[#111827] hover:bg-gray-100'
                            }`}
                        >
                            Teacher
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex flex-col">
                            <span className="text-[#DC2626] text-sm font-medium">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Full Name */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#111827] mb-2 uppercase tracking-wide">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#6D28D9] transition-colors" />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white border border-gray-200 rounded-xl px-11 py-3.5 focus:border-[#6D28D9] focus:ring-4 focus:ring-[#EDE9FE] outline-none text-[#111827] transition-all placeholder:text-gray-400"
                                    placeholder="Your Name"
                                    value={formData.fullname}
                                    onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#111827] mb-2 uppercase tracking-wide">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#6D28D9] transition-colors" />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white border border-gray-200 rounded-xl px-11 py-3.5 focus:border-[#6D28D9] focus:ring-4 focus:ring-[#EDE9FE] outline-none text-[#111827] transition-all placeholder:text-gray-400"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[13px] font-semibold text-[#111827] mb-2 uppercase tracking-wide">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#6D28D9] transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-12 py-3.5 focus:border-[#6D28D9] focus:ring-4 focus:ring-[#EDE9FE] outline-none text-[#111827] transition-all placeholder:text-gray-400"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="flex items-start gap-3 pt-2">
                            <div className="flex items-center h-5">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="w-4 h-4 text-[#6D28D9] bg-white border-gray-300 rounded focus:ring-[#6D28D9] cursor-pointer"
                                />
                            </div>
                            <label htmlFor="terms" className="text-sm text-[#64748B] leading-snug cursor-pointer">
                                I agree to the <a href="#" className="text-[#6D28D9] hover:underline font-medium">Terms & Conditions</a> and <a href="#" className="text-[#6D28D9] hover:underline font-medium">Privacy Policy</a>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-[52px] bg-[#6D28D9] text-white rounded-xl font-bold transition-all hover:bg-[#5b21b6] hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:hover:translate-y-0"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader className="w-5 h-5 animate-spin" /> Creating account...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Create Account <ArrowRight className="w-5 h-5" />
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[15px] text-[#64748B]">
                            Already have an account?{' '}
                            <Link to="/login" className="text-[#6D28D9] font-bold hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default SignupPage
