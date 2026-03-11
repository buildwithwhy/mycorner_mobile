import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Itinerary } from '../types';
import { useCity } from './CityContext';
import logger from '../utils/logger';

const STORAGE_KEY = '@mycorner_itineraries';

interface ItineraryContextType {
  itineraries: Itinerary[];
  cityItineraries: Itinerary[];
  saveItinerary: (itinerary: Itinerary) => void;
  deleteItinerary: (id: string) => void;
}

const ItineraryContext = createContext<ItineraryContextType | null>(null);

export function ItineraryProvider({ children }: { children: React.ReactNode }) {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const { selectedCity } = useCity();

  // Load from AsyncStorage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setItineraries(JSON.parse(stored));
        }
      } catch (error) {
        logger.error('Error loading itineraries:', error);
      }
    };
    load();
  }, []);

  // Persist to AsyncStorage on changes
  const persist = useCallback(async (updated: Itinerary[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      logger.error('Error saving itineraries:', error);
    }
  }, []);

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
