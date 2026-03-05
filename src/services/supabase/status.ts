import { supabase } from './client';
import { TABLE_NAMES } from './tables';

export const syncNeighborhoodStatus = async (
  userId: string,
  neighborhoodId: string,
  status: string
) => {
  const { data, error } = await supabase
    .from(TABLE_NAMES.STATUS)
    .upsert(
      { user_id: userId, neighborhood_id: neighborhoodId, status },
      { onConflict: 'user_id,neighborhood_id' }
    );
  return { data, error };
};

export const getUserNeighborhoodStatuses = async (userId: string) => {
  const { data, error } = await supabase
    .from(TABLE_NAMES.STATUS)
    .select('neighborhood_id, status')
    .eq('user_id', userId);
  return { data, error };
};
