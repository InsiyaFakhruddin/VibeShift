import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';

interface Props {
  url: string | null;
  label: string;
  accentColor: string;
  subtitleColor: string;
  cardColor: string;
  noBorder?: boolean;
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function SimpleAudioBar({ url, label, accentColor, subtitleColor, cardColor, noBorder = false }: Props) {
  const soundRef                          = useRef<Audio.Sound | null>(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [positionMs, setPositionMs]       = useState(0);
  const [durationMs, setDurationMs]       = useState(0);
  const [barWidth, setBarWidth]           = useState(1);

  const unload = useCallback(async () => {
    const s = soundRef.current;
    soundRef.current = null;
    if (s) {
      try { await s.stopAsync(); } catch (_) {}
      try { await s.unloadAsync(); } catch (_) {}
    }
    setIsPlaying(false);
    setPositionMs(0);
    setDurationMs(0);
  }, []);

  useEffect(() => {
    return () => { unload(); };
  }, [unload]);

  useEffect(() => {
    unload();
  }, [url, unload]);

  const load = async (): Promise<Audio.Sound | null> => {
    if (!url) return null;
    setIsLoading(true);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false },
        (status) => {
          if (!status.isLoaded) return;
          setPositionMs(status.positionMillis ?? 0);
          setDurationMs(status.durationMillis ?? 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPositionMs(0);
          }
        }
      );
      soundRef.current = sound;
      return sound;
    } catch (_) {
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    if (!url) return;
    try {
      if (!soundRef.current) {
        const s = await load();
        if (!s) return;
        await s.playAsync();
        setIsPlaying(true);
        return;
      }
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        if (status.positionMillis >= (status.durationMillis ?? 0) - 200) {
          await soundRef.current.setPositionAsync(0);
        }
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (_) {}
  };

  const seek = async (ratio: number) => {
    if (!soundRef.current || durationMs === 0) return;
    try {
      await soundRef.current.setPositionAsync(Math.floor(ratio * durationMs));
    } catch (_) {}
  };

  const filled = durationMs > 0 ? (positionMs / durationMs) * barWidth : 0;

  return (
    <View style={[styles.container, { backgroundColor: cardColor, borderColor: `${accentColor}33`, borderWidth: noBorder ? 0 : 1 }]}>
      <Text style={[styles.label, { color: subtitleColor }]}>{label}</Text>
      <View style={styles.row}>
        <Pressable onPress={togglePlay} style={[styles.playBtn, { backgroundColor: accentColor }]} disabled={!url || isLoading}>
          {isLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Icon name={isPlaying ? 'pause' : 'play'} size={16} color="#fff" />
          }
        </Pressable>

        <Pressable
          style={styles.trackWrap}
          onLayout={(e) => setBarWidth(Math.max(1, e.nativeEvent.layout.width))}
          onPress={(e) => {
            const x = e.nativeEvent.locationX;
            seek(Math.min(1, Math.max(0, x / barWidth)));
          }}
        >
          <View style={[styles.track, { backgroundColor: `${accentColor}22` }]}>
            <View style={[styles.filled, { width: filled, backgroundColor: accentColor }]} />
            <View style={[styles.thumb, { left: Math.max(0, filled - 5), backgroundColor: accentColor }]} />
          </View>
        </Pressable>

        <Text style={[styles.time, { color: subtitleColor }]}>
          {durationMs > 0 ? `${fmt(positionMs)} / ${fmt(durationMs)}` : '--:--'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  trackWrap: { flex: 1, paddingVertical: 10 },
  track: {
    height: 4, borderRadius: 2,
    position: 'relative', overflow: 'visible',
  },
  filled: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2 },
  thumb: {
    position: 'absolute', top: -4,
    width: 12, height: 12, borderRadius: 6,
  },
  time: { fontSize: 11, minWidth: 72, textAlign: 'right' },
});
