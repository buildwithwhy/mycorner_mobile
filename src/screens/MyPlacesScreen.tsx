import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, SectionList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp, NeighborhoodStatus } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { neighborhoods, Neighborhood } from '../data/neighborhoods';
import { COLORS, STATUS_COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import { Heading, Subheading, Body, Caption } from '../components/Typography';
import { Button, EmptyState } from '../components';
import AffordabilityBadge from '../components/AffordabilityBadge';

interface StatusSection {
  status: NeighborhoodStatus;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  data: Neighborhood[];
}

const STATUS_CONFIG: { status: NonNullable<NeighborhoodStatus>; title: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { status: 'shortlist', title: 'Shortlist', icon: 'star', color: STATUS_COLORS.shortlist },
  { status: 'want_to_visit', title: 'Want to Visit', icon: 'bookmark', color: STATUS_COLORS.want_to_visit },
  { status: 'visited', title: 'Visited', icon: 'checkmark-circle', color: STATUS_COLORS.visited },
  { status: 'living_here', title: 'Living Here', icon: 'home', color: STATUS_COLORS.living_here },
  { status: 'ruled_out', title: 'Ruled Out', icon: 'close-circle', color: STATUS_COLORS.ruled_out },
];

export default function MyPlacesScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const { status, comparison, toggleComparison } = useApp();

  // Group neighborhoods by status
  const sections = useMemo(() => {
    const result: StatusSection[] = [];

    STATUS_CONFIG.forEach(({ status: statusValue, title, icon, color }) => {
      const neighborhoodIds = Object.entries(status)
        .filter(([_, s]) => s === statusValue)
        .map(([id]) => id);

      const neighborhoodsInSection = neighborhoods.filter(n => neighborhoodIds.includes(n.id));

      if (neighborhoodsInSection.length > 0) {
        result.push({
          status: statusValue,
          title,
          icon,
          color,
          data: neighborhoodsInSection,
        });
      }
    });

    return result;
  }, [status]);

  const totalPlaces = sections.reduce((acc, section) => acc + section.data.length, 0);

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Heading style={styles.title} color={COLORS.white}>My Places</Heading>
          <Body color={COLORS.white} style={styles.subtitle}>Track neighborhoods you're exploring</Body>
        </View>

        <View style={styles.signInPrompt}>
          <View style={styles.signInIconContainer}>
            <Ionicons name="bookmark" size={48} color={COLORS.primary} />
          </View>
          <Subheading style={styles.signInTitle}>Sign in to save places</Subheading>
          <Body color={COLORS.gray500} align="center" style={styles.signInText}>
            Create a free account to track neighborhoods you want to visit, shortlist favorites, and more.
          </Body>
          <Button
            title="Sign In"
            onPress={() => navigation.navigate('Login' as never)}
            size="large"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Heading style={styles.title} color={COLORS.white}>My Places</Heading>
        <Body color={COLORS.white} style={styles.subtitle}>
          {totalPlaces} {totalPlaces === 1 ? 'neighborhood' : 'neighborhoods'} saved
        </Body>
      </View>

      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: `${section.color}20` }]}>
                <Ionicons name={section.icon} size={18} color={section.color} />
              </View>
              <Subheading style={styles.sectionTitle}>{section.title}</Subheading>
              <Caption color={COLORS.gray400}>{section.data.length}</Caption>
            </View>
          )}
          renderItem={({ item: neighborhood, section }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Detail', { neighborhood })}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Body style={styles.cardTitle}>{neighborhood.name}</Body>
                    <Caption color={COLORS.gray500}>{neighborhood.borough}</Caption>
                  </View>
                  <View style={[styles.statusIndicator, { backgroundColor: section.color }]} />
                </View>

                <View style={styles.cardStats}>
                  <View style={styles.stat}>
                    <Ionicons name="cash-outline" size={14} color={COLORS.gray400} />
                    <AffordabilityBadge value={neighborhood.affordability} size="small" />
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="shield-checkmark" size={14} color={COLORS.gray400} />
                    <Caption style={styles.statText}>{neighborhood.safety}/5</Caption>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="bus" size={14} color={COLORS.gray400} />
                    <Caption style={styles.statText}>{neighborhood.transit}/5</Caption>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.compareButton, comparison.includes(neighborhood.id) && styles.compareButtonActive]}
                onPress={() => toggleComparison(neighborhood.id)}
              >
                <Ionicons
                  name={comparison.includes(neighborhood.id) ? 'git-compare' : 'git-compare-outline'}
                  size={18}
                  color={comparison.includes(neighborhood.id) ? COLORS.primary : COLORS.gray400}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          renderSectionFooter={() => <View style={styles.sectionFooter} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="bookmark-outline"
            title="No places saved yet"
            message="Tap the bookmark icon on any neighborhood to add it to your list"
          />
        </View>
      )}
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
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.9,
  },
  listContent: {
    padding: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    flex: 1,
  },
  sectionFooter: {
    height: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  cardContent: {
    flex: 1,
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: SPACING.sm,
    marginTop: 6,
  },
  cardStats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  compareButton: {
    padding: SPACING.md,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.gray100,
  },
  compareButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  signInText: {
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
});
