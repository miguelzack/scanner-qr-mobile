import { Ionicons } from '@expo/vector-icons';
import {
  BarcodeScanningResult,
  CameraMountError,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ResultModal from '../../components/ResultModal';
import { getAppColors } from '../../constants/app-colors';
import { useApp } from '../../context/AppProvider';
import { parseQrContent } from '../../utils/qr-content';

const SHADE = 'rgba(5, 7, 12, 0.58)';
const SCAN_RADIUS = 30;

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const scanLocked = useRef(false);
  const cameraErrorShown = useRef(false);
  const [scanProgress] = useState(() => new Animated.Value(0));
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { addScan, pauseHistory, theme } = useApp();
  const colors = getAppColors(theme);
  const scanSize = Math.min(width * 0.76, height * 0.38, 336);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      cameraErrorShown.current = false;

      return () => {
        setIsFocused(false);
        setTorchEnabled(false);
      };
    }, [])
  );

  useEffect(() => {
    scanProgress.setValue(0);
    if (!isFocused || isModalVisible) return;

    const scanAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, {
          toValue: 1,
          duration: 1900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(180),
        Animated.timing(scanProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    scanAnimation.start();
    return () => scanAnimation.stop();
  }, [isFocused, isModalVisible, scanProgress]);

  const unlockScanner = (delay = 250) => {
    setTimeout(() => {
      setScannedData(null);
      scanLocked.current = false;
    }, delay);
  };

  const handleBarcodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    if (scanLocked.current) return;
    scanLocked.current = true;

    const normalizedData = data?.trim();
    if (type !== 'qr' || !normalizedData) {
      Alert.alert(
        'QR Code não reconhecido',
        'Não encontramos um conteúdo legível nesse código. Tente novamente com mais luz e mantenha a câmera firme.'
      );
      unlockScanner(900);
      return;
    }

    try {
      parseQrContent(normalizedData);
      setScannedData(normalizedData);
      setModalVisible(true);

      try {
        await addScan(normalizedData);
      } catch {
        Alert.alert(
          'Histórico indisponível',
          'A leitura foi concluída, mas não foi possível salvá-la no histórico local.'
        );
      }
    } catch {
      Alert.alert(
        'Conteúdo não reconhecido',
        'O QR Code foi lido, mas o conteúdo não pôde ser interpretado com segurança.'
      );
      unlockScanner(900);
    }
  };

  const handleCameraError = ({ message }: CameraMountError) => {
    if (cameraErrorShown.current) return;
    cameraErrorShown.current = true;
    Alert.alert(
      'Não foi possível iniciar a câmera',
      message || 'Feche outros aplicativos que estejam usando a câmera e tente novamente.'
    );
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    unlockScanner();
  };

  if (!permission) {
    return (
      <View style={[styles.permissionScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingMark, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="camera-outline" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Preparando a câmera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    const canRequestPermission = permission.canAskAgain;
    return (
      <View
        style={[
          styles.permissionScreen,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={[styles.permissionIllustration, { backgroundColor: colors.primarySoft }]}>
          <View style={[styles.permissionLens, { borderColor: colors.primary }]}>
            <Ionicons name="camera-outline" size={52} color={colors.primary} />
          </View>
          <View style={[styles.lockBubble, { backgroundColor: colors.accent }]}>
            <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
          </View>
        </View>

        <Text style={[styles.permissionTitle, { color: colors.text }]}>
          Dê acesso à câmera
        </Text>
        <Text style={[styles.permissionDescription, { color: colors.textMuted }]}>
          A câmera é usada somente durante a leitura. Fotos e vídeos não são gravados.
        </Text>

        <View
          style={[
            styles.permissionNote,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
          <Text style={[styles.permissionNoteText, { color: colors.textMuted }]}>
            O conteúdo escaneado permanece no seu aparelho.
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.82}
          style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          onPress={canRequestPermission ? requestPermission : Linking.openSettings}
        >
          <Ionicons
            name={canRequestPermission ? 'camera-outline' : 'settings-outline'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.permissionButtonText}>
            {canRequestPermission ? 'Permitir acesso' : 'Abrir configurações'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused ? (
        <CameraView
          active={isFocused}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          enableTorch={torchEnabled}
          facing="back"
          onBarcodeScanned={scannedData ? undefined : handleBarcodeScanned}
          onMountError={handleCameraError}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      )}

      <View pointerEvents="none" style={styles.mask}>
        <View style={[styles.maskBlock, styles.maskTop]} />
        <View style={[styles.maskMiddle, { height: scanSize }]}>
          <View style={styles.maskSide} />
          <View style={[styles.scanWindow, { width: scanSize, height: scanSize }]}>
            <View style={[styles.cutoutCorner, styles.cutoutTopLeft]} />
            <View style={[styles.cutoutCorner, styles.cutoutTopRight]} />
            <View style={[styles.cutoutCorner, styles.cutoutBottomLeft]} />
            <View style={[styles.cutoutCorner, styles.cutoutBottomRight]} />
            <View
              style={[
                styles.scanFrame,
                {
                  borderColor: 'rgba(255, 255, 255, 0.86)',
                  borderRadius: SCAN_RADIUS,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.scanBeam,
                {
                  opacity: scanProgress.interpolate({
                    inputRange: [0, 0.08, 0.9, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  transform: [
                    {
                      translateY: scanProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, scanSize - 28],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.beamGlow, { backgroundColor: colors.accent }]} />
              <View style={[styles.beamCore, { backgroundColor: colors.accent }]} />
            </Animated.View>
          </View>
          <View style={styles.maskSide} />
        </View>
        <View style={[styles.maskBlock, styles.maskBottom]} />
      </View>

      <View
        style={[
          styles.topBar,
          { top: insets.top + (Platform.OS === 'web' ? 76 : 14) },
        ]}
      >
        <View style={styles.brandBadge}>
          <View style={[styles.brandIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="scan" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.scannerTitle}>Scanner QR</Text>
            <View style={styles.liveRow}>
              <View style={[styles.statusDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.scannerSubtitle}>Pronto para ler</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={torchEnabled ? 'Desligar lanterna' : 'Ligar lanterna'}
          activeOpacity={0.75}
          onPress={() => setTorchEnabled((current) => !current)}
          style={[styles.roundButton, torchEnabled && { backgroundColor: colors.primary }]}
        >
          <Ionicons
            name={torchEnabled ? 'flash' : 'flash-outline'}
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <View
        pointerEvents="none"
        style={[styles.guide, { bottom: Math.max(insets.bottom + 22, 30) }]}
      >
        <View style={styles.guideHeader}>
          <View style={styles.guideIcon}>
            <Ionicons name="qr-code-outline" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.guideCopy}>
            <Text style={styles.guideTitle}>Enquadre o QR Code</Text>
            <Text style={styles.guideDescription}>
              Mantenha todo o código dentro da moldura
            </Text>
          </View>
        </View>
        <View style={styles.guideStatusRow}>
          <View style={styles.autoBadge}>
            <Ionicons name="sparkles-outline" size={13} color={colors.accent} />
            <Text style={[styles.autoBadgeText, { color: colors.accent }]}>
              Leitura automática
            </Text>
          </View>
          {pauseHistory && (
            <View style={styles.pausedBadge}>
              <Ionicons name="pause" size={12} color="#F4BE5B" />
              <Text style={styles.pausedBadgeText}>Histórico pausado</Text>
            </View>
          )}
        </View>
      </View>

      <ResultModal visible={isModalVisible} onClose={handleCloseModal} data={scannedData} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070C',
  },
  permissionScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingMark: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
  },
  permissionIllustration: {
    width: 148,
    height: 148,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionLens: {
    width: 100,
    height: 100,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBubble: {
    position: 'absolute',
    right: 15,
    bottom: 17,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  permissionTitle: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.8,
    textAlign: 'center',
    marginTop: 28,
  },
  permissionDescription: {
    maxWidth: 360,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
  },
  permissionNote: {
    maxWidth: 380,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    marginTop: 24,
  },
  permissionNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  permissionButton: {
    width: '100%',
    maxWidth: 380,
    minHeight: 56,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 14,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  mask: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  maskBlock: {
    flex: 1,
    backgroundColor: SHADE,
  },
  maskTop: {
    flex: 1.05,
  },
  maskBottom: {
    flex: 0.9,
  },
  maskMiddle: {
    flexDirection: 'row',
  },
  maskSide: {
    flex: 1,
    backgroundColor: SHADE,
  },
  scanWindow: {
    overflow: 'hidden',
  },
  cutoutCorner: {
    position: 'absolute',
    width: SCAN_RADIUS,
    height: SCAN_RADIUS,
    backgroundColor: SHADE,
    zIndex: 1,
  },
  cutoutTopLeft: {
    top: 0,
    left: 0,
    borderBottomRightRadius: SCAN_RADIUS,
  },
  cutoutTopRight: {
    top: 0,
    right: 0,
    borderBottomLeftRadius: SCAN_RADIUS,
  },
  cutoutBottomLeft: {
    bottom: 0,
    left: 0,
    borderTopRightRadius: SCAN_RADIUS,
  },
  cutoutBottomRight: {
    right: 0,
    bottom: 0,
    borderTopLeftRadius: SCAN_RADIUS,
  },
  scanFrame: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 2.5,
    zIndex: 2,
  },
  scanBeam: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 12,
    zIndex: 3,
    justifyContent: 'center',
  },
  beamGlow: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 10,
    borderRadius: 5,
    opacity: 0.2,
  },
  beamCore: {
    height: 2,
    borderRadius: 2,
  },
  topBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7,
    paddingRight: 15,
    borderRadius: 20,
    backgroundColor: 'rgba(12, 14, 19, 0.86)',
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCopy: {
    marginLeft: 10,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  scannerSubtitle: {
    color: '#B7BBC6',
    fontSize: 10,
  },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 19, 26, 0.82)',
  },
  guide: {
    position: 'absolute',
    left: 20,
    right: 20,
    minHeight: 104,
    borderRadius: 23,
    backgroundColor: 'rgba(12, 14, 19, 0.9)',
    padding: 14,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCopy: {
    flex: 1,
    marginLeft: 12,
  },
  guideTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  guideDescription: {
    color: '#B7BBC6',
    fontSize: 11,
    marginTop: 3,
  },
  guideStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(32, 185, 151, 0.12)',
  },
  autoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: 'rgba(244, 190, 91, 0.13)',
  },
  pausedBadgeText: {
    color: '#F4BE5B',
    fontSize: 10,
    fontWeight: '700',
  },
});
