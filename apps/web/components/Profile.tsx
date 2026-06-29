import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@drut/shared';
import { Button } from './ui/Button';
import { authService } from '@drut/shared';
const { getCurrentUser, updateUser } = authService;
import { uploadAvatar } from '@drut/shared'; // from ../services/profileService';
import { fetchUserAnalytics } from '@drut/shared'; // from ../services/analyticsService';
import { User } from '@drut/shared';
import { EXAM_TAXONOMY, getExamOptions, normalizeTargetExams } from '@drut/shared';
import { log } from '@drut/shared';
import { supabase } from '@drut/shared';
import { useRazorpayCheckout, getCurrentSubscription, isProActive, PRICING, type Subscription, type PlanId } from '@drut/shared';
import { PaywallModal } from './PaywallModal';

export const Profile: React.FC<{}> = () => {
 const [user, setUser] = useState<User | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [successMessage, setSuccessMessage] = useState<string | null>(null);
 const [analytics, setAnalytics] = useState<any>(null);

 // Form state
 const [fullName, setFullName] = useState('');
 const [phone, setPhone] = useState('');
 const [examProfile, setExamProfile] = useState('');
 const [targetExams, setTargetExams] = useState<string[]>([]);
 const toggleExam = (v: string) => setTargetExams(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));
 const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
 const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
 const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);

 // Subscription
 const [sub, setSub] = useState<Subscription | null>(null);
 const [showPaywall, setShowPaywall] = useState(false);
 const { pay: payWithRazorpay } = useRazorpayCheckout({ name: 'Drut' });
 const isPro = isProActive(sub);
 const refreshSub = () => { getCurrentSubscription().then(setSub).catch(() => setSub(null)); };
 useEffect(() => { refreshSub(); }, []);
 const handleUpgrade = async (plan: PlanId, couponCode?: string) => {
   try {
     await payWithRazorpay(plan, couponCode);
     setShowPaywall(false);
     setSuccessMessage("You're now Drut Pro!");
     setTimeout(() => setSuccessMessage(null), 3000);
     refreshSub();
   } catch (e: any) {
     if (e?.message === 'checkout-dismissed' || e?.message === 'checkout-already-open') return;
     setError(e?.message || 'Payment could not be completed. Please try again.');
   }
 };
 const formatSubDate = (iso: string) => {
   try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
   catch { return iso; }
 };

 const fileInputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 const fetchData = async () => {
 setLoading(true);
 try {
 const currentUser = await getCurrentUser();
 if (currentUser) {
 setUser(currentUser);
 const metadata = currentUser.user_metadata;
 setFullName(metadata.full_name || '');
 setPhone(metadata.phone || '');
 setExamProfile(metadata.exam_profile || EXAM_TAXONOMY[0].value);
 setTargetExams(normalizeTargetExams((metadata.target_exams && metadata.target_exams.length) ? metadata.target_exams : metadata.exam_profile));
 setAvatarUrl(metadata.avatar_url);
 setAvatarPreview(metadata.avatar_url);
 } else {
 setError('Could not load user profile.');
 }

 // Fetch analytics data
 const analyticsData = await fetchUserAnalytics();
 setAnalytics(analyticsData);
 } catch (err: any) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };
 fetchData();
 }, []);

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 setNewAvatarFile(file);
 setAvatarPreview(URL.createObjectURL(file));
 }
 };

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!user) return;

 setSaving(true);
 setError(null);
 setSuccessMessage(null);

 try {
 let finalAvatarUrl = avatarUrl;
 if (newAvatarFile) {
 finalAvatarUrl = await uploadAvatar(newAvatarFile);
 }

 const updatedMetadata = {
 full_name: fullName,
 phone: phone,
 target_exams: targetExams,
 exam_profile: targetExams[0] || examProfile, // primary = first selected (backward compat)
 avatar_url: finalAvatarUrl,
 };

 const { user: updatedUser } = await updateUser({ data: updatedMetadata });

 if (updatedUser) {
 setUser(updatedUser);
 setAvatarUrl(updatedUser.user_metadata.avatar_url);
 setAvatarPreview(updatedUser.user_metadata.avatar_url);
 setNewAvatarFile(null);
 localStorage.setItem('examProfile', examProfile);
 setSuccessMessage('Profile updated successfully!');

 // Clear success message after 3 seconds
 setTimeout(() => setSuccessMessage(null), 3000);
 }

 } catch (err: any) {
 log.error('Failed to update profile:', err);
 setError(err.message || 'An error occurred while saving.');
 } finally {
 setSaving(false);
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <svg className="animate-spin h-10 w-10 text-[var(--color-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
 </svg>
 </div>
 );
 }

 if (!user) {
 return <div className="text-destructive">Error: {error || 'Could not load profile'}</div>;
 }

 const createdDate = new Date(user.created_at || Date.now()).toLocaleDateString('en-US', {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });

 const inputCls = "w-full px-3 h-10 rounded-[10px] bg-[var(--color-card)] ring-hairline-strong text-[14px] text-[var(--color-ink-1)] placeholder:text-[var(--color-ink-3)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1 transition-shadow";
 const inputDisabled = "w-full px-3 h-10 rounded-[10px] bg-[var(--color-muted)] ring-hairline text-[14px] text-[var(--color-ink-3)] num-tabular";
 const sectionCard = "bg-[var(--color-card)] p-6 rounded-[20px] ring-hairline";

 return (
 <div className="max-w-7xl mx-auto space-y-6">
 {/* Header */}
 <div className="flex flex-col gap-1">
 <p className="label-uppercase">Account</p>
 <h1 className="text-[32px] leading-[1.05] font-bold tracking-[-0.02em] text-[var(--color-ink-1)]">
 Profile settings
 </h1>
 <p className="text-[14px] text-[var(--color-ink-3)] mt-1">Manage your account and preferences.</p>
 </div>

 {/* Success / Error */}
 {successMessage && (
 <div className="relative flex items-center gap-3 p-3 rounded-[12px] bg-[var(--color-muted)] ring-hairline overflow-hidden">
 <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--color-primary)]" />
 <span className="text-[13px] font-medium text-[var(--color-ink-1)] pl-2">{successMessage}</span>
 </div>
 )}
 {error && (
 <div className="relative flex items-center gap-3 p-3 rounded-[12px] bg-[var(--color-muted)] ring-hairline overflow-hidden">
 <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--color-destructive)]" />
 <span className="text-[13px] font-medium text-[var(--color-destructive)] pl-2">{error}</span>
 </div>
 )}

 {/* Subscription */}
 <div className={sectionCard}>
 <div className="flex flex-col gap-1 mb-5">
 <p className="label-uppercase">Billing</p>
 <h3 className="text-[16px] font-semibold tracking-tight text-[var(--color-ink-1)]">Subscription</h3>
 <p className="text-[12px] text-[var(--color-ink-3)] mt-0.5">Your Drut plan and status.</p>
 </div>
 {isPro && sub ? (
 <div className="flex items-center justify-between gap-4 flex-wrap">
 <div>
 <p className="text-[15px] font-semibold text-[var(--color-ink-1)]">Drut Pro · {PRICING[sub.plan]?.label || sub.plan}</p>
 <p className="text-[13px] text-[var(--color-ink-3)] mt-1">Valid until {formatSubDate(sub.expires_at)}</p>
 </div>
 <span className="inline-flex items-center rounded-full bg-[#dcfce7] text-[#15803d] text-[12px] font-bold px-3 py-1">Active</span>
 </div>
 ) : (
 <div className="flex items-center justify-between gap-4 flex-wrap">
 <div>
 <p className="text-[15px] font-semibold text-[var(--color-ink-1)]">Free plan</p>
 <p className="text-[13px] text-[var(--color-ink-3)] mt-1">20 questions a day. Go Pro for unlimited practice &amp; every feature.</p>
 </div>
 <button type="button" onClick={() => setShowPaywall(true)} className="inline-flex items-center rounded-full bg-[var(--color-primary)] text-white text-[14px] font-bold px-5 py-2.5 hover:opacity-90 transition-opacity">Upgrade</button>
 </div>
 )}
 </div>

 <form onSubmit={handleSave}>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

 {/* Card 1: Personal Information */}
 <div className={sectionCard}>
 <div className="flex flex-col gap-1 mb-5">
 <p className="label-uppercase">Personal</p>
 <h3 className="text-[16px] font-semibold tracking-tight text-[var(--color-ink-1)]">Personal information</h3>
 <p className="text-[12px] text-[var(--color-ink-3)] mt-0.5">Update your personal details.</p>
 </div>

 <div className="space-y-4">
 {/* Avatar */}
 <div className="flex items-center gap-4">
 <div className="relative">
 <img
 src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
 alt="Profile"
 className="h-16 w-16 rounded-full ring-hairline-strong bg-[var(--color-muted)]"
 />
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-ink-1)] text-white hover:bg-[var(--color-ink-2)] transition-colors ring-2 ring-white"
 aria-label="Change photo"
 >
 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 </button>
 <input
 type="file"
 ref={fileInputRef}
 onChange={handleFileChange}
 className="hidden"
 accept="image/png, image/jpeg, image/jpg"
 />
 </div>
 <div>
 <p className="text-[14px] font-semibold tracking-tight text-[var(--color-ink-1)]">{fullName || 'Set your name'}</p>
 <p className="text-[11px] text-[var(--color-ink-3)] mt-0.5">PNG, JPG up to 1MB</p>
 </div>
 </div>

 <div>
 <label className="label-uppercase block mb-2">Full name</label>
 <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="Your name" />
 </div>

 <div>
 <label className="label-uppercase block mb-2">Email</label>
 <input type="email" value={user.email} className={inputDisabled} disabled />
 </div>

 <div>
 <label className="label-uppercase block mb-2">Phone</label>
 <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="(123) 456-7890" />
 </div>

 <div>
 <label className="label-uppercase block mb-2">Member since</label>
 <input type="text" value={createdDate} className={inputDisabled} disabled />
 </div>
 </div>
 </div>

 {/* Card 2: Academic */}
 <div className={`${sectionCard} h-fit`}>
 <div className="flex flex-col gap-1 mb-5">
 <p className="label-uppercase">Academic</p>
 <h3 className="text-[16px] font-semibold tracking-tight text-[var(--color-ink-1)]">Academic profile</h3>
 <p className="text-[12px] text-[var(--color-ink-3)] mt-0.5">Your exam preparation details.</p>
 </div>

 <div className="space-y-5">
 <div>
 <label className="label-uppercase block mb-2">Class</label>
 <span className="inline-flex items-center px-3 py-1.5 rounded-[10px] bg-[var(--color-muted)] ring-hairline text-[14px] font-semibold text-[var(--color-ink-1)] num-tabular">
 {(user?.user_metadata?.class as string) === 'Reappear' || (user?.user_metadata?.class as string) === 'Both' ? 'Both (Class 11 & 12)' : `Class ${user?.user_metadata?.class || 'N/A'}`}
 </span>
 </div>

 <div>
 <label className="label-uppercase block mb-2">Target exams</label>
 <p className="text-[12px] text-[var(--color-ink-3)] mb-2">Select all you're preparing for — EAPCET students often also take JEE Main.</p>
 <div className="flex flex-wrap gap-2">
 {getExamOptions().map((opt) => {
 const selected = targetExams.includes(opt.value);
 return (
 <button
 key={opt.value}
 type="button"
 onClick={() => toggleExam(opt.value)}
 className={cn(
 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all',
 selected
 ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] ring-hairline-strong'
 : 'bg-[var(--color-card)] ring-hairline text-[var(--color-ink-2)] hover:bg-[var(--color-muted)]'
 )}
 >
 {selected && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />}
 {opt.label}
 </button>
 );
 })}
 </div>
 </div>
 </div>
 </div>

 {/* Card 3: Account Actions */}
 <div className={sectionCard}>
 <div className="flex flex-col gap-1 mb-5">
 <p className="label-uppercase">Settings</p>
 <h3 className="text-[16px] font-semibold tracking-tight text-[var(--color-ink-1)]">Account</h3>
 <p className="text-[12px] text-[var(--color-ink-3)] mt-0.5">Manage your account preferences.</p>
 </div>

 <div className="space-y-2">
 <button type="button" className="w-full flex items-center justify-between p-3 ring-hairline rounded-[12px] hover:bg-[var(--color-muted)] transition-colors text-left">
 <div className="flex items-center gap-3">
 <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-muted)] text-[var(--color-ink-2)]">
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
 </svg>
 </span>
 <span className="text-[13px] font-medium text-[var(--color-ink-1)]">Change password</span>
 </div>
 <svg className="w-4 h-4 text-[var(--color-ink-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
 </svg>
 </button>

 <button type="button" className="w-full flex items-center justify-between p-3 ring-hairline rounded-[12px] hover:bg-[var(--color-muted)] transition-colors text-left">
 <div className="flex items-center gap-3">
 <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-muted)] text-[var(--color-ink-2)]">
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
 </svg>
 </span>
 <span className="text-[13px] font-medium text-[var(--color-ink-1)]">Export data</span>
 </div>
 <svg className="w-4 h-4 text-[var(--color-ink-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
 </svg>
 </button>

 <div className="pt-3 mt-2 border-t border-[var(--color-ink-5)]">
 <button type="button" className="w-full flex items-center justify-between p-3 ring-hairline rounded-[12px] hover:bg-[#fde7e5]/40 transition-colors text-left">
 <div className="flex items-center gap-3">
 <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#fde7e5] text-[var(--color-destructive)]">
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
 </svg>
 </span>
 <span className="text-[13px] font-medium text-[var(--color-destructive)]">Delete account</span>
 </div>
 <svg className="w-4 h-4 text-[var(--color-destructive)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
 </svg>
 </button>
 </div>
 </div>
 </div>
 </div>

 <div className="mt-6 flex justify-end">
 <Button type="submit" disabled={saving} variant="ink" isLoading={saving}>
 {saving ? 'Saving…' : 'Save changes'}
 </Button>
 </div>
 </form>

 <PaywallModal
 isOpen={showPaywall}
 onClose={() => setShowPaywall(false)}
 onUpgrade={handleUpgrade}
 />
 </div>
 );
};