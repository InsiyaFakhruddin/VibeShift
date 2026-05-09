import GradientText from '@/components/GradientText';
import { GenreBubble } from '@/components/GenreBubble';
import Icon from '@/components/Icon';
import { SongCard } from '@/components/SongCard';
import { ThemedView } from '@/components/themed-view';
import { UploadButton } from '@/components/UploadButton';
import { Theme } from '@/constants/theme';
import { hexToRgba, useAppTheme } from '@/context/AppearanceContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const previousSongs = [
  { id: 1, title: 'Electronic Dreams', duration: '3:45', editedDate: 'Yesterday' },
  { id: 2, title: 'Acoustic Session', duration: '4:12', editedDate: '2 days ago' },
];

const genres = [
  { id: 1, name: 'Pop', position: { x: 30, y: 25 } },
  { id: 2, name: 'Rock', position: { x: 70, y: 30 } },
  { id: 3, name: 'EDM', position: { x: 50, y: 50 } },
  { id: 4, name: 'Jazz', position: { x: 25, y: 70 } },
  { id: 5, name: 'Classical', position: { x: 75, y: 70 } },
];

export default function GenreTransform() {
  const router = useRouter();
  const t = useAppTheme();
  const [isTransforming, setIsTransforming] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

  const handleUpload = (file: any) => {
    setIsTransforming(true);
  };

  const handleGenreSelect = (id: number) => {
    setSelectedGenre(id);
  };

  const handlePreview = (genreId: number) => {
    // placeholder for preview audio
  };

  const handleSave = () => {
    // placeholder save
  };

  const handleDiscard = () => {
    setIsTransforming(false);
    setSelectedGenre(null);
  };

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
              <View style={styles.headerTopRow}>
                <View style={styles.logoContainer}>
                  <View style={[styles.logoBall, { backgroundColor: t.accent, shadowColor: t.accent }]}>
                    <Icon name="disc-3" size={22} color="#fff" />
                  </View>
                  <View style={styles.headerTextGroup}>
                    <Text style={[styles.vibeShiftText, { color: t.accent }]}>VibeShift</Text>
                    <Text style={[styles.greetingText, { color: t.subtitle }]}>Hi Insiya</Text>
                  </View>
                </View>
                <Pressable onPress={() => router.push('/account-settings')}>
                  <Icon name="settings" size={24} color={t.subtitle} />
                </Pressable>
              </View>

              {/* Page Title */}
              <View style={styles.pageHeader}>
                <GradientText text="Genre Transform" colors={[t.accent, t.accentAlt]} fontSize={28} height={38} style={{ width: '100%' }} align="center" />
                <Text style={[styles.pageSubtitle, { color: t.subtitle }]}>Transform into any genre</Text>
              </View>

              {!isTransforming ? (
                <View style={styles.contentArea}>
                  {/* Previously Transformed */}
                  <View style={styles.previousSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: t.accentAlt }} />
                      <Text style={[styles.sectionTitle, { color: t.text, marginBottom: 0 }]}>Previously Transformed</Text>
                    </View>
                    <View style={styles.songsList}>
                      {previousSongs.map((song) => (
                        <SongCard key={song.id} title={song.title} duration={song.duration} editedDate={song.editedDate} onClick={() => setIsTransforming(true)} />
                      ))}
                    </View>
                  </View>

                  {/* Upload Card */}
                  <View style={[styles.uploadCard, { borderColor: t.accent, backgroundColor: t.card, shadowColor: t.accent }]}>
                    <View style={[styles.uploadIconContainer, {
                      borderColor: t.accent,
                      backgroundColor: hexToRgba(t.accent, 0.05),
                      shadowColor: t.accentAlt,
                      shadowOpacity: 0.4,
                      shadowRadius: 14,
                      elevation: 5,
                    }]}>
                      <Icon name="sparkles" size={36} color={t.accent} />
                    </View>
                    <Text style={[styles.uploadTitle, { color: t.text }]}>Upload a Song</Text>
                    <Text style={[styles.uploadSubtitle, { color: t.subtitle }]}>Select an audio file to transform</Text>
                    <UploadButton onUpload={handleUpload} />
                  </View>
                </View>
              ) : (
                <View style={styles.contentArea}>
                  <View style={styles.genreView}>
                    <View style={styles.genreHeader}>
                      <Text style={[styles.genreTitle, { color: t.text }]}>Select a Genre</Text>
                      <Text style={[styles.genreSubtitle, { color: t.subtitle }]}>Tap to select</Text>
                    </View>

                    <View style={styles.bubbleContainer}>
                      {genres.map((genre) => (
                        <GenreBubble key={genre.id} genre={genre.name} position={genre.position} isSelected={selectedGenre === genre.id} onSelect={() => handleGenreSelect(genre.id)} onPreview={() => handlePreview(genre.id)} />
                      ))}
                    </View>
                  </View>

                  {selectedGenre !== null && (
                    <View style={styles.actionsRow}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.discardButton,
                          {
                            borderColor: pressed ? t.accentAlt : hexToRgba(t.accent, 0.4),
                            backgroundColor: pressed ? hexToRgba(t.accentAlt, 0.08) : 'transparent',
                          },
                        ]}
                        onPress={handleDiscard}
                      >
                        {({ pressed }) => (
                          <Text style={{ color: pressed ? t.accentAlt : t.subtitle, fontSize: 13, fontWeight: '600' }}>Discard</Text>
                        )}
                      </Pressable>
                      <Pressable style={{ flex: 1 }} onPress={handleSave}>
                        <LinearGradient
                          colors={[t.accent, t.accentAlt]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.downloadButton}
                        >
                          <Text style={styles.downloadButtonText}>Download</Text>
                        </LinearGradient>
                      </Pressable>
                    </View>
                  )}
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
  contentWrap: { flex: 1, gap: 20 },

  // Header
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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

  // Page Header
  pageHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  pageSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },

  // Content
  contentArea: {
    flex: 1,
    gap: 20,
  },
  previousSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  songsList: {
    gap: 12,
  },

  // Upload Card
  uploadCard: {
    borderWidth: 1,
    borderColor: Theme.primary,
    borderRadius: 20,
    backgroundColor: Theme.card,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  uploadIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.primary,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  uploadTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Genre Selection
  genreView: {
    flex: 1,
    borderRadius: 12,
  },
  genreHeader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  genreTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  genreSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },
  bubbleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  discardButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
