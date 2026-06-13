import React, { useState, useEffect } from 'react';
import { supabase } from '@drut/shared';

/**
 * Landing — redesigned waitlist landing (June 2026).
 *
 * Design direction (approved): Pop Site skeleton + Jorny warmth + Inflow
 * numbered storytelling, on the real Drut brand system (Lime #5cbb21,
 * Coral #ff7a3a, Warm Paper #f7f7f5, ink ramp).
 *
 * Deliberately self-contained: Tailwind utility classes + arbitrary hex
 * values ONLY — no dependence on the legacy CDN tailwind.config or on
 * WaitlistClassic.css, so removing the CDN scripts (PR C) cannot break it.
 *
 * The previous design remains at /classic for instant rollback.
 * (components/LandingPage.tsx is an older unused file — untouched.)
 */

const BRAND = {
  limeTint: '#f0f9e8',
  coralTint: '#fff1e8',
  skyTint: '#eaf4fb',
};

const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8';

async function sendWaitlistEmail(payload: Record<string, unknown>) {
  try {
    await fetch('https://ukrtaerwaxekonislnpw.supabase.co/functions/v1/send-waitlist-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Waitlist email send failed (non-blocking):', err);
  }
}

/* ------------------------------------------------------------------ */
/* Waitlist email capture (reused in hero + final CTA)                 */
/* ------------------------------------------------------------------ */

const WaitlistForm: React.FC<{ variant?: 'light' | 'dark'; id?: string }> = ({ variant = 'light', id }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert([{ email, exam_interest: 'Quick Signup' }]);

      if (insertError) {
        if (
          insertError.code === '23505' ||
          insertError.message?.includes('duplicate') ||
          insertError.message?.includes('unique')
        ) {
          setError("You're already on the list — see you at the beta!");
        } else {
          setError(`Failed to join: ${insertError.message || 'Unknown error'}`);
        }
        return;
      }

      await sendWaitlistEmail({ email, customerId: email, name: 'there', exam: 'Quick Signup' });
      setSuccess(true);
      setEmail('');
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-full bg-[#f0f9e8] border border-[#5cbb21]/30 px-6 py-4 max-w-md mx-auto">
        <svg width="22" height="22" viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="none" stroke="#5cbb21" strokeWidth="3" />
          <path fill="none" stroke="#5cbb21" strokeWidth="4" strokeLinecap="round" d="M14 27l7 7 16-16" />
        </svg>
        <span className="font-semibold text-[#1c1d1a]">You're on the list! Check your inbox.</span>
      </div>
    );
  }

  const dark = variant === 'dark';
  return (
    <div id={id} className="w-full max-w-md mx-auto">
      <form
        onSubmit={handleSubmit}
        className={`flex items-center gap-1.5 rounded-full p-1.5 border shadow-sm ${
          dark ? 'bg-white/10 border-white/25 backdrop-blur' : 'bg-white border-[#e6e6e2]'
        }`}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          aria-label="Email address"
          className={`flex-1 min-w-0 bg-transparent px-4 py-2.5 text-[15px] outline-none ${
            dark ? 'text-white placeholder-white/60' : 'text-[#1c1d1a] placeholder-[#9a9c93]'
          }`}
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-full bg-[#5cbb21] hover:bg-[#4a9a1a] disabled:opacity-60 text-white text-[15px] font-bold px-6 py-2.5 transition-colors"
        >
          {loading ? '…' : 'Join the waitlist'}
        </button>
      </form>
      {error && <p className={`mt-2 text-sm text-center ${dark ? 'text-orange-200' : 'text-[#c2410c]'}`}>{error}</p>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Research panel modal (preserves the existing second funnel)         */
/* ------------------------------------------------------------------ */

const ResearchModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', user_type: '', exam: '', pain_point: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const { error: insertError } = await supabase.from('waitlist').insert([
        {
          email: formData.email,
          name: formData.name,
          phone_number: formData.phone,
          exam_interest: formData.exam,
          user_type: formData.user_type,
          pain_point: formData.pain_point,
        },
      ]);
      if (
        insertError &&
        (insertError.code === '23505' ||
          insertError.message?.includes('duplicate') ||
          insertError.message?.includes('unique'))
      ) {
        setStatus('error');
        setMessage('This email is already on the waitlist!');
        return;
      }
      await sendWaitlistEmail({ ...formData, customerId: formData.email, email_type: 'research' });
      setStatus('success');
      setMessage("You're on the panel. We'll reach out soon.");
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  const inputCls =
    'w-full rounded-xl border border-[#e6e6e2] bg-white px-4 py-2.5 text-[15px] text-[#1c1d1a] placeholder-[#9a9c93] outline-none focus:border-[#5cbb21]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-[#f7f7f5] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 h-9 w-9 rounded-full bg-white border border-[#e6e6e2] text-[#5c5e57] hover:text-[#1c1d1a]"
        >
          ✕
        </button>
        <h2 className="text-2xl font-extrabold text-[#1c1d1a] mb-1">Help us build Drut</h2>
        <p className="text-[#5c5e57] mb-6 text-[15px]">
          Join the research panel — a 20-minute conversation that shapes how lakhs of students will practice.
        </p>
        {status === 'success' ? (
          <div className="rounded-2xl bg-[#f0f9e8] border border-[#5cbb21]/30 p-6 text-center font-semibold text-[#1c1d1a]">
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input name="name" required placeholder="Your name" value={formData.name} onChange={handleChange} className={inputCls} />
            <input name="email" type="email" required placeholder="Email" value={formData.email} onChange={handleChange} className={inputCls} />
            <input name="phone" placeholder="Phone (optional)" value={formData.phone} onChange={handleChange} className={inputCls} />
            <select name="user_type" required value={formData.user_type} onChange={handleChange} className={inputCls}>
              <option value="">I am a…</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="teacher">Teacher</option>
            </select>
            <select name="exam" required value={formData.exam} onChange={handleChange} className={inputCls}>
              <option value="">Target exam</option>
              <option value="AP EAPCET">AP EAPCET</option>
              <option value="TG EAPCET">TG EAPCET</option>
              <option value="Other">Other</option>
            </select>
            <textarea
              name="pain_point"
              rows={3}
              placeholder="What's the hardest part of exam prep for you?"
              value={formData.pain_point}
              onChange={handleChange}
              className={inputCls}
            />
            {status === 'error' && <p className="text-sm text-[#c2410c]">{message}</p>}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-full bg-[#1c1d1a] text-white font-bold py-3 hover:bg-black disabled:opacity-60 transition-colors"
            >
              {status === 'loading' ? 'Sending…' : 'Join the research panel'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Animation primitives                                                */
/* ------------------------------------------------------------------ */

// Respect the user's reduced-motion preference — freeze animations if set.
const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
  return reduced;
};

// Loop a step counter 0..(steps-1), advancing every `ms`. Pauses if reduced.
const useLoopStep = (steps: number, ms: number, reduced: boolean, frozenStep = 1): number => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced) {
      setStep(frozenStep);
      return;
    }
    const id = setInterval(() => setStep((s) => (s + 1) % steps), ms);
    return () => clearInterval(id);
  }, [steps, ms, reduced, frozenStep]);
  return step;
};

const SCREEN_H = 600;

const PhoneStatusBar: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-[#1c1d1a]">
    <span>9:41</span>
    <span className="text-[10px] font-bold tracking-wide text-[#5cbb21] uppercase">{label}</span>
    <span className="flex items-center gap-1" aria-hidden="true">
      <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="0.5" /><rect x="4" y="5" width="3" height="6" rx="0.5" /><rect x="8" y="3" width="3" height="8" rx="0.5" /><rect x="12" y="1" width="3" height="10" rx="0.5" /></svg>
      <svg width="18" height="11" viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="19" height="12" rx="3" /><rect x="3" y="3" width="13" height="8" rx="1.5" fill="currentColor" /><path d="M22 5v4" strokeLinecap="round" /></svg>
    </span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Practice phone — Android device, auto-running:                      */
/* question -> answer -> Quick Method -> Full Solution                 */
/* ------------------------------------------------------------------ */

const PRACTICE_OPTS = ['1/√3', '√3', '1/2', '√3/2'];

// Genuinely detailed worked solution — what a student studies to LEARN it,
// not a four-cell skeleton. (Full Solution = D.E.E.P. internally.)
const FULL_SOLUTION_STEPS = [
  'Mark the forces on the block: weight mg straight down, normal N perpendicular to the incline, friction f acting up the incline (it resists the impending slide).',
  'Resolve the weight along and across the incline: along it, mg sin θ pulls the block down; across it, mg cos θ presses into the surface.',
  'Perpendicular to the incline there is no motion, so the surface pushes back equally: N = mg cos θ.',
  '“Just begins to slide” is the tipping point — static friction is at its maximum, f = μₛN.',
  'Along the incline, at that instant the block is still in balance: mg sin θ = f = μₛN = μₛ mg cos θ.',
  'The mg cancels from both sides, leaving μₛ = sin θ / cos θ = tan θ.',
  'Substitute the angle: μₛ = tan 30° = 1/√3 ≈ 0.577.',
  'Notice the 2 kg never mattered — μₛ depends only on the angle of repose, not the mass.',
];

const PracticePhone: React.FC = () => {
  const reduced = usePrefersReducedMotion();
  // 0: question  1: answer selected  2: Quick Method  3: Full Solution
  const step = useLoopStep(4, 2200, reduced, 1);
  const frame = step <= 1 ? 0 : step === 2 ? 1 : 2;
  const selected = step >= 1;

  return (
    <div className="relative shrink-0" style={{ animation: reduced ? undefined : 'drutFloat 7s ease-in-out infinite' }}>
      {/* Android device frame — uniform thin bezel + centred hole-punch */}
      <div className="rounded-[40px] bg-[#101010] p-[9px] shadow-[0_40px_70px_-20px_rgba(28,29,26,0.45)]">
        <div className="relative overflow-hidden rounded-[32px] bg-white w-[272px] sm:w-[288px] text-left" style={{ height: SCREEN_H }}>
          {/* Hole-punch camera (Android tell) */}
          <div className="absolute left-1/2 top-[14px] z-30 h-[10px] w-[10px] -translate-x-1/2 rounded-full bg-[#101010] ring-2 ring-black/20" />

          {/* Filmstrip: 3 stacked frames, translated by step */}
          <div
            className="transition-transform duration-700"
            style={{ transform: `translateY(-${frame * SCREEN_H}px)`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
          >
            {/* Frame 0 — Question + answer */}
            <div className="flex flex-col" style={{ height: SCREEN_H }}>
              <PhoneStatusBar label="Practice" />
              <div className="flex-1 px-5 pt-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#9a9c93]">Physics · Friction</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1e8] px-2 py-0.5 text-[11px] font-bold text-[#c2410c]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></svg>
                    0:45
                  </span>
                </div>
                <p className="text-[14px] font-bold leading-snug text-[#1c1d1a] mb-4">
                  A 2 kg block on a 30° incline just begins to slide. The coefficient of static friction is:
                </p>
                <div className="space-y-2">
                  {PRACTICE_OPTS.map((opt, i) => {
                    const isCorrect = i === 0; // A = 1/√3
                    const isWrongPick = i === 3; // D = √3/2 — the student's tempting mistake
                    const showCorrect = selected && isCorrect;
                    const showWrong = selected && isWrongPick;
                    return (
                      <div
                        key={opt}
                        className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition-all duration-500 ${
                          showCorrect
                            ? 'border-[#5cbb21] bg-[#f0f9e8] text-[#1c1d1a]'
                            : showWrong
                              ? 'border-[#f0a3a3] bg-[#fdecec] text-[#1c1d1a]'
                              : 'border-[#eceae4] text-[#5c5e57]'
                        }`}
                      >
                        <span>{String.fromCharCode(65 + i)}. {opt}</span>
                        {showCorrect && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5cbb21" strokeWidth="3" aria-hidden="true"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        )}
                        {showWrong && (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d34a4a" strokeWidth="3" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className={`mt-4 flex items-center gap-2 rounded-xl bg-[#1c1d1a] px-3 py-2 transition-opacity duration-500 ${selected ? 'opacity-100' : 'opacity-0'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff7a3a" strokeWidth="3" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinejoin="round" /></svg>
                  <span className="text-[12px] font-bold text-white">Not quite — here's the faster way</span>
                </div>
              </div>
            </div>

            {/* Frame 1 — Quick Method (light, on-brand) */}
            <div className="flex flex-col" style={{ height: SCREEN_H }}>
              <PhoneStatusBar label="Quick Method" />
              <div className="flex flex-1 flex-col px-5 pt-4">
                <div className="flex items-center gap-2.5 mb-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#5cbb21]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" aria-hidden="true"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round" /></svg>
                  </span>
                  <div>
                    <div className="text-[16px] font-extrabold leading-tight text-[#1c1d1a]">Quick Method</div>
                    <div className="text-[12px] font-semibold text-[#4a9a1a]">Solve it in ~15 seconds</div>
                  </div>
                </div>
                <div className="space-y-3.5">
                  {[
                    'Spot the signal: "just begins to slide" on an incline.',
                    'Use μ = tan θ — no force diagram needed.',
                    'tan 30° = 1/√3, so the answer is Option A.',
                  ].map((body, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-2xl bg-[#f0f9e8] px-4 py-3.5">
                      <span className="mt-[1px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5cbb21] text-[12px] font-extrabold text-white">{i + 1}</span>
                      <p className="text-[14px] leading-snug text-[#1c1d1a]">{body}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#9a9c93]">
                  Want the why? See the Full Solution ↓
                </div>
              </div>
            </div>

            {/* Frame 2 — Full Solution (genuinely detailed) */}
            <div className="flex flex-col" style={{ height: SCREEN_H }}>
              <PhoneStatusBar label="Full Solution" />
              <div className="flex-1 overflow-hidden px-5 pt-3">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-[15px] font-extrabold text-[#1c1d1a]">Full Solution</span>
                  <span className="text-[11px] font-semibold text-[#9a9c93]">every step shown</span>
                </div>
                <ol className="space-y-3">
                  {FULL_SOLUTION_STEPS.map((s, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-[1px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#d7e8c5] text-[11px] font-extrabold text-[#4a9a1a]">{i + 1}</span>
                      <p className="text-[12.5px] leading-[1.45] text-[#3c3e38]">{s}</p>
                    </li>
                  ))}
                </ol>
              </div>
              {/* fade hint that the solution continues / scrolls */}
              <div className="pointer-events-none h-10 bg-gradient-to-t from-white to-transparent -mt-10" />
            </div>
          </div>

          {/* Android gesture pill */}
          <div className="absolute bottom-2 left-1/2 z-30 h-1 w-28 -translate-x-1/2 rounded-full bg-black/20" />
        </div>
      </div>
    </div>
  );
};

/* Side cards that flank the phone (never overlap the screen content) */
const AnalyticsCard: React.FC<{ reduced: boolean }> = ({ reduced }) => (
  <div
    className="w-52 rounded-2xl bg-white p-4 shadow-[0_20px_45px_-15px_rgba(28,29,26,0.28)] border border-[#eceae4]"
    style={{ animation: reduced ? undefined : 'drutFloat2 6s ease-in-out infinite' }}
  >
    <div className="text-[10px] font-bold uppercase tracking-wide text-[#9a9c93] mb-2.5">Speed Analytics</div>
    <div className="flex items-end justify-between gap-1.5 h-14 mb-2.5" aria-hidden="true">
      {[40, 65, 50, 80, 60, 95].map((h, i) => (
        <span key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, backgroundColor: i === 5 ? '#5cbb21' : '#e2efd6' }} />
      ))}
    </div>
    <div className="text-[13px] font-extrabold text-[#1c1d1a]">Friction</div>
    <div className="text-[11px] text-[#c2410c] font-semibold">32s slower than target</div>
  </div>
);

const StreakCard: React.FC<{ reduced: boolean }> = ({ reduced }) => (
  <div
    className="flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3.5 shadow-[0_20px_45px_-15px_rgba(28,29,26,0.28)] border border-[#eceae4]"
    style={{ animation: reduced ? undefined : 'drutFloat 6.5s ease-in-out infinite' }}
  >
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1e8]">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="#ff7a3a" aria-hidden="true"><path d="M12 2c1 3-1 4-1 6a3 3 0 0 0 6 0c0-1 0-2-1-3 2 1 4 4 4 8a8 8 0 1 1-16 0c0-3 2-5 3-7 1 2 2 2 3 1 0-2-1-3-1-5z" /></svg>
    </span>
    <div>
      <div className="text-[14px] font-extrabold text-[#1c1d1a] leading-tight">7-day streak</div>
      <div className="text-[11px] text-[#5c5e57]">Speed climbing</div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Sprint deck — stacked cards, auto-advancing question -> pick -> next */
/* ------------------------------------------------------------------ */

const SPRINT_CARDS = [
  { tag: 'Maths · Functions', q: 'Domain of f(x) = 1/√(x − 2):', opts: ['x > 2', 'x ≥ 2', 'x < 2', 'all x'], correct: 0 },
  { tag: 'Chemistry · Mole', q: 'Number of atoms in 0.5 mol of O₂:', opts: ['6.02×10²³', '3.01×10²³', '1.2×10²⁴', '6.02×10²²'], correct: 2 },
  { tag: 'Physics · Kinematics', q: 'A body from rest, a = 2 m/s². Distance in 3 s:', opts: ['6 m', '9 m', '18 m', '12 m'], correct: 1 },
];

const SprintDeck: React.FC = () => {
  const reduced = usePrefersReducedMotion();
  // 0: question  1: pick shown  2: advancing
  const step = useLoopStep(3, 1500, reduced, 1);
  const [front, setFront] = useState(0);

  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => setFront((f) => (f + 1) % SPRINT_CARDS.length), 420);
      return () => clearTimeout(t);
    }
  }, [step]);

  const picked = step >= 1;

  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[340px]" style={{ animation: reduced ? undefined : 'drutFloat 7s ease-in-out infinite' }}>
      {SPRINT_CARDS.map((card, i) => {
        const pos = (i - front + SPRINT_CARDS.length) % SPRINT_CARDS.length; // 0 front, 1, 2
        const leaving = pos === 0 && step === 2;
        const style: React.CSSProperties = {
          zIndex: 30 - pos,
          transform: leaving
            ? 'translateY(-40px) scale(0.96) rotate(-4deg)'
            : `translateY(${pos * 14}px) scale(${1 - pos * 0.05})`,
          opacity: leaving ? 0 : pos === 2 ? 0.7 : 1,
          transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
        };
        return (
          <div
            key={i}
            className="absolute inset-x-0 top-0 rounded-3xl bg-white p-6 shadow-[0_20px_45px_-15px_rgba(28,29,26,0.3)] border border-[#eceae4] transition-all duration-500"
            style={style}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#9a9c93]">{card.tag}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1c1d1a] px-2.5 py-1 text-[11px] font-bold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff7a3a]" aria-hidden="true" /> SPRINT
              </span>
            </div>
            <p className="text-[15px] font-bold leading-snug text-[#1c1d1a] mb-4 min-h-[44px]">{card.q}</p>
            <div className="grid grid-cols-2 gap-2">
              {card.opts.map((opt, oi) => {
                const show = pos === 0 && picked && oi === card.correct;
                return (
                  <div
                    key={oi}
                    className={`rounded-xl border px-3 py-2 text-[13px] font-semibold transition-all duration-300 ${
                      show ? 'border-[#5cbb21] bg-[#f0f9e8] text-[#1c1d1a]' : 'border-[#eceae4] text-[#5c5e57]'
                    }`}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* FAQ data + schema                                                   */
/* ------------------------------------------------------------------ */

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is Drut?',
    a: 'Drut is an AI-powered practice platform for engineering entrance exams, starting with AP EAPCET and TG EAPCET. It trains you to solve exam questions faster with exam-grade practice questions, per-question time targets, and speed analytics.',
  },
  {
    q: 'Which exams does Drut support?',
    a: 'Right now: AP EAPCET and TG EAPCET (Physics, Chemistry and Mathematics, mapped chapter-by-chapter to the Intermediate syllabus). More engineering entrance exams are planned after launch.',
  },
  {
    q: 'Is Drut free?',
    a: 'Yes — Drut is completely free during the closed beta. Pricing for the public launch will be announced later, and beta users will be the first to know.',
  },
  {
    q: 'What is the "Quick Method"?',
    a: 'Every Drut question ships with two solutions: the Quick Method — the fastest exam-legal way to solve it, written as Trigger → Action → Result — and a detailed Full Solution that works through every step. You get the shortcut for speed and the full reasoning so it actually sticks.',
  },
  {
    q: 'How is Drut different from other practice apps?',
    a: 'Most apps check whether you got the answer right. Drut is built around how fast you got it right — per-question time targets calibrated to real exam pacing, analytics that show exactly where you lose time, and sprint sessions that build exam stamina. In a rank-based exam, speed is the difference between a rank and a rejection.',
  },
  {
    q: 'When does the beta start?',
    a: 'The closed beta opens in mid-2026 with limited seats, invited from this waitlist in order. Join the waitlist to reserve your place.',
  },
];

const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Hero backdrop — soft lime gradient wash (device-forward design)     */
/* ------------------------------------------------------------------ */

const HeroBackdrop: React.FC = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    {/* Lime-tinted radial wash fading to cream — the device pops against it */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 100% 80% at 50% -5%, #e4f4d2 0%, #eef7e3 28%, #f3f6ec 52%, #f7f7f5 78%)',
      }}
    />
    {/* Faint dot-grid texture — engineered/precision feel */}
    <div
      className="absolute inset-0 opacity-[0.05]"
      style={{
        backgroundImage: 'radial-gradient(#1c1d1a 1px, transparent 1px)',
        backgroundSize: '26px 26px',
        maskImage: 'radial-gradient(ellipse 80% 70% at 50% 25%, #000 45%, transparent 85%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 25%, #000 45%, transparent 85%)',
      }}
    />
  </div>
);

/* Hand-drawn underline stroke under "faster" */
const FasterUnderline: React.FC = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 200 16"
    preserveAspectRatio="none"
    className="absolute -bottom-1.5 left-0 w-full h-[10px] sm:h-[12px]"
  >
    <path
      d="M3 11 Q 35 3, 70 8 T 140 7 T 197 9"
      fill="none"
      stroke="#5cbb21"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

interface LandingProps {
  onGetStarted?: () => void;
}

export const Landing: React.FC<LandingProps> = () => {
  const [showResearch, setShowResearch] = useState(false);
  const reduced = usePrefersReducedMotion();

  const scrollToJoin = () =>
    document.getElementById('join')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div
      className="min-h-screen bg-[#f7f7f5] text-[#1c1d1a] antialiased"
      style={{ fontFamily: '"DM Sans", sans-serif' }}
    >
      {/* FAQ structured data for AEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />

      {/* Self-contained keyframes for the floating mockup cards */}
      <style>{`
        @keyframes drutFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes drutFloat2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(10px); } }
        @media (prefers-reduced-motion: reduce) {
          [style*="drutFloat"] { animation: none !important; }
        }
      `}</style>

      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-40 bg-[#f7f7f5]/90 backdrop-blur border-b border-[#e6e6e2]/70">
        <nav className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 py-3.5">
          <a href="/" aria-label="Drut home">
            <img src="/brand-logo.png" alt="Drut" className="h-8 w-auto" />
          </a>
          <div className="hidden md:flex items-center gap-7 text-[14px] font-semibold text-[#5c5e57]">
            <a href="#how" className="hover:text-[#1c1d1a] transition-colors">How it works</a>
            <a href="#sprint" className="hover:text-[#1c1d1a] transition-colors">Sprint</a>
            <a href="#why-speed" className="hover:text-[#1c1d1a] transition-colors">Why speed</a>
            <a href="#faq" className="hover:text-[#1c1d1a] transition-colors">FAQ</a>
          </div>
          <button
            onClick={scrollToJoin}
            className="rounded-full bg-[#5cbb21] hover:bg-[#4a9a1a] text-white text-[14px] font-bold px-5 py-2.5 transition-colors"
          >
            Join the waitlist
          </button>
        </nav>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="relative isolate overflow-hidden pt-20 sm:pt-24 pb-16 text-center px-4">
          <HeroBackdrop />

          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur border border-[#e6e6e2] px-4 py-1.5 text-[13px] font-semibold text-[#5c5e57] mb-7 shadow-[0_2px_12px_rgba(28,29,26,0.06)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-[#ff7a3a] animate-ping opacity-60" aria-hidden="true" />
              <span className="relative h-2 w-2 rounded-full bg-[#ff7a3a]" aria-hidden="true" />
            </span>
            Closed beta · Andhra Pradesh & Telangana
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl sm:text-5xl md:text-[68px] font-extrabold tracking-tight leading-[1.04]">
            Solve EAPCET questions{' '}
            <span className="relative inline-block text-[#5cbb21]">
              faster
              <FasterUnderline />
            </span>
            .
            <br />
            Rank higher.
          </h1>

          <p className="mx-auto max-w-xl mt-6 text-[17px] leading-relaxed text-[#5c5e57]">
            Time is the difference between a rank and a rejection. Drut optimizes your solving
            method so you can answer faster and finish the paper with confidence.
          </p>

          <div className="mt-9 drop-shadow-[0_8px_24px_rgba(92,187,33,0.18)]">
            <WaitlistForm id="join" />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-[#9a9c93]">
              <span>Free during beta</span>
              <span aria-hidden="true">·</span>
              <span>Built for AP EAPCET & TG EAPCET</span>
              <span aria-hidden="true">·</span>
              <button onClick={() => setShowResearch(true)} className="font-semibold text-[#5cbb21] hover:underline">
                Join the research panel →
              </button>
            </div>
          </div>

          {/* Device-forward hero centerpiece: phone flanked by product cards.
              Cards sit BESIDE the phone (never over the screen) and only show
              on xl+ where there's room; below that the phone stands alone. */}
          <div className="mt-16 flex items-center justify-center gap-8">
            <div className="hidden xl:block">
              <StreakCard reduced={reduced} />
            </div>
            <PracticePhone />
            <div className="hidden xl:block">
              <AnalyticsCard reduced={reduced} />
            </div>
          </div>
        </section>

        {/* ---------- How Drut works ---------- */}
        <section id="how" className="py-20 bg-white border-y border-[#e6e6e2]/70">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-center text-[13px] font-bold tracking-[0.15em] uppercase text-[#5cbb21] mb-3">
              How Drut works
            </p>
            <h2 className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight mb-14">
              Three steps to exam speed.
            </h2>
            <div className="grid md:grid-cols-3 gap-10 md:gap-8">
              {[
                {
                  n: '01',
                  title: 'Practice exam-grade questions',
                  desc: 'Questions mapped chapter-by-chapter to your Intermediate syllabus, with the difficulty mix and trap options of the real EAPCET paper.',
                },
                {
                  n: '02',
                  title: 'Learn the Quick Method',
                  desc: 'Every question teaches the fastest exam-legal way to solve it in a few steps — alongside a detailed Full Solution that shows exactly why it works.',
                },
                {
                  n: '03',
                  title: 'Beat the clock',
                  desc: 'Per-question time targets and speed analytics show exactly where you lose seconds — then sprint sessions train them away.',
                },
              ].map((s) => (
                <div key={s.n} className="text-center md:text-left">
                  <div className="mx-auto md:mx-0 mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f9e8] text-[#4a9a1a] font-extrabold text-lg">
                    {s.n}
                  </div>
                  <h3 className="font-extrabold text-[19px] mb-2">{s.title}</h3>
                  <p className="text-[15px] leading-relaxed text-[#5c5e57]">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Sprint showcase ---------- */}
        <section id="sprint" className="py-20 overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-12 md:grid-cols-2">
              {/* Copy */}
              <div className="text-center md:text-left">
                <p className="text-[13px] font-bold tracking-[0.15em] uppercase text-[#ff7a3a] mb-3">Sprint Mode</p>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                  Rapid-fire rounds that build exam stamina.
                </h2>
                <p className="text-[16px] leading-relaxed text-[#5c5e57] mb-6">
                  A deck of timed questions across Physics, Chemistry and Maths — answer, advance,
                  repeat. Sprint trains the one muscle the exam actually tests: thinking fast under
                  the clock, without burning out before the last question.
                </p>
                <ul className="space-y-2.5 text-[15px] text-[#1c1d1a] inline-block text-left">
                  {[
                    'Mixed-subject decks that mirror the real paper',
                    'A running clock on every card',
                    'Instant feedback, then straight to the next',
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f0f9e8]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4a9a1a" strokeWidth="3" aria-hidden="true"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Animated card deck */}
              <div className="py-6">
                <SprintDeck />
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Feature cards ---------- */}
        <section className="py-20 bg-white border-y border-[#e6e6e2]/70">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight mb-14">
              Built for one thing: <span className="text-[#5cbb21]">speed</span>.
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  bg: BRAND.limeTint,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4a9a1a" strokeWidth="2.2" aria-hidden="true">
                      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
                    </svg>
                  ),
                  title: 'Quick Method',
                  desc: 'The fastest way to solve every question — plus a detailed Full Solution when you want the depth. Shortcut and foundation, never one without the other.',
                },
                {
                  bg: BRAND.coralTint,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2.2" aria-hidden="true">
                      <circle cx="12" cy="13" r="8" />
                      <path d="M12 9v4l2.5 2.5M9 2h6" />
                    </svg>
                  ),
                  title: 'Sprint Mode',
                  desc: 'Timed bursts that simulate real exam pressure, so the clock becomes familiar instead of frightening. Stamina is trained, not wished for.',
                },
                {
                  bg: BRAND.skyTint,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2.2" aria-hidden="true">
                      <path d="M3 20h18M6 16v-5m6 5V8m6 8v-3" strokeLinecap="round" />
                    </svg>
                  ),
                  title: 'Speed Analytics',
                  desc: 'See which chapters and solving patterns cost you the most seconds — and watch your time-per-question drop week over week.',
                },
              ].map((f) => (
                <div key={f.title} className="rounded-3xl border border-[#e6e6e2] p-7" style={{ backgroundColor: f.bg }}>
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">{f.icon}</div>
                  <h3 className="font-extrabold text-[19px] mb-2">{f.title}</h3>
                  <p className="text-[15px] leading-relaxed text-[#5c5e57]">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Why Speed Matters ---------- */}
        <section id="why-speed" className="py-20 bg-[#1c1d1a] text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-center text-[13px] font-bold tracking-[0.15em] uppercase text-[#ff7a3a] mb-3">The truth</p>
            <h2 className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">Why speed matters</h2>
            <p className="text-center max-w-2xl mx-auto text-white/70 text-[16px] mb-14">
              Most students fail not because they don't know the answers, but because they run out
              of time. Here's the brutal truth about competitive exams.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  number: '01',
                  title: 'Speed buys accuracy.',
                  description:
                    'When you solve faster, you buy yourself time to double-check. Speed is the ultimate safety net against silly mistakes.',
                },
                {
                  number: '02',
                  title: 'The "10-question" gap.',
                  description:
                    'In a rank-based exam, solving just 10 more questions than the average candidate moves you from the middle of the pack to the top ranks.',
                },
                {
                  number: '03',
                  title: 'Panic is a speed issue.',
                  description:
                    'Anxiety happens when you run out of time. Drut builds the stamina to keep your heart rate down and your brain sharp for the full 3 hours.',
                },
                {
                  number: '04',
                  title: 'Rank > marks.',
                  description:
                    "The cutoff doesn't care how hard you studied. It only cares how many you got right before the buzzer. We maximize that number.",
                },
              ].map((c) => (
                <div key={c.number} className="rounded-3xl bg-white/[0.06] border border-white/10 p-7">
                  <div className="text-[#5cbb21] font-extrabold text-sm mb-3">{c.number}</div>
                  <h3 className="font-extrabold text-[19px] mb-2">{c.title}</h3>
                  <p className="text-[15px] leading-relaxed text-white/70">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight mb-12">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="group rounded-2xl bg-white border border-[#e6e6e2] px-6 py-4 open:pb-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-[16px]">
                    {q}
                    <span
                      className="shrink-0 text-[#5cbb21] transition-transform group-open:rotate-45 text-xl leading-none"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#5c5e57]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Final CTA ---------- */}
        <section className="py-20 px-4">
          <div className="mx-auto max-w-4xl rounded-[32px] bg-[#5cbb21] px-6 py-14 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              Be first in line when the doors open.
            </h2>
            <p className="text-white/85 text-[16px] mb-8 max-w-xl mx-auto">
              Limited beta seats, invited from the waitlist in order. Free during beta.
            </p>
            <WaitlistForm variant="dark" />
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-[#e6e6e2] bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <img src="/brand-logo.png" alt="Drut" className="h-7 w-auto" />
            <p className="text-[13px] text-[#9a9c93]">
              The AI practice partner for EAPCET & engineering entrance exams.
            </p>
          </div>
          <nav className="flex items-center gap-6 text-[14px] font-semibold text-[#5c5e57]" aria-label="Footer">
            <a href="/privacypolicy" className="hover:text-[#1c1d1a]">Privacy</a>
            <a href="/termsandconditions" className="hover:text-[#1c1d1a]">Terms</a>
            <a href="/login" className="hover:text-[#1c1d1a]">Log in</a>
          </nav>
          <p className="text-[13px] text-[#9a9c93]">© 2026 Drut. Made in India.</p>
        </div>
      </footer>

      <ResearchModal open={showResearch} onClose={() => setShowResearch(false)} />
    </div>
  );
};

export default Landing;
