// Neighborhood Matcher Screen
// Helps users find their ideal neighborhood through text input or quiz

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';
import { usePreferences } from '../contexts/PreferencesContext';
import { useCity } from '../contexts/AppContext';
import {
  parseTextToPreferences,
  calculatePreferencesFromQuiz,
  QUIZ_QUESTIONS,
  MatcherResult,
} from '../utils/neighborhoodMatcher';
import { getTopNeighborhoods, ScoredNeighborhood } from '../utils/personalizedScoring';
import MatcherInputMode from '../components/matcher/MatcherInputMode';
import MatcherQuizMode from '../components/matcher/MatcherQuizMode';
import MatcherResultsMode from '../components/matcher/MatcherResultsMode';

type ScreenMode = 'input' | 'quiz' | 'results';

export default function MatcherScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
        {mode === 'input' && (
          <MatcherInputMode
            text={textInput}
            onTextChange={setTextInput}
            onSubmit={handleTextSubmit}
            onStartQuiz={() => setMode('quiz')}
            isLoading={false}
          />
        )}
        {mode === 'quiz' && (
          <MatcherQuizMode
            question={QUIZ_QUESTIONS[currentQuestionIndex]}
            questionIndex={currentQuestionIndex}
            totalQuestions={QUIZ_QUESTIONS.length}
            onAnswer={handleQuizAnswer}
            onBack={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
          />
        )}
        {mode === 'results' && matchResult && (
          <MatcherResultsMode
            detectedCriteria={matchResult.detectedCriteria}
            topMatches={topMatches}
            onApply={handleApplyPreferences}
            onRestart={handleStartOver}
            onViewDetail={(neighborhood) => navigation.navigate('Detail', { neighborhood })}
          />
        )}
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
});
