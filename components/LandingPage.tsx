import React from 'react';
import { Button } from './ui/Button';
import { AppleIcon, BoltIcon, BrainCircuitIcon, DrutIcon, PlayCircleIcon, ShieldCheckIcon, StarIcon } from './icons/Icons';
import { EXAM_PROFILES } from '../constants';

interface LandingPageProps {
  onGetStarted: () => void;
}

// --- Components ---

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mb-6">
    {children}
  </span>
);

const GradientText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
    {children}
  </span>
);

// --- Sections ---

const LandingHeader: React.FC<LandingPageProps> = ({ onGetStarted }) => (
  <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
    <div className="container mx-auto px-6 h-20 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="bg-purple-600 p-1.5 rounded-lg">
          <DrutIcon className="h-6 w-6 text-white" />
        </div>
        <span className="font-bold text-xl text-gray-900 tracking-tight">Drut</span>
      </div>

      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
        <a href="#features" className="hover:text-purple-600 transition-colors">Features</a>
        <a href="#exams" className="hover:text-purple-600 transition-colors">Exams</a>
        <a href="#pricing" className="hover:text-purple-600 transition-colors">Pricing</a>
        <a href="#blog" className="hover:text-purple-600 transition-colors">Blog</a>
      </nav>

      <div className="flex items-center gap-4">
        <Button onClick={onGetStarted} variant='ghost' className="hidden md:flex text-gray-600 font-semibold hover:text-purple-600">
          Sign In
        </Button>
        <Button onClick={onGetStarted} className="bg-purple-600 text-white hover:bg-purple-700 px-6 py-2.5 rounded-full font-semibold shadow-lg shadow-purple-200 transition-all hover:scale-105">
          Get Started
        </Button>
      </div>
    </div>
  </header>
);

const HeroSection: React.FC<LandingPageProps> = ({ onGetStarted }) => (
  <section className="relative pt-20 pb-32 overflow-hidden">
    {/* Background Blobs */}
    <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-purple-100/50 rounded-full blur-3xl -z-10" />
    <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-pink-100/50 rounded-full blur-3xl -z-10" />

    <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
      {/* Left Content */}
      <div className="max-w-2xl">
        <Badge>#1 AI Exam Prep</Badge>
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-[1.1] mb-6">
          Grow your <GradientText>exam score</GradientText> with AI.
        </h1>
        <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
          The right tool to help you reach your dream college. Personalized practice, smart analytics, and instant feedback for CAT, JEE, and EAMCET.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={onGetStarted} className="h-14 px-8 rounded-full bg-purple-600 text-white font-bold text-lg shadow-xl shadow-purple-200 hover:bg-purple-700 transition-transform hover:-translate-y-1">
            Get Started - Free Try
          </Button>
          <Button variant="ghost" className="h-14 px-8 rounded-full text-gray-600 font-semibold hover:bg-purple-50">
            <PlayCircleIcon className="h-5 w-5 mr-2" />
            Watch Demo
          </Button>
        </div>

        <div className="mt-12 flex items-center gap-4 text-sm font-medium text-gray-500">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs overflow-hidden">
                <img src={`https://i.pravatar.cc/100?img=${10 + i}`} alt="User" />
              </div>
            ))}
          </div>
          <p>Trusted by 10,000+ students</p>
        </div>
      </div>

      {/* Right Visual (Mockup) */}
      <div className="relative lg:h-[600px] flex items-center justify-center">
        {/* Floating Cards Composition */}
        <div className="relative w-full max-w-lg aspect-square">
          {/* Main Card */}
          <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl shadow-purple-100 border border-gray-100 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-sm text-gray-500">Total Questions</p>
                <p className="text-3xl font-bold text-gray-900">1,248</p>
              </div>
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">+24%</div>
            </div>
            {/* Mock Chart */}
            <div className="flex-grow flex items-end justify-between gap-2 px-2">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="w-full bg-purple-100 rounded-t-lg relative group">
                  <div className="absolute bottom-0 left-0 right-0 bg-purple-500 rounded-t-lg transition-all duration-1000" style={{ height: `${h}%` }}></div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating Card 1 (Top Right) */}
          <div className="absolute -top-12 -right-12 bg-white p-4 rounded-2xl shadow-xl shadow-purple-100 border border-gray-100 w-48 animate-bounce-slow">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center">
                <BoltIcon className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Daily Streak</p>
                <p className="text-lg font-bold text-gray-900">12 Days</p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-pink-500 w-[80%]"></div>
            </div>
          </div>

          {/* Floating Card 2 (Bottom Left) */}
          <div className="absolute -bottom-8 -left-8 bg-white p-4 rounded-2xl shadow-xl shadow-purple-100 border border-gray-100 w-56 animate-pulse-slow">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold text-gray-500">Accuracy</p>
              <p className="text-xs font-bold text-purple-600">85%</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 w-[85%]"></div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Top 5% of students</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const FeaturesSection: React.FC<LandingPageProps> = ({ onGetStarted }) => (
  <section id="features" className="py-24 bg-gray-50/50">
    <div className="container mx-auto px-6">
      <div className="text-center max-w-2xl mx-auto mb-20">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Tracking <GradientText>progress</GradientText> made simple.
        </h2>
        <p className="text-gray-600 text-lg">
          Track your content's performance from one, intuitive analytics dashboard.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Feature 1 */}
        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-purple-100/50 border border-gray-100 hover:shadow-2xl hover:shadow-purple-100 transition-all duration-300 group">
          <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <BrainCircuitIcon className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Smart Question Bank</h3>
          <p className="text-gray-600 mb-8">
            See how well you perform against similar students. Our AI adapts to your learning style.
          </p>
          {/* Mockup */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-8 w-8 rounded-full bg-white border border-gray-200"></div>
              <div className="h-2 w-24 bg-gray-200 rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full bg-gray-200 rounded-full"></div>
              <div className="h-2 w-[80%] bg-gray-200 rounded-full"></div>
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-8 w-20 bg-purple-600 rounded-lg"></div>
              <div className="h-8 w-20 bg-white border border-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-purple-100/50 border border-gray-100 hover:shadow-2xl hover:shadow-purple-100 transition-all duration-300 group">
          <div className="h-12 w-12 bg-pink-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <ShieldCheckIcon className="h-6 w-6 text-pink-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Weakness Detection</h3>
          <p className="text-gray-600 mb-8">
            Identify your weak areas instantly. We analyze every answer to find gaps in your knowledge.
          </p>
          {/* Mockup */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex items-end justify-around h-40">
            {[30, 50, 20, 60, 40].map((h, i) => (
              <div key={i} className="w-8 bg-pink-200 rounded-t-md relative">
                <div className="absolute bottom-0 w-full bg-pink-500 rounded-t-md" style={{ height: `${h}%` }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Width Feature */}
      <div className="mt-8 bg-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-purple-100/50 border border-gray-100 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
            <BoltIcon className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Surface results in <span className="text-indigo-600">real-time</span>
          </h3>
          <p className="text-gray-600 mb-8 text-lg">
            Is your preparation getting better or worse? Track and manage your performance in one-click!
          </p>
          <Button onClick={onGetStarted} variant="ghost" className="text-indigo-600 font-bold hover:bg-indigo-50 px-6 py-3 rounded-full">
            Explore all features →
          </Button>
        </div>
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-xs text-gray-500">Current Session</p>
              <p className="text-xl font-bold text-gray-900">Sprint Mode</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <BoltIcon className="h-4 w-4 text-indigo-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500">Speed</p>
              <p className="text-lg font-bold text-gray-900">45s<span className="text-xs text-gray-400 font-normal">/q</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500">Accuracy</p>
              <p className="text-lg font-bold text-green-600">92%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const DashboardPreviewSection: React.FC = () => (
  <section className="py-24 overflow-hidden">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
        One <GradientText>dashboard</GradientText> for all your exams
      </h2>
      <p className="text-gray-600 max-w-2xl mx-auto mb-16 text-lg">
        CAT, JEE, EAMCET — track performance for all your competitive exams from one, intuitive analytics dashboard.
      </p>

      <div className="relative max-w-5xl mx-auto">
        {/* Dashboard Mockup Container */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-purple-200/50 border border-gray-200 p-2 md:p-4">
          <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-[16/9] relative flex">
            {/* Sidebar Mock */}
            <div className="w-16 md:w-64 bg-white border-r border-gray-200 hidden md:flex flex-col p-6 gap-6">
              <div className="h-8 w-24 bg-gray-200 rounded-md mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-purple-100 rounded-md"></div>
                <div className="h-4 w-[80%] bg-gray-100 rounded-md"></div>
                <div className="h-4 w-[90%] bg-gray-100 rounded-md"></div>
              </div>
            </div>
            {/* Main Content Mock */}
            <div className="flex-grow p-6 md:p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="h-8 w-48 bg-gray-200 rounded-md"></div>
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="h-32 bg-white rounded-xl shadow-sm border border-gray-100"></div>
                <div className="h-32 bg-white rounded-xl shadow-sm border border-gray-100"></div>
                <div className="h-32 bg-white rounded-xl shadow-sm border border-gray-100"></div>
              </div>
              <div className="h-64 bg-white rounded-xl shadow-sm border border-gray-100 flex items-end justify-between p-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="w-full bg-purple-100 rounded-t-md" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements for Depth */}
        <div className="absolute -left-12 bottom-20 bg-white p-4 rounded-2xl shadow-xl shadow-pink-100 border border-gray-100 hidden lg:block animate-bounce-slow">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-pink-100 rounded-full flex items-center justify-center">
              <StarIcon className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">New Achievement</p>
              <p className="font-bold text-gray-900">Algebra Master</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer className="bg-white border-t border-gray-100 pt-20 pb-10">
    <div className="container mx-auto px-6">
      <div className="grid md:grid-cols-4 gap-12 mb-16">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-purple-600 p-1.5 rounded-lg">
              <DrutIcon className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">Drut</span>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            Empowering students with AI-driven tools to conquer competitive exams.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-gray-900 mb-6">Product</h4>
          <ul className="space-y-4 text-sm text-gray-500">
            <li><a href="#" className="hover:text-purple-600">Features</a></li>
            <li><a href="#" className="hover:text-purple-600">Pricing</a></li>
            <li><a href="#" className="hover:text-purple-600">Sprint Mode</a></li>
            <li><a href="#" className="hover:text-purple-600">Analytics</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-gray-900 mb-6">Resources</h4>
          <ul className="space-y-4 text-sm text-gray-500">
            <li><a href="#" className="hover:text-purple-600">Blog</a></li>
            <li><a href="#" className="hover:text-purple-600">Study Guides</a></li>
            <li><a href="#" className="hover:text-purple-600">Exam Updates</a></li>
            <li><a href="#" className="hover:text-purple-600">Community</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-gray-900 mb-6">Company</h4>
          <ul className="space-y-4 text-sm text-gray-500">
            <li><a href="#" className="hover:text-purple-600">About Us</a></li>
            <li><a href="#" className="hover:text-purple-600">Careers</a></li>
            <li><a href="#" className="hover:text-purple-600">Contact</a></li>
            <li><a href="#" className="hover:text-purple-600">Privacy</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-gray-400">© {new Date().getFullYear()} Drut Inc. All rights reserved.</p>
        <div className="flex gap-6">
          {/* Social Icons Placeholders */}
          <div className="h-5 w-5 bg-gray-200 rounded-full hover:bg-purple-600 transition-colors cursor-pointer"></div>
          <div className="h-5 w-5 bg-gray-200 rounded-full hover:bg-purple-600 transition-colors cursor-pointer"></div>
          <div className="h-5 w-5 bg-gray-200 rounded-full hover:bg-purple-600 transition-colors cursor-pointer"></div>
        </div>
      </div>
    </div>
  </footer>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="bg-white font-sans text-slate-900 selection:bg-purple-100 selection:text-purple-900">
      <LandingHeader onGetStarted={onGetStarted} />
      <main>
        <HeroSection onGetStarted={onGetStarted} />
        <FeaturesSection onGetStarted={onGetStarted} />
        <DashboardPreviewSection />
        <section className="py-24 bg-purple-600 text-white text-center">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-5xl font-bold mb-8">Ready to ace your exams?</h2>
            <p className="text-purple-100 text-lg mb-10 max-w-2xl mx-auto">
              Join thousands of students who are improving their scores with Drut.
            </p>
            <Button onClick={onGetStarted} className="bg-white text-purple-600 hover:bg-gray-100 px-10 py-4 rounded-full font-bold text-lg shadow-xl transition-transform hover:-translate-y-1">
              Get Started Now
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};