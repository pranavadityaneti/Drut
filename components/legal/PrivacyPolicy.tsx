import React from 'react';
import { DrutIcon } from '../icons/Icons';

export const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-white text-gray-800 font-sans">
            <header className="border-b border-gray-100 py-4">
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-2 text-decoration-none">
                        {/* Simple Logo Placeholder if DrutIcon isn't readily available or complex to import contextually */}
                        <span className="font-bold text-xl tracking-tight text-gray-900">Drut</span>
                    </a>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-gray-500 mb-8">Last updated: December 23, 2025</p>

                <div className="space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">1. Introduction</h2>
                        <p className="leading-relaxed">
                            Welcome to Drut. We respect your privacy and are committed to protecting your personal data.
                            This privacy policy will inform you as to how we look after your personal data when you visit our website
                            (drut.club) and tell you about your privacy rights and how the law protects you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">2. Data We Collect</h2>
                        <p className="leading-relaxed mb-3">
                            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                            <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
                            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, and operating system and platform.</li>
                            <li><strong>Usage Data:</strong> includes information about how you use our website, products, and services, such as quiz performance and speed metrics.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">3. How We Use Your Data</h2>
                        <p className="leading-relaxed mb-3">
                            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>To provide the educational services and analytics you have requested.</li>
                            <li>To manage our relationship with you.</li>
                            <li>To improve our website, products/services, marketing, and customer relationships.</li>
                            <li>To send you waitlist updates or service notifications.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">4. Data Security</h2>
                        <p className="leading-relaxed">
                            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way.
                            In addition, we limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">5. Third-Party Links</h2>
                        <p className="leading-relaxed">
                            This website may include links to third-party websites, plug-ins, and applications. Clicking on those links or enabling those connections may allow
                            third parties to collect or share data about you. We do not control these third-party websites and are not responsible for their privacy statements.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">6. Contact Us</h2>
                        <p className="leading-relaxed">
                            If you have any questions about this privacy policy or our privacy practices, please contact us at: <a href="mailto:pranav.n@drut.club" className="text-blue-600 hover:underline">pranav.n@drut.club</a>.
                        </p>
                    </section>
                </div>
            </main>

            <footer className="border-t border-gray-100 py-8 mt-12 bg-gray-50">
                <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
                    &copy; {new Date().getFullYear()} Drut Learning Technologies. All rights reserved.
                </div>
            </footer>
        </div>
    );
};
