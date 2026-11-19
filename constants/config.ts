export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://face-code-pink.vercel.app';

/** True when the app has an API origin to talk to for Better Auth + FaceTag APIs. */
export function isAuthConfigured() {
  return Boolean(API_URL) && !API_URL.includes('YOUR_');
}
