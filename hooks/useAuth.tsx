import { createContext, useContext, useMemo, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  useSignIn,
  useSignUp,
} from '@clerk/expo';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email: string;
  fullName?: string;
};

type SignInFn = (email: string, password: string) => Promise<void>;
type SignUpFn = (email: string, password: string, username: string, fullName?: string) => Promise<{ needsVerification: boolean }>;
type VerifyEmailFn = (code: string) => Promise<void>;

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: SignInFn;
  signUp: SignUpFn;
  verifySignUpEmail: VerifyEmailFn;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── SecureStore helpers (exported for use in other files) ──────────────────────

const USERNAME_KEY = 'facetag_username';

export async function saveUsername(username: string): Promise<void> {
  await SecureStore.setItemAsync(USERNAME_KEY, username);
}

export async function getStoredUsername(): Promise<string | null> {
  return SecureStore.getItemAsync(USERNAME_KEY);
}

async function clearStoredUsername(): Promise<void> {
  try { await SecureStore.deleteItemAsync(USERNAME_KEY); } catch {}
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded: isAuthLoaded, isSignedIn, signOut: clerkSignOut, getToken: clerkGetToken } = useClerkAuth();
  const { isLoaded: isUserLoaded, user: clerkUser } = useClerkUser();
  const { signIn: clerkSignIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();

  const isLoading = !isAuthLoaded || !isUserLoaded;

  const user: AuthUser | null = useMemo(() => {
    if (!isSignedIn || !clerkUser) return null;
    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      fullName: clerkUser.fullName || undefined,
    };
  }, [isSignedIn, clerkUser]);

  // ─── Sign In ───────────────────────────────────────────────────────────
  // Uses signIn.create() which combines identifier + password in one step.
  const signIn: SignInFn = async (email, password) => {
    try {
      const result = await clerkSignIn.create({ identifier: email, password });
      if (result.error) {
        throw new Error(result.error.longMessage || result.error.message || 'Sign in failed');
      }
    } catch (e: any) {
      const err = e.errors ? e.errors[0] : e;
      throw new Error(err.longMessage || err.message || 'Sign in failed');
    }

    if (clerkSignIn.status === 'complete') {
      return;
    }

    // If MFA is needed (needs_second_factor)
    if (clerkSignIn.status === 'needs_second_factor') {
      throw new Error('Multi-factor authentication is required but not yet supported in this app.');
    }

    throw new Error('Sign in requires additional steps. Status: ' + clerkSignIn.status);
  };

  // ─── Sign Up ───────────────────────────────────────────────────────────
  // Step 1: signUp.create() → sends credentials
  // Step 2: signUp.sendEmailCode() → sends verification email
  // Returns { needsVerification: true } so the UI shows the code input
  const signUp: SignUpFn = async (email, password, username, fullName) => {
    const params: any = { emailAddress: email, password, username };
    if (fullName) {
      params.firstName = fullName.split(' ')[0] || '';
      params.lastName = fullName.split(' ').slice(1).join(' ') || '';
    }

    try {
      // Use create() which is the standard Clerk method for sign up
      const result = await clerkSignUp.create(params);
      if (result.error) {
        throw new Error(result.error.longMessage || result.error.message || 'Sign up failed');
      }
      
      // After create step, send email verification code
      const codeResult = await clerkSignUp.verifications.sendEmailCode();
      if (codeResult.error) {
        throw new Error(codeResult.error.longMessage || codeResult.error.message || 'Failed to send verification code');
      }
    } catch (e: any) {
      const err = e.errors ? e.errors[0] : e;
      throw new Error(err.longMessage || err.message || 'Sign up failed');
    }

    return { needsVerification: true };
  };

  // ─── Verify Sign-Up Email ───────────────────────────────────────────────
  const verifySignUpEmail: VerifyEmailFn = async (code) => {
    try {
      const result = await clerkSignUp.verifications.verifyEmailCode({ code });
      if (result.error) {
        throw new Error(result.error.longMessage || result.error.message || 'Verification failed');
      }
    } catch (e: any) {
      const err = e.errors ? e.errors[0] : e;
      throw new Error(err.longMessage || err.message || 'Verification failed');
    }

    if (clerkSignUp.status === 'complete') {
      await clerkSignUp.createdSessionId;
      // Note: Clerk will automatically sign in the user via the session
    } else {
      throw new Error('Email verification did not complete sign-up. Status: ' + clerkSignUp.status);
    }
  };

  // ─── Sign Out ──────────────────────────────────────────────────────────
  const signOut = async () => {
    await clearStoredUsername();
    await clerkSignOut();
  };

  const getToken = async (): Promise<string | null> => {
    return clerkGetToken();
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, signIn, signUp, verifySignUpEmail, signOut, getToken }),
    [user, isLoading, clerkSignIn, clerkSignUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth() must be used inside an <AuthProvider>.');
  }
  return context;
}