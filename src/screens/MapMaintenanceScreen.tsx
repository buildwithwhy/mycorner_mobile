// Temporary maintenance screen while Google Maps API key is being rotated
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';

export default function MapMaintenanceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="construct-outline" size={64} color={COLORS.gray400} />
        <Text style={styles.title}>Map Temporarily Unavailable</Text>
        <Text style={styles.message}>
          We're doing some maintenance on the map feature. It will be back soon!
        </Text>
        <Text style={styles.hint}>
          You can still browse neighborhoods from the Home tab.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  hint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
    textAlign: 'center',
  },
});
