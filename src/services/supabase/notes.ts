import { supabase } from './client';
import { TABLE_NAMES } from './tables';

export const syncNeighborhoodNote = async (
  userId: string,
  neighborhoodId: string,
  note: string
) => {
  const { data, error } = await supabase
    .from(TABLE_NAMES.NOTES)
    .upsert(
      { user_id: userId, neighborhood_id: neighborhoodId, note },
      { onConflict: 'user_id,neighborhood_id' }
    );
  return { data, error };
};

export const getUserNotes = async (userId: string) => {
  const { data, error } = await supabase
    .from(TABLE_NAMES.NOTES)
    .select('neighborhood_id, note')
    .eq('user_id', userId);
  return { data, error };
};
