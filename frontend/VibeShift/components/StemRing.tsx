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
  onDelete: () => void;
  onSettingsChange?: (settings: { volume: number; pitch: number; timbre: number }) => void;
}

const COLORS = {
  primary: Theme.primary,
  secondary: Theme.secondary,
  accent: Theme.accent,
  purple: '#9333ea',     // Outer ring color (purple)
  cyan: '#06b6d4',       // Middle ring color (cyan)
  magenta: '#ec4981',    // Inner ring color (magenta/pink)
};

export const StemRing = ({ 
  name, 
  icon, 
  ringIndex, 
  ringIncrement = 50,
  ringScaleFactor = 1,
  color,
  settings,
  onDelete,
  onSettingsChange 
}: StemRingProps) => {
  const [volume, setVolume] = useState(settings?.volume ?? 75);
  const [pitch, setPitch] = useState(settings?.pitch ?? 0);
  const [timbre, setTimbre] = useState(settings?.timbre ?? 50);
  const [isSelected, setIsSelected] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(0);

  // Use dynamic ring increment and base size for flexible scaling
  const baseSize = 100;
  const ringSize = (baseSize + ringIndex * ringIncrement) * ringScaleFactor;
  const ringRadius = ringSize / 2;

  const glowColor = (() => {
    if (ringIndex === 0) return COLORS.magenta;      // Inner ring = magenta
    if (ringIndex === 1) return COLORS.cyan;         // Middle ring = cyan
    if (ringIndex === 2) return COLORS.purple;       // Outer ring = purple
    return COLORS[color as keyof typeof COLORS] || COLORS.primary;
  })();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const deltaAngle = gestureState.dx * 0.5;
        rotationValue.current += deltaAngle;
        rotation.setValue(rotationValue.current);
        const newVolume = Math.max(0, Math.min(100, volume + deltaAngle / 3.6));
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
  const iconX = Math.cos(iconAngle) * (ringRadius - 20);
  const iconY = Math.sin(iconAngle) * (ringRadius - 20);

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
            borderWidth: 3,
            opacity: isSelected ? 1 : 0.8,
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isSelected ? 1 : 0.7,
            shadowRadius: isSelected ? 35 : 20,
            elevation: isSelected ? 25 : 15,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            setIsSelected(!isSelected);
            setShowModal(!showModal);
          }}
          style={[
            styles.iconContainer,
            {
              left: ringSize / 2 + iconX - 24,
              top: ringSize / 2 + iconY - 24,
              width: 48,
              height: 48,
              backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.7)',
              borderColor: glowColor,
              borderWidth: 2,
            },
          ]}
        >
          <Text style={styles.iconEmoji}>{icon}</Text>
          <Text style={styles.iconName}>{name}</Text>
        </TouchableOpacity>

        <Svg style={StyleSheet.absoluteFill} width={ringSize} height={ringSize}>
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
      </Animated.View>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowModal(false);
          setIsSelected(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            onPress={() => {
              setShowModal(false);
              setIsSelected(false);
            }}
          />
          <View style={[styles.controlPanel, { borderColor: glowColor }]}>
            <View style={styles.controlHeader}>
              <View style={styles.controlTitle}>
                <Text style={styles.iconEmoji}>{icon}</Text>
                <Text style={styles.controlName}>{name}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowModal(false);
                  setIsSelected(false);
                }} 
                style={styles.closeButton}
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Volume Control */}
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
                  onSettingsChange?.({ volume: newVolume, pitch, timbre });
                }}
              >
                <Text style={styles.sliderValue}>{Math.round(volume)}%</Text>
                <View style={styles.volumeBar}>
                  <View 
                    style={[
                      styles.volumeFill, 
                      { 
                        width: `${volume}%`, 
                        backgroundColor: glowColor 
                      }
                    ]} 
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Pitch Control */}
            <View style={styles.controlSection}>
              <View style={styles.controlLabel}>
                <Text style={styles.labelIcon}>🎵</Text>
                <Text style={styles.labelText}>Pitch</Text>
              </View>
              <TouchableOpacity 
                style={styles.sliderContainer}
                onPress={(e) => {
                  const newPitch = Math.round((e.nativeEvent.locationX / 180) * 48 - 24);
                  setPitch(Math.max(-24, Math.min(24, newPitch)));
                  onSettingsChange?.({ volume, pitch: Math.max(-24, Math.min(24, newPitch)), timbre });
                }}
              >
                <Text style={styles.sliderValue}>{pitch > 0 ? '+' : ''}{pitch}</Text>
                <View style={styles.pitchBar}>
                  <View 
                    style={[
                      styles.pitchFill,
                      {
                        left: `${(pitch + 24) * 2.08}%`,
                        backgroundColor: glowColor,
                      }
                    ]}
                  />
                </View>
              </TouchableOpacity>
              <View style={styles.rangeLabels}>
                <Text style={styles.rangeText}>-24</Text>
                <Text style={styles.rangeText}>+24</Text>
              </View>
            </View>

            {/* Timbre Control */}
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
                <Text style={styles.sliderValue}>{timbre}%</Text>
                <View style={styles.timbreBar}>
                  <View 
                    style={[
                      styles.timbreFill, 
                      { 
                        width: `${timbre}%`, 
                        backgroundColor: glowColor 
                      }
                    ]} 
                  />
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>Drag ring to adjust volume</Text>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                onPress={() => {
                  setShowModal(false);
                  setIsSelected(false);
                }}
                style={[styles.actionButton, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  onDelete();
                  setShowModal(false);
                  setIsSelected(false);
                }}
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
  },
  iconEmoji: { 
    fontSize: 20,
    fontWeight: '600',
  },
  iconName: { 
    fontSize: 8, 
    color: '#fff', 
    fontWeight: '600',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  controlPanel: {
    backgroundColor: 'rgba(30, 20, 50, 0.98)',
    borderRadius: 20,
    padding: 16,
    width: '85%',
    maxWidth: 320,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  controlTitle: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  controlName: { 
    fontSize: 14, 
    color: '#fff', 
    fontWeight: '700' 
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeIcon: {
    fontSize: 16,
    color: '#ccc',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderWidth: 1,
    borderColor: '#22d3ee',
  },
  saveButtonText: {
    fontSize: 12,
    color: '#22d3ee',
    fontWeight: '600',
  },
  deleteStemmButton: {
    backgroundColor: 'rgba(255, 100, 100, 0.2)',
    borderWidth: 1,
    borderColor: '#ff6464',
  },
  deleteStemmButtonText: {
    fontSize: 12,
    color: '#ff6464',
    fontWeight: '600',
  },
  controlSection: {
    marginBottom: 14,
  },
  controlLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  labelIcon: {
    fontSize: 14,
  },
  labelText: {
    fontSize: 12,
    color: '#ccc',
    fontWeight: '500',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderValue: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '600',
    minWidth: 35,
  },
  volumeBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    borderRadius: 3,
  },
  pitchBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    position: 'relative',
  },
  pitchFill: {
    position: 'absolute',
    height: 6,
    width: 12,
    borderRadius: 3,
  },
  timbreBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timbreFill: {
    height: '100%',
    borderRadius: 3,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rangeText: {
    fontSize: 9,
    color: '#888',
    fontWeight: '500',
  },
  hint: {
    fontSize: 10,
    color: '#777',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});
