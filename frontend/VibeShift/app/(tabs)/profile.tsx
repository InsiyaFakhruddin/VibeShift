import { useAuth } from '@clerk/clerk-expo';
import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import GradientText from '@/components/GradientText';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hexToRgba, useAppTheme } from '@/context/AppearanceContext';
import { useProfile } from '@/context/UserContext';

export default function Profile() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const t = useAppTheme();
  const [pressedTab, setPressedTab] = React.useState<string | null>(null);

  // UserContext already calls refreshProfile() after POST /auth/sync on sign-in.
  // Calling it here on mount races the sync and fails with 404 if the user isn't in
  // the DB yet. Profile data flows in automatically once UserContext finishes syncing.

  const displayName = profile?.name || 'User';

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: t.headerBg }]}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
        <LinearGradient colors={t.gradient as any} style={styles.background}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentWrap}>
              {/* Header */}
              <View style={styles.headerTopRow}>
                <View style={styles.logoContainer}>
                  <View style={[styles.logoBall, { backgroundColor: t.accent, shadowColor: t.accent }]}>
                    <Icon name="disc-3" size={22} color="#fff" />
                  </View>
                  <View style={styles.headerTextGroup}>
                    <GradientText text="VibeShift" colors={[t.accent, t.accentAlt]} fontSize={18} height={28} width="100%" />
                    <Text style={[styles.greetingText, { color: t.subtitle }]}>Hi {displayName}</Text>
                  </View>
                </View>
                <Pressable onPress={() => router.push('/account-settings')}>
                  <Icon name="settings" size={24} color={t.subtitle} />
                </Pressable>
              </View>

              <View style={styles.innerBox}>
                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: t.card, borderColor: t.accent, shadowColor: t.accent }]}>
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={[styles.avatarImage, { borderColor: t.accent }]} />
                  ) : (
                    <LinearGradient
                      colors={[t.accent, t.accentAlt]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.avatarGradient, { shadowColor: t.accentAlt }]}
                    >
                      <Icon name="user" size={28} color="#fff" />
                    </LinearGradient>
                  )}
                  <View style={{ alignItems: 'center', marginTop: 12 }}>
                    <Text style={[styles.nameText, { color: t.text }]}>{displayName}</Text>
                    {profile?.bio ? (
                      <Text style={[styles.bioText, { color: t.accent }]}>{profile.bio}</Text>
                    ) : (
                      <Text style={[styles.bioPlaceholder, { color: hexToRgba(t.subtitle, 0.45) }]}>
                        Tap Edit Profile to add a bio...
                      </Text>
                    )}
                  </View>
                </View>

                {/* Stats Row — Tracks=primary accent, Genres=alt accent */}
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.accent }]}>
                    <View style={[styles.statIcon, {
                      backgroundColor: hexToRgba(t.accent, 0.15),
                      borderColor: t.accentAlt,
                    }]}>
                      <Icon name="music-2" size={20} color={t.accent} />
                    </View>
                    <Text style={[styles.statNumber, { color: t.accent }]}>{profile?.tracks_demixed ?? 0}</Text>
                    <Text style={[styles.statLabel, { color: t.subtitle }]}>Tracks Demixed</Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.accentAlt }]}>
                    <View style={[styles.statIcon, {
                      backgroundColor: hexToRgba(t.accentAlt, 0.15),
                      borderColor: t.accent,
                    }]}>
                      <Icon name="sparkles" size={20} color={t.accentAlt} />
                    </View>
                    <Text style={[styles.statNumber, { color: t.accentAlt }]}>{profile?.genres_changed ?? 0}</Text>
                    <Text style={[styles.statLabel, { color: t.subtitle }]}>Genres Changed</Text>
                  </View>
                </View>

                {/* Settings Section */}
                <View style={styles.settingsSection}>
                  <Text style={[styles.settingsTitle, { color: t.text }]}>Settings</Text>

                  {(['account', 'audio', 'appearance', 'signout'] as const).map((key) => {
                    const config = {
                      account:    { label: 'Account Settings', icon: 'settings',   route: '/account-settings' },
                      audio:      { label: 'Audio Preferences', icon: 'music-2',   route: '/audio-preferences' },
                      appearance: { label: 'Appearance',        icon: 'sparkles',  route: '/appearance' },
                      signout:    { label: 'Sign Out',           icon: 'log-out',   route: null },
                    }[key];
                    const pressed = pressedTab === key;
                    const isSignOut = key === 'signout';
                    return (
                      <Pressable
                        key={key}
                        style={[
                          styles.tabItem,
                          {
                            backgroundColor: pressed ? hexToRgba(t.accent, 0.1) : t.card,
                            borderColor: pressed ? t.accentAlt : (isSignOut ? t.accent : t.border),
                          },
                        ]}
                        onPress={() => {
                          if (isSignOut) handleSignOut();
                          else router.push(config.route as any);
                        }}
                        onPressIn={() => setPressedTab(key)}
                        onPressOut={() => setPressedTab(null)}
                      >
                        {/* Icon with ring — ring switches accent on press */}
                        <View style={[
                          styles.tabIconRing,
                          {
                            backgroundColor: pressed ? hexToRgba(t.accentAlt, 0.15) : hexToRgba(t.accent, 0.1),
                            borderColor: pressed ? t.accentAlt : hexToRgba(t.accent, 0.35),
                          },
                        ]}>
                          <Icon
                            name={config.icon}
                            size={17}
                            color={pressed ? t.accentAlt : t.accent}
                          />
                        </View>
                        <Text style={[
                          styles.tabText,
                          { color: pressed ? t.accent : (isSignOut ? t.accent : t.text) },
                        ]}>
                          {config.label}
                        </Text>
                      </Pressable>
                    );
                  })}
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

  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBall: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 12,
  },
  headerTextGroup: { justifyContent: 'center' },
  greetingText: { fontSize: 13, marginTop: 2 },

  innerBox: { flex: 1, gap: 20 },

  profileCard: {
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  avatarGradient: {
    width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 2 },
  nameText: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitleText: { fontSize: 13 },
  bioText: { fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
  bioPlaceholder: { fontSize: 12, textAlign: 'center', paddingHorizontal: 16, fontStyle: 'italic' },

  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, paddingVertical: 16, paddingHorizontal: 12,
    borderRadius: 16, alignItems: 'center', borderWidth: 1, overflow: 'hidden',
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 10, alignItems: 'center',
    justifyContent: 'center', marginBottom: 8, borderWidth: 1,
  },
  statNumber: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 11, textAlign: 'center' },

  settingsSection: { gap: 12 },
  settingsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  tabItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 16, borderWidth: 1, overflow: 'hidden', gap: 12,
  },
  tabIconRing: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  tabText: { fontSize: 15, fontWeight: '500' },
});
