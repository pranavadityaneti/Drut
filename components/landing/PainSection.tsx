import React from 'react';

export const PainSection = () => {
    return (
        <section className="py-16 border-t border-zinc-900/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* FORCE FLEX: 1 col mobile, 3 side-by-side desktop. Width full. */}
                <div className="flex flex-col md:flex-row gap-6 w-full relative">
                    {/* Vertical System Line (Desktop) */}
                    <div className="hidden md:block absolute left-[0px] -top-12 bottom-0 w-px bg-zinc-800" />

                    {/* Card 1 */}
                    <div className="group flex-1 border border-zinc-800 bg-zinc-900/20 p-8 hover:border-zinc-600 transition-colors duration-300 flex flex-col justify-between min-h-[300px] relative overflow-hidden backdrop-blur-md">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none" />

                        <div className="flex items-center gap-2 mb-2">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </div>
                            <h3 className="text-zinc-500 text-sm font-mono uppercase tracking-widest">TRAP_01</h3>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-4 font-mono">The Knowledge Trap</h2>

                        <div className="z-10">
                            <p className="text-3xl font-light text-zinc-400 font-sans">
                                You <span className="text-white font-medium">Study.</span><br />
                                They <span className="text-electric-green font-bold">Train.</span>
                            </p>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="group flex-1 border border-zinc-800 bg-zinc-900/20 p-8 hover:border-zinc-600 transition-colors duration-300 flex flex-col justify-between min-h-[300px] relative overflow-hidden backdrop-blur-md">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none" />

                        <div className="flex items-center gap-2 mb-2">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </div>
                            <h3 className="text-zinc-500 text-sm font-mono uppercase tracking-widest">TRAP_02</h3>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-4 font-mono">The Method Trap</h2>

                        <div className="z-10">
                            <p className="text-3xl font-light text-zinc-400 font-sans">
                                You <span className="text-white font-medium">Calculate.</span><br />
                                They <span className="text-electric-green font-bold">Eliminate.</span>
                            </p>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="group flex-1 border border-zinc-800 bg-zinc-900/20 p-8 hover:border-zinc-600 transition-colors duration-300 flex flex-col justify-between min-h-[300px] relative overflow-hidden backdrop-blur-md">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none" />

                        <div className="flex items-center gap-2 mb-2">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </div>
                            <h3 className="text-zinc-500 text-sm font-mono uppercase tracking-widest">TRAP_03</h3>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-4 font-mono">The Ego Trap</h2>

                        <div className="z-10">
                            <p className="text-3xl font-light text-zinc-400 font-sans">
                                You <span className="text-white font-medium">Verify.</span><br />
                                They <span className="text-electric-green font-bold">Trust.</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
