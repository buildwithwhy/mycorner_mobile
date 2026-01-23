import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useCity } from './CityContext';
import { getUserDestinations, supabase } from '../services/supabase';
import logger from '../utils/logger';

export type TransportMode = 'transit' | 'walking' | 'cycling' | 'driving';

export interface Destination {
  id: string;
  cityId: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  transportMode: TransportMode;
}

interface DestinationRow {
  id: string;
  city_id?: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  transport_mode?: string;
}

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
  const pendingSyncRef = useRef<'add' | 'remove' | 'update' | null>(null);
  const pendingDataRef = useRef<Destination | string | null>(null);

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
          const dests: Destination[] = (destData as DestinationRow[]).map((d) => ({
            id: d.id,
            cityId: d.city_id || 'london', // Default to london for backwards compatibility
            label: d.label,
            address: d.address,
            latitude: d.latitude,
            longitude: d.longitude,
            transportMode: (d.transport_mode as TransportMode) || 'transit',
          }));
          setDestinations(dests);
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

  // Sync individual changes to Supabase (more efficient than delete-all/insert-all)
  const syncAddDestination = useCallback(async (destination: Destination) => {
    if (!user?.id || !dataLoaded) return;

    logger.log('Syncing new destination to Supabase...');
    const { error } = await supabase.from('user_destinations').insert({
      id: destination.id,
      user_id: user.id,
      city_id: destination.cityId,
      label: destination.label,
      address: destination.address,
      latitude: destination.latitude,
      longitude: destination.longitude,
      transport_mode: destination.transportMode,
    });

    if (error) {
      logger.error('Error syncing new destination:', error);
    }
  }, [user?.id, dataLoaded]);

  const syncRemoveDestination = useCallback(async (id: string) => {
    if (!user?.id || !dataLoaded) return;

    logger.log('Removing destination from Supabase...');
    const { error } = await supabase
      .from('user_destinations')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id);

    if (error) {
      logger.error('Error removing destination:', error);
    }
  }, [user?.id, dataLoaded]);

  const syncUpdateDestination = useCallback(async (id: string, updates: Partial<Omit<Destination, 'id'>>) => {
    if (!user?.id || !dataLoaded) return;

    logger.log('Updating destination in Supabase...');
    const dbUpdates: Record<string, unknown> = {};
    if (updates.cityId !== undefined) dbUpdates.city_id = updates.cityId;
    if (updates.label !== undefined) dbUpdates.label = updates.label;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
    if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
    if (updates.transportMode !== undefined) dbUpdates.transport_mode = updates.transportMode;

    const { error } = await supabase
      .from('user_destinations')
      .update(dbUpdates)
      .eq('user_id', user.id)
      .eq('id', id);

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

  return (
    <DestinationsContext.Provider
      value={{
        destinations,
        cityDestinations,
        addDestination,
        removeDestination,
        updateDestination,
      }}
    >
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
