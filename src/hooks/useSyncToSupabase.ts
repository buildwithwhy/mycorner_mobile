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
 * Uses the "latest ref" pattern to avoid breaking debounce when syncFn changes.
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

  // Use ref to always have latest syncFn without triggering effect
  const syncFnRef = useRef(syncFn);
  syncFnRef.current = syncFn;

  // Track if this is the initial mount to skip first sync
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip sync on initial mount - data was just loaded from server
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!userId || !dataLoaded || isSyncing.current) return;

    const syncTimer = setTimeout(async () => {
      logger.log(`Syncing ${label} to Supabase...`);
      const { error } = await syncFnRef.current();
      if (error) {
        logger.error(`Error syncing ${label}:`, error);
      }
    }, debounceMs);

    return () => clearTimeout(syncTimer);
  }, [data, userId, dataLoaded, label, debounceMs, isSyncing]);
}

/**
 * A reusable hook for syncing record-based data (like status, notes, ratings)
 * where each entry needs to be synced individually.
 * Uses the "latest ref" pattern to avoid breaking debounce when syncEntryFn changes.
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

  // Use ref to always have latest syncEntryFn without triggering effect
  const syncEntryFnRef = useRef(syncEntryFn);
  syncEntryFnRef.current = syncEntryFn;

  // Track previous data to only sync changed entries
  const prevDataRef = useRef<Record<string, T>>({});

  // Track if this is the initial mount to skip first sync
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip sync on initial mount - data was just loaded from server
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevDataRef.current = { ...data };
      return;
    }

    if (!userId || !dataLoaded || isSyncing.current) return;

    // Find which entries actually changed
    const changedEntries: [string, T][] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== prevDataRef.current[key]) {
        changedEntries.push([key, value]);
      }
    }

    // Nothing changed, skip sync
    if (changedEntries.length === 0) return;

    const syncTimer = setTimeout(async () => {
      logger.log(`Syncing ${label} to Supabase (${changedEntries.length} changed)...`);
      for (const [key, value] of changedEntries) {
        if (value) {
          const { error } = await syncEntryFnRef.current(key, value);
          if (error) {
            logger.error(`Error syncing ${label} for ${key}:`, error);
          }
        }
      }
      // Update prev data after successful sync
      prevDataRef.current = { ...data };
    }, debounceMs);

    return () => clearTimeout(syncTimer);
  }, [data, userId, dataLoaded, label, debounceMs, isSyncing]);
}
