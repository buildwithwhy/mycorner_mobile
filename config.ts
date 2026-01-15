// Configuration file for API keys and settings
// Environment variables are loaded from .env file and exposed via expo-constants

import Constants from 'expo-constants';

// To use Google Places Autocomplete and geocoding:
// 1. Get a Google Maps Platform API key from: https://console.cloud.google.com/
// 2. Enable these APIs: Places API, Geocoding API, Maps SDK
// 3. Add your key to .env file: GOOGLE_MAPS_API_KEY=your_key_here
// 4. Restart the Expo dev server to pick up the new environment variable

export const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || 'YOUR_GOOGLE_MAPS_API_KEY';

// Supabase configuration
export const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || '';
export const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || '';

// Note: After changing .env, you must restart the Expo dev server
// Development: npx expo start --clear
// For production, set environment variables in your build service (EAS Build, etc.)
