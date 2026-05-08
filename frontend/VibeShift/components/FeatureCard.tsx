import { ThemedText } from '@/components/themed-text';
import { Theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import Icon from './Icon';

type Props = {
  title: string;
  description?: string;
  icon?: React.ReactElement;
  to?: string;
  gradient?: 'primary' | 'secondary' | string;
  style?: any;
};

export function FeatureCard({ title, description, icon, to, gradient = 'primary', style }: Props) {
  const router = useRouter();
  const scale = React.useRef(new Animated.Value(1)).current;

  function animateHover(toValue: number) {
    Animated.spring(scale, { toValue, useNativeDriver: false, friction: 8 }).start();
  }

  return (
    <Pressable
      onPress={() => to && router.push(to as any)}
      onHoverIn={() => Platform.OS === 'web' && animateHover(0.985)}
      onHoverOut={() => Platform.OS === 'web' && animateHover(1)}
      onPressIn={() => animateHover(0.98)}
      onPressOut={() => animateHover(1)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.animatedWrap, style, { transform: [{ scale }], width: '100%' }]}>
        <View style={styles.hollowCard}>
          <View style={styles.leftIcon}>{icon}</View>
          <View style={styles.body}>
            <ThemedText style={styles.title} type="defaultSemiBold">
              {title}
            </ThemedText>
            {description ? <ThemedText style={styles.desc}>{description}</ThemedText> : null}
          </View>
          <Icon name="arrow-right" size={20} color={Theme.primary} style={styles.arrow} />
        </View>
      </Animated.View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 8,
  },
  animatedWrap: {
    borderRadius: 20,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  pressed: {
    opacity: 0.95,
  },
  hollowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: Theme.primary,
    overflow: 'hidden',
  },
  leftIcon: {
    width: 68,
    height: 68,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 16,
    borderWidth: 1,
    borderColor: Theme.primary,
    overflow: 'hidden',
  },
  wideCard: { flex: 1, marginHorizontal: 8 },
  body: { flex: 1 },
  title: { fontSize: 18, color: '#fff', fontWeight: '600' },
  desc: { fontSize: 13, marginTop: 4, color: 'rgba(255,255,255,0.7)' },
  arrow: { marginLeft: 8 },
});

