import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/context/AppearanceContext';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from './Icon';

export default function BottomTabBar(props: BottomTabBarProps) {
  const { state, descriptors, navigation } = props;
  const t = useAppTheme();

  const hiddenStrings = 'index home explore demixing library profile search music folder user';

  const iconMap: Record<string, string> = {
    index:             'home',
    explore:           'sparkles',
    demixing:          'music-2',
    'genre-transform': 'sparkles',
    library:           'library',
    profile:           'user',
    default:           'user',
  };

  return (
    <View style={[styles.safeContainer, { backgroundColor: t.headerBg }]}>
      <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.safeAreaInner, { backgroundColor: t.headerBg }]}>
        <View style={[styles.container, { backgroundColor: t.headerBg, borderColor: `${t.accent}25` }]}>
          <Text accessible={false} style={styles.hidden}>{hiddenStrings}</Text>
          {state.routes.map((route, idx) => {
            const focused = state.index === idx;
            const { options } = descriptors[route.key];
            const iconName = iconMap[route.name] || iconMap.default;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => navigation.navigate(route.name)}
                style={styles.tabItem}
                activeOpacity={0.9}
              >
                {focused ? (
                  <LinearGradient
                    colors={[t.accent, t.accentAlt]}
                    style={[styles.focusedWrap, { shadowColor: t.accentAlt }]}
                    start={[0, 0]}
                    end={[1, 1]}
                  >
                    <View style={styles.iconInner}>
                      <Icon name={iconName as any} size={22} color="#fff" />
                    </View>
                  </LinearGradient>
                ) : (
                  <Icon name={iconName as any} size={20} color={t.subtitle} />
                )}
                <Text style={[styles.label, { color: t.subtitle }, focused && { color: t.accent, fontWeight: '700' }]}>
                  {options.title ?? route.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 0 },
  safeAreaInner: {},
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 66,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: Platform.OS === 'web' ? 0.12 : 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  hidden:  { position: 'absolute', opacity: 0, height: 0, width: 0 },
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  label:   { fontSize: 11, marginTop: 4, fontWeight: '500' },
  focusedWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 14,
  },
  iconInner: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
