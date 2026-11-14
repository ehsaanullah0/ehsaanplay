import { User, Session, AuthError } from '@supabase/supabase-js';
import { getSupabaseClient } from './config';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error?: string | null;
}

export interface AuthResult {
  success: boolean;
  user?: User | null;
  message?: string;
  requiresEmailConfirmation?: boolean;
}

/**
 * Retrieves the current authenticated user
 */
export async function getCloudUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current session
 */
export async function getCloudSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getSession();
    return data?.session || null;
  } catch {
    return null;
  }
}

/**
 * Signs up a user in their personal Supabase project using Email & Password
 */
export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client is not configured.' };
  }

  if (!email || !email.includes('@')) {
    return { success: false, message: 'Please provide a valid email address.' };
  }

  if (!password || password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters.' };
  }

  try {
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      return { success: false, message: formatAuthError(error) };
    }

    // Check if email confirmation is required by this Supabase project
    const requiresEmailConfirmation = Boolean(
      data.user && !data.session && !data.user.confirmed_at
    );

    return {
      success: true,
      user: data.user,
      requiresEmailConfirmation,
      message: requiresEmailConfirmation
        ? 'Account created! Please check your email inbox to confirm your account before signing in.'
        : 'Account created and signed in successfully!',
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Sign up request failed.',
    };
  }
}

/**
 * Signs in a user using Email & Password
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client is not configured.' };
  }

  if (!email || !email.includes('@')) {
    return { success: false, message: 'Please provide a valid email address.' };
  }

  if (!password) {
    return { success: false, message: 'Please enter your password.' };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { success: false, message: formatAuthError(error) };
    }

    return {
      success: true,
      user: data.user,
      message: 'Signed in successfully!',
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Sign in request failed.',
    };
  }
}

/**
 * Signs out the current user and clears local auth token
 */
export async function signOutCloudUser(): Promise<AuthResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: true, message: 'Already signed out.' };
  }

  try {
    const { error } = await client.auth.signOut();
    if (error) {
      return { success: false, message: formatAuthError(error) };
    }
    return { success: true, message: 'Signed out successfully.' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Sign out failed.',
    };
  }
}

/**
 * Sends a password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<AuthResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client is not configured.' };
  }

  if (!email || !email.includes('@')) {
    return { success: false, message: 'Please provide a valid email address.' };
  }

  try {
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/#reset-password` : undefined,
    });

    if (error) {
      return { success: false, message: formatAuthError(error) };
    }

    return {
      success: true,
      message: 'Password reset link sent! Check your email inbox.',
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to send reset email.',
    };
  }
}

/**
 * Subscribes to auth state changes (sign in, sign out, token refresh)
 */
export function subscribeToAuthChanges(callback: (user: User | null, session: Session | null) => void): () => void {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null, session || null);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

/**
 * Helper to humanize Supabase Auth errors
 */
function formatAuthError(error: AuthError): string {
  const msg = error.message.toLowerCase();
  if (msg.includes('invalid login credentials')) {
    return 'Invalid email or password. Please verify your credentials.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Your email has not been confirmed yet. Please click the confirmation link sent to your inbox.';
  }
  if (msg.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('password should be at least')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  return error.message;
}
