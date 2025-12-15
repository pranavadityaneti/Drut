import React from 'react';

export const Footer = () => {
    return (
        // Removed bg-black and bg-terminal-grid
        <footer className="py-16 text-center border-t border-zinc-900 bg-black/80 backdrop-blur-md">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-white mb-8 font-mono uppercase">
                Stop Studying.<br />
                <span className="text-electric-green">Start Training.</span>
            </h2>
            <div className="inline-block border border-zinc-800 bg-zinc-900/50 px-4 py-2 rounded-full">
                <p className="text-zinc-500 font-mono text-xs">
                    SYSTEM_STATUS: ONLINE  |  © 2025 DRUT_CORP  |  SPEED_METRIC_ONLY
                </p>
            </div>
        </footer>
    );
};
