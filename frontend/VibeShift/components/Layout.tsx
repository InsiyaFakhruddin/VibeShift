import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/context/AppearanceContext';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from './Icon';

type Props = {
  children: React.ReactNode;
  username?: string;
};

export const Layout = ({ children, username = 'Insiya' }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const t = useAppTheme();

  // animated value for pulsing active indicator
  const pulse = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    // run pulse but do not use native driver so we can animate shadowOpacity on web
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    ).start();
  }, [pulse]);

  const navItems = [
    { path: '/', icon: 'home', label: 'Home' },
    { path: '/demixing', icon: 'music', label: 'Demixing' },
    { path: '/genre-transform', icon: 'shuffle', label: 'Transform' },
    { path: '/library', icon: 'folder', label: 'Library' },
    { path: '/profile', icon: 'user', label: 'Profile' },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeHeader} edges={['top', 'left', 'right']}>
        <LinearGradient colors={t.gradient as any} style={styles.header} start={[0, 0]} end={[1, 0]}>
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <LinearGradient colors={[Theme.primary, Theme.secondary]} style={styles.logoGradient} start={[0,0]} end={[1,1]}>
                <Icon name="music" size={18} color="#fff" />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.appTitle}>VibeShift</Text>
              <Text style={styles.small}>{`Hi ${username}`}</Text>
            </View>
          </View>
          <Pressable onPress={() => router.push('/settings' as any)} style={styles.settingsBtn}>
            <View style={styles.settingsCircle}><Icon name="settings" size={16} color="#fff" /></View>
          </Pressable>
        </LinearGradient>
      </SafeAreaView>

      <View style={styles.content}>{children}</View>

      {/* Bottom navigation moved to the central tab layout (BottomTabBar). */}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeHeader: { backgroundColor: 'transparent' },
  header: {
    height: 72,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: 'rgba(124,58,237,0.12)',
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    // backgroundColor set by inner gradient
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 10,
  },
  logoGradient: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  small: { fontSize: 12 },
  settingsBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  settingsCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', shadowColor: Theme.primary, shadowOpacity: 0.16, shadowRadius: 12 },
  appTitle: { fontSize: 16, color: Theme.primary },
  content: { flex: 1, paddingTop: 8 },
  bottomNav: {
    height: 76,
    borderTopWidth: 1,
    borderColor: 'rgba(124,58,237,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(10,10,10,0.16)',
    // mimic glass nav
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  navItem: { alignItems: 'center', paddingHorizontal: 8 },
  navIconWrap: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navIconActive: { backgroundColor: Theme.card, shadowColor: Theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 28, elevation: 16, borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)' },
  navLabel: { fontSize: 11, marginTop: 4, color: '#bdbdbd' },
  navLabelActive: { color: Theme.primary, fontWeight: '700' },
  indicator: { width: 6, height: 6, borderRadius: 6, backgroundColor: 'transparent', marginTop: 6 },
  indicatorActive: { backgroundColor: Theme.primary, shadowColor: Theme.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.42, shadowRadius: 14, elevation: 8 },
});
