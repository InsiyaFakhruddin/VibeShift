import { Theme } from '@/constants/theme';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Modal,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface StemRingProps {
  name: string;
  icon: string;
  ringIndex: number;
  ringIncrement?: number;
  ringScaleFactor?: number;
  color: string;
  settings?: { volume: number; pitch: number; timbre: number };
  stemUrl?: string;
  isCurrentlyPlaying?: boolean;
  onDelete: () => void;
  onSettingsChange?: (settings: { volume: number; pitch: number; timbre: number }) => void;
  onSave?: (settings: { volume: number; pitch: number; timbre: number }) => void;
  onPlayStem?: (url: string) => void;
}

const COLORS = {
  primary: Theme.primary,
  secondary: Theme.secondary,
  accent: Theme.accent,
  purple: '#9333ea',
  cyan: '#06b6d4',
  magenta: '#ec4981',
};

export const StemRing = ({
  name,
  icon,
  ringIndex,
  ringIncrement = 60,
  ringScaleFactor = 1,
  color,
  settings,
  stemUrl,
  isCurrentlyPlaying = false,
  onDelete,
  onSettingsChange,
  onSave,
  onPlayStem,
}: StemRingProps) => {
  const [volume, setVolume] = useState(settings?.volume ?? 75);
  const [pitch, setPitch] = useState(settings?.pitch ?? 0);
  const [timbre, setTimbre] = useState(settings?.timbre ?? 50);
  const [isSelected, setIsSelected] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(0);
  const volumeRef = useRef(volume);

  const baseSize = 100;
  const ringSize = (baseSize + ringIndex * ringIncrement) * ringScaleFactor;
  const ringRadius = ringSize / 2;

  // Inner rings must sit on top — higher zIndex for lower ringIndex
  const zIndex = 100 - ringIndex * 15;

  const glowColor = (() => {
    if (ringIndex === 0) return COLORS.magenta;
    if (ringIndex === 1) return COLORS.cyan;
    if (ringIndex === 2) return COLORS.purple;
    return COLORS[color as keyof typeof COLORS] || COLORS.primary;
  })();

  // Use onMoveShouldSetPanResponder so simple taps reach the TouchableOpacity.
  // The PanResponder only activates when the user actually drags horizontally (> 8px).
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderMove: (_, gestureState) => {
        const deltaAngle = gestureState.dx * 0.5;
        rotationValue.current += deltaAngle;
        rotation.setValue(rotationValue.current);
        const newVolume = Math.max(0, Math.min(100, volumeRef.current + deltaAngle / 3.6));
        volumeRef.current = newVolume;
        setVolume(newVolume);
        onSettingsChange?.({ volume: newVolume, pitch, timbre });
      },
    })
  ).current;

  const rotateStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [-360, 360],
          outputRange: ['-360deg', '360deg'],
        }),
      },
    ],
  };

  const iconAngle = (ringIndex * 72) * (Math.PI / 180);
  const iconX = Math.cos(iconAngle) * (ringRadius - 24);
  const iconY = Math.sin(iconAngle) * (ringRadius - 24);

  const handleSave = () => {
    onSave?.({ volume, pitch, timbre });
    setShowModal(false);
    setIsSelected(false);
  };

  const openModal = () => {
    setIsSelected(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsSelected(false);
  };

  return (
    <>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.ring,
          rotateStyle,
          {
            width: ringSize,
            height: ringSize,
            borderColor: glowColor,
            borderWidth: 2.5,
            zIndex,
            opacity: isSelected ? 1 : 0.85,
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isSelected ? 1 : 0.65,
            shadowRadius: isSelected ? 30 : 16,
            elevation: isSelected ? 25 : 12,
          },
        ]}
      >
        {/* Volume arc */}
        <Svg style={StyleSheet.absoluteFill} width={ringSize} height={ringSize} pointerEvents="none">
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius - 8}
            fill="none"
            stroke={glowColor}
            strokeWidth={4}
            strokeDasharray={`${(volume / 100) * 2 * Math.PI * (ringRadius - 8)} ${2 * Math.PI * (ringRadius - 8)}`}
            opacity={0.85}
            rotation={-90}
            origin={`${ringSize / 2}, ${ringSize / 2}`}
          />
        </Svg>

        {/* Stem icon — tap opens modal */}
        <TouchableOpacity
          onPress={openModal}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[
            styles.iconContainer,
            {
              left: ringSize / 2 + iconX - 28,
              top: ringSize / 2 + iconY - 28,
              backgroundColor: isSelected ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.75)',
              borderColor: isCurrentlyPlaying ? '#22d3ee' : glowColor,
              borderWidth: isCurrentlyPlaying ? 2.5 : 2,
            },
          ]}
        >
          <Text style={styles.iconEmoji}>{icon}</Text>
          <Text style={[styles.iconName, isCurrentlyPlaying && { color: '#22d3ee' }]}>{name}</Text>
          {isCurrentlyPlaying && <Text style={styles.playingDot}>♪</Text>}
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeModal} />
          <View style={[styles.controlPanel, { borderColor: glowColor, shadowColor: glowColor }]}>

            {/* Header */}
            <View style={styles.controlHeader}>
              <View style={styles.controlTitle}>
                <Text style={styles.iconEmoji}>{icon}</Text>
                <Text style={styles.controlName}>{name}</Text>
              </View>
              <View style={styles.headerActions}>
                {stemUrl && onPlayStem && (
                  <TouchableOpacity
                    onPress={() => onPlayStem(stemUrl)}
                    style={[
                      styles.playButton,
                      {
                        borderColor: glowColor,
                        backgroundColor: isCurrentlyPlaying ? glowColor + '33' : 'rgba(255,255,255,0.05)',
                      },
                    ]}
                  >
                    <Text style={[styles.playIcon, { color: glowColor }]}>
                      {isCurrentlyPlaying ? '⏸' : '▶'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Play hint if URL is available */}
            {stemUrl && onPlayStem && (
              <Text style={styles.playHint}>
                {isCurrentlyPlaying ? '▶ Now playing — tap ⏸ to pause' : 'Tap ▶ to preview this stem'}
              </Text>
            )}

            {/* Volume */}
            <View style={styles.controlSection}>
              <View style={styles.controlLabel}>
                <Text style={styles.labelIcon}>🔊</Text>
                <Text style={styles.labelText}>Volume</Text>
              </View>
              <TouchableOpacity
                style={styles.sliderContainer}
                onPress={(e) => {
                  const newVolume = Math.max(0, Math.min(100, (e.nativeEvent.locationX / 180) * 100));
                  setVolume(newVolume);
                  volumeRef.current = newVolume;
                  onSettingsChange?.({ volume: newVolume, pitch, timbre });
                }}
              >
                <Text style={styles.sliderValue}>{Math.round(volume)}%</Text>
                <View style={styles.volumeBar}>
                  <View style={[styles.volumeFill, { width: `${volume}%`, backgroundColor: glowColor }]} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Pitch */}
            <View style={styles.controlSection}>
              <View style={styles.controlLabel}>
                <Text style={styles.labelIcon}>🎵</Text>
                <Text style={styles.labelText}>Pitch</Text>
              </View>
              <TouchableOpacity
                style={styles.sliderContainer}
                onPress={(e) => {
                  const newPitch = Math.round((e.nativeEvent.locationX / 180) * 48 - 24);
                  const clamped = Math.max(-24, Math.min(24, newPitch));
                  setPitch(clamped);
                  onSettingsChange?.({ volume, pitch: clamped, timbre });
                }}
              >
                <Text style={styles.sliderValue}>{pitch > 0 ? '+' : ''}{pitch}</Text>
                <View style={styles.pitchBar}>
                  <View style={[styles.pitchFill, { left: `${(pitch + 24) * 2.08}%`, backgroundColor: glowColor }]} />
                </View>
              </TouchableOpacity>
              <View style={styles.rangeLabels}>
                <Text style={styles.rangeText}>-24</Text>
                <Text style={styles.rangeText}>+24</Text>
              </View>
            </View>

            {/* Timbre */}
            <View style={styles.controlSection}>
              <View style={styles.controlLabel}>
                <Text style={styles.labelIcon}>🎨</Text>
                <Text style={styles.labelText}>Timbre</Text>
              </View>
              <TouchableOpacity
                style={styles.sliderContainer}
                onPress={(e) => {
                  const newTimbre = Math.max(0, Math.min(100, (e.nativeEvent.locationX / 180) * 100));
                  setTimbre(newTimbre);
                  onSettingsChange?.({ volume, pitch, timbre: newTimbre });
                }}
              >
                <Text style={styles.sliderValue}>{Math.round(timbre)}%</Text>
                <View style={styles.timbreBar}>
                  <View style={[styles.timbreFill, { width: `${timbre}%`, backgroundColor: glowColor }]} />
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>Drag the ring to quickly adjust volume</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={handleSave} style={[styles.actionButton, styles.saveButton]}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { onDelete(); closeModal(); }}
                style={[styles.actionButton, styles.deleteStemmButton]}
              >
                <Text style={styles.deleteStemmButtonText}>Delete Stem</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconEmoji: { fontSize: 20, fontWeight: '600' },
  iconName: { fontSize: 8, color: '#fff', fontWeight: '600', marginTop: 1 },
  playingDot: { fontSize: 8, color: '#22d3ee', marginTop: 1 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  controlPanel: {
    backgroundColor: 'rgba(20,12,40,0.98)',
    borderRadius: 22,
    padding: 18,
    width: '88%',
    maxWidth: 340,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 30,
    borderWidth: 1.5,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  controlTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlName: { fontSize: 15, color: '#fff', fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 14, fontWeight: '700' },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeIcon: { fontSize: 16, color: '#ccc', fontWeight: 'bold' },
  playHint: { fontSize: 10, color: '#aaa', fontStyle: 'italic', marginBottom: 12, textAlign: 'center' },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  actionButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: 'rgba(34,211,238,0.2)', borderWidth: 1, borderColor: '#22d3ee' },
  saveButtonText: { fontSize: 12, color: '#22d3ee', fontWeight: '600' },
  deleteStemmButton: { backgroundColor: 'rgba(255,100,100,0.2)', borderWidth: 1, borderColor: '#ff6464' },
  deleteStemmButtonText: { fontSize: 12, color: '#ff6464', fontWeight: '600' },
  controlSection: { marginBottom: 14 },
  controlLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  labelIcon: { fontSize: 14 },
  labelText: { fontSize: 12, color: '#ccc', fontWeight: '500' },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderValue: { fontSize: 11, color: '#aaa', fontWeight: '600', minWidth: 35 },
  volumeBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  volumeFill: { height: '100%', borderRadius: 3 },
  pitchBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, position: 'relative' },
  pitchFill: { position: 'absolute', height: 6, width: 12, borderRadius: 3 },
  timbreBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  timbreFill: { height: '100%', borderRadius: 3 },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  rangeText: { fontSize: 9, color: '#888', fontWeight: '500' },
  hint: { fontSize: 10, color: '#666', fontStyle: 'italic', marginTop: 4, textAlign: 'center' },
});