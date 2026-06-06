/**
 * CardMenu Component
 * 
 * Three-dot menu for cards with Refresh and Info actions
 */

import React, { useState } from 'react';
import { MoreHorizontal, RefreshCw, Info, X } from 'lucide-react';
import { cn } from '@drut/shared';

interface CardMenuProps {
    onRefresh?: () => void;
    infoTitle?: string;
    infoContent?: React.ReactNode;
    className?: string;
}

export const CardMenu: React.FC<CardMenuProps> = ({
    onRefresh,
    infoTitle = 'About this card',
    infoContent,
    className,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    const handleRefresh = () => {
        setIsOpen(false);
        onRefresh?.();
    };

    const handleInfo = () => {
        setIsOpen(false);
        setShowInfo(true);
    };

    return (
        <>
            {/* Menu Trigger */}
            <div className={cn("relative", className)}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Card menu"
                >
                    <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Menu */}
                        <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-[var(--color-card)] rounded-[14px] shadow-soft ring-hairline-strong p-1.5">
                            <button
                                onClick={handleRefresh}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[13px] text-[var(--color-ink-1)] hover:bg-[var(--color-muted)] transition-colors"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-[var(--color-ink-3)]" />
                                Refresh
                            </button>
                            {infoContent && (
                                <button
                                    onClick={handleInfo}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[13px] text-[var(--color-ink-1)] hover:bg-[var(--color-muted)] transition-colors"
                                >
                                    <Info className="w-3.5 h-3.5 text-[var(--color-ink-3)]" />
                                    Info
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Info Modal */}
            {showInfo && (
                <>
                    {/* Modal Backdrop */}
                    <div
                        className="fixed inset-0 z-50 bg-[rgba(11,11,13,0.45)] backdrop-blur-sm"
                        onClick={() => setShowInfo(false)}
                    />

                    {/* Modal Content */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <div className="bg-[var(--color-card)] rounded-[20px] ring-hairline-strong shadow-soft max-w-md w-full p-6 pointer-events-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[18px] font-semibold tracking-tight text-[var(--color-ink-1)]">
                                    {infoTitle}
                                </h3>
                                <button
                                    onClick={() => setShowInfo(false)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--color-ink-3)] hover:bg-[var(--color-muted)] hover:text-[var(--color-ink-1)] transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-[13px] text-[var(--color-ink-3)] leading-relaxed">
                                {infoContent}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default CardMenu;
