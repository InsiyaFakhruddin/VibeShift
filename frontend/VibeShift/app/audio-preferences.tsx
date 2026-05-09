import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/context/AppearanceContext';
import { useProfile } from '@/context/UserContext';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low', description: '128kbps' },
  { value: 'standard', label: 'Standard', description: '192kbps' },
  { value: 'high', label: 'High', description: '320kbps' },
];

const FORMAT_OPTIONS = [
  { value: 'mp3', label: 'MP3', description: 'Compressed' },
  { value: 'wav', label: 'WAV', description: 'Lossless' },
  { value: 'flac', label: 'FLAC', description: 'HD Lossless' },
];

export default function AudioPreferences() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { profile, setProfile } = useProfile();
  const t = useAppTheme();

  const [audioQuality, setAudioQuality] = useState('high');
  const [exportFormat, setExportFormat] = useState('wav');
  const [savingQuality, setSavingQuality] = useState(false);
  const [savingFormat, setSavingFormat] = useState(false);

  useEffect(() => {
    if (profile) {
      setAudioQuality(profile.audio_quality ?? 'high');
      setExportFormat(profile.export_format ?? 'wav');
    }
  }, [profile]);

  const savePreference = async (key: 'audio_quality' | 'export_format', value: string) => {
    const setSaving = key === 'audio_quality' ? setSavingQuality : setSavingFormat;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok && profile) {
        setProfile({ ...profile, [key]: value });
      }
    } catch (_) {}
    finally { setSaving(false); }
  };

  const handleQualitySelect = async (value: string) => {
    setAudioQuality(value);
    await savePreference('audio_quality', value);
  };

  const handleFormatSelect = async (value: string) => {
    setExportFormat(value);
    await savePreference('export_format', value);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomColor: t.border }]}>
          <Pressable onPress={() => router.back()}>
            <Icon name="arrow-right" size={24} color={t.accent} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: t.text }]}>Audio Preferences</Text>
          <View style={{ width: 24 }} />
        </View>

        <LinearGradient colors={t.gradient as any} style={styles.background}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Audio Quality */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <Icon name="audio-lines" size={18} color={Theme.primary} />
                </View>
                <View style={styles.sectionTitleWrap}>
                  <Text style={styles.sectionTitle}>Audio Quality</Text>
                  <Text style={styles.sectionSubtitle}>Affects processing speed and output clarity</Text>
                </View>
                {savingQuality && <ActivityIndicator size="small" color={Theme.primary} />}
              </View>

              <View style={styles.tabRow}>
                {QUALITY_OPTIONS.map((opt) => {
                  const active = audioQuality === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.tab, active && styles.tabActive]}
                      onPress={() => handleQualitySelect(opt.value)}
                    >
                      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={[styles.tabDesc, active && styles.tabDescActive]}>
                        {opt.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Export Format */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <Icon name="shuffle" size={18} color={Theme.primary} />
                </View>
                <View style={styles.sectionTitleWrap}>
                  <Text style={styles.sectionTitle}>Export Format</Text>
                  <Text style={styles.sectionSubtitle}>All output files will use this format</Text>
                </View>
                {savingFormat && <ActivityIndicator size="small" color={Theme.primary} />}
              </View>

              <View style={styles.tabRow}>
                {FORMAT_OPTIONS.map((opt) => {
                  const active = exportFormat === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.tab, active && styles.tabActive]}
                      onPress={() => handleFormatSelect(opt.value)}
                    >
                      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={[styles.tabDesc, active && styles.tabDescActive]}>
                        {opt.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Info card */}
            <View style={styles.infoCard}>
              <Icon name="info" size={16} color={Theme.primary} />
              <Text style={styles.infoText}>
                Changes are saved automatically. Export format applies to all demixed stems and genre-transformed tracks.
              </Text>
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeContainer: { flex: 1, flexDirection: 'column' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Theme.card,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  background: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 24 },

  section: {
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitleWrap: { flex: 1 },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },

  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    gap: 4,
  },

  tabActive: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },

  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },

  tabLabelActive: {
    color: '#fff',
  },

  tabDesc: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
  },

  tabDescActive: {
    color: 'rgba(255,255,255,0.85)',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
});
