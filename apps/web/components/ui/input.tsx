import * as React from "react";
import { cn } from "@drut/shared";

/**
 * Input — editorial refresh.
 * 10px corners, hairline-strong ring, lime focus.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-[10px] bg-[var(--color-card)] ring-hairline-strong px-3 py-2 text-[14px] text-[var(--color-ink-1)] placeholder:text-[var(--color-ink-3)] transition-shadow file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
