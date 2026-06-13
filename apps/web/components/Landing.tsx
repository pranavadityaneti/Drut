import React, { useState } from 'react';
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
/* Product mock — hand-built "question + optimal path" composition     */
/* ------------------------------------------------------------------ */

const ProductMock: React.FC = () => (
  <div className="relative mx-auto max-w-4xl px-4">
    <div className="rounded-[32px] bg-gradient-to-b from-[#eef7e6] via-[#f4f9ef] to-[#f7f7f5] border border-[#e6e6e2] px-4 sm:px-10 pt-10 pb-12 overflow-hidden">
      <div className="flex flex-col md:flex-row items-center justify-center gap-6">
        {/* Question card */}
        <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-[#eceae4] p-5 md:-rotate-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold tracking-wide text-[#5c5e57] uppercase">Physics · Laws of Motion</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff1e8] text-[#c2410c] text-[12px] font-bold px-2.5 py-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2 2M9 2h6" />
              </svg>
              0:45
            </span>
          </div>
          <p className="text-[15px] font-semibold text-[#1c1d1a] leading-snug mb-4">
            A 2 kg block on a 30° incline just begins to slide. The coefficient of static friction is:
          </p>
          <div className="space-y-2">
            {['1/√3', '√3', '1/2', '√3/2'].map((opt, i) => (
              <div
                key={opt}
                className={`rounded-xl border px-4 py-2.5 text-[14px] font-medium ${
                  i === 0 ? 'border-[#5cbb21] bg-[#f0f9e8] text-[#1c1d1a]' : 'border-[#eceae4] text-[#5c5e57]'
                }`}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </div>
            ))}
          </div>
        </div>

        {/* Optimal Path card */}
        <div className="w-full max-w-sm rounded-2xl bg-[#1c1d1a] shadow-xl p-5 text-white md:rotate-1">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#5cbb21]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" aria-hidden="true">
                <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
            </span>
            <span className="text-[13px] font-bold tracking-wide uppercase text-[#bfe8a3]">The Optimal Path · 15 sec</span>
          </div>
          <ol className="space-y-3 text-[14px] leading-snug">
            <li className="flex gap-3">
              <span className="shrink-0 font-extrabold text-[#5cbb21]">1</span>
              <span>
                <strong className="text-white">Trigger:</strong> "just begins to slide" on an incline.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-extrabold text-[#5cbb21]">2</span>
              <span>
                <strong className="text-white">Action:</strong> μ = tan θ — skip the force diagram.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-extrabold text-[#5cbb21]">3</span>
              <span>
                <strong className="text-white">Result:</strong> tan 30° = 1/√3. Option A.
              </span>
            </li>
          </ol>
          <div className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-[12px] text-white/80">
            Full step-by-step solution available — every step shown.
          </div>
        </div>
      </div>

      {/* Analytics chip */}
      <div className="mt-6 mx-auto w-fit max-w-full rounded-full bg-white border border-[#eceae4] shadow-md px-5 py-2.5 flex items-center gap-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#5cbb21]" aria-hidden="true" />
        <span className="text-[13px] font-semibold text-[#1c1d1a]">
          You solve Friction questions 32s slower than your target — 14 questions queued.
        </span>
      </div>
    </div>
  </div>
);

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
    q: 'What is "The Optimal Path"?',
    a: 'Every Drut question ships with two solutions: The Optimal Path — the fastest exam-legal method, written as Trigger → Action → Result — and a full step-by-step solution that shows every step. You learn the shortcut and the foundation behind it.',
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

interface LandingProps {
  onGetStarted?: () => void;
}

export const Landing: React.FC<LandingProps> = () => {
  const [showResearch, setShowResearch] = useState(false);

  const scrollToJoin = () =>
    document.getElementById('join')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div
      className="min-h-screen bg-[#f7f7f5] text-[#1c1d1a] antialiased"
      style={{ fontFamily: '"DM Sans", sans-serif' }}
    >
      {/* FAQ structured data for AEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />

      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-40 bg-[#f7f7f5]/90 backdrop-blur border-b border-[#e6e6e2]/70">
        <nav className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 py-3.5">
          <a href="/" aria-label="Drut home">
            <img src="/brand-logo.png" alt="Drut" className="h-8 w-auto" />
          </a>
          <div className="hidden md:flex items-center gap-7 text-[14px] font-semibold text-[#5c5e57]">
            <a href="#how" className="hover:text-[#1c1d1a] transition-colors">How it works</a>
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
        <section className="pt-16 sm:pt-20 pb-12 text-center px-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[#e6e6e2] px-4 py-1.5 text-[13px] font-semibold text-[#5c5e57] mb-7 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#ff7a3a]" aria-hidden="true" />
            Closed beta · Andhra Pradesh & Telangana
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.06]">
            Solve EAPCET questions <span className="text-[#5cbb21]">faster</span>.
            <br />
            Rank higher.
          </h1>

          <p className="mx-auto max-w-xl mt-6 text-[17px] leading-relaxed text-[#5c5e57]">
            Time is the difference between a rank and a rejection. Drut optimizes your solving
            method so you can answer faster and finish the paper with confidence.
          </p>

          <div className="mt-9">
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
        </section>

        {/* ---------- Product mock ---------- */}
        <section aria-label="Product preview" className="pb-20">
          <ProductMock />
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
                  title: 'Learn the Optimal Path',
                  desc: 'Every question teaches the fastest exam-legal method — Trigger, Action, Result — alongside the full step-by-step solution.',
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

        {/* ---------- Feature cards ---------- */}
        <section className="py-20">
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
                  title: 'The Optimal Path',
                  desc: 'The fastest method for every question — and the full derivation when you want the depth. Shortcut plus foundation, never one without the other.',
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
