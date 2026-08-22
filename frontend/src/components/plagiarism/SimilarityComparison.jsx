import React from 'react';
import { ShieldCheck, ArrowRight, BookOpen, AlertTriangle } from 'lucide-react';

const SimilarityComparison = ({ currentText, sourceText, matchedSegments = [] }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-black/30 rounded-2xl border border-gray-200 dark:border-white/10">
            {/* Left: Current Submission */}
            <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/10">
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" /> Current Submission
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        Target
                    </span>
                </div>
                <div className="p-3 bg-white dark:bg-[#151518] rounded-xl border border-gray-100 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300 max-h-64 overflow-y-auto custom-scrollbar font-mono leading-relaxed">
                    {currentText || 'No text content available.'}
                </div>
            </div>

            {/* Right: Matched Peer Submission */}
            <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/10">
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-pink-500" /> Matched Peer Source
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-pink-500/10 text-pink-600 dark:text-pink-400">
                        Source
                    </span>
                </div>
                <div className="p-3 bg-white dark:bg-[#151518] rounded-xl border border-gray-100 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300 max-h-64 overflow-y-auto custom-scrollbar font-mono leading-relaxed">
                    {sourceText || 'No matched peer source text available.'}
                </div>
            </div>

            {/* Matched Segments List */}
            {matchedSegments.length > 0 && (
                <div className="md:col-span-2 pt-2 space-y-2 border-t border-gray-200 dark:border-white/10">
                    <h5 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Matched Overlapping Phrases ({matchedSegments.length})
                    </h5>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                        {matchedSegments.map((seg, idx) => (
                            <div key={idx} className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                                <span className="font-bold text-amber-600">#{idx + 1}</span>
                                <div className="flex-1">
                                    <p className="italic">"{seg.text || seg.sourcePhrase}"</p>
                                    <span className="text-[9px] text-amber-600/80 mt-0.5 block">
                                        Source: {seg.sourceStudentName || 'Peer'} ({seg.length} words matched)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimilarityComparison;
