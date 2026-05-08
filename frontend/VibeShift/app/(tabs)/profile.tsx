import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import GradientText from '@/components/GradientText';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Profile() {
  const router = useRouter();
  const [pressedTab, setPressedTab] = useState<string | null>(null);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
        <LinearGradient colors={Theme.gradientDark as any} style={styles.background}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentWrap}>
              {/* VibeShift Header */}
              <View style={styles.headerTopRow}>
                <View style={styles.logoContainer}>
                  <View style={styles.logoBall}>
                    <Icon name="disc-3" size={22} color="#fff" />
                  </View>
                  <View style={styles.headerTextGroup}>
                    <GradientText 
                      text="VibeShift" 
                      colors={['#ec4981', '#22c55e']}
                      fontSize={18}
                      height={28}
                      width="100%"
                    />
                    <Text style={styles.greetingText}>Hi Insiya</Text>
                  </View>
                </View>
                <Pressable onPress={() => router.push('/account-settings')}>
                  <Icon name="settings" size={24} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>

              <View style={styles.innerBox}>
                {/* Profile Header Card */}
                <View style={styles.profileCard}>
                  <LinearGradient
                    colors={[Theme.primary, Theme.secondary, Theme.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarGradient}
                  >
                    <Icon name="user" size={28} color="#fff" />
                  </LinearGradient>
                  <View style={{ alignItems: 'center', marginTop: 12 }}>
                    <Text style={styles.nameText}>Insiya</Text>
                    <Text style={styles.subtitleText}>Music Enthusiast</Text>
                  </View>
                </View>

                {/* Stats Grid - 2 columns */}
                <View style={styles.statsRow}>
                  {/* Tracks Demixed */}
                  <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: `${Theme.primary}20` }]}>
                      <Icon name="music-2" size={20} color={Theme.primary} />
                    </View>
                    <Text style={styles.statNumber}>24</Text>
                    <Text style={styles.statLabel}>Tracks Demixed</Text>
                  </View>

                  {/* Genres Changed */}
                  <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: `${Theme.secondary}20` }]}>
                      <Icon name="sparkles" size={20} color={Theme.secondary} />
                    </View>
                    <Text style={[styles.statNumber, { color: Theme.secondary }]}>18</Text>
                    <Text style={styles.statLabel}>Genres Changed</Text>
                  </View>
                </View>

                {/* Settings Section */}
                <View style={styles.settingsSection}>
                  <Text style={styles.settingsTitle}>Settings</Text>
                  
                  <Pressable 
                    style={[styles.tabItem, pressedTab === 'account' && styles.tabItemActive]}
                    onPress={() => router.push('/account-settings')}
                    onPressIn={() => setPressedTab('account')}
                    onPressOut={() => setPressedTab(null)}
                  >
                    <Icon name="settings" size={18} color={pressedTab === 'account' ? '#fff' : Theme.primary} />
                    <Text style={[styles.tabText, pressedTab === 'account' && styles.tabTextActive]}>Account Settings</Text>
                  </Pressable>

                  <Pressable 
                    style={[styles.tabItem, pressedTab === 'audio' && styles.tabItemActive]}
                    onPress={() => router.push('/audio-preferences')}
                    onPressIn={() => setPressedTab('audio')}
                    onPressOut={() => setPressedTab(null)}
                  >
                    <Icon name="music-2" size={18} color={pressedTab === 'audio' ? '#fff' : Theme.primary} />
                    <Text style={[styles.tabText, pressedTab === 'audio' && styles.tabTextActive]}>Audio Preferences</Text>
                  </Pressable>

                  <Pressable 
                    style={[styles.tabItem, pressedTab === 'appearance' && styles.tabItemActive]}
                    onPress={() => router.push('/appearance')}
                    onPressIn={() => setPressedTab('appearance')}
                    onPressOut={() => setPressedTab(null)}
                  >
                    <Icon name="sparkles" size={18} color={pressedTab === 'appearance' ? '#fff' : Theme.primary} />
                    <Text style={[styles.tabText, pressedTab === 'appearance' && styles.tabTextActive]}>Appearance</Text>
                  </Pressable>

                  <Pressable 
                    style={[styles.tabItem, styles.loginButton, pressedTab === 'login' && styles.tabItemActive]}
                    onPress={() => router.push('/login')}
                    onPressIn={() => setPressedTab('login')}
                    onPressOut={() => setPressedTab(null)}
                  >
                    <Icon name="log-in" size={18} color={pressedTab === 'login' ? '#fff' : Theme.primary} />
                    <Text style={[styles.tabText, styles.loginButtonText, pressedTab === 'login' && styles.tabTextActive]}>Login / Sign Up</Text>
                  </Pressable>
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
  
  // Header
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
  headerTextGroup: {
    justifyContent: 'center',
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

  // Inner content
  innerBox: { flex: 1, gap: 20 },
  
  // Profile Header
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: Theme.primary,
    overflow: 'hidden',
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  
  subtitleText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
  },

  // Stats Grid
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  statCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: Theme.primary,
    overflow: 'hidden',
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Theme.primary,
  },

  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.primary,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },

  // Settings
  settingsSection: {
    gap: 12,
  },

  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },

  tabBar: {
    flexDirection: 'column',
    gap: 8,
  },

  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },

  tabItemActive: {
    backgroundColor: Theme.accent,
    borderColor: Theme.accent,
  },

  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 12,
  },

  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  loginButton: {
    marginTop: 16,
    borderColor: Theme.primary,
  },

  loginButtonText: {
    color: Theme.primary,
  },

  tabContent: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  contentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
    letterSpacing: 1,
  },

  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 0,
    marginBottom: 12,
  },

  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  optionInfo: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },

  optionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
});
