/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Helper: convert HSL to hex at runtime so values match the web theme precisely.
function hslToHex(h: number, s: number, l: number) {
  // h: 0-360, s: 0-100, l: 0-100
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Web CSS variables (H S L) from src/index.css
const web: Record<string, [number, number, number]> = {
  background: [240, 45, 8],
  foreground: [280, 30, 95],
  card: [245, 40, 12],
  cardForeground: [280, 30, 95],
  popover: [245, 40, 10],
  popoverForeground: [280, 30, 95],
  primary: [280, 75, 60],
  primaryForeground: [280, 30, 95],
  accent: [160, 90, 55],
  accentForeground: [240, 45, 8],
  secondary: [330, 85, 60],
  secondaryForeground: [280, 30, 95],
  muted: [245, 40, 15],
  mutedForeground: [280, 20, 65],
  destructive: [0, 84.2, 60.2],
  destructiveForeground: [280, 30, 95],
  border: [245, 40, 20],
  input: [245, 40, 15],
  ring: [280, 75, 60],
};

export const Theme = {
  background: hslToHex(...web.background),
  foreground: hslToHex(...web.foreground),
  card: hslToHex(...web.card),
  cardForeground: hslToHex(...web.cardForeground),
  popover: hslToHex(...web.popover),
  popoverForeground: hslToHex(...web.popoverForeground),
  primary: hslToHex(...web.primary),
  primaryForeground: hslToHex(...web.primaryForeground),
  accent: hslToHex(...web.accent),
  accentForeground: hslToHex(...web.accentForeground),
  secondary: hslToHex(...web.secondary),
  secondaryForeground: hslToHex(...web.secondaryForeground),
  muted: hslToHex(...web.muted),
  mutedForeground: hslToHex(...web.mutedForeground),
  destructive: hslToHex(...web.destructive),
  destructiveForeground: hslToHex(...web.destructiveForeground),
  border: hslToHex(...web.border),
  input: hslToHex(...web.input),
  ring: hslToHex(...web.ring),
  // Gradients: provide stops (use with expo-linear-gradient)
  gradientPrimary: [hslToHex(...web.primary), hslToHex(...web.secondary)],
  // tuned stops for stronger purple/pink glow like the web screenshot
  gradientDark: [hslToHex(238,30,6), hslToHex(245,40,12)],
  glowPrimary: [hslToHex(280,75,60), hslToHex(330,75,55)],
};

const tintColorLight = Theme.primary;
const tintColorDark = '#ffffff';

export const Colors = {
  light: {
    text: Theme.foreground,
    background: Theme.background,
    tint: tintColorLight,
    icon: Theme.mutedForeground,
    tabIconDefault: Theme.mutedForeground,
    tabIconSelected: tintColorLight,
    // convenience
    card: Theme.card,
    cardForeground: Theme.cardForeground,
    primary: Theme.primary,
    secondary: Theme.secondary,
    accent: Theme.accent,
  },
  dark: {
    text: Theme.foreground,
    background: Theme.background,
    tint: tintColorDark,
    icon: Theme.mutedForeground,
    tabIconDefault: Theme.mutedForeground,
    tabIconSelected: tintColorDark,
    card: Theme.card,
    cardForeground: Theme.cardForeground,
    primary: Theme.primary,
    secondary: Theme.secondary,
    accent: Theme.accent,
  },
};

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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
