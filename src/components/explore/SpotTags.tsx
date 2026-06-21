import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';

/** Tag values that get the special air-conditioning chip treatment. */
export const AC_TAG = 'air-conditioned';
export const AC_TAG_LIKELY = 'air-conditioned-likely';

interface SpotTagsProps {
  tags?: string[];
  /** Extra style for the row (e.g. marginTop) so callers control spacing. */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Renders a spot's tags as chips. The two air-conditioning tags get a distinct
 * cool-blue chip with a snowflake so users can spot heat relief at a glance:
 * confirmed = solid fill, likely = outlined/faded.
 */
function SpotTagsComponent({ tags, containerStyle }: SpotTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <View style={[styles.tagsRow, containerStyle]}>
      {tags.map((tag) => {
        if (tag === AC_TAG) {
          return (
            <View key={tag} style={[styles.tagChip, styles.acChip]}>
              <Ionicons name="snow" size={11} color={COLORS.white} />
              <Text style={[styles.tagText, styles.acText]}>Air conditioned</Text>
            </View>
          );
        }
        if (tag === AC_TAG_LIKELY) {
          return (
            <View key={tag} style={[styles.tagChip, styles.acChipLikely]}>
              <Ionicons name="snow" size={11} color={COLORS.info} />
              <Text style={[styles.tagText, styles.acTextLikely]}>AC likely</Text>
            </View>
          );
        }
        return (
          <View key={tag} style={styles.tagChip}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        );
      })}
    </View>
  );
}

export const SpotTags = React.memo(SpotTagsComponent);

const styles = StyleSheet.create({
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tagChip: {
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray600,
  },
  // Confirmed AC: solid cool-blue fill, white text + icon.
  acChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.info,
  },
  acText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  // Likely AC: outlined / faded, blue text + icon.
  acChipLikely: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.infoLight,
    borderWidth: 1,
    borderColor: COLORS.info,
  },
  acTextLikely: {
    color: COLORS.info,
    fontWeight: '600',
  },
});
