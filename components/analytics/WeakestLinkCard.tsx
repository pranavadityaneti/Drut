import React from 'react';
import { WeakestSubtopic } from '../../services/analyticsService';

interface Props {
    data: WeakestSubtopic[];
}

export const WeakestLinkCard: React.FC<Props> = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-3xl shadow-card h-full flex flex-col justify-center items-center text-center">
                <div className="p-3 bg-green-100 text-green-600 rounded-full mb-3">
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
        <div className="bg-white p-6 rounded-3xl shadow-card h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 text-red-500 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-foreground">Focus Areas</h3>
                    <p className="text-xs text-gray-400">Subtopics needing attention</p>
                </div>
            </div>

            <div className="space-y-4">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <div>
                            <h4 className="font-bold text-sm text-foreground">{item.subtopic}</h4>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">{item.topic}</p>
                        </div>
                        <div className="text-right">
                            <span className="block font-bold text-red-500">{item.accuracy}%</span>
                            <span className="text-[10px] text-gray-400">{item.attempts} attempts</span>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full mt-6 py-3 bg-red-50 text-red-500 font-semibold rounded-xl hover:bg-red-100 transition-colors text-sm">
                Practice Weakest
            </button>
        </div>
    );
};
