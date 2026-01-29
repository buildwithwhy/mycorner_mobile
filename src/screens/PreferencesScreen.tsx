// Preferences Screen
// Allows users to set weights for neighborhood scoring criteria

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  usePreferences,
  ScoringCriterion,
  CRITERIA_INFO,
  DEFAULT_PREFERENCES,
} from '../contexts/PreferencesContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

export default function PreferencesScreen() {
  const navigation = useNavigation();
  const { preferences, setPreference, resetToDefaults, hasCustomPreferences } = usePreferences();
  const [localPreferences, setLocalPreferences] = useState(preferences);

  const criteria: ScoringCriterion[] = [
    'safety',
    'affordability',
    'transit',
    'greenSpace',
    'nightlife',
    'familyFriendly',
    'dining',
    'vibe',
  ];

  const handleSliderChange = (criterion: ScoringCriterion, value: number) => {
    setLocalPreferences((prev) => ({ ...prev, [criterion]: Math.round(value) }));
  };

  const handleSliderComplete = (criterion: ScoringCriterion, value: number) => {
    setPreference(criterion, Math.round(value));
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Preferences',
      'This will reset all your preferences to default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetToDefaults();
            setLocalPreferences(DEFAULT_PREFERENCES);
          },
        },
      ]
    );
  };

  const getImportanceLabel = (value: number): string => {
    if (value === 0) return 'Not Important';
    if (value <= 25) return 'Low';
    if (value <= 50) return 'Medium';
    if (value <= 75) return 'High';
    return 'Very High';
  };

  const getImportanceColor = (value: number): string => {
    if (value === 0) return COLORS.gray400;
    if (value <= 25) return COLORS.gray500;
    if (value <= 50) return COLORS.primary;
    if (value <= 75) return COLORS.warning;
    return COLORS.success;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Your Preferences</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Ionicons name="refresh" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introSection}>
          <Ionicons name="options" size={32} color={COLORS.primary} />
          <Text style={styles.introTitle}>Personalize Your Search</Text>
          <Text style={styles.introText}>
            Adjust the sliders to tell us what matters most to you. Neighborhoods will be scored and ranked based on your preferences.
          </Text>
        </View>

        {/* Criteria Sliders */}
        <View style={styles.slidersSection}>
          {criteria.map((criterion) => {
            const info = CRITERIA_INFO[criterion];
            const value = localPreferences[criterion];

            return (
              <View key={criterion} style={styles.criterionCard}>
                <View style={styles.criterionHeader}>
                  <View style={styles.criterionIcon}>
                    <Ionicons
                      name={info.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.criterionInfo}>
                    <Text style={styles.criterionLabel}>{info.label}</Text>
                    <Text style={styles.criterionDescription}>{info.description}</Text>
                  </View>
                </View>

                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={100}
                    step={5}
                    value={value}
                    onValueChange={(val) => handleSliderChange(criterion, val)}
                    onSlidingComplete={(val) => handleSliderComplete(criterion, val)}
                    minimumTrackTintColor={COLORS.primary}
                    maximumTrackTintColor={COLORS.gray200}
                    thumbTintColor={COLORS.primary}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={[styles.importanceLabel, { color: getImportanceColor(value) }]}>
                      {getImportanceLabel(value)}
                    </Text>
                    <Text style={styles.valueLabel}>{value}%</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Tip */}
        <View style={styles.tipSection}>
          <Ionicons name="bulb-outline" size={20} color={COLORS.warning} />
          <Text style={styles.tipText}>
            Tip: Set criteria you don't care about to 0% to exclude them from scoring.
          </Text>
        </View>

        {/* Apply Button */}
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.applyButtonText}>See My Matches</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  backButton: {
    padding: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
  },
  resetButton: {
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
  },
  introSection: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  introTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  introText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },
  slidersSection: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  criterionCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  criterionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  criterionIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  criterionInfo: {
    flex: 1,
  },
  criterionLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  criterionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  sliderContainer: {
    marginTop: SPACING.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -SPACING.sm,
  },
  importanceLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  valueLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  tipSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray700,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  applyButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  bottomPadding: {
    height: SPACING.xxxl,
  },
});
