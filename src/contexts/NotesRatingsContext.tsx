import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  syncNeighborhoodNote,
  getUserNotes,
  syncNeighborhoodRating,
  getUserNeighborhoodRatings,
  ratingsFromDb,
} from '../services/supabase';
import { useSyncRecordToSupabase } from '../hooks/useSyncToSupabase';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import type { UserRatings, NeighborhoodNoteRow, NeighborhoodRatingRow } from '../types';
import logger from '../utils/logger';

interface NotesRatingsContextType {
  notes: Record<string, string>;
  setNeighborhoodNote: (id: string, note: string) => void;
  photos: Record<string, string[]>;
  addNeighborhoodPhoto: (id: string, photoUri: string) => void;
  removeNeighborhoodPhoto: (id: string, photoUri: string) => void;
  userRatings: UserRatings;
  setUserRating: (id: string, metric: string, value: number) => void;
}

const NotesRatingsContext = createContext<NotesRatingsContextType | undefined>(undefined);

const PHOTOS_STORAGE_KEY = '@mycorner_photos';

export function NotesRatingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [userRatings, setUserRatings] = useState<UserRatings>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const isSyncingRef = useRef(false);

  // Load photos from AsyncStorage on mount (device-local, not tied to user)
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const stored = await AsyncStorage.getItem(PHOTOS_STORAGE_KEY);
        if (stored) {
          setPhotos(JSON.parse(stored));
        }
      } catch (error) {
        logger.error('Error loading photos from AsyncStorage:', error);
      } finally {
        setPhotosLoaded(true);
      }
    };
    loadPhotos();
  }, []);

  // Persist photos to AsyncStorage when they change (debounced)
  useEffect(() => {
    if (!photosLoaded) return;

    const timer = setTimeout(() => {
      AsyncStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(photos)).catch((error) => {
        logger.error('Error saving photos to AsyncStorage:', error);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [photos, photosLoaded]);

  // Load data from Supabase when user logs in
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user?.id) {
        if (isMounted) {
          setDataLoaded(false);
          setNotes({});
          setUserRatings({});
          // Photos are local only, don't reset
        }
        return;
      }

      isSyncingRef.current = true;
      logger.log('Loading notes/ratings data...');

      try {
        // Load notes
        const { data: notesData, error: notesError } = await getUserNotes(user.id);
        if (!isMounted) return;
        if (!notesError && notesData) {
          const notesMap: Record<string, string> = {};
          (notesData as NeighborhoodNoteRow[]).forEach((item) => {
            notesMap[item.neighborhood_id] = item.note;
          });
          setNotes(notesMap);
        }

        // Load user ratings
        const { data: ratingsData, error: ratingsError } = await getUserNeighborhoodRatings(user.id);
        if (!isMounted) return;
        if (!ratingsError && ratingsData) {
          const ratingsMap: UserRatings = {};
          (ratingsData as NeighborhoodRatingRow[]).forEach((item) => {
            ratingsMap[item.neighborhood_id] = ratingsFromDb(item);
          });
          setUserRatings(ratingsMap);
        }

        if (isMounted) {
          setDataLoaded(true);
          logger.log('Notes/ratings data loaded');
        }
      } catch (error) {
        logger.error('Error loading notes/ratings data:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [user?.id]);

  const syncOptions = {
    userId: user?.id,
    dataLoaded,
    isSyncing: isSyncingRef,
    isOnline: isConnected !== false,
  };

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
      async (neighborhoodId: string, ratings: UserRatings[string]) =>
        syncNeighborhoodRating(user?.id ?? '', neighborhoodId, ratings),
      [user?.id]
    ),
    'ratings',
    syncOptions
  );

  const setNeighborhoodNote = useCallback((id: string, note: string) => {
    setNotes((prev) => ({ ...prev, [id]: note }));
  }, []);

  const addNeighborhoodPhoto = useCallback((id: string, photoUri: string) => {
    setPhotos((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), photoUri],
    }));
  }, []);

  const removeNeighborhoodPhoto = useCallback((id: string, photoUri: string) => {
    setPhotos((prev) => ({
      ...prev,
      [id]: (prev[id] || []).filter((uri) => uri !== photoUri),
    }));
  }, []);

  const setUserRating = useCallback((id: string, metric: string, value: number) => {
    setUserRatings((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [metric]: value,
      },
    }));
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    notes,
    setNeighborhoodNote,
    photos,
    addNeighborhoodPhoto,
    removeNeighborhoodPhoto,
    userRatings,
    setUserRating,
  }), [
    notes,
    setNeighborhoodNote,
    photos,
    addNeighborhoodPhoto,
    removeNeighborhoodPhoto,
    userRatings,
    setUserRating,
  ]);

  return (
    <NotesRatingsContext.Provider value={contextValue}>
      {children}
    </NotesRatingsContext.Provider>
  );
}

export function useNotesRatings() {
  const context = useContext(NotesRatingsContext);
  if (!context) {
    throw new Error('useNotesRatings must be used within NotesRatingsProvider');
  }
  return context;
}
