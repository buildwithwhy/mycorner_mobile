import { useEffect, useRef } from 'react';
import logger from '../utils/logger';

interface SyncOptions {
  userId: string | undefined;
  dataLoaded: boolean;
  isSyncing: React.MutableRefObject<boolean>;
  debounceMs?: number;
}

/**
 * A reusable hook for syncing data to Supabase with debouncing.
 *
 * @param data - The data to sync (used as dependency)
 * @param syncFn - The async function that performs the sync
 * @param label - Label for logging purposes
 * @param options - Sync options including userId, dataLoaded flag, and syncing ref
 */
export function useSyncToSupabase<T>(
  data: T,
  syncFn: () => Promise<{ error: Error | null }>,
  label: string,
  options: SyncOptions
) {
  const { userId, dataLoaded, isSyncing, debounceMs = 500 } = options;

  useEffect(() => {
    if (!userId || !dataLoaded || isSyncing.current) return;

    const syncTimer = setTimeout(async () => {
      logger.log(`Syncing ${label} to Supabase...`);
      const { error } = await syncFn();
      if (error) {
        logger.error(`Error syncing ${label}:`, error);
      }
    }, debounceMs);

    return () => clearTimeout(syncTimer);
  }, [data, userId, dataLoaded, syncFn, label, debounceMs, isSyncing]);
}

/**
 * A reusable hook for syncing record-based data (like status, notes, ratings)
 * where each entry needs to be synced individually.
 *
 * @param data - Record of data to sync
 * @param syncEntryFn - Function to sync a single entry
 * @param label - Label for logging purposes
 * @param options - Sync options
 */
export function useSyncRecordToSupabase<T>(
  data: Record<string, T>,
  syncEntryFn: (key: string, value: T) => Promise<{ error: Error | null }>,
  label: string,
  options: SyncOptions
) {
  const { userId, dataLoaded, isSyncing, debounceMs = 500 } = options;

  useEffect(() => {
    if (!userId || !dataLoaded || isSyncing.current) return;

    const syncTimer = setTimeout(async () => {
      logger.log(`Syncing ${label} to Supabase...`);
      for (const [key, value] of Object.entries(data)) {
        if (value) {
          const { error } = await syncEntryFn(key, value);
          if (error) {
            logger.error(`Error syncing ${label} for ${key}:`, error);
          }
        }
      }
    }, debounceMs);

    return () => clearTimeout(syncTimer);
  }, [data, userId, dataLoaded, syncEntryFn, label, debounceMs, isSyncing]);
}
