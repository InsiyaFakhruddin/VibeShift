import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { useUser } from '@clerk/clerk-expo';
import { hexToRgba, useAppTheme } from '@/context/AppearanceContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PasswordRequirement {
  label: string;
  met: boolean;
}

function getRequirements(password: string): PasswordRequirement[] {
  return [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character (!@#$%^&* etc.)', met: /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(password) },
  ];
}

function allRequirementsMet(password: string): boolean {
  return getRequirements(password).every((r) => r.met);
}

export default function ChangePassword() {
  const router = useRouter();
  const { user } = useUser();

  const t = useAppTheme();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const requirements = getRequirements(newPassword);
  const passwordStrong = allRequirementsMet(newPassword);

  const isFormValid =
    oldPassword.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    passwordStrong;

  const validatePassword = (): boolean => {
    setError('');

    if (!oldPassword.trim()) {
      setError('Please enter your current password.');
      return false;
    }

    if (!newPassword.trim()) {
      setError('Please enter a new password.');
      return false;
    }

    if (oldPassword === newPassword) {
      setError('New password must be different from your current password.');
      return false;
    }

    if (!passwordStrong) {
      setError('New password does not meet all requirements.');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validatePassword()) return;
    if (!user) return;

    setIsSaving(true);
    setError('');

    try {
      await user.updatePassword({ currentPassword: oldPassword, newPassword });
      Alert.alert('Success', 'Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      router.back();
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.message ?? 'Something went wrong. Try again.';
      setError(msg);
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
          <Text style={[styles.headerTitle, { color: t.text }]}>Change Password</Text>
          <View style={{ width: 24 }} />
        </View>

        <LinearGradient colors={t.gradient as any} style={styles.background}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Info Card */}
              <View style={[styles.infoCard, { backgroundColor: hexToRgba(t.accent, 0.1), borderColor: t.accent }]}>
                <Icon name="info" size={18} color={t.accent} />
                <Text style={[styles.infoText, { color: t.subtitle }]}>
                  Use a strong password with 8+ characters, uppercase, lowercase, numbers, and special characters.
                </Text>
              </View>

              {/* Old Password */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: t.text }]}>Current Password</Text>
                <View style={[styles.passwordInputContainer, { borderColor: t.accent, backgroundColor: hexToRgba(t.accent, 0.05) }]}>
                  <Icon name="lock" size={18} color={t.accent} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: t.text }]}
                    placeholder="Enter your current password"
                    placeholderTextColor={t.subtitle}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    secureTextEntry={!showOldPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowOldPassword(!showOldPassword)}>
                    <Icon name={showOldPassword ? 'eye-off' : 'eye'} size={18} color={t.subtitle} />
                  </Pressable>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: t.text }]}>New Password</Text>
                <View style={[styles.passwordInputContainer, { borderColor: t.accent, backgroundColor: hexToRgba(t.accent, 0.05) }]}>
                  <Icon name="lock" size={18} color={t.accent} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: t.text }]}
                    placeholder="Enter your new password"
                    placeholderTextColor={t.subtitle}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Icon name={showNewPassword ? 'eye-off' : 'eye'} size={18} color={t.subtitle} />
                  </Pressable>
                </View>

                {/* Requirements checklist — shown as soon as user starts typing */}
                {newPassword.length > 0 && (
                  <View style={[styles.requirementsContainer, { backgroundColor: hexToRgba(t.accent, 0.07) }]}>
                    {requirements.map((req) => (
                      <View key={req.label} style={styles.requirementRow}>
                        <Text style={[styles.requirementIcon, req.met ? styles.reqMet : { color: t.subtitle }]}>
                          {req.met ? '✓' : '✗'}
                        </Text>
                        <Text style={[styles.requirementText, req.met ? styles.reqMet : { color: t.subtitle }]}>
                          {req.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Confirm Password */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: t.text }]}>Confirm New Password</Text>
                <View style={[styles.passwordInputContainer, { borderColor: t.accent, backgroundColor: hexToRgba(t.accent, 0.05) }]}>
                  <Icon name="lock" size={18} color={t.accent} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: t.text }]}
                    placeholder="Confirm your new password"
                    placeholderTextColor={t.subtitle}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color={t.subtitle} />
                  </Pressable>
                </View>
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Icon name="alert-circle" size={16} color="#ff6b6b" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!isFormValid || isSaving) && styles.saveButtonDisabled,
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

  // Requirements checklist
  requirementsContainer: {
    backgroundColor: 'rgba(168, 85, 247, 0.07)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementIcon: {
    fontSize: 13,
    fontWeight: '700',
    width: 16,
    textAlign: 'center',
  },
  requirementText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reqMet: {
    color: '#22c55e',
  },
  reqUnmet: {
    color: 'rgba(255,255,255,0.4)',
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
