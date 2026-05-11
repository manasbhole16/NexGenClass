import React, { useState } from 'react';
import API_BASE_URL from '../../apiConfig';
import { ArrowLeft, Save, Loader } from 'lucide-react';

const CreateQuiz = ({ roomId, onBack, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        timeLimit: 15, // default 15 minutes
        totalMarks: 10,
        deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 16) // default tomorrow
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quiz/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, roomId }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                onSuccess(data.quiz);
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Quiz</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Title</label>
                    <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 focus:border-pink-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                        placeholder="E.g. Midterm Physics Quiz"
                    />
                </div>
                
                <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Description</label>
                    <textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 focus:border-pink-500 outline-none h-24 resize-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                        placeholder="Instructions for the students..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Time Limit (mins)</label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={formData.timeLimit}
                            onChange={e => setFormData({ ...formData, timeLimit: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 focus:border-pink-500 outline-none text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Total Marks</label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={formData.totalMarks}
                            onChange={e => setFormData({ ...formData, totalMarks: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 focus:border-pink-500 outline-none text-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Deadline</label>
                    <input
                        type="datetime-local"
                        required
                        value={formData.deadline}
                        onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 focus:border-pink-500 outline-none text-gray-900 dark:text-white dark:[color-scheme:dark]"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                    {loading ? <Loader className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Quiz</>}
                </button>
            </form>
        </div>
    );
};

export default CreateQuiz;
