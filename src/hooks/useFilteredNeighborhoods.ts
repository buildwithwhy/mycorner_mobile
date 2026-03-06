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

  const filteredNeighborhoods = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();

    const filtered = neighborhoods.filter((n) => {
      const matchesSearch =
        searchQuery === '' ||
        n.name.toLowerCase().includes(searchLower) ||
        n.borough.toLowerCase().includes(searchLower) ||
        n.description.toLowerCase().includes(searchLower);

      // Check all filterable metrics dynamically
      const matchesFilters = FILTERABLE_METRICS.every((metric) => {
        const minValue = filters[metric.key] ?? 1;
        const neighborhoodValue = n[metric.key as keyof Neighborhood] as number;
        return neighborhoodValue >= minValue;
      });

      return matchesSearch && matchesFilters;
    });

    if (sortBy === 'bestMatch') {
      return scoreAndSortNeighborhoods(filtered, preferences);
    }

    if (sortBy === 'name') {
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Sort by metric key (all sortable metrics use descending numeric sort)
    const metricKey = sortBy as MetricKey;
    if (SORTABLE_METRICS.some((m) => m.key === metricKey)) {
      return filtered.sort((a, b) => {
        const aVal = a[metricKey as keyof Neighborhood] as number;
        const bVal = b[metricKey as keyof Neighborhood] as number;
        return bVal - aVal;
      });
    }

    return filtered;
  }, [neighborhoods, searchQuery, sortBy, filters, preferences]);

  // Calculate match percentages as ranking percentiles for display
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

  const hasActiveFilters = FILTERABLE_METRICS.some((m) => (filters[m.key] ?? 1) > 1);

  return { filteredNeighborhoods, matchPercentages, hasActiveFilters };
}
