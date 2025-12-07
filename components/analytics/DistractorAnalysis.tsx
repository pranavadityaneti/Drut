import React from 'react';
import { DistractorData } from '../../services/analyticsService';

interface Props {
    data: DistractorData[];
}

export const DistractorAnalysis: React.FC<Props> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Practice more to see distractor patterns</div>;
    }

    // Group by subtopic
    const grouped: Record<string, DistractorData[]> = data.reduce((acc, item) => {
        if (!acc[item.subtopic]) acc[item.subtopic] = [];
        acc[item.subtopic].push(item);
        return acc;
    }, {} as Record<string, DistractorData[]>);

    return (
        <div className="space-y-4">
            {Object.entries(grouped).slice(0, 3).map(([subtopic, items]) => (
                <div key={subtopic} className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <h4 className="font-bold text-sm text-red-900 mb-2">{subtopic}</h4>
                    <div className="space-y-2">
                        {items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                                <span className="text-red-600 font-bold mt-0.5">⚠</span>
                                <div className="flex-1">
                                    <p className="text-red-800 leading-tight">"{item.wrong_answer_text}"</p>
                                    <p className="text-red-500 mt-1">Chosen {item.choice_count} time{item.choice_count > 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
