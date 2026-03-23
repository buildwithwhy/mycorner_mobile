// Barrel re-export — preserves existing import paths
// e.g. import { signInWithEmail, supabase } from '../services/supabase'

// Client
export { supabase } from './client';

// Auth
export {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
  signOut,
  getSession,
} from './auth';

// Repositories
export { syncFavorites, getFavorites } from './favorites';
export { syncComparison, getComparison } from './comparison';
export { syncNeighborhoodStatus, getUserNeighborhoodStatuses } from './status';
export { syncNeighborhoodNote, getUserNotes } from './notes';
export { syncNeighborhoodRating, getUserNeighborhoodRatings } from './ratings';
export {
  getUserDestinations,
  addDestination,
  removeDestination,
  updateDestination,
} from './destinations';
export { deleteUserAccount } from './account';

// Transformers (for contexts that do their own row mapping)
export { destinationFromDb, ratingsFromDb } from './transformers';
