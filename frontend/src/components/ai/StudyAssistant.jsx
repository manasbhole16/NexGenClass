import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Send, Bot, User as UserIcon, Paperclip, X, Plus,
    Trash2, Copy, Check, RefreshCw, BookOpen, BrainCircuit,
    Target, AlertCircle, FileText, ChevronRight, MessageSquare,
    CheckCircle, Clock, ShieldCheck
} from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import ResourcePickerModal from '../files/ResourcePickerModal';
import StudyGuideModal from './StudyGuideModal';
import StudyPlanModal from './StudyPlanModal';

const StudyAssistant = ({ roomId, user, onClose, isModal = false }) => {
    const isTeacher = user?.role === 'teacher';
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputPrompt, setInputPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showResourcePicker, setShowResourcePicker] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Modal helpers
    const [studyGuideData, setStudyGuideData] = useState(null);
    const [showStudyPlanModal, setShowStudyPlanModal] = useState(false);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    // Load user conversations
    const fetchConversations = async () => {
        try {
            const url = roomId && roomId !== 'personal'
                ? `${API_BASE_URL}/api/ai/conversations?roomId=${roomId}`
                : `${API_BASE_URL}/api/ai/conversations`;
            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.conversations) {
                setConversations(data.conversations);
                if (data.conversations.length > 0 && !activeConversationId) {
                    loadConversation(data.conversations[0]._id);
                } else if (data.conversations.length === 0) {
                    createNewConversation();
                }
            }
        } catch (e) {
            console.error('Failed to load conversations:', e);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, [roomId]);

    const loadConversation = async (convId) => {
        try {
            setActiveConversationId(convId);
            const res = await fetch(`${API_BASE_URL}/api/ai/conversations/${convId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.conversation) {
                setMessages(data.conversation.messages || []);
            }
        } catch (e) {
            console.error('Failed to load conversation details:', e);
        }
    };

    const createNewConversation = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: isTeacher ? 'Teaching Copilot Session' : 'Academic Study Session',
                    roomId: roomId && roomId !== 'personal' ? roomId : null,
                    mode: isTeacher ? 'teaching_copilot' : 'study_assistant'
                })
            });
            const data = await res.json();
            if (res.ok && data.conversation) {
                setConversations(prev => [data.conversation, ...prev]);
                setActiveConversationId(data.conversation._id);
                setMessages(data.conversation.messages || []);
                setSelectedFile(null);
            }
        } catch (e) {
            console.error('Failed to create new conversation:', e);
        }
    };

    const handleDeleteConversation = async (convId, e) => {
        e.stopPropagation();
        try {
            await fetch(`${API_BASE_URL}/api/ai/conversations/${convId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            setConversations(prev => prev.filter(c => c._id !== convId));
            if (activeConversationId === convId) {
                setActiveConversationId(null);
                setMessages([]);
                createNewConversation();
            }
        } catch (err) {
            console.error('Delete conversation error:', err);
        }
    };

    const handleSendMessage = async (customPrompt = null) => {
        const text = (customPrompt || inputPrompt).trim();
        if (!text || loading) return;

        setInputPrompt('');
        const userMsg = { role: 'user', content: text, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            // If no active conversation, create one first
            let convId = activeConversationId;
            if (!convId) {
                const initRes = await fetch(`${API_BASE_URL}/api/ai/conversations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        title: text.slice(0, 30),
                        roomId: roomId && roomId !== 'personal' ? roomId : null
                    })
                });
                const initData = await initRes.json();
                convId = initData.conversation._id;
                setActiveConversationId(convId);
                setConversations(prev => [initData.conversation, ...prev]);
            }

            const res = await fetch(`${API_BASE_URL}/api/ai/conversations/${convId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: text,
                    fileId: selectedFile?._id || null
                })
            });

            const data = await res.json();
            if (res.ok && data.message) {
                setMessages(prev => [...prev, data.message]);
            } else {
                setMessages(prev => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: data.message || 'I encountered an error retrieving that answer. Please try again.',
                        isError: true
                    }
                ]);
            }
        } catch (err) {
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Network connection failed. Please check your connection and retry.',
                    isError: true
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (content, index) => {
        navigator.clipboard.writeText(content);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleQuickStudyGuide = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/study-guide`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    topic: selectedFile ? selectedFile.originalName : 'Coursework Revision',
                    fileId: selectedFile?._id,
                    roomId: roomId && roomId !== 'personal' ? roomId : null
                })
            });
            const data = await res.json();
            if (res.ok && data.guide) {
                setStudyGuideData(data.guide);
            }
        } catch (e) {
            console.error('Study guide error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickPerformanceCheck = async () => {
        handleSendMessage("Analyze my observable academic performance factors across attendance and coursework.");
    };

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-[#0f0f12] ${isModal ? 'rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden' : 'rounded-2xl border border-gray-200 dark:border-white/5'}`}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                {isTeacher ? 'Teaching Copilot' : 'AI Study Assistant'}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Safe Academic AI
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Context-aware classroom intelligence</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${showHistory ? 'bg-purple-500/10 text-purple-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                        title="Session History"
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">Sessions</span>
                    </button>
                    <button
                        onClick={createNewConversation}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-purple-500/20 transition-all active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5" /> New
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* History Drawer */}
                <AnimatePresence>
                    {showHistory && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 240, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="border-r border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-black/20 overflow-y-auto flex flex-col p-3 space-y-1 custom-scrollbar"
                        >
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 px-2 py-1">Saved Sessions</span>
                            {conversations.map(c => (
                                <div
                                    key={c._id}
                                    onClick={() => loadConversation(c._id)}
                                    className={`p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer group transition-all ${
                                        activeConversationId === c._id
                                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span className="truncate max-w-[150px]">{c.title || 'Untitled Session'}</span>
                                    <button
                                        onClick={(e) => handleDeleteConversation(c._id, e)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Messages Chat Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0f0f12]">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="py-12 text-center space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 mx-auto flex items-center justify-center">
                                    <Bot className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                    {isTeacher ? 'Welcome to your Teaching Copilot' : 'Welcome to your AI Study Assistant'}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                    Ask questions about lecture notes, generate practice problems, summarize classroom documents, or synthesize revision plans.
                                </p>
                            </div>
                        )}

                        {messages.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role !== 'user' && (
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-purple-500/10">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                )}

                                <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                                    <div
                                        className={`p-4 rounded-2xl text-xs leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'bg-purple-600 text-white rounded-br-none shadow-md shadow-purple-500/10 font-medium'
                                                : msg.isError
                                                ? 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-bl-none'
                                                : 'bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/5 text-gray-800 dark:text-gray-200 rounded-bl-none'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap">{msg.content}</p>

                                        {/* Sources Attribution */}
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-white/10 flex flex-wrap items-center gap-1.5">
                                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                                    Verified Sources:
                                                </span>
                                                {msg.sources.map((s, si) => (
                                                    <span
                                                        key={si}
                                                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center gap-1"
                                                    >
                                                        <FileText className="w-3 h-3" /> {s.title}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {msg.role !== 'user' && (
                                        <div className="flex items-center gap-2 px-1">
                                            <button
                                                onClick={() => handleCopy(msg.content, index)}
                                                className="text-[10px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
                                            >
                                                {copiedIndex === index ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                {copiedIndex === index ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <UserIcon className="w-4 h-4" />
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {loading && (
                            <div className="flex gap-3 items-center">
                                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="p-3.5 rounded-2xl bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/5 rounded-bl-none flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Prompts Bar */}
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/10 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                        <button
                            onClick={handleQuickStudyGuide}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors"
                        >
                            <BookOpen className="w-3 h-3" /> Study Guide
                        </button>
                        {!isTeacher && (
                            <>
                                <button
                                    onClick={() => setShowStudyPlanModal(true)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors"
                                >
                                    <Target className="w-3 h-3" /> 7-Day Study Plan
                                </button>
                                <button
                                    onClick={handleQuickPerformanceCheck}
                                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors"
                                >
                                    <Clock className="w-3 h-3" /> Performance Factors
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => handleSendMessage("Generate 5 conceptual practice questions to test my understanding.")}
                            className="px-2.5 py-1 rounded-lg bg-gray-200/60 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors"
                        >
                            <BrainCircuit className="w-3 h-3" /> 5 Practice Questions
                        </button>
                    </div>

                    {/* Attached Context Chip */}
                    {selectedFile && (
                        <div className="px-4 py-1.5 bg-purple-500/5 border-t border-purple-500/10 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold truncate">
                                <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">Context Document: {selectedFile.originalName}</span>
                            </div>
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Input Bar */}
                    <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#0f0f12] flex items-center gap-2">
                        {roomId && roomId !== 'personal' && (
                            <button
                                type="button"
                                onClick={() => setShowResourcePicker(true)}
                                className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-purple-500/10 hover:text-purple-600 text-gray-500 transition-colors"
                                title="Attach Classroom Document Context"
                            >
                                <Paperclip className="w-4 h-4" />
                            </button>
                        )}

                        <input
                            type="text"
                            placeholder={selectedFile ? `Ask about "${selectedFile.originalName}"...` : isTeacher ? 'Ask Teaching Copilot (e.g. Draft rubric, generate test items)...' : 'Ask Study Assistant (e.g. Explain concepts, summarize notes)...'}
                            value={inputPrompt}
                            onChange={e => setInputPrompt(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-purple-500 rounded-xl text-xs outline-none text-gray-900 dark:text-white font-medium transition-all"
                        />

                        <button
                            type="button"
                            onClick={() => handleSendMessage()}
                            disabled={loading || !inputPrompt.trim()}
                            className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Attached Modals */}
            {showResourcePicker && (
                <ResourcePickerModal
                    isOpen={showResourcePicker}
                    onClose={() => setShowResourcePicker(false)}
                    roomId={roomId}
                    onSelectResource={(res) => {
                        setSelectedFile({ _id: res.fileId || res._id, originalName: res.fileName || res.originalName || res.title });
                        setShowResourcePicker(false);
                    }}
                />
            )}

            {studyGuideData && (
                <StudyGuideModal
                    isOpen={Boolean(studyGuideData)}
                    onClose={() => setStudyGuideData(null)}
                    guide={studyGuideData}
                />
            )}

            {showStudyPlanModal && (
                <StudyPlanModal
                    isOpen={showStudyPlanModal}
                    onClose={() => setShowStudyPlanModal(false)}
                    roomId={roomId}
                />
            )}
        </div>
    );
};

export default StudyAssistant;
