import React from 'react';

export const TermsAndConditions: React.FC = () => {
    return (
        <div className="min-h-screen bg-white text-gray-800 font-sans">
            <header className="border-b border-gray-100 py-4">
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-2 text-decoration-none">
                        <img src="/brand-logo.png" alt="Drut" className="h-8 w-auto" />
                    </a>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold mb-2">Terms and Conditions</h1>
                <p className="text-gray-500 mb-8">Last updated: December 23, 2025</p>

                <div className="space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">1. Agreement to Terms</h2>
                        <p className="leading-relaxed">
                            These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity (“you”) and Drut Learning Technologies
                            (“we,” “us” or “our”), concerning your access to and use of the drut.club website as well as any other media form, media channel, mobile website or mobile application
                            related, linked, or otherwise connected thereto (collectively, the “Site”).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">2. Intellectual Property Rights</h2>
                        <p className="leading-relaxed">
                            Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs,
                            and graphics on the Site (collectively, the “Content”) and the trademarks, service marks, and logos contained therein (the “Marks”) are owned or controlled by us or
                            licensed to us, and are protected by copyright and trademark laws.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">3. User Representations</h2>
                        <p className="leading-relaxed mb-3">
                            By using the Site, you represent and warrant that:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>All registration information you submit will be true, accurate, current, and complete.</li>
                            <li>You have the legal capacity and you agree to comply with these Terms and Conditions.</li>
                            <li>You will not access the Site through automated or non-human means, whether through a bot, script or otherwise.</li>
                            <li>You will not use the Site for any illegal or unauthorized purpose.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">4. Educational Disclaimer</h2>
                        <p className="leading-relaxed">
                            The Site provides educational tools and analytics for competitive exam preparation. While we strive to improve your speed and accuracy, we do not guarantee specific
                            exam results or rankings. Your performance depends on various factors beyond our control.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">5. Modifications and Interruptions</h2>
                        <p className="leading-relaxed">
                            We reserve the right to change, modify, or remove the contents of the Site at any time or for any reason at our sole discretion without notice. We cannot guarantee the
                            Site will be available at all times. We may experience hardware, software, or other problems or need to perform maintenance related to the Site, resulting in interruptions,
                            delays, or errors.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">6. Governing Law</h2>
                        <p className="leading-relaxed">
                            These Terms shall be governed by and defined following the laws of India. Drut Learning Technologies and yourself irrevocably consent that the courts of India shall have
                            exclusive jurisdiction to resolve any dispute which may arise in connection with these terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-gray-900">7. Contact Us</h2>
                        <p className="leading-relaxed">
                            In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at: <a href="mailto:pranav.n@drut.club" className="text-blue-600 hover:underline">pranav.n@drut.club</a>.
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
