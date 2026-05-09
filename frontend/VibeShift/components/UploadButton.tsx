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

      const DocumentPicker = await import('expo-document-picker');
      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
      if ((res as any).type === 'success') {
        onUpload(res as any);
      }
    } catch (err) {
      console.warn('Document picker not available:', err);
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
