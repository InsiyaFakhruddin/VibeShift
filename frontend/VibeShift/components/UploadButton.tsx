import React from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  onUpload: (file: any) => void;
};

export const UploadButton = ({ onUpload }: Props) => {
  async function pickFile() {
    // Dynamically import so bundlers don't fail when dependency isn't installed yet.
    try {
      if (Platform.OS === 'web') {
        // On web, open a hidden file input using a synthetic click.
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
    <Pressable onPress={pickFile} style={styles.button}>
      <Text style={styles.text}>Upload Song</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: { backgroundColor: '#0a84ff', height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 8 },
  text: { color: '#fff', fontWeight: '600' },
});
