export type PlatformId =
  | 'instagram'
  | 'linkedin'
  | 'whatsapp'
  | 'x'
  | 'tiktok'
  | 'github'
  | 'youtube'
  | 'website';

export const PLATFORMS: { id: PlatformId; label: string; icon: string; color: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E1306C' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
  { id: 'x', label: 'X', icon: 'logo-twitter', color: '#E7E9EA' },
  { id: 'tiktok', label: 'TikTok', icon: 'logo-tiktok', color: '#FE2C55' },
  { id: 'github', label: 'GitHub', icon: 'logo-github', color: '#F0F0F0' },
  { id: 'youtube', label: 'YouTube', icon: 'logo-youtube', color: '#FF0033' },
  { id: 'website', label: 'Website', icon: 'globe-outline', color: '#A78BFA' },
];

export function platformMeta(platform: string) {
  const key = platform.toLowerCase();
  return (
    PLATFORMS.find((item) => item.id === key || item.label.toLowerCase() === key) || {
      id: 'website' as const,
      label: platform || 'Link',
      icon: 'link-outline',
      color: '#6C5CE7',
    }
  );
}

export function platformFromUrl(url: string) {
  const value = url.toLowerCase();
  if (value.includes('instagram.com') || value.includes('instagr.am')) return 'instagram';
  if (value.includes('linkedin.com')) return 'linkedin';
  if (value.includes('wa.me') || value.includes('whatsapp')) return 'whatsapp';
  if (value.includes('twitter.com') || value.includes('x.com')) return 'x';
  if (value.includes('tiktok.com')) return 'tiktok';
  if (value.includes('github.com')) return 'github';
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'youtube';
  return 'website';
}

export function openableUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
