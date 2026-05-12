import * as DocumentPicker from 'expo-document-picker';
import { useAppTheme } from '@/context/AppearanceContext';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  onUpload: (file: any) => void;
};

export const UploadButton = ({ onUpload }: Props) => {
  const t = useAppTheme();

  async function pickFile() {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = () => {
          const file = input.files?.[0];
          if (file) onUpload(file);
        };
        input.click();
        return;
      }

      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      // expo-document-picker v14+ returns { canceled, assets }
      if (!res.canceled && res.assets && res.assets.length > 0) {
        onUpload(res.assets[0]);
      }
    } catch (err) {
      console.warn('Document picker error:', err);
    }
  }

  return (
    <Pressable
      onPress={pickFile}
      style={({ pressed }) => [styles.button, { backgroundColor: pressed ? t.accentAlt : t.accent }]}
    >
      {({ pressed }) => (
        <Text style={[styles.text, { opacity: pressed ? 0.9 : 1 }]}>Upload Song</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 8 },
  text: { color: '#fff', fontWeight: '600', fontSize: 14 },
});