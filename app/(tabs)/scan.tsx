import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getLabelExtractor } from '@/src/extraction/getLabelExtractor';

async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

export default function ScanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function processImage(uri: string) {
    setBusy(true);
    setError(null);
    try {
      const compressed = await compressImage(uri);
      let name: string | null = null;
      let expirationDate: string | null = null;
      let rawText = '';
      try {
        const extracted = await getLabelExtractor().extract(compressed);
        name = extracted.name;
        expirationDate = extracted.expirationDate;
        rawText = extracted.rawText;
      } catch {
        // Manual entry still available on review
      }

      router.push({
        pathname: '/review',
        params: {
          photoUri: compressed,
          name: name ?? '',
          expirationDate: expirationDate ?? '',
          rawText,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not process image');
    } finally {
      setBusy(false);
    }
  }

  async function takePhoto() {
    if (!cameraRef.current || busy) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (photo?.uri) {
        await processImage(photo.uri);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera capture failed');
    }
  }

  async function pickFromLibrary() {
    if (busy) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await processImage(result.assets[0].uri);
    }
  }

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.text }]}>
          Camera access is needed to scan food labels.
        </Text>
        <Pressable
          style={[styles.btn, { backgroundColor: colors.tint }]}
          onPress={requestPermission}>
          <Text style={styles.btnText}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={pickFromLibrary}>
          <Text style={{ color: colors.tint, fontWeight: '600' }}>
            Choose from library instead
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      {busy ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Reading label…</Text>
        </View>
      ) : null}
      <View style={styles.controls}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.row}>
          <Pressable
            style={[styles.secondary, { borderColor: '#fff' }]}
            onPress={pickFromLibrary}
            disabled={busy}>
            <Text style={styles.secondaryText}>Library</Text>
          </Pressable>
          <Pressable
            style={[styles.shutter, busy && { opacity: 0.5 }]}
            onPress={takePhoto}
            disabled={busy}
            accessibilityLabel="Take photo"
          />
          <Pressable
            style={[styles.secondary, { borderColor: '#fff' }]}
            onPress={() => router.push('/manual-add')}
            disabled={busy}>
            <Text style={styles.secondaryText}>Manual</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  message: { fontSize: 16, textAlign: 'center' },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  linkBtn: { paddingVertical: 8 },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  overlayText: { color: '#fff', fontWeight: '600' },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    paddingHorizontal: 24,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#2E7D32',
  },
  secondary: {
    minWidth: 72,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryText: { color: '#fff', fontWeight: '600' },
  error: { color: '#ffcdd2', textAlign: 'center' },
});
