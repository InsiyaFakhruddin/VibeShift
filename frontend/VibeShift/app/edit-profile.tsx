import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditProfile() {
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState('Insiya');
  const [bio, setBio] = useState('Music enthusiast • Sound designer • AI explorer');
  const [isSaving, setIsSaving] = useState(false);

  const pickImage = async () => {
    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    setTimeout(() => {
      setIsSaving(false);
      alert('Profile updated successfully!');
    }, 1000);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Icon name="arrow-right" size={24} color={Theme.primary} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <LinearGradient colors={Theme.gradientDark as any} style={styles.background}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Profile Image Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile Picture</Text>
                <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.profileImage} />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Icon name="user" size={48} color={Theme.primary} />
                    </View>
                  )}
                  <View style={styles.editBadge}>
                    <Icon name="camera" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.helperText}>Tap to change your profile picture</Text>
              </View>

              {/* Name Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Display Name</Text>
                <View style={styles.inputContainer}>
                  <Icon name="user" size={18} color={Theme.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Your name"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
                <Text style={styles.helperText}>{name.length}/30 characters</Text>
              </View>

              {/* Bio Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <View style={[styles.inputContainer, styles.bioContainer]}>
                  <Icon name="edit-3" size={18} color={Theme.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, styles.bioInput]}
                    placeholder="Tell us about yourself"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    maxLength={150}
                  />
                </View>
                <Text style={styles.helperText}>{bio.length}/150 characters</Text>
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
  scrollContent: { paddingBottom: 40 },

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

  // Image Section
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

  // Input Sections
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
    height: 100,
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
    paddingVertical: 8,
    maxHeight: 80,
  },
  helperText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
  },

  // Save Button
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
