import React from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    Area,
    ComposedChart
} from 'recharts';
import { StaminaPoint } from '@drut/shared';

interface Props {
    data: StaminaPoint[];
}

/**
 * StaminaCurve — editorial chart treatment.
 *
 * Lime dashed stroke with soft area fill at ~14% alpha. Dotted grid in
 * ink-5. Axis labels in label-uppercase tracking. Time-limit reference
 * in destructive red, dashed. Tooltip uses hairline ring + 14px radius
 * + ink-1 type. Empty state cleaned up.
 */

const TICK_STYLE = { fill: '#7a7a82', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const };

export const StaminaCurve: React.FC<Props> = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-ink-3)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                </span>
                <p className="text-[12px] text-[var(--color-ink-3)]">Complete a sprint to see your stamina curve.</p>
            </div>
        );
    }

    const chartData = data.map(point => ({
        index: point.question_index,
        time: Math.round(point.time_taken_ms / 1000),
        correct: point.is_correct ? 1 : 0
    }));

    return (
        <div className="stamina-curve h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 12, right: 12, bottom: 24, left: 0 }}>
                    <defs>
                        <linearGradient id="stamina-area" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#5cbb21" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="#5cbb21" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="2 4"
                        stroke="#ececef"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="index"
                        tick={TICK_STYLE}
                        tickLine={false}
                        axisLine={false}
                        label={{
                            value: 'Question #',
                            position: 'bottom',
                            fill: '#7a7a82',
                            fontSize: 10,
                            letterSpacing: '0.08em',
                        }}
                    />
                    <YAxis
                        tick={TICK_STYLE}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                        label={{
                            value: 'Time (s)',
                            angle: -90,
                            position: 'insideLeft',
                            fill: '#7a7a82',
                            fontSize: 10,
                            letterSpacing: '0.08em',
                            offset: 12,
                        }}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '14px',
                            border: '1px solid rgba(11, 11, 13, 0.10)',
                            boxShadow: '0 8px 24px -12px rgba(11, 11, 13, 0.18)',
                            background: '#ffffff',
                            padding: '8px 12px',
                            fontSize: '12px',
                            color: '#0b0b0d',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                        labelStyle={{
                            color: '#7a7a82',
                            fontSize: '10px',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginBottom: '4px',
                        }}
                        cursor={{ stroke: '#c7c7cd', strokeDasharray: '2 4' }}
                        formatter={(value: any, name: string) => {
                            if (name === 'time') return [`${value}s`, 'Time'];
                            return [value === 1 ? 'Correct' : 'Wrong', 'Result'];
                        }}
                    />
                    <ReferenceLine
                        y={45}
                        stroke="#e0483e"
                        strokeDasharray="4 4"
                        label={{
                            value: 'Time limit',
                            fill: '#e0483e',
                            fontSize: 10,
                            position: 'insideTopRight',
                            letterSpacing: '0.08em',
                        }}
                    />

                    {/* Soft area fill under the line */}
                    <Area
                        type="monotone"
                        dataKey="time"
                        stroke="none"
                        fill="url(#stamina-area)"
                        isAnimationActive={false}
                    />

                    {/* Dashed lime line */}
                    <Line
                        type="monotone"
                        dataKey="time"
                        stroke="#5cbb21"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                        dot={{ fill: '#5cbb21', stroke: '#ffffff', strokeWidth: 1.5, r: 3 }}
                        activeDot={{ fill: '#ff7a3a', stroke: '#ffffff', strokeWidth: 2, r: 5 }}
                        isAnimationActive={true}
                        animationDuration={900}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
