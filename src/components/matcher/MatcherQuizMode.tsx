import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import type { QuizQuestion } from '../../utils/neighborhoodMatcher';

interface MatcherQuizModeProps {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (optionIndex: number) => void;
  onBack: () => void;
}

export default function MatcherQuizMode({
  question,
  questionIndex,
  totalQuestions,
  onAnswer,
  onBack,
}: MatcherQuizModeProps) {
  const progress = ((questionIndex + 1) / totalQuestions) * 100;

  return (
    <View style={styles.content}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Question {questionIndex + 1} of {totalQuestions}
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
            onPress={() => onAnswer(index)}
          >
            <Text style={styles.optionText}>{option.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Back button */}
      {questionIndex > 0 && (
        <TouchableOpacity
          style={styles.backQuizButton}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.gray500} />
          <Text style={styles.backQuizButtonText}>Previous Question</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
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
});
