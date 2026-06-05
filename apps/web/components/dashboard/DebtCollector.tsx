/**
 * DebtCollector — editorial refresh.
 *
 * Sticky-style panel showing patterns flagged is_in_debt. Each pattern
 * renders as a TicketCard with a coral-warm icon chip, the formatted FSM
 * tag as title, time-since as a meta row. The most overdue (highest days
 * since last practice) takes the featured slot. Clear Debt CTA is the ink
 * button. Empty state uses lime check + new tokens.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { CardMenu } from '../ui/CardMenu';
import { Button } from '../ui/Button';
import { TicketCard, TicketCardRow } from '../ui/TicketCard';
import { Badge } from '../ui/badge';
import { cn } from '@drut/shared';
import { AlertTriangle, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';

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

const formatTag = (tag: string) =>
    tag
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

const daysSince = (dateStr: string) => {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
};

const timeSinceLabel = (dateStr: string) => {
    const days = daysSince(dateStr);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
};

export const DebtCollector: React.FC<DebtCollectorProps> = ({
    patterns,
    onClearDebt,
    onRefresh,
    className,
}) => {
    const hasDebt = patterns.length > 0;

    // Featured = oldest unpaid (highest days since last practiced)
    const visible = patterns.slice(0, 5);
    const featuredIdx = visible.length > 0
        ? visible.reduce((maxIdx, p, i, arr) =>
            daysSince(p.last_practiced_at) > daysSince(arr[maxIdx].last_practiced_at) ? i : maxIdx, 0)
        : -1;

    return (
        <Card className={cn("min-h-[280px]", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="flex items-center gap-2 text-[14px] tracking-tight">
                            <AlertTriangle className={cn(
                                "w-4 h-4",
                                hasDebt ? "text-[var(--color-accent-warm)]" : "text-[var(--color-ink-3)]"
                            )} />
                            Debt collector
                        </CardTitle>
                        {hasDebt && (
                            <Badge variant="accent" className="num-tabular">
                                {patterns.length}
                            </Badge>
                        )}
                    </div>
                    <CardMenu
                        onRefresh={onRefresh}
                        infoTitle="About Debt Collector"
                        infoContent={
                            <p>Patterns go into debt when you skip drills or miss them repeatedly. Clear the debt by practicing them to lock the pattern in.</p>
                        }
                    />
                </div>
            </CardHeader>

            <CardContent className="space-y-2.5">
                {!hasDebt ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] mb-3">
                            <CheckCircle2 className="w-5 h-5" />
                        </span>
                        <p className="text-[14px] font-semibold text-[var(--color-ink-1)] tracking-tight">All clear</p>
                        <p className="text-[12px] text-[var(--color-ink-3)] mt-1">No patterns currently in debt.</p>
                    </div>
                ) : (
                    <>
                        {visible.map((pattern, index) => (
                            <TicketCard
                                key={pattern.id}
                                icon={<Clock className="w-4 h-4" />}
                                accent={index === featuredIdx ? 'warm' : 'default'}
                                title={formatTag(pattern.fsm_tag)}
                                id={`#${pattern.id.slice(0, 6)}`}
                                featured={index === featuredIdx}
                                className="cursor-pointer"
                                rightSlot={
                                    <ChevronRight className="w-4 h-4 text-[var(--color-ink-3)]" />
                                }
                            >
                                <TicketCardRow
                                    label="Last practice"
                                    value={timeSinceLabel(pattern.last_practiced_at)}
                                />
                                <TicketCardRow
                                    label="Streak broken"
                                    value={`${pattern.streak} → 0`}
                                />
                            </TicketCard>
                        ))}

                        {patterns.length > 5 && (
                            <p className="text-[11px] text-[var(--color-ink-3)] text-center">
                                +{patterns.length - 5} more patterns
                            </p>
                        )}

                        {/* Clear Debt CTA */}
                        <Button
                            onClick={onClearDebt}
                            variant="ink"
                            className="w-full mt-2"
                        >
                            Clear debt now
                        </Button>

                        <p className="text-[11px] text-center text-[var(--color-ink-3)]">
                            Practicing these locks the pattern back in.
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default DebtCollector;
