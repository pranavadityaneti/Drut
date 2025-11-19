import React from 'react';
import { WeakestSubtopic } from '../../services/analyticsService';

interface Props {
    data: WeakestSubtopic[];
}

export const WeakestLinkCard: React.FC<Props> = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-surface p-6 rounded-3xl shadow-elevation-1 border border-border/20 h-full flex flex-col justify-center items-center text-center">
                <div className="p-3 bg-tertiary-container text-on-tertiary-container rounded-full mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-title-medium font-medium text-on-surface">Doing Great!</h3>
                <p className="text-body-small text-on-surface-variant mt-1">No weak areas detected yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-surface p-6 rounded-3xl shadow-elevation-1 border border-border/20 h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-error-container text-on-error-container rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-title-medium font-medium text-on-surface">Focus Areas</h3>
                    <p className="text-body-small text-on-surface-variant">Subtopics needing attention</p>
                </div>
            </div>

            <div className="space-y-4">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-surface-variant/50 rounded-2xl border border-border/10">
                        <div>
                            <h4 className="text-label-large font-medium text-on-surface">{item.subtopic}</h4>
                            <p className="text-label-small text-on-surface-variant uppercase tracking-wide">{item.topic}</p>
                        </div>
                        <div className="text-right">
                            <span className="block text-label-large font-bold text-error">{item.accuracy}%</span>
                            <span className="text-label-small text-on-surface-variant">{item.attempts} attempts</span>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full mt-6 py-3 bg-error-container text-on-error-container font-medium rounded-full hover:shadow-elevation-1 transition-all text-label-large">
                Practice Weakest
            </button>
        </div>
    );
};
