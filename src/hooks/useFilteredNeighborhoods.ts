import { useMemo } from 'react';
import { Neighborhood } from '../data/neighborhoods';
import { ScoringPreferences } from '../contexts/PreferencesContext';
import { scoreAndSortNeighborhoods, ScoredNeighborhood } from '../utils/personalizedScoring';
import { FILTERABLE_METRICS, SORTABLE_METRICS } from '../config/metrics';
import type { SortOption } from '../components/SortModal';
import type { MetricKey } from '../config/metrics';

export interface FilterConfig {
  searchQuery: string;
  filters: Record<string, number>;
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
  const { searchQuery, filters, sortBy, preferences, hasCustomPreferences } = config;

  // Filter neighborhoods by search query and metric filters
  const filtered = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();

    return neighborhoods.filter((n) => {
      const matchesSearch =
        searchQuery === '' ||
        n.name.toLowerCase().includes(searchLower) ||
        n.borough.toLowerCase().includes(searchLower) ||
        n.description.toLowerCase().includes(searchLower);

      const matchesFilters = FILTERABLE_METRICS.every((metric) => {
        const minValue = filters[metric.key] ?? 1;
        const neighborhoodValue = n[metric.key as keyof Neighborhood] as number;
        return neighborhoodValue >= minValue;
      });

      return matchesSearch && matchesFilters;
    });
  }, [neighborhoods, searchQuery, filters]);

  // Score once when user has custom preferences (reused by both sort and matchPercentages)
  const scoredNeighborhoods = useMemo(() => {
    if (!hasCustomPreferences) return null;
    return scoreAndSortNeighborhoods(filtered, preferences);
  }, [filtered, preferences, hasCustomPreferences]);

  // Sort filtered neighborhoods
  const filteredNeighborhoods = useMemo(() => {
    if (sortBy === 'bestMatch' && scoredNeighborhoods) {
      return scoredNeighborhoods;
    }

    const toSort = [...filtered];

    if (sortBy === 'name') {
      return toSort.sort((a, b) => a.name.localeCompare(b.name));
    }

    const metricKey = sortBy as MetricKey;
    if (SORTABLE_METRICS.some((m) => m.key === metricKey)) {
      return toSort.sort((a, b) => {
        const aVal = a[metricKey as keyof Neighborhood] as number;
        const bVal = b[metricKey as keyof Neighborhood] as number;
        return bVal - aVal;
      });
    }

    return toSort;
  }, [filtered, sortBy, scoredNeighborhoods]);

  // Derive match percentages from already-scored data (no re-scoring)
  const matchPercentages = useMemo(() => {
    if (!scoredNeighborhoods) return {};

    const total = scoredNeighborhoods.length;
    const percentages: Record<string, number> = {};
    scoredNeighborhoods.forEach((n, index) => {
      const percentileRank = Math.round(((total - index) / total) * 100);
      percentages[n.id] = Math.max(1, percentileRank);
    });

    return percentages;
  }, [scoredNeighborhoods]);

  const hasActiveFilters = FILTERABLE_METRICS.some((m) => (filters[m.key] ?? 1) > 1);

  return { filteredNeighborhoods, matchPercentages, hasActiveFilters };
}
