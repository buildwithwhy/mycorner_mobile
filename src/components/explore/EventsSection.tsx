import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EventSchedule, NeighborhoodEvent } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, SHADOWS } from '../../constants/theme';
import { EVENT_CATEGORY_ICONS } from '../../constants/categories';

/** Human-readable schedule line for an event row. */
export function formatEventSchedule(schedule: EventSchedule): string {
  if (schedule.kind === 'recurring') {
    return schedule.pattern;
  }
  return schedule.endDate
    ? `${schedule.startDate} – ${schedule.endDate}`
    : schedule.startDate;
}

interface EventsSectionProps {
  events: NeighborhoodEvent[];
  /** Resident of the neighborhood (living_here) sees events inline; visitors get a collapsed teaser. */
  isResident: boolean;
  onEventPress?: (event: NeighborhoodEvent) => void;
}

function EventsSectionComponent({ events, isResident, onEventPress }: EventsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  // A neighborhood with no events yet renders nothing — no empty-shell section.
  if (events.length === 0) {
    return null;
  }

  const renderItem = useCallback(
    ({ item }: { item: NeighborhoodEvent }) => {
      const iconName = EVENT_CATEGORY_ICONS[item.category] || EVENT_CATEGORY_ICONS.other;

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => onEventPress?.(item)}
          disabled={!onEventPress}
          activeOpacity={onEventPress ? 0.8 : 1}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Ionicons name={iconName} size={16} color={COLORS.primary} />
            </View>
            <View style={styles.scheduleBadge}>
              <Text style={styles.scheduleText} numberOfLines={1}>
                {formatEventSchedule(item.schedule)}
              </Text>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={styles.cardVenue} numberOfLines={1}>
            {item.venue}
          </Text>

          <Text style={styles.cardDescription} numberOfLines={3}>
            {item.description}
          </Text>
        </TouchableOpacity>
      );
    },
    [onEventPress]
  );

  const keyExtractor = useCallback((item: NeighborhoodEvent) => item.id, []);

  if (!isResident) {
    // Non-resident teaser: same content, one tap deeper.
    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.teaserHeader}
          onPress={toggleExpanded}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={18} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>Community</Text>
          <Text style={styles.teaserCount}>{events.length}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.gray500}
          />
        </TouchableOpacity>
        {expanded && (
          <FlatList
            data={events}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={ItemSeparator}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="calendar" size={18} color={COLORS.accent} />
        <Text style={styles.sectionTitle}>Local Events</Text>
      </View>
      <FlatList
        data={events}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ItemSeparator}
      />
    </View>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export const EventsSection = React.memo(EventsSectionComponent);

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
    flex: 1,
  },
  teaserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    ...SHADOWS.small,
  },
  teaserCount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
  },
  separator: {
    height: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleBadge: {
    flex: 1,
    alignItems: 'flex-end',
  },
  scheduleText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.accentDark,
    backgroundColor: COLORS.accentLight,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  cardVenue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.xs,
  },
  cardDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray600,
    lineHeight: 18,
  },
});
