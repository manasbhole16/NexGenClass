import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PresenceAvatars = ({ users, typingUser }) => {
    // Limit to 5 avatars, then show count
    const safeUsers = Array.isArray(users) ? users : [];
    const displayUsers = safeUsers.slice(0, 5);
    const remainingCount = safeUsers.length - 5;

    return (
        <div className="flex items-center gap-6">
            <div className="flex -space-x-3 items-center">
                <AnimatePresence>
                    {displayUsers.map((u, i) => (
                        <motion.div
                            key={u.socketId}
                            initial={{ opacity: 0, scale: 0.5, x: -20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.5, x: -20 }}
                            className="relative group"
                            title={u.fullname}
                        >
                            <div className="w-10 h-10 rounded-full border-2 border-[#030305] bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-bold shadow-lg">
                                {u.fullname?.[0] || '?'}
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#030305] shadow-sm" />

                            {/* Handcrafted Tooltip */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold">
                                {u.fullname}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {remainingCount > 0 && (
                    <div className="w-10 h-10 rounded-full border-2 border-[#030305] bg-[#18181b] flex items-center justify-center text-xs text-gray-400 font-bold z-10">
                        +{remainingCount}
                    </div>
                )}
            </div>

            {/* Typing Indicator */}
            <AnimatePresence>
                {typingUser && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex items-center gap-2 text-xs text-purple-400 font-medium bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20"
                    >
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        {typingUser.fullname?.split(' ')[0] || 'Someone'} is typing...
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PresenceAvatars;
