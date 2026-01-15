// Supabase Service
// Handles all Supabase backend interactions: auth, database, real-time

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../config';

WebBrowser.maybeCompleteAuthSession();

// Initialize Supabase client with AsyncStorage for session persistence
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Authentication Services
 */

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
    // Create proper redirect URI for Expo
    // This handles both Expo Go (development) and production builds
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'mycorner',
      path: 'auth/callback',
    });

    console.log('OAuth redirect URL:', redirectUrl);

    // Get the OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('Supabase OAuth error:', error);
      return { data: null, error };
    }

    if (!data?.url) {
      console.error('No OAuth URL received');
      return { data: null, error: { message: 'No OAuth URL received from Supabase' } };
    }

    console.log('Opening browser for OAuth...');

    // Open the OAuth URL in the browser
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl
    );

    console.log('Browser result:', result);

    if (result.type === 'success') {
      // Extract the URL from the result
      const url = result.url;
      console.log('Success redirect URL:', url);

      // Parse the URL to get the tokens
      // Handle both ?param=value and #param=value (hash fragments)
      let access_token: string | null = null;
      let refresh_token: string | null = null;

      // Try query parameters first
      const urlObj = new URL(url);
      access_token = urlObj.searchParams.get('access_token');
      refresh_token = urlObj.searchParams.get('refresh_token');

      // If not in query params, try hash fragment
      if (!access_token && urlObj.hash) {
        const hashParams = new URLSearchParams(urlObj.hash.substring(1));
        access_token = hashParams.get('access_token');
        refresh_token = hashParams.get('refresh_token');
      }

      console.log('Tokens found:', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token
      });

      if (access_token && refresh_token) {
        console.log('Setting session with tokens...');
        // Set the session using the tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
        } else {
          console.log('Session set successfully');
        }

        return { data: sessionData, error: sessionError };
      } else {
        console.error('No tokens in redirect URL');
      }
    } else {
      console.log('OAuth not successful, result type:', result.type);
    }

    return { data: null, error: { message: 'OAuth flow was cancelled or failed' } };
  } catch (err) {
    console.error('OAuth exception:', err);
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

/**
 * User Data Services
 */

// Sync user favorites
export const syncFavorites = async (userId: string, favorites: string[]) => {
  const { data, error } = await supabase
    .from('user_favorites')
    .upsert({ user_id: userId, neighborhood_ids: favorites }, { onConflict: 'user_id' });
  return { data, error };
};

// Get user favorites
export const getFavorites = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('neighborhood_ids')
    .eq('user_id', userId)
    .single();
  return { data, error };
};

// Sync user comparison list
export const syncComparison = async (userId: string, comparison: string[]) => {
  const { data, error } = await supabase
    .from('user_comparison')
    .upsert({ user_id: userId, neighborhood_ids: comparison }, { onConflict: 'user_id' });
  return { data, error };
};

// Get user comparison list
export const getComparison = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_comparison')
    .select('neighborhood_ids')
    .eq('user_id', userId)
    .single();
  return { data, error };
};

// Sync neighborhood status
export const syncNeighborhoodStatus = async (
  userId: string,
  neighborhoodId: string,
  status: string
) => {
  const { data, error } = await supabase
    .from('user_neighborhood_status')
    .upsert(
      { user_id: userId, neighborhood_id: neighborhoodId, status },
      { onConflict: 'user_id,neighborhood_id' }
    );
  return { data, error };
};

// Get all user neighborhood statuses
export const getUserNeighborhoodStatuses = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_neighborhood_status')
    .select('neighborhood_id, status')
    .eq('user_id', userId);
  return { data, error };
};

// Sync user notes for a neighborhood
export const syncNeighborhoodNote = async (
  userId: string,
  neighborhoodId: string,
  note: string
) => {
  const { data, error } = await supabase
    .from('user_neighborhood_notes')
    .upsert(
      { user_id: userId, neighborhood_id: neighborhoodId, note },
      { onConflict: 'user_id,neighborhood_id' }
    );
  return { data, error };
};

// Get user notes
export const getUserNotes = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_neighborhood_notes')
    .select('neighborhood_id, note')
    .eq('user_id', userId);
  return { data, error };
};

// Sync user destinations
export const syncDestinations = async (userId: string, destinations: any[]) => {
  // Delete existing destinations
  await supabase.from('user_destinations').delete().eq('user_id', userId);

  // Insert new destinations
  const { data, error } = await supabase.from('user_destinations').insert(
    destinations.map((dest) => ({
      user_id: userId,
      label: dest.label,
      address: dest.address,
      latitude: dest.latitude,
      longitude: dest.longitude,
    }))
  );
  return { data, error };
};

// Get user destinations
export const getUserDestinations = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_destinations')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};

// Sync user rating for a neighborhood
export const syncNeighborhoodRating = async (
  userId: string,
  neighborhoodId: string,
  ratings: {
    affordability?: number;
    safety?: number;
    transit?: number;
    greenSpace?: number;
    nightlife?: number;
    familyFriendly?: number;
  }
) => {
  // Convert camelCase to snake_case for database
  const dbRatings: any = {
    user_id: userId,
    neighborhood_id: neighborhoodId,
  };

  if (ratings.affordability !== undefined) dbRatings.affordability = ratings.affordability;
  if (ratings.safety !== undefined) dbRatings.safety = ratings.safety;
  if (ratings.transit !== undefined) dbRatings.transit = ratings.transit;
  if (ratings.greenSpace !== undefined) dbRatings.green_space = ratings.greenSpace;
  if (ratings.nightlife !== undefined) dbRatings.nightlife = ratings.nightlife;
  if (ratings.familyFriendly !== undefined) dbRatings.family_friendly = ratings.familyFriendly;

  const { data, error } = await supabase
    .from('user_neighborhood_ratings')
    .upsert(dbRatings, { onConflict: 'user_id,neighborhood_id' });
  return { data, error };
};

// Get all user neighborhood ratings
export const getUserNeighborhoodRatings = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_neighborhood_ratings')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};

export default supabase;
