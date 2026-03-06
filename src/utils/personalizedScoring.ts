// Personalized Scoring Utility
// Calculates weighted scores for neighborhoods based on user preferences

import { Neighborhood } from '../data/neighborhoods';
import { ScoringPreferences, DEFAULT_PREFERENCES } from '../contexts/PreferencesContext';
import { METRICS, METRIC_MAP, METRIC_KEYS } from '../config/metrics';
import type { MetricKey } from '../config/metrics';

export interface ScoredNeighborhood extends Neighborhood {
  personalizedScore: number;
  criteriaScores: Record<MetricKey, number>;
}

// Convert vibe category to numeric score (1-5)
export const vibeToScore = (vibe: 'happening' | 'moderate' | 'quiet'): number => {
  switch (vibe) {
    case 'happening': return 5;
    case 'moderate': return 3;
    case 'quiet': return 1;
    default: return 3;
  }
};

// Get the numeric score for a metric from a neighborhood
const getMetricScore = (neighborhood: Neighborhood, key: MetricKey): number => {
  const metric = METRIC_MAP[key];
  if (metric.type === 'categorical' && key === 'vibe') {
    return vibeToScore(neighborhood.vibe);
  }
  return neighborhood[key as keyof Neighborhood] as number;
};

// Build criteriaScores record from a neighborhood using config-driven iteration
const buildCriteriaScores = (neighborhood: Neighborhood): Record<MetricKey, number> => {
  return Object.fromEntries(
    METRIC_KEYS.map((key) => [key, getMetricScore(neighborhood, key)])
  ) as Record<MetricKey, number>;
};

// Calculate personalized score for a single neighborhood
export const calculatePersonalizedScore = (
  neighborhood: Neighborhood,
  preferences: ScoringPreferences
): ScoredNeighborhood => {
  const criteriaScores = buildCriteriaScores(neighborhood);

  // Only consider criteria with weight > 0
  const activeCriteria: { key: MetricKey; weight: number; score: number }[] = [];

  for (const key of METRIC_KEYS) {
    const weight = preferences[key];
    if (weight > 0) {
      activeCriteria.push({ key, weight, score: criteriaScores[key] });
    }
  }

  // If no active criteria, return average score
  if (activeCriteria.length === 0) {
    const avgScore = Object.values(criteriaScores).reduce((sum, val) => sum + val, 0) / METRIC_KEYS.length;
    return {
      ...neighborhood,
      personalizedScore: avgScore,
      criteriaScores,
    };
  }

  // Calculate weighted score using only active criteria
  // Use squared weights to amplify the effect of high-priority criteria
  let weightedSum = 0;
  let totalWeight = 0;

  for (const criterion of activeCriteria) {
    const effectiveWeight = Math.pow(criterion.weight / 100, 1.5) * 100;
    weightedSum += criterion.score * effectiveWeight;
    totalWeight += effectiveWeight;
  }

  const personalizedScore = weightedSum / totalWeight;

  return {
    ...neighborhood,
    personalizedScore: Math.round(personalizedScore * 10) / 10,
    criteriaScores,
  };
};

// Calculate personalized scores for all neighborhoods and sort by score
export const scoreAndSortNeighborhoods = (
  neighborhoods: Neighborhood[],
  preferences: ScoringPreferences
): ScoredNeighborhood[] => {
  const scored = neighborhoods.map((n) => calculatePersonalizedScore(n, preferences));
  return scored.sort((a, b) => b.personalizedScore - a.personalizedScore);
};

// Get top N neighborhoods by personalized score
export const getTopNeighborhoods = (
  neighborhoods: Neighborhood[],
  preferences: ScoringPreferences,
  count: number = 5
): ScoredNeighborhood[] => {
  const sorted = scoreAndSortNeighborhoods(neighborhoods, preferences);
  return sorted.slice(0, count);
};

// Calculate match percentage (how well a neighborhood matches preferences)
export const calculateMatchPercentage = (
  neighborhood: Neighborhood,
  preferences: ScoringPreferences
): number => {
  const scored = calculatePersonalizedScore(neighborhood, preferences);

  // Convert 1-5 score to percentage with better spread
  const basePercentage = ((scored.personalizedScore - 1) / 4) * 100;

  // Apply curve to spread values
  const midpoint = 50;
  const deviation = basePercentage - midpoint;
  const curvedPercentage = midpoint + (deviation * 1.3);

  return Math.round(Math.max(0, Math.min(100, curvedPercentage)));
};

// Get the top criteria for a neighborhood (what it's best at)
export const getTopCriteria = (
  neighborhood: Neighborhood,
  count: number = 3
): { criterion: string; score: number }[] => {
  const scores = buildCriteriaScores(neighborhood);
  const criteria = METRIC_KEYS.map((key) => ({ criterion: key, score: scores[key] }));
  return criteria.sort((a, b) => b.score - a.score).slice(0, count);
};

// Get match reasons - explains why this neighborhood matches user preferences
export interface MatchReason {
  criterion: string;
  label: string;
  score: number;
  userWeight: number;
  isStrength: boolean;
}

export const getMatchReasons = (
  neighborhood: Neighborhood,
  preferences: ScoringPreferences,
  maxReasons: number = 3
): MatchReason[] => {
  const criteriaScores = buildCriteriaScores(neighborhood);

  const contributions = METRIC_KEYS.map((key) => {
    const score = criteriaScores[key];
    const weight = preferences[key];
    return {
      criterion: key,
      label: METRIC_MAP[key].label,
      score,
      userWeight: weight,
      contribution: (weight / 100) * (score / 5),
      isStrength: score >= 4 && weight >= 50,
    };
  });

  const sorted = contributions
    .filter(c => c.userWeight > 30)
    .sort((a, b) => b.contribution - a.contribution);

  return sorted.slice(0, maxReasons);
};
