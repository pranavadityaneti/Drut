
import React from 'react';
import { Button } from './ui/Button';
import { AppleIcon, BoltIcon, BrainCircuitIcon, PayMeIcon, PlayCircleIcon, PlayStoreIcon, ShieldCheckIcon, StarIcon } from './icons/Icons';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingHeader: React.FC<LandingPageProps> = ({ onGetStarted }) => (
  <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
    <div className="container mx-auto px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <PayMeIcon className="h-8 w-8 text-pay-green-dark" />
        <span className="font-bold text-xl text-pay-black">PayMe App</span>
      </div>
      <nav className="hidden md:flex items-center gap-8 text-pay-gray font-medium">
        <a href="#" className="hover:text-pay-black transition-colors">Home</a>
        <a href="#" className="hover:text-pay-black transition-colors">About</a>
        <a href="#" className="hover:text-pay-black transition-colors">Features</a>
        <a href="#" className="hover:text-pay-black transition-colors">Pricing</a>
      </nav>
      <div className='hidden md:flex items-center gap-2'>
        <Button onClick={onGetStarted} variant='ghost' className="text-pay-gray font-bold">
            Sign In
        </Button>
        <Button onClick={onGetStarted} className="bg-pay-black text-white hover:bg-pay-black/90 items-center gap-2 px-5 py-2.5 rounded-full">
            <span>Get Started</span>
        </Button>
      </div>
       <Button onClick={onGetStarted} variant="ghost" size="sm" className="md:hidden">
        Sign In
      </Button>
    </div>
  </header>
);

const HeroSection: React.FC<LandingPageProps> = ({ onGetStarted }) => (
  <section className="relative container mx-auto px-6 pt-24 pb-12 md:pt-32 md:pb-20 text-center overflow-hidden">
     <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[120%] bg-white"
        style={{
            backgroundImage: 'radial-gradient(rgb(229 231 235 / 0.5) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            zIndex: -1,
        }}>
    </div>
    <div className="inline-block bg-pay-green-light text-pay-green-dark font-semibold px-4 py-1 rounded-full text-sm mb-4">
      AI-POWERED, PERSONALIZED, EFFECTIVE
    </div>
    <h1 className="text-4xl md:text-6xl font-extrabold text-pay-black max-w-4xl mx-auto leading-tight">
      Master Your Competitive Exams with AI-Powered Practice
    </h1>
    <p className="max-w-2xl mx-auto mt-6 text-lg text-pay-gray">
      The smartest way to prepare for CAT, JEE Main, and EAMCET. Get personalized questions, detailed solutions, and performance analytics to conquer your goals.
    </p>
    <div className="mt-8 flex justify-center items-center gap-4">
      <Button onClick={onGetStarted} size="default" className="bg-pay-green-medium text-pay-green-dark font-bold hover:bg-pay-green-medium/90 items-center gap-2 px-6 h-12 rounded-full text-base">
        <span>Get Started Free</span>
      </Button>
      <Button variant="ghost" className="items-center gap-2 text-pay-gray font-bold h-12 rounded-full text-base">
        <PlayCircleIcon className="h-6 w-6" />
        <span>Watch Demo</span>
      </Button>
    </div>
    <div className="mt-6 flex justify-center items-center gap-2">
        <div className="flex -space-x-2">
            <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
            <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1550525811-e586910b323f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
            <img className="inline-block h-8 w-8 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
        </div>
        <span className="text-sm text-pay-gray font-medium">Trusted by 3k+ Aspirants Globally</span>
    </div>
    <div className="relative mt-12 h-[400px] md:h-[500px]">
        <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 500 500" className="w-full h-full">
                <circle cx="250" cy="250" r="240" fill="#D9F9E5" />
                <path d="M250 150 a 50 50 0 1 1 0 100 a 50 50 0 1 1 0 -100" fill="#A0E6BB" />
                <path d="M200 250 a 100 150 0 0 1 100 0 l 20 150 h -140 z" fill="#F3F4F6" />
                <path d="M230 400 l -10 20 a 10 10 0 0 0 10 10 h 40 a 10 10 0 0 0 10 -10 l -10 -20 z" fill="#E5E7EB" />
                 <path d="M300 300 a 30 50 0 0 1 20 40 l -10 50 h -15 l 10 -60 z" fill="#D1D5DB" />
            </svg>
        </div>
        <div className="absolute top-1/2 left-[10%] md:left-[20%] -translate-y-[80%] bg-white p-3 rounded-xl shadow-lg flex items-center gap-2">
            <BrainCircuitIcon className="h-6 w-6 text-pay-green-dark" />
            <div>
                <p className="text-xs text-pay-gray">Powered by</p>
                <p className="font-bold text-sm text-pay-black">Advanced AI Engine</p>
            </div>
        </div>
        <div className="absolute top-1/2 right-[10%] md:right-[20%] translate-y-1/2 bg-white p-3 rounded-xl shadow-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div>
                <p className="text-xs text-yellow-400">★★★★★</p>
                <p className="font-bold text-sm text-pay-black">Top-rated by students</p>
            </div>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white p-3 rounded-xl shadow-lg w-56">
            <p className="text-xs text-pay-gray">Daily Progress</p>
            <p className="text-xl font-bold text-pay-black">85% Accuracy</p>
            <div className="flex justify-between mt-2 text-xs font-medium">
                <a href="#" className="text-blue-600">→ Practice More</a>
                <a href="#" className="text-blue-600">⤸ View Analytics</a>
            </div>
        </div>
    </div>
  </section>
);


const PartnersSection: React.FC = () => (
    <section className="py-12 bg-white">
        <div className="container mx-auto px-6">
            <h3 className="text-center text-sm font-bold text-pay-gray tracking-widest mb-8">
                SUPPORTING TOP EXAMS
            </h3>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
                <div className="text-2xl font-bold text-gray-400 tracking-wider">CAT</div>
                <div className="text-2xl font-bold text-gray-400 tracking-wider">JEE MAIN</div>
                <div className="text-2xl font-bold text-gray-400 tracking-wider">EAMCET</div>
                <div className="text-2xl font-bold text-gray-400 tracking-wider">BITSAT</div>
                <div className="text-2xl font-bold text-gray-400 tracking-wider">NEET</div>
                <div className="text-2xl font-bold text-gray-400 tracking-wider">UPSC</div>
            </div>
        </div>
    </section>
);

const FeatureCard: React.FC<{icon: React.ReactNode, title: string, description: string, onGetStarted: () => void}> = ({ icon, title, description, onGetStarted }) => (
    <div className="bg-white p-8 rounded-3xl shadow-lg flex flex-col items-start">
        <div className="bg-pay-green-light p-3 rounded-full mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-pay-black mb-2">{title}</h3>
        <p className="text-pay-gray mb-6 flex-grow">{description}</p>
        <Button onClick={onGetStarted} variant="ghost" className="bg-pay-green-light text-pay-green-dark font-bold hover:bg-pay-green-medium/50 items-center gap-2 px-5 py-2 rounded-full">
            <span>Start Practicing</span>
            <AppleIcon className="h-5 w-5" />
        </Button>
    </div>
);

const FeaturesSection: React.FC<LandingPageProps> = ({ onGetStarted }) => (
  <section className="relative py-20 md:py-32 bg-[#F0FDF4]">
      <div className="container mx-auto px-6">
        <div className="text-center">
            <div className="inline-block bg-pay-green-light text-pay-green-dark font-semibold px-4 py-1 rounded-full text-sm mb-4">
                OUR METHOD
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-pay-black">
                A Smarter Way to Prepare
            </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16 max-w-6xl mx-auto">
            <FeatureCard 
                icon={<BrainCircuitIcon className="h-8 w-8 text-pay-green-dark" />}
                title="Personalized Learning Path"
                description="Our AI understands your strengths and weaknesses. Get a tailored question bank that adapts to your performance, ensuring you focus on what matters most."
                onGetStarted={onGetStarted}
            />
            <FeatureCard 
                icon={<BoltIcon className="h-8 w-8 text-pay-green-dark" />}
                title="Instant, Detailed Solutions"
                description="Don't just solve—understand. Get instant, step-by-step solutions and discover the 'Fastest Safe Method' to tackle complex problems efficiently."
                onGetStarted={onGetStarted}
            />
            <FeatureCard 
                icon={<ShieldCheckIcon className="h-8 w-8 text-pay-green-dark" />}
                title="Track Your Performance"
                description="Monitor your progress with our in-depth analytics dashboard. Track your accuracy, speed, and topic-wise performance to stay ahead of the competition."
                onGetStarted={onGetStarted}
            />
        </div>
      </div>
  </section>
);

const WhyUsSection: React.FC = () => (
  <section className="py-20 md:py-32 bg-gray-50">
    <div className="container mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-8 items-center mb-16">
        <div>
          <span className="text-sm font-bold bg-red-100 text-red-600 px-3 py-1.5 rounded-md">MISSION</span>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">
            <span className="text-gray-500 font-medium">Our focus is simple.</span><br/>
            <span className="text-pay-black">Learn to succeed.</span>
          </h2>
        </div>
        <p className="text-lg text-pay-gray max-w-sm justify-self-start lg:justify-self-end">
          We promise to deliver a learning experience that goes beyond your expectations.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="flex -space-x-4">
                  <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1550525811-e586910b323f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Student avatar 1" />
                  <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Student avatar 2" />
                  <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Student avatar 3" />
              </div>
              <p className="font-semibold text-sm text-pay-gray tracking-wider">10,000+ STUDENTS</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm">
              <p className="font-semibold text-pay-black">Through our custom-tailored learning paths</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm">
              <p className="text-pay-gray mb-4">Improve your score by at least 30 points</p>
              <p className="text-6xl font-bold text-pay-black">90%</p>
              <p className="text-pay-gray mt-2">Success rate in score improvement</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col">
              <div className="flex-grow">
                <p className="text-6xl font-bold text-pay-black">1M+</p>
                <p className="text-pay-gray mt-2">Questions Answered</p>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <p className="text-sm text-pay-gray font-medium">NEW TOPICS ADDED MONTHLY</p>
              </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 bg-pay-black text-white p-8 rounded-3xl shadow-lg flex flex-col justify-between relative overflow-hidden min-h-[400px]">
          <svg className="absolute bottom-0 right-0 w-2/3 h-auto text-gray-700 opacity-20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M10 80 Q 30 20, 50 50 T 90 20" stroke="currentColor" strokeWidth="5" />
            <path d="M80 30 L 90 20 L 80 10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          
          <p className="text-lg text-gray-300 relative z-10">
            We've helped students worldwide achieve top ranks and secure admission to elite institutions.
          </p>
          
          <div className="relative z-10 mt-8">
              <p className="text-7xl font-bold">4.8<span className="text-4xl text-gray-400">/5</span></p>
              <div className="flex items-center gap-4 mt-4">
                  <div className="flex text-yellow-400">
                      <StarIcon className="h-5 w-5"/>
                      <StarIcon className="h-5 w-5"/>
                      <StarIcon className="h-5 w-5"/>
                      <StarIcon className="h-5 w-5"/>
                      <StarIcon className="h-5 w-5"/>
                  </div>
                  <p className="text-xs font-semibold tracking-wider text-gray-400">RATING FROM OUR STUDENTS</p>
              </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const CtaSection: React.FC<LandingPageProps> = ({ onGetStarted }) => (
  <section className="bg-gray-50">
    <div className="container mx-auto px-6 py-16">
      <div className="bg-pay-green-dark rounded-3xl p-8 md:p-16 text-white">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Start preparing for success</h2>
            <p className="mt-4 text-gray-300 max-w-md">
              Sign up to get access to our AI-powered platform and receive tips, updates, and insights to help you ace your exams.
            </p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onGetStarted(); }}>
            <label htmlFor="email-subscribe" className="block text-sm font-medium text-gray-200 mb-2">Stay up to date</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="email" 
                id="email-subscribe"
                placeholder="Enter your email" 
                className="flex-grow h-12 px-4 rounded-full bg-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-pay-green-medium focus:outline-none transition"
                aria-label="Email for signup"
              />
              <Button 
                type="submit"
                className="bg-pay-green-medium text-pay-green-dark font-bold hover:bg-pay-green-light h-12 px-8 rounded-full text-base"
              >
                Get Started
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              By signing up you agree to our <a href="#" className="underline hover:text-white">Privacy Policy</a>.
            </p>
          </form>
        </div>
      </div>
    </div>
  </section>
);


const LandingFooter: React.FC = () => (
    <footer className="bg-white text-pay-gray pt-16 pb-8">
        <div className="container mx-auto px-6">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2 mb-8 sm:mb-0">
                    <div className="flex items-center gap-2">
                        <PayMeIcon className="h-8 w-8 text-pay-green-dark" />
                        <span className="font-bold text-xl text-pay-black">PayMe App</span>
                    </div>
                    <p className="mt-4 text-sm max-w-xs">
                       Making your complicated exam prep more simple.
                    </p>
                </div>
                <div>
                    <h4 className="font-semibold text-pay-black mb-4">Features</h4>
                    <ul className="space-y-3 text-sm">
                        <li><a href="#" className="hover:text-pay-black">Personalized Learning</a></li>
                        <li><a href="#" className="hover:text-pay-black">Instant Solutions</a></li>
                        <li><a href="#" className="hover:text-pay-black">Analytics</a></li>
                        <li><a href="#" className="hover:text-pay-black">Pricing</a></li>
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold text-pay-black mb-4">Support</h4>
                    <ul className="space-y-3 text-sm">
                        <li><a href="#" className="hover:text-pay-black">Help</a></li>
                        <li><a href="#" className="hover:text-pay-black">FAQ</a></li>
                        <li><a href="#" className="hover:text-pay-black">Contact</a></li>
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold text-pay-black mb-4">Legal</h4>
                    <ul className="space-y-3 text-sm">
                        <li><a href="#" className="hover:text-pay-black">Privacy Policy</a></li>
                        <li><a href="#" className="hover:text-pay-black">Terms of Services</a></li>
                        <li><a href="#" className="hover:text-pay-black">Cookies</a></li>
                    </ul>
                </div>
            </div>
             <div className="mt-16 border-t pt-8 text-center text-sm">
                <p>&copy; {new Date().getFullYear()} PayMe App. All Rights Reserved.</p>
            </div>
        </div>
    </footer>
);


export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="bg-white font-sans antialiased">
      <LandingHeader onGetStarted={onGetStarted} />
      <main>
        <HeroSection onGetStarted={onGetStarted} />
        <PartnersSection />
        <FeaturesSection onGetStarted={onGetStarted} />
        <WhyUsSection />
        <CtaSection onGetStarted={onGetStarted} />
      </main>
      <LandingFooter />
    </div>
  );
};
