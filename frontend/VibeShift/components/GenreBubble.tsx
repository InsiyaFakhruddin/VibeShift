import { hexToRgba, useAppTheme } from '@/context/AppearanceContext';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  genre: string;
  position: { x: number; y: number };
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
};

export const GenreBubble = ({ genre, isSelected, onSelect, onPreview }: Props) => {
  const t = useAppTheme();

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.bubble,
        {
          backgroundColor: isSelected
            ? hexToRgba(t.accent, 0.22)
            : pressed
              ? hexToRgba(t.accentAlt, 0.12)
              : hexToRgba(t.accent, 0.08),
          borderColor: isSelected ? t.accentAlt : hexToRgba(t.accent, 0.4),
          borderWidth: isSelected ? 2 : 1,
          shadowColor: isSelected ? t.accentAlt : 'transparent',
          shadowOpacity: isSelected ? 0.5 : 0,
          shadowRadius: 8,
          elevation: isSelected ? 6 : 0,
        },
        isSelected && styles.selected,
      ]}
    >
      <Text style={[styles.text, { color: isSelected ? t.accent : t.text }]}>{genre}</Text>
      <Pressable
        onPress={(e) => { e.stopPropagation(); onPreview(); }}
        style={({ pressed }) => [
          styles.previewBtn,
          { backgroundColor: pressed ? hexToRgba(t.accentAlt, 0.3) : hexToRgba(t.accent, 0.15) },
        ]}
      >
        {({ pressed }) => (
          <Text style={[styles.previewText, { color: pressed ? t.accentAlt : t.accent }]}>▶</Text>
        )}
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  bubble: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', margin: 8 },
  selected: { transform: [{ scale: 1.08 }] },
  text: { fontWeight: '700', fontSize: 12 },
  previewBtn: { position: 'absolute', bottom: -8, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  previewText: { fontSize: 11, fontWeight: '700' },
});
