import React, { useState, useEffect, useRef } from 'react';
import './WaitlistLandingPage.css';
import { supabase } from '../lib/supabase';
// Re-using specific icons where possible, or replace with simple placeholders if complex
import { DrutIcon } from './icons/Icons';

interface WaitlistLandingPageProps {
    onGetStarted: () => void;
}

export const WaitlistLandingPage: React.FC<WaitlistLandingPageProps> = ({ onGetStarted }) => {
    // We can keep the form logic if we want the "Get Started" to scroll to a waitlist form
    // For now, let's just make the "Get Started" button trigger the auth modal as per typical SaaS flows
    // or scroll to the waitlist section if that's still the goal.
    // The Prompt asked to "redesign", but the previous functionality was "Join Waitlist". 
    // I'll keep the "Get Started" -> "Scroll to Waitlist" behavior for continuity,
    // but style the top part as requested.

    const scrollToWaitlist = () => {
        document.getElementById('waitlist-form-area')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="modern-landing">
            {/* Ambient Gradient Background */}
            <div className="gradient-bg" />

            {/* Floating Header */}
            <div className="floating-header-container">
                <nav className="floating-pill">
                    <div className="logo-area">
                        {/* Logo Image */}
                        <img src="/logo.png" alt="Drut" className="h-16 header-logo" />
                    </div>

                    <div className="nav-links">
                        <a href="#">Home</a>
                        <a href="#features">Features</a>
                        <a href="#about">About</a>
                        <button onClick={onGetStarted} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 500 }}>
                            Member Login
                        </button>
                    </div>

                    <button className="login-btn desktop-only" onClick={scrollToWaitlist}>
                        Get Started
                    </button>

                    {/* Hamburger Menu - Mobile Only */}
                    <button className="hamburger-btn mobile-only" onClick={scrollToWaitlist} aria-label="Menu">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12h18M3 6h18M3 18h18" />
                        </svg>
                    </button>
                </nav>
            </div>

            {/* Hero Content */}
            <div className="main-content">
                <section className="hero-section">
                    <div className="badge-pill">Unlock Your Speed Potential</div>

                    <h1 className="hero-title">
                        Empower Your Exam Prep with<br />
                        <span className="hero-gradient-text">
                            AI-Driven Speed
                        </span>
                    </h1>

                    <p className="hero-subtitle">
                        Unlock seamless practice and streamline your exam experience with our
                        innovative dashboard solution. Train faster, answer better.
                    </p>

                    {/* Inline Hero Form -> Email Input + CTA Button */}
                    <HeroEmailForm />

                    {/* Dashboard Mockup */}
                    <div className="dashboard-preview-container">
                        <div className="dashboard-window">
                            {/* Window Controls */}
                            <div className="window-nav">
                                <div className="window-dots">
                                    <div className="dot red" />
                                    <div className="dot yellow" />
                                    <div className="dot green" />
                                </div>
                                <div className="url-bar">drut.club/dashboard</div>
                            </div>

                            {/* Content Area - Mock Dashboard UI */}
                            <div className="mock-container">
                                {/* Mock Sidebar */}
                                <div className="mock-sidebar">
                                    <div className="mock-brand">
                                        <img src="/favicon.png" alt="Drut" className="h-6 w-6" style={{ borderRadius: '4px' }} />
                                        <span>Drut</span>
                                    </div>
                                    <div className="mock-nav-items">
                                        <div className="mock-nav-item active">
                                            <div className="w-5 h-5 bg-orange-100 rounded flex items-center justify-center text-orange-600">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
                                            </div>
                                            Dashboard
                                        </div>
                                        <div className="mock-nav-item">
                                            <div className="w-5 h-5 flex items-center justify-center text-gray-400">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="m9 14 2 2 4-4" /></svg>
                                            </div>
                                            Practice
                                        </div>
                                        <div className="mock-nav-item">
                                            <div className="w-5 h-5 flex items-center justify-center text-gray-400">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                                            </div>
                                            Sprint
                                        </div>
                                        <div className="mock-nav-item">
                                            <div className="w-5 h-5 flex items-center justify-center text-gray-400">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                            </div>
                                            Profile
                                        </div>
                                    </div>
                                </div>

                                {/* Mock Main Content */}
                                <div className="mock-main">
                                    <div className="mock-header">
                                        <h2>Good Morning, User</h2>
                                        <p>Here is your daily progress overview</p>
                                    </div>

                                    <div className="mock-grid">
                                        {/* Charts Column */}
                                        <div className="mock-col-left">
                                            {/* Stamina Curve - Area Chart */}
                                            <div className="mock-card mock-card-tall">
                                                <div className="mock-card-title flex justify-between">
                                                    <span>Stamina Curve</span>
                                                    <span className="text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">+12% vs last week</span>
                                                </div>
                                                <svg width="100%" height="150" viewBox="0 0 400 150" style={{ overflow: 'visible' }}>
                                                    <defs>
                                                        <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#ff8a65" stopOpacity="0.4" />
                                                            <stop offset="100%" stopColor="#ff8a65" stopOpacity="0" />
                                                        </linearGradient>
                                                    </defs>
                                                    {/* Area */}
                                                    <path d="M0,150 L0,100 C50,90 100,120 150,60 S250,30 300,50 S350,20 400,40 L400,150 Z" fill="url(#curveGradient)" />
                                                    {/* Line */}
                                                    <path d="M0,100 C50,90 100,120 150,60 S250,30 300,50 S350,20 400,40" fill="none" stroke="#ff5722" strokeWidth="3" strokeLinecap="round" />
                                                    {/* Points */}
                                                    <circle cx="150" cy="60" r="4" fill="#fff" stroke="#ff5722" strokeWidth="2" />
                                                    <circle cx="300" cy="50" r="4" fill="#fff" stroke="#ff5722" strokeWidth="2" />
                                                </svg>
                                            </div>

                                            <div className="flex gap-6">
                                                {/* Reaction Time - Ring Chart */}
                                                <div className="mock-card flex-1 flex flex-col items-center justify-center p-6">
                                                    <div className="mock-card-title w-full text-left">Reaction Time</div>
                                                    <div className="relative w-32 h-32">
                                                        <svg className="w-full h-full" viewBox="0 0 100 100">
                                                            <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                                                            <circle cx="50" cy="50" r="40" fill="none" stroke="#f97316" strokeWidth="10" strokeDasharray="251.2" strokeDashoffset="60" strokeLinecap="round" transform="rotate(-90 50 50)" />
                                                        </svg>
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                            <span className="text-3xl font-bold text-gray-900">45s</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-2">Avg per question</p>
                                                </div>

                                                {/* Distractor Analysis - Bar Charts */}
                                                <div className="mock-card flex-1">
                                                    <div className="mock-card-title">Distractor Analysis</div>
                                                    <div className="space-y-4 mt-2">
                                                        <div className="mock-distractor-item">
                                                            <div className="distractor-header">
                                                                <span>Algebra Logic</span>
                                                                <span className="text-red-500">High Risk</span>
                                                            </div>
                                                            <div className="distractor-bar-bg">
                                                                <div className="distractor-bar-fill fill-high" />
                                                            </div>
                                                        </div>
                                                        <div className="mock-distractor-item">
                                                            <div className="distractor-header">
                                                                <span>Physics Formulas</span>
                                                                <span className="text-amber-500">Medium</span>
                                                            </div>
                                                            <div className="distractor-bar-bg">
                                                                <div className="distractor-bar-fill fill-med" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Stats Column */}
                                        <div className="mock-col-right">
                                            <div className="mock-card bg-green-50 border-green-100">
                                                <div className="mock-card-title text-green-900">Total Practice</div>
                                                <div className="flex items-end gap-2">
                                                    <div className="mock-stat-value text-green-700">1,248</div>
                                                    <div className="mock-stat-trend trend-up mb-2">
                                                        <span>↗</span> 12%
                                                    </div>
                                                </div>
                                                <div className="text-xs text-green-500 mt-1">Questions Attempted</div>
                                            </div>

                                            {/* New Mock Card: Recent Sprints */}
                                            <div className="mock-card">
                                                <div className="mock-card-title">Recent Sprints</div>
                                                <div className="mock-activity-row">
                                                    <div className="flex items-center gap-3">
                                                        <div className="mock-activity-icon bg-green-100 text-green-700">P</div>
                                                        <div>
                                                            <div className="text-xs font-bold text-gray-800">Physics: Kinematics</div>
                                                            <div className="text-xs text-gray-400">10m ago</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs font-bold text-green-600">92%</div>
                                                </div>
                                                <div className="mock-activity-row mock-activity-row-last">
                                                    <div className="flex items-center gap-3">
                                                        <div className="mock-activity-icon bg-red-100 text-red-700">M</div>
                                                        <div>
                                                            <div className="text-xs font-bold text-gray-800">Math: Calculus</div>
                                                            <div className="text-xs text-gray-400">2h ago</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs font-bold text-red-600">45%</div>
                                                </div>
                                            </div>
                                            <div className="mock-card bg-blue-50 border-blue-100">
                                                <div className="mock-card-title text-blue-900">Accuracy Rate</div>
                                                <div className="flex items-end gap-2">
                                                    <div className="mock-stat-value text-blue-700">92%</div>
                                                    <div className="mock-stat-trend trend-up mb-2">
                                                        <span>↗</span> 5%
                                                    </div>
                                                </div>
                                                <div className="text-xs text-blue-400 mt-1">Top 5% of students</div>
                                            </div>
                                            <div className="mock-card">
                                                <div className="mock-card-title flex items-center gap-2">
                                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-yellow-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                    AI Insight
                                                </div>
                                                <div className="text-xs text-gray-500 leading-relaxed">
                                                    Your geometry speed is improving, but <strong>Algebra</strong> needs attention. Try a 5-min sprint.
                                                </div>
                                            </div>

                                            {/* New Mock Card: Weakness Radar */}
                                            <div className="mock-card">
                                                <div className="mock-card-title">Topic Radar</div>
                                                <div className="mock-radar-container">
                                                    <div className="mock-radar-shape"></div>
                                                    {/* Labels */}
                                                    <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[0.6rem] text-gray-400">MATH</div>
                                                    <div className="absolute bottom-1 right-2 text-[0.6rem] text-gray-400">PHY</div>
                                                    <div className="absolute bottom-1 left-2 text-[0.6rem] text-gray-400">CHEM</div>
                                                </div>
                                                <div className="mt-3 text-center">
                                                    <div className="text-xs font-bold text-gray-800">Focus: Rotational Motion</div>
                                                    <div className="text-xs text-red-500 mt-1">Low Confidence</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fade Mask */}
                                    <div className="dashboard-fade-mask" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Dashboard Preview - Realistic Phone Mockup */}
                    <div className="mobile-dashboard-preview mobile-only">
                        <div className="css-phone-device">
                            <div className="phone-buttons-left"></div>
                            <div className="phone-button-right"></div>
                            <div className="phone-bezel">
                                <div className="phone-screen">
                                    <div className="dynamic-island"></div>

                                    {/* Screen Content */}
                                    <div className="phone-content-scroll custom-dashboard">
                                        {/* 1. Header */}
                                        <div className="dash-header">
                                            <div className="dash-user">
                                                <div className="dash-avatar">
                                                    <img src="/logo.png" alt="User" /> {/* Temporarily using logo as avatar placeholder if external fails */}
                                                </div>
                                                <div className="dash-greeting">
                                                    <span className="text-gray-500 text-xs">Hello</span>
                                                    <span className="font-bold text-sm text-gray-800">Samantha</span>
                                                </div>
                                            </div>
                                            <div className="dash-notif">
                                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                            </div>
                                        </div>

                                        {/* 2. Headline */}
                                        <h3 className="dash-headline">
                                            Here's your prep<br />at a glance
                                        </h3>

                                        {/* 3. Two Column Stats */}
                                        <div className="dash-grid-row">
                                            {/* Card 1: Questions (Blue/Cyan theme) */}
                                            <div className="dash-card dash-card-blue">
                                                <div className="dash-card-header">
                                                    <div className="dash-icon-circle">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
                                                    </div>
                                                    <div className="dash-stat-text">
                                                        <span className="dash-stat-val">1,248</span>
                                                        <span className="dash-stat-label">Questions</span>
                                                    </div>
                                                </div>
                                                {/* Mock Bar Chart Visual */}
                                                <div className="dash-visual-bars">
                                                    <div className="d-bar h-40"></div>
                                                    <div className="d-bar h-60"></div>
                                                    <div className="d-bar h-30"></div>
                                                    <div className="d-bar h-80"></div>
                                                    <div className="d-bar h-50"></div>
                                                    <div className="d-bar h-20"></div>
                                                </div>
                                            </div>

                                            {/* Card 2: Accuracy (Purple theme) */}
                                            <div className="dash-card dash-card-purple">
                                                <div className="dash-card-header">
                                                    <div className="dash-icon-circle">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"></circle></svg>
                                                    </div>
                                                    <div className="dash-stat-text">
                                                        <span className="dash-stat-val">92%</span>
                                                        <span className="dash-stat-label">Accuracy</span>
                                                    </div>
                                                </div>
                                                {/* Mock Wave Visual */}
                                                <div className="dash-visual-wave">
                                                    <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                                                        <path d="M0,30 Q25,10 50,25 T100,15 V40 H0 Z" fill="rgba(255,255,255,0.3)" />
                                                        <path d="M0,35 Q25,20 50,30 T100,25 V40 H0 Z" fill="rgba(255,255,255,0.5)" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4. Wide Card: Time/Activity (Green theme) */}
                                        <div className="dash-card dash-card-green">
                                            <div className="dash-card-header mb-2">
                                                <div className="dash-icon-circle">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                </div>
                                                <div className="dash-stat-text">
                                                    <span className="dash-stat-val">9h 30m</span>
                                                    <span className="dash-stat-label">Total Practice</span>
                                                </div>
                                            </div>
                                            {/* Mock Histogram */}
                                            <div className="dash-visual-histogram">
                                                <div className="h-bar bg-green-200 h-30"></div>
                                                <div className="h-bar bg-green-300 h-40"></div>
                                                <div className="h-bar bg-green-200 h-35"></div>
                                                <div className="h-bar bg-green-400 h-60"></div>
                                                <div className="h-bar bg-gray-800 h-80"></div> {/* Active/Current */}
                                                <div className="h-bar bg-green-300 h-50"></div>
                                                <div className="h-bar bg-green-200 h-40"></div>
                                            </div>
                                            <div className="dash-histogram-labels">
                                                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                                            </div>
                                        </div>

                                        {/* 5. Recommendation List */}
                                        <div className="dash-section-title">
                                            <span>Daily recommendations</span>
                                            <span className="text-gray-400 text-xs cursor-pointer">See all</span>
                                        </div>
                                        <div className="dash-list-card">
                                            <div className="dash-list-icon">
                                                💧
                                            </div>
                                            <div className="dash-list-content">
                                                <div className="font-bold text-sm text-gray-900">Rotational Motion</div>
                                                <div className="text-xs text-gray-500">Physics • High Importance</div>
                                            </div>
                                            <div className="dash-list-arrow">›</div>
                                        </div>

                                        {/* 6. Bottom Nav Bar */}
                                        <div className="dash-bottom-nav">
                                            <div className="nav-item active">
                                                <div className="nav-icon-bg">Home</div>
                                            </div>
                                            <div className="nav-item">Stats</div>
                                            <div className="nav-item">Tests</div>
                                            <div className="nav-item">Profile</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Trust Section - Floating Glass Cards */}
                <div className="trust-section">
                    <span className="trust-title">Built After Discussing with India's Brightest Minds</span>
                    <div className="trust-cards-container">
                        <div className="trust-card">
                            <div className="trust-icon-wrapper">
                                🎓
                            </div>
                            <div className="trust-role">IIT Alumni</div>
                            <div className="trust-desc">Curating questions that develop deep logic.</div>
                        </div>
                        <div className="trust-card">
                            <div className="trust-icon-wrapper">
                                🏛️
                            </div>
                            <div className="trust-role">Top Deans</div>
                            <div className="trust-desc">Structuring tests to mimic real exam pressure.</div>
                        </div>
                        <div className="trust-card">
                            <div className="trust-icon-wrapper">
                                🏆
                            </div>
                            <div className="trust-role">Top Rankers</div>
                            <div className="trust-desc">Sharing the "speed hacks" that got them AIR 1.</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mindmap Narrative Section */}
            <MindmapSection />

            {/* Bento Grid Features Section */}
            <BentoSection />

            {/* Final Unified Section (Nietzsche Style) */}
            <section className="nietzsche-section" id="waitlist-form-area">
                <div className="nietzsche-container">

                    {/* Top: Gradient CTA */}
                    <div className="nietzsche-cta">
                        <h2 className="nietzsche-title">Ready to Take Control<br />of Your Rank?</h2>
                        <p className="nietzsche-subtitle">
                            Get expert speed training, weakness detection, and pattern recognition — all from the comfort of home, no coaching factory needed.
                        </p>
                        <div className="nietzsche-actions">
                            {/* Form with full width allowed */}
                            <DetailedWaitlistForm />
                        </div>
                    </div>

                    {/* Bottom: White Footer Dock - Simplified (Brand Only) */}
                    <div className="nietzsche-footer">
                        <div className="footer-content">
                            <img src="/logo.png" alt="Drut" style={{ height: '150px' }} />
                            <div className="footer-copyright">© 2025 Drut Learning Technologies.</div>
                        </div>
                    </div>

                </div>
            </section>
        </div>
    );
};

/* --- Mindmap Section --- */
const MindmapSection = () => {
    const sectionRef = useRef<HTMLElement>(null);
    const nodesRef = useRef<(HTMLDivElement | null)[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);

    const nodes = [
        {
            title: "The Problem Space",
            desc: "Speed is the #1 reason students fail. Accuracy collapses under pressure.",
            details: ["Existing apps teach content, not reflexes", "High cognitive load slows decision making", "Students can't measure speed improvement"]
        },
        {
            title: "First Principles",
            desc: "How does the brain identify patterns when reducing time-to-decision?",
            details: ["What makes toppers solve fast?", "Reflex over repetition", "Pattern recognition velocity"]
        },
        {
            title: "Research Inputs",
            desc: "Interviews with IIT toppers, university deans, and serious aspirants.",
            details: ["Competitive exam pattern analysis", "Breakdown of top coaching systems", "Real exam timing data study"]
        },
        {
            title: "Product Hypothesis",
            desc: "Speed is a trainable skill. Reflex > Concept > Memorization.",
            details: ["Reps matter more than syllabus breadth", "Improvement must be measurable", "Feedback must be instant"]
        },
        {
            title: "Drut Core Design",
            desc: "Fastest Safe Method. Sprint Mode. Weakness Detection.",
            details: ["Analytics as proof of improvement", "Low cognitive burden UI", "Targeted speed training"]
        },
        {
            title: "Outcome Promise",
            desc: "Measurable speed gain in 30 days. Reduced time-to-solve by 20-40%.",
            details: ["Calm decision making under pressure", "High accuracy at high speed", "Scientific validation"]
        }
    ];

    useEffect(() => {
        const handleScroll = () => {
            if (!sectionRef.current) return;

            const { scrollY, innerHeight } = window;
            const sectionTop = sectionRef.current.offsetTop;
            const sectionHeight = sectionRef.current.offsetHeight;
            const scrollBottom = scrollY + innerHeight * 0.6; // Trigger point slightly below center

            // 1. Calculate Spine Growth
            // Start growing when section top hits middle of screen
            let relativeScroll = scrollBottom - sectionTop;

            // Clamp value
            if (relativeScroll < 0) relativeScroll = 0;
            if (relativeScroll > sectionHeight) relativeScroll = sectionHeight;

            // Update CSS variable for spine height
            const spineLine = sectionRef.current.querySelector('.neural-spine-line') as HTMLElement;
            if (spineLine) {
                spineLine.style.height = `${relativeScroll}px`;
            }

            // 2. Activate Nodes
            nodesRef.current.forEach((node, index) => {
                if (node) {
                    const nodeTop = node.offsetTop;
                    // Activate when spine passes the node's connection point (approx middle of node)
                    if (relativeScroll > nodeTop + 100) {
                        node.classList.add('active');
                    } else {
                        node.classList.remove('active');
                    }
                }
            });
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section className="mindmap-section" ref={sectionRef}>
            <div className="mindmap-header">
                <div className="trust-title" style={{ marginBottom: '1rem' }}>Built from First Principles</div>
                <h2 className="section-title">How we rethought exam<br />preparation from scratch.</h2>
                <p className="section-subtitle">
                    To solve the real problem behind exam pressure — speed — we collaborated with IIT graduates, top university faculty, and hundreds of serious aspirants.
                </p>
            </div>

            <div className="mindmap-container">
                {/* The Central Neural Spine */}
                <div className="neural-spine">
                    <div className="neural-spine-line">
                        <div className="photon-beam" />
                    </div>
                </div>

                <div className="mindmap-nodes">
                    {nodes.map((node, i) => (
                        <div
                            key={i}
                            className={`mindmap-node-row ${i % 2 === 0 ? 'left' : 'right'}`}
                            ref={el => nodesRef.current[i] = el}
                        >
                            <div className="node-content-wrapper">
                                <div className="mindmap-card glass-panel">
                                    <div className="node-number">0{i + 1}</div>
                                    <h3 className="node-title">{node.title}</h3>
                                    <p className="node-desc">{node.desc}</p>
                                    <ul className="node-details">
                                        {node.details.map((detail, idx) => (
                                            <li key={idx}>{detail}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="node-connector">
                                <div className="connector-dot" />
                                <div className="connector-line" />
                            </div>
                            <div className="empty-space" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const BentoSection = () => {
    const scrollToWaitlist = () => {
        document.getElementById('waitlist-form-area')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section className="bento-section">
            <div className="bento-container">
                <div className="bento-grid">
                    {/* Card 1: Main CTA (Top Left) */}
                    <div className="bento-card bg-gradient bento-card-span-2">
                        <div className="cta-card-content">
                            <div className="bento-new-badge">
                                NEW
                            </div>
                            <h3 className="bento-title">Unlock your full potential.</h3>
                            <p className="bento-text">
                                Drut remembers your weak spots and adapts every session to maximize your score. Never forget a formula again.
                            </p>
                            <button className="bento-btn" onClick={scrollToWaitlist}>
                                Join the waitlist
                            </button>
                            <div className="bento-avatar-row">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => <div key={i} className="avatar-placeholder" />)}
                                </div>
                                <span className="text-sm font-medium">2,400+ students waiting</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: AI Analysis (Top Middle) */}
                    <div className="bento-card bg-green">
                        <div className="flex flex-col h-full">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4 text-green-600 shadow-sm">
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <h4 className="text-xl font-bold mb-2">Instant AI Analysis</h4>
                            <p className="text-sm text-gray-500 mb-4">Get real-time feedback on why you missed a question.</p>
                            <div className="feature-mock-ui">
                                <div className="flex gap-2 items-center">
                                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                    <div className="h-2 bg-gray-100 rounded w-full"></div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">"You rushed the calculation."</div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Any Device (Top Right) */}
                    <div className="bento-card">
                        <div className="flex flex-col h-full items-center text-center">
                            <h4 className="text-lg font-bold mb-2">Practice Anywhere</h4>
                            <p className="text-sm text-gray-500 mb-4">Seamlessly sync across phone, tablet, and desktop.</p>
                            <div className="mt-auto relative w-full h-32 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden">
                                <div className="absolute bottom-[-20px] w-24 h-40 bg-white border border-gray-200 rounded-xl shadow-lg"></div>
                                <div className="absolute bottom-[-10px] right-4 w-32 h-24 bg-white border border-gray-200 rounded-xl shadow-lg z-10"></div>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Study Planner (Bottom Middle) */}
                    <div className="bento-card">
                        <div className="flex flex-col h-full">
                            <h4 className="text-lg font-bold mb-2">Smart Schedule</h4>
                            <p className="text-sm text-gray-500 mb-4">We plan your sprints so you don't burn out.</p>
                            <div className="feature-mock-ui flex justify-between items-center">
                                <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Mon</div>
                                <div className="h-1 bg-gray-200 flex-1 mx-2 rounded"></div>
                                <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Fri</div>
                            </div>
                        </div>
                    </div>

                    {/* Card 5: Gamification (Bottom Right) */}
                    <div className="bento-card bg-gradient">
                        <div className="flex flex-col h-full">
                            <h4 className="text-lg font-bold mb-2">Beat Your Best</h4>
                            <p className="text-sm text-gray-500 mb-4">Stamina curves that motivate you to push harder.</p>
                            <div className="mt-auto">
                                <div className="flex items-end gap-1 h-16 justify-center">
                                    <div className="w-3 bg-red-200 rounded-t h-8"></div>
                                    <div className="w-3 bg-red-300 rounded-t h-12"></div>
                                    <div className="w-3 bg-red-400 rounded-t h-10"></div>
                                    <div className="w-3 bg-red-500 rounded-t h-16"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

/* --- Hero Email Form (Quick Waitlist) --- */
const HeroEmailForm = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        setError('');
        try {
            // Insert into waitlist table
            const { error: insertError } = await supabase
                .from('waitlist')
                .insert([{ email, source: 'hero_quick' }]);

            if (insertError) {
                console.error('Supabase insert error:', insertError);
                setError('Failed to join. Please try again.');
            } else {
                setSuccess(true);
                setEmail('');
            }
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="hero-cta-wrapper">
                <div className="hero-success-badge">
                    ✓ You're on the list!
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="hero-cta-wrapper hero-inline-form">
            <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="hero-email-input"
            />
            <button type="submit" className="hero-submit-btn" disabled={loading}>
                {loading ? '...' : 'Join Waitlist'}
            </button>
            {error && <span className="hero-error-msg">{error}</span>}
        </form>
    );
};

// Detailed Form Component - Wide Layout
const DetailedWaitlistForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'Student',
        exam: 'JEE',
        painPoint: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [customerId, setCustomerId] = useState('');

    const generateCustomerId = () => `DRUT-${Math.floor(1000 + Math.random() * 9000)}`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const newId = generateCustomerId();

            // Trigger Edge Function
            const { error } = await supabase.functions.invoke('send-waitlist-email', {
                body: { ...formData, customerId: newId }
            });

            if (!error) {
                setCustomerId(newId);
                setSubmitted(true);
            } else {
                console.error("Function error:", error);
                setCustomerId(newId);
                setSubmitted(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="wide-success-container">
                <div className="success-icon">🎉</div>
                <h3>Message Received!</h3>
                <p>Thanks <strong>{formData.name}</strong>. We'll be in touch shortly.</p>
                <div className="id-badge">ID: {customerId}</div>
            </div>
        );
    }

    return (
        <div className="wide-form-container">
            <div className="wide-form-header">
                <h3>Love to hear from you,<br />Get in touch <span style={{ fontSize: '1.2em' }}>👋</span></h3>
            </div>

            <form onSubmit={handleSubmit} className="wide-form-grid">
                {/* Left Column: Inputs */}
                <div className="wide-form-left">
                    <div className="form-group">
                        <label>Your name</label>
                        <input
                            name="name"
                            type="text"
                            placeholder="Edward Snowden"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className="minimal-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Your email</label>
                        <input
                            name="email"
                            type="email"
                            placeholder="example@gmail.com"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="minimal-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>I am a...</label>
                        <select name="role" value={formData.role} onChange={handleChange} className="minimal-input">
                            <option value="Student">Student</option>
                            <option value="Parent">Parent</option>
                            <option value="Educator">Educator</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Target Exam</label>
                        <select name="exam" value={formData.exam} onChange={handleChange} className="minimal-input">
                            <option value="JEE">JEE Mains/Adv</option>
                            <option value="NEET">NEET</option>
                            <option value="CAT">CAT / MBA</option>
                            <option value="UPSC">UPSC / Govt</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <button type="submit" className="wide-black-btn" disabled={loading}>
                        {loading ? 'Sending...' : 'Just Send ↗'}
                    </button>
                </div>

                {/* Right Column: Message */}
                <div className="wide-form-right">
                    <div className="form-group full-height">
                        <label>Message</label>
                        <textarea
                            name="painPoint"
                            placeholder="Let us know your project about (or what slows you down)..."
                            value={formData.painPoint}
                            onChange={handleChange}
                            className="minimal-input full-textarea"
                        ></textarea>
                    </div>
                </div>
            </form>
        </div>
    );
};
