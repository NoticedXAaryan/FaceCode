import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://face-code-pink.vercel.app';

export type OnboardingStatus = {
  hasFace: boolean;
  hasProfile: boolean;
  username: string | null;
};

export async function fetchOnboardingStatus(
  getToken: () => Promise<string | null>,
): Promise<OnboardingStatus> {
  const token = await getToken();
  if (!token) {
    return { hasFace: false, hasProfile: false, username: null };
  }

  const { data } = await axios.get<OnboardingStatus>(`${API_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });

  return data;
}

export async function getPostAuthRoute(
  getToken: () => Promise<string | null>,
): Promise<string> {
  const status = await fetchOnboardingStatus(getToken);
  if (!status.hasFace) return '/enroll';
  if (!status.hasProfile) return '/setup';
  return '/(tabs)/scanner';
}
