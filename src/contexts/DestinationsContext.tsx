import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useCity } from './CityContext';
import {
  getUserDestinations,
  addDestination as dbAddDestination,
  removeDestination as dbRemoveDestination,
  updateDestination as dbUpdateDestination,
  destinationFromDb,
} from '../services/supabase';
import type { Destination, DestinationRow } from '../types';
import logger from '../utils/logger';

interface DestinationsContextType {
  destinations: Destination[];
  cityDestinations: Destination[]; // Filtered by current city
  addDestination: (destination: Omit<Destination, 'id' | 'cityId'>) => void; // cityId added automatically
  removeDestination: (id: string) => void;
  updateDestination: (id: string, destination: Partial<Omit<Destination, 'id'>>) => void;
}

const DestinationsContext = createContext<DestinationsContextType | undefined>(undefined);

export function DestinationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { selectedCityId } = useCity();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const isSyncingRef = useRef(false);

  // Filter destinations by current city
  const cityDestinations = useMemo(
    () => destinations.filter((d) => d.cityId === selectedCityId),
    [destinations, selectedCityId]
  );

  // Load data from Supabase when user logs in
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user?.id) {
        if (isMounted) {
          setDataLoaded(false);
          setDestinations([]);
        }
        return;
      }

      isSyncingRef.current = true;
      logger.log('Loading destinations data...');

      try {
        const { data: destData, error: destError } = await getUserDestinations(user.id);
        if (!isMounted) return;
        if (!destError && destData) {
          setDestinations((destData as DestinationRow[]).map(destinationFromDb));
        }

        if (isMounted) {
          setDataLoaded(true);
          logger.log('Destinations data loaded');
        }
      } catch (error) {
        logger.error('Error loading destinations data:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [user?.id]);

  // Sync individual changes to Supabase
  const syncAddDestination = useCallback(async (destination: Destination) => {
    if (!user?.id || !dataLoaded) return;

    logger.log('Syncing new destination to Supabase...');
    const { error } = await dbAddDestination(user.id, destination);
    if (error) {
      logger.error('Error syncing new destination:', error);
    }
  }, [user?.id, dataLoaded]);

  const syncRemoveDestination = useCallback(async (id: string) => {
    if (!user?.id || !dataLoaded) return;

    logger.log('Removing destination from Supabase...');
    const { error } = await dbRemoveDestination(user.id, id);
    if (error) {
      logger.error('Error removing destination:', error);
    }
  }, [user?.id, dataLoaded]);

  const syncUpdateDestination = useCallback(async (id: string, updates: Partial<Omit<Destination, 'id'>>) => {
    if (!user?.id || !dataLoaded) return;

    logger.log('Updating destination in Supabase...');
    const { error } = await dbUpdateDestination(user.id, id, updates);
    if (error) {
      logger.error('Error updating destination:', error);
    }
  }, [user?.id, dataLoaded]);

  const addDestination = useCallback((destination: Omit<Destination, 'id' | 'cityId'>) => {
    const newDestination: Destination = {
      ...destination,
      id: Date.now().toString(),
      cityId: selectedCityId, // Automatically assign to current city
    };
    setDestinations((prev) => [...prev, newDestination]);

    // Sync to Supabase
    syncAddDestination(newDestination);
  }, [syncAddDestination, selectedCityId]);

  const removeDestination = useCallback((id: string) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));

    // Sync to Supabase
    syncRemoveDestination(id);
  }, [syncRemoveDestination]);

  const updateDestination = useCallback((id: string, updates: Partial<Omit<Destination, 'id'>>) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );

    // Sync to Supabase
    syncUpdateDestination(id, updates);
  }, [syncUpdateDestination]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    destinations,
    cityDestinations,
    addDestination,
    removeDestination,
    updateDestination,
  }), [
    destinations,
    cityDestinations,
    addDestination,
    removeDestination,
    updateDestination,
  ]);

  return (
    <DestinationsContext.Provider value={contextValue}>
      {children}
    </DestinationsContext.Provider>
  );
}

export function useDestinations() {
  const context = useContext(DestinationsContext);
  if (!context) {
    throw new Error('useDestinations must be used within DestinationsProvider');
  }
  return context;
}
