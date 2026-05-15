import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SocialLink {
  id?: string;
  platform: string;
  url: string;
  display_order: number;
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  is_public: boolean;
  primary_link_platform?: string;
  social_links?: SocialLink[];
}

export interface ProfileStats {
  scan_count: number;
  profile_views: number;
  link_clicks: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (username?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = username ? `/api/users/${username}` : '/api/users/me';
      const { data } = await api.get(endpoint);
      setProfile(data);
      setLinks(data.social_links || data.links || []);
      return data;
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'Failed to load profile';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyStats = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users/me/stats');
      setStats(data);
      return data;
    } catch {
      setStats({ scan_count: 0, profile_views: 0, link_clicks: 0 });
      return null;
    }
  }, []);

  const saveProfile = useCallback(
    async (payload: Record<string, any>) => {
      setSaving(true);
      setError(null);
      try {
        const { data } = await api.put('/api/users/profile', payload);
        setProfile((prev) => (prev ? { ...prev, ...data } : data));
        return data;
      } catch (e: any) {
        const msg = e.response?.data?.error || e.message || 'Could not save profile.';
        setError(msg);
        throw new Error(msg);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const addLink = useCallback(async (platform: string, url: string) => {
    setSaving(true);
    try {
      const { data } = await api.post('/api/users/links', { platform, url });
      setLinks((prev) => [...prev, data]);
      return data;
    } catch (e: any) {
      throw new Error(e.response?.data?.error || 'Could not add link.');
    } finally {
      setSaving(false);
    }
  }, []);

  const removeLink = useCallback(async (linkId: string) => {
    setSaving(true);
    try {
      await api.delete(`/api/users/links/${linkId}`);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (e: any) {
      throw new Error(e.response?.data?.error || 'Could not remove link.');
    } finally {
      setSaving(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchProfile();
    fetchMyStats();
  }, [fetchProfile, fetchMyStats]);

  return {
    profile,
    links,
    stats,
    isLoading,
    saving,
    error,
    fetchProfile,
    fetchMyStats,
    saveProfile,
    addLink,
    removeLink,
    refresh,
  };
}
