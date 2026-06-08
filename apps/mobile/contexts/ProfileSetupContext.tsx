import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@drut/shared';
import { uploadAvatarFromUri } from '../utils/uploadAvatarFromUri';

const STORAGE_KEY = 'drut:profile-setup:draft';

export interface ProfileSetupData {
    // Step 1: About You
    full_name?: string;
    city?: string;
    phone_number?: string;        // collected if user signed up via email
    email_address?: string;       // collected if user signed up via WhatsApp OTP
    avatar_uri?: string;          // local URI of picked photo (uploaded on submit)

    // Step 2: Academic
    year_in_school?: '11' | '12' | 'Reappear';
    practice_scope?: 'class_11' | 'class_11_and_12';
    target_exams?: string[];      // ['ap_eapcet'] | ['ts_eapcet'] | ['ap_eapcet', 'ts_eapcet']
    target_exam_year?: string;
    school_name?: string;
    coaching_center?: string;

    // Step 3: Referral
    referral_source?: string;
}

interface ProfileSetupContextType {
    data: ProfileSetupData;
    updateFields: (updates: Partial<ProfileSetupData>) => void;
    reset: () => Promise<void>;
    submit: () => Promise<void>;
    signupMethod: 'email' | 'whatsapp';
}

const ProfileSetupContext = createContext<ProfileSetupContextType>({
    data: {},
    updateFields: () => { },
    reset: async () => { },
    submit: async () => { },
    signupMethod: 'email',
});

export function useProfileSetup() {
    return useContext(ProfileSetupContext);
}

export function ProfileSetupProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<ProfileSetupData>({});
    const [signupMethod, setSignupMethod] = useState<'email' | 'whatsapp'>('email');

    // Load draft + detect signup method on mount
    useEffect(() => {
        const init = async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (raw) {
                    setData(JSON.parse(raw));
                }

                // Detect signup method from current user
                const user = await authService.getCurrentUser();
                if (user) {
                    const method = user.user_metadata?.login_method === 'whatsapp_otp' ||
                        user.email?.endsWith('@phone.drut.club')
                        ? 'whatsapp'
                        : 'email';
                    setSignupMethod(method);

                    // Pre-fill known fields from user_metadata
                    setData(prev => ({
                        full_name: user.user_metadata?.full_name || prev.full_name,
                        phone_number: method === 'whatsapp'
                            ? user.user_metadata?.phone_number || prev.phone_number
                            : prev.phone_number,
                        email_address: method === 'email'
                            ? user.email || prev.email_address
                            : prev.email_address,
                        ...prev,
                    }));
                }
            } catch (err) {
                console.warn('[ProfileSetup] Failed to load draft:', err);
            }
        };
        init();
    }, []);

    const updateFields = (updates: Partial<ProfileSetupData>) => {
        setData(prev => {
            const next = { ...prev, ...updates };
            // Persist async (fire and forget)
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(err =>
                console.warn('[ProfileSetup] Failed to persist:', err)
            );
            return next;
        });
    };

    const reset = async () => {
        setData({});
        await AsyncStorage.removeItem(STORAGE_KEY);
    };

    const submit = async () => {
        // Build user_metadata payload
        const metadata: Record<string, any> = {
            full_name: data.full_name,
            city: data.city,
            year_in_school: data.year_in_school,
            practice_scope: data.practice_scope || 'class_11_and_12',
            target_exams: data.target_exams || [],
            target_exam_year: data.target_exam_year,
            school_name: data.school_name,
            coaching_center: data.coaching_center || null,
            referral_source: data.referral_source || null,
            onboarding_completed: true,
        };

        // Conditionally add the "other" contact method
        if (signupMethod === 'email') {
            metadata.phone_number = data.phone_number;
        } else {
            metadata.email_address = data.email_address;
        }

        // Map target_exams to primary exam_profile for backward compatibility
        // with existing practice/sprint code that reads user_metadata.exam_profile
        if (data.target_exams && data.target_exams.length > 0) {
            metadata.exam_profile = data.target_exams[0];
        }

        // Map year_in_school to existing `class` field for backward compatibility
        if (data.year_in_school) {
            metadata.class = data.year_in_school;
        }

        // Upload avatar if user picked one
        if (data.avatar_uri) {
            try {
                const avatarUrl = await uploadAvatarFromUri(data.avatar_uri);
                metadata.avatar_url = avatarUrl;
            } catch (err) {
                // Photo is optional — don't block onboarding if upload fails
                console.warn('[ProfileSetup] Avatar upload failed (continuing without):', err);
            }
        }

        await authService.updateUser({ data: metadata });
        await reset();
    };

    return (
        <ProfileSetupContext.Provider value={{ data, updateFields, reset, submit, signupMethod }}>
            {children}
        </ProfileSetupContext.Provider>
    );
}
