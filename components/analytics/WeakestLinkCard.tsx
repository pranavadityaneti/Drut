import React from 'react';
import { WeakestSubtopic } from '../../services/analyticsService';

interface Props {
    data: WeakestSubtopic[];
}

export const WeakestLinkCard: React.FC<Props> = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 h-full flex flex-col justify-center items-center text-center">
                <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="font-bold text-foreground">Doing Great!</h3>
                <p className="text-sm text-gray-400 mt-1">No weak areas detected yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-foreground">Focus Areas</h3>
                <button className="text-gray-400 hover:text-foreground"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
            </div>

            <div className="space-y-4">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-red-100 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                            <div>
                                <h4 className="font-bold text-sm text-foreground group-hover:text-red-500 transition-colors">{item.subtopic}</h4>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{item.topic}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block font-bold text-red-500">{item.accuracy}%</span>
                            <span className="text-[10px] text-gray-400">{item.attempts} attempts</span>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full mt-6 py-3 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-100 transition-colors text-sm">
                Practice Weakest
            </button>
        </div>
    );
};
