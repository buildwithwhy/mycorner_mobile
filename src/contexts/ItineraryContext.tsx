import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useCity } from './CityContext';
import { syncItineraries, getItineraries, itineraryFromDb } from '../services/supabase';
import { useSyncToSupabase } from '../hooks/useSyncToSupabase';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import type { Itinerary, ItineraryDbRow } from '../types';
import logger from '../utils/logger';

const STORAGE_KEY = '@mycorner_itineraries';

/**
 * Merge local and remote itineraries — last-write-wins on updated_at.
 * Local AsyncStorage writes are the primary path, so a local copy that is
 * newer than its remote counterpart always wins; remote-only itineraries
 * (saved on another device) are added.
 */
export function mergeItineraries(local: Itinerary[], remote: Itinerary[]): Itinerary[] {
  const merged = new Map<string, Itinerary>();
  for (const itinerary of local) merged.set(itinerary.id, itinerary);
  for (const itinerary of remote) {
    const existing = merged.get(itinerary.id);
    if (!existing || itinerary.updatedAt > existing.updatedAt) {
      merged.set(itinerary.id, itinerary);
    }
  }
  return Array.from(merged.values());
}

interface ItineraryContextType {
  itineraries: Itinerary[];
  cityItineraries: Itinerary[];
  saveItinerary: (itinerary: Itinerary) => void;
  deleteItinerary: (id: string) => void;
}

const ItineraryContext = createContext<ItineraryContextType | null>(null);

export function ItineraryProvider({ children }: { children: React.ReactNode }) {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [localLoaded, setLocalLoaded] = useState(false);
  // Remote load must SUCCEED before any sync flush — otherwise a transient
  // fetch error on a fresh device could push an empty list and wipe the
  // user's cloud itineraries. Offline-created data flushes once the retry
  // (triggered by reconnect) succeeds.
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const { selectedCity } = useCity();
  const { user } = useAuth();
  const { isConnected } = useNetworkStatus();
  const isSyncingRef = useRef(false);
  const isOnline = isConnected !== false;

  // Load from AsyncStorage on mount — primary path; cloud is a mirror
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setItineraries(JSON.parse(stored));
        }
      } catch (error) {
        logger.error('Error loading itineraries:', error);
      } finally {
        setLocalLoaded(true);
      }
    };
    load();
  }, []);

  // Load remote itineraries when a user session appears, merging by LWW.
  // Re-runs on reconnect until the first successful load (retry path).
  useEffect(() => {
    let isMounted = true;

    const loadRemote = async () => {
      if (!user?.id) {
        if (isMounted) {
          setItineraries([]);
          setRemoteLoaded(false);
        }
        return;
      }

      isSyncingRef.current = true;
      logger.log('Loading itineraries from Supabase...');

      try {
        const { data, error } = await getItineraries(user.id);
        if (!isMounted) return;
        if (!error && data) {
          const remote = (data as ItineraryDbRow[]).map(itineraryFromDb);
          setItineraries((prev) => mergeItineraries(prev, remote));
          setRemoteLoaded(true);
          logger.log('Itineraries loaded');
        } else if (error) {
          logger.error('Error loading itineraries from Supabase:', error);
        }
      } catch (error) {
        logger.error('Error loading itineraries from Supabase:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    setRemoteLoaded(false);
    loadRemote();
    return () => { isMounted = false; };
  }, [user?.id, isOnline]);

  // Persist to AsyncStorage on changes (local write first, always)
  const persist = useCallback(async (updated: Itinerary[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      logger.error('Error saving itineraries:', error);
    }
  }, []);

  // Flush to Supabase when a session is available; offline writes are marked
  // pending and flushed on reconnect (syncQueue pattern). Gated on a
  // successful remote load so a failed fetch can never wipe cloud data.
  useSyncToSupabase(
    itineraries,
    useCallback(
      () => syncItineraries(user?.id ?? '', itineraries),
      [user?.id, itineraries]
    ),
    'itineraries',
    {
      userId: user?.id,
      dataLoaded: localLoaded && remoteLoaded,
      isSyncing: isSyncingRef,
      isOnline,
    }
  );

  const saveItinerary = useCallback((itinerary: Itinerary) => {
    setItineraries((prev) => {
      const existing = prev.findIndex((i) => i.id === itinerary.id);
      let updated: Itinerary[];
      if (existing >= 0) {
        updated = [...prev];
        updated[existing] = { ...itinerary, updatedAt: Date.now() };
      } else {
        updated = [...prev, { ...itinerary, createdAt: Date.now(), updatedAt: Date.now() }];
      }
      persist(updated);
      return updated;
    });
  }, [persist]);

  const deleteItinerary = useCallback((id: string) => {
    setItineraries((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const cityItineraries = useMemo(
    () => itineraries.filter((i) => i.cityId === selectedCity.id),
    [itineraries, selectedCity.id],
  );

  const value = useMemo(
    () => ({ itineraries, cityItineraries, saveItinerary, deleteItinerary }),
    [itineraries, cityItineraries, saveItinerary, deleteItinerary],
  );

  return (
    <ItineraryContext.Provider value={value}>
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItineraries() {
  const context = useContext(ItineraryContext);
  if (!context) {
    throw new Error('useItineraries must be used within an ItineraryProvider');
  }
  return context;
}
