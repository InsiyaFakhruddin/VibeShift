import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  genre: string;
  position: { x: number; y: number };
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
};

export const GenreBubble = ({ genre, position, isSelected, onSelect, onPreview }: Props) => {
  return (
    <Pressable onPress={onSelect} style={[styles.bubble, isSelected && styles.selected]}>
      <Text style={styles.text}>{genre}</Text>
      <Pressable onPress={(e) => { e.stopPropagation(); onPreview(); }} style={styles.previewBtn}>
        <Text style={styles.previewText}>▶</Text>
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  bubble: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.04)', margin: 8 },
  selected: { transform: [{ scale: 1.08 }], backgroundColor: 'rgba(10,132,255,0.12)' },
  text: { fontWeight: '700' },
  previewBtn: { position: 'absolute', bottom: -8, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  previewText: { fontSize: 12 },
});
