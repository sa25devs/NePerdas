import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getLabelExtractor } from '@/src/extraction/getLabelExtractor';
import { preparePreviewImage } from '@/src/extraction/prepareOcrImage';
import { useI18n } from '@/src/i18n/useI18n';

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
  const [torchOn, setTorchOn] = useState(false);
  const [askingCamera, setAskingCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After Don't Allow, skip auto re-prompt and offer other add options.
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

  async function requestCameraAccess() {
    if (askingCameraRef.current) return;
    askingCameraRef.current = true;
    setAskingCamera(true);
    try {
      const result = await requestPermission();
      if (result.granted) {
        setDeniedThisSession(false);
      } else {
        setDeniedThisSession(true);
      }
      return result;
    } finally {
      askingCameraRef.current = false;
      setAskingCamera(false);
    }
  }

  useEffect(() => {
    if (
      permission == null ||
      permission.granted ||
      permission.status !== 'undetermined'
    ) {
      return;
    }
    void requestCameraAccess();
  }, [permission]);

  async function onContinueForCamera() {
    if (!canShowSystemPrompt) return;
    await requestCameraAccess();
  }

  async function onUseCamera() {
    const latest = permission ?? (await getPermission());
    const canAsk =
      latest == null ||
      latest.granted ||
      latest.status === 'undetermined' ||
      latest.canAskAgain;
    if (canAsk) {
      await requestCameraAccess();
      return;
    }
    await Linking.openSettings();
  }

  async function processImage(uri: string) {
    setBusy(true);
    setError(null);
    try {
      const previewUri = await preparePreviewImage(uri);
      let name: string | null = null;
      let expirationDate: string | null = null;
      let rawText = '';
      try {
        const extracted = await getLabelExtractor().extract(uri);
        name = extracted.name;
        expirationDate = extracted.expirationDate;
        rawText = extracted.rawText;
      } catch {
        // Manual entry still available on review
      }

      router.push({
        pathname: '/review',
        params: {
          photoUri: previewUri,
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
        quality: 1,
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
      quality: 1,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await processImage(result.assets[0].uri);
    }
  }

  if (
    !permission ||
    askingCamera ||
    permission.status === 'undetermined'
  ) {
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
            onPress={onContinueForCamera}>
            <Text style={styles.btnText}>{t('continue')}</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              style={[styles.btn, { backgroundColor: colors.tint }]}
              onPress={() => void onUseCamera()}>
              <Text style={styles.btnText}>{t('useCamera')}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: colors.tint }]}
              onPress={pickFromLibrary}>
              <Text style={styles.btnText}>{t('chooseLibrary')}</Text>
            </Pressable>
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
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        enableTorch={torchOn}
        flash={torchOn ? 'on' : 'off'}
      />
      {!busy ? (
        <View pointerEvents="none" style={styles.guideWrap}>
          <View style={styles.guideBox} />
          <Text style={styles.guideText}>{t('scanGuide')}</Text>
        </View>
      ) : null}
      {busy ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>{t('readingLabel')}</Text>
        </View>
      ) : null}
      <View style={styles.controls}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={[styles.torchBtn, torchOn && styles.torchBtnOn]}
          onPress={() => setTorchOn((on) => !on)}
          disabled={busy}
          accessibilityLabel={t('torch')}>
          <Text style={styles.torchText}>
            {torchOn ? t('torchOn') : t('torch')}
          </Text>
        </Pressable>
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
  guideWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '22%',
    bottom: '28%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    gap: 10,
  },
  guideBox: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    marginHorizontal: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
  },
  guideText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 8,
  },
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
    gap: 12,
    alignItems: 'center',
  },
  torchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  torchBtnOn: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  torchText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
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
