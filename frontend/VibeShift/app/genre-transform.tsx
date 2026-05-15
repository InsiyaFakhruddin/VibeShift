import GradientText from '@/components/GradientText';
import Icon from '@/components/Icon';
import { SimpleAudioBar } from '@/components/SimpleAudioBar';
import { SongCard } from '@/components/SongCard';
import { ThemedView } from '@/components/themed-view';
import { UploadButton } from '@/components/UploadButton';
import { hexToRgba, useAppTheme } from '@/context/AppearanceContext';
import { useProfile } from '@/context/UserContext';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type Phase = 'home' | 'genre-select' | 'processing' | 'result';

const GENRES = [
  { id: 'pop',       name: 'Pop' },
  { id: 'rock',      name: 'Rock' },
  { id: 'jazz',      name: 'Jazz' },
  { id: 'classical', name: 'Classical' },
  { id: 'blues',     name: 'Blues' },
  { id: 'country',   name: 'Country' },
  { id: 'disco',     name: 'Disco' },
  { id: 'hiphop',    name: 'Hip-Hop' },
  { id: 'metal',     name: 'Metal' },
  { id: 'reggae',    name: 'Reggae' },
];

const genreLabel = (id: string) => GENRES.find(g => g.id === id)?.name ?? id;

interface PrevJob {
  id: string;
  song_name: string;
  target_genre: string;
  created_at: string;
  status: string;
}

export default function GenreTransform() {
  const router = useRouter();
  const { resumeJobId } = useLocalSearchParams<{ resumeJobId?: string }>();
  const { getToken } = useAuth();
  const { profile } = useProfile();
  const t = useAppTheme();

  const [phase, setPhase]               = useState<Phase>('home');
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);

  const [jobId, setJobId]             = useState<string | null>(null);
  const [processingGenre, setProcessingGenre] = useState('');
  const pollRef                       = useRef<any>(null);

  const [songName, setSongName]       = useState('');
  const [resultGenre, setResultGenre] = useState('');
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl]     = useState<string | null>(null);

  const [prevJobs, setPrevJobs]         = useState<PrevJob[]>([]);
  const [loadingPrev, setLoadingPrev]   = useState(true);
  const [loadingResult, setLoadingResult] = useState(false);

  const resumeHandledRef = useRef<string | null>(null);

  // ── Cleanup poll on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  // ── Fetch previous transform jobs ───────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      setLoadingPrev(true);
      try {
        let token = await getToken();
        if (!token) token = await getToken({ skipCache: true } as any);
        if (!token || !API_URL) return;
        const res = await fetch(`${API_URL}/library`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPrevJobs(
            (data.items ?? [])
              .filter((i: any) => i.type === 'transform' && i.status === 'completed')
              .map((i: any) => ({
                id:           i.id,
                song_name:    i.song_name,
                target_genre: i.target_genre ?? '',
                created_at:   i.created_at,
                status:       i.status,
              }))
          );
        }
      } catch (_) {
      } finally {
        setLoadingPrev(false);
      }
    })();
  }, [profile?.id]);

  // ── Load result for a completed job (song card tap OR resumeJobId param) ─────
  const loadResult = async (id: string) => {
    setLoadingResult(true);
    try {
      let token = await getToken();
      if (!token) token = await getToken({ skipCache: true } as any);
      if (!token) return;
      const res = await fetch(`${API_URL}/transform/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { Alert.alert('Error', 'Could not load this transform job.'); return; }
      const data = await res.json();
      setSongName(data.song_name ?? '');
      setResultGenre(data.target_genre ?? '');
      setOriginalUrl(data.original_url ?? null);
      setOutputUrl(data.download_url ?? null);
      setPhase('result');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load result.');
    } finally {
      setLoadingResult(false);
      resumeHandledRef.current = null;          // allow re-tapping the same job
      router.setParams({ resumeJobId: '' });    // clear param so tab re-focus doesn't re-fire
    }
  };

  // ── Auto-load when navigated here from Library with a job ID ─────────────────
  useEffect(() => {
    if (!resumeJobId || resumeJobId === resumeHandledRef.current || !profile?.id) return;
    resumeHandledRef.current = resumeJobId;
    loadResult(resumeJobId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeJobId, profile?.id]);

  // ── Upload → genre select ────────────────────────────────────────────────────
  const handleUpload = (file: any) => {
    setUploadedFile(file);
    setSelectedGenre(null);
    setPhase('genre-select');
  };

  // ── Submit job ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!uploadedFile || !selectedGenre || submitting) return;
    setSubmitting(true);
    try {
      let token = await getToken();
      if (!token) token = await getToken({ skipCache: true } as any);
      if (!token) { Alert.alert('Error', 'Not authenticated.'); return; }

      const form = new FormData();
      form.append('audio_file', {
        uri:  uploadedFile.uri,
        name: uploadedFile.name ?? 'upload.wav',
        type: uploadedFile.mimeType ?? 'audio/wav',
      } as any);
      form.append('target_genre', selectedGenre);
      form.append('duration',     '15');
      form.append('start_offset', '5');

      const res = await fetch(`${API_URL}/transform/jobs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Upload failed', err.detail ?? `Server error ${res.status}`);
        return;
      }
      const data = await res.json();
      setJobId(data.job_id);
      setProcessingGenre(selectedGenre);
      setSongName((uploadedFile.name ?? 'upload').replace(/\.[^.]+$/, ''));
      setPhase('processing');
      startPoll(data.job_id);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Polling ──────────────────────────────────────────────────────────────────
  const startPoll = (id: string) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    const tick = async () => {
      try {
        let token = await getToken();
        if (!token) token = await getToken({ skipCache: true } as any);
        if (!token) { pollRef.current = setTimeout(tick, 8000); return; }
        const res = await fetch(`${API_URL}/transform/jobs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { pollRef.current = setTimeout(tick, 8000); return; }
        const data = await res.json();
        if (data.status === 'completed') {
          pollRef.current = null;
          setSongName(data.song_name ?? songName);
          setResultGenre(data.target_genre ?? '');
          setOriginalUrl(data.original_url ?? null);
          setOutputUrl(data.download_url ?? null);
          setPhase('result');
          // Refresh prev list
          setPrevJobs(prev => [
            { id, song_name: data.song_name ?? '', target_genre: data.target_genre ?? '', created_at: data.created_at, status: 'completed' },
            ...prev.filter(j => j.id !== id),
          ]);
        } else if (data.status === 'failed') {
          pollRef.current = null;
          Alert.alert('Transform failed', data.error_message ?? 'Processing failed.');
          setPhase('home');
        } else {
          pollRef.current = setTimeout(tick, 8000);
        }
      } catch (_) {
        pollRef.current = setTimeout(tick, 8000);
      }
    };
    pollRef.current = setTimeout(tick, 5000);
  };

  const resetToHome = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setPhase('home');
    setUploadedFile(null);
    setSelectedGenre(null);
    setJobId(null);
    setOriginalUrl(null);
    setOutputUrl(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
        <LinearGradient colors={t.gradient as any} style={styles.background}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentWrap}>

              {/* ── Header ── */}
              <View style={styles.headerTopRow}>
                <View style={styles.logoContainer}>
                  <Icon name="vibeshift-logo" size={44} color={t.accentAlt} />
                  <View style={styles.headerTextGroup}>
                    <Text style={[styles.vibeShiftText, { color: t.accentAlt }]}>VibeShift</Text>
                    <Text style={[styles.greetingText, { color: t.subtitle }]}>Hi {profile?.name || 'there'}</Text>
                  </View>
                </View>
                {phase !== 'home' && (
                  <Pressable onPress={resetToHome} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="x" size={22} color={t.subtitle} />
                  </Pressable>
                )}
                {phase === 'home' && (
                  <Pressable onPress={() => router.push('/account-settings')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="settings" size={22} color={t.subtitle} />
                  </Pressable>
                )}
              </View>

              {/* ── Page title ── */}
              <View style={styles.pageHeader}>
                <GradientText text="Genre Transform" colors={[t.accentAlt, t.accent]} fontSize={28} height={38} style={{ width: '100%' }} align="center" />
                <Text style={[styles.pageSubtitle, { color: t.subtitle }]}>
                  {phase === 'home'         && 'Transform into any genre'}
                  {phase === 'genre-select' && `Select a genre for "${songName || (uploadedFile?.name ?? 'your song')}"`}
                  {phase === 'processing'   && `Transforming to ${genreLabel(processingGenre)}…`}
                  {phase === 'result'       && `${songName} → ${genreLabel(resultGenre)}`}
                </Text>
              </View>

              {/* ════════════════ LOADING RESULT ════════════════ */}
              {loadingResult && (
                <View style={[styles.centerBox, { backgroundColor: t.card, borderColor: `${t.accentAlt}33` }]}>
                  <ActivityIndicator size="large" color={t.accentAlt} />
                  <Text style={[styles.processingTitle, { color: t.text }]}>Loading…</Text>
                </View>
              )}

              {/* ════════════════ HOME ════════════════ */}
              {phase === 'home' && !loadingResult && (
                <View style={styles.contentArea}>
                  {/* Previously transformed */}
                  {loadingPrev ? (
                    <ActivityIndicator color={t.accentAlt} style={{ marginTop: 8 }} />
                  ) : prevJobs.length > 0 ? (
                    <View style={styles.previousSection}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: t.accentAlt }} />
                        <Text style={[styles.sectionTitle, { color: t.text }]}>Previously Transformed</Text>
                      </View>
                      <View style={styles.songsList}>
                        {prevJobs.map((job) => (
                          <SongCard
                            key={job.id}
                            title={job.song_name}
                            editedDate={`→ ${genreLabel(job.target_genre)}`}
                            iconName="sparkles"
                            onClick={() => loadResult(job.id)}
                          />
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {/* Upload card */}
                  <View style={[styles.uploadCard, { borderColor: t.accentAlt, backgroundColor: t.card, shadowColor: t.accentAlt }]}>
                    <View style={[styles.uploadIconContainer, {
                      borderColor: t.accentAlt,
                      backgroundColor: hexToRgba(t.accentAlt, 0.05),
                      shadowColor: t.accentAlt,
                      shadowOpacity: 0.4,
                      shadowRadius: 14,
                      elevation: 5,
                    }]}>
                      <Icon name="sparkles" size={36} color={t.accentAlt} />
                    </View>
                    <Text style={[styles.uploadTitle, { color: t.text }]}>Upload a Song</Text>
                    <Text style={[styles.uploadSubtitle, { color: t.subtitle }]}>Select an audio file to transform</Text>
                    <UploadButton onUpload={handleUpload} />
                  </View>
                </View>
              )}

              {/* ════════════════ GENRE SELECT ════════════════ */}
              {phase === 'genre-select' && (
                <View style={styles.contentArea}>
                  <View style={[styles.card, { backgroundColor: t.card, borderColor: `${t.accentAlt}33` }]}>
                    <Text style={[styles.sectionTitle, { color: t.text, marginBottom: 4 }]}>Select a Genre</Text>
                    <Text style={[styles.pageSubtitle, { color: t.subtitle, marginBottom: 16 }]}>Tap one to select</Text>
                    <View style={styles.genreGrid}>
                      {GENRES.map((g) => {
                        const active = selectedGenre === g.id;
                        return (
                          <TouchableOpacity
                            key={g.id}
                            onPress={() => setSelectedGenre(g.id)}
                            activeOpacity={0.8}
                            style={[
                              styles.genrePill,
                              {
                                backgroundColor: active ? t.accentAlt : hexToRgba(t.accentAlt, 0.1),
                                borderColor:     active ? t.accent    : hexToRgba(t.accentAlt, 0.3),
                              },
                            ]}
                          >
                            <Text style={[styles.genrePillText, { color: active ? '#fff' : t.text }]}>
                              {g.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.discardBtn, { borderColor: hexToRgba(t.accentAlt, 0.4) }]}
                      onPress={resetToHome}
                    >
                      <Text style={{ color: t.subtitle, fontSize: 13, fontWeight: '600' }}>Back</Text>
                    </Pressable>
                    <Pressable
                      style={{ flex: 1, opacity: selectedGenre && !submitting ? 1 : 0.4 }}
                      onPress={handleSubmit}
                      disabled={!selectedGenre || submitting}
                    >
                      <LinearGradient
                        colors={[t.accentAlt, t.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitBtn}
                      >
                        {submitting
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.submitBtnText}>Transform</Text>
                        }
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* ════════════════ PROCESSING ════════════════ */}
              {phase === 'processing' && (
                <View style={[styles.centerBox, { backgroundColor: t.card, borderColor: `${t.accentAlt}33` }]}>
                  <ActivityIndicator size="large" color={t.accentAlt} />
                  <Text style={[styles.processingTitle, { color: t.text }]}>Transforming…</Text>
                  <Text style={[styles.processingSubtitle, { color: t.subtitle }]}>
                    {`Converting "${songName}" to ${processingGenre}. This takes 2–5 minutes — keep the app open.`}
                  </Text>
                </View>
              )}

              {/* ════════════════ RESULT ════════════════ */}
              {phase === 'result' && (
                <View style={[styles.resultCard, { backgroundColor: t.card, borderColor: t.accentAlt }]}>

                  {/* Header: checkmark + "Transform Complete!" */}
                  <View style={styles.resultHeader}>
                    <View style={styles.checkCircle}>
                      <Icon name="check" size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultTitle, { color: t.text }]}>Transform Complete!</Text>
                      <Text style={[styles.resultSubtitle, { color: t.subtitle }]} numberOfLines={1}>
                        {songName} → {genreLabel(resultGenre)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: `${t.accentAlt}30` }]} />

                  {/* Original audio bar */}
                  <View style={{ paddingHorizontal: 18 }}>
                    <SimpleAudioBar
                      url={originalUrl}
                      label="Original"
                      accentColor={t.accent}
                      subtitleColor={t.subtitle}
                      cardColor="transparent"
                      noBorder
                    />
                  </View>

                  <View style={[styles.divider, { backgroundColor: `${t.accentAlt}30` }]} />

                  {/* Transformed audio bar */}
                  <View style={{ paddingHorizontal: 18 }}>
                    <SimpleAudioBar
                      url={outputUrl}
                      label={`${genreLabel(resultGenre)} Mix`}
                      accentColor={t.accentAlt}
                      subtitleColor={t.subtitle}
                      cardColor="transparent"
                      noBorder
                    />
                  </View>

                  <View style={[styles.divider, { backgroundColor: `${t.accentAlt}30` }]} />

                  {/* Actions */}
                  <View style={[styles.actionsRow, { paddingHorizontal: 18, paddingBottom: 18 }]}>
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => {
                        if (outputUrl) {
                          Share.share({ url: outputUrl, message: `Check out my ${genreLabel(resultGenre)} mix of ${songName}` });
                        }
                      }}
                    >
                      <LinearGradient
                        colors={[t.accentAlt, t.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitBtn}
                      >
                        <Icon name="share-2" size={15} color="#fff" />
                        <Text style={styles.submitBtnText}>Share</Text>
                      </LinearGradient>
                    </Pressable>
                    <Pressable
                      style={[styles.discardBtn, { borderColor: t.accentAlt }]}
                      onPress={resetToHome}
                    >
                      <Text style={{ color: t.accentAlt, fontSize: 13, fontWeight: '600' }}>New Transform</Text>
                    </Pressable>
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

const styles = StyleSheet.create({
  container:     { flex: 1 },
  safeContainer: { flex: 1 },
  background:    { flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },
  scrollView:    { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  contentWrap:   { flex: 1, gap: 20 },

  headerTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logoContainer:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTextGroup: { justifyContent: 'center' },
  vibeShiftText:   { fontSize: 18, fontWeight: '700' },
  greetingText:    { fontSize: 13, marginTop: 2 },

  pageHeader:   { alignItems: 'center' },
  pageSubtitle: { fontSize: 13, textAlign: 'center', marginTop: 4 },

  contentArea:     { gap: 16 },
  previousSection: { gap: 4 },
  sectionTitle:    { fontSize: 15, fontWeight: '700' },
  songsList:       { gap: 10 },

  uploadCard: {
    borderWidth: 1, borderRadius: 20,
    paddingVertical: 32, paddingHorizontal: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
    overflow: 'hidden',
  },
  uploadIconContainer: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1,
  },
  uploadTitle:    { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  uploadSubtitle: { fontSize: 13, marginBottom: 16, textAlign: 'center' },

  card: {
    borderRadius: 16, borderWidth: 1, padding: 16,
  },
  genreGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  genrePill: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1,
  },
  genrePillText: { fontSize: 13, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  discardBtn: {
    paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  submitBtn: {
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
  },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  centerBox: {
    borderRadius: 20, borderWidth: 1,
    padding: 40, alignItems: 'center', gap: 16,
  },
  processingTitle:    { fontSize: 20, fontWeight: '700' },
  processingSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  resultBadgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  },
  resultSongName: { fontSize: 16, fontWeight: '700', flex: 1 },
  genreBadge: {
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  genreBadgeText: { fontSize: 12, fontWeight: '600' },

  resultCard: {
    borderWidth: 1.5, borderRadius: 20,
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 16,
  },
  checkCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
  },
  resultTitle:    { fontSize: 16, fontWeight: '700' },
  resultSubtitle: { fontSize: 12, marginTop: 2 },
  divider:        { height: 1, marginHorizontal: 0 },
});
