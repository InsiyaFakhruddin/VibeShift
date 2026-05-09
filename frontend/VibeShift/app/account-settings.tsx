import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/context/AppearanceContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AccountSettings() {
  const router = useRouter();
  const t = useAppTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
        <LinearGradient colors={t.gradient as any} style={styles.background}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentWrap}>
              {/* Header */}
              <View style={styles.headerRow}>
                <Pressable onPress={() => router.back()}>
                  <Icon name="arrow-right" size={24} color={t.accent} style={{ transform: [{ rotate: '180deg' }] }} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: t.text }]}>Account Settings</Text>
                <View style={{ width: 24 }} />
              </View>

              {/* Content Title */}
              <Text style={[styles.contentTitle, { color: t.sectionLabel }]}>ACCOUNT</Text>
              
              {/* Account Options */}
              <Pressable 
                style={[styles.settingOption, { backgroundColor: t.card, borderColor: t.border }]}
                onPress={() => router.push('/edit-profile')}
              >
                <View style={[styles.optionIcon, { backgroundColor: `${t.accent}20` }]}>
                  <Icon name="user" size={20} color={t.accent} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, { color: t.text }]}>Edit Profile</Text>
                  <Text style={[styles.optionSubtitle, { color: t.subtitle }]}>Name, avatar, bio</Text>
                </View>
                <Icon name="arrow-right" size={20} color={t.arrowColor} />
              </Pressable>

              <Pressable 
                style={[styles.settingOption, { backgroundColor: t.card, borderColor: t.border }]}
                onPress={() => router.push('/change-password')}
              >
                <View style={[styles.optionIcon, { backgroundColor: `${t.accent}20` }]}>
                  <Icon name="settings" size={20} color={t.accent} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, { color: t.text }]}>Change Password</Text>
                  <Text style={[styles.optionSubtitle, { color: t.subtitle }]}>Update your password</Text>
                </View>
                <Icon name="arrow-right" size={20} color={t.arrowColor} />
              </Pressable>

              <Pressable 
                style={[styles.settingOption, { backgroundColor: t.card, borderColor: t.border }]}
                onPress={() => router.push('/linked-accounts')}
              >
                <View style={[styles.optionIcon, { backgroundColor: `${t.accent}20` }]}>
                  <Icon name="shuffle" size={20} color={t.accent} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, { color: t.text }]}>Linked Accounts</Text>
                  <Text style={[styles.optionSubtitle, { color: t.subtitle }]}>Google, Apple, Spotify</Text>
                </View>
                <Icon name="arrow-right" size={20} color={t.arrowColor} />
              </Pressable>
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
});
