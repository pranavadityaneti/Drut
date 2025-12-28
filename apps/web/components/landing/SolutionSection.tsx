import React from 'react';

export const SolutionSection = () => {
    return (
        <section className="relative min-h-[70vh] flex flex-col items-center justify-center py-20 border-t border-zinc-900/50 backdrop-blur-sm">
            {/* Headline */}
            <div className="text-center mb-16 z-20 px-4">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 font-mono uppercase bg-black/80 inline-block px-4 py-2 border border-l-4 border-l-electric-green border-zinc-800">
                    THE 45-SECOND RULE
                </h2>
                <p className="text-zinc-400 font-sans text-sm md:text-lg max-w-2xl mx-auto leading-relaxed bg-black/80 p-4 border border-zinc-900">
                    In the exam hall, time is the only currency. If you are calculating for <span className="text-red-500 font-bold">&gt;45s</span>, you are failing. We teach you to kill the question before the timer turns red.
                </p>
            </div>

            <div className="w-full max-w-7xl px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: Standard Method (Failure) */}
                <div className="relative group border border-red-900/30 bg-black/60 rounded-sm p-8 overflow-hidden">
                    <div className="absolute inset-0 bg-red-900/5 mix-blend-overlay pointer-events-none" />

                    {/* Rejection Overlay - Clean X */}
                    <div className="absolute top-4 right-4 text-red-600/50 text-6xl font-bold leading-none select-none">
                        ×
                    </div>

                    <h3 className="text-red-500 font-mono text-xs tracking-widest mb-6 uppercase flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                        Standard_Approach (02:00)
                    </h3>

                    <p className="text-xl md:text-2xl text-zinc-500 font-serif leading-relaxed line-through decoration-red-500/50 decoration-2 mb-8">
                        Read the question completely. Draw the diagram.
                        List known variables. Formulate the equation.
                        Substitute values. Calculate step-by-step.
                        Double-check calculation.
                    </p>

                    <div className="text-red-500 font-mono text-xs border border-red-900/50 p-2 inline-block bg-black/80">
                        [ STATUS: TIME_LIMIT_EXCEEDED ]
                    </div>
                </div>

                {/* Right Side: FSM Protocol (Success) */}
                <div className="relative group border border-electric-green/30 bg-zinc-900/20 rounded-sm p-8 overflow-hidden backdrop-blur-md">
                    <div className="absolute inset-0 bg-electric-green/5 pointer-events-none" />

                    <h3 className="text-electric-green font-mono text-xs tracking-widest mb-8 uppercase flex items-center gap-2 border-b border-electric-green/20 pb-4">
                        <span className="w-2 h-2 bg-electric-green rounded-full animate-pulse" />
                        FSM_Protocol (00:30)
                    </h3>

                    <ul className="space-y-8">
                        <li className="flex items-start gap-4">
                            <div className="text-electric-green font-mono text-lg font-bold">01</div>
                            <div>
                                <h4 className="text-white text-lg font-bold mb-1 font-mono uppercase">SCAN</h4>
                                <p className="text-zinc-400 text-sm">Identify the pattern instantly. Skip reading the full question.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="text-electric-green font-mono text-lg font-bold">02</div>
                            <div>
                                <h4 className="text-white text-lg font-bold mb-1 font-mono uppercase">ELIMINATE</h4>
                                <p className="text-zinc-400 text-sm">Apply the elimination heuristic. Ignore noise variables.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="text-electric-green font-mono text-lg font-bold">03</div>
                            <div>
                                <h4 className="text-white text-lg font-bold mb-1 font-mono uppercase">KILL</h4>
                                <p className="text-zinc-400 text-sm">Mark the answer. Move. Zero verification needed.</p>
                            </div>
                        </li>
                    </ul>

                    <div className="mt-8 border-t border-electric-green/20 pt-4 flex justify-between items-center text-xs font-mono text-electric-green">
                        <span>EXECUTION TIME: 28s</span>
                        <span className="animate-pulse">● LIVE</span>
                    </div>
                </div>
            </div>
        </section>
    );
};
