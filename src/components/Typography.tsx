import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';

interface TypographyProps {
  children: React.ReactNode;
  style?: TextStyle;
  color?: string;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
}

/**
 * Large page titles
 * Use for: Screen headers, main titles
 */
export function Heading({ children, style, color, align = 'left', numberOfLines }: TypographyProps) {
  return (
    <Text
      style={[
        styles.heading,
        color && { color },
        { textAlign: align },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

/**
 * Section titles
 * Use for: Card titles, section headers
 */
export function Subheading({ children, style, color, align = 'left', numberOfLines }: TypographyProps) {
  return (
    <Text
      style={[
        styles.subheading,
        color && { color },
        { textAlign: align },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

/**
 * Standard body text
 * Use for: Paragraphs, descriptions, general content
 */
export function Body({ children, style, color, align = 'left', numberOfLines }: TypographyProps) {
  return (
    <Text
      style={[
        styles.body,
        color && { color },
        { textAlign: align },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

/**
 * Secondary body text (smaller)
 * Use for: Supporting text, metadata
 */
export function BodySmall({ children, style, color, align = 'left', numberOfLines }: TypographyProps) {
  return (
    <Text
      style={[
        styles.bodySmall,
        color && { color },
        { textAlign: align },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

/**
 * Small caption text
 * Use for: Labels, timestamps, fine print
 */
export function Caption({ children, style, color, align = 'left', numberOfLines }: TypographyProps) {
  return (
    <Text
      style={[
        styles.caption,
        color && { color },
        { textAlign: align },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

/**
 * Form labels
 * Use for: Input labels, form field names
 */
export function Label({ children, style, color, align = 'left', numberOfLines }: TypographyProps) {
  return (
    <Text
      style={[
        styles.label,
        color && { color },
        { textAlign: align },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.gray900,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.gray900,
  },
  body: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.gray700,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.gray500,
    lineHeight: 20,
  },
  caption: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.gray400,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.gray700,
    marginBottom: 4,
  },
});
