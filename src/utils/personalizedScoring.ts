// Personalized Scoring Utility
// Calculates weighted scores for neighborhoods based on user preferences

import { Neighborhood } from '../data/neighborhoods';
import { ScoringPreferences, DEFAULT_PREFERENCES } from '../contexts/PreferencesContext';

export interface ScoredNeighborhood extends Neighborhood {
  personalizedScore: number;
  criteriaScores: {
    safety: number;
    affordability: number;
    transit: number;
    greenSpace: number;
    nightlife: number;
    familyFriendly: number;
    dining: number;
    vibe: number;
  };
}

// Convert vibe category to numeric score (1-5)
const vibeToScore = (vibe: 'happening' | 'moderate' | 'quiet'): number => {
  switch (vibe) {
    case 'happening': return 5;
    case 'moderate': return 3;
    case 'quiet': return 1;
    default: return 3;
  }
};

// Convert affordability (1-5, where 1 is expensive) to a score (higher = more affordable)
const normalizeAffordability = (value: number): number => {
  // Affordability 1 = expensive = low score, 5 = cheap = high score
  return value; // Already 1-5, higher is more affordable
};

// Calculate personalized score for a single neighborhood
export const calculatePersonalizedScore = (
  neighborhood: Neighborhood,
  preferences: ScoringPreferences
): ScoredNeighborhood => {
  // Get raw scores (all on 1-5 scale)
  const criteriaScores = {
    safety: neighborhood.safety,
    affordability: normalizeAffordability(neighborhood.affordability),
    transit: neighborhood.transit,
    greenSpace: neighborhood.greenSpace,
    nightlife: neighborhood.nightlife,
    familyFriendly: neighborhood.familyFriendly,
    dining: neighborhood.dining,
    vibe: vibeToScore(neighborhood.vibe),
  };

  // Only consider criteria with weight > 0
  const activeCriteria: { key: keyof typeof criteriaScores; weight: number; score: number }[] = [];

  if (preferences.safety > 0) {
    activeCriteria.push({ key: 'safety', weight: preferences.safety, score: criteriaScores.safety });
  }
  if (preferences.affordability > 0) {
    activeCriteria.push({ key: 'affordability', weight: preferences.affordability, score: criteriaScores.affordability });
  }
  if (preferences.transit > 0) {
    activeCriteria.push({ key: 'transit', weight: preferences.transit, score: criteriaScores.transit });
  }
  if (preferences.greenSpace > 0) {
    activeCriteria.push({ key: 'greenSpace', weight: preferences.greenSpace, score: criteriaScores.greenSpace });
  }
  if (preferences.nightlife > 0) {
    activeCriteria.push({ key: 'nightlife', weight: preferences.nightlife, score: criteriaScores.nightlife });
  }
  if (preferences.familyFriendly > 0) {
    activeCriteria.push({ key: 'familyFriendly', weight: preferences.familyFriendly, score: criteriaScores.familyFriendly });
  }
  if (preferences.dining > 0) {
    activeCriteria.push({ key: 'dining', weight: preferences.dining, score: criteriaScores.dining });
  }
  if (preferences.vibe > 0) {
    activeCriteria.push({ key: 'vibe', weight: preferences.vibe, score: criteriaScores.vibe });
  }

  // If no active criteria, return average score
  if (activeCriteria.length === 0) {
    const avgScore = Object.values(criteriaScores).reduce((sum, val) => sum + val, 0) / 8;
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
    // Square the weight to make high priorities more impactful
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
  // Use a non-linear mapping to differentiate scores better:
  // Score 1 → 20%, Score 2 → 40%, Score 3 → 60%, Score 4 → 80%, Score 5 → 100%
  // Then apply a curve to spread out the middle values more
  const basePercentage = ((scored.personalizedScore - 1) / 4) * 100;

  // Apply curve to spread values: scores below 3 get pulled down, above 3 get pushed up
  const midpoint = 50;
  const deviation = basePercentage - midpoint;
  const curvedPercentage = midpoint + (deviation * 1.3); // Amplify deviation from middle

  // Clamp to 0-100 range
  return Math.round(Math.max(0, Math.min(100, curvedPercentage)));
};

// Get the top criteria for a neighborhood (what it's best at)
export const getTopCriteria = (
  neighborhood: Neighborhood,
  count: number = 3
): { criterion: string; score: number }[] => {
  const criteria = [
    { criterion: 'safety', score: neighborhood.safety },
    { criterion: 'affordability', score: neighborhood.affordability },
    { criterion: 'transit', score: neighborhood.transit },
    { criterion: 'greenSpace', score: neighborhood.greenSpace },
    { criterion: 'nightlife', score: neighborhood.nightlife },
    { criterion: 'familyFriendly', score: neighborhood.familyFriendly },
    { criterion: 'dining', score: neighborhood.dining },
    { criterion: 'vibe', score: vibeToScore(neighborhood.vibe) },
  ];

  return criteria.sort((a, b) => b.score - a.score).slice(0, count);
};

// Criterion labels for display
const CRITERION_LABELS: Record<string, string> = {
  safety: 'Safety',
  affordability: 'Affordability',
  transit: 'Transit',
  greenSpace: 'Green Space',
  nightlife: 'Nightlife',
  familyFriendly: 'Family Friendly',
  dining: 'Dining',
  vibe: 'Local Scene',
};

// Get match reasons - explains why this neighborhood matches user preferences
export interface MatchReason {
  criterion: string;
  label: string;
  score: number;
  userWeight: number;
  isStrength: boolean; // true if neighborhood scores well in high-priority area
}

export const getMatchReasons = (
  neighborhood: Neighborhood,
  preferences: ScoringPreferences,
  maxReasons: number = 3
): MatchReason[] => {
  const criteriaScores = {
    safety: neighborhood.safety,
    affordability: neighborhood.affordability,
    transit: neighborhood.transit,
    greenSpace: neighborhood.greenSpace,
    nightlife: neighborhood.nightlife,
    familyFriendly: neighborhood.familyFriendly,
    dining: neighborhood.dining,
    vibe: vibeToScore(neighborhood.vibe),
  };

  // Calculate contribution of each criterion (weight * score)
  const contributions = Object.entries(criteriaScores).map(([key, score]) => {
    const weight = preferences[key as keyof ScoringPreferences];
    return {
      criterion: key,
      label: CRITERION_LABELS[key] || key,
      score,
      userWeight: weight,
      contribution: (weight / 100) * (score / 5), // Normalized contribution
      isStrength: score >= 4 && weight >= 50, // High score in important area
    };
  });

  // Sort by contribution (weight * score) to find most impactful matches
  const sorted = contributions
    .filter(c => c.userWeight > 30) // Only include criteria user cares about
    .sort((a, b) => b.contribution - a.contribution);

  return sorted.slice(0, maxReasons);
};
