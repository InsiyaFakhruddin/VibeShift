import { useAuth } from '@clerk/clerk-expo';
import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { hexToRgba, useAppTheme } from '@/context/AppearanceContext';
import { useProfile } from '@/context/UserContext';
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export default function EditProfile() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { profile, refreshProfile } = useProfile();

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const t = useAppTheme();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setBio(profile.bio ?? '');
      setProfileImage(profile.avatar_url ?? null);
    }
  }, [profile]);

  const pickImage = async () => {
    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const ext = result.assets[0].uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      const dataUri = `data:${mime};base64,${result.assets[0].base64}`;
      setProfileImage(dataUri);
      setNewImageBase64(dataUri);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = await getToken();
      const body: Record<string, string> = { name, bio };
      if (newImageBase64) {
        body.avatar_url = newImageBase64;
      }
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await refreshProfile();
        Alert.alert('Saved', 'Profile updated successfully!');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to save profile. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', String(err?.message ?? err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomColor: t.border }]}>
          <Pressable onPress={() => router.back()}>
            <Icon name="arrow-right" size={24} color={t.accent} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: t.text }]}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <LinearGradient colors={t.gradient as any} style={styles.background}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Profile Image Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: t.text }]}>Profile Picture</Text>
                <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={[styles.profileImage, { borderColor: t.accent }]} />
                  ) : (
                    <View style={[styles.placeholderImage, { backgroundColor: hexToRgba(t.accent, 0.12), borderColor: t.accent }]}>
                      <Icon name="user" size={48} color={t.accent} />
                    </View>
                  )}
                  <View style={[styles.editBadge, { backgroundColor: t.accent }]}>
                    <Icon name="camera" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={[styles.helperText, { color: t.subtitle }]}>Tap to change your profile picture</Text>
              </View>

              {/* Name Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: t.text }]}>Display Name</Text>
                <View style={[styles.inputContainer, { borderColor: t.accent, backgroundColor: hexToRgba(t.accent, 0.05) }]}>
                  <Icon name="user" size={18} color={t.accent} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: t.text }]}
                    placeholder="Your name"
                    placeholderTextColor={t.subtitle}
                    value={name}
                    onChangeText={setName}
                    maxLength={30}
                  />
                </View>
                <Text style={[styles.helperText, { color: t.subtitle }]}>{name.length}/30 characters</Text>
              </View>

              {/* Bio Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: t.text }]}>Bio</Text>
                <View style={[styles.inputContainer, styles.bioContainer, { borderColor: t.accent, backgroundColor: hexToRgba(t.accent, 0.05) }]}>
                  <Icon name="edit-3" size={18} color={t.accent} style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 2 }]} />
                  <TextInput
                    style={[styles.textInput, styles.bioInput, { color: t.text }]}
                    placeholder="Music enthusiast • Sound designer • AI explorer"
                    placeholderTextColor={hexToRgba(t.accent, 0.45)}
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    maxLength={150}
                  />
                </View>
                <Text style={[styles.helperText, { color: t.subtitle }]}>{bio.length}/150 characters</Text>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
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
  background: { flex: 1, paddingHorizontal: 20 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40, paddingTop: 24 },

  content: {
    gap: 24,
  },

  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  imageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Theme.primary,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 2,
    borderColor: Theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1a1a2e',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.primary,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    paddingHorizontal: 12,
    height: 48,
  },
  bioContainer: {
    height: 110,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  bioInput: {
    paddingVertical: 0,
    textAlignVertical: 'top',
    maxHeight: 90,
  },
  helperText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
  },

  saveButton: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: Theme.secondary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
