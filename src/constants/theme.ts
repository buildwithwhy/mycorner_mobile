// Theme constants for MyCorner app
// Centralized color palette and design tokens

export const COLORS = {
  // Primary Brand Colors
  primary: '#6366f1',           // Indigo - main brand color
  primaryLight: '#eef2ff',      // Light indigo background
  primaryBorder: '#c7d2fe',     // Light indigo border

  // Accent Colors
  accent: '#f59e0b',            // Amber - accent color
  accentLight: '#fef3c7',       // Light amber background
  accentDark: '#d97706',        // Dark amber text

  // Status Colors
  success: '#10b981',           // Green - success, living here
  error: '#ef4444',             // Red - error, ruled out
  warning: '#f59e0b',           // Amber - warning
  info: '#3b82f6',              // Blue - info, want to visit

  // Semantic Colors
  favorite: '#ef4444',          // Red heart
  favoriteLight: '#fef2f2',     // Light red background
  favoriteBorder: '#fecaca',    // Light red border

  // Destination Colors (for map markers)
  destination1: '#3b82f6',      // Blue
  destination2: '#8b5cf6',      // Purple
  destination3: '#ec4899',      // Pink
  destination4: '#f59e0b',      // Orange
  destination5: '#14b8a6',      // Teal

  // Grayscale
  gray50: '#f9fafb',            // Lightest gray - backgrounds
  gray100: '#f3f4f6',           // Very light gray - disabled states
  gray200: '#e5e7eb',           // Light gray - borders
  gray300: '#d1d5db',           // Medium-light gray - inactive icons
  gray400: '#9ca3af',           // Medium gray - placeholders
  gray500: '#6b7280',           // Medium-dark gray - secondary text
  gray600: '#4b5563',           // Dark gray
  gray700: '#374151',           // Darker gray
  gray800: '#1f2937',           // Very dark gray
  gray900: '#111827',           // Darkest gray - primary text

  // Base Colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Shadows
  shadowLight: 'rgba(99, 102, 241, 0.15)',    // Primary color shadow
  shadowDark: 'rgba(0, 0, 0, 0.1)',           // Black shadow
  shadowAmber: 'rgba(245, 158, 11, 0.12)',    // Amber shadow
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const FONT_SIZES = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 28,
  huge: 32,
};

export const FONT_WEIGHTS = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Status color mapping
export const STATUS_COLORS = {
  shortlist: COLORS.accent,
  want_to_visit: COLORS.info,
  visited: COLORS.primary,
  living_here: COLORS.success,
  ruled_out: COLORS.error,
};

// Destination marker colors array
export const DESTINATION_COLORS = [
  COLORS.destination1,
  COLORS.destination2,
  COLORS.destination3,
  COLORS.destination4,
  COLORS.destination5,
];
