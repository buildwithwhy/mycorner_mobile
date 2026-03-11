import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

function SpotCardSkeletonComponent() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {/* Icon circle placeholder */}
      <View style={styles.iconCircle} />

      {/* Text lines placeholder */}
      <View style={styles.content}>
        <View style={styles.titleLine} />
        <View style={styles.subtitleLine} />
        <View style={styles.shortLine} />
      </View>

      {/* Button placeholder */}
      <View style={styles.buttonCircle} />
    </Animated.View>
  );
}

export const SpotCardSkeleton = React.memo(SpotCardSkeletonComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.xs,
    ...SHADOWS.small,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.gray200,
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
    marginRight: SPACING.sm,
    gap: SPACING.sm,
  },
  titleLine: {
    width: '70%',
    height: 14,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray200,
  },
  subtitleLine: {
    width: '90%',
    height: 12,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray200,
  },
  shortLine: {
    width: '40%',
    height: 12,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray200,
  },
  buttonCircle: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.gray200,
  },
});
