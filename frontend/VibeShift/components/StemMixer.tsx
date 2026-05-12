import { useAppTheme } from '@/context/AppearanceContext';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import Icon from './Icon';
import { StemRing } from './StemRing';

interface Stem {
  id: string;
  name: string;
  icon: string;
  color: string;
  download_url?: string | null;
  settings: {
    volume: number;
    pitch: number;
    timbre: number;
  };
}

interface StemMixerProps {
  stems: Stem[];
  playingUrl?: string | null;
  onStemDelete: (stemId: string) => void;
  onSettingsChange: (stemId: string, settings: any) => void;
  onStemSave?: (stemId: string, settings: { volume: number; pitch: number; timbre: number }) => void;
  onPlayStem?: (url: string) => void;
}

export const StemMixer = ({
  stems,
  playingUrl,
  onStemDelete,
  onSettingsChange,
  onStemSave,
  onPlayStem,
}: StemMixerProps) => {
  const t = useAppTheme();
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Wider gap between rings so each icon is easily tappable
  const ringIncrement = stems.length > 2 ? 60 : 70;
  const maxAvailableRadius = Math.min(screenWidth, screenHeight * 0.55) / 2 - 20;
  const baseSize = 100;
  const maxRingIndex = stems.length - 1;
  const maxRadiusNeeded = (baseSize + maxRingIndex * ringIncrement) / 2;
  const ringScaleFactor = maxRadiusNeeded > maxAvailableRadius ? maxAvailableRadius / maxRadiusNeeded : 1;

  const smallestRingSize = baseSize * ringScaleFactor;
  const centerIconSize = Math.max(25, smallestRingSize * 0.35);
  const centerSvgSize = centerIconSize * 2;

  if (stems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: t.subtitle }]}>Upload a song to see stems</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.ringContainer, { width: screenWidth, height: screenHeight * 0.55 }]}>
        {/* Central music disc */}
        <View style={[styles.centralIconWrapper, { zIndex: 200 }]}>
          <View style={[styles.discShadow, { shadowColor: t.accent }]}>
            <Svg width={centerSvgSize} height={centerSvgSize} viewBox="0 0 120 120" style={styles.gradientCircle}>
              <Defs>
                <SvgLinearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={t.accent} stopOpacity="1" />
                  <Stop offset="100%" stopColor={t.accentAlt} stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              <Circle cx="60" cy="60" r="45" fill="url(#centerGradient)" opacity="0.9" />
              <Circle cx="60" cy="60" r="45" fill="none" stroke="url(#centerGradient)" strokeWidth="2" opacity="0.6" />
            </Svg>
            <Icon name="music-2" size={centerIconSize} color="#ffffff" style={styles.musicIcon} />
          </View>
        </View>

        {stems.map((stem, index) => (
          <StemRing
            key={stem.id}
            name={stem.name}
            icon={stem.icon}
            ringIndex={index}
            ringIncrement={ringIncrement}
            ringScaleFactor={ringScaleFactor}
            color={stem.color}
            settings={stem.settings}
            stemUrl={stem.download_url ?? undefined}
            isCurrentlyPlaying={!!(stem.download_url && playingUrl === stem.download_url)}
            onDelete={() => onStemDelete(stem.id)}
            onSettingsChange={(settings) => onSettingsChange(stem.id, settings)}
            onSave={onStemSave ? (settings) => onStemSave(stem.id, settings) : undefined}
            onPlayStem={onPlayStem}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  ringContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  centralIconWrapper: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  discShadow: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 40, elevation: 20, alignItems: 'center', justifyContent: 'center' },
  gradientCircle: { position: 'absolute' },
  musicIcon: { color: '#ffffff' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14 },
});