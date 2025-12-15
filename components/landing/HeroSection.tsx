import React, { useState, useEffect } from 'react';

interface HeroSectionProps {
    onAudit: () => void;
    onFSM: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onAudit, onFSM }) => {
    // Start at 00:02:14 -> 134 seconds
    const INITIAL_TIME = 134;
    const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
    const [glitch, setGlitch] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    // Trigger glitch and reset
                    setGlitch(true);
                    setTimeout(() => setGlitch(false), 200);
                    return INITIAL_TIME;
                }
                return prev - 0.05; // 50ms ticks
            });
        }, 50);

        return () => clearInterval(timer);
    }, []);

    // Format time as 00:02:14.XX
    const formatTime = (val: number) => {
        if (val < 0) val = 0;
        const minutes = Math.floor(val / 60);
        const seconds = Math.floor(val % 60);
        const ms = Math.floor((val % 1) * 100);

        return `00:0${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    return (
        // Removed bg-black and bg-terminal-grid to allow transparency
        <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden px-4 py-12 md:py-20 z-10">
            {/* Ambient Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] pointer-events-none" />

            <div className="z-10 text-center max-w-6xl mx-auto flex flex-col items-center relative">

                {/* Timer Graphic - Critical Mass */}
                <div className="mb-4 md:mb-8 relative group">
                    <div className={`font-mono text-5xl md:text-9xl font-bold tracking-tighter tabular-nums leading-none select-none transition-colors duration-100 ${glitch ? 'text-red-500 translate-x-1' : 'text-white'}`}>
                        {formatTime(timeLeft)}
                    </div>
                </div>

                <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 leading-[1.1] font-mono uppercase">
                    We don't sell practice.<br />
                    <span className="text-electric-green">
                        We sell time.
                    </span>
                </h1>

                <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed font-sans">
                    Most aspirants fail because they lack speed. <span className="text-white font-medium">Drut</span> is the Cognitive Optimization Engine designed to replace slow methods with the <span className="text-electric-green">Fastest Safe Method (FSM)</span>.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-6 items-center w-full justify-center">
                    <button
                        onClick={onAudit}
                        className="w-full sm:w-auto px-10 py-5 bg-electric-green text-black font-mono font-bold text-lg tracking-tight hover:bg-[#00cc76] transition-all transform hover:scale-[1.02] shadow-[0_0_30px_rgba(0,255,148,0.2)] rounded-sm flex items-center justify-center gap-2"
                    >
                        <span>[ AUDIT_SPEED ]</span>
                    </button>
                    <button
                        onClick={onFSM}
                        className="w-full sm:w-auto px-10 py-5 border border-zinc-700 text-zinc-300 font-mono font-bold text-lg tracking-tight hover:border-zinc-500 hover:text-white hover:bg-white/5 transition-all rounded-sm flex items-center justify-center gap-2 group"
                    >
                        <span>SEE_FSM</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </div>
            </div>

            {/* Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-electric-green/5 blur-[120px] rounded-full pointer-events-none z-0" />
        </section>
    );
};
