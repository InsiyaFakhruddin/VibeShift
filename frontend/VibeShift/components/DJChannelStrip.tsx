import { hexToRgba } from '@/context/AppearanceContext';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface DJChannelStripProps {
  name: string;
  icon: string;
  color: string;
  volume: number;
  pitch: number;
  timbre: number;
  isMuted: boolean;
  isPlaying: boolean;
  hasAudio: boolean;
  onVolumeChange: (v: number) => void;
  onPitchChange: (p: number) => void;
  onTimbreChange: (t: number) => void;
  onMuteToggle: () => void;
  onPlay: () => void;
  onDelete: () => void;
  onSave: () => void;
}

const LED_COUNT = 10;

export function DJChannelStrip({
  name, icon, color, volume, pitch, timbre,
  isMuted, isPlaying, hasAudio,
  onVolumeChange, onPitchChange, onTimbreChange,
  onMuteToggle, onPlay, onDelete, onSave,
}: DJChannelStripProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [ledLevel, setLedLevel] = useState(0);
  const volumeRef = useRef(volume);
  const startVolRef = useRef(volume);
  const trackHeightRef = useRef(120);

  volumeRef.current = volume;

  useEffect(() => {
    const id = setInterval(() => {
      if (isMuted) { setLedLevel(0); return; }
      const base = isPlaying
        ? Math.round(volume / 10) + Math.floor(Math.random() * 3) - 1
        : Math.round(volume / 18);
      setLedLevel(Math.max(0, Math.min(LED_COUNT, base)));
    }, 110);
    return () => clearInterval(id);
  }, [volume, isMuted, isPlaying]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { startVolRef.current = volumeRef.current; },
      onPanResponderMove: (_, gs) => {
        const h = trackHeightRef.current;
        if (h === 0) return;
        const newVol = Math.round(Math.max(0, Math.min(100, startVolRef.current - (gs.dy / h) * 100)));
        volumeRef.current = newVol;
        onVolumeChange(newVol);
      },
    })
  ).current;

  function ledColor(i: number, active: boolean): string {
    if (!active) return 'rgba(255,255,255,0.07)';
    if (i >= 8) return '#ff3355';
    if (i >= 6) return '#ffd700';
    return '#22ff88';
  }

  return (
    <View style={[styles.channel, { borderColor: hexToRgba(color, 0.35) }]}>

      {/* Label band */}
      <View style={[styles.labelBand, { backgroundColor: hexToRgba(color, 0.18), borderBottomColor: hexToRgba(color, 0.3) }]}>
        <Text style={styles.labelEmoji}>{icon}</Text>
        <Text style={[styles.labelName, { color }]}>{name.toUpperCase()}</Text>
      </View>

      {/* LED meter */}
      <View style={styles.ledMeter}>
        {Array.from({ length: LED_COUNT }, (_, i) => {
          const dotIndex = LED_COUNT - 1 - i;
          return (
            <View key={i} style={[styles.ledDot, { backgroundColor: ledColor(dotIndex, dotIndex < ledLevel) }]} />
          );
        })}
      </View>

      {/* Fader */}
      <View
        style={styles.faderSection}
        onLayout={e => { trackHeightRef.current = e.nativeEvent.layout.height - 40; }}
        {...panResponder.panHandlers}
      >
        <Text style={styles.faderLabel}>VOL</Text>
        <View style={styles.faderTrack}>
          {/* Top space */}
          <View style={{ flex: Math.max(0, 100 - volume) }} />
          {/* Handle */}
          <View style={[styles.faderHandle, { borderColor: color }]}>
            <View style={styles.faderGrip} />
          </View>
          {/* Fill */}
          <View style={{ flex: Math.max(0, volume), backgroundColor: hexToRgba(color, 0.45), borderRadius: 3 }} />
        </View>
        <Text style={[styles.faderPct, { color }]}>{Math.round(volume)}%</Text>
      </View>

      {/* Pitch */}
      <View style={[styles.pitchSection, { borderTopColor: hexToRgba(color, 0.2) }]}>
        <Text style={styles.pitchLabel}>PITCH</Text>
        <View style={styles.pitchRow}>
          <Pressable onPress={() => onPitchChange(Math.max(-24, pitch - 1))} hitSlop={8} style={styles.pitchBtn}>
            <Text style={[styles.pitchBtnTxt, { color }]}>−</Text>
          </Pressable>
          <Text style={[styles.pitchVal, { color }]}>{pitch > 0 ? `+${pitch}` : `${pitch}`}</Text>
          <Pressable onPress={() => onPitchChange(Math.min(24, pitch + 1))} hitSlop={8} style={styles.pitchBtn}>
            <Text style={[styles.pitchBtnTxt, { color }]}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.chActions, { borderTopColor: hexToRgba(color, 0.2) }]}>
        {hasAudio && (
          <TouchableOpacity
            onPress={onPlay}
            style={[styles.chBtn, { borderColor: isPlaying ? color : 'rgba(255,255,255,0.15)' }]}
          >
            <Text style={{ fontSize: 9, color: isPlaying ? color : '#888' }}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onMuteToggle}
          style={[styles.chBtn, isMuted
            ? { backgroundColor: 'rgba(255,50,80,0.15)', borderColor: '#ff3355' }
            : { borderColor: 'rgba(255,255,255,0.15)' }]}
        >
          <Text style={{ fontSize: 9, color: isMuted ? '#ff3355' : '#888' }}>{isMuted ? '🔇' : 'M'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowEdit(true)}
          style={[styles.chBtn, { borderColor: hexToRgba(color, 0.5) }]}
        >
          <Text style={{ fontSize: 9, color }}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Edit modal */}
      <Modal visible={showEdit} transparent animationType="fade" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowEdit(false)} />
          <View style={[styles.editPanel, { borderColor: color, shadowColor: color }]}>

            <View style={styles.editHeader}>
              <Text style={styles.editEmoji}>{icon}</Text>
              <Text style={[styles.editTitle, { color }]}>{name}</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <Text style={{ color: '#888', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Volume */}
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>🔊 Volume</Text>
              <TouchableOpacity
                style={styles.editBarWrap}
                onPress={e => onVolumeChange(Math.round(Math.max(0, Math.min(1, e.nativeEvent.locationX / 180)) * 100))}
              >
                <View style={styles.editBarBg}>
                  <View style={[styles.editBarFill, { width: `${volume}%`, backgroundColor: color }]} />
                </View>
              </TouchableOpacity>
              <Text style={[styles.editValTxt, { color }]}>{Math.round(volume)}%</Text>
            </View>

            {/* Pitch */}
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>🎵 Pitch</Text>
              <TouchableOpacity
                style={styles.editBarWrap}
                onPress={e => onPitchChange(Math.max(-24, Math.min(24, Math.round((e.nativeEvent.locationX / 180) * 48 - 24))))}
              >
                <View style={[styles.editBarBg, { position: 'relative' }]}>
                  <View style={[styles.editPitchThumb, { left: `${((pitch + 24) / 48) * 100}%`, backgroundColor: color }]} />
                </View>
              </TouchableOpacity>
              <Text style={[styles.editValTxt, { color }]}>{pitch > 0 ? `+${pitch}` : pitch}</Text>
            </View>

            {/* Timbre */}
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>🎨 Timbre</Text>
              <TouchableOpacity
                style={styles.editBarWrap}
                onPress={e => onTimbreChange(Math.round(Math.max(0, Math.min(1, e.nativeEvent.locationX / 180)) * 100))}
              >
                <View style={styles.editBarBg}>
                  <View style={[styles.editBarFill, { width: `${timbre}%`, backgroundColor: color }]} />
                </View>
              </TouchableOpacity>
              <Text style={[styles.editValTxt, { color }]}>{Math.round(timbre)}%</Text>
            </View>

            <View style={styles.editBtns}>
              <TouchableOpacity
                onPress={() => { onSave(); setShowEdit(false); }}
                style={[styles.editSaveBtn, { borderColor: color, backgroundColor: hexToRgba(color, 0.15) }]}
              >
                <Text style={[styles.editSaveTxt, { color }]}>Save & Update Mix</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { onDelete(); setShowEdit(false); }}
                style={styles.editDelBtn}
              >
                <Text style={styles.editDelTxt}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  channel: {
    flex: 1,
    backgroundColor: 'rgba(14,10,26,0.98)',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  labelBand: {
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  labelEmoji: { fontSize: 14 },
  labelName: { fontSize: 7, fontWeight: '800', letterSpacing: 0.6, marginTop: 2 },

  ledMeter: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  ledDot: { width: 10, height: 4, borderRadius: 1 },

  faderSection: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 4,
  },
  faderLabel: { fontSize: 7, color: '#555', letterSpacing: 0.5, marginBottom: 4 },
  faderTrack: {
    flex: 1,
    width: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  faderHandle: {
    width: 26,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#2e2848',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faderGrip: { width: 14, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  faderPct: { fontSize: 8, fontWeight: '700', marginTop: 4 },

  pitchSection: {
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  pitchLabel: { fontSize: 7, color: '#555', letterSpacing: 0.5, marginBottom: 3 },
  pitchRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pitchBtn: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  pitchBtnTxt: { fontSize: 14, fontWeight: '700', lineHeight: 16 },
  pitchVal: { fontSize: 9, fontWeight: '700', minWidth: 22, textAlign: 'center' },

  chActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 3,
    borderTopWidth: 1,
  },
  chBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  editPanel: {
    width: '88%',
    maxWidth: 340,
    backgroundColor: 'rgba(14,10,28,0.99)',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 20,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  editEmoji: { fontSize: 20 },
  editTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  editLabel: { fontSize: 12, color: '#bbb', width: 78 },
  editBarWrap: { flex: 1, paddingVertical: 8 },
  editBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  editBarFill: { height: '100%', borderRadius: 4 },
  editPitchThumb: { position: 'absolute', width: 8, height: 8, borderRadius: 4, top: 0 },
  editValTxt: { fontSize: 11, fontWeight: '700', minWidth: 30, textAlign: 'right' },
  editBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  editSaveBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  editSaveTxt: { fontSize: 12, fontWeight: '700' },
  editDelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff3355',
    backgroundColor: 'rgba(255,50,80,0.1)',
    alignItems: 'center',
  },
  editDelTxt: { fontSize: 12, fontWeight: '600', color: '#ff3355' },
});