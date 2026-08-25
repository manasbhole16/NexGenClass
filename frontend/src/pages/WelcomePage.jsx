import React from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { 
  GraduationCap, Users, BookOpen, BarChart3, 
  ArrowRight, CheckCircle2, Layout, Calendar,
  CheckSquare, MessageSquare, ChevronRight, LayoutDashboard
} from 'lucide-react';
import heroImage from '../assets/hero_illustration.jpg';

const WelcomePage = () => {
  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans overflow-x-hidden selection:bg-[#EDE9FE] selection:text-[#6D28D9]">
      
      {/* 4. NAVIGATION BAR */}
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 h-[72px] flex items-center transition-all duration-300">
        <div className="container mx-auto px-6 flex justify-between items-center">
          {/* LEFT: Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-[#6D28D9] flex items-center justify-center shadow-md shadow-[#6D28D9]/20 group-hover:shadow-lg transition-all duration-300">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              NextGen<span className="text-[#6D28D9]">Class</span>
            </span>
          </Link>

          {/* CENTER: Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-[#64748B]">
            <a href="#features" className="hover:text-[#6D28D9] transition-colors">Features</a>
            <a href="#teachers" className="hover:text-[#6D28D9] transition-colors">For Teachers</a>
            <a href="#students" className="hover:text-[#6D28D9] transition-colors">For Students</a>
            <a href="#about" className="hover:text-[#6D28D9] transition-colors">About</a>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden sm:block text-[15px] font-medium text-[#64748B] hover:text-[#111827] transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* 5. HERO SECTION & 9. HERO BACKGROUND */}
      <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-40 overflow-hidden">
        {/* Subtle Background Elements */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#F5F3FF] rounded-full blur-[120px] opacity-70 -z-10 translate-x-1/3 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#EDE9FE] rounded-full blur-[100px] opacity-50 -z-10 -translate-x-1/4 translate-y-1/4"></div>
        
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-8">
            
            {/* LEFT COLUMN: Text Content */}
            <div className="flex-1 w-full max-w-2xl lg:max-w-none text-center lg:text-left z-10">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#DCFCE7] border border-[#16A34A]/20 mb-8"
              >
                <div className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></div>
                <span className="text-xs font-semibold text-[#16A34A] tracking-wide uppercase">Real-time Collaboration Active</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="text-5xl lg:text-[72px] font-bold leading-[1.1] tracking-tight mb-6"
              >
                The Classroom <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6D28D9] to-[#3B82F6]">Re-Imagined</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-lg lg:text-xl text-[#64748B] mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                Organize tasks, collaborate on projects, and submit assignments in real-time. The ultimate dashboard for modern students and teachers.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-10"
              >
                <Link to="/signup" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#6D28D9] text-white font-semibold hover:bg-[#5b21b6] transition-all hover:shadow-lg hover:shadow-[#6D28D9]/25 hover:-translate-y-1">
                    Start Learning
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <a href="#features" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-[#6D28D9] font-semibold border-2 border-[#EDE9FE] hover:border-[#6D28D9]/30 hover:bg-[#F5F3FF] transition-all">
                    Learn More
                  </button>
                </a>
              </motion.div>
              
            </div>
            
            {/* RIGHT COLUMN: 6. HERO ILLUSTRATION & 7. PRODUCT UI & 8. FLOATING ELEMENTS */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="flex-1 w-full relative z-10"
            >
              <div className="relative w-full max-w-[600px] mx-auto xl:mr-0 aspect-[4/3]">
                {/* 7. Product UI Preview (Background) */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-6 -right-12 lg:-right-24 w-3/4 max-w-[400px] h-[300px] bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden z-0 hidden md:block"
                >
                  <div className="h-10 bg-[#F8FAFC] border-b border-gray-100 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <div className="ml-4 text-xs font-medium text-gray-400">My Classes - Dashboard</div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div className="bg-[#F5F3FF] rounded-xl p-3 border border-[#EDE9FE]">
                      <div className="w-8 h-8 rounded-lg bg-[#6D28D9] mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="bg-[#F0F9FF] rounded-xl p-3 border border-[#E0F2FE]">
                      <div className="w-8 h-8 rounded-lg bg-[#3B82F6] mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </motion.div>

                {/* 6. Main Illustration */}
                <img 
                  src={heroImage} 
                  alt="Students learning and collaborating" 
                  className="w-full h-full object-contain relative z-10"
                  style={{ filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.05))" }}
                />

                {/* 8. Floating Education Elements */}
                <motion.div 
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute top-10 -left-6 w-14 h-14 bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center justify-center z-20"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-[#6D28D9]" />
                  </div>
                </motion.div>
                
                <motion.div 
                  animate={{ y: [0, 15, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute bottom-20 -left-10 w-16 h-16 bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center justify-center z-20 hidden sm:flex"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, -10, 0], x: [0, 10, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                  className="absolute -bottom-6 right-10 w-14 h-14 bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center justify-center z-20"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-[#F59E0B]" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
            
          </div>
        </div>
      </section>


      {/* 11. FEATURES SECTION */}
      <section id="features" className="py-24 bg-[#F8FAFC]">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-[36px] lg:text-[48px] font-bold mb-4 tracking-tight">Everything you need for modern education</h2>
            <p className="text-lg text-[#64748B]">Powerful tools designed for seamless teaching and learning.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-[20px] p-8 shadow-sm hover:shadow-md border border-[#E5E7EB] transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-[#F5F3FF] flex items-center justify-center mb-6">
                <Layout className="w-7 h-7 text-[#8B5CF6]" />
              </div>
              <h3 className="text-[20px] font-bold mb-3">Smart Classroom</h3>
              <p className="text-[#64748B] leading-relaxed">Create, manage and organize classes with ease in a centralized dashboard.</p>
            </motion.div>

            {/* Card 2 */}
            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-[20px] p-8 shadow-sm hover:shadow-md border border-[#E5E7EB] transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-[#DCFCE7] flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-[#16A34A]" />
              </div>
              <h3 className="text-[20px] font-bold mb-3">Real-time Collaboration</h3>
              <p className="text-[#64748B] leading-relaxed">Students and teachers can interact in real-time through chat and shared boards.</p>
            </motion.div>

            {/* Card 3 */}
            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-[20px] p-8 shadow-sm hover:shadow-md border border-[#E5E7EB] transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-[#FEF3C7] flex items-center justify-center mb-6">
                <CheckSquare className="w-7 h-7 text-[#F59E0B]" />
              </div>
              <h3 className="text-[20px] font-bold mb-3">Assignments & Quizzes</h3>
              <p className="text-[#64748B] leading-relaxed">Create assignments, run timed quizzes and track submissions effortlessly.</p>
            </motion.div>

            {/* Card 4 */}
            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-[20px] p-8 shadow-sm hover:shadow-md border border-[#E5E7EB] transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-[#F0F9FF] flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7 text-[#3B82F6]" />
              </div>
              <h3 className="text-[20px] font-bold mb-3">Analytics Dashboard</h3>
              <p className="text-[#64748B] leading-relaxed">Get meaningful insights into student performance and attendance trends.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 13. "HOW IT WORKS" SECTION */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-[36px] lg:text-[48px] font-bold mb-4 tracking-tight">Learning made simple</h2>
            <p className="text-lg text-[#64748B]">Get started in minutes with our intuitive workflow.</p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-[2px] bg-gray-100 -translate-y-1/2 z-0"></div>

            <div className="grid md:grid-cols-3 gap-12 relative z-10">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-white border-4 border-[#F5F3FF] flex items-center justify-center shadow-md mb-6 z-10">
                  <span className="text-xl font-bold text-[#6D28D9]">01</span>
                </div>
                <h3 className="text-[22px] font-bold mb-2">Create or join a class</h3>
                <p className="text-[#64748B]">Teachers create virtual classrooms while students join instantly using unique codes.</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-white border-4 border-[#DCFCE7] flex items-center justify-center shadow-md mb-6 z-10">
                  <span className="text-xl font-bold text-[#16A34A]">02</span>
                </div>
                <h3 className="text-[22px] font-bold mb-2">Collaborate and learn</h3>
                <p className="text-[#64748B]">Share materials, complete assignments, and participate in real-time discussions.</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-white border-4 border-[#F0F9FF] flex items-center justify-center shadow-md mb-6 z-10">
                  <span className="text-xl font-bold text-[#3B82F6]">03</span>
                </div>
                <h3 className="text-[22px] font-bold mb-2">Track progress & succeed</h3>
                <p className="text-[#64748B]">Use powerful analytics to monitor attendance, grades, and overall academic health.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 14. FOR TEACHERS SECTION */}
      <section id="teachers" className="py-24 bg-[#F8FAFC]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 order-2 lg:order-1">
              {/* Abstract Teacher UI Representation */}
              <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 max-w-md mx-auto w-full relative">
                <div className="absolute -top-4 -left-4 w-20 h-20 bg-[#F5F3FF] rounded-full blur-2xl -z-10"></div>
                <div className="flex items-center gap-4 mb-6 border-b border-gray-50 pb-4">
                  <div className="w-12 h-12 bg-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold text-lg">T</div>
                  <div>
                    <h4 className="font-bold text-[#111827]">Teacher Dashboard</h4>
                    <p className="text-xs text-[#64748B]">Manage your classes</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-10 bg-gray-50 rounded-lg flex items-center px-4 gap-3">
                    <CheckSquare className="w-5 h-5 text-[#8B5CF6]" />
                    <span className="text-sm font-medium text-gray-700">Review 15 assignments</span>
                  </div>
                  <div className="h-10 bg-gray-50 rounded-lg flex items-center px-4 gap-3">
                    <Users className="w-5 h-5 text-[#16A34A]" />
                    <span className="text-sm font-medium text-gray-700">Take attendance for CS101</span>
                  </div>
                  <div className="h-10 bg-gray-50 rounded-lg flex items-center px-4 gap-3">
                    <BarChart3 className="w-5 h-5 text-[#F59E0B]" />
                    <span className="text-sm font-medium text-gray-700">Analyze quiz performance</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 order-1 lg:order-2">
              <h2 className="text-[36px] lg:text-[48px] font-bold mb-6 tracking-tight">Everything teachers need</h2>
              <ul className="space-y-4 mb-8">
                {['Create classes', 'Share materials', 'Manage assignments', 'Take attendance', 'Track student performance', 'Analyze progress'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[#6D28D9]" />
                    </div>
                    <span className="text-[17px] text-[#111827]">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/signup">
                <button className="flex items-center gap-2 text-[#6D28D9] font-semibold hover:text-[#5b21b6] transition-colors">
                  Explore Teacher Tools <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 15. FOR STUDENTS SECTION */}
      <section id="students" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-[36px] lg:text-[48px] font-bold mb-6 tracking-tight">Learning that keeps you on track</h2>
              <ul className="space-y-4 mb-8">
                {['Upcoming assignments', 'To-do list', 'Attendance', 'Grades', 'Class discussions', 'Progress tracking'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#DCFCE7] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                    </div>
                    <span className="text-[17px] text-[#111827]">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/signup">
                <button className="flex items-center gap-2 text-[#16A34A] font-semibold hover:text-[#15803d] transition-colors">
                  Start Learning <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>

            <div className="flex-1">
              {/* Abstract Student UI Representation */}
              <div className="bg-[#F8FAFC] p-6 rounded-[24px] shadow-sm border border-gray-100 max-w-md mx-auto w-full relative">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h4 className="font-bold text-[20px] text-[#111827]">My Progress</h4>
                    <p className="text-xs text-[#64748B]">Current Semester</p>
                  </div>
                  <div className="w-16 h-16 bg-white rounded-full border-4 border-[#16A34A] flex items-center justify-center">
                    <span className="font-bold text-[#16A34A]">A+</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Data Structures</span>
                    <span className="text-sm font-bold text-[#6D28D9]">95%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-[#6D28D9] h-2 rounded-full w-[95%]"></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Web Development</span>
                    <span className="text-sm font-bold text-[#3B82F6]">88%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-[#3B82F6] h-2 rounded-full w-[88%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 16. PRODUCT PREVIEW SECTION */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-[36px] lg:text-[48px] font-bold mb-4 tracking-tight">Experience the future of learning</h2>
            <p className="text-lg text-[#64748B]">A beautifully designed interface that makes education a breeze.</p>
          </div>
          
          <div className="max-w-5xl mx-auto rounded-xl shadow-2xl overflow-hidden border border-[#E5E7EB] bg-white">
            {/* Fake Browser Header */}
            <div className="h-12 bg-gray-100 flex items-center px-4 border-b border-gray-200 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="mx-auto bg-white px-32 py-1 rounded-md text-xs text-gray-400 border border-gray-200">
                app.nextgenclass.com
              </div>
            </div>
            
            {/* The "Screenshot" - A stylized representation of the dashboard */}
            <div className="flex h-[400px] md:h-[600px] bg-[#F8FAFC]">
              {/* Sidebar */}
              <div className="w-64 bg-white border-r border-gray-200 p-4 hidden md:block">
                <div className="flex items-center gap-2 mb-8 mt-2">
                  <GraduationCap className="w-6 h-6 text-[#6D28D9]" />
                  <span className="font-bold text-lg">NextGenClass</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-3 py-2 bg-[#F5F3FF] text-[#6D28D9] rounded-lg font-medium">
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                    <BookOpen className="w-4 h-4" /> Classes
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                    <Calendar className="w-4 h-4" /> Calendar
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                    <MessageSquare className="w-4 h-4" /> Messages
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                    <BarChart3 className="w-4 h-4" /> Analytics
                  </div>
                </div>
              </div>
              
              {/* Main Area */}
              <div className="flex-1 p-8 overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-[#111827]">Welcome back, Alex</h3>
                  <div className="w-10 h-10 rounded-full bg-gray-200 border border-gray-300"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-gray-500 text-sm font-medium mb-1">Enrolled Classes</h4>
                    <span className="text-3xl font-bold text-[#111827]">4</span>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-gray-500 text-sm font-medium mb-1">Upcoming Tasks</h4>
                    <span className="text-3xl font-bold text-[#111827]">12</span>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-gray-500 text-sm font-medium mb-1">Overall Grade</h4>
                    <span className="text-3xl font-bold text-[#16A34A]">92%</span>
                  </div>
                </div>
                
                <h4 className="font-bold text-lg mb-4 text-[#111827]">Active Classes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-32">
                    <div className="h-2 bg-[#6D28D9] w-full"></div>
                    <div className="p-4">
                      <h5 className="font-bold text-[#111827]">Introduction to Computer Science</h5>
                      <p className="text-sm text-gray-500">Prof. Smith • 45 Students</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-32">
                    <div className="h-2 bg-[#3B82F6] w-full"></div>
                    <div className="p-4">
                      <h5 className="font-bold text-[#111827]">Advanced Calculus</h5>
                      <p className="text-sm text-gray-500">Prof. Johnson • 32 Students</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 17. CALL TO ACTION SECTION */}
      <section className="py-24 bg-white relative overflow-hidden border-b border-gray-100">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[#F5F3FF] to-white -z-10"></div>
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-[36px] lg:text-[48px] font-bold mb-6 tracking-tight">Ready to transform your classroom?</h2>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto mb-10">
            Bring teaching, learning and collaboration together with NextGenClass. Join thousands of educators and students today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#6D28D9] text-white font-semibold hover:bg-[#5b21b6] transition-all hover:shadow-lg hover:shadow-[#6D28D9]/25 hover:-translate-y-1">
                Get Started
              </button>
            </Link>
            <Link to="/login">
              <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-[#111827] font-semibold border-2 border-gray-200 hover:border-gray-300 transition-all hover:-translate-y-1">
                Explore Classes
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* 18. FOOTER */}
      <footer className="bg-white pt-16 pb-8 border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 lg:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#6D28D9] flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-[#111827]">
                  NextGen<span className="text-[#6D28D9]">Class</span>
                </span>
              </Link>
              <p className="text-[#64748B] text-sm max-w-xs mb-6">
                The modern EdTech platform designed to counteract academic failure and bring seamless collaboration to students and teachers.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-[#111827] mb-4">Platform</h4>
              <ul className="space-y-3 text-sm text-[#64748B]">
                <li><a href="#features" className="hover:text-[#6D28D9] transition-colors">Features</a></li>
                <li><a href="#teachers" className="hover:text-[#6D28D9] transition-colors">For Teachers</a></li>
                <li><a href="#students" className="hover:text-[#6D28D9] transition-colors">For Students</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-[#111827] mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-[#64748B]">
                <li><a href="#" className="hover:text-[#6D28D9] transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-[#6D28D9] transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-[#6D28D9] transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-[#111827] mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-[#64748B]">
                <li><a href="#about" className="hover:text-[#6D28D9] transition-colors">About</a></li>
                <li><a href="#" className="hover:text-[#6D28D9] transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-[#6D28D9] transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#64748B]">© {new Date().getFullYear()} NextGenClass. All rights reserved.</p>
            <div className="flex items-center gap-4 text-[#64748B]">
              <a href="#" className="hover:text-[#6D28D9] transition-colors">Twitter</a>
              <a href="#" className="hover:text-[#6D28D9] transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-[#6D28D9] transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default WelcomePage;