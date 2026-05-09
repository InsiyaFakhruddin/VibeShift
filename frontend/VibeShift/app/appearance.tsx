import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { ACCENT_PRESETS, useAppTheme, useAppearance } from '@/context/AppearanceContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Appearance() {
  const router = useRouter();
  const { isDark, accentColor, animationsEnabled, toggleDark, setAccentColor, toggleAnimations } = useAppearance();
  const t = useAppTheme();

  return (
    <ThemedView style={[styles.container, { backgroundColor: t.headerBg }]}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomColor: t.border }]}>
          <Pressable onPress={() => router.back()}>
            <Icon name="arrow-right" size={24} color={t.accent} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: t.text }]}>Appearance</Text>
          <View style={{ width: 24 }} />
        </View>

        <LinearGradient colors={t.gradient as any} style={styles.background}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Dark Mode ──────────────────────────────────────────── */}
            <Text style={[styles.sectionLabel, { color: t.sectionLabel }]}>DISPLAY</Text>

            <View style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: `${t.accent}20` }]}>
                <Icon name="disc-3" size={20} color={t.accent} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Dark Mode</Text>
                <Text style={[styles.rowSub, { color: t.subtitle }]}>
                  {isDark ? 'Currently dark' : 'Currently light'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleDark}
                trackColor={{ false: `${t.accent}40`, true: t.accent }}
                thumbColor="#fff"
              />
            </View>

            {/* ── Animations ─────────────────────────────────────────── */}
            <View style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: `${t.accent}20` }]}>
                <Icon name="sparkles" size={20} color={t.accent} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Animations</Text>
                <Text style={[styles.rowSub, { color: t.subtitle }]}>
                  {animationsEnabled ? 'All animations on' : 'Animations disabled'}
                </Text>
              </View>
              <Switch
                value={animationsEnabled}
                onValueChange={toggleAnimations}
                trackColor={{ false: `${t.accent}40`, true: t.accent }}
                thumbColor="#fff"
              />
            </View>

            {/* ── Accent Color ───────────────────────────────────────── */}
            <Text style={[styles.sectionLabel, { color: t.sectionLabel, marginTop: 8 }]}>ACCENT COLOUR</Text>

            <View style={[styles.accentCard, { backgroundColor: t.card, borderColor: t.border }]}>
              <Text style={[styles.accentDesc, { color: t.subtitle }]}>
                Each palette has a primary + complementary accent. Both colours are applied across buttons, gradients, stats, and interactive elements.
              </Text>

              <View style={styles.swatchGrid}>
                {ACCENT_PRESETS.map((preset) => {
                  const active = accentColor === preset.color;
                  return (
                    <Pressable
                      key={preset.color}
                      style={styles.swatchItem}
                      onPress={() => setAccentColor(preset.color)}
                    >
                      <View style={styles.swatchWrapper}>
                        <View
                          style={[
                            styles.swatch,
                            { backgroundColor: preset.color },
                            active && { borderWidth: 3, borderColor: '#fff' },
                          ]}
                        >
                          {active && <Icon name="check" size={14} color="#fff" />}
                        </View>
                        {/* Alt-color dot — shows the complementary colour */}
                        <View
                          style={[
                            styles.altDot,
                            { backgroundColor: preset.altColor, borderColor: t.card },
                          ]}
                        />
                      </View>
                      <Text style={[styles.swatchName, { color: t.subtitle }, active && { color: preset.color, fontWeight: '700' }]}>
                        {preset.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── Info card ─────────────────────────────────────────── */}
            <View style={[styles.infoCard, { borderColor: `${t.accent}40`, backgroundColor: `${t.accent}08` }]}>
              <Icon name="info" size={15} color={t.accent} />
              <Text style={[styles.infoText, { color: t.subtitle }]}>
                Changes apply instantly across the entire app and persist between sessions.
              </Text>
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  safeContainer: { flex: 1, flexDirection: 'column' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  background:    { flex: 1 },
  scrollView:    { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 12 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
    marginTop: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  rowSub:   { fontSize: 12 },

  // Accent card
  accentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },

  accentDesc: { fontSize: 12, lineHeight: 18 },

  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },

  swatchItem: {
    alignItems: 'center',
    gap: 6,
    width: '30%',
  },

  swatchWrapper: {
    position: 'relative',
    width: 52,
    height: 52,
  },

  swatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  altDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
  },

  swatchName: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginTop: 4,
  },

  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
