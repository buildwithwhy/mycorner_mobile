import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './client';
import logger from '../../utils/logger';

WebBrowser.maybeCompleteAuthSession();

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  return { data, error };
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Sign in with Google OAuth
export const signInWithGoogle = async () => {
  try {
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'mycorner',
      path: 'auth/callback',
    });

    logger.log('=== OAuth Debug ===');
    logger.log('Redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      logger.error('Supabase OAuth error:', error);
      return { data: null, error };
    }

    if (!data?.url) {
      logger.error('No OAuth URL received');
      return { data: null, error: { message: 'No OAuth URL received from Supabase' } };
    }

    logger.log('OAuth URL received, opening browser...');

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl
    );

    logger.log('Browser result type:', result.type);

    if (result.type === 'success') {
      const url = result.url;
      logger.log('Success! Redirect URL:', url);

      let access_token: string | null = null;
      let refresh_token: string | null = null;

      const urlObj = new URL(url);
      access_token = urlObj.searchParams.get('access_token');
      refresh_token = urlObj.searchParams.get('refresh_token');

      if (!access_token && urlObj.hash) {
        const hashParams = new URLSearchParams(urlObj.hash.substring(1));
        access_token = hashParams.get('access_token');
        refresh_token = hashParams.get('refresh_token');
      }

      logger.log('Tokens found:', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token
      });

      if (access_token && refresh_token) {
        logger.log('Setting session with tokens...');
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) {
          logger.error('Error setting session:', sessionError);
        } else {
          logger.log('Session set successfully!');
        }

        return { data: sessionData, error: sessionError };
      } else {
        logger.error('No tokens found in redirect URL. Full URL:', url);
        return { data: null, error: { message: 'Authentication succeeded but no tokens received. Please check Supabase redirect URL configuration.' } };
      }
    } else if (result.type === 'dismiss') {
      logger.log('User dismissed the OAuth browser');
      return { data: null, error: { message: 'Sign in was cancelled' } };
    } else {
      logger.log('OAuth result type:', result.type);
      return { data: null, error: { message: `OAuth flow ended with status: ${result.type}` } };
    }
  } catch (err) {
    logger.error('OAuth exception:', err);
    return { data: null, error: err };
  }
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Get current session
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
};

// Get current user
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { data, error };
};

// Reset password
export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'mycorner://auth/reset-password',
  });
  return { data, error };
};

// Update password
export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
};
