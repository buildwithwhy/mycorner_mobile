import { useMemo } from 'react';
import { Neighborhood } from '../data/neighborhoods';
import { ScoringPreferences } from '../contexts/PreferencesContext';
import { scoreAndSortNeighborhoods, ScoredNeighborhood } from '../utils/personalizedScoring';
import type { SortOption } from '../components/SortModal';

interface FilterConfig {
  searchQuery: string;
  minAffordability: number;
  minSafety: number;
  minTransit: number;
  sortBy: SortOption;
  preferences: ScoringPreferences;
  hasCustomPreferences: boolean;
}

interface UseFilteredNeighborhoodsReturn {
  filteredNeighborhoods: (Neighborhood | ScoredNeighborhood)[];
  matchPercentages: Record<string, number>;
  hasActiveFilters: boolean;
}

export function useFilteredNeighborhoods(
  neighborhoods: Neighborhood[],
  config: FilterConfig,
): UseFilteredNeighborhoodsReturn {
  const {
    searchQuery,
    minAffordability,
    minSafety,
    minTransit,
    sortBy,
    preferences,
    hasCustomPreferences,
  } = config;

  const filteredNeighborhoods = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();

    const filtered = neighborhoods.filter((n) => {
      const matchesSearch =
        searchQuery === '' ||
        n.name.toLowerCase().includes(searchLower) ||
        n.borough.toLowerCase().includes(searchLower) ||
        n.description.toLowerCase().includes(searchLower);

      const matchesAffordability = n.affordability >= minAffordability;
      const matchesSafety = n.safety >= minSafety;
      const matchesTransit = n.transit >= minTransit;

      return matchesSearch && matchesAffordability && matchesSafety && matchesTransit;
    });

    if (sortBy === 'bestMatch') {
      return scoreAndSortNeighborhoods(filtered, preferences);
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'affordability') return b.affordability - a.affordability;
      if (sortBy === 'safety') return b.safety - a.safety;
      if (sortBy === 'transit') return b.transit - a.transit;
      return 0;
    });
  }, [neighborhoods, searchQuery, sortBy, minAffordability, minSafety, minTransit, preferences]);

  // Calculate match percentages as ranking percentiles for display
  // Shows "Top X%" - how this neighborhood ranks among all neighborhoods based on preferences
  const matchPercentages = useMemo(() => {
    if (!hasCustomPreferences) return {};

    const scoredAndSorted = scoreAndSortNeighborhoods(filteredNeighborhoods, preferences);
    const total = scoredAndSorted.length;

    const percentages: Record<string, number> = {};
    scoredAndSorted.forEach((n, index) => {
      const percentileRank = Math.round(((total - index) / total) * 100);
      percentages[n.id] = Math.max(1, percentileRank);
    });

    return percentages;
  }, [filteredNeighborhoods, preferences, hasCustomPreferences]);

  const hasActiveFilters = minAffordability > 1 || minSafety > 1 || minTransit > 1;

  return { filteredNeighborhoods, matchPercentages, hasActiveFilters };
}
