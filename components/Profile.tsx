import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Avatar } from './ui/Avatar';
import { getCurrentUser, updateUser } from '../services/authService';
import { uploadAvatar } from '../services/profileService';
import { User } from '../types';
import { EXAM_PROFILES } from '../constants';
import { log } from '../lib/log';

export const Profile: React.FC<{}> = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [examProfile, setExamProfile] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          const metadata = currentUser.user_metadata;
          setFullName(metadata.full_name || '');
          setPhone(metadata.phone || '');
          setExamProfile(metadata.exam_profile || EXAM_PROFILES[0].value);
          setAvatarUrl(metadata.avatar_url);
          setAvatarPreview(metadata.avatar_url);
        } else {
          setError('Could not load user profile.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
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
      };

      const { user: updatedUser } = await updateUser({ data: updatedMetadata });
      
      if(updatedUser) {
        setUser(updatedUser);
        setAvatarUrl(updatedUser.user_metadata.avatar_url);
        setAvatarPreview(updatedUser.user_metadata.avatar_url);
        setNewAvatarFile(null);
        localStorage.setItem('examProfile', examProfile); // Sync with practice page
        setSuccessMessage('Profile updated successfully!');
      }

    } catch (err: any) {
      log.error('Failed to update profile:', err);
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading profile...</div>;
  }

  if (error && !user) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your personal information and preferences.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-8">
          <div className="flex items-center gap-6">
            <Avatar email={user.email || ''} src={avatarPreview} className="h-20 w-20 text-2xl" />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/png, image/jpeg"
            />
            <div className="flex flex-col gap-2">
                 <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Upload Photo
                </Button>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 1MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={user.email}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground truncate"
                  disabled
                />
            </div>
             <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Your Name"
                />
            </div>
             <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="(123) 456-7890"
                />
            </div>
            <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="examProfile">Exam Profile</label>
                <Select
                    id="examProfile"
                    options={EXAM_PROFILES}
                    value={examProfile}
                    onChange={(e) => setExamProfile(e.target.value)}
                />
            </div>
          </div>
          
          {error && <p className="text-sm text-destructive">{error}</p>}
          {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
          
          <div className="flex justify-end">
            <Button type="submit" isLoading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};