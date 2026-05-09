import { useAuth } from '@clerk/clerk-expo';
import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { hexToRgba, useAppTheme } from '@/context/AppearanceContext';
import { useProfile } from '@/context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

interface LibraryItem {
  id: string;
  type: 'demix' | 'transform';
  song_name: string;
  original_file_name: string;
  status: string;
  created_at: string;
  target_genre?: string;
  duration_seconds?: number;
}

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const t = useAppTheme();
  const color =
    status === 'completed'  ? t.accentAlt :
    status === 'failed'     ? '#ef4444' :
    status === 'processing' ? t.accent :
    'rgba(180,180,180,0.5)';
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

export default function Library() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { profile } = useProfile();
  const t = useAppTheme();
  const [selectedTab, setSelectedTab] = useState('all');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLibrary = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/library`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { fetchLibrary(); }, []);

  const filtered = items.filter((item) => {
    if (selectedTab === 'demixed')   return item.type === 'demix';
    if (selectedTab === 'transform') return item.type === 'transform';
    return true;
  });

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
              {/* Header row */}
              <View style={styles.headerTopRow}>
                <View style={styles.logoContainer}>
                  <View style={[styles.logoBall, { backgroundColor: t.accent, shadowColor: t.accent }]}>
                    <Icon name="disc-3" size={22} color="#fff" />
                  </View>
                  <View style={styles.headerTextGroup}>
                    <Text style={[styles.vibeShiftText, { color: t.text }]}>VibeShift</Text>
                    <Text style={[styles.greetingText, { color: t.subtitle }]}>Hi {profile?.name || 'there'}</Text>
                  </View>
                </View>
                <Pressable onPress={fetchLibrary}>
                  <Icon name="refresh-cw" size={20} color={t.subtitle} />
                </Pressable>
              </View>

              {/* Page header */}
              <View style={styles.pageHeader}>
                <Text style={[styles.pageTitle, { color: t.text }]}>Your Library</Text>
                <Text style={[styles.pageSubtitle, { color: t.subtitle }]}>All your edited tracks</Text>
              </View>

              {/* Tab bar */}
              <View style={styles.tabContainer}>
                <View style={[styles.tabBar, { backgroundColor: hexToRgba(t.accent, 0.08) }]}>
                  {(['All', 'Demixed', 'Transform'] as const).map((tab) => {
                    const active = selectedTab === tab.toLowerCase();
                    const isTransformTab = tab === 'Transform';
                    const activeBg = isTransformTab ? t.accentAlt : t.accent;
                    return (
                      <TouchableOpacity
                        key={tab}
                        style={[
                          styles.tabPill,
                          active && {
                            backgroundColor: activeBg,
                            borderWidth: 1.5,
                            borderColor: isTransformTab ? t.accent : t.accentAlt,
                          },
                        ]}
                        onPress={() => setSelectedTab(tab.toLowerCase())}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.tabText, { color: active ? '#fff' : t.subtitle }]}>
                          {tab}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Content */}
              {loading ? (
                <ActivityIndicator color={t.accent} style={{ marginTop: 40 }} />
              ) : filtered.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="library" size={48} color={t.subtitle} />
                  <Text style={[styles.emptyText, { color: t.subtitle }]}>No tracks yet</Text>
                  <Text style={[styles.emptySubtext, { color: t.subtitle }]}>Demix or transform a song to see it here</Text>
                </View>
              ) : (
                <View style={styles.songsList}>
                  {filtered.map((item) => {
                    const isDemix = item.type === 'demix';
                    const cardAccent = isDemix ? t.accent : t.accentAlt;
                    const cardAccentRing = isDemix ? t.accentAlt : t.accent;
                    return (
                      <Pressable
                        key={item.id}
                        style={({ pressed }) => [
                          styles.songCard,
                          {
                            backgroundColor: t.card,
                            borderColor: pressed ? cardAccentRing : t.border,
                          },
                        ]}
                        onPress={() => isDemix ? router.push('/demixing') : router.push('/genre-transform')}
                      >
                        {/* Left accent stripe */}
                        <View style={[styles.cardStripe, { backgroundColor: cardAccent }]} />

                        {/* Icon with ring */}
                        <View style={[styles.cardIcon, {
                          backgroundColor: hexToRgba(cardAccent, 0.15),
                          borderWidth: 1.5,
                          borderColor: hexToRgba(cardAccentRing, 0.5),
                        }]}>
                          <Icon
                            name={isDemix ? 'music-2' : 'sparkles'}
                            size={20}
                            color={cardAccent}
                          />
                        </View>

                        <View style={styles.cardInfo}>
                          <Text style={[styles.cardTitle, { color: t.text }]} numberOfLines={1}>{item.song_name}</Text>
                          {isDemix ? (
                            <Text style={[styles.cardMeta, { color: t.subtitle }]}>
                              <Text style={{ color: t.accent, fontWeight: '600' }}>Demixed</Text>
                              {` · ${timeAgo(item.created_at)}`}
                            </Text>
                          ) : (
                            <Text style={[styles.cardMeta, { color: t.subtitle }]}>
                              <Text style={{ color: t.accentAlt, fontWeight: '600' }}>→ {item.target_genre}</Text>
                              {` · ${timeAgo(item.created_at)}`}
                            </Text>
                          )}
                        </View>
                        <StatusBadge status={item.status} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
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
    width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  headerTextGroup: { gap: 2 },
  vibeShiftText: { fontSize: 16, fontWeight: '700' },
  greetingText: { fontSize: 12, fontWeight: '400' },

  pageHeader: { alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  pageSubtitle: { fontSize: 13 },

  tabContainer: { marginBottom: 20 },
  tabBar: { flexDirection: 'row', borderRadius: 24, padding: 4, gap: 8 },
  tabPill: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  tabText: { fontSize: 13, fontWeight: '500' },

  songsList: { gap: 12 },
  songCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, paddingVertical: 14, paddingRight: 14, borderWidth: 1,
    overflow: 'hidden',
  },
  cardStripe: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 2 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  cardMeta: { fontSize: 12 },

  badge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 13, textAlign: 'center' },
});
