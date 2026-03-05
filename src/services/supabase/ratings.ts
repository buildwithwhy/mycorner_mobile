import { supabase } from './client';
import { TABLE_NAMES } from './tables';
import { ratingsToDb } from './transformers';
import type { UserRatings } from '../../types';

export const syncNeighborhoodRating = async (
  userId: string,
  neighborhoodId: string,
  ratings: UserRatings[string]
) => {
  const dbRatings = ratingsToDb(userId, neighborhoodId, ratings);
  const { data, error } = await supabase
    .from(TABLE_NAMES.RATINGS)
    .upsert(dbRatings, { onConflict: 'user_id,neighborhood_id' });
  return { data, error };
};

export const getUserNeighborhoodRatings = async (userId: string) => {
  const { data, error } = await supabase
    .from(TABLE_NAMES.RATINGS)
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};
