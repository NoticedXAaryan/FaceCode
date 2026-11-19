import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { authClient, getAuthCookieHeader } from '@/services/authClient';
import { setApiCookieGetter } from '@/services/api';
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
  signUp: (
    email: string,
    password: string,
    username?: string,
    fullName?: string,
  ) => Promise<{ needsVerification: boolean }>;
  verifySignUpEmail: (code: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
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

function authMessage(error: any, fallback: string) {
  return error?.message || error?.error?.message || fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();

  const getToken = useCallback(async () => getAuthCookieHeader(), []);

  useEffect(() => {
    setApiCookieGetter(getToken);
  }, [getToken]);

  const user: AuthUser | null = useMemo(() => {
    const sessionUser = session.data?.user;
    if (!sessionUser) return null;
    return {
      id: sessionUser.id,
      email: sessionUser.email || '',
      fullName: sessionUser.name || undefined,
    };
  }, [session.data?.user]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(authMessage(error, 'Sign in failed'));
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, _username?: string, fullName?: string) => {
      const name =
        fullName?.trim() ||
        email
          .split('@')[0]
          .replace(/[^a-zA-Z0-9 ]/g, ' ')
          .trim() ||
        'FaceTag user';
      const { error } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name,
      });
      if (error) throw new Error(authMessage(error, 'Sign up failed'));
      // Email verification is optional (RESEND). Accounts are usable immediately.
      return { needsVerification: false };
    },
    [],
  );

  const verifySignUpEmail = useCallback(async (_code: string) => {
    throw new Error('Email verification codes are not used. Check your inbox for a link if one was sent.');
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/(tabs)/scanner',
    });
    if (error) throw new Error(authMessage(error, 'Google sign-in failed'));
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: 'facetag://(auth)/login',
    });
    if (error) throw new Error(authMessage(error, 'Could not send the reset email'));
  }, []);

  const confirmPasswordReset = useCallback(async (token: string, password: string) => {
    const { error } = await authClient.resetPassword({
      token: token.trim(),
      newPassword: password,
    });
    if (error) throw new Error(authMessage(error, 'Could not set the new password'));
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    if (error) throw new Error(authMessage(error, 'Could not change password'));
  }, []);

  const signOut = useCallback(async () => {
    await storageDelete(USERNAME_KEY);
    await authClient.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: session.isPending,
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
      session.isPending,
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
