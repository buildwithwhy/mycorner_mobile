import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
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

// Sign in with Apple (native on iOS)
export const signInWithApple = async () => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { data: null, error: { message: 'No identity token received from Apple' } };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      logger.error('Supabase Apple sign-in error:', error);
      return { data: null, error };
    }

    // Apple only sends the name on the first sign-in, so update profile if available
    if (credential.fullName?.givenName) {
      const fullName = [credential.fullName.givenName, credential.fullName.familyName]
        .filter(Boolean)
        .join(' ');
      await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
    }

    return { data, error: null };
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'ERR_REQUEST_CANCELED') {
      return { data: null, error: { message: 'Sign in was cancelled' } };
    }
    logger.error('Apple sign-in exception:', err);
    return { data: null, error: err };
  }
};

// Check if Apple sign-in is available (iOS 13+)
export const isAppleSignInAvailable = Platform.OS === 'ios';

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

