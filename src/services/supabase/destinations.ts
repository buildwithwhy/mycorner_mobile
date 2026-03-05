import { supabase } from './client';
import { TABLE_NAMES } from './tables';
import { destinationToDb, destinationUpdatesToDb } from './transformers';
import type { Destination } from '../../types';

export const getUserDestinations = async (userId: string) => {
  const { data, error } = await supabase
    .from(TABLE_NAMES.DESTINATIONS)
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};

export const addDestination = async (userId: string, destination: Destination) => {
  const { error } = await supabase
    .from(TABLE_NAMES.DESTINATIONS)
    .insert(destinationToDb(destination, userId));
  return { error };
};

export const removeDestination = async (userId: string, destinationId: string) => {
  const { error } = await supabase
    .from(TABLE_NAMES.DESTINATIONS)
    .delete()
    .eq('user_id', userId)
    .eq('id', destinationId);
  return { error };
};

export const updateDestination = async (
  userId: string,
  destinationId: string,
  updates: Partial<Omit<Destination, 'id'>>
) => {
  const { error } = await supabase
    .from(TABLE_NAMES.DESTINATIONS)
    .update(destinationUpdatesToDb(updates))
    .eq('user_id', userId)
    .eq('id', destinationId);
  return { error };
};
