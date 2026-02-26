import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../contexts/ToastContext';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING, FONT_SIZES } from '../constants/theme';

export default function Toast() {
  const { toast } = useToast();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast.visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 80,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [toast.visible]);

  if (!toast.message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { transform: [{ translateY }], opacity },
      ]}
    >
      {toast.icon && (
        <Ionicons
          name={toast.icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={COLORS.white}
        />
      )}
      <Text style={styles.message}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 160,
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: COLORS.gray900,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.medium,
  },
  message: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
});
