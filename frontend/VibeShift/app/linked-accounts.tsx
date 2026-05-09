import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { useUser } from '@clerk/clerk-expo';
import { AntDesign } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { hexToRgba, useAppTheme } from '@/context/AppearanceContext';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

// strategy  → Clerk's createExternalAccount expects 'oauth_*' prefix
// provider  → Clerk's externalAccount.provider returns without prefix
// antdIcon  → AntDesign icon name for the brand logo
const PROVIDERS = [
  { strategy: 'oauth_google' as const, provider: 'google', name: 'Google', antdIcon: 'google' as const },
  { strategy: 'oauth_github' as const, provider: 'github', name: 'GitHub', antdIcon: 'github' as const },
];

export default function LinkedAccounts() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const t = useAppTheme();

  const handleConnect = async (strategy: 'oauth_google' | 'oauth_github') => {
    if (!user) return;
    try {
      const ext = await user.createExternalAccount({
        strategy,
        redirectUrl: makeRedirectUri(),
      });
      const url = ext.verification?.externalVerificationRedirectURL;
      if (url) {
        const result = await WebBrowser.openAuthSessionAsync(url.toString(), makeRedirectUri());
        // Only reload when the OAuth flow completed — not on cancel/dismiss
        if (result.type === 'success') {
          await user.reload();
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message ?? 'Could not connect account.');
    }
  };

  const handleDisconnect = async (provider: string) => {
    const account = user?.externalAccounts?.find((a) => a.provider === provider);
    if (!account) return;
    try {
      await account.destroy();
      await user?.reload();
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message ?? 'Could not disconnect account.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Icon name="arrow-right" size={24} color={Theme.primary} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: t.text }]}>Linked Accounts</Text>
          <View style={{ width: 24 }} />
        </View>

        <LinearGradient colors={t.gradient as any} style={styles.background}>
          {!isLoaded ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Theme.primary} />
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.content}>
                {/* Description */}
                <View style={[styles.descriptionCard, { backgroundColor: hexToRgba(t.accent, 0.1), borderColor: t.accent }]}>
                  <Icon name="info" size={18} color={t.accent} />
                  <Text style={[styles.descriptionText, { color: t.subtitle }]}>
                    Connect your accounts to easily sign in and sync your data across platforms
                  </Text>
                </View>

                {/* Accounts List */}
                <View style={[styles.accountsList, { borderColor: t.accent, backgroundColor: hexToRgba(t.accent, 0.05) }]}>
                  {PROVIDERS.map((provider, index) => {
                    const externalAccount = user?.externalAccounts?.find(
                      (a) => a.provider === provider.provider && a.verification?.status === 'verified'
                    );
                    const isLinked = !!externalAccount;
                    const email = externalAccount?.emailAddress;
                    const linkedDate = externalAccount?.createdAt
                      ? new Date(externalAccount.createdAt).toLocaleDateString()
                      : undefined;

                    return (
                      <View key={provider.strategy}>
                        <View style={styles.accountCard}>
                          <View style={styles.accountInfo}>
                            <View
                              style={[
                                styles.iconCircle,
                                { borderColor: t.accent },
                                { backgroundColor: isLinked ? hexToRgba(t.accent, 0.2) : hexToRgba(t.accent, 0.05) },
                              ]}
                            >
                              <AntDesign
                                name={provider.antdIcon}
                                size={24}
                                color={isLinked ? t.accent : hexToRgba(t.accent, 0.4)}
                              />
                            </View>
                            <View style={styles.accountDetails}>
                              <Text style={[styles.accountName, { color: t.text }]}>{provider.name}</Text>
                              {isLinked && email ? (
                                <Text style={[styles.accountEmail, { color: t.subtitle }]}>{email}</Text>
                              ) : null}
                              {isLinked && linkedDate ? (
                                <Text style={[styles.linkedDate, { color: t.accentAlt }]}>Linked • {linkedDate}</Text>
                              ) : null}
                              {!isLinked && (
                                <Text style={[styles.notLinked, { color: t.subtitle }]}>Not connected</Text>
                              )}
                            </View>
                          </View>

                          {isLinked ? (
                            <TouchableOpacity
                              style={[styles.toggleButton, { backgroundColor: t.accent }]}
                              onPress={() => handleDisconnect(provider.provider)}
                            >
                              <Text style={styles.toggleButtonText}>Connected</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.toggleButton, { borderWidth: 1, borderColor: t.accent, backgroundColor: 'transparent' }]}
                              onPress={() => handleConnect(provider.strategy)}
                            >
                              <Text style={[styles.toggleButtonText, { color: t.accent }]}>Connect</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Divider */}
                        {index < PROVIDERS.length - 1 && <View style={[styles.divider, { backgroundColor: hexToRgba(t.accent, 0.2) }]} />}
                      </View>
                    );
                  })}
                </View>

                {/* Security Info */}
                <View style={styles.securityCard}>
                  <Icon name="shield" size={18} color={Theme.accent} />
                  <View style={styles.securityContent}>
                    <Text style={styles.securityTitle}>Your accounts are secure</Text>
                    <Text style={styles.securityText}>
                      We never store your passwords. Sign in using your provider's official authentication.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  content: {
    gap: 24,
  },

  // Description Card
  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: Theme.primary,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  descriptionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },

  // Accounts List
  accountsList: {
    borderWidth: 1,
    borderColor: Theme.primary,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    overflow: 'hidden',
  },

  accountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },

  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.primary,
  },

  accountDetails: {
    flex: 1,
  },

  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },

  accountEmail: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },

  linkedDate: {
    fontSize: 11,
    fontWeight: '400',
    color: Theme.primary,
  },

  notLinked: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    marginHorizontal: 16,
  },

  // Toggle Button — fixed width so Connect and Connected render the same size
  toggleButton: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },

  toggleButtonLinked: {
    backgroundColor: Theme.primary,
  },

  toggleButtonUnlinked: {
    borderWidth: 1,
    borderColor: Theme.primary,
    backgroundColor: 'transparent',
  },

  toggleButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },

  // Security Card
  securityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: Theme.accent,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },

  securityContent: {
    flex: 1,
    gap: 4,
  },

  securityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.accent,
  },

  securityText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },
});
