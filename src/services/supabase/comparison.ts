import { supabase } from './client';
import { TABLE_NAMES } from './tables';

export const syncComparison = async (userId: string, comparison: string[]) => {
  const { data, error } = await supabase
    .from(TABLE_NAMES.COMPARISON)
    .upsert({ user_id: userId, neighborhood_ids: comparison }, { onConflict: 'user_id' });
  return { data, error };
};

export const getComparison = async (userId: string) => {
  const { data, error } = await supabase
    .from(TABLE_NAMES.COMPARISON)
    .select('neighborhood_ids')
    .eq('user_id', userId)
    .single();
  return { data, error };
};
