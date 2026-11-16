import api from '@/services/api';
import onboardingLib from '../logic/onboarding';

export type OnboardingStatus = {
  hasFace: boolean;
  hasProfile: boolean;
  username: string | null;
};

const routeForStatus = onboardingLib.routeForStatus as (status: OnboardingStatus) => string;

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const { data } = await api.get<OnboardingStatus>('/api/users/me', { timeout: 15000 });
  return data;
}

export async function getPostAuthRoute(): Promise<string> {
  try {
    return routeForStatus(await fetchOnboardingStatus());
  } catch {
    return '/enroll';
  }
}
