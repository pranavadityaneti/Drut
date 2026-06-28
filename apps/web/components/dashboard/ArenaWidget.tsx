/**
 * ArenaWidget Component — leaderboard slot.
 *
 * Leaderboards are NOT live yet, so this shows an honest "coming soon" state
 * rather than fabricated names/scores. TODO: wire to a real get_leaderboard RPC
 * (user_leaderboard table + weekly score aggregation + league promotion) and
 * render real rankings before surfacing competitive data.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '@drut/shared';
import { Trophy } from 'lucide-react';

interface ArenaWidgetProps {
    // Accepted but unused until the real leaderboard is wired (keeps callers stable).
    currentUserRank?: number;
    currentUserScore?: number;
    className?: string;
}

export const ArenaWidget: React.FC<ArenaWidgetProps> = ({ className }) => {
    return (
        <Card className={cn("min-h-[280px]", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    The Arena
                </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col items-center justify-center text-center py-10 gap-2">
                <div className="w-12 h-12 rounded-full bg-[var(--color-muted)] flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-[var(--color-ink-4)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--color-ink-1)]">Leaderboards coming soon</p>
                <p className="text-xs text-[var(--color-ink-3)] max-w-[210px] leading-relaxed">
                    Keep practicing — rankings and leagues unlock as more learners join the beta.
                </p>
            </CardContent>
        </Card>
    );
};

export default ArenaWidget;
