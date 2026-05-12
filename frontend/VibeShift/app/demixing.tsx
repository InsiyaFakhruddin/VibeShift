import { useAuth } from '@clerk/clerk-expo';
import GradientText from '@/components/GradientText';
import Icon from '@/components/Icon';
import { DJChannelStrip } from '@/components/DJChannelStrip';
import { SongCard } from '@/components/SongCard';
import { ThemedView } from '@/components/themed-view';
import { UploadButton } from '@/components/UploadButton';
import { hexToRgba, useAppTheme } from '@/context/AppearanceContext';
import { useProfile } from '@/context/UserContext';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

const STEM_COLORS: Record<string, string> = {
  vocals:    '#ec4981',
  drums:     '#22d3ee',
  bass:      '#9333ea',
  other:     '#1cd8a0',
  no_vocals: '#9333ea',
};
const FALLBACK_COLORS = ['#ec4981', '#22d3ee', '#9333ea', '#1cd8a0', '#f59e0b', '#06b6d4'];

const STEM_META: Record<string, { name: string; icon: string }> = {
  vocals:    { name: 'Vocals', icon: '🎤' },
  drums:     { name: 'Drums',  icon: '🥁' },
  bass:      { name: 'Bass',   icon: '🎸' },
  other:     { name: 'Other',  icon: '🎹' },
  no_vocals: { name: 'Instr.', icon: '🎼' },
};

interface StemItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  download_url: string | null;
  isMuted: boolean;
  settings: { volume: number; pitch: number; timbre: number };
}

interface PrevSong {
  id: string;
  title: string;
  editedDate: string;
}

const availableStems = [
  { id: 'piano',     name: 'Piano',     icon: '🎹', color: '#ec4981' },
  { id: 'guitar',    name: 'Guitar',    icon: '🎸', color: '#22d3ee' },
  { id: 'violin',    name: 'Violin',    icon: '🎻', color: '#9333ea' },
  { id: 'flute',     name: 'Flute',     icon: '🪈', color: '#1cd8a0' },
  { id: 'trumpet',   name: 'Trumpet',   icon: '🎺', color: '#f59e0b' },
  { id: 'harmonica', name: 'Harmonica', icon: '🎼', color: '#06b6d4' },
];

function mapApiStem(s: any, idx: number): StemItem {
  const meta = STEM_META[s.stem_type] ?? { name: s.stem_type, icon: '🎵' };
  const color = STEM_COLORS[s.stem_type] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  return {
    id:           s.id,
    name:         meta.name,
    icon:         meta.icon,
    color,
    download_url: s.download_url ?? null,
    isMuted:      s.is_muted ?? false,
    settings: {
      volume: Math.round((s.volume ?? 1.0) * 100),
      pitch:  s.pitch_shift ?? 0,
      timbre: Math.round(((s.timbre_strength ?? 1.0) - 0.5) * 100),
    },
  };
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function Demixing() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { profile } = useProfile();
  const t = useAppTheme();

  // ── Job state ──────────────────────────────────────────────────────────────
  const [jobId, setJobId]         = useState<string | null>(null);
  const [songName, setSongName]   = useState('');
  const [jobStatus, setJobStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [jobError, setJobError]   = useState<string | null>(null);
  const pollRef       = useRef<any>(null);
  const mixPollRef    = useRef<any>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  // ── UI / stems state ───────────────────────────────────────────────────────
  const [isDemixed, setIsDemixed]         = useState(false);
  const [stems, setStems]                 = useState<StemItem[]>([]);
  const stemsRef                          = useRef<StemItem[]>([]);
  const [showAddMenu, setShowAddMenu]     = useState(false);
  const [previousSongs, setPreviousSongs] = useState<PrevSong[]>([]);

  // Keep stemsRef in sync — avoids stale closure in debounce callbacks
  useEffect(() => { stemsRef.current = stems; }, [stems]);

  // ── Mix / build state ──────────────────────────────────────────────────────
  const [isMixing, setIsMixing]       = useState(false);
  const [mixProgress, setMixProgress] = useState(0);
  const [mixUrl, setMixUrl]           = useState<string | null>(null);
  const [mixError, setMixError]       = useState<string | null>(null);
  const isMixingRef                   = useRef(false);   // sync mutex (no render delay)
  const dirtyRef                      = useRef(false);   // changes made while export runs
  const mixIdRef                      = useRef<string | null>(null); // current mix job id
  const autoExportTimerRef            = useRef<any>(null);
  const mixStartedAtRef               = useRef<number>(0); // epoch ms when latest export started

  // ── Original audio ─────────────────────────────────────────────────────────
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [origBarWidth, setOrigBarWidth] = useState(1);

  // ── Audio playback ─────────────────────────────────────────────────────────
  const soundRef                            = useRef<Audio.Sound | null>(null);
  const [playingUrl, setPlayingUrl]         = useState<string | null>(null);
  const [isPlaying, setIsPlaying]           = useState(false);
  const [soundPositionMs, setSoundPositionMs] = useState(0);
  const [soundDurationMs, setSoundDurationMs] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(1);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current)            clearTimeout(pollRef.current);
      if (mixPollRef.current)         clearTimeout(mixPollRef.current);
      if (autoExportTimerRef.current) clearTimeout(autoExportTimerRef.current);
      soundRef.current?.unloadAsync();
    };
  }, []);

  // ── Smooth build-progress animation ───────────────────────────────────────
  // Updates every 500 ms while mixing so the bar moves continuously instead of
  // jumping only on 5-second poll ticks.  Uses mixStartedAtRef so the curve
  // stays consistent even across re-exports triggered by dirtyRef.
  useEffect(() => {
    if (!isMixing) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - mixStartedAtRef.current;
      setMixProgress(Math.round(Math.min(92, 5 + (elapsed / 90000) * 87)));
    }, 500);
    return () => clearInterval(id);
  }, [isMixing]);

  // ── Library fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
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
              .filter((i: any) => i.type === 'demix' && i.status === 'completed')
              .map((i: any) => ({
                id: i.id,
                title: i.song_name,
                editedDate: new Date(i.created_at).toLocaleDateString(),
              }))
          );
        }
      } catch (_) {}
    })();
  }, []);

  // ── Stem separation poll ───────────────────────────────────────────────────
  // Self-scheduling setTimeout prevents async callbacks from stacking up.
  // Each tick only fires after the previous fetch fully completes.
  const startJobPoll = (id: string) => {
    if (pollRef.current) clearTimeout(pollRef.current);

    const tick = async () => {
      try {
        let token = await getToken();
        if (!token) token = await getToken({ skipCache: true } as any);
        if (!token) { pollRef.current = setTimeout(tick, 8000); return; }

        const res = await fetch(`${API_URL}/demixer/jobs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // 401 means token expired mid-poll — skip tick, next tick gets fresh one
        if (res.status === 401) { pollRef.current = setTimeout(tick, 8000); return; }
        if (!res.ok) { pollRef.current = setTimeout(tick, 8000); return; }

        const data = await res.json();
        if (data.status === 'completed') {
          pollRef.current = null;
          setStems((data.stems ?? []).map(mapApiStem));
          if (data.latest_mix_url) setMixUrl(data.latest_mix_url);
          if (data.original_url)   setOriginalUrl(data.original_url);
          setSongName(data.song_name ?? '');
          setJobStatus('completed');
          setIsDemixed(true);
        } else if (data.status === 'failed') {
          pollRef.current = null;
          setJobStatus('failed');
          setJobError(data.error_message ?? 'Stem separation failed');
        } else {
          // Still processing — schedule next tick after this one completes
          pollRef.current = setTimeout(tick, 8000);
        }
      } catch (_) {
        pollRef.current = setTimeout(tick, 8000);
      }
    };

    pollRef.current = setTimeout(tick, 3000);
  };

  // ── Mix build poll ─────────────────────────────────────────────────────────
  // Polls /demixer/mixes/{mixId} so it tracks THIS specific mix — not the
  // job's latest_mix_url which can revert to an old mix if the new one fails.
  // Self-scheduling setTimeout: one fetch in-flight at a time, no stacking.
  const startMixPoll = (mixId: string) => {
    if (mixPollRef.current) clearTimeout(mixPollRef.current);
    const startedAt = Date.now();
    let authFailures = 0;

    const tick = async () => {
      // 8-minute hard timeout (long songs can take 5–7 min to process)
      if (Date.now() - startedAt > 8 * 60 * 1000) {
        mixPollRef.current = null;
        isMixingRef.current = false;
        setIsMixing(false);
        setMixError('Mix timed out — tap Export Mix to try again');
        return;
      }

      try {
        let token = await getToken();
        if (!token) token = await getToken({ skipCache: true } as any);
        if (!token) { mixPollRef.current = setTimeout(tick, 6000); return; }

        const res = await fetch(`${API_URL}/demixer/mixes/${mixId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          // Try refreshing once before counting as failure
          const fresh = await getToken({ skipCache: true } as any);
          if (fresh) {
            mixPollRef.current = setTimeout(tick, 2000); // quick retry with fresh token
            return;
          }
          authFailures++;
          if (authFailures >= 4) {
            mixPollRef.current = null;
            isMixingRef.current = false;
            setIsMixing(false);
            setMixError('Session expired — tap Export Mix to retry');
            return;
          }
          mixPollRef.current = setTimeout(tick, 6000);
          return;
        }

        authFailures = 0;
        if (!res.ok) { mixPollRef.current = setTimeout(tick, 5000); return; }

        const data = await res.json();

        if (data.failed) {
          // Backend deleted the mix record — mix processing failed
          mixPollRef.current = null;
          isMixingRef.current = false;
          setIsMixing(false);
          setMixError('Mix failed on server — try adjusting stems and exporting again');
          return;
        }

        if (data.ready && data.url) {
          mixPollRef.current = null;
          setMixUrl(data.url);
          setMixProgress(100);
          setMixError(null);
          isMixingRef.current = false;
          setIsMixing(false);

          if (dirtyRef.current) {
            dirtyRef.current = false;
            setTimeout(handleExport, 400);
          }
        } else {
          mixPollRef.current = setTimeout(tick, 5000);
        }
      } catch (_) {
        mixPollRef.current = setTimeout(tick, 5000);
      }
    };

    mixPollRef.current = setTimeout(tick, 1000);
  };

  // ── Load previous job ──────────────────────────────────────────────────────
  const loadJob = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/demixer/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status === 'completed') {
        setJobId(id);
        setJobStatus('completed');
        setSongName(data.song_name ?? '');
        setStems((data.stems ?? []).map(mapApiStem));
        if (data.latest_mix_url) setMixUrl(data.latest_mix_url);
        if (data.original_url)   setOriginalUrl(data.original_url);
        setIsDemixed(true);
      }
    } catch (_) {}
  };

  // ── Delete a previously demixed song ───────────────────────────────────────
  const handleDeletePrevSong = (songId: string) => {
    Alert.alert(
      'Delete Edit',
      'Permanently delete this edit? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              let token = await getToken();
              if (!token) token = await getToken({ skipCache: true } as any);
              if (!token) return;
              await fetch(`${API_URL}/demixer/jobs/${songId}`, {
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
    setJobStatus('idle');
    setJobError(null);
  };

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async (file: any) => {
    setJobStatus('uploading');
    setJobError(null);
    setMixUrl(null);
    try {
      const token = await getToken();
      if (!token) { setJobStatus('failed'); setJobError('Not authenticated'); return; }
      const formData = new FormData();
      if (Platform.OS === 'web') {
        formData.append('audio_file', file);
      } else {
        formData.append('audio_file', {
          uri:  file.uri,
          name: file.name ?? 'audio.wav',
          type: file.mimeType ?? 'audio/wav',
        } as any);
      }
      uploadAbortRef.current = new AbortController();
      const res = await fetch(`${API_URL}/demixer/jobs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: uploadAbortRef.current.signal,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = await res.json();
      setJobId(data.job_id);
      setSongName(data.song_name ?? '');
      setJobStatus('processing');
      startJobPoll(data.job_id);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setJobStatus('idle');
        setJobError(null);
      } else {
        setJobStatus('failed');
        setJobError(err.message ?? 'Upload failed');
      }
    }
  };

  // ── Export (mix all stems) ─────────────────────────────────────────────────
  // Uses isMixingRef (sync) to prevent duplicate concurrent exports.
  const handleExport = async () => {
    if (!jobId) return;
    if (isMixingRef.current) {
      dirtyRef.current = true;
      return;
    }
    isMixingRef.current = true;
    mixStartedAtRef.current = Date.now();
    setIsMixing(true);
    setMixProgress(5);
    setMixError(null);
    try {
      let token = await getToken();
      if (!token) { isMixingRef.current = false; setIsMixing(false); return; }

      let res = await fetch(`${API_URL}/demixer/jobs/${jobId}/mix`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      // Retry once with a fresh token on 401
      if (res.status === 401) {
        token = await getToken({ skipCache: true } as any);
        if (token) {
          res = await fetch(`${API_URL}/demixer/jobs/${jobId}/mix`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      if (!res.ok) { isMixingRef.current = false; setIsMixing(false); return; }

      const data = await res.json();
      mixIdRef.current = data.mix_id;
      startMixPoll(data.mix_id);
    } catch (_) {
      isMixingRef.current = false;
      setIsMixing(false);
    }
  };

  // ── Stem settings save ─────────────────────────────────────────────────────
  // Reads from stemsRef to avoid stale closure issues inside debounce callbacks.
  const handleStemSave = async (stemId: string) => {
    const stem = stemsRef.current.find(s => s.id === stemId);
    if (!stem || stemId.startsWith('local-')) return;
    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`${API_URL}/demixer/stems/${stemId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volume:          stem.settings.volume / 100,
          pitch_shift:     stem.settings.pitch,
          timbre_strength: 0.5 + stem.settings.timbre / 100,
          is_muted:        stem.isMuted,
        }),
      });
    } catch (err) {
      console.warn('Stem save failed', err);
    }
    handleExport();
  };

  // ── Debounced auto-export ──────────────────────────────────────────────────
  // Shows building state IMMEDIATELY (instant UI feedback), then fires the
  // actual save+export after 700ms of inactivity.
  const scheduleAutoExport = (stemId: string) => {
    if (jobId) {
      setIsMixing(true);       // instant visual feedback
      setMixProgress(prev => prev > 0 ? prev : 3);
    }
    if (autoExportTimerRef.current) clearTimeout(autoExportTimerRef.current);
    autoExportTimerRef.current = setTimeout(() => {
      handleStemSave(stemId);
    }, 700);
  };

  // ── Per-stem change handlers ───────────────────────────────────────────────
  const handleVolumeChange = (stemId: string, v: number) => {
    setStems(prev => prev.map(s => s.id === stemId ? { ...s, settings: { ...s.settings, volume: v } } : s));
    scheduleAutoExport(stemId);
  };

  const handlePitchChange = (stemId: string, p: number) => {
    setStems(prev => prev.map(s => s.id === stemId ? { ...s, settings: { ...s.settings, pitch: p } } : s));
    scheduleAutoExport(stemId);
  };

  const handleTimbreChange = (stemId: string, tm: number) => {
    setStems(prev => prev.map(s => s.id === stemId ? { ...s, settings: { ...s.settings, timbre: tm } } : s));
    scheduleAutoExport(stemId);
  };

  // Mute toggle saves immediately and re-exports — no debounce needed.
  const handleMuteToggle = async (stemId: string) => {
    const stem = stemsRef.current.find(s => s.id === stemId);
    if (!stem) return;
    const newMuted = !stem.isMuted;
    setStems(prev => prev.map(s => s.id === stemId ? { ...s, isMuted: newMuted } : s));
    if (!stemId.startsWith('local-')) {
      try {
        const token = await getToken();
        if (token) {
          await fetch(`${API_URL}/demixer/stems/${stemId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_muted: newMuted }),
          });
        }
      } catch (_) {}
    }
    handleExport();
  };

  // Delete: mute on backend so the next mix excludes it.
  const handleDeleteStem = async (stemId: string) => {
    setStems(prev => prev.filter(s => s.id !== stemId));
    if (!stemId.startsWith('local-')) {
      try {
        const token = await getToken();
        if (token) {
          await fetch(`${API_URL}/demixer/stems/${stemId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_muted: true }),
          });
        }
      } catch (_) {}
      handleExport();
    }
  };

  const handleAddStem = (stemType: typeof availableStems[0]) => {
    setStems(prev => [...prev, {
      id: `local-${Date.now()}`,
      name: stemType.name,
      icon: stemType.icon,
      color: stemType.color,
      download_url: null,
      isMuted: false,
      settings: { volume: 75, pitch: 0, timbre: 50 },
    }]);
    setShowAddMenu(false);
  };

  // ── Audio playback ─────────────────────────────────────────────────────────
  const playStem = async (url: string) => {
    try {
      if (playingUrl === url && isPlaying) {
        await soundRef.current?.pauseAsync();
        setIsPlaying(false);
        return;
      }
      if (playingUrl === url && !isPlaying) {
        await soundRef.current?.playAsync();
        setIsPlaying(true);
        return;
      }
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setSoundPositionMs(0);
      setSoundDurationMs(0);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingUrl(url);
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded) {
          setSoundPositionMs(status.positionMillis ?? 0);
          setSoundDurationMs(status.durationMillis ?? 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlayingUrl(null);
            setSoundPositionMs(0);
          }
        }
      });
    } catch (err) {
      console.warn('Audio playback error', err);
    }
  };

  const handleSeek = async (fraction: number) => {
    if (!soundRef.current || soundDurationMs === 0) return;
    await soundRef.current.setPositionAsync(Math.round(fraction * soundDurationMs));
  };

  const handleShare = async (url: string) => {
    try {
      if (Platform.OS === 'ios') await Share.share({ url });
      else await Share.share({ message: url, title: 'VibeShift Mix' });
    } catch (_) {}
  };

  const resetAll = () => {
    if (pollRef.current)    clearTimeout(pollRef.current);
    if (mixPollRef.current) clearTimeout(mixPollRef.current);
    pollRef.current    = null;
    mixPollRef.current = null;
    mixIdRef.current   = null;
    setIsDemixed(false);
    setJobStatus('idle');
    setJobId(null);
    setStems([]);
    setMixUrl(null);
    setMixError(null);
    setSongName('');
    setSoundPositionMs(0);
    setSoundDurationMs(0);
    soundRef.current?.unloadAsync();
    soundRef.current = null;
    setPlayingUrl(null);
    setIsPlaying(false);
    isMixingRef.current = false;
    setIsMixing(false);
    setMixProgress(0);
    setOriginalUrl(null);
  };

  const progressFraction = soundDurationMs > 0 ? soundPositionMs / soundDurationMs : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <LinearGradient colors={t.gradient as any} style={styles.bg}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={styles.logoRow}>
                <View style={[styles.logoBall, { backgroundColor: t.accent, shadowColor: t.accent }]}>
                  <Icon name="disc-3" size={20} color="#fff" />
                </View>
                <View>
                  <Text style={[styles.appName, { color: t.text }]}>VibeShift</Text>
                  <Text style={[styles.greeting, { color: t.subtitle }]}>Hi {profile?.name || 'there'}</Text>
                </View>
              </View>
              <Pressable onPress={() => router.push('/account-settings')}>
                <Icon name="settings" size={22} color={t.subtitle} />
              </Pressable>
            </View>
            <View style={styles.titleRow}>
              <GradientText text="Demix Studio" colors={[t.accent, t.accentAlt]} fontSize={26} height={34} style={{ width: '100%' }} align="center" />
              <Text style={[styles.subtitle, { color: t.subtitle }]}>Separate into individual stems</Text>
            </View>
          </View>

          {/* ── IDLE STATE ── */}
          {jobStatus === 'idle' && !isDemixed && (
            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
              {previousSongs.length > 0 && (
                <View style={styles.prevSection}>
                  <View style={styles.sectionHead}>
                    <View style={[styles.accentBar, { backgroundColor: t.accentAlt }]} />
                    <Text style={[styles.sectionTitle, { color: t.text }]}>Previously Demixed</Text>
                  </View>
                  {previousSongs.map(song => (
                    <SongCard key={song.id} title={song.title} duration="" editedDate={song.editedDate} onClick={() => loadJob(song.id)} onDelete={() => handleDeletePrevSong(song.id)} />
                  ))}
                </View>
              )}
              <View style={[styles.uploadCard, { backgroundColor: t.card, borderColor: t.accent, shadowColor: t.accent }]}>
                <View style={[styles.uploadIconRing, { borderColor: t.accent, backgroundColor: hexToRgba(t.accent, 0.07) }]}>
                  <Icon name="sparkles" size={30} color={t.accent} />
                </View>
                <Text style={[styles.uploadTitle, { color: t.text }]}>Drop a Track</Text>
                <Text style={[styles.uploadSub, { color: t.subtitle }]}>Upload any audio — AI splits it into stems</Text>
                <UploadButton onUpload={handleUpload} />
              </View>
            </ScrollView>
          )}

          {/* ── UPLOADING STATE ── */}
          {jobStatus === 'uploading' && (
            <View style={styles.statusCard}>
              <ActivityIndicator size="large" color={t.accent} />
              <Text style={[styles.statusTitle, { color: t.text }]}>Uploading your track...</Text>
              <Pressable
                style={[styles.retryBtn, { backgroundColor: hexToRgba(t.accent, 0.12), borderColor: t.accent }]}
                onPress={handleCancelUpload}
              >
                <Text style={{ color: t.accent, fontWeight: '600', fontSize: 14 }}>Cancel Upload</Text>
              </Pressable>
            </View>
          )}

          {/* ── PROCESSING STATE ── */}
          {jobStatus === 'processing' && (
            <View style={styles.statusCard}>
              <ActivityIndicator size="large" color={t.accent} />
              <Text style={[styles.statusTitle, { color: t.text }]}>AI is separating stems</Text>
              <Text style={[styles.statusHint, { color: t.subtitle }]}>Demucs running on Replicate — takes 1–3 min</Text>
            </View>
          )}

          {/* ── FAILED STATE ── */}
          {jobStatus === 'failed' && (
            <View style={styles.statusCard}>
              <Text style={{ fontSize: 32 }}>⚠️</Text>
              <Text style={[styles.statusTitle, { color: '#ff6464' }]}>Separation Failed</Text>
              {jobError && <Text style={[styles.statusHint, { color: t.subtitle }]}>{jobError}</Text>}
              <Pressable
                style={[styles.retryBtn, { backgroundColor: hexToRgba(t.accent, 0.15), borderColor: t.accent }]}
                onPress={() => { setJobStatus('idle'); setJobError(null); setJobId(null); }}
              >
                <Text style={{ color: t.accent, fontWeight: '600', fontSize: 14 }}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* ── DJ MIXER STATE ── */}
          {isDemixed && (
            <View style={styles.djLayout}>

              {/* Now Mixing bar — song name + original audio reference player */}
              <View style={[styles.nowMixingBar, { backgroundColor: hexToRgba(t.accent, 0.06), borderColor: hexToRgba(t.accent, 0.3) }]}>
                <LinearGradient colors={[t.accent, t.accentAlt]} style={styles.spinDisc} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={{ fontSize: 14 }}>🎛</Text>
                </LinearGradient>
                {/* Left: file name + stems count — minWidth:0 forces text to truncate */}
                <View style={styles.nowMixingInfo}>
                  <Text style={[styles.nowMixingTitle, { color: t.text }]} numberOfLines={1} ellipsizeMode="tail">
                    {songName || 'Untitled Track'}
                  </Text>
                  <Text style={[styles.nowMixingSub, { color: t.subtitle }]}>
                    {stems.length} stems · {stems.filter(s => !s.isMuted).length} active
                  </Text>
                </View>
                {/* Right: playable original-audio reference with seek bar */}
                {originalUrl && (
                  <View style={[styles.origPlayer, { borderLeftColor: hexToRgba(t.accent, 0.2) }]}>
                    <TouchableOpacity
                      style={[styles.origPlayBtn, { borderColor: hexToRgba(t.accentAlt, 0.8) }]}
                      onPress={() => playStem(originalUrl)}
                    >
                      <Text style={{ color: t.accentAlt, fontSize: 11 }}>
                        {isPlaying && playingUrl === originalUrl ? '⏸' : '▶'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.origBarWrap}>
                      <Text style={[styles.origLabel, { color: t.subtitle }]}>ORIGINAL</Text>
                      <TouchableOpacity
                        style={styles.origTrack}
                        onLayout={e => setOrigBarWidth(e.nativeEvent.layout.width)}
                        onPress={e => playingUrl === originalUrl && handleSeek(e.nativeEvent.locationX / origBarWidth)}
                        activeOpacity={0.9}
                      >
                        <View style={[styles.origBg, { backgroundColor: hexToRgba(t.accentAlt, 0.18) }]}>
                          <View style={[styles.origFill, {
                            width: `${playingUrl === originalUrl ? progressFraction * 100 : 0}%`,
                            backgroundColor: t.accentAlt,
                          }]} />
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Channel strips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={stems.length > 4}
                contentContainerStyle={[styles.channelContainer, stems.length <= 4 && { flex: 1 }]}
                style={styles.channelScrollArea}
              >
                {stems.map((stem) => (
                  <DJChannelStrip
                    key={stem.id}
                    name={stem.name}
                    icon={stem.icon}
                    color={stem.color}
                    volume={stem.settings.volume}
                    pitch={stem.settings.pitch}
                    timbre={stem.settings.timbre}
                    isMuted={stem.isMuted}
                    isPlaying={!!(stem.download_url && playingUrl === stem.download_url && isPlaying)}
                    hasAudio={!!stem.download_url}
                    onVolumeChange={v => handleVolumeChange(stem.id, v)}
                    onPitchChange={p => handlePitchChange(stem.id, p)}
                    onTimbreChange={tm => handleTimbreChange(stem.id, tm)}
                    onMuteToggle={() => handleMuteToggle(stem.id)}
                    onPlay={() => stem.download_url && playStem(stem.download_url)}
                    onDelete={() => handleDeleteStem(stem.id)}
                    onSave={() => handleStemSave(stem.id)}
                  />
                ))}
              </ScrollView>

              {/* Mix player bar */}
              <View style={[styles.mixPlayer, { borderColor: hexToRgba(t.accent, 0.4), backgroundColor: hexToRgba(t.accent, 0.06) }]}>
                {/* Build progress bar — shown while mixing */}
                {isMixing && (
                  <View style={styles.buildOverlay}>
                    <View style={styles.buildProgressTrack}>
                      <View style={[styles.buildProgressFill, { width: `${mixProgress}%`, backgroundColor: t.accent }]} />
                    </View>
                    <Text style={[styles.buildPctText, { color: t.accent }]}>
                      Building mix… {mixProgress}%
                    </Text>
                  </View>
                )}

                {/* Error state — shown when mix failed or timed out */}
                {!isMixing && mixError && (
                  <View style={styles.mixErrorRow}>
                    <Text style={styles.mixErrorTxt} numberOfLines={2}>⚠ {mixError}</Text>
                    <TouchableOpacity onPress={handleExport} style={[styles.mixRetryBtn, { borderColor: t.accent }]}>
                      <Text style={[styles.mixRetryTxt, { color: t.accent }]}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Playback bar — shown when a mix exists */}
                {!isMixing && !mixError && mixUrl ? (
                  <View style={styles.mixPlayerInner}>
                    <TouchableOpacity
                      style={[styles.mixPlayBtn, { borderColor: t.accent }]}
                      onPress={() => playStem(mixUrl)}
                    >
                      <Text style={{ color: t.accent, fontSize: 14 }}>
                        {isPlaying && playingUrl === mixUrl ? '⏸' : '▶'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.mixTrackInfo}>
                      <Text style={[styles.mixTrackName, { color: t.text }]}>Mixed Track</Text>
                      <TouchableOpacity
                        style={styles.progressTrack}
                        onLayout={e => setProgressBarWidth(e.nativeEvent.layout.width)}
                        onPress={e => handleSeek(e.nativeEvent.locationX / progressBarWidth)}
                        activeOpacity={0.9}
                      >
                        <View style={[styles.progressBg, { backgroundColor: hexToRgba(t.accent, 0.15) }]}>
                          <View style={[styles.progressFill, { width: `${progressFraction * 100}%`, backgroundColor: t.accent }]} />
                        </View>
                        {playingUrl === mixUrl && soundDurationMs > 0 && (
                          <View style={[styles.progressThumb, { left: `${progressFraction * 100}%`, backgroundColor: t.accent }]} />
                        )}
                      </TouchableOpacity>
                      {soundDurationMs > 0 && playingUrl === mixUrl && (
                        <Text style={[styles.timeLabel, { color: t.subtitle }]}>
                          {formatTime(soundPositionMs)} / {formatTime(soundDurationMs)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity style={[styles.shareBtn, { backgroundColor: t.accent }]} onPress={() => handleShare(mixUrl)}>
                      <Icon name="share-2" size={13} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : !isMixing && !mixError && (
                  <View style={styles.mixPlaceholder}>
                    <Text style={[styles.mixPlaceholderTxt, { color: t.subtitle }]}>Edit stems then press Export to hear the mix</Text>
                  </View>
                )}
              </View>

              {/* Action bar */}
              <View style={styles.actionBar}>
                <TouchableOpacity
                  style={[styles.newTrackBtn, { borderColor: hexToRgba(t.accent, 0.45) }]}
                  onPress={resetAll}
                >
                  <Icon name="rotate-ccw" size={13} color={t.subtitle} />
                  <Text style={[styles.newTrackTxt, { color: t.subtitle }]}>New</Text>
                </TouchableOpacity>

                <View>
                  <TouchableOpacity
                    style={[styles.addStemBtn, { borderColor: t.accent }]}
                    onPress={() => setShowAddMenu(v => !v)}
                  >
                    <Icon name="plus" size={15} color={t.accent} />
                    <Text style={[styles.addStemTxt, { color: t.accent }]}>Add Stem</Text>
                  </TouchableOpacity>
                  {showAddMenu && (
                    <View style={[styles.dropdown, { backgroundColor: t.card, borderColor: t.accent }]}>
                      {availableStems.map(stem => (
                        <TouchableOpacity key={stem.id} style={styles.dropdownItem} onPress={() => handleAddStem(stem)}>
                          <Text style={styles.dropdownIcon}>{stem.icon}</Text>
                          <Text style={[styles.dropdownTxt, { color: t.text }]}>{stem.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <Pressable onPress={handleExport} style={{ flex: 1 }}>
                  <LinearGradient
                    colors={[t.accent, t.accentAlt]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.exportBtn}
                  >
                    <Text style={styles.exportTxt}>Export Mix</Text>
                  </LinearGradient>
                </Pressable>
              </View>

            </View>
          )}

        </LinearGradient>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  safeArea:   { flex: 1 },
  bg:         { flex: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 },

  header:       { marginBottom: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBall:     { width: 42, height: 42, borderRadius: 11, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  appName:      { fontSize: 15, fontWeight: '700' },
  greeting:     { fontSize: 11 },
  titleRow:     { alignItems: 'center' },
  subtitle:     { fontSize: 12, marginTop: 3 },

  content:        { flex: 1 },
  prevSection:    { marginBottom: 16, gap: 8 },
  sectionHead:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accentBar:      { width: 3, height: 16, borderRadius: 2 },
  sectionTitle:   { fontSize: 13, fontWeight: '600' },
  uploadCard:     { minHeight: 200, paddingVertical: 28, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, gap: 10, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  uploadIconRing: { width: 68, height: 68, borderRadius: 34, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  uploadTitle:    { fontSize: 15, fontWeight: '700' },
  uploadSub:      { fontSize: 12, textAlign: 'center' },

  statusCard:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  statusTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  statusHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn:    { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1 },

  djLayout: { flex: 1, gap: 8 },

  nowMixingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
  },
  spinDisc:       { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  nowMixingInfo:  { flex: 1, minWidth: 0 },  // minWidth:0 required for text ellipsis in flex
  nowMixingTitle: { fontSize: 13, fontWeight: '700' },
  nowMixingSub:   { fontSize: 10, marginTop: 1 },

  // Original audio reference player (right section of nowMixingBar)
  origPlayer:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8, borderLeftWidth: 1 },
  origPlayBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  origBarWrap: { gap: 3, width: 80 },
  origLabel:   { fontSize: 7, fontWeight: '700', letterSpacing: 0.6 },
  origTrack:   { height: 16, justifyContent: 'center' },
  origBg:      { height: 4, borderRadius: 2, overflow: 'hidden' },
  origFill:    { height: '100%', borderRadius: 2 },

  // "New" button in action bar (replaces icon-only reset button)
  newTrackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1.5 },
  newTrackTxt: { fontSize: 11, fontWeight: '600' },

  channelScrollArea: { flex: 1 },
  channelContainer:  { flexDirection: 'row', gap: 6 },

  // Mix player
  mixPlayer: {
    borderRadius: 12, borderWidth: 1, minHeight: 64,
    overflow: 'hidden',
  },
  // Build progress — shown while isMixing, covers the player area
  buildOverlay: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 8, justifyContent: 'center',
  },
  buildProgressTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  buildProgressFill: { height: '100%', borderRadius: 4 },
  buildPctText:      { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // Playback controls inside mix player
  mixPlayerInner:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  mixPlayBtn:      { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  mixTrackInfo:    { flex: 1, gap: 4 },
  mixTrackName:    { fontSize: 12, fontWeight: '700' },
  progressTrack:   { height: 20, justifyContent: 'center', position: 'relative' },
  progressBg:      { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 3 },
  progressThumb:   { position: 'absolute', width: 12, height: 12, borderRadius: 6, top: 4, marginLeft: -6 },
  timeLabel:       { fontSize: 9 },
  shareBtn:        { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  mixPlaceholder:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  mixPlaceholderTxt: { fontSize: 11, textAlign: 'center' },

  actionBar:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addStemBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5 },
  addStemTxt:   { fontSize: 12, fontWeight: '600' },
  exportBtn:    { height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  exportTxt:    { color: '#fff', fontSize: 13, fontWeight: '700' },

  dropdown:     { position: 'absolute', bottom: 48, left: 0, right: 0, borderRadius: 12, borderWidth: 1, overflow: 'hidden', zIndex: 100 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.12)' },
  dropdownIcon: { fontSize: 18, marginRight: 10 },
  dropdownTxt:  { fontSize: 13, fontWeight: '500' },

  mixErrorRow:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  mixErrorTxt:  { flex: 1, fontSize: 11, color: '#ff6464', lineHeight: 15 },
  mixRetryBtn:  { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  mixRetryTxt:  { fontSize: 11, fontWeight: '700' },
});