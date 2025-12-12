import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getCurrentUser, updateUser } from '../services/authService';
import { uploadAvatar } from '../services/profileService';
import { fetchUserAnalytics } from '../services/analyticsService';
import { User } from '../types';
import { EXAM_TAXONOMY, getExamOptions } from '../lib/taxonomy';
import { log } from '../lib/log';
import { supabase } from '../lib/supabase';

export const Profile: React.FC<{}> = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [examProfile, setExamProfile] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);

  // New fields
  const [targetScore, setTargetScore] = useState('');
  const [studyHours, setStudyHours] = useState('2');
  const [dailyGoal, setDailyGoal] = useState('20');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          const metadata = currentUser.user_metadata;
          setFullName(metadata.full_name || '');
          setPhone(metadata.phone || '');
          setExamProfile(metadata.exam_profile || EXAM_TAXONOMY[0].value);
          setAvatarUrl(metadata.avatar_url);
          setAvatarPreview(metadata.avatar_url);
          setTargetScore(metadata.target_score || '');
          setStudyHours(metadata.study_hours_per_day?.toString() || '2');
          setDailyGoal(metadata.daily_question_goal?.toString() || '20');
        } else {
          setError('Could not load user profile.');
        }

        // Fetch analytics data
        const analyticsData = await fetchUserAnalytics();
        setAnalytics(analyticsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let finalAvatarUrl = avatarUrl;
      if (newAvatarFile) {
        finalAvatarUrl = await uploadAvatar(newAvatarFile);
      }

      const updatedMetadata = {
        full_name: fullName,
        phone: phone,
        exam_profile: examProfile,
        avatar_url: finalAvatarUrl,
        target_score: targetScore,
        study_hours_per_day: parseInt(studyHours) || 2,
        daily_question_goal: parseInt(dailyGoal) || 20,
      };

      const { user: updatedUser } = await updateUser({ data: updatedMetadata });

      if (updatedUser) {
        setUser(updatedUser);
        setAvatarUrl(updatedUser.user_metadata.avatar_url);
        setAvatarPreview(updatedUser.user_metadata.avatar_url);
        setNewAvatarFile(null);
        localStorage.setItem('examProfile', examProfile);
        setSuccessMessage('Profile updated successfully!');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }

    } catch (err: any) {
      log.error('Failed to update profile:', err);
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <svg className="animate-spin h-10 w-10 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!user) {
    return <div className="text-destructive">Error: {error || 'Could not load profile'}</div>;
  }

  const createdDate = new Date(user.created_at || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Grid Layout - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Card 1: Personal Information */}
          <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
            <h3 className="text-lg font-bold text-foreground mb-1">Personal Information</h3>
            <p className="text-xs text-gray-500 mb-6">Update your personal details</p>

            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                    alt="Profile"
                    className="h-20 w-20 rounded-full border-4 border-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1.5 rounded-full hover:bg-emerald-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/jpg"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{fullName || 'Set your name'}</p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 1MB</p>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="Your Name"
                />
              </div>

              {/* Email (disabled) */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Email Address</label>
                <input
                  type="email"
                  value={user.email}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                  disabled
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="(123) 456-7890"
                />
              </div>

              {/* Join Date */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Member Since</label>
                <input
                  type="text"
                  value={createdDate}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Card 2: Academic Profile */}
          <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
            <h3 className="text-lg font-bold text-foreground mb-1">Academic Profile</h3>
            <p className="text-xs text-gray-500 mb-6">Your exam preparation details</p>

            <div className="space-y-4">
              {/* Exam Profile */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Exam Profile</label>
                <select
                  value={examProfile}
                  onChange={(e) => setExamProfile(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white"
                >
                  {getExamOptions().map(profile => (
                    <option key={profile.value} value={profile.value}>{profile.label}</option>
                  ))}
                </select>
              </div>

              {/* Target Score */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Target Score/Rank</label>
                <input
                  type="text"
                  value={targetScore}
                  onChange={(e) => setTargetScore(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="e.g., JEE Main 250+, CAT 99%ile"
                />
              </div>

              {/* Study Hours */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Study Hours per Day</label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={studyHours}
                  onChange={(e) => setStudyHours(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>

              {/* Daily Question Goal */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Daily Question Goal</label>
                <input
                  type="number"
                  min="5"
                  max="200"
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Number of questions you aim to solve daily</p>
              </div>
            </div>
          </div>

          {/* Card 3: Performance Summary */}
          <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
            <h3 className="text-lg font-bold text-foreground mb-1">Performance Summary</h3>
            <p className="text-xs text-gray-500 mb-6">Your overall learning statistics</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                <div>
                  <p className="text-xs text-gray-600">Total Questions</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{analytics?.total_attempts || 0}</p>
                </div>
                <svg className="w-10 h-10 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div>
                  <p className="text-xs text-gray-600">Accuracy Rate</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{analytics?.accuracy_pct?.toFixed(1) || 0}%</p>
                </div>
                <svg className="w-10 h-10 text-green-500/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div>
                  <p className="text-xs text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{Math.round((analytics?.avg_time_ms || 0) / 1000)}s</p>
                </div>
                <svg className="w-10 h-10 text-blue-500/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 4: Account Actions */}
          <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
            <h3 className="text-lg font-bold text-foreground mb-1">Account Settings</h3>
            <p className="text-xs text-gray-500 mb-6">Manage your account preferences</p>

            <div className="space-y-3">
              <button
                type="button"
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Change Password</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Export Data</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="text-sm font-medium text-red-600">Delete Account</span>
                  </div>
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};