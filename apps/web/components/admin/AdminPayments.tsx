/**
 * AdminPayments — read-only payments/subscriptions ledger for admins.
 *
 * Calls the admin-list-payments edge function (service-role + admin-gated), which
 * returns the subscriptions ledger + recent Razorpay events enriched with user
 * emails, plus a revenue summary. The browser anon client cannot read this data
 * directly (cross-user + service-role-only payment_events) — hence the edge fn.
 */
import React, { useEffect, useState } from 'react';
import { supabase, formatINR } from '@drut/shared';
import { RefreshCw } from 'lucide-react';

interface SubRow {
    id: string;
    user_id: string;
    user_email: string | null;
    plan: 'monthly' | 'annual';
    status: 'pending' | 'active' | 'past_due' | 'canceled' | 'expired';
    amount_paise: number;
    currency: string;
    started_at: string;
    expires_at: string;
    razorpay_order_id: string | null;
    razorpay_payment_id: string | null;
    created_at: string;
}

interface EventRow {
    id: string;
    user_email: string | null;
    razorpay_event_type: string;
    razorpay_order_id: string | null;
    signature_verified: boolean;
    received_at: string;
}

interface Summary { activeCount: number; collectedPaise: number; total: number; }

const STATUS_STYLE: Record<string, string> = {
    active: 'bg-[#eef6dd] text-[#3d7a0f]',
    pending: 'bg-[var(--color-muted)] text-[var(--color-ink-3)]',
    expired: 'bg-[var(--color-muted)] text-[var(--color-ink-3)]',
    canceled: 'bg-[#fdecea] text-[#b3261e]',
    past_due: 'bg-[#fdecea] text-[#b3261e]',
};

function fmtDate(s: string | null): string {
    if (!s) return '—';
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const AdminPayments: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [subs, setSubs] = useState<SubRow[]>([]);
    const [events, setEvents] = useState<EventRow[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.functions.invoke('admin-list-payments', { body: {} });
            if (error) throw new Error(error.message || 'Failed to load payments');
            setSubs(data?.subscriptions ?? []);
            setEvents(data?.events ?? []);
            setSummary(data?.summary ?? null);
        } catch (e: any) {
            setError(e?.message || 'Failed to load payments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[18px] font-semibold text-[var(--color-ink-1)]">Payments</h2>
                    <p className="text-[13px] text-[var(--color-ink-3)] mt-0.5">Subscriptions ledger and Razorpay activity.</p>
                </div>
                <button
                    type="button"
                    onClick={load}
                    disabled={loading}
                    className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink-1)] disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-[12px] bg-[var(--color-muted)] p-4">
                    <p className="text-[12px] text-[var(--color-ink-3)]">Active subscriptions</p>
                    <p className="text-[24px] font-bold text-[var(--color-ink-1)] mt-1 num-tabular">{summary?.activeCount ?? '—'}</p>
                </div>
                <div className="rounded-[12px] bg-[var(--color-muted)] p-4">
                    <p className="text-[12px] text-[var(--color-ink-3)]">Total collected</p>
                    <p className="text-[24px] font-bold text-[var(--color-ink-1)] mt-1 num-tabular">
                        {summary ? formatINR(summary.collectedPaise) : '—'}
                    </p>
                </div>
                <div className="rounded-[12px] bg-[var(--color-muted)] p-4">
                    <p className="text-[12px] text-[var(--color-ink-3)]">Total records</p>
                    <p className="text-[24px] font-bold text-[var(--color-ink-1)] mt-1 num-tabular">{summary?.total ?? '—'}</p>
                </div>
            </div>

            {error && (
                <div className="rounded-[12px] bg-[#fdecea] text-[#b3261e] text-[13px] p-3">{error}</div>
            )}

            {loading ? (
                <div className="text-[14px] text-[var(--color-ink-3)] py-10 text-center">Loading payments…</div>
            ) : subs.length === 0 && !error ? (
                <div className="text-[14px] text-[var(--color-ink-3)] py-10 text-center">No subscriptions yet.</div>
            ) : (
                <div className="overflow-x-auto rounded-[12px] ring-1 ring-[var(--color-border)]">
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="text-left text-[var(--color-ink-3)] border-b border-[var(--color-border)]">
                                <th className="font-medium px-3 py-2.5">User</th>
                                <th className="font-medium px-3 py-2.5">Plan</th>
                                <th className="font-medium px-3 py-2.5">Amount</th>
                                <th className="font-medium px-3 py-2.5">Status</th>
                                <th className="font-medium px-3 py-2.5">Started</th>
                                <th className="font-medium px-3 py-2.5">Expires</th>
                                <th className="font-medium px-3 py-2.5">Payment ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subs.map((s) => (
                                <tr key={s.id} className="border-b border-[var(--color-border)] last:border-0">
                                    <td className="px-3 py-2.5 text-[var(--color-ink-1)]">{s.user_email || <span className="text-[var(--color-ink-3)] font-mono text-[11px]">{s.user_id.slice(0, 8)}…</span>}</td>
                                    <td className="px-3 py-2.5 capitalize text-[var(--color-ink-2)]">{s.plan}</td>
                                    <td className="px-3 py-2.5 num-tabular text-[var(--color-ink-1)]">{formatINR(s.amount_paise)}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLE[s.status] || 'bg-[var(--color-muted)] text-[var(--color-ink-3)]'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-[var(--color-ink-3)]">{fmtDate(s.started_at)}</td>
                                    <td className="px-3 py-2.5 text-[var(--color-ink-3)]">{fmtDate(s.expires_at)}</td>
                                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--color-ink-3)]">{s.razorpay_payment_id || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Recent Razorpay events */}
            {events.length > 0 && (
                <div>
                    <h3 className="text-[14px] font-semibold text-[var(--color-ink-1)] mb-2">Recent Razorpay events</h3>
                    <div className="overflow-x-auto rounded-[12px] ring-1 ring-[var(--color-border)]">
                        <table className="w-full text-[13px]">
                            <thead>
                                <tr className="text-left text-[var(--color-ink-3)] border-b border-[var(--color-border)]">
                                    <th className="font-medium px-3 py-2.5">When</th>
                                    <th className="font-medium px-3 py-2.5">User</th>
                                    <th className="font-medium px-3 py-2.5">Event</th>
                                    <th className="font-medium px-3 py-2.5">Verified</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((ev) => (
                                    <tr key={ev.id} className="border-b border-[var(--color-border)] last:border-0">
                                        <td className="px-3 py-2.5 text-[var(--color-ink-3)]">{fmtDate(ev.received_at)}</td>
                                        <td className="px-3 py-2.5 text-[var(--color-ink-2)]">{ev.user_email || '—'}</td>
                                        <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--color-ink-2)]">{ev.razorpay_event_type}</td>
                                        <td className="px-3 py-2.5">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${ev.signature_verified ? 'bg-[#eef6dd] text-[#3d7a0f]' : 'bg-[#fdecea] text-[#b3261e]'}`}>
                                                {ev.signature_verified ? 'verified' : 'mismatch'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPayments;
