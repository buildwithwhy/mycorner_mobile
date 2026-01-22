import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES } from '../constants/theme';

interface AffordabilityBadgeProps {
  value: number; // 1-5 scale
  size?: 'small' | 'large';
}

export default function AffordabilityBadge({ value, size = 'small' }: AffordabilityBadgeProps) {
  const activeCount = 6 - value; // Convert: 5 (affordable) = 1 symbol, 1 (expensive) = 5 symbols

  return (
    <View style={styles.container}>
      {[...Array(5)].map((_, i) => (
        <Text
          key={i}
          style={[
            size === 'large' ? styles.symbolLarge : styles.symbol,
            i < activeCount && styles.symbolActive,
          ]}
        >
          £
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 1,
  },
  symbol: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.gray300,
  },
  symbolLarge: {
    fontSize: FONT_SIZES.huge,
    fontWeight: 'bold',
    color: COLORS.gray300,
  },
  symbolActive: {
    color: COLORS.primary,
  },
});
