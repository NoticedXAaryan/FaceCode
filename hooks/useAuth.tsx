import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useAuth as useClerkAuth, useClerk, useSignIn, useSignUp, useSSO, useUser as useClerkUser } from '@clerk/expo';
import { setApiTokenGetter } from '@/services/api';
import { storageDelete, storageGet, storageSet } from '@/services/storage';

export type AuthUser = {
  id: string;
  email: string;
  fullName?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string, fullName?: string) => Promise<{ needsVerification: boolean }>;
  verifySignUpEmail: (code: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (code: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const USERNAME_KEY = 'facetag_username';

export async function saveUsername(username: string) {
  await storageSet(USERNAME_KEY, username);
}

export async function getStoredUsername() {
  return storageGet(USERNAME_KEY);
}

function clerkMessage(error: any, fallback: string) {
  return error?.longMessage || error?.message || error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded: isAuthLoaded, isSignedIn, signOut: clerkSignOut, getToken: clerkGetToken } = useClerkAuth();
  const { isLoaded: isUserLoaded, user: clerkUser } = useClerkUser();
  const { signIn: clerkSignIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const clerk = useClerk();

  const getToken = useCallback(async () => clerkGetToken(), [clerkGetToken]);

  useEffect(() => {
    setApiTokenGetter(getToken);
  }, [getToken]);

  const user: AuthUser | null = useMemo(() => {
    if (!isSignedIn || !clerkUser) return null;
    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      fullName: clerkUser.fullName || undefined,
    };
  }, [isSignedIn, clerkUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await clerkSignIn.create({ identifier: email.trim(), password });
    if (result.error) throw new Error(clerkMessage(result.error, 'Sign in failed'));
    if (clerkSignIn.status === 'needs_second_factor') {
      throw new Error('This account needs a second factor. Turn that off in Clerk or sign in on the web.');
    }
    if (clerkSignIn.status !== 'complete') {
      throw new Error(`Sign in needs another step (${clerkSignIn.status || 'unknown'}).`);
    }
    const finalized = await clerkSignIn.finalize();
    if (finalized.error) throw new Error(clerkMessage(finalized.error, 'Could not start the session'));
  }, [clerkSignIn]);

  const signUp = useCallback(async (email: string, password: string, username?: string, fullName?: string) => {
    const params: { emailAddress: string; password: string; username?: string; firstName?: string; lastName?: string } = {
      emailAddress: email.trim(),
      password,
    };
    if (username) params.username = username;
    if (fullName) {
      const parts = fullName.trim().split(' ');
      if (parts[0]) params.firstName = parts[0];
      if (parts.length > 1) params.lastName = parts.slice(1).join(' ');
    }

    const created = await clerkSignUp.create(params);
    if (created.error) throw new Error(clerkMessage(created.error, 'Sign up failed'));

    if (clerkSignUp.missingFields?.includes('username')) {
      const auto =
        email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || `user${Date.now().toString().slice(-4)}`;
      const updated = await clerkSignUp.update({ username: auto });
      if (updated.error) throw new Error(clerkMessage(updated.error, 'Could not finish sign up'));
    }

    if (clerkSignUp.status === 'complete') {
      const finalized = await clerkSignUp.finalize();
      if (finalized.error) throw new Error(clerkMessage(finalized.error, 'Could not start the session'));
      return { needsVerification: false };
    }

    const code = await clerkSignUp.verifications.sendEmailCode();
    if (code.error) throw new Error(clerkMessage(code.error, 'Could not send the verification code'));
    return { needsVerification: true };
  }, [clerkSignUp]);

  const verifySignUpEmail = useCallback(async (code: string) => {
    const result = await clerkSignUp.verifications.verifyEmailCode({ code: code.trim() });
    if (result.error) throw new Error(clerkMessage(result.error, 'Verification failed'));
    if (clerkSignUp.status !== 'complete') {
      const missing = clerkSignUp.missingFields?.join(', ') || clerkSignUp.status || 'unknown';
      throw new Error(`Sign up is not finished yet (${missing}).`);
    }
    const finalized = await clerkSignUp.finalize();
    if (finalized.error) throw new Error(clerkMessage(finalized.error, 'Could not start the session'));
  }, [clerkSignUp]);

  const signInWithGoogle = useCallback(async () => {
    const { createdSessionId, setActive } = await startSSOFlow({ strategy: 'oauth_google' });
    if (createdSessionId && setActive) {
      await setActive({ session: createdSessionId });
      return;
    }
    if (createdSessionId && clerk.loaded) {
      await clerk.setActive({ session: createdSessionId });
      return;
    }
    throw new Error('Google sign-in was cancelled.');
  }, [clerk, startSSOFlow]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const created = await clerkSignIn.create({ identifier: email.trim() });
    if (created.error) throw new Error(clerkMessage(created.error, 'Could not start password reset'));
    const sent = await clerkSignIn.resetPasswordEmailCode.sendCode();
    if (sent.error) throw new Error(clerkMessage(sent.error, 'Could not send the reset code'));
  }, [clerkSignIn]);

  const confirmPasswordReset = useCallback(async (code: string, password: string) => {
    const verified = await clerkSignIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
    if (verified.error) throw new Error(clerkMessage(verified.error, 'That code is not valid'));
    const submitted = await clerkSignIn.resetPasswordEmailCode.submitPassword({ password, signOutOfOtherSessions: true });
    if (submitted.error) throw new Error(clerkMessage(submitted.error, 'Could not set the new password'));
    const finalized = await clerkSignIn.finalize();
    if (finalized.error) throw new Error(clerkMessage(finalized.error, 'Could not start the session'));
  }, [clerkSignIn]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!clerkUser) throw new Error('Sign in again before changing your password.');
    await clerkUser.updatePassword({ currentPassword, newPassword, signOutOfOtherSessions: true });
  }, [clerkUser]);

  const signOut = useCallback(async () => {
    await storageDelete(USERNAME_KEY);
    await clerkSignOut();
  }, [clerkSignOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: !isAuthLoaded || !isUserLoaded,
      signIn,
      signUp,
      verifySignUpEmail,
      signInWithGoogle,
      requestPasswordReset,
      confirmPasswordReset,
      changePassword,
      signOut,
      getToken,
    }),
    [
      user,
      isAuthLoaded,
      isUserLoaded,
      signIn,
      signUp,
      verifySignUpEmail,
      signInWithGoogle,
      requestPasswordReset,
      confirmPasswordReset,
      changePassword,
      signOut,
      getToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth() must be used inside an <AuthProvider>.');
  return context;
}
