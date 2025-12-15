import React from 'react';

export const CockpitSection = () => {
    return (
        <section className="py-24 bg-black border-t border-zinc-900 relative overflow-hidden flex flex-col items-center">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,148,0.03)_0%,transparent_70%)] pointer-events-none" />

            <div className="text-center mb-16 px-4 z-10">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 font-mono uppercase tracking-tight">
                    The Command Center
                </h2>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto font-sans">
                    Complete situational awareness. See your speed, debt, and mastery in one view.
                </p>
            </div>

            {/* 3D Mockup Container */}
            <div className="relative w-full max-w-6xl px-4 perspective-1000">
                <div className="relative w-full aspect-[16/9] bg-zinc-900/50 border border-zinc-700/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] transform rotate-x-6 hover:rotate-x-0 transition-transform duration-700 ease-out group overflow-hidden backdrop-blur-sm">
                    {/* Placeholder Content Area */}
                    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(45deg,rgba(0,0,0,0.8)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.8)_50%,rgba(0,0,0,0.8)_75%,transparent_75%,transparent)] bg-[size:20px_20px] opacity-20"></div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="w-24 h-24 border-2 border-zinc-700 rounded-full flex items-center justify-center mb-4 group-hover:border-electric-green transition-colors duration-500">
                            <span className="text-4xl">⚓️</span>
                        </div>
                        <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest group-hover:text-electric-green transition-colors duration-500">
                            Dashboard_Preview_Input_Signal
                        </p>
                    </div>

                    {/* Gloss Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                </div>

                {/* Reflection/Shadow */}
                <div className="absolute -bottom-8 left-4 right-4 h-4 bg-electric-green/20 blur-2xl rounded-[100%] opacity-0 group-hover:opacity-40 transition-opacity duration-700"></div>
            </div>
        </section>
    );
};
