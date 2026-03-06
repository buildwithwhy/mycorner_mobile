// Preferences Context
// Stores user's neighborhood scoring preferences (weights for different criteria)

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';
import { METRICS } from '../config/metrics';
import type { MetricKey } from '../config/metrics';

const STORAGE_KEY = '@mycorner_preferences';

// Re-export MetricKey as ScoringCriterion for backwards compatibility
export type ScoringCriterion = MetricKey;

export interface ScoringPreferences {
  safety: number;        // 0-100
  affordability: number; // 0-100
  transit: number;       // 0-100
  greenSpace: number;    // 0-100
  nightlife: number;     // 0-100
  familyFriendly: number; // 0-100
  dining: number;        // 0-100
  vibe: number;          // 0-100 (preference for happening vs quiet)
}

// Default weights (equal importance)
export const DEFAULT_PREFERENCES: ScoringPreferences = {
  safety: 50,
  affordability: 50,
  transit: 50,
  greenSpace: 50,
  nightlife: 50,
  familyFriendly: 50,
  dining: 50,
  vibe: 50,
};

// Labels and icons derived from metrics config (single source of truth)
export const CRITERIA_INFO: Record<ScoringCriterion, { label: string; icon: string; description: string }> = Object.fromEntries(
  METRICS.map((m) => [m.key, { label: m.label, icon: m.icon, description: m.description }])
) as Record<ScoringCriterion, { label: string; icon: string; description: string }>;

interface PreferencesContextType {
  preferences: ScoringPreferences;
  setPreference: (criterion: ScoringCriterion, value: number) => void;
  setAllPreferences: (prefs: ScoringPreferences) => void;
  resetToDefaults: () => void;
  isLoading: boolean;
  hasCustomPreferences: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<ScoringPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from storage on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      logger.error('[Preferences] Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (prefs: ScoringPreferences) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      logger.error('[Preferences] Failed to save preferences:', error);
    }
  };

  const setPreference = useCallback((criterion: ScoringCriterion, value: number) => {
    setPreferences((prev) => {
      const updated = { ...prev, [criterion]: Math.max(0, Math.min(100, value)) };
      savePreferences(updated);
      return updated;
    });
  }, []);

  const setAllPreferences = useCallback((prefs: ScoringPreferences) => {
    setPreferences(prefs);
    savePreferences(prefs);
  }, []);

  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    savePreferences(DEFAULT_PREFERENCES);
  }, []);

  // Check if user has customized preferences
  const hasCustomPreferences = useMemo(() => {
    return Object.keys(DEFAULT_PREFERENCES).some(
      (key) => preferences[key as ScoringCriterion] !== DEFAULT_PREFERENCES[key as ScoringCriterion]
    );
  }, [preferences]);

  const value = useMemo(
    () => ({
      preferences,
      setPreference,
      setAllPreferences,
      resetToDefaults,
      isLoading,
      hasCustomPreferences,
    }),
    [preferences, setPreference, setAllPreferences, resetToDefaults, isLoading, hasCustomPreferences]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
