/**
 * PaywallModal (web) — "Upgrade to Pro" dialog. Mirrors the mobile paywall.
 *
 * Plans + prices come from @drut/shared pricing.ts (single source of truth). The
 * annual plan shows the first-timer intro price for users who haven't subscribed
 * before. onUpgrade(plan) hands off to the Razorpay checkout.
 */
import React, { useState } from 'react';
import { X, BadgeCheck, Infinity as InfinityIcon, ListChecks, Timer } from 'lucide-react';
import { cn, PRICING, priceForPlan, type PlanId } from '@drut/shared';

interface PaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: (plan: PlanId) => void;
    isFirstTimer?: boolean;
    loading?: boolean;
    reason?: string;
}

const FEATURES = [
    { Icon: InfinityIcon, title: 'Unlimited practice', sub: 'No daily cap — practice as many questions as you want.' },
    { Icon: ListChecks, title: 'Every solution explained', sub: 'Quick Method + full step-by-step on every question.' },
    { Icon: Timer, title: 'Sprints & insights', sub: 'Timed speed sprints, focus areas, and progress analytics.' },
];

export const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose, onUpgrade, isFirstTimer = true, loading = false, reason }) => {
    const [plan, setPlan] = useState<PlanId>('annual');
    if (!isOpen) return null;

    const monthly = priceForPlan('monthly', isFirstTimer);
    const annual = priceForPlan('annual', isFirstTimer);
    const annualHasIntro = isFirstTimer && PRICING.annual.firstTimerAmountPaise != null;

    const PlanCard = ({ id, title, price, unit, note, strike }: { id: PlanId; title: string; price: number; unit: string; note?: string; strike?: number }) => {
        const selected = plan === id;
        return (
            <button
                type="button"
                onClick={() => setPlan(id)}
                className={cn(
                    'flex-1 text-left rounded-2xl border p-4 transition-all',
                    selected ? 'border-[var(--color-primary)] bg-[#f3fbe9]' : 'border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-muted)]'
                )}
            >
                <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[var(--color-ink-3)]">{title}</span>
                    <span className={cn('w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center', selected ? 'border-[var(--color-primary)]' : 'border-[var(--color-line)]')}>
                        {selected && <span className="w-[9px] h-[9px] rounded-full bg-[var(--color-primary)]" />}
                    </span>
                </div>
                <div className="flex items-end gap-1 mt-2">
                    <span className="text-[22px] font-extrabold tracking-tight text-[var(--color-ink-1)]">₹{price.toLocaleString('en-IN')}</span>
                    <span className="text-[12px] text-[var(--color-ink-3)] mb-0.5">{unit}</span>
                </div>
                {strike != null && <div className="text-[12px] text-[var(--color-ink-3)] line-through mt-0.5">₹{strike.toLocaleString('en-IN')}</div>}
                {note && <div className="text-[11px] text-[var(--color-ink-3)] mt-1">{note}</div>}
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45" onClick={onClose}>
            <div className="w-full max-w-md rounded-[24px] bg-[var(--color-card)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <span className="w-6" />
                    <h2 className="text-[16px] font-bold text-[var(--color-ink-1)]">Upgrade to Pro</h2>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-[var(--color-ink-2)] hover:text-[var(--color-ink-1)]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Badge */}
                <div className="flex flex-col items-center mt-4 mb-2">
                    <div className="w-[76px] h-[76px] rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                        <BadgeCheck className="w-10 h-10 text-white" strokeWidth={2.2} />
                    </div>
                    <p className="text-[15px] font-bold text-[var(--color-ink-1)] mt-3">Unlock everything</p>
                    {reason && <p className="text-[12.5px] text-[var(--color-ink-3)] mt-1 text-center px-6">{reason}</p>}
                </div>

                {/* Features */}
                <div className="bg-[var(--color-muted)] rounded-2xl p-4 space-y-3.5 mt-3">
                    {FEATURES.map(({ Icon, title, sub }) => (
                        <div key={title} className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-full bg-[var(--color-accent)] flex items-center justify-center shrink-0">
                                <Icon className="w-5 h-5 text-[var(--color-accent-foreground)]" strokeWidth={2.2} />
                            </span>
                            <div>
                                <p className="text-[14px] font-bold text-[var(--color-ink-1)]">{title}</p>
                                <p className="text-[12.5px] text-[var(--color-ink-3)]">{sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Plans */}
                <div className="flex gap-3 mt-4">
                    <PlanCard id="monthly" title="Monthly" price={monthly.rupees} unit="/month" note="Billed monthly" />
                    <PlanCard
                        id="annual"
                        title="Yearly"
                        price={annual.rupees}
                        unit="/year"
                        note={annualHasIntro ? 'First year — then ₹1,999/yr' : 'Billed yearly · best value'}
                        strike={annualHasIntro ? PRICING.annual.amountRupees : undefined}
                    />
                </div>

                {/* CTA */}
                <button
                    type="button"
                    onClick={() => onUpgrade(plan)}
                    disabled={loading}
                    className="w-full h-[52px] mt-5 rounded-full bg-[var(--color-primary)] text-white text-[16px] font-extrabold hover:opacity-95 disabled:opacity-70 transition-opacity"
                >
                    {loading ? 'Starting checkout…' : 'Upgrade'}
                </button>
                <p className="text-[11.5px] text-[var(--color-ink-3)] text-center mt-3">Cancel anytime. Plans renew automatically.</p>
            </div>
        </div>
    );
};

export default PaywallModal;
