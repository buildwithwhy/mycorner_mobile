import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpotCategory } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';

interface CategoryChipsProps {
  selectedCategory: SpotCategory | 'all';
  onSelectCategory: (category: SpotCategory | 'all') => void;
}

interface CategoryOption {
  key: SpotCategory | 'all';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: CategoryOption[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'cafe', label: 'Cafes', icon: 'cafe-outline' },
  { key: 'restaurant', label: 'Restaurants', icon: 'restaurant-outline' },
  { key: 'bar', label: 'Bars', icon: 'beer-outline' },
  { key: 'park', label: 'Parks', icon: 'leaf-outline' },
  { key: 'market', label: 'Markets', icon: 'cart-outline' },
  { key: 'museum', label: 'Museums', icon: 'business-outline' },
  { key: 'shop', label: 'Shops', icon: 'bag-outline' },
  { key: 'landmark', label: 'Landmarks', icon: 'flag-outline' },
];

function CategoryChipsComponent({
  selectedCategory,
  onSelectCategory,
}: CategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
    >
      {CATEGORIES.map((category) => {
        const isSelected = selectedCategory === category.key;
        return (
          <TouchableOpacity
            key={category.key}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelectCategory(category.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={category.icon}
              size={16}
              color={isSelected ? COLORS.white : COLORS.gray700}
            />
            <Text
              style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export const CategoryChips = React.memo(CategoryChipsComponent);

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.gray700,
  },
  chipLabelSelected: {
    color: COLORS.white,
  },
});
