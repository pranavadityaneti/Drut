import React, { useState } from 'react';

interface DiagramRendererProps {
    /** Hosted image URL from Supabase Storage */
    diagramUrl: string | undefined | null;
    /** Legacy SVG code (deprecated, will be ignored) */
    diagramCode?: string | undefined | null;
    width?: number | string;
    height?: number;
    className?: string;
}

/**
 * DiagramRenderer - Renders hosted diagram images with tap-to-zoom
 * 
 * Updated to use hosted image URLs instead of inline SVG.
 * Features:
 * - White background for seamless blending
 * - 4:3 aspect ratio
 * - Tap-to-zoom modal for mobile
 * - Hides entirely if no diagramUrl (no placeholder)
 */
export const DiagramRenderer: React.FC<DiagramRendererProps> = ({
    diagramUrl,
    diagramCode: _deprecated,
    width = '100%',
    height = 200,
    className = '',
}) => {
    const [isZoomed, setIsZoomed] = useState(false);

    // Hide entirely if no diagram URL
    if (!diagramUrl) {
        return null;
    }

    // Toggle zoom modal
    const handleClick = () => setIsZoomed(!isZoomed);

    return (
        <>
            {/* Main diagram container */}
            <div
                className={`relative flex items-center justify-center my-4 bg-[var(--color-card)] rounded-[14px] ring-hairline cursor-pointer transition-transform hover:scale-[1.02] ${className}`}
                style={{
                    maxWidth: typeof width === 'number' ? `${width}px` : width,
                    aspectRatio: '4 / 3',
                }}
                onClick={handleClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleClick()}
                aria-label="Tap to zoom diagram"
            >
                <img
                    src={diagramUrl}
                    alt="Physics diagram"
                    className="object-contain w-full h-full p-2"
                    style={{ maxHeight: height }}
                    loading="eager"
                />
                {/* Zoom hint */}
                <div className="absolute bottom-2 right-2 bg-[var(--color-ink-1)] text-white text-[11px] font-medium px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity">
                    Tap to zoom
                </div>
            </div>

            {/* Fullscreen zoom modal */}
            {isZoomed && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,11,13,0.55)] backdrop-blur-sm"
                    onClick={handleClick}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="relative max-w-[90vw] max-h-[90vh] bg-[var(--color-card)] rounded-[20px] ring-hairline-strong p-4 shadow-hover">
                        <img
                            src={diagramUrl}
                            alt="Physics diagram (zoomed)"
                            className="object-contain max-w-full max-h-[80vh]"
                        />
                        <button
                            className="absolute -top-3 -right-3 w-8 h-8 bg-[var(--color-card)] ring-hairline-strong rounded-full shadow-soft flex items-center justify-center text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)]"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsZoomed(false);
                            }}
                            aria-label="Close zoom"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default DiagramRenderer;
