import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@drut/shared";

/**
 * Badge — editorial refresh, take 2.
 *
 * Tag-shaped (rounded-md, not pill). Subtle muted fill is the base; a small
 * colored dot or colored text carries the meaning. No pastel washes.
 *
 * Variants:
 *   - default    primary brand action
 *   - secondary  legacy secondary token
 *   - destructive
 *   - outline    hairline border, no fill
 *   - neutral    muted gray fill (the new default look for most badges)
 *   - success    muted fill + green dot + green text
 *   - accent     muted fill + coral dot + coral text
 *   - trendUp    muted fill + green text "+12.5%"
 *   - trendDown  muted fill + red text "−6.2%"
 *
 * Render trend pills as <Badge variant="trendUp">+12.5%</Badge> — no arrow glyph.
 */

const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-[11px] font-semibold tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 num-tabular",
    {
        variants: {
            variant: {
                default:
                    "bg-[#3d7a0f] text-white",
                secondary:
                    "bg-secondary text-secondary-foreground",
                destructive:
                    "bg-destructive text-destructive-foreground",
                outline:
                    "ring-hairline-strong text-foreground",
                neutral:
                    "bg-[var(--color-muted)] text-[var(--color-ink-1)]",
                success:
                    "bg-[var(--color-muted)] text-[#3d7a0f] before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#3d7a0f]",
                accent:
                    "bg-[var(--color-muted)] text-[var(--color-accent-warm-foreground)] before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--color-accent-warm)]",
                trendUp:
                    "bg-[var(--color-muted)] text-[#3d7a0f]",
                trendDown:
                    "bg-[var(--color-muted)] text-[#a8332b]",
            },
        },
        defaultVariants: {
            variant: "neutral",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
