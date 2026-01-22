import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={COLORS.gray300} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.gray900,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.md,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
});
