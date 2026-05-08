import { ThemedText } from '@/components/themed-text';
import { Theme } from '@/constants/theme';
import React, { useEffect } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import Icon from './Icon';

type Props = {
  title: string;
  duration?: string;
  editedDate?: string;
  onClick?: () => void;
};

// Animated equalizer bar component
function EqualizerBar({ delay, maxHeight }: { delay: number; maxHeight: number }) {
  const scaleY = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Start animation after delay
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleY, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleY, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, delay * 100);

    return () => clearTimeout(timer);
  }, [scaleY, delay]);

  return (
    <Animated.View
      style={[
        styles.eqBar,
        {
          height: `${maxHeight}%`,
          transform: [{ scaleY }],
          transformOrigin: 'center',
        },
      ]}
    />
  );
}

export function SongCard({ title, duration, editedDate, onClick }: Props) {
  const scale = React.useRef(new Animated.Value(1)).current;

  // Random heights for 5 bars (between 20-60%)
  const barHeights = React.useMemo(() => [
    Math.floor(Math.random() * 40) + 20,
    Math.floor(Math.random() * 40) + 20,
    Math.floor(Math.random() * 40) + 20,
    Math.floor(Math.random() * 40) + 20,
    Math.floor(Math.random() * 40) + 20,
  ], []);
  
  function animate(toValue: number) {
    Animated.spring(scale, { toValue, useNativeDriver: false, friction: 8 }).start();
  }

  return (
    <Pressable
      onPress={onClick}
      onHoverIn={() => Platform.OS === 'web' && animate(0.985)}
      onHoverOut={() => Platform.OS === 'web' && animate(1)}
      onPressIn={() => animate(0.98)}
      onPressOut={() => animate(1)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={styles.left}>
          {/* Animated equalizer background */}
          <View style={styles.equalizerBg}>
            <EqualizerBar delay={0} maxHeight={barHeights[0]} />
            <EqualizerBar delay={1} maxHeight={barHeights[1]} />
            <EqualizerBar delay={2} maxHeight={barHeights[2]} />
            <EqualizerBar delay={3} maxHeight={barHeights[3]} />
            <EqualizerBar delay={4} maxHeight={barHeights[4]} />
          </View>
          
          {/* Music icon on top - solid, full opacity */}
          <View style={styles.iconOverlay}>
            <Icon name="music-2" size={20} color={Theme.primary} />
          </View>
        </View>
      </Animated.View>

      <View style={styles.meta}>
        <ThemedText style={styles.title} type="defaultSemiBold">{title}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {duration ? <ThemedText style={styles.sub}>{duration}</ThemedText> : null}
          {duration && editedDate ? <View style={{ width: 6, height: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 8 }} /> : null}
          {editedDate ? <ThemedText style={styles.sub}>{editedDate}</ThemedText> : null}
        </View>
      </View>
      <Icon name="clock" size={14} color="rgba(255,255,255,0.6)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Theme.card,
    borderWidth: 1,
    borderColor: Theme.primary,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.9 },
  left: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: Theme.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  equalizerBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  eqBar: {
    width: 2,
    backgroundColor: Theme.primary,
    borderRadius: 1,
    opacity: 0.25,
  },
  iconOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  meta: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  sub: {
    fontSize: 12,
    marginTop: 4,
    color: 'rgba(255,255,255,0.6)',
  },
});

