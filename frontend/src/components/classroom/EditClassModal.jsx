import React, { useState, useEffect } from 'react';
import { X, GraduationCap } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import { BANNER_THEMES } from '../../utils/themeUtils';

const EditClassModal = ({ isOpen, onClose, room, onClassUpdated }) => {
    const [formData, setFormData] = useState({
        name: '',
        section: '',
        subject: '',
        room: '',
        description: '',
        banner: 'purple'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (room) {
            setFormData({
                name: room.name || '',
                section: room.section || '',
                subject: room.subject || '',
                room: room.room || '',
                description: room.description || '',
                banner: room.banner || 'purple'
            });
        }
    }, [room]);

    if (!isOpen || !room) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${room._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success && data.room) {
                if (onClassUpdated) onClassUpdated(data.room);
                onClose();
            } else {
                alert(data.message || "Failed to update classroom");
            }
        } catch (err) {
            console.error("Error updating class", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#18181c] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit class</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Form */}
                <form id="editClassForm" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                            Class name (required)
                        </label>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                Section
                            </label>
                            <input
                                type="text"
                                value={formData.section}
                                onChange={e => setFormData({ ...formData, section: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                Room / Venue
                            </label>
                            <input
                                type="text"
                                value={formData.room}
                                onChange={e => setFormData({ ...formData, room: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                            Subject
                        </label>
                        <input
                            type="text"
                            value={formData.subject}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                            Description
                        </label>
                        <textarea
                            rows="2"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-purple-500 transition-colors resize-none"
                        />
                    </div>

                    {/* Theme selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
                            Class theme
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(BANNER_THEMES).map(([key, theme]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, banner: key })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                                        formData.banner === key
                                            ? 'border-purple-500 bg-purple-500/20 text-purple-600 dark:text-purple-300 ring-2 ring-purple-500/30'
                                            : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                                    }`}
                                >
                                    <div className={`w-3 h-3 rounded-full ${theme.badge}`} />
                                    {theme.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 bg-gray-50/50 dark:bg-white/[0.02]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="editClassForm"
                        disabled={loading || !formData.name.trim()}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
                    >
                        {loading ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditClassModal;
