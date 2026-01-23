import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  syncComparison,
  getComparison,
  syncNeighborhoodStatus,
  getUserNeighborhoodStatuses,
  syncNeighborhoodNote,
  getUserNotes,
  syncDestinations,
  getUserDestinations,
  syncNeighborhoodRating,
  getUserNeighborhoodRatings,
} from '../services/supabase';
import { useSyncToSupabase, useSyncRecordToSupabase } from '../hooks/useSyncToSupabase';
import logger from '../utils/logger';

export type NeighborhoodStatus = 'shortlist' | 'want_to_visit' | 'visited' | 'living_here' | 'ruled_out' | null;

export type TransportMode = 'transit' | 'walking' | 'cycling' | 'driving';

export interface Destination {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  transportMode: TransportMode;
}

// Supabase response types
interface NeighborhoodStatusRow {
  neighborhood_id: string;
  status: string;
}

interface NeighborhoodNoteRow {
  neighborhood_id: string;
  note: string;
}

interface DestinationRow {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  transport_mode?: string;
}

interface NeighborhoodRatingRow {
  neighborhood_id: string;
  affordability: number | null;
  safety: number | null;
  transit: number | null;
  green_space: number | null;
  nightlife: number | null;
  family_friendly: number | null;
}

interface AppContextType {
  status: Record<string, NeighborhoodStatus>;
  setNeighborhoodStatus: (id: string, status: NeighborhoodStatus) => void;
  getNeighborhoodsByStatus: (status: NeighborhoodStatus) => string[];

  comparison: string[];
  toggleComparison: (id: string) => void;
  isInComparison: (id: string) => boolean;
  clearComparison: () => void;

  notes: Record<string, string>;
  setNeighborhoodNote: (id: string, note: string) => void;

  photos: Record<string, string[]>;
  addNeighborhoodPhoto: (id: string, photoUri: string) => void;
  removeNeighborhoodPhoto: (id: string, photoUri: string) => void;

  userRatings: Record<string, Partial<{
    affordability: number;
    safety: number;
    transit: number;
    greenSpace: number;
    nightlife: number;
    familyFriendly: number;
  }>>;
  setUserRating: (id: string, metric: string, value: number) => void;

  destinations: Destination[];
  addDestination: (destination: Omit<Destination, 'id'>) => void;
  removeDestination: (id: string) => void;
  updateDestination: (id: string, destination: Partial<Omit<Destination, 'id'>>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Record<string, NeighborhoodStatus>>({});
  const [comparison, setComparison] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [userRatings, setUserRatings] = useState<Record<string, Partial<{
    affordability: number;
    safety: number;
    transit: number;
    greenSpace: number;
    nightlife: number;
    familyFriendly: number;
  }>>>({});
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Refs to track if we should sync (avoid syncing during initial load)
  const isSyncingRef = useRef(false);

  // Load user data from Supabase when user logs in
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id) {
        // User logged out, reset to empty state
        setDataLoaded(false);
        setStatus({});
        setComparison([]);
        setNotes({});
        setDestinations([]);
        setUserRatings({});
        return;
      }

      // User logged in, load their data
      isSyncingRef.current = true;
      logger.log('Loading user data from Supabase...');

      try {
        // Load comparison list
        const { data: compData, error: compError } = await getComparison(user.id);
        if (!compError && compData?.neighborhood_ids) {
          setComparison(compData.neighborhood_ids);
        }

        // Load neighborhood statuses
        const { data: statusData, error: statusError } = await getUserNeighborhoodStatuses(user.id);
        if (!statusError && statusData) {
          const statusMap: Record<string, NeighborhoodStatus> = {};
          (statusData as NeighborhoodStatusRow[]).forEach((item) => {
            statusMap[item.neighborhood_id] = item.status as NeighborhoodStatus;
          });
          setStatus(statusMap);
        }

        // Load notes
        const { data: notesData, error: notesError } = await getUserNotes(user.id);
        if (!notesError && notesData) {
          const notesMap: Record<string, string> = {};
          (notesData as NeighborhoodNoteRow[]).forEach((item) => {
            notesMap[item.neighborhood_id] = item.note;
          });
          setNotes(notesMap);
        }

        // Load destinations
        const { data: destData, error: destError } = await getUserDestinations(user.id);
        if (!destError && destData) {
          const dests: Destination[] = (destData as DestinationRow[]).map((d) => ({
            id: d.id,
            label: d.label,
            address: d.address,
            latitude: d.latitude,
            longitude: d.longitude,
            transportMode: (d.transport_mode as TransportMode) || 'transit',
          }));
          setDestinations(dests);
        }

        // Load user ratings
        const { data: ratingsData, error: ratingsError } = await getUserNeighborhoodRatings(user.id);
        if (!ratingsError && ratingsData) {
          const ratingsMap: Record<string, Partial<{
            affordability: number;
            safety: number;
            transit: number;
            greenSpace: number;
            nightlife: number;
            familyFriendly: number;
          }>> = {};
          (ratingsData as NeighborhoodRatingRow[]).forEach((item) => {
            ratingsMap[item.neighborhood_id] = {
              affordability: item.affordability ?? undefined,
              safety: item.safety ?? undefined,
              transit: item.transit ?? undefined,
              greenSpace: item.green_space ?? undefined,
              nightlife: item.nightlife ?? undefined,
              familyFriendly: item.family_friendly ?? undefined,
            };
          });
          setUserRatings(ratingsMap);
        }

        setDataLoaded(true);
        logger.log('User data loaded successfully');
      } catch (error) {
        logger.error('Error loading user data:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    loadUserData();
  }, [user?.id]);

  // Sync options shared by all sync hooks
  const syncOptions = {
    userId: user?.id,
    dataLoaded,
    isSyncing: isSyncingRef,
  };

  // Sync comparison to Supabase
  useSyncToSupabase(
    comparison,
    useCallback(async () => syncComparison(user?.id ?? '', comparison), [user?.id, comparison]),
    'comparison',
    syncOptions
  );

  // Sync destinations to Supabase
  useSyncToSupabase(
    destinations,
    useCallback(async () => syncDestinations(user?.id ?? '', destinations), [user?.id, destinations]),
    'destinations',
    syncOptions
  );

  // Sync neighborhood statuses to Supabase
  useSyncRecordToSupabase(
    status,
    useCallback(
      async (neighborhoodId: string, statusValue: NeighborhoodStatus) =>
        syncNeighborhoodStatus(user?.id ?? '', neighborhoodId, statusValue ?? ''),
      [user?.id]
    ),
    'statuses',
    syncOptions
  );

  // Sync neighborhood notes to Supabase
  useSyncRecordToSupabase(
    notes,
    useCallback(
      async (neighborhoodId: string, note: string) =>
        syncNeighborhoodNote(user?.id ?? '', neighborhoodId, note),
      [user?.id]
    ),
    'notes',
    syncOptions
  );

  // Sync user ratings to Supabase
  useSyncRecordToSupabase(
    userRatings,
    useCallback(
      async (neighborhoodId: string, ratings: typeof userRatings[string]) =>
        syncNeighborhoodRating(user?.id ?? '', neighborhoodId, ratings),
      [user?.id]
    ),
    'ratings',
    syncOptions
  );

  const setNeighborhoodStatus = (id: string, newStatus: NeighborhoodStatus) => {
    setStatus((prev) => {
      if (newStatus === null) {
        // Remove the entry when status is cleared
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: newStatus };
    });
  };

  const getNeighborhoodsByStatus = (filterStatus: NeighborhoodStatus) => {
    return Object.entries(status)
      .filter(([_, s]) => s === filterStatus)
      .map(([id, _]) => id);
  };

  const toggleComparison = (id: string) => {
    setComparison((prev) => {
      if (prev.includes(id)) {
        return prev.filter((compId) => compId !== id);
      }
      if (prev.length >= 3) {
        return prev; // Max 3 neighborhoods for comparison
      }
      return [...prev, id];
    });
  };

  const isInComparison = (id: string) => comparison.includes(id);

  const clearComparison = () => setComparison([]);

  const setNeighborhoodNote = (id: string, note: string) => {
    setNotes((prev) => ({ ...prev, [id]: note }));
  };

  const addNeighborhoodPhoto = (id: string, photoUri: string) => {
    setPhotos((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), photoUri],
    }));
  };

  const removeNeighborhoodPhoto = (id: string, photoUri: string) => {
    setPhotos((prev) => ({
      ...prev,
      [id]: (prev[id] || []).filter((uri) => uri !== photoUri),
    }));
  };

  const setUserRating = (id: string, metric: string, value: number) => {
    setUserRatings((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [metric]: value,
      },
    }));
  };

  const addDestination = (destination: Omit<Destination, 'id'>) => {
    const newDestination: Destination = {
      ...destination,
      id: Date.now().toString(),
    };
    setDestinations((prev) => [...prev, newDestination]);
  };

  const removeDestination = (id: string) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
  };

  const updateDestination = (id: string, updates: Partial<Omit<Destination, 'id'>>) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  return (
    <AppContext.Provider
      value={{
        status,
        setNeighborhoodStatus,
        getNeighborhoodsByStatus,
        comparison,
        toggleComparison,
        isInComparison,
        clearComparison,
        notes,
        setNeighborhoodNote,
        photos,
        addNeighborhoodPhoto,
        removeNeighborhoodPhoto,
        userRatings,
        setUserRating,
        destinations,
        addDestination,
        removeDestination,
        updateDestination,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
