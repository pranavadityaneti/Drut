import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis } from 'recharts';
import { SprintPerformance } from '../../services/analyticsService';

interface Props {
    data: SprintPerformance[];
}

export const SprintScatter: React.FC<Props> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No sprint sessions yet</div>;
    }

    // Convert avg_time_ms to seconds for better readability
    const formattedData = data.map(d => ({
        ...d,
        avg_time_sec: Number((d.avg_time_ms / 1000).toFixed(1))
    }));

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                        type="number"
                        dataKey="avg_time_sec"
                        name="Speed"
                        unit="s"
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Avg Time (s)', position: 'bottom', fill: '#9ca3af', fontSize: 10 }}
                    />
                    <YAxis
                        type="number"
                        dataKey="accuracy"
                        name="Accuracy"
                        unit="%"
                        domain={[0, 100]}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <ZAxis type="number" dataKey="total_questions" range={[50, 400]} name="Questions" />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Scatter name="Sessions" data={formattedData} fill="#FF754C" />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};
