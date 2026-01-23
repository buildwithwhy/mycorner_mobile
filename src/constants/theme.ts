// Theme constants for MyCorner app
// Visual style: calm, welcoming, quietly optimistic — like finding a familiar corner at golden hour
// Muted blue-green primary, warm amber accent used sparingly, minimalist with generous whitespace

export const COLORS = {
  // Primary Brand Colors - Muted blue-green (soft, slightly warm, never saturated)
  primary: '#5D8A8A',             // Muted teal - trust, belonging, urban calm
  primaryLight: '#EDF4F4',        // Very light teal background
  primaryMuted: '#7BA3A3',        // Softer variant for secondary elements
  primaryBorder: '#B8D4D4',       // Soft teal border
  primaryDark: '#4A7070',         // Darker teal for pressed states

  // Accent Colors - Sunset orange/soft amber (used sparingly, as light)
  accent: '#D4956A',              // Soft amber - warmth, guidance
  accentLight: '#FDF6F0',         // Very light amber background
  accentMuted: '#E8B896',         // Softer amber
  accentDark: '#B8784D',          // Darker amber for text

  // Status Colors - Softened for calm aesthetic
  success: '#6AAB8E',             // Muted green - living here
  successLight: '#EDF5F1',
  error: '#C97B7B',               // Muted coral - ruled out (not harsh red)
  errorLight: '#FBF2F2',
  warning: '#D4956A',             // Same as accent - warning
  warningLight: '#FDF6F0',
  info: '#7BA3B8',                // Muted blue - want to visit
  infoLight: '#EDF3F6',

  // Semantic Colors
  favorite: '#C97B7B',            // Muted coral heart
  favoriteLight: '#FBF2F2',       // Light coral background
  favoriteBorder: '#E8C4C4',      // Soft coral border

  // Destination Colors (softer palette for map markers)
  destination1: '#7BA3B8',        // Muted blue
  destination2: '#9B8ABD',        // Muted purple
  destination3: '#BD8A9B',        // Muted rose
  destination4: '#D4956A',        // Soft amber
  destination5: '#6AAB8E',        // Muted teal-green

  // Grayscale - Slightly warm-tinted for lived-in feel
  gray50: '#FAFAF9',              // Warmest light - backgrounds
  gray100: '#F5F5F4',             // Very light warm gray
  gray200: '#E7E5E4',             // Light warm gray - borders
  gray300: '#D6D3D1',             // Medium-light - inactive icons
  gray400: '#A8A29E',             // Medium warm gray - placeholders
  gray500: '#78716C',             // Medium-dark - secondary text
  gray600: '#57534E',             // Dark warm gray
  gray700: '#44403C',             // Darker warm gray
  gray800: '#292524',             // Very dark warm gray
  gray900: '#1C1917',             // Darkest - primary text

  // Base Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Soft backgrounds for cards and sections
  warmWhite: '#FDFCFB',           // Slightly warm white for cards
  coolMist: '#F7F9F9',            // Cool mist for contrast areas

  // Shadows - Soft and subtle
  shadowLight: 'rgba(93, 138, 138, 0.08)',   // Primary color shadow (very soft)
  shadowDark: 'rgba(28, 25, 23, 0.06)',      // Warm black shadow (subtle)
  shadowAmber: 'rgba(212, 149, 106, 0.10)',  // Amber glow shadow
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,    // Added for generous whitespace
};

export const BORDER_RADIUS = {
  sm: 10,      // Slightly more rounded for human-friendly feel
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,     // Added for larger rounded elements
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
  // Softer, more subtle shadows for calm aesthetic
  small: {
    shadowColor: COLORS.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.gray900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  large: {
    shadowColor: COLORS.gray900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  // Warm glow for accent elements
  glow: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
};

// Status color mapping - using softer palette
export const STATUS_COLORS = {
  shortlist: COLORS.accent,
  want_to_visit: COLORS.info,
  visited: COLORS.primary,
  living_here: COLORS.success,
  ruled_out: COLORS.error,
};

// Status light backgrounds
export const STATUS_LIGHT_COLORS = {
  shortlist: COLORS.accentLight,
  want_to_visit: COLORS.infoLight,
  visited: COLORS.primaryLight,
  living_here: COLORS.successLight,
  ruled_out: COLORS.errorLight,
};

// Destination marker colors array
export const DESTINATION_COLORS = [
  COLORS.destination1,
  COLORS.destination2,
  COLORS.destination3,
  COLORS.destination4,
  COLORS.destination5,
];
