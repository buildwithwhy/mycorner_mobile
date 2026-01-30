// Neighborhood Matcher Utility
// Parses natural language input and quiz answers to generate preference weights

import { ScoringPreferences, DEFAULT_PREFERENCES } from '../contexts/PreferencesContext';

// Keyword mappings for each criterion
const KEYWORD_MAPPINGS: Record<keyof ScoringPreferences, { positive: string[]; negative: string[] }> = {
  safety: {
    positive: ['safe', 'safety', 'secure', 'security', 'low crime', 'peaceful', 'calm'],
    negative: ['dangerous', 'unsafe', 'crime'],
  },
  affordability: {
    positive: ['affordable', 'cheap', 'budget', 'inexpensive', 'low cost', 'low rent', 'value', 'economical'],
    negative: ['expensive', 'pricey', 'luxury', 'upscale', 'premium'],
  },
  transit: {
    positive: ['transit', 'tube', 'metro', 'subway', 'bus', 'transport', 'commute', 'train', 'station', 'underground', 'public transport'],
    negative: ['car', 'drive', 'driving', 'parking'],
  },
  greenSpace: {
    positive: ['park', 'parks', 'green', 'nature', 'outdoor', 'outdoors', 'trees', 'garden', 'gardens', 'walking', 'running', 'jogging', 'dog'],
    negative: ['urban', 'concrete', 'city center'],
  },
  nightlife: {
    positive: ['nightlife', 'bars', 'clubs', 'pubs', 'going out', 'party', 'parties', 'social', 'entertainment', 'live music'],
    negative: ['quiet', 'peaceful', 'sleepy', 'residential'],
  },
  familyFriendly: {
    positive: ['family', 'families', 'kids', 'children', 'child', 'school', 'schools', 'playground', 'playgrounds', 'nursery', 'daycare', 'stroller', 'baby'],
    negative: ['single', 'no kids', 'childfree', 'young professional', 'young professionals'],
  },
  dining: {
    positive: ['restaurant', 'restaurants', 'dining', 'food', 'foodie', 'eat', 'eating', 'cuisine', 'culinary', 'cafe', 'cafes', 'brunch', 'takeaway', 'takeout', 'meals'],
    negative: ['cook at home', 'home cooking', 'no restaurants'],
  },
  vibe: {
    positive: ['lively', 'happening', 'vibrant', 'bustling', 'events', 'markets', 'festivals', 'community', 'active', 'energetic', 'buzzing'],
    negative: ['quiet', 'peaceful', 'calm', 'sleepy', 'relaxed', 'tranquil', 'serene'],
  },
};

// Phrases that indicate low importance
const LOW_IMPORTANCE_PHRASES = [
  "don't care",
  "dont care",
  "not important",
  "doesn't matter",
  "doesnt matter",
  "don't need",
  "dont need",
  "not interested",
  "no need for",
  "not looking for",
  "not worried about",
  "skip",
  "ignore",
];

// Phrases that indicate high importance
const HIGH_IMPORTANCE_PHRASES = [
  'must have',
  'need',
  'important',
  'essential',
  'priority',
  'looking for',
  'want',
  'love',
  'prefer',
  'ideal',
  'perfect',
];

export interface MatcherResult {
  preferences: ScoringPreferences;
  detectedCriteria: {
    criterion: keyof ScoringPreferences;
    importance: 'high' | 'low' | 'neutral';
    matchedKeywords: string[];
  }[];
  confidence: number; // 0-1 how confident we are in the parsing
}

/**
 * Parse natural language text to extract neighborhood preferences
 */
export function parseTextToPreferences(text: string): MatcherResult {
  const lowerText = text.toLowerCase();
  const preferences: ScoringPreferences = { ...DEFAULT_PREFERENCES };
  const detectedCriteria: MatcherResult['detectedCriteria'] = [];

  let totalMatches = 0;

  // Check each criterion
  for (const [criterion, keywords] of Object.entries(KEYWORD_MAPPINGS)) {
    const criterionKey = criterion as keyof ScoringPreferences;
    const matchedPositive: string[] = [];
    const matchedNegative: string[] = [];

    // Check positive keywords
    for (const keyword of keywords.positive) {
      if (lowerText.includes(keyword)) {
        matchedPositive.push(keyword);
      }
    }

    // Check negative keywords (these indicate user DOESN'T want this)
    for (const keyword of keywords.negative) {
      if (lowerText.includes(keyword)) {
        matchedNegative.push(keyword);
      }
    }

    // Check for "don't care about [criterion]" patterns
    const isLowImportance = LOW_IMPORTANCE_PHRASES.some((phrase) => {
      // Check if the phrase appears near criterion keywords
      const phraseIndex = lowerText.indexOf(phrase);
      if (phraseIndex === -1) return false;

      // Look for criterion keywords within 30 characters after the phrase
      const nearbyText = lowerText.slice(phraseIndex, phraseIndex + 50);
      return keywords.positive.some((kw) => nearbyText.includes(kw));
    });

    // Determine importance level
    let importance: 'high' | 'low' | 'neutral' = 'neutral';
    const allMatched = [...matchedPositive, ...matchedNegative];

    if (isLowImportance || matchedNegative.length > matchedPositive.length) {
      importance = 'low';
      preferences[criterionKey] = 10; // Very low weight
    } else if (matchedPositive.length > 0) {
      // Check if high importance phrases are nearby
      const hasHighImportance = HIGH_IMPORTANCE_PHRASES.some((phrase) => {
        const phraseIndex = lowerText.indexOf(phrase);
        if (phraseIndex === -1) return false;
        // Check if any positive keyword is within 40 chars of the phrase
        return matchedPositive.some((kw) => {
          const kwIndex = lowerText.indexOf(kw);
          return Math.abs(kwIndex - phraseIndex) < 40;
        });
      });

      importance = 'high';
      // Scale weight based on number of matches and importance phrases
      const baseWeight = hasHighImportance ? 100 : 80;
      preferences[criterionKey] = Math.min(100, baseWeight + matchedPositive.length * 5);
    }

    if (allMatched.length > 0 || isLowImportance) {
      totalMatches += allMatched.length;
      detectedCriteria.push({
        criterion: criterionKey,
        importance,
        matchedKeywords: allMatched,
      });
    }
  }

  // Calculate confidence based on how many criteria we detected
  const confidence = Math.min(1, totalMatches / 3); // 3+ matches = high confidence

  return {
    preferences,
    detectedCriteria,
    confidence,
  };
}

// Quiz question types
export interface QuizQuestion {
  id: string;
  question: string;
  options: {
    label: string;
    weights: Partial<ScoringPreferences>;
  }[];
}

// Quiz questions
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'priority',
    question: "What's most important to you in a neighborhood?",
    options: [
      { label: 'Safety & security', weights: { safety: 100, familyFriendly: 60 } },
      { label: 'Affordability', weights: { affordability: 100 } },
      { label: 'Good transport links', weights: { transit: 100 } },
      { label: 'Parks & green spaces', weights: { greenSpace: 100 } },
      { label: 'Nightlife & entertainment', weights: { nightlife: 100, vibe: 80 } },
      { label: 'Great food & restaurants', weights: { dining: 100 } },
    ],
  },
  {
    id: 'family',
    question: 'Do you have children or plan to in the near future?',
    options: [
      { label: 'Yes, I have kids', weights: { familyFriendly: 100, safety: 80, greenSpace: 60, nightlife: 20 } },
      { label: 'Planning to soon', weights: { familyFriendly: 80, safety: 70, greenSpace: 50 } },
      { label: 'No, and not planning to', weights: { familyFriendly: 20 } },
      { label: 'Not sure yet', weights: { familyFriendly: 50 } },
    ],
  },
  {
    id: 'commute',
    question: 'How do you typically get around?',
    options: [
      { label: 'Public transport (tube, bus, train)', weights: { transit: 100 } },
      { label: 'I drive', weights: { transit: 20 } },
      { label: 'Walking or cycling', weights: { greenSpace: 70, transit: 50 } },
      { label: 'Mix of everything', weights: { transit: 60 } },
    ],
  },
  {
    id: 'weekend',
    question: 'How do you like to spend your weekends?',
    options: [
      { label: 'Parks, nature, outdoor activities', weights: { greenSpace: 100, vibe: 30 } },
      { label: 'Bars, restaurants, going out', weights: { nightlife: 100, dining: 80, vibe: 70 } },
      { label: 'Family activities, playgrounds', weights: { familyFriendly: 100, greenSpace: 70 } },
      { label: 'Staying home, quiet neighborhood', weights: { safety: 80, vibe: 10 } },
    ],
  },
  {
    id: 'budget',
    question: "What's your budget priority?",
    options: [
      { label: 'Keep costs as low as possible', weights: { affordability: 100 } },
      { label: 'Balance of cost and quality', weights: { affordability: 60 } },
      { label: 'Willing to pay more for the right area', weights: { affordability: 30 } },
      { label: "Budget isn't a concern", weights: { affordability: 10 } },
    ],
  },
  {
    id: 'dining',
    question: 'How important is the local food scene?',
    options: [
      { label: 'Very important - I love eating out', weights: { dining: 100, nightlife: 60 } },
      { label: 'Nice to have good options nearby', weights: { dining: 70 } },
      { label: 'I mostly cook at home', weights: { dining: 30 } },
      { label: "Doesn't matter to me", weights: { dining: 10 } },
    ],
  },
  {
    id: 'vibe',
    question: 'What kind of local scene do you prefer?',
    options: [
      { label: 'Active - events, markets, community activities', weights: { vibe: 100, nightlife: 70 } },
      { label: 'Balanced - some activity but not too busy', weights: { vibe: 50 } },
      { label: 'Quiet - peaceful and residential', weights: { vibe: 10, safety: 60 } },
      { label: 'No preference', weights: { vibe: 50 } },
    ],
  },
];

/**
 * Calculate preferences from quiz answers
 */
export function calculatePreferencesFromQuiz(
  answers: Record<string, number> // questionId -> selected option index
): ScoringPreferences {
  const preferences: ScoringPreferences = { ...DEFAULT_PREFERENCES };
  const weightCounts: Record<keyof ScoringPreferences, number> = {
    safety: 0,
    affordability: 0,
    transit: 0,
    greenSpace: 0,
    nightlife: 0,
    familyFriendly: 0,
    dining: 0,
    vibe: 0,
  };

  // Collect all weights from answers
  for (const [questionId, optionIndex] of Object.entries(answers)) {
    const question = QUIZ_QUESTIONS.find((q) => q.id === questionId);
    if (!question || optionIndex < 0 || optionIndex >= question.options.length) continue;

    const selectedWeights = question.options[optionIndex].weights;
    for (const [criterion, weight] of Object.entries(selectedWeights)) {
      const key = criterion as keyof ScoringPreferences;
      // Average the weights if multiple questions affect the same criterion
      preferences[key] = preferences[key] + weight;
      weightCounts[key]++;
    }
  }

  // Average out criteria that were set multiple times
  for (const key of Object.keys(preferences) as (keyof ScoringPreferences)[]) {
    if (weightCounts[key] > 0) {
      preferences[key] = Math.round(preferences[key] / (weightCounts[key] + 1)); // +1 because we started with DEFAULT
    }
  }

  return preferences;
}
