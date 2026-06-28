import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { updateOnboardingProfile } from '@drut/shared';
import { authService } from '@drut/shared';
const { getCurrentUser } = authService;
import { useNavigate } from 'react-router-dom';
import { cn, getExamOptions } from '@drut/shared';
import { ArrowRight } from 'lucide-react';

/**
 * Onboarding — editorial refresh.
 *
 * Centered editorial card on warm paper. Editorial header pattern
 * (eyebrow + display-h2 + muted subtitle). Selection chips for class and
 * exams use the muted-fill + lime-active pattern.
 */

interface OnboardingProps { }

export const Onboarding: React.FC<OnboardingProps> = () => {
 const navigate = useNavigate();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const [formData, setFormData] = useState({
 full_name: '',
 class: '' as '11' | '12' | 'Both' | '',
 target_exams: [] as string[],
 });

 // {value,label} — store snake_case values (consistent with mobile), display labels.
 const EXAM_OPTIONS = getExamOptions();

 const handleExamToggle = (exam: string) => {
 setFormData(prev => {
 const exists = prev.target_exams.includes(exam);
 if (exists) {
 return { ...prev, target_exams: prev.target_exams.filter(e => e !== exam) };
 } else {
 return { ...prev, target_exams: [...prev.target_exams, exam] };
 }
 });
 };

 const handleSubmit = async () => {
 setError(null);
 if (!formData.full_name || !formData.class || formData.target_exams.length === 0) {
 setError('Please fill in all required fields.');
 return;
 }

 setLoading(true);
 try {
 const user = await getCurrentUser();
 if (!user) throw new Error('No user found');

 await updateOnboardingProfile(user.id, {
 full_name: formData.full_name,
 class: formData.class as '11' | '12' | 'Both',
 target_exams: formData.target_exams,
 });

 navigate('/dashboard');
 } catch (err: any) {
 console.error('Onboarding error:', err);
 setError(err.message || 'Failed to save profile.');
 } finally {
 setLoading(false);
 }
 };

 const chipBase =
 'cursor-pointer rounded-[12px] p-3 text-center text-[13px] font-semibold transition-all flex items-center justify-center';
 const chipInactive = 'bg-[var(--color-card)] ring-hairline text-[var(--color-ink-2)] hover:bg-[var(--color-muted)]';
 const chipActive = 'bg-[var(--color-accent)] ring-hairline-strong text-[var(--color-accent-foreground)]';

 return (
 <div className="relative min-h-screen flex items-center justify-center p-4 bg-[var(--color-background)] overflow-hidden">
 {/* Editorial halftone bleed at top */}
 <div
 aria-hidden
 className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-halftone"
 />

 <Card className="w-full max-w-lg relative z-10">
 <CardHeader>
 <p className="label-uppercase">Get started</p>
 <h2 className="text-[28px] leading-[1.15] font-bold tracking-tight text-[var(--color-ink-1)] mt-1">
 Welcome to Drut
 </h2>
 <p className="text-[13px] text-[var(--color-ink-3)] mt-2">
 Three quick questions to personalize your practice.
 </p>
 </CardHeader>
 <CardContent className="space-y-6">

 {/* Name */}
 <div className="space-y-2">
 <label className="label-uppercase" htmlFor="name">
 Full name
 </label>
 <input
 id="name"
 className="flex h-10 w-full rounded-[10px] bg-[var(--color-card)] ring-hairline-strong px-3 py-2 text-[14px] text-[var(--color-ink-1)] placeholder:text-[var(--color-ink-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 transition-shadow"
 placeholder="Neti"
 value={formData.full_name}
 onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
 />
 </div>

 {/* Class */}
 <div className="space-y-2">
 <label className="label-uppercase">Class</label>
 <div className="grid grid-cols-3 gap-2">
 {['11', '12', 'Both'].map((cls) => (
 <div
 key={cls}
 className={cn(chipBase, formData.class === cls ? chipActive : chipInactive)}
 onClick={() => setFormData({ ...formData, class: cls as any })}
 >
 {cls === 'Both' ? 'Both' : `Class ${cls}`}
 </div>
 ))}
 </div>
 </div>

 {/* Target Exams */}
 <div className="space-y-2">
 <label className="label-uppercase">Target exams</label>
 <div className="grid grid-cols-3 gap-2">
 {EXAM_OPTIONS.map((exam) => (
 <div
 key={exam.value}
 className={cn(
 chipBase,
 formData.target_exams.includes(exam.value) ? chipActive : chipInactive
 )}
 onClick={() => handleExamToggle(exam.value)}
 >
 {exam.label}
 </div>
 ))}
 </div>
 </div>

 {error && (
 <p className="text-[12px] text-[var(--color-destructive)] font-medium">
 {error}
 </p>
 )}

 </CardContent>
 <CardFooter>
 <Button
 className="w-full"
 variant="ink"
 onClick={handleSubmit}
 isLoading={loading}
 disabled={!formData.full_name || !formData.class || formData.target_exams.length === 0}
 >
 Complete setup
 <ArrowRight className="w-4 h-4" />
 </Button>
 </CardFooter>
 </Card>
 </div>
 );
};
