import React from 'react';

export const EngineSection = () => {
    return (
        <section className="py-20 border-t border-zinc-900/50 backdrop-blur-sm" id="engine-section">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="mb-12 border-b border-zinc-800 pb-8">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 font-mono uppercase">
                        The Engine
                    </h2>
                    <p className="text-zinc-400 text-lg max-w-2xl font-mono">
                        // Cognitive Optimization Suite. Hard Metrics Only.
                    </p>
                </div>

                {/* 3-Column Bento Grid: md:grid-cols-3 md:grid-rows-2 */}
                {/* Explicitly setting grid row height to prevent auto-expansion beyond 2 rows if content permits */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">

                    {/* ROW 1: CELL 1 - Speed Pulse (Col Span 2) */}
                    <div className="col-span-1 md:col-span-2 bg-zinc-900/20 border border-zinc-800 p-1 rounded-sm flex flex-col h-full min-h-[250px] bg-black/40 backdrop-blur-md overflow-hidden relative group hover:border-zinc-600 transition-colors">
                        <div className="h-full flex flex-col p-6">
                            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2 relative z-10 w-full">
                                <span className="text-electric-green font-mono text-sm tracking-wide">SPEED.PULSE</span>
                                <span className="font-mono text-xs text-zinc-500">LIVE</span>
                            </div>

                            {/* Graph Area */}
                            <div className="flex-grow w-full bg-black/50 border border-zinc-800 relative z-10 overflow-hidden flex items-end">
                                <svg className="w-full h-3/4" viewBox="0 0 100 50" preserveAspectRatio="none">
                                    <path d="M0,50 L10,45 L20,30 L30,35 L40,15 L50,10 L60,12 L70,5 L80,15 L90,8 L100,2"
                                        fill="none" stroke="#00FF94" strokeWidth="0.8" />
                                    <path d="M0,50 L10,45 L20,30 L30,35 L40,15 L50,10 L60,12 L70,5 L80,15 L90,8 L100,2 V50 H0 Z"
                                        fill="url(#greenGradient)" opacity="0.2" />
                                    <defs>
                                        <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#00FF94" stopOpacity="0.5" />
                                            <stop offset="100%" stopColor="#00FF94" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <span className="absolute top-4 right-4 font-mono text-electric-green text-sm font-bold bg-black/70 px-2 py-1 border border-electric-green/30 rounded">98ms</span>
                            </div>
                        </div>
                    </div>

                    {/* ROW 1: CELL 2 - Debt Collector (Col Span 1) */}
                    <div className="col-span-1 md:col-span-1 border border-zinc-800 bg-zinc-900/20 p-6 flex flex-col justify-between h-full min-h-[250px] bg-black/40 backdrop-blur-md hover:border-red-900/50 transition-colors">
                        <div>
                            <span className="text-red-500 font-mono text-xs mb-1 block">DEBT.COLLECTOR</span>
                            <h3 className="text-lg font-bold text-white font-mono">CRITICAL</h3>
                        </div>

                        <div className="w-full">
                            <div className="flex justify-between text-xs font-mono text-red-500 mb-2">
                                <span>LOAD</span>
                                <span>98%</span>
                            </div>
                            <div className="h-6 w-full bg-black border border-zinc-800 relative overflow-hidden">
                                <div className="h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#DC2626_5px,#DC2626_10px)] bg-red-900/20 w-full absolute inset-0"></div>
                                <div className="h-full bg-red-600 w-[98%] relative shadow-[0_0_10px_#DC2626]"></div>
                            </div>
                        </div>
                    </div>

                    {/* ROW 2: CELL 3 - Intervention Lock (Col Span 1) */}
                    <div className="col-span-1 md:col-span-1 border border-zinc-800 bg-zinc-900/20 p-6 flex flex-col justify-between h-full min-h-[250px] bg-black/40 backdrop-blur-md hover:border-orange-900/50 transition-colors">
                        <div>
                            <span className="text-orange-500 font-mono text-xs mb-1 block">INTERVENTION.LOCK</span>
                            <h3 className="text-lg font-bold text-white font-mono">LOCKED</h3>
                        </div>

                        <div className="flex items-center justify-center flex-grow">
                            <div className="w-20 h-16 border-2 border-orange-500/30 rounded flex items-center justify-center bg-black/50">
                                <span className="text-orange-500 text-2xl font-bold">[ == ]</span>
                            </div>
                        </div>
                    </div>

                    {/* ROW 2: CELL 4 - Stamina & Compliance (Col Span 2) */}
                    <div className="col-span-1 md:col-span-2 border border-zinc-800 bg-zinc-900/20 p-6 flex flex-col h-full min-h-[250px] bg-black/40 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-2">
                            <span className="text-zinc-400 font-mono text-xs block">STAMINA & COMPLIANCE</span>
                            <span className="text-electric-green font-mono text-xs">READY</span>
                        </div>

                        <div className="flex flex-row gap-8 h-full items-center justify-around">
                            {/* Sub-Metric 1: Focus */}
                            <div className="flex flex-col items-center">
                                <div className="relative w-24 h-24 mb-2">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="48" cy="48" r="42" stroke="#27272a" strokeWidth="8" fill="none" />
                                        <circle cx="48" cy="48" r="42" stroke="#00FF94" strokeWidth="8" fill="none" strokeDasharray="264" strokeDashoffset="21" strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-2xl font-bold font-mono text-white">92%</span>
                                    </div>
                                </div>
                                <span className="text-zinc-500 text-xs font-mono uppercase">Focus Level</span>
                            </div>

                            <div className="h-16 w-px bg-zinc-800"></div>

                            {/* Sub-Metric 2: Avg Kill */}
                            <div className="flex flex-col items-center w-full max-w-[200px]">
                                <span className="text-4xl font-bold font-mono text-white mb-2">32s</span>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-electric-green w-[70%]"></div>
                                </div>
                                <span className="text-zinc-500 text-xs font-mono uppercase mt-2">AVG KILL TIME</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};
