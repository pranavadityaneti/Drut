/**
 * ArenaWidget Component
 * 
 * Leaderboard widget for the left sidebar
 * Light theme with clean styling
 * 
 * TODO: Build real leaderboard logic with:
 * - user_leaderboard table in Supabase
 * - Weekly/monthly score aggregation
 * - League promotion/demotion system
 * - get_leaderboard RPC function
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '@/lib/utils';
import { Trophy, Crown, Flame } from 'lucide-react';

interface LeaderboardEntry {
    rank: number;
    name: string;
    score: number;
    isCurrentUser: boolean;
}

interface ArenaWidgetProps {
    currentUserRank?: number;
    currentUserScore?: number;
}

// Mock leaderboard data - TODO: Replace with real data from Supabase
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
    { rank: 1, name: 'Arjun S.', score: 520, isCurrentUser: false },
    { rank: 2, name: 'Priya M.', score: 485, isCurrentUser: false },
    { rank: 3, name: 'Rahul K.', score: 472, isCurrentUser: false },
    { rank: 4, name: 'You', score: 450, isCurrentUser: true },
    { rank: 5, name: 'Sneha R.', score: 445, isCurrentUser: false },
];

export const ArenaWidget: React.FC<ArenaWidgetProps> = ({
    currentUserRank = 4,
    currentUserScore = 450,
}) => {
    // Update mock data with current user values
    const leaderboard = MOCK_LEADERBOARD.map(entry =>
        entry.isCurrentUser
            ? { ...entry, rank: currentUserRank, score: currentUserScore }
            : entry
    ).sort((a, b) => a.rank - b.rank);

    return (
        <Card className="min-h-[280px]">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    The Arena
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-1.5">
                {leaderboard.map((entry) => (
                    <div
                        key={entry.rank}
                        className={cn(
                            "flex items-center gap-2.5 p-2 rounded-lg transition-colors",
                            entry.isCurrentUser
                                ? "bg-emerald-50 border border-emerald-200"
                                : "hover:bg-muted/50"
                        )}
                    >
                        {/* Rank */}
                        <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            entry.rank === 1 && "bg-amber-100 text-amber-700",
                            entry.rank === 2 && "bg-gray-100 text-gray-600",
                            entry.rank === 3 && "bg-orange-100 text-orange-700",
                            entry.rank > 3 && "bg-muted text-muted-foreground"
                        )}>
                            {entry.rank === 1 ? <Crown className="w-3 h-3" /> : entry.rank}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                            <p className={cn(
                                "text-sm font-medium truncate",
                                entry.isCurrentUser ? "text-emerald-700" : "text-foreground"
                            )}>
                                {entry.name}
                            </p>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                            <span className="text-sm font-medium text-muted-foreground">
                                {entry.score}
                            </span>
                        </div>
                    </div>
                ))}

                {/* League info */}
                <div className="pt-3 mt-3 border-t text-center">
                    <p className="text-xs text-muted-foreground">
                        <span className="text-amber-600 font-medium">Bronze League</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Top 20 advance to Silver
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default ArenaWidget;
