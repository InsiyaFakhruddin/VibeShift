import Icon from '@/components/Icon';
import { SongCard } from '@/components/SongCard';
import { StemMixer } from '@/components/StemMixer';
import { ThemedView } from '@/components/themed-view';
import { UploadButton } from '@/components/UploadButton';
import { Theme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const previousSongs = [
  { id: 1, title: 'Rock Anthem', duration: '4:23', editedDate: 'Yesterday' },
  { id: 2, title: 'Jazz Night', duration: '5:01', editedDate: '3 days ago' },
];

const availableStems = [
  { id: 'vocals', name: 'Vocals', icon: '🎤', color: 'secondary' },
  { id: 'drums', name: 'Drums', icon: '🥁', color: 'accent' },
  { id: 'bass', name: 'Bass', icon: '🎸', color: 'primary' },
  { id: 'other', name: 'Other', icon: '🎹', color: 'cyan' },
  { id: 'piano', name: 'Piano', icon: '🎹', color: 'secondary' },
  { id: 'guitar', name: 'Guitar', icon: '🎸', color: 'accent' },
  { id: 'violin', name: 'Violin', icon: '🎻', color: 'primary' },
  { id: 'flute', name: 'Flute', icon: '🪈', color: 'cyan' },
  { id: 'trumpet', name: 'Trumpet', icon: '🎺', color: 'secondary' },
  { id: 'harmonica', name: 'Harmonica', icon: '🎼', color: 'accent' },
];

export default function Demixing() {
  const router = useRouter();
  const [isDemixed, setIsDemixed] = useState(false);
  const [stems, setStems] = useState<any[]>([]);
  const [showAddStemMenu, setShowAddStemMenu] = useState(false);

  const handleUpload = (file: any) => {
    console.log('uploaded', file);
  };

  const handleStemSettingsChange = (stemId: string, settings: any) => {
    setStems((prev) => 
      prev.map((stem) => 
        stem.id === stemId ? { ...stem, settings } : stem
      )
    );
  };

  const handleDeleteStem = (stemId: string) => {
    setStems((prev) => prev.filter((stem) => stem.id !== stemId));
  };

  const handleAddStem = (stemType: typeof availableStems[0]) => {
    const newStem = {
      id: `stem-${Date.now()}`,
      name: stemType.name,
      icon: stemType.icon,
      color: stemType.color,
      settings: { volume: 75, pitch: 0, timbre: 50 },
    };
    setStems((prev) => [...prev, newStem]);
    setShowAddStemMenu(false);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
        <LinearGradient colors={Theme.gradientDark as any} style={styles.background}>
          <View style={styles.header}>
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
              <Text style={styles.pageTitle}>Demix Music</Text>
              <Text style={styles.pageSubtitle}>Separate into individual stems</Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {!isDemixed ? (
              <>
                {/* PREVIOUSLY DEMIXED SECTION */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Previously Demixed</Text>
                  <View style={styles.songsList}>
                    {previousSongs.map((song) => (
                      <SongCard 
                        key={song.id} 
                        title={song.title} 
                        duration={song.duration} 
                        editedDate={song.editedDate} 
                        onClick={() => {
                          const sampleStems = [
                            { id: 'stem-1', name: 'Vocals', icon: '🎤', color: 'secondary', settings: { volume: 75, pitch: 0, timbre: 50 } },
                            { id: 'stem-2', name: 'Drums', icon: '🥁', color: 'accent', settings: { volume: 80, pitch: 0, timbre: 50 } },
                            { id: 'stem-3', name: 'Bass', icon: '🎸', color: 'primary', settings: { volume: 70, pitch: 0, timbre: 50 } },
                            { id: 'stem-4', name: 'Other', icon: '🎹', color: 'cyan', settings: { volume: 65, pitch: 0, timbre: 50 } },
                          ];
                          setStems(sampleStems);
                          setIsDemixed(true);
                        }} 
                      />
                    ))}
                  </View>
                </View>

                {/* UPLOAD CARD */}
                <View style={styles.uploadCard}>
                  <View style={styles.uploadIconContainer}>
                    <Icon name="sparkles" size={32} color={Theme.primary} />
                  </View>
                  <Text style={styles.uploadTitle}>Upload a Song</Text>
                  <Text style={styles.uploadSubtitle}>Select an audio file to start</Text>
                  <View style={styles.buttonRow}>
                    <View style={{ flex: 1 }}>
                      <UploadButton onUpload={handleUpload} />
                    </View>
                    <Text 
                      style={styles.previewButton}
                      onPress={() => {
                        const sampleStems = [
                          { id: 'stem-1', name: 'Vocals', icon: '🎤', color: 'secondary', settings: { volume: 75, pitch: 0, timbre: 50 } },
                          { id: 'stem-2', name: 'Drums', icon: '🥁', color: 'accent', settings: { volume: 80, pitch: 0, timbre: 50 } },
                          { id: 'stem-3', name: 'Bass', icon: '🎸', color: 'primary', settings: { volume: 70, pitch: 0, timbre: 50 } },
                          { id: 'stem-4', name: 'Other', icon: '🎹', color: 'cyan', settings: { volume: 65, pitch: 0, timbre: 50 } },
                        ];
                        setStems(sampleStems);
                        setIsDemixed(true);
                      }}
                    >
                      Try Demo
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.demixContainer}>
                {/* Demix Card */}
                <View style={styles.demixCard}>
                  <Text style={styles.cardHint}>Tap stem to select • Drag ring to adjust volume</Text>
                  
                  <StemMixer 
                    stems={stems}
                    onStemDelete={handleDeleteStem}
                    onSettingsChange={handleStemSettingsChange}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.resetButton}
                    onPress={() => setIsDemixed(false)}
                  >
                    <Icon name="rotate-ccw" size={18} color={Theme.accent} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.addStemButton}
                    onPress={() => setShowAddStemMenu(!showAddStemMenu)}
                  >
                    <Icon name="plus" size={18} color={Theme.accent} />
                    <Text style={styles.addStemButtonText}>Add Stem</Text>
                  </TouchableOpacity>
                  
                  {/* Add Stem Dropdown Menu */}
                  {showAddStemMenu && (
                    <View style={styles.dropdownMenu}>
                      {availableStems.map((stem) => (
                        <TouchableOpacity
                          key={stem.id}
                          style={styles.dropdownItem}
                          onPress={() => handleAddStem(stem)}
                        >
                          <Text style={styles.dropdownItemIcon}>{stem.icon}</Text>
                          <Text style={styles.dropdownItemText}>{stem.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.exportButton}
                    onPress={() => alert('Song demixed successfully!')}
                  >
                    <Text style={styles.exportButtonText}>Export Track</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </LinearGradient>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeContainer: { flex: 1 },
  background: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  
  // Header Section
  header: {
    gap: 16,
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  pageHeader: {
    alignItems: 'center',
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

  // Content Section
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  songsList: {
    gap: 12,
  },

  // Upload Card
  uploadCard: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: Theme.primary,
    shadowColor: Theme.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  uploadIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    width: '100%',
  },
  previewButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Theme.secondary,
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    overflow: 'hidden',
  },

  // Demix Container
  demixContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  demixCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHint: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 12,
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  resetButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Theme.accent,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStemButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: Theme.accent,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  addStemButtonText: {
    color: Theme.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  exportButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Theme.secondary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Dropdown Menu
  dropdownMenu: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    backgroundColor: Theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.primary,
    overflow: 'hidden',
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dropdownItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
