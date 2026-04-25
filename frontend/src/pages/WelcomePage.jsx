import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Users, BookOpen, Clock, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import heroImage from '../assets/hero.png'

const WelcomePage = () => {
    return (
        <div className="min-h-screen bg-[#030305] text-white overflow-hidden selection:bg-purple-500/30">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[100px]" />
            </div>

            {/* Navbar */}
            <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-2xl font-bold tracking-tighter"
                >
                    NexGen<span className="text-purple-500">Class</span>
                </motion.div>
                <Link to="/login">
                    <motion.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="cursor-pointer px-6 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md"
                    >
                        Sign In
                    </motion.button>
                </Link>
            </nav>

            {/* Hero Section */}
            <main className="container mx-auto px-6 pt-10 pb-20 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                    {/* Text Content */}
                    <div className="flex-1 text-center lg:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 text-sm text-purple-300"
                        >
                            <Activity className="w-4 h-4" />
                            <span>Real-time Collaboration Active</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="text-5xl lg:text-7xl font-bold leading-tight mb-6"
                        >
                            The Classroom <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400">
                                Re-Imagined
                            </span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="text-lg text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0"
                        >
                            Organize tasks, collaborate on projects, and submit assignments in real-time.
                            The ultimate dashboard for modern students and teachers.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                        >
                            <Link to="/signup">
                                <button className="cursor-pointer group px-8 py-4 bg-white text-black rounded-full font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                    Start Learning
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </Link>
                        </motion.div>
                    </div>

                    {/* Hero Image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="flex-1 relative"
                    >
                        <div className="relative w-full max-w-[600px] aspect-square mx-auto">
                            {/* Glow effect behind image */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 rounded-full blur-[60px] animate-pulse" />
                            <motion.img
                                src={heroImage}
                                alt="Classroom Hero"
                                className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
                                animate={{ y: [0, -20, 0] }}
                                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32">
                    {[
                        { icon: Users, title: "Classrooms", desc: "Join via code and instantly connect with peers." },
                        { icon: BookOpen, title: "Task Boards", desc: "Keep track of assignments with Kanban boards." },
                        { icon: Clock, title: "Real-time", desc: "Updates happen instantly across all devices." }
                    ].map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 + index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all backdrop-blur-sm group"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <feature.icon className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                            <p className="text-gray-400">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </main>
        </div>
    )
}

export default WelcomePage