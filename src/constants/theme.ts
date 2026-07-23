/**
 * Murphy Method semantic design tokens.
 *
 * Implements docs/DESIGN_SYSTEM.md §3-§5. Components must consume these
 * semantic tokens (e.g. `colors.background.default`) rather than hard-coded
 * hex values, so theme switching and future palette refinement stay
 * centralised here.
 */
import '@/global.css';

import { Platform } from 'react-native';

export type ColorScheme = 'light' | 'dark';

export const Colors = {
  light: {
    background: {
      default: '#F7F9FC',
      subtle: '#EEF1F6',
    },
    surface: {
      default: '#FFFFFF',
      raised: '#FFFFFF',
      sunken: '#EEF1F6',
    },
    text: {
      primary: '#101828',
      secondary: '#475467',
      tertiary: '#667085',
      inverse: '#FFFFFF',
      disabled: '#98A2B3',
    },
    brand: {
      primary: '#4F6EF7',
      primaryPressed: '#3B57D9',
      primarySubtle: '#E9EDFE',
      onPrimary: '#FFFFFF',
    },
    status: {
      positive: '#22C7A9',
      positiveSubtle: '#E1F8F3',
      warning: '#F59E0B',
      warningSubtle: '#FEF3E0',
      critical: '#E5484D',
      criticalSubtle: '#FCEAEA',
    },
    border: {
      default: '#E4E7EC',
      subtle: '#EEF1F6',
      focus: '#4F6EF7',
    },
    overlay: 'rgba(16, 24, 40, 0.48)',
  },
  dark: {
    background: {
      default: '#0E1116',
      subtle: '#151922',
    },
    surface: {
      default: '#161A22',
      raised: '#1F242F',
      sunken: '#0B0D12',
    },
    text: {
      primary: '#F2F4F7',
      secondary: '#AEB6C4',
      tertiary: '#7E8A9E',
      inverse: '#101828',
      disabled: '#4B5567',
    },
    brand: {
      primary: '#7C93FA',
      primaryPressed: '#96A9FB',
      primarySubtle: '#212A47',
      onPrimary: '#0E1116',
    },
    status: {
      positive: '#3FD9BC',
      positiveSubtle: '#122D28',
      warning: '#F7B955',
      warningSubtle: '#332508',
      critical: '#F1777B',
      criticalSubtle: '#341415',
    },
    border: {
      default: '#2A3040',
      subtle: '#1F242F',
      focus: '#7C93FA',
    },
    overlay: 'rgba(3, 5, 9, 0.6)',
  },
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

export const Typography = {
  hero: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  section: { fontSize: 21, lineHeight: 27, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyEmphasis: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  supporting: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  supportingEmphasis: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
} as const;

/**
 * Restrained elevation: light theme uses a soft shadow, dark theme relies on
 * a lighter surface tone instead of a heavy shadow (docs/DESIGN_SYSTEM.md §5).
 */
export const Elevation = {
  light: {
    level0: {},
    level1: {
      shadowColor: '#101828',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    level2: {
      shadowColor: '#101828',
      shadowOpacity: 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
  },
  dark: {
    level0: {},
    level1: {
      shadowColor: '#000000',
      shadowOpacity: 0.3,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    level2: {
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Minimum touch target size per docs/DESIGN_SYSTEM.md §8 (general baseline). */
export const MinTouchTarget = 44;
/** Larger touch target for in-workout controls, docs/DESIGN_SYSTEM.md §7.1. */
export const WorkoutTouchTarget = 56;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
