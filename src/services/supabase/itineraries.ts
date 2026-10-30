import { supabase } from './client';
import { TABLE_NAMES } from './tables';
import { itineraryToDb, itineraryFromDb } from './transformers';
import type { Itinerary, ItineraryDbRow } from '../../types';

/**
 * Sync the full local itinerary list to Supabase.
 * The local list is authoritative (same model as favorites): every current
 * itinerary is upserted, and remote rows no longer present locally were
 * deleted on this device and are removed remotely.
 */
export const syncItineraries = async (userId: string, itineraries: Itinerary[]) => {
  if (itineraries.length > 0) {
    const rows = itineraries.map((itinerary) => itineraryToDb(itinerary, userId));
    const { error } = await supabase
      .from(TABLE_NAMES.ITINERARIES)
      .upsert(rows, { onConflict: 'user_id,itinerary_id' });
    if (error) return { error };
  }

  // Remove rows deleted locally. Empty list → delete everything for the user.
  const deleteQuery = supabase.from(TABLE_NAMES.ITINERARIES).delete().eq('user_id', userId);
  const ids = itineraries.map((itinerary) => `"${itinerary.id}"`).join(',');
  const { error } =
    ids.length > 0
      ? await deleteQuery.not('itinerary_id', 'in', `(${ids})`)
      : await deleteQuery;
  return { error };
};

export const getItineraries = async (userId: string) => {
  const { data, error } = await supabase
    .from(TABLE_NAMES.ITINERARIES)
    .select(
      'itinerary_id, neighborhood_id, city_id, name, stops, total_walk_time, total_distance, client_updated_at'
    )
    .eq('user_id', userId);
  return { data: data as ItineraryDbRow[] | null, error };
};
