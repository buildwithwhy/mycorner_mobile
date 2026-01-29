// Neighborhood Matcher Screen
// Helps users find their ideal neighborhood through text input or quiz

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { usePreferences, CRITERIA_INFO, ScoringCriterion } from '../contexts/PreferencesContext';
import { useCity } from '../contexts/AppContext';
import {
  parseTextToPreferences,
  calculatePreferencesFromQuiz,
  QUIZ_QUESTIONS,
  MatcherResult,
} from '../utils/neighborhoodMatcher';
import { getTopNeighborhoods, ScoredNeighborhood } from '../utils/personalizedScoring';

type ScreenMode = 'input' | 'quiz' | 'results';

export default function MatcherScreen() {
  const navigation = useNavigation();
  const { setAllPreferences } = usePreferences();
  const { cityNeighborhoods } = useCity();

  const [mode, setMode] = useState<ScreenMode>('input');
  const [textInput, setTextInput] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [matchResult, setMatchResult] = useState<MatcherResult | null>(null);
  const [topMatches, setTopMatches] = useState<ScoredNeighborhood[]>([]);

  // Handle text submission
  const handleTextSubmit = () => {
    if (textInput.trim().length < 10) return;

    const result = parseTextToPreferences(textInput);
    setMatchResult(result);

    // Get top matches using the parsed preferences
    const matches = getTopNeighborhoods(cityNeighborhoods, result.preferences, 5);
    setTopMatches(matches);
    setMode('results');
  };

  // Handle quiz answer selection
  const handleQuizAnswer = (optionIndex: number) => {
    const question = QUIZ_QUESTIONS[currentQuestionIndex];
    const newAnswers = { ...quizAnswers, [question.id]: optionIndex };
    setQuizAnswers(newAnswers);

    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Quiz complete - calculate results
      const preferences = calculatePreferencesFromQuiz(newAnswers);
      const matches = getTopNeighborhoods(cityNeighborhoods, preferences, 5);
      setTopMatches(matches);
      setMatchResult({
        preferences,
        detectedCriteria: [],
        confidence: 1,
      });
      setMode('results');
    }
  };

  // Apply preferences and go to home
  const handleApplyPreferences = () => {
    if (matchResult) {
      setAllPreferences(matchResult.preferences);
      navigation.goBack();
    }
  };

  // Reset and start over
  const handleStartOver = () => {
    setMode('input');
    setTextInput('');
    setQuizAnswers({});
    setCurrentQuestionIndex(0);
    setMatchResult(null);
    setTopMatches([]);
  };

  // Render text input mode
  const renderInputMode = () => (
    <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.heroSection}>
        <View style={styles.heroIcon}>
          <Ionicons name="search" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.heroTitle}>Find Your Perfect Neighborhood</Text>
        <Text style={styles.heroSubtitle}>
          Describe what you're looking for, and we'll match you with the best areas
        </Text>
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Describe your ideal neighborhood</Text>
        <TextInput
          style={styles.textInput}
          placeholder="E.g., I need a safe area with good schools and parks for my kids. Good transport links are important, but I don't care much about nightlife..."
          placeholderTextColor={COLORS.gray400}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={textInput}
          onChangeText={setTextInput}
        />
        <TouchableOpacity
          style={[styles.submitButton, textInput.trim().length < 10 && styles.submitButtonDisabled]}
          onPress={handleTextSubmit}
          disabled={textInput.trim().length < 10}
        >
          <Text style={styles.submitButtonText}>Find Matches</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity style={styles.quizButton} onPress={() => setMode('quiz')}>
        <View style={styles.quizButtonIcon}>
          <Ionicons name="list" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.quizButtonContent}>
          <Text style={styles.quizButtonTitle}>Answer a Few Questions</Text>
          <Text style={styles.quizButtonSubtitle}>Quick 5-question quiz to find your match</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={COLORS.gray400} />
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  // Render quiz mode
  const renderQuizMode = () => {
    const question = QUIZ_QUESTIONS[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / QUIZ_QUESTIONS.length) * 100;

    return (
      <View style={styles.content}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {QUIZ_QUESTIONS.length}
          </Text>
        </View>

        {/* Question */}
        <View style={styles.questionSection}>
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        {/* Options */}
        <ScrollView style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => handleQuizAnswer(index)}
            >
              <Text style={styles.optionText}>{option.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Back button */}
        {currentQuestionIndex > 0 && (
          <TouchableOpacity
            style={styles.backQuizButton}
            onPress={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.gray500} />
            <Text style={styles.backQuizButtonText}>Previous Question</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render results mode
  const renderResultsMode = () => (
    <ScrollView style={styles.content}>
      {/* Success header */}
      <View style={styles.resultsHeader}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
        </View>
        <Text style={styles.resultsTitle}>We Found Your Matches!</Text>
        {matchResult && matchResult.detectedCriteria.length > 0 && (
          <View style={styles.detectedCriteria}>
            <Text style={styles.detectedLabel}>Based on your priorities:</Text>
            <View style={styles.criteriaChips}>
              {matchResult.detectedCriteria
                .filter((c) => c.importance === 'high')
                .map((c) => (
                  <View key={c.criterion} style={styles.criteriaChip}>
                    <Ionicons
                      name={CRITERIA_INFO[c.criterion].icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text style={styles.criteriaChipText}>{CRITERIA_INFO[c.criterion].label}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}
      </View>

      {/* Top matches */}
      <View style={styles.matchesSection}>
        <Text style={styles.matchesSectionTitle}>Top Neighborhoods for You</Text>
        {topMatches.map((neighborhood, index) => (
          <TouchableOpacity
            key={neighborhood.id}
            style={styles.matchCard}
            onPress={() => navigation.navigate('Detail' as never, { neighborhood } as never)}
          >
            <View style={styles.matchRank}>
              <Text style={styles.matchRankText}>#{index + 1}</Text>
            </View>
            <View style={styles.matchInfo}>
              <Text style={styles.matchName}>{neighborhood.name}</Text>
              <Text style={styles.matchBorough}>{neighborhood.borough}</Text>
            </View>
            <View style={styles.matchScore}>
              <Text style={styles.matchScoreValue}>{neighborhood.personalizedScore.toFixed(1)}</Text>
              <Text style={styles.matchScoreLabel}>score</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.resultsActions}>
        <TouchableOpacity style={styles.applyButton} onPress={handleApplyPreferences}>
          <Ionicons name="checkmark" size={20} color={COLORS.white} />
          <Text style={styles.applyButtonText}>Apply These Preferences</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.startOverButton} onPress={handleStartOver}>
          <Ionicons name="refresh" size={20} color={COLORS.gray500} />
          <Text style={styles.startOverButtonText}>Start Over</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'input' ? 'Neighborhood Matcher' : mode === 'quiz' ? 'Quick Quiz' : 'Your Matches'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {mode === 'input' && renderInputMode()}
        {mode === 'quiz' && renderQuizMode()}
        {mode === 'results' && renderResultsMode()}
      </KeyboardAvoidingView>
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
  headerBackButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },

  // Hero section
  heroSection: {
    alignItems: 'center',
    padding: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  heroTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.gray900,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Input section
  inputSection: {
    padding: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.gray900,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: SPACING.md,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray200,
  },
  dividerText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray400,
    paddingHorizontal: SPACING.md,
  },

  // Quiz button
  quizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  quizButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  quizButtonContent: {
    flex: 1,
  },
  quizButtonTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  quizButtonSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },

  // Quiz mode
  progressContainer: {
    padding: SPACING.lg,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.gray200,
    borderRadius: 3,
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    textAlign: 'center',
  },
  questionSection: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  questionText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.gray900,
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
    padding: SPACING.lg,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray50,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  optionText: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
    color: COLORS.gray900,
  },
  backQuizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  backQuizButtonText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
  },

  // Results mode
  resultsHeader: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  successIcon: {
    marginBottom: SPACING.md,
  },
  resultsTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: SPACING.md,
  },
  detectedCriteria: {
    alignItems: 'center',
  },
  detectedLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
  },
  criteriaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  criteriaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  criteriaChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  matchesSection: {
    padding: SPACING.lg,
  },
  matchesSectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: SPACING.md,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.small,
  },
  matchRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  matchRankText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  matchBorough: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  matchScore: {
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  matchScoreValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  matchScoreLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
  },
  resultsActions: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  applyButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  startOverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  startOverButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray500,
  },

  bottomPadding: {
    height: SPACING.xxxl,
  },
});
