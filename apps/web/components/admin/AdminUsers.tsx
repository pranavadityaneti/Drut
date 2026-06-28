/**
 * AdminUsers — beta user management for admins: list users, see Pro status +
 * today's usage, and grant/revoke Pro (comp). All data + mutations go through
 * admin-gated edge functions (admin-list-users / admin-grant-pro /
 * admin-revoke-pro) because the browser anon client cannot enumerate users or
 * write subscriptions.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@drut/shared';
import { RefreshCw } from 'lucide-react';

interface UserRow {
    id: string;
    email: string | null;
    full_name: string | null;
    exam_profile: string | null;
    target_exams: string[] | null;
    class_level: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    isPro: boolean;
    plan: string | null;
    expires_at: string | null;
    usageToday: number;
}

function fmtDate(s: string | null): string {
    if (!s) return '—';
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const AdminUsers: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.functions.invoke('admin-list-users', { body: {} });
            if (error) throw new Error(error.message || 'Failed to load users');
            setUsers(data?.users ?? []);
        } catch (e: any) {
            setError(e?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const grantPro = async (u: UserRow, plan: 'monthly' | 'annual') => {
        const label = plan === 'annual' ? '1 year' : '1 month';
        if (!window.confirm(`Grant ${label} of Pro to ${u.email || u.id}? (Free comp — no charge.)`)) return;
        setBusyId(u.id);
        try {
            const { error } = await supabase.functions.invoke('admin-grant-pro', { body: { user_id: u.id, plan } });
            if (error) throw new Error(error.message || 'Grant failed');
            await load();
        } catch (e: any) {
            alert(e?.message || 'Grant failed');
        } finally {
            setBusyId(null);
        }
    };

    const revokePro = async (u: UserRow) => {
        if (!window.confirm(`Revoke Pro from ${u.email || u.id}? Their active subscription will be canceled.`)) return;
        setBusyId(u.id);
        try {
            const { error } = await supabase.functions.invoke('admin-revoke-pro', { body: { user_id: u.id } });
            if (error) throw new Error(error.message || 'Revoke failed');
            await load();
        } catch (e: any) {
            alert(e?.message || 'Revoke failed');
        } finally {
            setBusyId(null);
        }
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return users;
        return users.filter((u) =>
            (u.email || '').toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q),
        );
    }, [users, query]);

    const proCount = users.filter((u) => u.isPro).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h2 className="text-[18px] font-semibold text-[var(--color-ink-1)]">Users</h2>
                    <p className="text-[13px] text-[var(--color-ink-3)] mt-0.5">
                        {users.length} users · {proCount} Pro. Grant or revoke Pro for beta testers.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search email or name…"
                        className="h-9 px-3 rounded-[10px] bg-[var(--color-card)] ring-1 ring-[var(--color-border)] text-[13px] text-[var(--color-ink-1)] focus:outline-none focus:ring-[var(--color-primary)] w-56"
                    />
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
            </div>

            {error && <div className="rounded-[12px] bg-[#fdecea] text-[#b3261e] text-[13px] p-3">{error}</div>}

            {loading ? (
                <div className="text-[14px] text-[var(--color-ink-3)] py-10 text-center">Loading users…</div>
            ) : filtered.length === 0 ? (
                <div className="text-[14px] text-[var(--color-ink-3)] py-10 text-center">{users.length === 0 ? 'No users yet.' : 'No matches.'}</div>
            ) : (
                <div className="overflow-x-auto rounded-[12px] ring-1 ring-[var(--color-border)]">
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="text-left text-[var(--color-ink-3)] border-b border-[var(--color-border)]">
                                <th className="font-medium px-3 py-2.5">User</th>
                                <th className="font-medium px-3 py-2.5">Exam</th>
                                <th className="font-medium px-3 py-2.5">Joined</th>
                                <th className="font-medium px-3 py-2.5">Last active</th>
                                <th className="font-medium px-3 py-2.5">Used today</th>
                                <th className="font-medium px-3 py-2.5">Status</th>
                                <th className="font-medium px-3 py-2.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u) => {
                                const exams = (u.target_exams && u.target_exams.length ? u.target_exams.join(', ') : u.exam_profile) || '—';
                                const busy = busyId === u.id;
                                return (
                                    <tr key={u.id} className="border-b border-[var(--color-border)] last:border-0">
                                        <td className="px-3 py-2.5">
                                            <div className="text-[var(--color-ink-1)]">{u.email || <span className="font-mono text-[11px] text-[var(--color-ink-3)]">{u.id.slice(0, 8)}…</span>}</div>
                                            {u.full_name && <div className="text-[12px] text-[var(--color-ink-3)]">{u.full_name}</div>}
                                        </td>
                                        <td className="px-3 py-2.5 text-[var(--color-ink-2)]">{exams}</td>
                                        <td className="px-3 py-2.5 text-[var(--color-ink-3)]">{fmtDate(u.created_at)}</td>
                                        <td className="px-3 py-2.5 text-[var(--color-ink-3)]">{fmtDate(u.last_sign_in_at)}</td>
                                        <td className="px-3 py-2.5 num-tabular text-[var(--color-ink-2)]">{u.usageToday}</td>
                                        <td className="px-3 py-2.5">
                                            {u.isPro ? (
                                                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#eef6dd] text-[#3d7a0f]">
                                                    Pro · {u.plan}{u.expires_at ? ` → ${fmtDate(u.expires_at)}` : ''}
                                                </span>
                                            ) : (
                                                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-muted)] text-[var(--color-ink-3)]">Free</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2 justify-end">
                                                {u.isPro ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => revokePro(u)}
                                                        disabled={busy}
                                                        className="text-[12px] font-medium text-[#b3261e] hover:underline disabled:opacity-50"
                                                    >
                                                        {busy ? '…' : 'Revoke'}
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => grantPro(u, 'monthly')}
                                                            disabled={busy}
                                                            className="text-[12px] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink-1)] disabled:opacity-50"
                                                        >
                                                            {busy ? '…' : 'Grant 1mo'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => grantPro(u, 'annual')}
                                                            disabled={busy}
                                                            className="text-[12px] font-medium text-[#3d7a0f] hover:underline disabled:opacity-50"
                                                        >
                                                            {busy ? '…' : 'Grant 1yr'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
