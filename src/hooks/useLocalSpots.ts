import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { LocalSpot, SpotCategory } from '../types';
import type { NearbyPlaceResult } from '../services/googleMaps';
import { getCuratedSpots } from '../data/curatedSpots';
import { searchNearbyPlaces } from '../services/googleMaps';
import { getNeighborhoodCoordinates } from '../data/coordinates';
import { useFeatureAccess } from './useFeatureAccess';

interface UseLocalSpotsReturn {
  curatedSpots: LocalSpot[];
  nearbySpots: LocalSpot[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: SpotCategory | 'all';
  setSelectedCategory: (cat: SpotCategory | 'all') => void;
  refresh: () => void;
}

const mapToLocalSpot = (result: NearbyPlaceResult, neighborhoodId: string): LocalSpot => ({
  id: result.placeId,
  neighborhoodId,
  name: result.name,
  category: result.category,
  address: result.address,
  location: result.location,
  rating: result.rating,
  priceLevel: result.priceLevel,
  source: 'google_places',
  placeId: result.placeId,
});

// Simple in-memory cache for Google Places results (30 minute TTL)
const CACHE_TTL_MS = 30 * 60 * 1000;
const nearbyCache = new Map<string, { spots: LocalSpot[]; timestamp: number }>();

function getCachedNearby(neighborhoodId: string): LocalSpot[] | null {
  const entry = nearbyCache.get(neighborhoodId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    nearbyCache.delete(neighborhoodId);
    return null;
  }
  return entry.spots;
}

function setCachedNearby(neighborhoodId: string, spots: LocalSpot[]): void {
  nearbyCache.set(neighborhoodId, { spots, timestamp: Date.now() });
}

export function useLocalSpots(neighborhoodId: string): UseLocalSpotsReturn {
  const { getLimit } = useFeatureAccess();
  const nearbyLimit = getLimit('full_nearby_results') ?? 20;
  const [allNearbySpots, setAllNearbySpots] = useState<LocalSpot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SpotCategory | 'all'>('all');
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const activeRequestRef = useRef(0);

  // Load all curated spots for this neighborhood (unfiltered)
  const allCuratedSpots = useMemo(
    () => getCuratedSpots(neighborhoodId),
    [neighborhoodId],
  );

  // Fetch nearby spots from Google Places API
  useEffect(() => {
    if (!neighborhoodId) return;

    const requestId = ++activeRequestRef.current;
    let cancelled = false;

    const fetchNearby = async () => {
      // Check cache first (skip cache on manual refresh)
      if (fetchTrigger === 0) {
        const cached = getCachedNearby(neighborhoodId);
        if (cached) {
          setAllNearbySpots(cached);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const coords = getNeighborhoodCoordinates(neighborhoodId);
        const results = await searchNearbyPlaces(
          { lat: coords.latitude, lng: coords.longitude },
          { radius: 800, maxResults: 15 },
        );

        // Ignore stale responses
        if (cancelled || requestId !== activeRequestRef.current) return;

        const spots = results.map((r) => mapToLocalSpot(r, neighborhoodId));
        setCachedNearby(neighborhoodId, spots);
        setAllNearbySpots(spots);
      } catch (err) {
        if (cancelled || requestId !== activeRequestRef.current) return;

        const message = err instanceof Error ? err.message : 'Failed to fetch nearby places';
        setError(message);
        setAllNearbySpots([]);
      } finally {
        if (!cancelled && requestId === activeRequestRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchNearby();

    return () => {
      cancelled = true;
    };
  }, [neighborhoodId, fetchTrigger]);

  // Filter curated spots by selected category
  const curatedSpots = useMemo(() => {
    if (selectedCategory === 'all') return allCuratedSpots;
    return allCuratedSpots.filter((s) => s.category === selectedCategory);
  }, [allCuratedSpots, selectedCategory]);

  // Filter nearby spots by selected category and apply limit
  const nearbySpots = useMemo(() => {
    const filtered = selectedCategory === 'all'
      ? allNearbySpots
      : allNearbySpots.filter((s) => s.category === selectedCategory);
    return filtered.slice(0, nearbyLimit);
  }, [allNearbySpots, selectedCategory, nearbyLimit]);

  // Re-fetch Google Places data
  const refresh = useCallback(() => {
    setFetchTrigger((prev) => prev + 1);
  }, []);

  return {
    curatedSpots,
    nearbySpots,
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    refresh,
  };
}
