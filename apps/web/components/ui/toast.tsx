/**
 * Toast Component
 * 
 * General purpose toast notification
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@drut/shared';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastData {
    id: string;
    message: string;
    type?: 'success' | 'info' | 'warning';
    duration?: number;
}

interface ToastProps extends ToastData {
    onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type = 'info', duration = 3000, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(id), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, id, onDismiss]);

    const icons = {
        success: <CheckCircle2 className="w-4 h-4 text-[#3d7a0f]" />,
        info: <Info className="w-4 h-4 text-[var(--color-ink-2)]" />,
        warning: <AlertTriangle className="w-4 h-4 text-[var(--color-accent-warm-foreground)]" />,
    };

    // Editorial pattern: muted base + colored left stripe via ::before stripe color
    const stripeColors = {
        success: 'var(--color-primary)',
        info: 'var(--color-ink-2)',
        warning: 'var(--color-accent-warm)',
    };

    return (
        <div
            className={cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-[12px] bg-[var(--color-card)] ring-hairline-strong shadow-soft transition-all duration-300 overflow-hidden",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            )}
        >
            <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ background: stripeColors[type] }} />
            <span className="pl-2 flex items-center gap-2.5">
                {icons[type]}
                <span className="text-[13px] font-medium text-[var(--color-ink-1)]">{message}</span>
            </span>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onDismiss(id), 300);
                }}
                className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-[var(--color-ink-3)] hover:bg-[var(--color-muted)] hover:text-[var(--color-ink-1)] transition-colors"
                aria-label="Dismiss"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

interface ToastContainerProps {
    toasts: ToastData[];
    onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
};

// Hook for managing toasts
export function useToast() {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const addToast = (message: string, type: ToastData['type'] = 'info', duration = 3000) => {
        const id = `toast-${Date.now()}`;
        setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const dismissToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return { toasts, addToast, dismissToast };
}
