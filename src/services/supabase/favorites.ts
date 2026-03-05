import { supabase } from './client';
import { TABLE_NAMES } from './tables';

export const syncFavorites = async (userId: string, favorites: string[]) => {
  const { data, error } = await supabase
    .from(TABLE_NAMES.FAVORITES)
    .upsert({ user_id: userId, neighborhood_ids: favorites }, { onConflict: 'user_id' });
  return { data, error };
};

export const getFavorites = async (userId: string) => {
  const { data, error } = await supabase
    .from(TABLE_NAMES.FAVORITES)
    .select('neighborhood_ids')
    .eq('user_id', userId)
    .single();
  return { data, error };
};
