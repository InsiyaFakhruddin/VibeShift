import Icon from '@/components/Icon';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LinkedAccount {
  id: string;
  name: string;
  provider: string;
  icon: string;
  isLinked: boolean;
  email?: string;
  linkedDate?: string;
}

export default function LinkedAccounts() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([
    {
      id: '1',
      name: 'Google',
      provider: 'google',
      icon: 'globe',
      isLinked: true,
      email: 'insiya@gmail.com',
      linkedDate: 'Jan 15, 2025',
    },
    {
      id: '2',
      name: 'Apple',
      provider: 'apple',
      icon: 'apple',
      isLinked: false,
    },
    {
      id: '3',
      name: 'Spotify',
      provider: 'spotify',
      icon: 'music',
      isLinked: true,
      email: 'insiya.spotify@spotify.com',
      linkedDate: 'Dec 1, 2024',
    },
  ]);

  const handleToggleAccount = (accountId: string) => {
    setAccounts((prevAccounts) =>
      prevAccounts.map((account) => {
        if (account.id === accountId) {
          const isNowLinked = !account.isLinked;
          return {
            ...account,
            isLinked: isNowLinked,
            linkedDate: isNowLinked ? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : undefined,
            email: isNowLinked ? account.email || `user@${account.provider}.com` : undefined,
          };
        }
        return account;
      })
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Icon name="arrow-right" size={24} color={Theme.primary} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <Text style={styles.headerTitle}>Linked Accounts</Text>
          <View style={{ width: 24 }} />
        </View>

        <LinearGradient colors={Theme.gradientDark as any} style={styles.background}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Description */}
              <View style={styles.descriptionCard}>
                <Icon name="info" size={18} color={Theme.primary} />
                <Text style={styles.descriptionText}>
                  Connect your accounts to easily sign in and sync your data across platforms
                </Text>
              </View>

              {/* Accounts List */}
              <View style={styles.accountsList}>
                {accounts.map((account, index) => (
                  <View key={account.id}>
                    <View style={styles.accountCard}>
                      <View style={styles.accountInfo}>
                        <View style={[styles.iconCircle, { backgroundColor: account.isLinked ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)' }]}>
                          <Icon 
                            name={account.icon} 
                            size={24} 
                            color={account.isLinked ? Theme.primary : 'rgba(255,255,255,0.5)'} 
                          />
                        </View>
                        <View style={styles.accountDetails}>
                          <Text style={styles.accountName}>{account.name}</Text>
                          {account.isLinked && account.email && (
                            <Text style={styles.accountEmail}>{account.email}</Text>
                          )}
                          {account.isLinked && account.linkedDate && (
                            <Text style={styles.linkedDate}>Linked • {account.linkedDate}</Text>
                          )}
                          {!account.isLinked && (
                            <Text style={styles.notLinked}>Not connected</Text>
                          )}
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.toggleButton,
                          account.isLinked ? styles.toggleButtonLinked : styles.toggleButtonUnlinked
                        ]}
                        onPress={() => handleToggleAccount(account.id)}
                      >
                        {account.isLinked ? (
                          <>
                            <Icon name="check" size={16} color="#fff" />
                            <Text style={styles.toggleButtonText}>Linked</Text>
                          </>
                        ) : (
                          <Text style={styles.toggleButtonText}>Connect</Text>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    {index < accounts.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
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

  // Toggle Button
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
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
    fontSize: 12,
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
