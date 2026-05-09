import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Theme } from '@/constants/theme';

// ─── Accent colour presets ────────────────────────────────────────────────────
export interface AccentPreset {
  name: string;
  color: string;
  altColor: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'Amethyst', color: '#9333ea', altColor: '#ec4899' }, // Purple + Fuchsia
  { name: 'Indigo',   color: '#6366f1', altColor: '#22d3ee' }, // Indigo + Electric Cyan
  { name: 'Crimson',  color: '#e11d48', altColor: '#f59e0b' }, // Crimson + Amber
  { name: 'Azure',    color: '#06b6d4', altColor: '#a78bfa' }, // Cyan + Soft Violet
  { name: 'Gold',     color: '#d97706', altColor: '#f43f5e' }, // Amber + Rose
  { name: 'Sage',     color: '#10b981', altColor: '#fbbf24' }, // Emerald + Champagne Gold
];

function getAltColor(accent: string): string {
  return ACCENT_PRESETS.find((p) => p.color === accent)?.altColor ?? accent;
}

// ─── Theme palette ────────────────────────────────────────────────────────────
export type AppTheme = {
  gradient:     string[];
  card:         string;
  text:         string;
  subtitle:     string;
  sectionLabel: string;
  border:       string;
  arrowColor:   string;
  headerBg:     string;
  inputBg:      string;
  accent:       string;
  accentAlt:    string;
};

function buildTheme(isDark: boolean, accent: string, accentAlt: string): AppTheme {
  if (isDark) {
    return {
      gradient:     Theme.gradientDark as string[],
      card:         Theme.card,
      text:         '#ffffff',
      subtitle:     'rgba(255,255,255,0.65)',
      sectionLabel: 'rgba(255,255,255,0.55)',
      border:       'rgba(255,255,255,0.1)',
      arrowColor:   'rgba(255,255,255,0.5)',
      headerBg:     Theme.card,
      inputBg:      'rgba(255,255,255,0.06)',
      accent,
      accentAlt,
    };
  }
  return {
    gradient:     ['#faf5ff', '#ede8ff'],
    card:         '#ffffff',
    text:         '#1a0a2e',
    subtitle:     'rgba(26,10,46,0.55)',
    sectionLabel: 'rgba(26,10,46,0.4)',
    border:       'rgba(168,85,247,0.18)',
    arrowColor:   'rgba(26,10,46,0.3)',
    headerBg:     '#ffffff',
    inputBg:      'rgba(168,85,247,0.07)',
    accent,
    accentAlt,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppearanceState {
  isDark:            boolean;
  accentColor:       string;
  accentAltColor:    string;
  animationsEnabled: boolean;
  toggleDark:        () => void;
  setAccentColor:    (c: string) => void;
  toggleAnimations:  () => void;
}

const AppearanceContext = createContext<AppearanceState>({
  isDark:            true,
  accentColor:       '#9333ea',
  accentAltColor:    '#ec4899',
  animationsEnabled: true,
  toggleDark:        () => {},
  setAccentColor:    () => {},
  toggleAnimations:  () => {},
});

const STORE_KEY = 'vibeshift_appearance_v1';

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [isDark,            setIsDark]            = useState(true);
  const [accentColor,       setAccentColorState]  = useState('#9333ea');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  const latestRef = useRef({ isDark, accentColor, animationsEnabled });
  useEffect(() => { latestRef.current = { isDark, accentColor, animationsEnabled }; });

  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const p = JSON.parse(raw);
            if (typeof p.isDark === 'boolean')            setIsDark(p.isDark);
            if (typeof p.accentColor === 'string')        setAccentColorState(p.accentColor);
            if (typeof p.animationsEnabled === 'boolean') setAnimationsEnabled(p.animationsEnabled);
          } catch (_) {}
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    SecureStore.setItemAsync(
      STORE_KEY,
      JSON.stringify({ isDark, accentColor, animationsEnabled }),
    ).catch(() => {});
  }, [isDark, accentColor, animationsEnabled, ready]);

  const toggleDark       = () => setIsDark((d) => !d);
  const setAccentColor   = (c: string) => setAccentColorState(c);
  const toggleAnimations = () => setAnimationsEnabled((a) => !a);

  const accentAltColor = getAltColor(accentColor);

  if (!ready) return null;

  return (
    <AppearanceContext.Provider
      value={{ isDark, accentColor, accentAltColor, animationsEnabled, toggleDark, setAccentColor, toggleAnimations }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  return useContext(AppearanceContext);
}

/** Convert a 6-digit hex colour to rgba(r,g,b,alpha). */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Computed full theme — use in screens for colours that adapt to dark/light + accent. */
export function useAppTheme(): AppTheme {
  const { isDark, accentColor } = useAppearance();
  const accentAlt = getAltColor(accentColor);
  return buildTheme(isDark, accentColor, accentAlt);
}
