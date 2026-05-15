import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeatureCard } from '@/components/FeatureCard';
import GradientText from '@/components/GradientText';
import Icon from '@/components/Icon';
import { SongCard } from '@/components/SongCard';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { hexToRgba, useAppTheme } from '@/context/AppearanceContext';
import { useProfile } from '@/context/UserContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export default function HomeScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { profile } = useProfile();
  const t = useAppTheme();
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' ? width >= 900 : false;
  const [recentSongs, setRecentSongs] = useState<{ id: string; title: string; editedDate: string }[]>([]);

  // Wait for UserContext sync (profile.id set) before fetching — avoids racing
  // POST /auth/sync and getting a 404 from get_current_user on every fresh login.
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        let token = await getToken();
        if (!token) token = await getToken({ skipCache: true } as any);
        if (!token) return;
        const res = await fetch(`${API_URL}/library`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const recent = (data.items ?? []).slice(0, 3).map((i: any) => ({
            id: i.id,
            title: i.song_name,
            editedDate: new Date(i.created_at).toLocaleDateString(),
          }));
          setRecentSongs(recent);
        }
      } catch (_) {}
    })();
  }, [profile?.id]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
        <LinearGradient colors={t.gradient as any} style={styles.background}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.contentWrap, isWide && styles.contentWrapWide]}>
              <View style={[styles.innerBox, isWide && styles.innerBoxWide]}>
                {/* VibeShift Header */}
                <View style={styles.headerTopRow}>
                  <View style={styles.logoContainer}>
                    <Icon name="vibeshift-logo" size={44} color={t.accent} />
                    <View style={styles.headerTextGroup}>
                      <Text style={[styles.vibeShiftText, { color: t.accent }]}>VibeShift</Text>
                      <Text style={[styles.greetingText, { color: t.subtitle }]}>Hi {profile?.name || 'there'}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => router.push('/account-settings')}>
                    <Icon name="settings" size={24} color={t.subtitle} />
                  </Pressable>
                </View>

                <View style={styles.headerCenter}>
                  <GradientText text="Transform Your Music" colors={[t.accent, t.accentAlt]} fontSize={isWide ? 36 : 26} height={isWide ? 46 : 36} style={{ width: '100%' }} align="center" />
                  <Text style={[styles.hSubtitle, { color: t.subtitle }]}>Separate instruments, change genres with AI</Text>
                </View>

                <View style={[styles.featuresArea, isWide && styles.featuresAreaWide]}>
                  <FeatureCard
                    title="Music Demixing"
                    description="Separate vocals, drums, bass, and other instruments"
                    to="/demixing"
                    icon={<Icon name="music-2" size={24} color={t.accent} />}
                    style={isWide ? styles.featureCardHalf : undefined}
                  />
                  <FeatureCard
                    title="Genre Transform"
                    description="Transform tracks into different genres with AI"
                    to="genre-transform"
                    icon={<Icon name="sparkles" size={24} color={t.accent} />}
                    style={isWide ? styles.featureCardHalf : undefined}
                  />
                </View>

                <View style={styles.recentArea}>
                  <Text style={[styles.recentTitle, { fontWeight: '700', color: t.text }]}>Recently Edited</Text>
                  <View style={[styles.songsList, isWide && styles.songsListWide]}>
                    {recentSongs.length === 0 ? (
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No tracks yet — start demixing or transforming!</Text>
                    ) : recentSongs.map((s) => (
                      <SongCard key={s.id} title={s.title} duration="" editedDate={s.editedDate} onClick={() => router.push('/library')} />
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeContainer: { flex: 1 },
  background: { flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  contentWrap: { flex: 1 },
  contentWrapWide: { alignItems: 'center', paddingVertical: 28 },
  innerBox: { flex: 1 },
  innerBoxWide: { width: '100%', maxWidth: 1100, paddingHorizontal: 32, paddingVertical: 28, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(124,58,237,0.08)' },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextGroup: {
    justifyContent: 'center',
  },
  logoBall: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  vibeShiftText: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.primary,
  },
  greetingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  headerCenter: { alignItems: 'center', marginBottom: 32 },
  hTitle: { fontSize: 26, color: Theme.primary, textAlign: 'center' },
  hTitleWide: { fontSize: 34 },
  hSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 8 },
  featuresArea: { marginTop: 0, marginBottom: 20 },
  featuresAreaWide: { marginTop: 28, flexDirection: 'row', gap: 16 },
  recentArea: { marginTop: 8, flex: 1 },
  recentTitle: { fontSize: 16, marginBottom: 16, color: '#fff', fontWeight: '600' },
  songsList: { gap: 12 },
  songsListWide: { maxHeight: 520, overflow: 'hidden' },
  featureCardHalf: { flex: 1, marginHorizontal: 0, maxWidth: 520 },
});
