import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getLabelExtractor } from '@/src/extraction/getLabelExtractor';
import { useI18n } from '@/src/i18n/useI18n';

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
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const cameraRef = useRef<CameraView>(null);
  const askingCameraRef = useRef(false);
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After Don't Allow, never re-request camera or send the user to Settings.
  const [deniedThisSession, setDeniedThisSession] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: t('takePhoto') });
  }, [navigation, t]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void getPermission();
      }
    });
    return () => sub.remove();
  }, [getPermission]);

  useEffect(() => {
    if (permission?.granted) {
      setDeniedThisSession(false);
    }
  }, [permission?.granted]);

  const canShowSystemPrompt =
    !deniedThisSession &&
    permission != null &&
    !permission.granted &&
    (permission.status === 'undetermined' ||
      (Platform.OS !== 'ios' && permission.canAskAgain));

  async function onAllowCamera() {
    if (!canShowSystemPrompt || askingCameraRef.current) return;
    askingCameraRef.current = true;
    try {
      const result = await requestPermission();
      if (!result.granted) {
        setDeniedThisSession(true);
      }
    } finally {
      askingCameraRef.current = false;
    }
  }

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
      setError(
        e instanceof Error ? e.message : t('couldNotProcess'),
      );
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
      setError(
        e instanceof Error ? e.message : t('cameraCaptureFailed'),
      );
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
          {canShowSystemPrompt ? t('cameraNeeded') : t('cameraDenied')}
        </Text>
        {canShowSystemPrompt ? (
          <Pressable
            style={[styles.btn, { backgroundColor: colors.tint }]}
            onPress={onAllowCamera}>
            <Text style={styles.btnText}>{t('allowCamera')}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btn, { backgroundColor: colors.tint }]}
            onPress={pickFromLibrary}>
            <Text style={styles.btnText}>{t('chooseLibrary')}</Text>
          </Pressable>
        )}
        {canShowSystemPrompt ? (
          <Pressable style={styles.linkBtn} onPress={pickFromLibrary}>
            <Text style={{ color: colors.tint, fontWeight: '600' }}>
              {t('chooseLibrary')}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.linkBtn}
          onPress={() => router.replace('/manual-add')}>
          <Text style={{ color: colors.tint, fontWeight: '600' }}>
            {t('addManually')}
          </Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => router.back()}>
          <Text style={{ color: colors.muted, fontWeight: '600' }}>
            {t('cancel')}
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
          <Text style={styles.overlayText}>{t('readingLabel')}</Text>
        </View>
      ) : null}
      <View style={styles.controls}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={[styles.shutter, busy && { opacity: 0.5 }]}
          onPress={takePhoto}
          disabled={busy}
          accessibilityLabel={t('takePhoto')}
        />
        <View style={styles.row}>
          <Pressable
            style={[styles.secondary, { borderColor: '#fff' }]}
            onPress={pickFromLibrary}
            disabled={busy}>
            <Text style={styles.secondaryText} numberOfLines={2}>
              {t('library')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.secondary, styles.manualBtn]}
            onPress={() => router.replace('/manual-add')}
            disabled={busy}>
            <Text style={styles.filledBtnText} numberOfLines={2}>
              {t('addManually')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.secondary, styles.cancelBtn]}
            onPress={() => router.back()}
            disabled={busy}>
            <Text style={styles.filledBtnText} numberOfLines={2}>
              {t('cancel')}
            </Text>
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
    paddingHorizontal: 16,
    gap: 16,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    gap: 8,
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
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  manualBtn: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  cancelBtn: {
    backgroundColor: '#C62828',
    borderColor: '#C62828',
  },
  filledBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  error: { color: '#ffcdd2', textAlign: 'center' },
});
