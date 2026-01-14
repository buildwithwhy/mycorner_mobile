import React, { createContext, useContext, useState } from 'react';

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
