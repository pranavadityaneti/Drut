/**
 * WeakSpotsWidget Component
 * 
 * Shows the user's 3 weakest subtopics based on accuracy
 * with actionable "Practice" buttons for each
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '@/lib/utils';
import { Target, AlertTriangle, TrendingDown, ChevronRight } from 'lucide-react';
import { fetchWeakestSubtopics, WeakestSubtopic } from '../../services/analyticsService';

interface WeakSpotsWidgetProps {
    className?: string;
    onPractice?: (subtopic: string, topic: string) => void;
}

export const WeakSpotsWidget: React.FC<WeakSpotsWidgetProps> = ({
    className,
    onPractice
}) => {
    const [weakSpots, setWeakSpots] = useState<WeakestSubtopic[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadWeakSpots = async () => {
            try {
                const data = await fetchWeakestSubtopics(3);
                setWeakSpots(data);
            } catch (err) {
                console.error('Failed to load weak spots:', err);
            } finally {
                setLoading(false);
            }
        };
        loadWeakSpots();
    }, []);

    const handlePractice = (spot: WeakestSubtopic) => {
        if (onPractice) {
            onPractice(spot.subtopic, spot.topic);
        } else {
            console.log('Practice:', spot.subtopic);
        }
    };

    // Get severity color based on accuracy
    const getSeverityColor = (accuracy: number) => {
        if (accuracy < 40) return 'text-red-600 bg-red-50';
        if (accuracy < 60) return 'text-orange-600 bg-orange-50';
        return 'text-amber-600 bg-amber-50';
    };

    return (
        <Card className={cn("min-h-[280px]", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="w-4 h-4 text-red-500" />
                    Focus Areas
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-pulse text-muted-foreground text-sm">
                            Loading weak spots...
                        </div>
                    </div>
                ) : weakSpots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                            <Target className="w-6 h-6 text-emerald-500" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Complete some practice sessions<br />to see your focus areas
                        </p>
                    </div>
                ) : (
                    <>
                        {weakSpots.map((spot, index) => (
                            <div
                                key={`${spot.topic}-${spot.subtopic}`}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                                    "hover:shadow-sm hover:border-gray-300"
                                )}
                                onClick={() => handlePractice(spot)}
                            >
                                {/* Severity indicator */}
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                    getSeverityColor(spot.accuracy)
                                )}>
                                    {Math.round(spot.accuracy)}%
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {spot.subtopic}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {spot.topic} • {spot.attempts} attempts
                                    </p>
                                </div>

                                {/* Practice CTA */}
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                        ))}

                        <p className="text-xs text-muted-foreground text-center pt-2">
                            Click to practice weak areas
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default WeakSpotsWidget;
