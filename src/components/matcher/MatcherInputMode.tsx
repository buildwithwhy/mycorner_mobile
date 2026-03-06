import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';

interface MatcherInputModeProps {
  text: string;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onStartQuiz: () => void;
  isLoading: boolean;
}

export default function MatcherInputMode({
  text,
  onTextChange,
  onSubmit,
  onStartQuiz,
  isLoading,
}: MatcherInputModeProps) {
  return (
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
          value={text}
          onChangeText={onTextChange}
        />
        <TouchableOpacity
          style={[styles.submitButton, text.trim().length < 10 && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={text.trim().length < 10}
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

      <TouchableOpacity style={styles.quizButton} onPress={onStartQuiz}>
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
}

const styles = StyleSheet.create({
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

  bottomPadding: {
    height: SPACING.xxxl,
  },
});
