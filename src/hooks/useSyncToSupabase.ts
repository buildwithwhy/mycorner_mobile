import { useEffect, useRef } from 'react';
import { markPending, clearPending, clearAllPending } from '../services/syncQueue';
import logger from '../utils/logger';

interface SyncOptions {
  userId: string | undefined;
  dataLoaded: boolean;
  isSyncing: React.MutableRefObject<boolean>;
  isOnline?: boolean;
  debounceMs?: number;
}

/**
 * A reusable hook for syncing data to Supabase with debouncing.
 * Uses the "latest ref" pattern to avoid breaking debounce when syncFn changes.
 * Offline-aware: skips sync when offline, marks as pending, re-syncs on reconnect.
 */
export function useSyncToSupabase<T>(
  data: T,
  syncFn: () => Promise<{ error: Error | null }>,
  label: string,
  options: SyncOptions
) {
  const { userId, dataLoaded, isSyncing, isOnline = true, debounceMs = 500 } = options;

  const syncFnRef = useRef(syncFn);
  syncFnRef.current = syncFn;

  const isInitialMount = useRef(true);
  const wasOfflineRef = useRef(false);

  // Track offline→online transitions to force re-sync
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    // Just came back online — force re-sync if we have pending data
    if (wasOfflineRef.current && userId && dataLoaded && !isSyncing.current) {
      wasOfflineRef.current = false;
      logger.log(`Reconnected — flushing pending ${label} sync...`);
      syncFnRef.current().then(({ error }) => {
        if (error) {
          logger.error(`Error flushing ${label}:`, error);
          markPending(label);
        } else {
          clearAllPending(label);
        }
      });
    }
  }, [isOnline, userId, dataLoaded, label, isSyncing]);

  // Normal data change sync
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!userId || !dataLoaded || isSyncing.current) return;

    if (!isOnline) {
      markPending(label);
      return;
    }

    const syncTimer = setTimeout(async () => {
      logger.log(`Syncing ${label} to Supabase...`);
      const { error } = await syncFnRef.current();
      if (error) {
        logger.error(`Error syncing ${label}:`, error);
        markPending(label);
      } else {
        clearAllPending(label);
      }
    }, debounceMs);

    return () => clearTimeout(syncTimer);
  }, [data, userId, dataLoaded, label, debounceMs, isSyncing, isOnline]);
}

/**
 * A reusable hook for syncing record-based data (like status, notes, ratings)
 * where each entry needs to be synced individually.
 * Offline-aware: skips sync when offline, marks entries as pending, re-syncs on reconnect.
 */
export function useSyncRecordToSupabase<T>(
  data: Record<string, T>,
  syncEntryFn: (key: string, value: T) => Promise<{ error: Error | null }>,
  label: string,
  options: SyncOptions
) {
  const { userId, dataLoaded, isSyncing, isOnline = true, debounceMs = 500 } = options;

  const syncEntryFnRef = useRef(syncEntryFn);
  syncEntryFnRef.current = syncEntryFn;

  const prevDataRef = useRef<Record<string, T>>({});
  const isInitialMount = useRef(true);
  const wasOfflineRef = useRef(false);

  // Track offline→online transitions to force re-sync of all dirty entries
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    if (wasOfflineRef.current && userId && dataLoaded && !isSyncing.current) {
      wasOfflineRef.current = false;

      // Find all entries that differ from last successful sync
      const dirtyEntries: [string, T][] = [];
      for (const [key, value] of Object.entries(data)) {
        if (value !== prevDataRef.current[key]) {
          dirtyEntries.push([key, value]);
        }
      }

      if (dirtyEntries.length > 0) {
        logger.log(`Reconnected — flushing ${dirtyEntries.length} pending ${label} entries...`);
        (async () => {
          for (const [key, value] of dirtyEntries) {
            if (value) {
              const { error } = await syncEntryFnRef.current(key, value);
              if (error) {
                logger.error(`Error flushing ${label} for ${key}:`, error);
                markPending(label, key);
              } else {
                clearPending(label, key);
              }
            }
          }
          prevDataRef.current = { ...data };
        })();
      }
    }
  }, [isOnline, data, userId, dataLoaded, label, isSyncing]);

  // Normal data change sync
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevDataRef.current = { ...data };
      return;
    }

    if (!userId || !dataLoaded || isSyncing.current) return;

    const changedEntries: [string, T][] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== prevDataRef.current[key]) {
        changedEntries.push([key, value]);
      }
    }

    if (changedEntries.length === 0) return;

    if (!isOnline) {
      for (const [key] of changedEntries) {
        markPending(label, key);
      }
      return;
    }

    const syncTimer = setTimeout(async () => {
      logger.log(`Syncing ${label} to Supabase (${changedEntries.length} changed)...`);
      for (const [key, value] of changedEntries) {
        if (value) {
          const { error } = await syncEntryFnRef.current(key, value);
          if (error) {
            logger.error(`Error syncing ${label} for ${key}:`, error);
            markPending(label, key);
          } else {
            clearPending(label, key);
          }
        }
      }
      prevDataRef.current = { ...data };
    }, debounceMs);

    return () => clearTimeout(syncTimer);
  }, [data, userId, dataLoaded, label, debounceMs, isSyncing, isOnline]);
}
