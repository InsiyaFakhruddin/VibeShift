import { useAuth } from '@clerk/clerk-expo';
import GradientText from '@/components/GradientText';
import { GenreBubble } from '@/components/GenreBubble';
import Icon from '@/components/Icon';
import { SongCard } from '@/components/SongCard';
import { ThemedView } from '@/components/themed-view';
import { UploadButton } from '@/components/UploadButton';
import { hexToRgba, useAppTheme } from '@/context/AppearanceContext';
import { useProfile } from '@/context/UserContext';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

const GENRES = [
  { id: 1,  key: 'pop',       name: 'Pop',       position: { x: 50, y: 50 } },
  { id: 2,  key: 'rock',      name: 'Rock',      position: { x: 50, y: 50 } },
  { id: 3,  key: 'jazz',      name: 'Jazz',      position: { x: 50, y: 50 } },
  { id: 4,  key: 'hiphop',    name: 'Hip-Hop',   position: { x: 50, y: 50 } },
  { id: 5,  key: 'classical', name: 'Classical', position: { x: 50, y: 50 } },
  { id: 6,  key: 'metal',     name: 'Metal',     position: { x: 50, y: 50 } },
  { id: 7,  key: 'reggae',    name: 'Reggae',    position: { x: 50, y: 50 } },
  { id: 8,  key: 'blues',     name: 'Blues',     position: { x: 50, y: 50 } },
  { id: 9,  key: 'country',   name: 'Country',   position: { x: 50, y: 50 } },
  { id: 10, key: 'disco',     name: 'Disco',     position: { x: 50, y: 50 } },
];

type Phase = 'idle' | 'genre_select' | 'uploading' | 'processing' | 'completed' | 'failed';

interface PrevSong { id: string; title: string; editedDate: string; }

// ── Animated waveform shown during processing ────────────────────────────────
const STAGE_HINTS = [
  'Separating stems…',
  'Analysing melody…',
  'Generating music…',
  'Applying vocal FX…',
  'Mixing tracks…',
];

const WaveformLoader = React.memo(({ color, accent, progress, genre }: {
  color: string; accent: string; progress: number; genre: string;
}) => {
  const a0 = useRef(new Animated.Value(0.25)).current;
  const a1 = useRef(new Animated.Value(0.25)).current;
  const a2 = useRef(new Animated.Value(0.25)).current;
  const a3 = useRef(new Animated.Value(0.25)).current;
  const a4 = useRef(new Animated.Value(0.25)).current;
  const a5 = useRef(new Animated.Value(0.25)).current;
  const a6 = useRef(new Animated.Value(0.25)).current;
  const a7 = useRef(new Animated.Value(0.25)).current;
  const bars = [a0, a1, a2, a3, a4, a5, a6, a7];

  useEffect(() => {
    const loops = bars.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 90),
          Animated.timing(anim, { toValue: 1.0, duration: 380, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15, duration: 380, useNativeDriver: true }),
          Animated.delay((bars.length - i) * 90),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  const stageIdx = Math.min(Math.floor(progress / 20), STAGE_HINTS.length - 1);
  const barColors = bars.map((_, i) => (i % 2 === 0 ? color : accent));

  return (
    <View style={wfStyles.wrap}>
      {/* Bars */}
      <View style={wfStyles.barsRow}>
        {bars.map((anim, i) => (
          <Animated.View
            key={i}
            style={[wfStyles.bar, { backgroundColor: barColors[i], transform: [{ scaleY: anim }] }]}
          />
        ))}
      </View>
      {/* Genre label */}
      <Text style={[wfStyles.genreLabel, { color }]}>→ {genre}</Text>
      {/* Stage hint */}
      <Text style={[wfStyles.hint, { color: accent }]}>{STAGE_HINTS[stageIdx]}</Text>
      {/* Progress bar */}
      <View style={[wfStyles.track, { backgroundColor: `${color}22` }]}>
        <Animated.View style={[wfStyles.fill, { width: `${progress}%`, backgroundColor: color }]} />
      </View>
      <Text style={[wfStyles.pct, { color }]}>{progress}%</Text>
    </View>
  );
});

const wfStyles = StyleSheet.create({
  wrap:       { alignItems: 'center', gap: 14, paddingVertical: 8 },
  barsRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, height: 72 },
  bar:        { width: 7, height: 60, borderRadius: 4 },
  genreLabel: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  hint:       { fontSize: 12, fontWeight: '500' },
  track:      { width: '80%', height: 6, borderRadius: 3, overflow: 'hidden' },
  fill:       { height: '100%', borderRadius: 3 },
  pct:        { fontSize: 11, fontWeight: '700' },
});

// Simple +/- stepper row for numeric parameters
function ParamRow({
  label, value, min, max, step, format, onChange, t,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void; t: any;
}) {
  const dec = () => onChange(Math.max(min, parseFloat((value - step).toFixed(10))));
  const inc = () => onChange(Math.min(max, parseFloat((value + step).toFixed(10))));
  return (
    <View style={paramStyles.row}>
      <Text style={[paramStyles.label, { color: t.subtitle }]}>{label}</Text>
      <View style={paramStyles.controls}>
        <Pressable style={[paramStyles.btn, { borderColor: hexToRgba(t.accent, 0.4) }]} onPress={dec}>
          <Text style={[paramStyles.btnTxt, { color: t.accent }]}>−</Text>
        </Pressable>
        <Text style={[paramStyles.val, { color: t.text }]}>{format(value)}</Text>
        <Pressable style={[paramStyles.btn, { borderColor: hexToRgba(t.accent, 0.4) }]} onPress={inc}>
          <Text style={[paramStyles.btnTxt, { color: t.accent }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function GenreTransform() {
  const { getToken } = useAuth();
  const { profile }  = useProfile();
  const t = useAppTheme();

  // ── Phase / job state ────────────────────────────────────────────────────
  const [phase, setPhase]                     = useState<Phase>('idle');
  const [pendingFile, setPendingFile]         = useState<any>(null);
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);

  const [jobError, setJobError]               = useState<string | null>(null);
  const [resultUrl, setResultUrl]             = useState<string | null>(null);
  const [previousSongs, setPreviousSongs]     = useState<PrevSong[]>([]);

  // ── Transform parameters (match backend defaults exactly) ────────────────
  const [duration,    setDuration]    = useState(10);   // 1–60 s
  const [startOffset, setStartOffset] = useState(5);    // 0–120 s
  const [guidance,    setGuidance]    = useState(9.5);  // 1–20
  const [vocalMix,    setVocalMix]    = useState(1.5);  // 0–3
  const [instrMix,    setInstrMix]    = useState(1.0);  // 0–3

  // ── Processing progress ──────────────────────────────────────────────────
  const [transformProgress, setTransformProgress] = useState(0);
  const transformStartRef = useRef<number>(0);

  // Smooth time-based progress animation while processing
  // Total pipeline (Demucs + MusicGen + mixing) takes ~8–12 min; cap at 92% until done.
  useEffect(() => {
    if (phase !== 'processing') return;
    const id = setInterval(() => {
      const elapsed = Date.now() - transformStartRef.current;
      setTransformProgress(Math.round(Math.min(92, 3 + (elapsed / 720000) * 89)));
    }, 2000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Audio playback ───────────────────────────────────────────────────────
  const soundRef       = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const pollRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
      soundRef.current?.unloadAsync();
    };
  }, []);

  // Wait for UserContext sync (profile.id set) before fetching — avoids racing
  // POST /auth/sync and getting a 404 from get_current_user on every fresh login.
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        let token = await getToken();
        if (!token) token = await getToken({ skipCache: true } as any);
        if (!token) return;
        const res = await fetch(`${API_URL}/library`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPreviousSongs(
            (data.items ?? [])
              .filter((i: any) => i.type === 'transform' && i.status === 'completed')
              .map((i: any) => ({
                id: i.id,
                title: i.song_name,
                editedDate: new Date(i.created_at).toLocaleDateString(),
              }))
          );
        }
      } catch (_) {}
    })();
  }, [profile?.id]);

  // ── Polling — self-scheduling setTimeout, handles 401 + 5-min timeout ───
  const startPoll = (id: string) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    const startedAt = Date.now();

    const tick = async () => {
      if (Date.now() - startedAt > 15 * 60 * 1000) {
        setJobError('Timed out after 15 minutes — check your library later');
        setPhase('failed');
        return;
      }
      try {
        let token = await getToken();
        if (!token) token = await getToken({ skipCache: true } as any);
        if (!token) { pollRef.current = setTimeout(tick, 6000); return; }

        let res = await fetch(`${API_URL}/transform/jobs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Token expired mid-poll — refresh once and retry immediately
        if (res.status === 401) {
          const fresh = await getToken({ skipCache: true } as any);
          if (fresh) {
            res = await fetch(`${API_URL}/transform/jobs/${id}`, {
              headers: { Authorization: `Bearer ${fresh}` },
            });
          }
          if (res.status === 401) { pollRef.current = setTimeout(tick, 8000); return; }
        }

        if (!res.ok) { pollRef.current = setTimeout(tick, 5000); return; }

        const data = await res.json();
        if (data.status === 'completed') {
          setResultUrl(data.download_url ?? null);
          setTransformProgress(100);
          setPhase('completed');
        } else if (data.status === 'failed') {
          setJobError(data.error_message ?? 'Transformation failed');
          setPhase('failed');
        } else {
          pollRef.current = setTimeout(tick, 5000);
        }
      } catch (_) {
        pollRef.current = setTimeout(tick, 5000);
      }
    };

    pollRef.current = setTimeout(tick, 3000);
  };

  // ── Delete a previously transformed song ────────────────────────────────
  const handleDeletePrevSong = (songId: string) => {
    Alert.alert(
      'Delete Edit',
      'Permanently delete this transform? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              let token = await getToken();
              if (!token) token = await getToken({ skipCache: true } as any);
              if (!token) return;
              await fetch(`${API_URL}/transform/jobs/${songId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              setPreviousSongs(prev => prev.filter(s => s.id !== songId));
            } catch (_) {}
          },
        },
      ]
    );
  };

  const handleCancelUpload = () => {
    uploadAbortRef.current?.abort();
    setPhase('genre_select');
  };

  // ── Submit transform ─────────────────────────────────────────────────────
  const handleTransform = async () => {
    if (!pendingFile || selectedGenreId === null) return;
    const genre = GENRES.find(g => g.id === selectedGenreId);
    if (!genre) return;

    setPhase('uploading');
    setJobError(null);
    try {
      let token = await getToken();
      if (!token) { setJobError('Not authenticated'); setPhase('failed'); return; }

      const formData = new FormData();
      if (Platform.OS === 'web') {
        formData.append('audio_file', pendingFile);
      } else {
        formData.append('audio_file', {
          uri:  pendingFile.uri  ?? pendingFile.assets?.[0]?.uri,
          name: pendingFile.name ?? pendingFile.assets?.[0]?.name ?? 'audio.wav',
          type: pendingFile.mimeType ?? pendingFile.assets?.[0]?.mimeType ?? 'audio/wav',
        } as any);
      }
      formData.append('target_genre', genre.key);
      formData.append('duration',     String(duration));
      formData.append('start_offset', String(startOffset));
      formData.append('guidance',     String(guidance));
      formData.append('vocal_mix',    String(vocalMix));
      formData.append('instr_mix',    String(instrMix));

      uploadAbortRef.current = new AbortController();
      let res = await fetch(`${API_URL}/transform/jobs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: uploadAbortRef.current.signal,
      });

      // Retry once with fresh token on 401
      if (res.status === 401) {
        token = await getToken({ skipCache: true } as any);
        if (token) {
          uploadAbortRef.current = new AbortController();
          res = await fetch(`${API_URL}/transform/jobs`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
            signal: uploadAbortRef.current.signal,
          });
        }
      }

      if (!res.ok) {
        let detail = `Server error (${res.status})`;
        try { detail = (await res.json()).detail ?? detail; } catch (_) {}
        throw new Error(detail);
      }

      const data = await res.json();
      setPhase('processing');
      transformStartRef.current = Date.now();
      setTransformProgress(3);
      startPoll(data.job_id);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setPhase('genre_select');
      } else {
        setJobError(err.message ?? 'Failed to start transformation');
        setPhase('failed');
      }
    }
  };

  const handleDiscard = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setPendingFile(null);
    setSelectedGenreId(null);
    setJobError(null);
    setResultUrl(null);
    setIsPlaying(false);
    soundRef.current?.unloadAsync();
    soundRef.current = null;
    setPhase('idle');
    setTransformProgress(0);
    transformStartRef.current = 0;
    setDuration(10);
    setStartOffset(5);
    setGuidance(9.5);
    setVocalMix(1.5);
    setInstrMix(1.0);
  };

  // ── Audio playback ───────────────────────────────────────────────────────
  const togglePlay = async () => {
    if (!resultUrl) return;
    try {
      if (isPlaying) {
        await soundRef.current?.pauseAsync();
        setIsPlaying(false);
        return;
      }
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: resultUrl }, { shouldPlay: true });
      soundRef.current = sound;
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
      });
    } catch (err) {
      console.warn('Playback error', err);
    }
  };

  const handleShare = async () => {
    if (!resultUrl) return;
    try {
      if (Platform.OS === 'ios') await Share.share({ url: resultUrl });
      else await Share.share({ message: resultUrl, title: 'VibeShift Transform' });
    } catch (_) {}
  };

  const selectedGenre = GENRES.find(g => g.id === selectedGenreId);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
        <LinearGradient colors={t.gradient as any} style={styles.background}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.contentWrap}>

              {/* Header */}
              <View style={styles.headerTopRow}>
                <View style={styles.logoContainer}>
                  <View style={[styles.logoBall, { backgroundColor: t.accent, shadowColor: t.accent }]}>
                    <Icon name="disc-3" size={22} color="#fff" />
                  </View>
                  <View>
                    <Text style={[styles.vibeShiftText, { color: t.accent }]}>VibeShift</Text>
                    <Text style={[styles.greetingText, { color: t.subtitle }]}>Hi {profile?.name || 'there'}</Text>
                  </View>
                </View>
                <Icon name="settings" size={24} color={t.subtitle} />
              </View>

              <View style={styles.pageHeader}>
                <GradientText text="Genre Transform" colors={[t.accent, t.accentAlt]} fontSize={28} height={38} style={{ width: '100%' }} align="center" />
                <Text style={[styles.pageSubtitle, { color: t.subtitle }]}>Transform into any genre</Text>
              </View>

              {/* ── IDLE ─────────────────────────────────────────────────── */}
              {phase === 'idle' && (
                <View style={styles.contentArea}>
                  {previousSongs.length > 0 && (
                    <View style={styles.previousSection}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: t.accentAlt }} />
                        <Text style={[styles.sectionTitle, { color: t.text, marginBottom: 0 }]}>Previously Transformed</Text>
                      </View>
                      <View style={styles.songsList}>
                        {previousSongs.map(song => (
                          <SongCard key={song.id} title={song.title} duration="" editedDate={song.editedDate} onClick={() => {}} onDelete={() => handleDeletePrevSong(song.id)} />
                        ))}
                      </View>
                    </View>
                  )}
                  <View style={[styles.uploadCard, { borderColor: t.accent, backgroundColor: t.card, shadowColor: t.accent }]}>
                    <View style={[styles.uploadIconContainer, { borderColor: t.accent, backgroundColor: hexToRgba(t.accent, 0.05) }]}>
                      <Icon name="sparkles" size={36} color={t.accent} />
                    </View>
                    <Text style={[styles.uploadTitle, { color: t.text }]}>Upload a Song</Text>
                    <Text style={[styles.uploadSubtitle, { color: t.subtitle }]}>Select an audio file to transform</Text>
                    <UploadButton onUpload={(file) => { setPendingFile(file); setSelectedGenreId(null); setResultUrl(null); setJobError(null); setPhase('genre_select'); }} />
                  </View>
                </View>
              )}

              {/* ── GENRE SELECT + PARAMETERS ────────────────────────────── */}
              {phase === 'genre_select' && (
                <View style={styles.contentArea}>
                  <View style={[styles.fileChip, { backgroundColor: hexToRgba(t.accent, 0.12), borderColor: t.accent }]}>
                    <Icon name="music" size={14} color={t.accent} />
                    <Text style={[styles.fileChipText, { color: t.accent }]} numberOfLines={1}>
                      {pendingFile?.name ?? pendingFile?.assets?.[0]?.name ?? 'audio file'}
                    </Text>
                    <Pressable onPress={handleDiscard}>
                      <Text style={{ color: t.subtitle, fontSize: 13, paddingHorizontal: 4 }}>✕</Text>
                    </Pressable>
                  </View>

                  {/* Genre bubbles */}
                  <View style={styles.genreSection}>
                    <Text style={[styles.genreTitle, { color: t.text }]}>Select a Genre</Text>
                    <Text style={[styles.genreSubtitle, { color: t.subtitle }]}>Tap to select, then transform</Text>
                    <View style={styles.bubbleContainer}>
                      {GENRES.map(genre => (
                        <GenreBubble
                          key={genre.id}
                          genre={genre.name}
                          position={genre.position}
                          isSelected={selectedGenreId === genre.id}
                          onSelect={() => setSelectedGenreId(genre.id)}
                          onPreview={() => {}}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Advanced parameters */}
                  <View style={[styles.paramCard, { backgroundColor: t.card, borderColor: hexToRgba(t.accent, 0.3) }]}>
                    <Text style={[styles.paramTitle, { color: t.text }]}>Advanced Settings</Text>
                    <ParamRow label="Duration"        value={duration}    min={1}   max={60}  step={1}   format={v => `${v}s`}       onChange={setDuration}    t={t} />
                    <ParamRow label="Start Offset"    value={startOffset} min={0}   max={120} step={1}   format={v => `${v}s`}       onChange={setStartOffset} t={t} />
                    <ParamRow label="Guidance Scale"  value={guidance}    min={1}   max={20}  step={0.5} format={v => v.toFixed(1)}  onChange={setGuidance}    t={t} />
                    <ParamRow label="Vocal Mix"       value={vocalMix}    min={0}   max={3}   step={0.1} format={v => v.toFixed(1)}  onChange={setVocalMix}    t={t} />
                    <ParamRow label="Instrument Mix"  value={instrMix}    min={0}   max={3}   step={0.1} format={v => v.toFixed(1)}  onChange={setInstrMix}    t={t} />
                  </View>

                  {selectedGenreId !== null && (
                    <View style={styles.actionsRow}>
                      <Pressable
                        style={[styles.discardButton, { borderColor: hexToRgba(t.accent, 0.4) }]}
                        onPress={handleDiscard}
                      >
                        <Text style={{ color: t.subtitle, fontSize: 13, fontWeight: '600' }}>Discard</Text>
                      </Pressable>
                      <Pressable style={{ flex: 1 }} onPress={handleTransform}>
                        <LinearGradient colors={[t.accent, t.accentAlt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.transformButton}>
                          <Text style={styles.transformButtonText}>Transform → {selectedGenre?.name}</Text>
                        </LinearGradient>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {/* ── UPLOADING ─────────────────────────────────────────────── */}
              {phase === 'uploading' && (
                <View style={[styles.statusCard, { borderColor: t.accent }]}>
                  <ActivityIndicator size="large" color={t.accent} />
                  <Text style={[styles.statusTitle, { color: t.text }]}>Uploading your track...</Text>
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: t.accent, backgroundColor: hexToRgba(t.accent, 0.12) }]}
                    onPress={handleCancelUpload}
                  >
                    <Text style={{ color: t.accent, fontWeight: '600', fontSize: 14 }}>Cancel Upload</Text>
                  </Pressable>
                </View>
              )}

              {/* ── PROCESSING ────────────────────────────────────────────── */}
              {phase === 'processing' && (
                <View style={[styles.statusCard, { borderColor: t.accent }]}>
                  <WaveformLoader
                    color={t.accent}
                    accent={t.accentAlt}
                    progress={transformProgress}
                    genre={selectedGenre?.name ?? 'new genre'}
                  />
                  <Text style={[styles.statusHint, { color: t.subtitle, textAlign: 'center' }]}>
                    Stem separation + AI music generation{'\n'}This takes 8–12 min — keep the app open.
                  </Text>
                  <Pressable style={[styles.discardButton, { borderColor: '#ff6464', marginTop: 4 }]} onPress={handleDiscard}>
                    <Text style={{ color: '#ff6464', fontSize: 13, fontWeight: '600' }}>Cancel</Text>
                  </Pressable>
                </View>
              )}

              {/* ── FAILED ────────────────────────────────────────────────── */}
              {phase === 'failed' && (
                <View style={[styles.statusCard, { borderColor: '#ff6464' }]}>
                  <Text style={{ fontSize: 32 }}>⚠️</Text>
                  <Text style={[styles.statusTitle, { color: '#ff6464' }]}>Transform Failed</Text>
                  {jobError && <Text style={[styles.statusHint, { color: t.subtitle }]}>{jobError}</Text>}
                  <Pressable style={[styles.discardButton, { borderColor: t.accent, marginTop: 8 }]} onPress={handleDiscard}>
                    <Text style={{ color: t.accent, fontSize: 13, fontWeight: '600' }}>Try Again</Text>
                  </Pressable>
                </View>
              )}

              {/* ── COMPLETED ─────────────────────────────────────────────── */}
              {phase === 'completed' && resultUrl && (
                <View style={styles.contentArea}>
                  <View style={[styles.resultCard, { backgroundColor: hexToRgba(t.accent, 0.08), borderColor: t.accent }]}>
                    <View style={styles.resultHeader}>
                      <Text style={{ fontSize: 28 }}>✅</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultTitle, { color: t.text }]}>Transform Complete!</Text>
                        <Text style={[styles.resultSubtitle, { color: t.subtitle }]}>
                          {pendingFile?.name ?? 'Your track'} → {selectedGenre?.name}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.playerRow, { borderColor: hexToRgba(t.accent, 0.3) }]}>
                      <Pressable style={[styles.playBtn, { borderColor: t.accent }]} onPress={togglePlay}>
                        <Text style={{ color: t.accent, fontSize: 18 }}>{isPlaying ? '⏸' : '▶'}</Text>
                      </Pressable>
                      <Text style={[styles.playerLabel, { color: t.text }]}>{selectedGenre?.name} Mix</Text>
                    </View>
                    <View style={styles.resultActions}>
                      <Pressable style={{ flex: 1 }} onPress={handleShare}>
                        <LinearGradient colors={[t.accent, t.accentAlt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareGradientBtn}>
                          <Icon name="share-2" size={15} color="#fff" />
                          <Text style={styles.shareGradientText}>Share</Text>
                        </LinearGradient>
                      </Pressable>
                      <Pressable style={[styles.newTransformBtn, { borderColor: t.accent }]} onPress={handleDiscard}>
                        <Text style={{ color: t.accent, fontSize: 13, fontWeight: '600' }}>New Transform</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </ThemedView>
  );
}

const paramStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  label:    { fontSize: 13, fontWeight: '500', flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn:      { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnTxt:   { fontSize: 18, fontWeight: '600', lineHeight: 22 },
  val:      { fontSize: 14, fontWeight: '700', minWidth: 46, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container:     { flex: 1 },
  safeContainer: { flex: 1 },
  background:    { flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },
  scrollView:    { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  contentWrap:   { flex: 1, gap: 20 },

  headerTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBall:      { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 12 },
  vibeShiftText: { fontSize: 18, fontWeight: '700' },
  greetingText:  { fontSize: 13, marginTop: 2 },
  pageHeader:    { alignItems: 'center', marginBottom: 16 },
  pageSubtitle:  { fontSize: 14, marginTop: 4 },

  contentArea:     { flex: 1, gap: 20 },
  previousSection: { gap: 12 },
  sectionTitle:    { fontSize: 16, fontWeight: '700' },
  songsList:       { gap: 12 },

  uploadCard:          { borderWidth: 1, borderRadius: 20, paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  uploadIconContainer: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1 },
  uploadTitle:         { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  uploadSubtitle:      { fontSize: 13, marginBottom: 16, textAlign: 'center' },

  fileChip:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  fileChipText: { flex: 1, fontSize: 13, fontWeight: '500' },

  genreSection:    { gap: 8 },
  genreTitle:      { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  genreSubtitle:   { fontSize: 12, textAlign: 'center' },
  bubbleContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12, gap: 8 },

  paramCard:  { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  paramTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },

  actionsRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  discardButton:       { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  transformButton:     { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  transformButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  statusCard:  { marginTop: 20, alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 32 },
  statusTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  statusHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  resultCard:     { borderWidth: 1, borderRadius: 20, padding: 20, gap: 16 },
  resultHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultTitle:    { fontSize: 16, fontWeight: '700' },
  resultSubtitle: { fontSize: 13, marginTop: 2 },

  playerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  playBtn:    { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  playerLabel:{ flex: 1, fontSize: 14, fontWeight: '600' },

  resultActions:    { flexDirection: 'row', gap: 12 },
  shareGradientBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10 },
  shareGradientText:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  newTransformBtn:  { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  cancelBtn:        { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1 },
});