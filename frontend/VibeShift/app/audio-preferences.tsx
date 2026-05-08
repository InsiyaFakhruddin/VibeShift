import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AudioPreferences() {
  const router = useRouter();
  const [audioQuality, setAudioQuality] = useState('high');
  const [exportFormat, setExportFormat] = useState('wav');

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
              {/* Header */}
              <View style={styles.headerRow}>
                <Pressable onPress={() => router.back()}>
                  <Icon name="arrow-right" size={24} color={Theme.primary} style={{ transform: [{ rotate: '180deg' }] }} />
                </Pressable>
                <Text style={styles.headerTitle}>Audio Preferences</Text>
                <View style={{ width: 24 }} />
              </View>

              {/* Audio Preferences Title */}
              <Text style={styles.contentTitle}>AUDIO PREFERENCES</Text>

              {/* Audio Quality Option */}
              <Pressable style={styles.settingOption}>
                <View style={[styles.optionIcon, { backgroundColor: `${Theme.primary}20` }]}>
                  <Icon name="audio-lines" size={20} color={Theme.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Audio Quality</Text>
                  <Text style={styles.optionSubtitle}>High (320kbps)</Text>
                </View>
                <Icon name="arrow-right" size={20} color="rgba(255,255,255,0.5)" />
              </Pressable>

              {/* Export Format Option */}
              <Pressable style={styles.settingOption}>
                <View style={[styles.optionIcon, { backgroundColor: `${Theme.primary}20` }]}>
                  <Icon name="shuffle" size={20} color={Theme.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Export Format</Text>
                  <Text style={styles.optionSubtitle}>WAV, MP3, FLAC</Text>
                </View>
                <Icon name="arrow-right" size={20} color="rgba(255,255,255,0.5)" />
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
