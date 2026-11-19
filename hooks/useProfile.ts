import { useCallback, useState } from 'react';
import api from '@/services/api';

export interface SocialLink {
  platform: string;
  url: string;
  display_order?: number;
}

export interface UserProfile {
  id?: string;
  username: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  is_public: boolean;
  primary_link_platform?: string;
  links?: SocialLink[];
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (username?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (username) {
        const { data } = await api.get(`/api/users/${username}`);
        const user = data.user || data;
        const nextLinks = data.links || user.links || [];
        setProfile(user);
        setLinks(nextLinks);
        return user;
      }
      const { data } = await api.get('/api/users/me');
      const next = data.profile || null;
      setProfile(next);
      setLinks(next?.links || []);
      return data;
    } catch (e: any) {
      const message = e.response?.data?.error || e.message || 'Failed to load profile';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (payload: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.put('/api/users/profile', payload);
      if (data.profile) {
        setProfile(data.profile);
        setLinks(data.profile.links || []);
      }
      return data;
    } catch (e: any) {
      const message = e.response?.data?.error || e.message || 'Could not save profile.';
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, []);

  return { profile, links, isLoading, saving, error, fetchProfile, saveProfile };
}
