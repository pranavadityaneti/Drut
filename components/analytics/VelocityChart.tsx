import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { LearningVelocity } from '../../services/analyticsService';

interface Props {
    data: LearningVelocity[];
}

export const VelocityChart: React.FC<Props> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No activity in the last 30 days</div>;
    }

    // Format date for X-axis (e.g., "Nov 12")
    const formattedData = data.map(d => ({
        ...d,
        dateStr: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6C5DD3" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6C5DD3" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="dateStr" tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value: number) => [`${value}%`, 'Accuracy']}
                    />
                    <Area
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#6C5DD3"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorAccuracy)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
