import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  syncFavorites,
  getFavorites,
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

export type NeighborhoodStatus = 'shortlist' | 'want_to_visit' | 'visited' | 'living_here' | 'ruled_out' | null;

export interface Destination {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface AppContextType {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

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
  const [favorites, setFavorites] = useState<string[]>([]);
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
        setFavorites([]);
        setStatus({});
        setComparison([]);
        setNotes({});
        setDestinations([]);
        setUserRatings({});
        return;
      }

      // User logged in, load their data
      isSyncingRef.current = true;
      console.log('Loading user data from Supabase...');

      try {
        // Load favorites
        const { data: favData, error: favError } = await getFavorites(user.id);
        if (!favError && favData?.neighborhood_ids) {
          setFavorites(favData.neighborhood_ids);
        }

        // Load comparison list
        const { data: compData, error: compError } = await getComparison(user.id);
        if (!compError && compData?.neighborhood_ids) {
          setComparison(compData.neighborhood_ids);
        }

        // Load neighborhood statuses
        const { data: statusData, error: statusError } = await getUserNeighborhoodStatuses(user.id);
        if (!statusError && statusData) {
          const statusMap: Record<string, NeighborhoodStatus> = {};
          statusData.forEach((item: any) => {
            statusMap[item.neighborhood_id] = item.status as NeighborhoodStatus;
          });
          setStatus(statusMap);
        }

        // Load notes
        const { data: notesData, error: notesError } = await getUserNotes(user.id);
        if (!notesError && notesData) {
          const notesMap: Record<string, string> = {};
          notesData.forEach((item: any) => {
            notesMap[item.neighborhood_id] = item.note;
          });
          setNotes(notesMap);
        }

        // Load destinations
        const { data: destData, error: destError } = await getUserDestinations(user.id);
        if (!destError && destData) {
          const dests: Destination[] = destData.map((d: any) => ({
            id: d.id,
            label: d.label,
            address: d.address,
            latitude: d.latitude,
            longitude: d.longitude,
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
          ratingsData.forEach((item: any) => {
            ratingsMap[item.neighborhood_id] = {
              affordability: item.affordability,
              safety: item.safety,
              transit: item.transit,
              greenSpace: item.green_space,
              nightlife: item.nightlife,
              familyFriendly: item.family_friendly,
            };
          });
          setUserRatings(ratingsMap);
        }

        setDataLoaded(true);
        console.log('User data loaded successfully');
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    loadUserData();
  }, [user?.id]);

  // Sync favorites to Supabase when changed
  useEffect(() => {
    if (!user?.id || !dataLoaded || isSyncingRef.current) return;

    const syncTimer = setTimeout(async () => {
      console.log('Syncing favorites to Supabase...');
      const { error } = await syncFavorites(user.id, favorites);
      if (error) {
        console.error('Error syncing favorites:', error);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(syncTimer);
  }, [favorites, user?.id, dataLoaded]);

  // Sync comparison to Supabase when changed
  useEffect(() => {
    if (!user?.id || !dataLoaded || isSyncingRef.current) return;

    const syncTimer = setTimeout(async () => {
      console.log('Syncing comparison list to Supabase...');
      const { error } = await syncComparison(user.id, comparison);
      if (error) {
        console.error('Error syncing comparison:', error);
      }
    }, 500);

    return () => clearTimeout(syncTimer);
  }, [comparison, user?.id, dataLoaded]);

  // Sync neighborhood statuses to Supabase when changed
  useEffect(() => {
    if (!user?.id || !dataLoaded || isSyncingRef.current) return;

    const syncTimer = setTimeout(async () => {
      console.log('Syncing neighborhood statuses to Supabase...');
      // Sync each status entry
      for (const [neighborhoodId, statusValue] of Object.entries(status)) {
        if (statusValue) {
          const { error } = await syncNeighborhoodStatus(user.id, neighborhoodId, statusValue);
          if (error) {
            console.error(`Error syncing status for ${neighborhoodId}:`, error);
          }
        }
      }
    }, 500);

    return () => clearTimeout(syncTimer);
  }, [status, user?.id, dataLoaded]);

  // Sync neighborhood notes to Supabase when changed
  useEffect(() => {
    if (!user?.id || !dataLoaded || isSyncingRef.current) return;

    const syncTimer = setTimeout(async () => {
      console.log('Syncing neighborhood notes to Supabase...');
      // Sync each note entry
      for (const [neighborhoodId, note] of Object.entries(notes)) {
        if (note) {
          const { error } = await syncNeighborhoodNote(user.id, neighborhoodId, note);
          if (error) {
            console.error(`Error syncing note for ${neighborhoodId}:`, error);
          }
        }
      }
    }, 500);

    return () => clearTimeout(syncTimer);
  }, [notes, user?.id, dataLoaded]);

  // Sync destinations to Supabase when changed
  useEffect(() => {
    if (!user?.id || !dataLoaded || isSyncingRef.current) return;

    const syncTimer = setTimeout(async () => {
      console.log('Syncing destinations to Supabase...');
      const { error } = await syncDestinations(user.id, destinations);
      if (error) {
        console.error('Error syncing destinations:', error);
      }
    }, 500);

    return () => clearTimeout(syncTimer);
  }, [destinations, user?.id, dataLoaded]);

  // Sync user ratings to Supabase when changed
  useEffect(() => {
    if (!user?.id || !dataLoaded || isSyncingRef.current) return;

    const syncTimer = setTimeout(async () => {
      console.log('Syncing user ratings to Supabase...');
      // Sync each rating entry
      for (const [neighborhoodId, ratings] of Object.entries(userRatings)) {
        if (ratings && Object.keys(ratings).length > 0) {
          const { error } = await syncNeighborhoodRating(user.id, neighborhoodId, ratings);
          if (error) {
            console.error(`Error syncing ratings for ${neighborhoodId}:`, error);
          }
        }
      }
    }, 500);

    return () => clearTimeout(syncTimer);
  }, [userRatings, user?.id, dataLoaded]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  const isFavorite = (id: string) => favorites.includes(id);

  const setNeighborhoodStatus = (id: string, newStatus: NeighborhoodStatus) => {
    setStatus((prev) => ({ ...prev, [id]: newStatus }));
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
        favorites,
        toggleFavorite,
        isFavorite,
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
