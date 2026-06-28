/**
 * AdminCoupons — create + manage discount codes (admin-gated edge fn: admin-coupons).
 * Codes are stored UPPERCASE. A 100%-off code makes the upgrade free (bypasses
 * Razorpay) — handy for end-to-end testing and free marketing grants.
 */
import React, { useEffect, useState } from 'react';
import { adminListCoupons, adminCreateCoupon, adminSetCouponActive, formatINR, type Coupon, type CreateCouponInput } from '@drut/shared';
import { RefreshCw } from 'lucide-react';

function fmtDate(s: string | null): string {
    if (!s) return '—';
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function describeValue(c: Coupon): string {
    return c.type === 'percent' ? `${c.value}% off` : `${formatINR(c.value)} off`;
}

const EMPTY_FORM: CreateCouponInput = {
    code: '', type: 'percent', value: 100, applies_to_plan: 'any', per_user_limit: 1,
};

export const AdminCoupons: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [form, setForm] = useState<CreateCouponInput>(EMPTY_FORM);
    const [maxRedemptions, setMaxRedemptions] = useState<string>('');   // '' = unlimited
    const [expiresAt, setExpiresAt] = useState<string>('');             // '' = no expiry
    const [creating, setCreating] = useState(false);
    const [createMsg, setCreateMsg] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            setCoupons(await adminListCoupons());
        } catch (e: any) {
            setError(e?.message || 'Failed to load coupons');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const create = async () => {
        if (!form.code.trim() || creating) return;
        setCreating(true);
        setCreateMsg(null);
        try {
            await adminCreateCoupon({
                ...form,
                code: form.code.trim().toUpperCase(),
                value: Number(form.value),
                max_redemptions: maxRedemptions.trim() === '' ? null : Number(maxRedemptions),
                per_user_limit: Number(form.per_user_limit) || 1,
                expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
            });
            setForm(EMPTY_FORM);
            setMaxRedemptions('');
            setExpiresAt('');
            setCreateMsg('Coupon created.');
            await load();
        } catch (e: any) {
            setCreateMsg(e?.message || 'Could not create coupon');
        } finally {
            setCreating(false);
        }
    };

    const toggle = async (c: Coupon) => {
        setBusyId(c.id);
        try {
            await adminSetCouponActive(c.id, !c.active);
            await load();
        } catch (e: any) {
            alert(e?.message || 'Could not update coupon');
        } finally {
            setBusyId(null);
        }
    };

    const inputCls = 'h-9 px-3 rounded-[10px] bg-[var(--color-card)] ring-1 ring-[var(--color-border)] text-[13px] text-[var(--color-ink-1)] focus:outline-none focus:ring-[var(--color-primary)]';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[18px] font-semibold text-[var(--color-ink-1)]">Coupons</h2>
                    <p className="text-[13px] text-[var(--color-ink-3)] mt-0.5">Discount codes. A 100%-off code unlocks Pro free (great for testing).</p>
                </div>
                <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink-1)] disabled:opacity-50">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {/* Create form */}
            <div className="rounded-[12px] ring-1 ring-[var(--color-border)] p-4">
                <p className="text-[13px] font-semibold text-[var(--color-ink-1)] mb-3">New coupon</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <input className={`${inputCls} uppercase`} placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                    <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'flat' })}>
                        <option value="percent">Percent off</option>
                        <option value="flat">Flat ₹ off</option>
                    </select>
                    <input className={inputCls} type="number" min={0} placeholder={form.type === 'percent' ? '% (0–100)' : '₹ off'} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
                    <select className={inputCls} value={form.applies_to_plan} onChange={(e) => setForm({ ...form, applies_to_plan: e.target.value as any })}>
                        <option value="any">Any plan</option>
                        <option value="monthly">Monthly</option>
                        <option value="annual">Annual</option>
                    </select>
                    <input className={inputCls} type="number" min={0} placeholder="Max redemptions (blank = ∞)" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} />
                    <input className={inputCls} type="number" min={1} placeholder="Per-user limit" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: Number(e.target.value) })} />
                    <input className={inputCls} type="date" placeholder="Expires" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                    <input className={inputCls} placeholder="Note (optional)" value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
                <div className="flex items-center gap-3 mt-3">
                    <button type="button" onClick={create} disabled={creating || !form.code.trim()} className="h-9 px-5 rounded-full bg-[var(--color-primary)] text-white text-[13px] font-bold disabled:opacity-50">
                        {creating ? 'Creating…' : 'Create coupon'}
                    </button>
                    {createMsg && <span className="text-[12px] text-[var(--color-ink-3)]">{createMsg}</span>}
                </div>
            </div>

            {error && <div className="rounded-[12px] bg-[#fdecea] text-[#b3261e] text-[13px] p-3">{error}</div>}

            {/* List */}
            {loading ? (
                <div className="text-[14px] text-[var(--color-ink-3)] py-10 text-center">Loading coupons…</div>
            ) : coupons.length === 0 ? (
                <div className="text-[14px] text-[var(--color-ink-3)] py-10 text-center">No coupons yet.</div>
            ) : (
                <div className="overflow-x-auto rounded-[12px] ring-1 ring-[var(--color-border)]">
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="text-left text-[var(--color-ink-3)] border-b border-[var(--color-border)]">
                                <th className="font-medium px-3 py-2.5">Code</th>
                                <th className="font-medium px-3 py-2.5">Discount</th>
                                <th className="font-medium px-3 py-2.5">Plan</th>
                                <th className="font-medium px-3 py-2.5">Used</th>
                                <th className="font-medium px-3 py-2.5">Per user</th>
                                <th className="font-medium px-3 py-2.5">Expires</th>
                                <th className="font-medium px-3 py-2.5">Status</th>
                                <th className="font-medium px-3 py-2.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.map((c) => (
                                <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0">
                                    <td className="px-3 py-2.5 font-mono text-[12px] text-[var(--color-ink-1)]">{c.code}{c.note ? <span className="block text-[11px] text-[var(--color-ink-3)] font-sans">{c.note}</span> : null}</td>
                                    <td className="px-3 py-2.5 text-[var(--color-ink-2)]">{describeValue(c)}</td>
                                    <td className="px-3 py-2.5 capitalize text-[var(--color-ink-3)]">{c.applies_to_plan}</td>
                                    <td className="px-3 py-2.5 num-tabular text-[var(--color-ink-2)]">{c.times_redeemed}{c.max_redemptions != null ? ` / ${c.max_redemptions}` : ''}</td>
                                    <td className="px-3 py-2.5 num-tabular text-[var(--color-ink-3)]">{c.per_user_limit}</td>
                                    <td className="px-3 py-2.5 text-[var(--color-ink-3)]">{fmtDate(c.expires_at)}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${c.active ? 'bg-[#eef6dd] text-[#3d7a0f]' : 'bg-[var(--color-muted)] text-[var(--color-ink-3)]'}`}>
                                            {c.active ? 'active' : 'inactive'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                        <button type="button" onClick={() => toggle(c)} disabled={busyId === c.id} className="text-[12px] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink-1)] disabled:opacity-50">
                                            {busyId === c.id ? '…' : (c.active ? 'Deactivate' : 'Activate')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminCoupons;
