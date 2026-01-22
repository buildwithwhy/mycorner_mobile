import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { neighborhoods } from '../data/neighborhoods';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import NeighborhoodCard from '../components/NeighborhoodCard';

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
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

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Save your favorite neighborhoods</Text>
        </View>

        <View style={styles.signInPrompt}>
          <View style={styles.signInIconContainer}>
            <Ionicons name="heart" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.signInTitle}>Sign in to save favorites</Text>
          <Text style={styles.signInText}>
            Create a free account to save your favorite neighborhoods and access them anywhere.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('Login' as never)}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
                <NeighborhoodCard
                  key={neighborhood.id}
                  neighborhood={neighborhood}
                  onPress={() => navigation.navigate('Detail', { neighborhood })}
                  isFavorite={true}
                  isInComparison={comparison.includes(neighborhood.id)}
                  onToggleFavorite={() => toggleFavorite(neighborhood.id)}
                  onToggleComparison={() => toggleComparison(neighborhood.id)}
                  statusInfo={statusInfo || undefined}
                />
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
  signInPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  signInIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  signInTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  signInText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  signInButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxxl,
    alignItems: 'center',
  },
  signInButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
});
