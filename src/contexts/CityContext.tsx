import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cities, City, getCityById, DEFAULT_CITY_ID } from '../data/cities';
import { getNeighborhoodsByCity, Neighborhood } from '../data/neighborhoods';

const STORAGE_KEY_CITY = '@mycorner_selected_city';
const STORAGE_KEY_HAS_SELECTED = '@mycorner_has_selected_city';

interface CityContextType {
  // Current city state
  selectedCityId: string;
  selectedCity: City;
  setSelectedCity: (cityId: string) => void;

  // Available cities
  cities: City[];

  // Neighborhoods for current city
  cityNeighborhoods: Neighborhood[];

  // First-time city selection
  hasSelectedCity: boolean;
  showCityPicker: boolean;
  setShowCityPicker: (show: boolean) => void;
  confirmCitySelection: () => void;

  // Loading state
  isLoading: boolean;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

interface CityProviderProps {
  children: ReactNode;
}

export function CityProvider({ children }: CityProviderProps) {
  const [selectedCityId, setSelectedCityId] = useState<string>(DEFAULT_CITY_ID);
  const [hasSelectedCity, setHasSelectedCity] = useState<boolean>(true); // Default to true to avoid flash
  const [showCityPicker, setShowCityPicker] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load saved city preference on mount
  useEffect(() => {
    loadCityPreference();
  }, []);

  const loadCityPreference = async () => {
    try {
      const [savedCityId, hasSelected] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_CITY),
        AsyncStorage.getItem(STORAGE_KEY_HAS_SELECTED),
      ]);

      if (savedCityId && getCityById(savedCityId)) {
        setSelectedCityId(savedCityId);
      }

      // If user has never selected a city, show the picker
      if (hasSelected !== 'true') {
        setHasSelectedCity(false);
        setShowCityPicker(true);
      } else {
        setHasSelectedCity(true);
      }
    } catch (error) {
      console.error('Error loading city preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setSelectedCity = useCallback(async (cityId: string) => {
    const city = getCityById(cityId);
    if (!city) {
      console.warn(`City with id ${cityId} not found`);
      return;
    }

    setSelectedCityId(cityId);

    // Persist to AsyncStorage
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CITY, cityId);
    } catch (error) {
      console.error('Error saving city preference:', error);
    }
  }, []);

  const confirmCitySelection = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_HAS_SELECTED, 'true');
      setHasSelectedCity(true);
      setShowCityPicker(false);
    } catch (error) {
      console.error('Error confirming city selection:', error);
    }
  }, []);

  // Memoize the current city object
  const selectedCity = useMemo(
    () => getCityById(selectedCityId) || cities[0],
    [selectedCityId]
  );

  // Memoize neighborhoods for the current city
  const cityNeighborhoods = useMemo(
    () => getNeighborhoodsByCity(selectedCityId),
    [selectedCityId]
  );

  const value = useMemo<CityContextType>(() => ({
    selectedCityId,
    selectedCity,
    setSelectedCity,
    cities,
    cityNeighborhoods,
    hasSelectedCity,
    showCityPicker,
    setShowCityPicker,
    confirmCitySelection,
    isLoading,
  }), [
    selectedCityId,
    selectedCity,
    setSelectedCity,
    cityNeighborhoods,
    hasSelectedCity,
    showCityPicker,
    confirmCitySelection,
    isLoading,
  ]);

  // Don't render children until we've loaded preferences to prevent flash
  if (isLoading) {
    return null;
  }

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity(): CityContextType {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
}
