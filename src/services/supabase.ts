// Supabase Service
// Handles all Supabase backend interactions: auth, database, real-time

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../config';

console.log('Supabase service loading...', {
  hasUrl: !!SUPABASE_URL,
  hasKey: !!SUPABASE_ANON_KEY,
  url: SUPABASE_URL,
  keyPrefix: SUPABASE_ANON_KEY?.substring(0, 20) + '...'
});

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

console.log('Supabase client initialized');

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
    console.log('signInWithGoogle: Starting OAuth flow');

    // Create redirect URI using the custom scheme
    const redirectUrl = Linking.createURL('auth/callback');
    console.log('signInWithGoogle: Redirect URL:', redirectUrl);

    // Get the OAuth URL from Supabase
    console.log('signInWithGoogle: Requesting OAuth URL from Supabase');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    console.log('signInWithGoogle: Supabase response:', { data, error });

    if (error) {
      console.error('signInWithGoogle: Supabase error:', error);
      return { data: null, error };
    }

    if (!data?.url) {
      console.error('signInWithGoogle: No OAuth URL received from Supabase');
      return { data: null, error: { message: 'No OAuth URL received from Supabase' } };
    }

    console.log('signInWithGoogle: Opening browser with URL:', data.url);

    // Open the OAuth URL in the browser
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl
    );

    console.log('signInWithGoogle: Browser result:', result);

    if (result.type === 'success') {
      // Extract the URL from the result
      const url = result.url;
      console.log('signInWithGoogle: Success URL:', url);

      // Parse the URL to get the tokens
      const params = new URL(url).searchParams;
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      console.log('signInWithGoogle: Tokens found:', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token
      });

      if (access_token && refresh_token) {
        // Set the session using the tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        console.log('signInWithGoogle: Session set result:', { sessionData, sessionError });
        return { data: sessionData, error: sessionError };
      }
    }

    console.log('signInWithGoogle: OAuth flow cancelled or failed');
    return { data: null, error: { message: 'OAuth flow was cancelled or failed' } };
  } catch (err) {
    console.error('signInWithGoogle: Exception caught:', err);
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

export default supabase;
