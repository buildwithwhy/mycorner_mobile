import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import { neighborhoods } from '../data/neighborhoods';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const { favorites, toggleFavorite, comparison, toggleComparison, status } = useApp();

  const favoriteNeighborhoods = neighborhoods.filter((n) => favorites.includes(n.id));

  const getStatusIcon = (id: string) => {
    const s = status[id];
    if (s === 'shortlist') return { icon: 'star', color: '#f59e0b', label: 'Shortlist' };
    if (s === 'want_to_visit') return { icon: 'bookmark', color: '#3b82f6', label: 'Want to Visit' };
    if (s === 'visited') return { icon: 'checkmark-circle', color: '#6366f1', label: 'Visited' };
    if (s === 'living_here') return { icon: 'home', color: '#10b981', label: 'Living Here' };
    if (s === 'ruled_out') return { icon: 'close-circle', color: '#ef4444', label: 'Ruled Out' };
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>{favorites.length} neighborhoods saved</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {favoriteNeighborhoods.length > 0 ? (
          <View style={styles.content}>
            {favoriteNeighborhoods.map((neighborhood) => {
              const statusInfo = getStatusIcon(neighborhood.id);
              return (
                <View key={neighborhood.id} style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardContent}
                    onPress={() => navigation.navigate('Detail', { neighborhood })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardTitle}>{neighborhood.name}</Text>
                        <Text style={styles.cardBorough}>{neighborhood.borough}</Text>
                      </View>
                      {statusInfo && (
                        <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}15` }]}>
                          <Ionicons name={statusInfo.icon as any} size={16} color={statusInfo.color} />
                        </View>
                      )}
                    </View>

                    <Text style={styles.description} numberOfLines={2}>
                      {neighborhood.description}
                    </Text>

                    <View style={styles.highlights}>
                      {neighborhood.highlights.slice(0, 3).map((highlight, index) => (
                        <View key={index} style={styles.highlightTag}>
                          <Text style={styles.highlightText}>{highlight}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.stats}>
                      <View style={styles.stat}>
                        <Ionicons name="cash-outline" size={16} color="#6b7280" />
                        <View style={styles.affordabilityBadge}>
                          {[...Array(5)].map((_, i) => (
                            <Text
                              key={i}
                              style={[
                                styles.affordabilitySymbol,
                                i < (6 - neighborhood.affordability) && styles.affordabilitySymbolActive,
                              ]}
                            >
                              £
                            </Text>
                          ))}
                        </View>
                      </View>

                      <View style={styles.stat}>
                        <Ionicons name="shield-checkmark" size={16} color="#6b7280" />
                        <Text style={styles.statText}>{neighborhood.safety}/5</Text>
                      </View>

                      <View style={styles.stat}>
                        <Ionicons name="bus" size={16} color="#6b7280" />
                        <Text style={styles.statText}>{neighborhood.transit}/5</Text>
                      </View>

                      <View style={styles.stat}>
                        <Ionicons name="leaf" size={16} color="#6b7280" />
                        <Text style={styles.statText}>{neighborhood.greenSpace}/5</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.cardActionButton, styles.cardActionButtonFavorite]}
                      onPress={() => toggleFavorite(neighborhood.id)}
                    >
                      <Ionicons name="heart" size={18} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardActionButton, comparison.includes(neighborhood.id) && styles.cardActionButtonCompare]}
                      onPress={() => toggleComparison(neighborhood.id)}
                    >
                      <Ionicons
                        name={comparison.includes(neighborhood.id) ? 'git-compare' : 'git-compare-outline'}
                        size={18}
                        color={comparison.includes(neighborhood.id) ? '#6366f1' : '#6b7280'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>
              Tap the heart icon on neighborhoods to save them here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xl,
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.white,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  cardContent: {
    padding: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 4,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBorough: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
  },
  description: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  highlightTag: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
  },
  highlightText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.accentDark,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  affordabilityBadge: {
    flexDirection: 'row',
    gap: 1,
  },
  affordabilitySymbol: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.gray300,
  },
  affordabilitySymbolActive: {
    color: COLORS.primary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  cardActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  cardActionButtonFavorite: {
    backgroundColor: COLORS.favoriteLight,
    borderColor: COLORS.favoriteBorder,
  },
  cardActionButtonCompare: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.gray900,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
});
