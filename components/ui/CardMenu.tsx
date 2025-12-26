/**
 * CardMenu Component
 * 
 * Three-dot menu for cards with Refresh and Info actions
 */

import React, { useState } from 'react';
import { MoreHorizontal, RefreshCw, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
                        <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-card rounded-xl shadow-lg border border-border py-1">
                            <button
                                onClick={handleRefresh}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh
                            </button>
                            {infoContent && (
                                <button
                                    onClick={handleInfo}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                                >
                                    <Info className="w-4 h-4" />
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
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowInfo(false)}
                    />

                    {/* Modal Content */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-6 pointer-events-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-foreground">
                                    {infoTitle}
                                </h3>
                                <button
                                    onClick={() => setShowInfo(false)}
                                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed">
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
