import React from 'react';
import { Mail, HelpCircle, ChevronRight, MessageSquare } from 'lucide-react';

export const HelpSupport: React.FC = () => {
    const faqs = [
        {
            question: "How do I reset my password?",
            answer: "Go to Profile Settings > Account Actions and click on 'Change Password'."
        },
        {
            question: "Can I use Drut on multiple devices?",
            answer: "Yes! Your progress syncs automatically across all your devices."
        },
        {
            question: "How is my Sprint score calculated?",
            answer: "It combines your accuracy and speed relative to the target time for each exam type."
        },
        {
            question: "What if I find a mistake in a question?",
            answer: "Please report it using the 'Report' button within the question interface."
        }
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Help & Support</h1>
                <p className="text-slate-500 mt-2">Find answers to common questions or get in touch with our team.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Contact Support Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center mb-4">
                            <MessageSquare className="w-6 h-6 text-violet-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Need Help?</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Our support team is here to assist you with any issues you might face.
                        </p>
                        <a
                            href="mailto:support@drut.club"
                            className="block w-full py-3 px-4 bg-violet-600 text-white text-center font-medium rounded-xl hover:bg-violet-700 transition-colors"
                        >
                            Contact Support
                        </a>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-3xl border border-emerald-100">
                        <h3 className="text-lg font-bold text-emerald-900 mb-2">Join Community</h3>
                        <p className="text-xs text-emerald-700/80 mb-4">
                            Connect with other students and share your learning journey.
                        </p>
                        <button className="text-sm font-bold text-emerald-700 flex items-center gap-1 hover:gap-2 transition-all">
                            Join Discord <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* FAQs */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-slate-400" />
                                Frequently Asked Questions
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {faqs.map((faq, index) => (
                                <div key={index} className="p-6 hover:bg-slate-50 transition-colors">
                                    <h4 className="font-semibold text-slate-900 mb-2">{faq.question}</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">{faq.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
