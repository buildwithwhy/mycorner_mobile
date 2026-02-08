import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES } from '../constants/theme';

// Pre-defined array to avoid recreation on each render
const SYMBOL_INDICES = [0, 1, 2, 3, 4] as const;

interface AffordabilityBadgeProps {
  value: number; // 1-5 scale
  size?: 'small' | 'large';
}

function AffordabilityBadge({ value, size = 'small' }: AffordabilityBadgeProps) {
  const activeCount = 6 - value; // Convert: 5 (affordable) = 1 symbol, 1 (expensive) = 5 symbols

  return (
    <View style={styles.container}>
      {SYMBOL_INDICES.map((i) => (
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

export default memo(AffordabilityBadge);

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
