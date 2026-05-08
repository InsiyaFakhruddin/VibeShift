import Icon from '@/components/Icon';
import { SongCard } from '@/components/SongCard';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const demixedSongs = [
  { id: 'demixed-1', title: 'Summer Vibes', duration: '3:45', editedDate: '2 hours ago' },
  { id: 'demixed-2', title: 'Night Drive', duration: '4:12', editedDate: '1 day ago' },
  { id: 'demixed-3', title: 'Rock Anthem', duration: '4:23', editedDate: 'Yesterday' },
];

const transformedSongs = [
  { id: 'transformed-1', title: 'Electronic Dreams', duration: '3:45', editedDate: 'Yesterday' },
  { id: 'transformed-2', title: 'Acoustic Session', duration: '4:12', editedDate: '2 days ago' },
  { id: 'transformed-3', title: 'Jazz Night', duration: '5:01', editedDate: '3 days ago' },
];

export default function Library() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('all');

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
                    <Text style={styles.vibeShiftText}>VibeShift</Text>
                    <Text style={styles.greetingText}>Hi Insiya</Text>
                  </View>
                </View>
                <Pressable onPress={() => router.push('/account-settings')}>
                  <Icon name="settings" size={24} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>

              {/* Page Header */}
              <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>Your Library</Text>
                <Text style={styles.pageSubtitle}>All your edited tracks</Text>
              </View>

              {/* Tab Navigation */}
              <View style={styles.tabContainer}>
                <View style={styles.tabBar}>
                  {['All', 'Demixed', 'Transform'].map((tab) => (
                    <Text
                      key={tab}
                      style={[
                        styles.tabItem,
                        selectedTab === tab.toLowerCase() && styles.tabItemActive,
                      ]}
                      onPress={() => setSelectedTab(tab.toLowerCase())}
                    >
                      {tab}
                    </Text>
                  ))}
                </View>
              </View>

              {/* Songs List */}
              <View style={styles.songsList}>
                {[...demixedSongs, ...transformedSongs].map((song) => (
                  <SongCard 
                    key={song.id}
                    title={song.title} 
                    duration={song.duration} 
                    editedDate={song.editedDate} 
                    onClick={() => router.push('/demixing')} 
                  />
                ))}
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
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  headerTextGroup: {
    gap: 2,
  },
  vibeShiftText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },

  // Page Header
  pageHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },

  // Tab Navigation
  tabContainer: {
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 4,
    gap: 8,
  },
  tabItem: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  tabItemActive: {
    color: '#fff',
    fontWeight: '600',
    backgroundColor: Theme.primary,
    borderRadius: 20,
  },

  // Songs List
  songsList: {
    gap: 12,
  },
});
