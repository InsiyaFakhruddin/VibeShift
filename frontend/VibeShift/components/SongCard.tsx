import { ThemedText } from '@/components/themed-text';
import { Theme } from '@/constants/theme';
import { useAppearance, useAppTheme } from '@/context/AppearanceContext';
import React, { useEffect } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import Icon from './Icon';

type Props = {
  title: string;
  duration?: string;
  editedDate?: string;
  iconName?: string;
  onClick?: () => void;
  onDelete?: () => void;
};

function EqualizerBar({ delay, maxHeight, color, enabled }: { delay: number; maxHeight: number; color: string; enabled: boolean }) {
  const scaleY = React.useRef(new Animated.Value(0.3)).current;
  const loopRef = React.useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!enabled) {
      loopRef.current?.stop();
      scaleY.setValue(0.3);
      return;
    }
    const timer = setTimeout(() => {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleY, { toValue: 1,   duration: 500, useNativeDriver: true }),
          Animated.timing(scaleY, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    }, delay * 100);
    return () => {
      clearTimeout(timer);
      loopRef.current?.stop();
    };
  }, [enabled, scaleY, delay]);

  return (
    <Animated.View
      style={[
        styles.eqBar,
        { height: `${maxHeight}%`, backgroundColor: color, transform: [{ scaleY }] },
      ]}
    />
  );
}

export function SongCard({ title, duration, editedDate, iconName = 'music-2', onClick, onDelete }: Props) {
  const { accentColor, accentAltColor, animationsEnabled } = useAppearance();
  const t = useAppTheme();
  const scale = React.useRef(new Animated.Value(1)).current;

  const barHeights = React.useMemo(() => [
    Math.floor(Math.random() * 40) + 20,
    Math.floor(Math.random() * 40) + 20,
    Math.floor(Math.random() * 40) + 20,
    Math.floor(Math.random() * 40) + 20,
    Math.floor(Math.random() * 40) + 20,
  ], []);

  function animate(toValue: number) {
    if (!animationsEnabled) return;
    Animated.spring(scale, { toValue, useNativeDriver: false, friction: 8 }).start();
  }

  return (
    <Pressable
      onPress={onClick}
      onHoverIn={() => Platform.OS === 'web' && animate(0.985)}
      onHoverOut={() => Platform.OS === 'web' && animate(1)}
      onPressIn={() => animate(0.98)}
      onPressOut={() => animate(1)}
      style={({ pressed }) => [styles.container, { borderColor: accentColor, backgroundColor: t.card }, pressed && styles.pressed]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={[styles.left, { borderColor: accentColor }]}>
          <View style={styles.equalizerBg}>
            {barHeights.map((h, i) => (
              <EqualizerBar key={i} delay={i} maxHeight={h} color={accentAltColor} enabled={animationsEnabled} />
            ))}
          </View>
          <View style={styles.iconOverlay}>
            <Icon name={iconName as any} size={20} color={accentColor} />
          </View>
        </View>
      </Animated.View>

      <View style={styles.meta}>
        <ThemedText style={styles.title} type="defaultSemiBold">{title}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {duration ? <ThemedText style={[styles.sub, { color: t.subtitle }]}>{duration}</ThemedText> : null}
          {duration && editedDate ? <View style={{ width: 6, height: 6, borderRadius: 6, backgroundColor: t.subtitle, marginHorizontal: 8 }} /> : null}
          {editedDate ? <ThemedText style={[styles.sub, { color: t.subtitle }]}>{editedDate}</ThemedText> : null}
        </View>
      </View>
      {onDelete && (
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
          style={{ padding: 8 }}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Icon name="trash-2" size={14} color="#ef4444" />
        </Pressable>
      )}
      <Icon name="clock" size={14} color={t.subtitle} />
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
  meta: { flex: 1 },
  title: { fontSize: 16, fontWeight: '500' },
  sub:   { fontSize: 12, marginTop: 4, color: 'rgba(255,255,255,0.6)' },
});
