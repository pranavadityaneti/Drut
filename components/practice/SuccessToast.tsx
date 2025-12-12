import React, { useEffect, useState } from 'react';

interface SuccessToastProps {
    onComplete: () => void;
    timeSaved?: number;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({ onComplete, timeSaved }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 300); // Wait for fade-out animation
        }, 1500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}
        >
            <div className="flex items-center gap-3 px-6 py-4 bg-green-500 text-white rounded-xl shadow-lg">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>
                <div>
                    <p className="font-bold text-lg">Speed Verified! 🚀</p>
                    {timeSaved && timeSaved > 0 && (
                        <p className="text-sm text-white/80">
                            {timeSaved}s faster than target
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
