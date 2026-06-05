import * as React from "react";
import { cn } from "@drut/shared";

/**
 * TicketCard — editorial ticket/kanban card pattern.
 *
 * Header row: subject icon chip + title + ID/right-meta + optional avatar.
 * Body rows: label/value pairs (Origin, Priority, etc.) rendered via `meta` prop
 * or as <TicketCardRow> children.
 *
 * This is a presentational primitive — it never fetches or mutates data.
 * Used by WeakSpots, DebtCollector, MasteryGrid items (in later phases).
 */

interface TicketCardProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: React.ReactNode;        // small subject icon (lucide-react node, etc.)
    title: React.ReactNode;
    id?: React.ReactNode;          // e.g. "#OPS-129"
    rightSlot?: React.ReactNode;   // e.g. avatar
    accent?: "default" | "primary" | "warm" | "danger";
    /** When true, the card gets a subtle coral underline (used for the one featured item per view). */
    featured?: boolean;
}

const accentChip: Record<NonNullable<TicketCardProps["accent"]>, string> = {
    default: "bg-[var(--color-muted)] text-[var(--color-ink-2)]",
    primary: "bg-[#eef6dd] text-[#3d7a0f]",
    warm: "bg-[var(--color-accent-warm-soft)] text-[var(--color-accent-warm-foreground)]",
    danger: "bg-[#fde7e5] text-[#a8332b]",
};

export const TicketCard = React.forwardRef<HTMLDivElement, TicketCardProps>(
    ({ className, icon, title, id, rightSlot, accent = "default", featured, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "relative rounded-[1.25rem] bg-card ring-hairline p-5 flex flex-col gap-3",
                "transition-shadow card-hover",
                featured && "ring-hairline-strong",
                className
            )}
            {...props}
        >
            {/* Featured underline */}
            {featured && (
                <span
                    aria-hidden
                    className="absolute left-5 right-5 bottom-0 h-[2px] rounded-full bg-[var(--color-accent-warm)]"
                />
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {icon && (
                        <span
                            className={cn(
                                "shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-[10px]",
                                accentChip[accent]
                            )}
                        >
                            {icon}
                        </span>
                    )}
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--color-ink-1)] truncate tracking-tight">
                            {title}
                        </div>
                        {id && (
                            <div className="text-[11px] text-[var(--color-ink-3)] num-tabular mt-0.5">
                                {id}
                            </div>
                        )}
                    </div>
                </div>
                {rightSlot && <div className="shrink-0">{rightSlot}</div>}
            </div>

            {/* Body */}
            {children && (
                <div className="flex flex-col gap-1.5 pt-1">
                    {children}
                </div>
            )}
        </div>
    )
);
TicketCard.displayName = "TicketCard";

interface TicketCardRowProps {
    icon?: React.ReactNode;
    label: React.ReactNode;
    value: React.ReactNode;
    className?: string;
}

export const TicketCardRow: React.FC<TicketCardRowProps> = ({ icon, label, value, className }) => (
    <div className={cn("flex items-center justify-between text-[12px]", className)}>
        <div className="flex items-center gap-2 text-[var(--color-ink-3)]">
            {icon && <span className="inline-flex h-3.5 w-3.5 items-center justify-center [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
            <span className="font-medium">{label}</span>
        </div>
        <div className="text-[var(--color-ink-1)] font-medium">{value}</div>
    </div>
);

export default TicketCard;
