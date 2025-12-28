import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { updateOnboardingProfile } from '@drut/shared'; // from ../services/profileService';
import { authService, EXAM_TAXONOMY, getExamOptions } from '@drut/shared';
// Destructure what we need or use directly
const { getCurrentUser } = authService;
import { useNavigate } from 'react-router-dom';
import { cn } from "@drut/shared"; // from "../lib/utils"

interface OnboardingProps { }

export const Onboarding: React.FC<OnboardingProps> = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        class: '' as '11' | '12' | 'Reappear' | '',
        target_exams: [] as string[],
    });

    const EXAM_OPTIONS = [
        "CAT", "JEE Main", "AP EAPCET", "TG EAPCET",
        "MHT CET", "WBJEE", "KCET", "GUJCET", "JEE Advanced"
    ];

    const handleExamToggle = (exam: string) => {
        setFormData(prev => {
            const exists = prev.target_exams.includes(exam);
            if (exists) {
                // Remove exam if already selected
                return { ...prev, target_exams: prev.target_exams.filter(e => e !== exam) };
            } else {
                // Add exam if not selected
                return { ...prev, target_exams: [...prev.target_exams, exam] };
            }
        });
    };

    const handleSubmit = async () => {
        setError(null);
        if (!formData.full_name || !formData.class || formData.target_exams.length === 0) {
            setError("Please fill in all required fields.");
            return;
        }

        setLoading(true);
        try {
            const user = await getCurrentUser();
            if (!user) throw new Error("No user found");

            await updateOnboardingProfile(user.id, {
                full_name: formData.full_name,
                class: formData.class as '11' | '12' | 'Reappear',
                target_exams: formData.target_exams,
            });

            // Redirect to dashboard
            navigate('/dashboard');

        } catch (err: any) {
            console.error("Onboarding error:", err);
            setError(err.message || "Failed to save profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Welcome to Drut!</CardTitle>
                    <CardDescription>Let's set up your profile to personalize your experience.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="name">
                            Full Name <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="name"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Enter your full name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>

                    {/* Class Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Class <span className="text-destructive">*</span></label>
                        <div className="grid grid-cols-3 gap-2">
                            {['11', '12', 'Reappear'].map((cls) => (
                                <div
                                    key={cls}
                                    className={cn(
                                        "cursor-pointer rounded-md border-2 p-4 text-center text-sm font-semibold transition-all hover:bg-accent hover:text-accent-foreground",
                                        formData.class === cls ? "border-primary bg-primary/10 text-primary" : "border-muted bg-transparent"
                                    )}
                                    onClick={() => setFormData({ ...formData, class: cls as any })}
                                >
                                    {cls === 'Reappear' ? 'Reappear' : `Class ${cls}`}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Target Exams */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Target Exams <span className="text-destructive">*</span></label>
                        <div className="grid grid-cols-3 gap-2">
                            {EXAM_OPTIONS.map((exam) => (
                                <div
                                    key={exam}
                                    className={cn(
                                        "cursor-pointer rounded-md border-2 p-3 text-center text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground flex items-center justify-center",
                                        formData.target_exams.includes(exam) ? "border-primary bg-primary/10 text-primary" : "border-muted bg-transparent"
                                    )}
                                    onClick={() => handleExamToggle(exam)}
                                >
                                    {exam}
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        isLoading={loading}
                        disabled={!formData.full_name || !formData.class || formData.target_exams.length === 0}
                    >
                        Complete Setup
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};
