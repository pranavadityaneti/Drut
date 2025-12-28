import React from 'react';
import { ActivityHeatmap } from '@drut/shared'; // from ../../services/analyticsService';

interface Props {
    data: ActivityHeatmap[];
}

export const ActivityHeatmapGrid: React.FC<Props> = ({ data }) => {
    // Generate last 365 days
    const today = new Date();
    const days = [];
    for (let i = 364; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push(d);
    }

    // Create a map for quick lookup
    const activityMap = new Map(data.map(item => [item.day, item.count]));

    const getColor = (count: number) => {
        if (count === 0) return 'bg-gray-100';
        if (count <= 5) return 'bg-purple-200';
        if (count <= 10) return 'bg-purple-300';
        if (count <= 20) return 'bg-purple-400';
        return 'bg-purple-600';
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-card w-full overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">Learning Consistency</h3>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Less</span>
                    <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
                    <div className="w-3 h-3 bg-purple-300 rounded-sm"></div>
                    <div className="w-3 h-3 bg-purple-600 rounded-sm"></div>
                    <span>More</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-1 justify-center">
                {days.map((day, i) => {
                    const dateStr = day.toISOString().split('T')[0];
                    const count = (activityMap.get(dateStr) as number) || 0;
                    return (
                        <div
                            key={i}
                            className={`w-3 h-3 rounded-sm ${getColor(count)}`}
                            title={`${dateStr}: ${count} questions`}
                        />
                    );
                })}
            </div>
        </div>
    );
};
