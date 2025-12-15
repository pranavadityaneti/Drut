import React, { useState } from 'react';
import './WaitlistModern.css';
import { HeroSection } from './landing/HeroSection';
import { PainSection } from './landing/PainSection';
import { SolutionSection } from './landing/SolutionSection';
import { EngineSection } from './landing/EngineSection';
import { CockpitSection } from './landing/CockpitSection';
import { Footer } from './landing/Footer';
import { GridBackground } from './landing/GridBackground';
import { supabase } from '../lib/supabase';

export const WaitlistModern = () => {
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleAuditClick = () => {
        setIsAuditOpen(true);
    };

    const handleFSMClick = () => {
        document.getElementById('engine-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');

        try {
            const { error: insertError } = await supabase
                .from('waitlist')
                .insert([{ email, exam_interest: 'Speed Audit' }]);

            let isDuplicate = false;

            if (insertError) {
                if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
                    isDuplicate = true;
                } else {
                    throw insertError;
                }
            }

            if (!isDuplicate) {
                const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8';
                try {
                    await fetch('https://ukrtaerwaxekonislnpw.supabase.co/functions/v1/send-waitlist-email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${ANON_KEY}`,
                            'apikey': ANON_KEY
                        },
                        body: JSON.stringify({
                            email,
                            customerId: email,
                            name: 'Speed Aspirant',
                            exam: 'Speed Audit'
                        })
                    });
                } catch (err) {
                    console.warn('Email trigger failed', err);
                }
            }

            setStatus('success');
            setMessage("You're on the list. We'll contact you for the audit.");
            setTimeout(() => {
                setIsAuditOpen(false);
                setStatus('idle');
                setEmail('');
                setMessage('');
            }, 3000);

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setMessage(error.message || 'Something went wrong.');
        }
    };

    return (
        <div className="min-h-screen text-white font-sans selection:bg-electric-green selection:text-black relative bg-[#050505] overflow-x-hidden">
            {/* Z-0: Canvas Background */}
            <div className="fixed inset-0 z-0">
                <GridBackground />
            </div>

            {/* Z-10: Content Layer */}
            <div className="relative z-10">
                <HeroSection onAudit={handleAuditClick} onFSM={handleFSMClick} />
                <PainSection />
                <SolutionSection />

                {/* New Section Order: Solution -> Cockpit -> Engine */}
                <CockpitSection />
                <EngineSection />

                {/* Pre-Footer CTA */}
                <section className="py-20 text-center border-t border-zinc-900 border-b relative overflow-hidden bg-black/50 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-electric-green/5 blur-3xl pointer-events-none" />
                    <div className="relative z-10 max-w-4xl mx-auto px-4">
                        <h2 className="text-3xl md:text-5xl font-bold font-mono tracking-tighter mb-8 leading-tight">
                            You can't buy time.<br />
                            <span className="text-zinc-500">But you can steal it.</span>
                        </h2>
                        <button
                            onClick={handleAuditClick}
                            className="px-12 py-4 bg-electric-green text-black font-mono font-bold text-xl hover:bg-[#00cc76] transition-all transform hover:scale-105 shadow-[0_0_40px_rgba(0,255,148,0.3)] rounded-sm active:scale-95"
                        >
                            [ START THE AUDIT ]
                        </button>
                    </div>
                </section>

                <Footer />
            </div>

            {/* Modal - Highest Z-Index */}
            {isAuditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsAuditOpen(false)} />
                    <div className="relative bg-black border border-zinc-800 p-8 max-w-md w-full rounded-sm shadow-2xl">
                        <button
                            onClick={() => setIsAuditOpen(false)}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                        >
                            ✕
                        </button>

                        <h3 className="text-2xl font-bold mb-2 font-mono uppercase">Claim Audit</h3>
                        <p className="text-zinc-400 mb-6 font-mono text-sm">
                            // ENTER CREDENTIALS TO INITIALIZE SCAN.
                        </p>

                        {status === 'success' ? (
                            <div className="bg-green-900/20 border border-green-900 text-green-400 p-4 text-center rounded font-mono text-sm">
                                {message}
                            </div>
                        ) : (
                            <form onSubmit={handleJoin} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono text-zinc-500 mb-1">EMAIL_ADDRESS</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="user@domain.com"
                                        className="w-full bg-zinc-900/50 border border-zinc-700 p-3 text-white focus:border-electric-green focus:outline-none transition-colors rounded-sm font-mono text-sm"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full bg-electric-green text-black font-bold py-3 hover:bg-[#00cc76] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-sm font-mono"
                                >
                                    {status === 'loading' ? 'PROCESSING...' : 'INITIALIZE_SEQUENCE'}
                                </button>
                                {status === 'error' && (
                                    <p className="text-red-500 text-xs font-mono mt-2">{message}</p>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
