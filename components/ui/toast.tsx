/**
 * Toast Component
 * 
 * General purpose toast notification
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
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
        success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        info: <Info className="w-5 h-5 text-blue-600" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    };

    const bgColors = {
        success: 'bg-emerald-50 border-emerald-200',
        info: 'bg-blue-50 border-blue-200',
        warning: 'bg-amber-50 border-amber-200',
    };

    return (
        <div
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300",
                bgColors[type],
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            )}
        >
            {icons[type]}
            <span className="text-sm font-medium text-foreground">{message}</span>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onDismiss(id), 300);
                }}
                className="ml-2 text-muted-foreground hover:text-foreground"
            >
                <X className="w-4 h-4" />
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
