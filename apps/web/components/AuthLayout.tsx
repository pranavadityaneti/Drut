import React from 'react';
import { cn } from '@drut/shared';

interface AuthLayoutProps {
    children: React.ReactNode;
    illustration?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, illustration = '/auth-illustration.png' }) => {
    return (
        <div className="flex min-h-screen bg-white">
            {/* LEFT: Form Section */}
            <div className="flex w-full flex-col justify-center px-8 sm:w-1/2 md:px-16 lg:px-24 xl:px-32">
                <div className="mx-auto w-full max-w-md">
                    {/* Form Content */}
                    {children}
                </div>
            </div>

            {/* RIGHT: Illustration Section */}
            <div className="hidden w-1/2 bg-[#f6fbe8] p-12 sm:flex items-center justify-center relative overflow-hidden">
                {/* Background Decorative Blobs (Optional, kept simple for now) */}

                <div className="relative z-10 max-w-lg text-center">
                    <div className="mb-8">
                        <img
                            src={illustration}
                            alt="Zen Productivity"
                            className="mx-auto h-auto max-w-full object-contain"
                        />
                    </div>

                    <h2 className="text-3xl font-bold text-slate-800 mb-4">
                        Find your flow state.
                    </h2>
                    <p className="text-slate-600 text-lg">
                        Join thousands of students and professionals mastering their craft with Drut.
                    </p>

                    {/* Pagination Dots Simulator */}
                    <div className="flex justify-center gap-2 mt-8">
                        <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                        <div className="h-2 w-2 rounded-full bg-slate-800"></div>
                        <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
