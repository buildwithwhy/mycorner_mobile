import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, MODAL_STYLES } from '../constants/theme';
import { PremiumBadge } from './FeatureGate';
import type { FeatureKey } from '../config/subscriptions';

interface MatchModalProps {
  visible: boolean;
  onClose: () => void;
  hasCustomPreferences: boolean;
  requiresUpgrade: (feature: FeatureKey) => boolean;
  onNavigatePaywall: (source: string) => void;
  onNavigateMatcher: () => void;
  onNavigatePreferences: () => void;
}

export default function MatchModal({
  visible,
  onClose,
  hasCustomPreferences,
  requiresUpgrade,
  onNavigatePaywall,
  onNavigateMatcher,
  onNavigatePreferences,
}: MatchModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={MODAL_STYLES.overlay}>
        <View style={[MODAL_STYLES.content, styles.container]}>
          <View style={MODAL_STYLES.header}>
            <Text style={MODAL_STYLES.title}>Find Your Match</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.gray500} />
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onClose();
                if (requiresUpgrade('ai_matcher')) {
                  onNavigatePaywall('quiz');
                } else {
                  onNavigateMatcher();
                }
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="clipboard-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>Take the Quiz</Text>
                  {requiresUpgrade('ai_matcher') && <PremiumBadge />}
                </View>
                <Text style={styles.optionDescription}>
                  Answer a few quick questions about your lifestyle
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onClose();
                if (requiresUpgrade('ai_matcher')) {
                  onNavigatePaywall('ai_describe');
                } else {
                  onNavigateMatcher();
                }
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: COLORS.indigoLight }]}>
                <Ionicons name="chatbubble-outline" size={24} color={COLORS.indigo} />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>Describe What You Want</Text>
                  {requiresUpgrade('ai_matcher') && <PremiumBadge />}
                </View>
                <Text style={styles.optionDescription}>
                  Tell us in your own words what matters to you
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onClose();
                if (requiresUpgrade('personalized_scores')) {
                  onNavigatePaywall('preferences');
                } else {
                  onNavigatePreferences();
                }
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: COLORS.amberLight }]}>
                <Ionicons name="options-outline" size={24} color={COLORS.amberDark} />
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>Adjust Weights</Text>
                  {requiresUpgrade('personalized_scores') && <PremiumBadge />}
                </View>
                <Text style={styles.optionDescription}>
                  Fine-tune how important each factor is to you
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          </View>

          {hasCustomPreferences && (
            <View style={styles.status}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.statusText}>Your preferences are active</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 34,
  },
  options: {
    padding: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.gray50,
    borderRadius: 16,
    marginBottom: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  optionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.success,
  },
});
