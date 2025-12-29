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
                className={`relative flex items-center justify-center my-4 bg-white rounded-xl border border-gray-100 cursor-pointer transition-transform hover:scale-[1.02] ${className}`}
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
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Tap to zoom
                </div>
            </div>

            {/* Fullscreen zoom modal */}
            {isZoomed && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={handleClick}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-xl p-4 shadow-2xl">
                        <img
                            src={diagramUrl}
                            alt="Physics diagram (zoomed)"
                            className="object-contain max-w-full max-h-[80vh]"
                        />
                        <button
                            className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsZoomed(false);
                            }}
                            aria-label="Close zoom"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default DiagramRenderer;
