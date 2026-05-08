import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  name: string;
  icon: React.ReactNode;
  position: { x: number; y: number };
  onDelete: () => void;
};

export const InstrumentBubble = ({ name, icon, position, onDelete }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable onPress={() => setIsOpen(!isOpen)} style={styles.bubble}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
        <Text style={styles.name}>{name}</Text>
      </Pressable>

      {isOpen && (
        <View style={styles.dock}>
          <View style={styles.dockHeader}>
            <Text style={{ fontWeight: '700' }}>{name}</Text>
            <Pressable onPress={onDelete} style={styles.deleteBtn}><Text>🗑</Text></Pressable>
          </View>
          <Text style={{ fontSize: 12, marginTop: 8 }}>Volume</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  bubble: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.04)', margin: 8 },
  name: { fontSize: 10, marginTop: 4 },
  dock: { position: 'absolute', left: 16, right: 16, bottom: 100, backgroundColor: 'rgba(0,0,0,0.04)', padding: 12, borderRadius: 12 },
  dockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteBtn: { padding: 8 },
});
