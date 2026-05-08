import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChangePassword() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = () => {
    setError('');

    if (!oldPassword.trim()) {
      setError('Please enter your old password');
      return false;
    }

    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return false;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return false;
    }

    if (oldPassword === newPassword) {
      setError('New password must be different from old password');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validatePassword()) return;

    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      alert('Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1000);
  };

  const isFormValid = oldPassword.trim() && newPassword.trim() && confirmPassword.trim();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Icon name="arrow-right" size={24} color={Theme.primary} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={{ width: 24 }} />
        </View>

        <LinearGradient colors={Theme.gradientDark as any} style={styles.background}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Info Card */}
              <View style={styles.infoCard}>
                <Icon name="info" size={18} color={Theme.primary} />
                <Text style={styles.infoText}>
                  Your password should be at least 8 characters long and unique
                </Text>
              </View>

              {/* Old Password */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Old Password</Text>
                <View style={styles.passwordInputContainer}>
                  <Icon name="lock" size={18} color={Theme.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your old password"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    secureTextEntry={!showOldPassword}
                  />
                  <Pressable onPress={() => setShowOldPassword(!showOldPassword)}>
                    <Icon 
                      name={showOldPassword ? 'eye-off' : 'eye'} 
                      size={18} 
                      color="rgba(255,255,255,0.5)" 
                    />
                  </Pressable>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <Icon name="lock" size={18} color={Theme.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your new password"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                  />
                  <Pressable onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Icon 
                      name={showNewPassword ? 'eye-off' : 'eye'} 
                      size={18} 
                      color="rgba(255,255,255,0.5)" 
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Confirm New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <Icon name="lock" size={18} color={Theme.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm your new password"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Icon 
                      name={showConfirmPassword ? 'eye-off' : 'eye'} 
                      size={18} 
                      color="rgba(255,255,255,0.5)" 
                    />
                  </Pressable>
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Icon name="alert-circle" size={16} color="#ff6b6b" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Password Strength Indicator */}
              {newPassword && (
                <View style={styles.strengthContainer}>
                  <Text style={styles.strengthLabel}>Password Strength</Text>
                  <View style={styles.strengthBar}>
                    <View 
                      style={[
                        styles.strengthFill,
                        {
                          width: `${Math.min(newPassword.length * 12.5, 100)}%`,
                          backgroundColor: newPassword.length >= 8 ? Theme.accent : Theme.secondary
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.strengthText}>
                    {newPassword.length < 8 ? '⚠ Weak' : '✓ Strong'}
                  </Text>
                </View>
              )}

              {/* Save Button */}
              <TouchableOpacity 
                style={[
                  styles.saveButton,
                  (!isFormValid || isSaving) && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={!isFormValid || isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Update Password'}
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
    gap: 20,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: Theme.primary,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },

  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Password Input
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.primary,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  inputIcon: {
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#ff6b6b',
  },

  // Strength
  strengthContainer: {
    gap: 8,
  },
  strengthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  strengthBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.primary,
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
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
