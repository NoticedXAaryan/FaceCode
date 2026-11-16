export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://face-code-pink.vercel.app';

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

export function isClerkConfigured() {
  return CLERK_PUBLISHABLE_KEY.startsWith('pk_') && !CLERK_PUBLISHABLE_KEY.includes('YOUR_KEY');
}
