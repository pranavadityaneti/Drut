/**
 * /subscribe — Drut Pro pricing + checkout page.
 *
 * Works in two modes:
 *   1. HANDOFF: arrives with ?h=<token>. The page redeems the one-time token via
 *      the `redeem-subscribe-handoff` edge function → mints a one-time login hash
 *      → verifyOtp() establishes the session for that exact mobile user. Token
 *      is stripped from the URL before any further interaction.
 *   2. DIRECT: any visitor (logged-in or not). If signed in, clicking a plan
 *      opens Razorpay checkout. If not, we send them to /login?next=/subscribe.
 *
 * Design: mirrors the user-supplied reference (a light card + a dark hero card
 * with "What's included" checklist) but reskinned to Drut — pastel green accent
 * #b4fa8d on dark ink #16261a, generous spacing, restrained motion.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Sparkles, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import {
    PRICING,
    priceForPlan,
    formatINR,
    isFirstTimerSubscriber,
    getCurrentSubscription,
    isProActive,
    useRazorpayCheckout,
    authService,
    getSupabase,
    type PlanId,
    type Subscription,
    type User,
} from '@drut/shared';

const MONTHLY_INCLUDES = [
    'Unlimited daily practice',
    'Quick Method + full step-by-step on every question',
    'Timed Sprints + focus areas',
    'Progress analytics + streaks',
    'Cancel anytime',
];

const ANNUAL_INCLUDES = [
    'Everything in Monthly',
    'Two months free vs. monthly billing',
    'First-year intro for new subscribers',
    'Priority access to new exam tracks as they launch',
    'Locked-in price for a full year',
    'Cancel anytime',
];

type Mode = 'loading' | 'pro' | 'ready' | 'error';

export const Subscribe: React.FC = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [mode, setMode] = useState<Mode>('loading');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [firstTimer, setFirstTimer] = useState<boolean>(true);
    const [sub, setSub] = useState<Subscription | null>(null);
    const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
    const [success, setSuccess] = useState<{ plan: PlanId } | null>(null);

    const checkout = useRazorpayCheckout({
        name: 'Drut',
        prefill: user ? { name: (user.user_metadata as any)?.full_name as string | undefined, email: user.email } : undefined,
    });

    // 1. Boot: redeem the handoff token if present, then load auth + first-timer + sub state.
    useEffect(() => {
        let cancelled = false;

        const boot = async () => {
            try {
                const handoff = params.get('h');

                // ---- HANDOFF redemption ----
                if (handoff) {
                    const supabase = getSupabase();

                    // Strip ?h= from the URL immediately — even if a step fails, the token
                    // shouldn't linger in the history / shareable URL.
                    window.history.replaceState({}, '', '/subscribe');

                    const res = await fetch(
                        `${(import.meta as any).env?.VITE_SUPABASE_URL || ''}/functions/v1/redeem-subscribe-handoff`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: handoff }),
                        },
                    );
                    if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        throw new Error(j?.error || `redeem failed (${res.status})`);
                    }
                    const { token_hash, verification_type } = await res.json();
                    if (!token_hash) throw new Error('login mint failed');

                    const { error } = await supabase.auth.verifyOtp({
                        type: verification_type || 'magiclink',
                        token_hash,
                    });
                    if (error) throw error;
                }

                // ---- Load auth + sub state ----
                const u = await authService.getCurrentUser();
                if (cancelled) return;
                setUser(u);

                if (!u) {
                    // Not signed in and no handoff → guide to login, come back here.
                    setMode('ready');
                    return;
                }

                const [ft, currentSub] = await Promise.all([
                    isFirstTimerSubscriber().catch(() => true),
                    getCurrentSubscription().catch(() => null),
                ]);
                if (cancelled) return;
                setFirstTimer(ft);
                setSub(currentSub);
                setMode(isProActive(currentSub) ? 'pro' : 'ready');
            } catch (e: any) {
                if (cancelled) return;
                setErrorMsg(e?.message || 'Something went wrong. Please try again.');
                setMode('error');
            }
        };

        boot();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const monthly = useMemo(() => priceForPlan('monthly', firstTimer), [firstTimer]);
    const annual = useMemo(() => priceForPlan('annual', firstTimer), [firstTimer]);
    const annualHasIntro = firstTimer && PRICING.annual.firstTimerAmountPaise != null;

    const handleSubscribe = async (plan: PlanId) => {
        if (!user) {
            navigate(`/login?next=${encodeURIComponent('/subscribe')}`);
            return;
        }
        setBusyPlan(plan);
        setErrorMsg(null);
        try {
            const result = await checkout.pay(plan);
            if (result.verified) {
                setSuccess({ plan });
                setSub(await getCurrentSubscription());
                setMode('pro');
            }
        } catch (e: any) {
            if (e?.message === 'checkout-dismissed') {
                // user closed Razorpay — silent.
            } else {
                setErrorMsg(e?.message || 'Checkout failed. Please try again.');
            }
        } finally {
            setBusyPlan(null);
        }
    };

    // ============== render ==============

    if (mode === 'loading') {
        return (
            <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
                <div className="flex items-center gap-3 text-[var(--color-ink-2)]">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="text-[14px] font-medium">Setting up your subscription…</span>
                </div>
            </div>
        );
    }

    if (mode === 'pro') {
        return (
            <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4 py-16">
                <div className="max-w-md w-full text-center bg-[var(--color-card)] border border-[var(--color-border)] rounded-[28px] p-10 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-[#b4fa8d] mx-auto flex items-center justify-center">
                        <Check className="w-9 h-9 text-[#16261a]" strokeWidth={2.6} />
                    </div>
                    <h1 className="text-[26px] font-extrabold text-[var(--color-ink-1)] mt-5 tracking-tight">
                        {success ? "You're all set" : "You're a Pro"}
                    </h1>
                    <p className="text-[14.5px] text-[var(--color-ink-2)] mt-2 leading-relaxed">
                        {success
                            ? 'Payment confirmed. Everything is unlocked across web and mobile.'
                            : 'Your Drut Pro plan is active. Everything is unlocked.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="mt-7 w-full h-[50px] rounded-full bg-[var(--color-ink-1)] text-white text-[15px] font-bold hover:opacity-90 transition-opacity"
                    >
                        Continue to Drut
                    </button>
                </div>
            </div>
        );
    }

    // mode === 'ready' or 'error' (error shown inline; page still functional)

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            {/* Subtle top accent — a single hairline of brand color */}
            <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#b4fa8d] to-transparent" />

            <div className="max-w-[1080px] mx-auto px-5 md:px-8 pt-12 md:pt-16 pb-20">
                {/* Wordmark + sign-in hint */}
                <header className="flex items-center justify-between mb-12">
                    <a href="/" className="text-[20px] font-extrabold tracking-tight text-[var(--color-ink-1)] hover:opacity-80">
                        Drut
                    </a>
                    {!user && (
                        <a href="/login?next=/subscribe" className="text-[13px] font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink-1)]">
                            Already a user? <span className="underline underline-offset-4">Sign in</span>
                        </a>
                    )}
                </header>

                {/* Hero copy */}
                <div className="text-center max-w-[680px] mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eef6dd] text-[#3d7a0f] text-[12px] font-bold tracking-wide uppercase">
                        <Sparkles className="w-3.5 h-3.5" /> Drut Pro
                    </div>
                    <h1 className="mt-5 text-[36px] md:text-[46px] font-extrabold leading-[1.05] tracking-tight text-[var(--color-ink-1)]">
                        Practice without limits.
                        <br />
                        <span className="text-[var(--color-ink-3)]">Master what matters.</span>
                    </h1>
                    <p className="mt-5 text-[15.5px] text-[var(--color-ink-2)] leading-relaxed">
                        Unlimited questions, step-by-step solutions on every one, timed Sprints, and focus areas
                        — built for serious entrance-exam preparation.
                    </p>
                </div>

                {errorMsg && (
                    <div className="mt-8 max-w-[680px] mx-auto bg-[#fdecec] border border-[#f5c4c4] rounded-2xl px-4 py-3 text-[13.5px] text-[#8a1f1f]">
                        {errorMsg}
                    </div>
                )}

                {/* Plan cards — light Monthly + dark hero Annual */}
                <div className="mt-12 grid md:grid-cols-2 gap-5">
                    <PlanCard
                        kind="light"
                        eyebrow="Monthly"
                        title="Pay as you go"
                        priceLine={
                            <>
                                <span className="text-[42px] font-extrabold text-[var(--color-ink-1)]">₹{monthly.rupees.toLocaleString('en-IN')}</span>
                                <span className="text-[15px] text-[var(--color-ink-3)] font-medium">/month</span>
                            </>
                        }
                        sub="Best for a short, focused push toward an exam date."
                        includes={MONTHLY_INCLUDES}
                        cta={busyPlan === 'monthly' ? 'Starting checkout…' : user ? 'Start monthly' : 'Sign in to start'}
                        busy={busyPlan === 'monthly'}
                        onClick={() => handleSubscribe('monthly')}
                        footnote="Billed monthly. Cancel anytime."
                    />
                    <PlanCard
                        kind="dark"
                        eyebrow="Annual · Best value"
                        title="The full year"
                        priceLine={
                            <>
                                <span className="text-[42px] font-extrabold text-white">₹{annual.rupees.toLocaleString('en-IN')}</span>
                                <span className="text-[15px] text-white/65 font-medium">/year</span>
                                {annualHasIntro && (
                                    <span className="ml-2 text-[13px] text-white/55 line-through self-end mb-2">
                                        ₹{PRICING.annual.amountRupees.toLocaleString('en-IN')}
                                    </span>
                                )}
                            </>
                        }
                        sub={annualHasIntro ? 'First-year intro — then ₹1,999/yr.' : 'Locked-in price for a full year.'}
                        includes={ANNUAL_INCLUDES}
                        cta={busyPlan === 'annual' ? 'Starting checkout…' : user ? 'Start annual' : 'Sign in to start'}
                        busy={busyPlan === 'annual'}
                        onClick={() => handleSubscribe('annual')}
                        footnote="Billed once a year. Cancel anytime."
                        savingsBadge={annualHasIntro ? `Save ₹${(PRICING.annual.amountRupees - annual.rupees).toLocaleString('en-IN')}` : 'Save 2 months'}
                    />
                </div>

                {/* Trust strip */}
                <div className="mt-12 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-[12.5px] text-[var(--color-ink-3)]">
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Secure payment by Razorpay</span>
                    <span>•</span>
                    <span>GST invoice on request</span>
                    <span>•</span>
                    <span>Manage from your Profile</span>
                </div>

                {/* Tiny FAQ */}
                <div className="mt-16 max-w-[780px] mx-auto">
                    <h2 className="text-[20px] font-extrabold text-[var(--color-ink-1)] tracking-tight">Common questions</h2>
                    <div className="mt-5 grid md:grid-cols-2 gap-x-8 gap-y-5">
                        <Faq q="Can I cancel anytime?" a="Yes. Cancel from your Profile — your access stays until the end of the current period." />
                        <Faq q="Will my plan auto-renew?" a="No. Drut Pro does not auto-renew. Your access simply ends at the period close and you can renew when you want to." />
                        <Faq q="Does this work on mobile too?" a="Yes. Subscribe here once and Pro unlocks across the web app and our iOS / Android apps signed in to the same account." />
                        <Faq q="Refunds?" a={<>Subscription fees are non-refundable once a period begins, except in case of a grave service failure on our side. See our <a className="underline" href="/legal/refund-cancellation-policy.html" target="_blank" rel="noopener noreferrer">refund policy</a>.</>} />
                    </div>
                </div>

                <p className="text-center mt-16 text-[12px] text-[var(--color-ink-3)]">
                    Drut is a product of Ideaye Works Private Limited.
                </p>
            </div>
        </div>
    );
};

// ============== components ==============

interface PlanCardProps {
    kind: 'light' | 'dark';
    eyebrow: string;
    title: string;
    priceLine: React.ReactNode;
    sub: string;
    includes: string[];
    cta: string;
    busy: boolean;
    onClick: () => void;
    footnote: string;
    savingsBadge?: string;
}

const PlanCard: React.FC<PlanCardProps> = ({ kind, eyebrow, title, priceLine, sub, includes, cta, busy, onClick, footnote, savingsBadge }) => {
    const dark = kind === 'dark';
    return (
        <div
            className={[
                'relative rounded-[24px] p-7 md:p-9 transition-shadow',
                dark
                    ? 'bg-[#16261a] text-white shadow-[0_24px_60px_-20px_rgba(22,38,26,0.4)] ring-1 ring-white/5'
                    : 'bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm',
            ].join(' ')}
        >
            {savingsBadge && dark && (
                <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-[#b4fa8d] text-[#16261a] text-[11.5px] font-extrabold tracking-wide uppercase">
                    {savingsBadge}
                </div>
            )}

            <div className={`inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-bold tracking-wide uppercase ${dark ? 'bg-white/10 text-white' : 'bg-[var(--color-muted)] text-[var(--color-ink-2)]'}`}>
                {eyebrow}
            </div>

            <h3 className={`mt-5 text-[24px] font-extrabold tracking-tight ${dark ? 'text-white' : 'text-[var(--color-ink-1)]'}`}>
                {title}
            </h3>
            <p className={`mt-1 text-[14px] ${dark ? 'text-white/65' : 'text-[var(--color-ink-3)]'}`}>{sub}</p>

            <div className="mt-6 flex items-baseline gap-2">
                {priceLine}
            </div>

            <button
                type="button"
                onClick={onClick}
                disabled={busy}
                className={[
                    'mt-7 w-full h-[52px] rounded-full text-[15px] font-extrabold inline-flex items-center justify-center gap-2 transition-all',
                    dark
                        ? 'bg-[#b4fa8d] text-[#16261a] hover:bg-white'
                        : 'bg-[var(--color-ink-1)] text-white hover:opacity-90',
                    busy ? 'opacity-70 cursor-not-allowed' : '',
                ].join(' ')}
            >
                {cta}
                {!busy && <ArrowRight className="w-4 h-4" />}
            </button>
            <p className={`mt-3 text-center text-[11.5px] ${dark ? 'text-white/50' : 'text-[var(--color-ink-3)]'}`}>
                {footnote}
            </p>

            {/* Divider */}
            <div className={`mt-7 mb-6 h-px ${dark ? 'bg-white/10' : 'bg-[var(--color-border)]'}`} />

            <p className={`text-[12px] font-bold uppercase tracking-wide mb-4 ${dark ? 'text-white/60' : 'text-[var(--color-ink-3)]'}`}>
                What's included
            </p>
            <ul className="space-y-3">
                {includes.map((line) => (
                    <li key={line} className="flex items-start gap-3">
                        <span className={[
                            'mt-0.5 w-[22px] h-[22px] rounded-full inline-flex items-center justify-center shrink-0',
                            dark ? 'bg-[#b4fa8d]' : 'bg-[#eef6dd]',
                        ].join(' ')}>
                            <Check className={`w-3.5 h-3.5 ${dark ? 'text-[#16261a]' : 'text-[#3d7a0f]'}`} strokeWidth={3} />
                        </span>
                        <span className={`text-[14px] leading-[1.5] ${dark ? 'text-white/90' : 'text-[var(--color-ink-2)]'}`}>{line}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const Faq: React.FC<{ q: string; a: React.ReactNode }> = ({ q, a }) => (
    <div>
        <p className="text-[14.5px] font-bold text-[var(--color-ink-1)]">{q}</p>
        <p className="mt-1.5 text-[13.5px] text-[var(--color-ink-2)] leading-relaxed">{a}</p>
    </div>
);

export default Subscribe;

// Suppress unused-import lint when paymentService imports the Sub type only for typing.
export type { Subscription as _Subscription } from '@drut/shared';
