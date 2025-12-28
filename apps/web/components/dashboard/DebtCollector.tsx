/**
 * DebtCollector Component
 * 
 * Sticky right panel showing patterns with is_in_debt = TRUE
 * Modern design with CardMenu
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { CardMenu } from '../ui/CardMenu';
import { Button } from '../ui/Button';
import { cn } from '@drut/shared';
import { AlertTriangle, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';

interface DebtPattern {
    id: string;
    fsm_tag: string;
    streak: number;
    last_practiced_at: string;
}

interface DebtCollectorProps {
    patterns: DebtPattern[];
    onClearDebt?: () => void;
    onRefresh?: () => void;
    className?: string;
}

export const DebtCollector: React.FC<DebtCollectorProps> = ({
    patterns,
    onClearDebt,
    onRefresh,
    className,
}) => {
    const hasDebt = patterns.length > 0;

    // Format fsm_tag to display name
    const formatTag = (tag: string) => {
        return tag
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Time since last practice
    const timeSince = (dateStr: string) => {
        const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    };

    return (
        <Card className={cn(
            "min-h-[280px]", // Match SpeedPulse height
            hasDebt && "border-amber-200 bg-amber-50/50",
            className
        )}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <AlertTriangle className={cn(
                                "w-4 h-4",
                                hasDebt ? "text-amber-600" : "text-muted-foreground"
                            )} />
                            Debt Collector
                        </CardTitle>
                        {hasDebt && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                {patterns.length}
                            </Badge>
                        )}
                    </div>
                    <CardMenu
                        onRefresh={onRefresh}
                        infoTitle="About Debt Collector"
                        infoContent={
                            <p>Patterns go into "debt" when you skip practice drills or answer incorrectly multiple times. Clear your debt by practicing these patterns to reinforce your learning.</p>
                        }
                    />
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {!hasDebt ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                        </div>
                        <p className="text-emerald-600 font-medium">All Clear!</p>
                        <p className="text-muted-foreground text-sm mt-1">Start Your Debt-Free Journey</p>
                    </div>
                ) : (
                    <>
                        {/* Debt list */}
                        <div className="space-y-2">
                            {patterns.slice(0, 5).map((pattern, index) => (
                                <div
                                    key={pattern.id}
                                    className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                                >
                                    {/* Index */}
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-xs font-medium text-amber-700">
                                        {index + 1}
                                    </span>

                                    {/* Pattern info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {formatTag(pattern.fsm_tag)}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {timeSince(pattern.last_practiced_at)}
                                        </div>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                </div>
                            ))}
                        </div>

                        {patterns.length > 5 && (
                            <p className="text-xs text-muted-foreground text-center">
                                +{patterns.length - 5} more patterns
                            </p>
                        )}

                        {/* Clear Debt button */}
                        <Button
                            onClick={onClearDebt}
                            className="w-full mt-2"
                            variant="default"
                        >
                            Clear Debt Now
                        </Button>

                        {/* Hint text */}
                        <p className="text-xs text-center text-muted-foreground">
                            These patterns need reinforcement
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default DebtCollector;
