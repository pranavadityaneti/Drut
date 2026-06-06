/**
 * WeakSpotsWidget — editorial refresh.
 *
 * Shows the user's 3 weakest subtopics. Each item is rendered as a TicketCard
 * with a severity icon chip on the left, subtopic title + topic/attempts row,
 * accuracy % as the rightSlot. The worst spot (lowest accuracy) takes the
 * featured slot with a coral underline.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { CardMenu } from '../ui/CardMenu';
import { TicketCard, TicketCardRow } from '../ui/TicketCard';
import { cn } from '@drut/shared';
import { Target, ChevronRight, AlertOctagon, AlertTriangle, AlertCircle } from 'lucide-react';
import { fetchWeakestSubtopics, WeakestSubtopic } from '@drut/shared';

interface WeakSpotsWidgetProps {
    className?: string;
    onPractice?: (subtopic: string, topic: string) => void;
}

// Map accuracy to severity tier
const severity = (acc: number): { accent: 'danger' | 'warm' | 'primary'; icon: React.ElementType; label: string } => {
    if (acc < 40) return { accent: 'danger', icon: AlertOctagon, label: 'Critical' };
    if (acc < 60) return { accent: 'warm', icon: AlertTriangle, label: 'High' };
    return { accent: 'primary', icon: AlertCircle, label: 'Moderate' };
};

export const WeakSpotsWidget: React.FC<WeakSpotsWidgetProps> = ({
    className,
    onPractice
}) => {
    const [weakSpots, setWeakSpots] = useState<WeakestSubtopic[]>([]);
    const [loading, setLoading] = useState(true);

    const loadWeakSpots = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchWeakestSubtopics(3);
            setWeakSpots(data);
        } catch (err) {
            console.error('Failed to load weak spots:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadWeakSpots();
    }, [loadWeakSpots]);

    const handlePractice = (spot: WeakestSubtopic) => {
        if (onPractice) {
            onPractice(spot.subtopic, spot.topic);
        } else {
            console.log('Practice:', spot.subtopic);
        }
    };

    // Index of the worst spot (lowest accuracy) — gets the featured slot
    const worstIdx = weakSpots.length > 0
        ? weakSpots.reduce((minIdx, s, i, arr) => (s.accuracy < arr[minIdx].accuracy ? i : minIdx), 0)
        : -1;

    return (
        <Card className={cn("min-h-[280px]", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-[14px] tracking-tight">
                        <Target className="w-4 h-4 text-[var(--color-ink-3)]" />
                        Focus areas
                    </CardTitle>
                    <CardMenu
                        onRefresh={loadWeakSpots}
                        infoTitle="About Focus Areas"
                        infoContent={
                            <p>These are your weakest subtopics by practice accuracy. Closing these gaps moves the overall score the most.</p>
                        }
                    />
                </div>
            </CardHeader>

            <CardContent className="space-y-2.5">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-pulse text-[var(--color-ink-3)] text-[13px]">
                            Loading focus areas…
                        </div>
                    </div>
                ) : weakSpots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] mb-3">
                            <Target className="w-5 h-5" />
                        </span>
                        <p className="text-[13px] text-[var(--color-ink-3)]">
                            Practice a few rounds and your weak spots will surface here.
                        </p>
                    </div>
                ) : (
                    <>
                        {weakSpots.map((spot, index) => {
                            const sev = severity(spot.accuracy);
                            const SevIcon = sev.icon;
                            return (
                                <TicketCard
                                    key={`${spot.topic}-${spot.subtopic}`}
                                    icon={<SevIcon className="w-4 h-4" />}
                                    accent={sev.accent}
                                    title={spot.subtopic}
                                    id={`${spot.topic} · ${spot.attempts} attempts`}
                                    featured={index === worstIdx}
                                    onClick={() => handlePractice(spot)}
                                    className="cursor-pointer"
                                    rightSlot={
                                        <span className="inline-flex items-center gap-1 num-tabular text-[12px] font-semibold text-[var(--color-ink-1)]">
                                            {Math.round(spot.accuracy)}%
                                            <ChevronRight className="w-3.5 h-3.5 text-[var(--color-ink-3)]" />
                                        </span>
                                    }
                                >
                                    <TicketCardRow label="Severity" value={sev.label} />
                                </TicketCard>
                            );
                        })}

                        <p className="text-[11px] text-[var(--color-ink-3)] text-center pt-1">
                            Click a card to start a focused session.
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default WeakSpotsWidget;
