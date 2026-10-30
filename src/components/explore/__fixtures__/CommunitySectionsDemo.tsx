// Review-only demo screen for the community sections — NOT shipped app data.
// Renders every section state (full, sparse, empty) side by side so the
// resident and non-resident treatments can be reviewed before wiring into
// ExploreScreen. Nothing imports this file from app code.

import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { EventsSection } from '../EventsSection';
import { ShowcaseSection } from '../ShowcaseSection';
import {
  fullEvents,
  fullShowcases,
  sparseEvents,
  sparseShowcases,
} from './communityFixtures';
import { COLORS, SPACING, FONT_SIZES } from '../../../constants/theme';

function DemoLabel({ label }: { label: string }) {
  return <Text style={styles.label}>{label}</Text>;
}

export function CommunitySectionsDemo() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DemoLabel label="Resident · full data" />
      <EventsSection events={fullEvents} isResident />
      <ShowcaseSection showcases={fullShowcases} isResident />

      <DemoLabel label="Resident · sparse data (one item each)" />
      <EventsSection events={sparseEvents} isResident />
      <ShowcaseSection showcases={sparseShowcases} isResident />

      <DemoLabel label="Non-resident · full data (collapsed teasers, tap to expand)" />
      <EventsSection events={fullEvents} isResident={false} />
      <ShowcaseSection showcases={fullShowcases} isResident={false} />

      <DemoLabel label="No data — both sections render nothing" />
      <EventsSection events={[]} isResident />
      <ShowcaseSection showcases={[]} isResident={false} />
      <Text style={styles.noDataNote}>If nothing appears above, the empty state works.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  content: {
    paddingTop: SPACING.xl,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  noDataNote: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
});
