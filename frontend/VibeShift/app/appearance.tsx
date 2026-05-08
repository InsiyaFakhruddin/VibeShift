import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Appearance() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);
  const [animations, setAnimations] = useState(true);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
        <LinearGradient 
          colors={darkMode ? Theme.gradientDark as any : ['#ffffff', '#f5f5f5']}
          style={styles.background}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentWrap}>
              {/* Header */}
              <View style={styles.headerRow}>
                <Pressable onPress={() => router.back()}>
                  <Icon name="arrow-right" size={24} color={Theme.primary} style={{ transform: [{ rotate: '180deg' }] }} />
                </Pressable>
                <Text style={[styles.headerTitle, !darkMode && { color: '#000' }]}>Appearance</Text>
                <View style={{ width: 24 }} />
              </View>

              {/* Appearance Title */}
              <Text style={[styles.contentTitle, !darkMode && styles.contentTitleLight]}>APPEARANCE</Text>

              {/* Dark Mode Toggle */}
              <View style={[styles.settingOption, !darkMode && styles.settingOptionLight]}>
                <View style={[
                  styles.optionIcon, 
                  darkMode 
                    ? { backgroundColor: `${Theme.primary}20` }
                    : { backgroundColor: `${Theme.primary}10` }
                ]}>
                  <Icon name="disc-3" size={20} color={Theme.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, !darkMode && { color: '#000' }]}>Dark Mode</Text>
                  <Text style={[styles.optionSubtitle, !darkMode && styles.optionSubtitleLight]}>Always on</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: 'rgba(0,0,0,0.2)', true: Theme.accent }}
                  thumbColor={darkMode ? '#fff' : '#f4f3f4'}
                />
              </View>

              {/* Accent Color Option */}
              <Pressable style={[styles.settingOption, !darkMode && styles.settingOptionLight]}>
                <View style={[
                  styles.optionIcon,
                  darkMode 
                    ? { backgroundColor: `${Theme.primary}20` }
                    : { backgroundColor: `${Theme.primary}10` }
                ]}>
                  <Icon name="sparkles" size={20} color={Theme.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, !darkMode && { color: '#000' }]}>Accent Color</Text>
                  <Text style={[styles.optionSubtitle, !darkMode && styles.optionSubtitleLight]}>Electric Purple</Text>
                </View>
                <Icon name="arrow-right" size={20} color={darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
              </Pressable>

              {/* Animations Toggle */}
              <View style={[styles.settingOption, !darkMode && styles.settingOptionLight]}>
                <View style={[
                  styles.optionIcon,
                  darkMode 
                    ? { backgroundColor: `${Theme.primary}20` }
                    : { backgroundColor: `${Theme.primary}10` }
                ]}>
                  <Icon name="sparkles" size={20} color={Theme.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, !darkMode && { color: '#000' }]}>Animations</Text>
                  <Text style={[styles.optionSubtitle, !darkMode && styles.optionSubtitleLight]}>Enable all animations</Text>
                </View>
                <Switch
                  value={animations}
                  onValueChange={setAnimations}
                  trackColor={{ false: 'rgba(0,0,0,0.2)', true: Theme.accent }}
                  thumbColor={animations ? '#fff' : '#f4f3f4'}
                />
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

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  contentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
    letterSpacing: 1,
  },

  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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

  contentTitleLight: {
    color: 'rgba(0,0,0,0.5)',
  },

  settingOptionLight: {
    backgroundColor: '#f0f0f0',
    borderColor: 'rgba(0,0,0,0.1)',
  },

  optionSubtitleLight: {
    color: 'rgba(0,0,0,0.6)',
  },

  emptyState: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },

  emptyStateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});
