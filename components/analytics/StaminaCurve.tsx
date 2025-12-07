import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { StaminaPoint } from '../../services/analyticsService';

interface Props {
    data: StaminaPoint[];
}

export const StaminaCurve: React.FC<Props> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Complete a sprint session to see your stamina curve</div>;
    }

    // Convert to chart format
    const chartData = data.map(point => ({
        index: point.question_index,
        time: Math.round(point.time_taken_ms / 1000), // seconds
        correct: point.is_correct ? 1 : 0
    }));

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                        dataKey="index"
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Question #', position: 'bottom', fill: '#9ca3af', fontSize: 10 }}
                    />
                    <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Time (s)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 10 }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value: any, name: string) => {
                            if (name === 'time') return [`${value}s`, 'Time'];
                            return [`${value === 1 ? 'Correct' : 'Wrong'}`, 'Result'];
                        }}
                    />
                    <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Time Limit', fill: '#ef4444', fontSize: 10 }} />
                    <Line type="monotone" dataKey="time" stroke="#FF754C" strokeWidth={2} dot={{ fill: '#FF754C', r: 3 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
