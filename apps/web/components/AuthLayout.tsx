import React from 'react';

/**
 * AuthLayout — editorial refresh.
 *
 * Split: form on the left (max-w-[420px]), warm-paper canvas on the right
 * with a halftone bleed and a quiet pull-quote. The lime-tinted #f6fbe8
 * panel and slate brand voice are retired.
 */

interface AuthLayoutProps {
    children: React.ReactNode;
    illustration?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, illustration }) => {
    return (
        <div className="flex min-h-screen bg-[var(--color-card)]">
            {/* LEFT: Form section */}
            <div className="relative flex w-full flex-col justify-between px-8 py-10 sm:w-1/2 md:px-16 lg:px-24 xl:px-28">
                {/* Brand wordmark at top */}
                <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-ink-1)] text-white font-bold text-sm">D</span>
                    <span className="font-semibold text-[15px] text-[var(--color-ink-1)] tracking-tight">Drut</span>
                </div>

                {/* Form content centered vertically */}
                <div className="mx-auto w-full max-w-[420px] my-12">
                    {children}
                </div>

                {/* Footer fine print */}
                <p className="text-[11px] text-[var(--color-ink-3)]">
                    © {new Date().getFullYear()} Drut. By continuing you agree to our terms.
                </p>
            </div>

            {/* RIGHT: Editorial canvas */}
            <div className="relative hidden w-1/2 bg-[var(--color-background)] sm:block overflow-hidden">
                {/* Halftone bleed at top */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute top-0 left-0 right-0 h-40 bg-halftone"
                />

                {/* Editorial pull-quote */}
                <div className="relative z-10 h-full flex flex-col justify-center max-w-[480px] mx-auto px-12">
                    <p className="label-uppercase">From the dashboard</p>
                    <blockquote className="mt-4">
                        <p className="text-[36px] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--color-ink-1)]">
                            "Practice the right thing, slowly, until it&apos;s automatic. That&apos;s the whole game."
                        </p>
                    </blockquote>
                    <div className="mt-6 flex items-center gap-3">
                        <span className="h-8 w-8 rounded-full bg-[var(--color-accent)] inline-flex items-center justify-center text-[var(--color-accent-foreground)] text-[12px] font-bold">D</span>
                        <div>
                            <p className="text-[13px] font-semibold text-[var(--color-ink-1)]">The Drut method</p>
                            <p className="text-[11px] text-[var(--color-ink-3)]">Speed comes from clarity.</p>
                        </div>
                    </div>

                    {/* Pagination dots — kept */}
                    <div className="flex items-center gap-1.5 mt-12">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ink-4)]" />
                        <span className="h-1.5 w-6 rounded-full bg-[var(--color-ink-1)]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ink-4)]" />
                    </div>
                </div>

                {/* Halftone bleed at bottom-right corner */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute bottom-0 right-0 h-48 w-72"
                    style={{
                        backgroundImage: 'radial-gradient(circle at center, rgba(11,11,13,0.22) 1px, transparent 1.4px)',
                        backgroundSize: '8px 8px',
                        WebkitMaskImage: 'radial-gradient(ellipse at bottom right, rgba(0,0,0,0.55), rgba(0,0,0,0) 70%)',
                        maskImage: 'radial-gradient(ellipse at bottom right, rgba(0,0,0,0.55), rgba(0,0,0,0) 70%)',
                    }}
                />
            </div>
        </div>
    );
};
