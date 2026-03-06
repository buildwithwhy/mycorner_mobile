// Metric Configuration
// Single source of truth for all neighborhood metrics.
// Used by: FilterModal, SortModal, DetailScreen, PreferencesContext, personalizedScoring

import type { Ionicons } from '@expo/vector-icons';

export type MetricKey =
  | 'safety'
  | 'affordability'
  | 'transit'
  | 'greenSpace'
  | 'nightlife'
  | 'familyFriendly'
  | 'dining'
  | 'vibe';

export interface MetricConfig {
  key: MetricKey;
  label: string;
  shortLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  filterable: boolean;
  sortable: boolean;
  filterLabel?: string;
  sortDescription?: string;
  type: 'numeric' | 'categorical';
  variants?: { value: number; label: string }[];
}

export const METRICS: MetricConfig[] = [
  {
    key: 'safety',
    label: 'Safety',
    shortLabel: 'Safest',
    icon: 'shield-checkmark',
    description: 'Low crime rates and secure neighborhoods',
    filterable: true,
    sortable: true,
    filterLabel: 'Minimum Safety',
    sortDescription: 'Safest areas first',
    type: 'numeric',
  },
  {
    key: 'affordability',
    label: 'Affordability',
    shortLabel: 'Affordable',
    icon: 'cash-outline',
    description: 'Lower rent and cost of living',
    filterable: true,
    sortable: true,
    filterLabel: 'Maximum Cost',
    sortDescription: 'Most affordable first',
    type: 'numeric',
  },
  {
    key: 'transit',
    label: 'Transit',
    shortLabel: 'Transit',
    icon: 'bus',
    description: 'Easy access to public transportation',
    filterable: true,
    sortable: true,
    filterLabel: 'Minimum Transit',
    sortDescription: 'Best transit first',
    type: 'numeric',
  },
  {
    key: 'greenSpace',
    label: 'Green Space',
    shortLabel: 'Green',
    icon: 'leaf',
    description: 'Parks, gardens, and outdoor areas',
    filterable: false,
    sortable: false,
    type: 'numeric',
  },
  {
    key: 'nightlife',
    label: 'Nightlife',
    shortLabel: 'Nightlife',
    icon: 'wine',
    description: 'Bars, clubs, and evening entertainment',
    filterable: false,
    sortable: false,
    type: 'numeric',
  },
  {
    key: 'familyFriendly',
    label: 'Family Friendly',
    shortLabel: 'Family',
    icon: 'home',
    description: 'Schools, playgrounds, and family amenities',
    filterable: false,
    sortable: false,
    type: 'numeric',
  },
  {
    key: 'dining',
    label: 'Dining Scene',
    shortLabel: 'Dining',
    icon: 'restaurant',
    description: 'Restaurants, cafes, and food options',
    filterable: false,
    sortable: false,
    type: 'numeric',
  },
  {
    key: 'vibe',
    label: 'Local Scene',
    shortLabel: 'Vibe',
    icon: 'people',
    description: 'Events, markets, and community activity',
    filterable: false,
    sortable: false,
    type: 'categorical',
    variants: [
      { value: 1, label: 'Quiet' },
      { value: 3, label: 'Moderate' },
      { value: 5, label: 'Happening' },
    ],
  },
];

// Key-based lookup map
export const METRIC_MAP: Record<MetricKey, MetricConfig> = Object.fromEntries(
  METRICS.map((m) => [m.key, m])
) as Record<MetricKey, MetricConfig>;

// Derived subsets
export const FILTERABLE_METRICS = METRICS.filter((m) => m.filterable);
export const SORTABLE_METRICS = METRICS.filter((m) => m.sortable);
export const METRIC_KEYS: MetricKey[] = METRICS.map((m) => m.key);
