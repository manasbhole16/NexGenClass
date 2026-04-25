import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, X, Trash2, AlertCircle } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const RoomChat = ({ roomId, user, isOpen, onClose, socket, isOwner }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [error, setError] = useState(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/chat/${roomId}`, { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    setMessages(data.messages.map(m => ({
                        id: m._id,
                        text: m.text,
                        sender: m.senderName,
                        senderId: m.sender,
                        timestamp: m.timestamp
                    })));
                }
            } catch (err) { console.error(err); }
        };

        if (isOpen) fetchHistory();
    }, [roomId, isOpen]);

    useEffect(() => {
        if (!socket) return;

        socket.on('chatMessage', (m) => {
            setMessages(prev => {
                const newMessage = {
                    id: m._id,
                    text: m.text,
                    sender: m.senderName,
                    senderId: m.sender,
                    timestamp: m.timestamp
                };
                return [...prev, newMessage].slice(-100);
            });
            setError(null);
        });

        socket.on('chatError', (err) => {
            setError(err.message);
        });

        return () => {
            socket.off('chatMessage');
            socket.off('chatError');
        };
    }, [socket]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || !user) return;

        const newMessage = {
            text: input,
            sender: user.fullname,
            senderId: user._id,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        if (socket) {
            socket.emit('chatMessage', { roomId, message: newMessage });
        }
        setInput('');
    };

    const handleClearChat = async () => {
        if (!window.confirm("Clear all chat history for this room?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/clear/${roomId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setMessages([]);
                setError(null);
            }
        } catch (err) { console.error(err); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 300, opacity: 0 }}
                    className="fixed right-6 bottom-24 w-80 h-[450px] bg-[#0f0f12] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-xl"
                >
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-purple-400" />
                            <h3 className="font-bold text-sm">Class Chat</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {isOwner && (
                                <button
                                    onClick={handleClearChat}
                                    className="p-1.5 hover:bg-red-500/10 text-red-400/60 hover:text-red-400 rounded-md transition-all"
                                    title="Clear Logs"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md transition-colors">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.length === 0 && !error && (
                            <div className="text-center py-10">
                                <MessageSquare className="w-8 h-8 text-white/5 mx-auto mb-2" />
                                <p className="text-gray-500 text-xs">No messages yet. Start the conversation!</p>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-[10px] text-red-400 mb-2">
                                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.senderId === user?._id ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] text-gray-500">{msg.sender?.split(' ')[0] || 'Unknown'}</span>
                                    <span className="text-[10px] text-gray-600">{msg.timestamp}</span>
                                </div>
                                <div className={`px-3 py-2 rounded-2xl text-xs max-w-[90%] ${msg.senderId === user?._id
                                    ? 'bg-purple-600 text-white rounded-tr-none'
                                    : 'bg-white/5 text-gray-300 rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={scrollRef} />
                    </div>

                    <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={error ? "Chat limit reached..." : "Type a message..."}
                                disabled={!!error}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:border-purple-500 outline-none pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                                type="submit"
                                disabled={!!error || !input.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:bg-gray-600"
                            >
                                <Send className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default RoomChat;
