import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAppColors } from '../constants/app-colors';
import { useApp } from '../context/AppProvider';
import { parseQrContent, ParsedQrContent } from '../utils/qr-content';

interface ResultModalProps {
  visible: boolean;
  onClose: () => void;
  data: string | null;
}

type Detail = {
  label: string;
  value: string;
  secret?: boolean;
};

type Action = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void | Promise<void>;
};

const securityNames: Record<string, string> = {
  nopass: 'Aberta (sem senha)',
  WPA: 'WPA/WPA2/WPA3',
  WPA2: 'WPA2',
  WPA3: 'WPA3',
  WEP: 'WEP',
  DPP: 'Wi-Fi Easy Connect',
};

function formatAmount(amount: number): string {
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function buildDetails(content: ParsedQrContent): Detail[] {
  if (content.kind === 'wifi') {
    return [
      { label: 'Rede', value: content.ssid },
      { label: 'Segurança', value: securityNames[content.security] ?? content.security },
      ...(content.password ? [{ label: 'Senha', value: content.password, secret: true }] : []),
      ...(content.hidden ? [{ label: 'Visibilidade', value: 'Rede oculta' }] : []),
    ];
  }

  if (content.kind === 'pix') {
    return [
      ...(content.merchantName ? [{ label: 'Recebedor informado', value: content.merchantName }] : []),
      ...(content.key ? [{ label: `Chave (${content.keyType})`, value: content.key }] : []),
      ...(content.amount !== undefined ? [{ label: 'Valor', value: formatAmount(content.amount) }] : []),
      ...(content.description ? [{ label: 'Descrição', value: content.description }] : []),
      ...(content.txid ? [{ label: 'Identificador', value: content.txid }] : []),
      ...(content.merchantCity ? [{ label: 'Cidade', value: content.merchantCity }] : []),
      {
        label: 'Tipo',
        value: content.isPayload
          ? content.isDynamic
            ? 'QR Code Pix dinâmico'
            : 'QR Code Pix estático'
          : 'Chave Pix',
      },
    ];
  }

  if (content.kind === 'app') {
    return [
      { label: 'Tipo', value: content.appType },
      { label: 'Conteúdo', value: content.displayValue },
    ];
  }

  return [{ label: content.kind === 'url' ? 'Endereço' : 'Conteúdo', value: content.raw }];
}

function getDefaultFileName(content: ParsedQrContent): string {
  if (content.kind === 'wifi') return `wifi_${content.ssid}`;
  if (content.kind === 'pix') return `pix_${content.merchantName || content.keyType}`;
  if (content.kind === 'url') return 'link_qrcode';
  if (content.kind === 'app') return `${content.appType.toLowerCase()}_qrcode`;
  return 'leitura_qrcode';
}

function sanitizeFileName(value: string): string {
  const withoutExtension = value.trim().replace(/\.txt$/i, '');
  const sanitized = withoutExtension
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[.\s]+$/g, '')
    .slice(0, 80);

  return sanitized || 'leitura_qrcode';
}

export default function ResultModal({ visible, onClose, data }: ResultModalProps) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [isSaveDialogVisible, setSaveDialogVisible] = useState(false);
  const [fileName, setFileName] = useState('leitura_qrcode');
  const [isSaving, setIsSaving] = useState(false);
  const isDark = theme === 'dark';
  const colors = getAppColors(theme);

  const backgroundColor = colors.surface;
  const textColor = colors.text;
  const subTextColor = colors.textMuted;
  const cardColor = colors.surfaceMuted;
  const inputColor = colors.background;
  const overlayColor = isDark ? 'rgba(0, 0, 0, 0.78)' : 'rgba(0, 0, 0, 0.55)';

  const content = useMemo(() => (data ? parseQrContent(data) : null), [data]);
  const details = useMemo(() => (content ? buildDetails(content) : []), [content]);

  if (!content) return null;

  const closeResult = () => {
    setShowWifiPassword(false);
    setSaveDialogVisible(false);
    setIsSaving(false);
    onClose();
  };

  const copyValue = async (value: string, message: string) => {
    try {
      const copied = await Clipboard.setStringAsync(value);
      if (!copied) throw new Error('Clipboard unavailable');
      Alert.alert('Copiado!', message);
    } catch {
      Alert.alert(
        'Não foi possível copiar',
        'A área de transferência não está disponível neste momento.'
      );
    }
  };

  const openExternalUri = async (uri: string) => {
    try {
      await Linking.openURL(uri);
    } catch {
      Alert.alert(
        'Aplicativo não encontrado',
        'Nenhum aplicativo instalado conseguiu abrir este conteúdo.'
      );
    }
  };

  const handleOpenContent = async () => {
    if (content.kind === 'url') {
      await openExternalUri(content.url);
      return;
    }

    if (content.kind === 'app') {
      await openExternalUri(content.uri);
      return;
    }

    if (content.kind === 'wifi') {
      try {
        if (Platform.OS === 'android') {
          await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.PANEL_WIFI);
        } else {
          await Linking.openSettings();
        }
      } catch {
        Alert.alert('Não foi possível abrir', 'Abra os ajustes de Wi-Fi do aparelho manualmente.');
      }
      return;
    }

    if (content.kind === 'pix') {
      const valueToCopy = content.isPayload ? content.raw : content.key || content.raw;
      try {
        await Clipboard.setStringAsync(valueToCopy);
      } catch {
        Alert.alert(
          'Não foi possível copiar',
          'A área de transferência não está disponível neste momento.'
        );
        return;
      }

      try {
        await Linking.openURL(`pix:${encodeURIComponent(valueToCopy)}`);
      } catch {
        Alert.alert(
          'Código Pix copiado',
          'Seu banco não oferece abertura direta por link. Abra o aplicativo do banco e cole o conteúdo em “Pix Copia e Cola”.'
        );
      }
    }
  };

  const saveTextFile = async () => {
    const safeName = sanitizeFileName(fileName);
    const fullName = `${safeName}.txt`;
    const scannedText = data?.trim() || content.raw;
    Keyboard.dismiss();
    setIsSaving(true);

    try {
      if (Platform.OS === 'android') {
        const permission =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permission.granted) {
          setIsSaving(false);
          return;
        }

        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permission.directoryUri,
          safeName,
          'text/plain'
        );
        await FileSystem.writeAsStringAsync(fileUri, scannedText, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        setSaveDialogVisible(false);
        Alert.alert('Arquivo salvo', `${fullName} foi salvo na pasta selecionada.`);
      } else {
        if (!FileSystem.cacheDirectory) throw new Error('Cache indisponível');

        const fileUri = `${FileSystem.cacheDirectory}${fullName}`;
        await FileSystem.writeAsStringAsync(fileUri, scannedText, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (!(await Sharing.isAvailableAsync())) {
          throw new Error('Salvar em Arquivos indisponível');
        }

        setSaveDialogVisible(false);
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          UTI: 'public.plain-text',
          dialogTitle: 'Salvar arquivo TXT',
        });
      }
    } catch {
      Alert.alert('Não foi possível salvar', 'Tente outro nome ou selecione uma pasta diferente.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyAction: Action =
    content.kind === 'wifi'
      ? content.password
        ? {
            label: 'Copiar senha',
            icon: 'key-outline',
            onPress: () => copyValue(content.password, 'Senha do Wi-Fi copiada.'),
          }
        : {
            label: 'Copiar rede',
            icon: 'copy-outline',
            onPress: () => copyValue(content.ssid, 'Nome da rede copiado.'),
          }
      : content.kind === 'pix'
        ? {
            label: content.isPayload ? 'Copiar código' : 'Copiar chave',
            icon: 'copy-outline',
            onPress: () =>
              copyValue(
                content.isPayload ? content.raw : content.key || content.raw,
                content.isPayload ? 'Código Pix Copia e Cola copiado.' : 'Chave Pix copiada.'
              ),
          }
        : content.kind === 'url'
          ? {
              label: 'Copiar',
              icon: 'copy-outline',
              onPress: () => copyValue(content.url, 'Link copiado.'),
            }
          : content.kind === 'app'
            ? {
                label: 'Copiar',
                icon: 'copy-outline',
                onPress: () => copyValue(content.uri, 'Conteúdo copiado.'),
              }
            : {
                label: 'Copiar',
                icon: 'copy-outline',
                onPress: () => copyValue(content.raw, 'Conteúdo copiado.'),
              };

  const openLabel =
    content.kind === 'wifi'
      ? Platform.OS === 'android'
        ? 'Abrir Wi-Fi'
        : 'Abrir ajustes'
      : content.kind === 'pix'
        ? 'Abrir banco'
        : content.kind === 'url'
          ? 'Abrir link'
          : 'Abrir app';

  const actions: Action[] = [
    ...(content.kind !== 'text'
      ? [{ label: openLabel, icon: 'open-outline' as const, onPress: handleOpenContent }]
      : []),
    copyAction,
    {
      label: 'Salvar TXT',
      icon: 'download-outline',
      onPress: () => {
        setFileName(getDefaultFileName(content));
        setSaveDialogVisible(true);
      },
    },
  ];

  const title =
    content.kind === 'wifi'
      ? 'Rede Wi-Fi'
      : content.kind === 'pix'
        ? content.isPayload
          ? 'Pagamento Pix'
          : 'Chave Pix'
        : content.kind === 'url'
          ? 'Link encontrado'
          : content.kind === 'app'
            ? content.appType
            : 'Conteúdo lido';

  const headerIcon =
    content.kind === 'wifi'
      ? 'wifi'
      : content.kind === 'pix'
        ? 'card'
        : content.kind === 'url'
          ? 'link'
          : content.kind === 'app'
            ? 'apps'
            : 'document-text';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        if (isSaveDialogVisible) setSaveDialogVisible(false);
        else closeResult();
      }}
    >
      <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
        <View
          style={[
            styles.container,
            {
              backgroundColor,
              paddingBottom: Math.max(insets.bottom + 28, 44),
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <View style={styles.headerIcon}>
                <Ionicons name={headerIcon} size={23} color={colors.primary} />
              </View>
              <View style={styles.titleText}>
                <Text style={[styles.title, { color: textColor }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: subTextColor }]}>
                  Tipo reconhecido automaticamente
                </Text>
              </View>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Fechar resultado"
              onPress={closeResult}
              style={[styles.closeBtn, { backgroundColor: cardColor }]}
            >
              <Ionicons name="close" size={22} color={textColor} />
            </TouchableOpacity>
          </View>

          {content.kind === 'pix' && content.crcValid === false && (
            <View style={styles.warning}>
              <Ionicons name="warning-outline" size={20} color="#b91c1c" />
              <Text style={styles.warningText}>
                Este código Pix parece inválido ou alterado. Confira os dados antes de usar.
              </Text>
            </View>
          )}

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.details, { backgroundColor: cardColor }]}
            showsVerticalScrollIndicator={false}
          >
            {details.map((detail, index) => {
              const hideSecret = detail.secret && !showWifiPassword;
              return (
                <View
                  key={`${detail.label}-${index}`}
                  style={[
                    styles.detailRow,
                    index < details.length - 1 && styles.detailDivider,
                    { borderBottomColor: isDark ? '#3f3f46' : '#e4e4e7' },
                  ]}
                >
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>{detail.label}</Text>
                  <View style={styles.detailValueRow}>
                    <Text style={[styles.detailValue, { color: textColor }]} selectable={!hideSecret}>
                      {hideSecret ? '••••••••' : detail.value}
                    </Text>
                    {detail.secret && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={showWifiPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        onPress={() => setShowWifiPassword((current) => !current)}
                        style={styles.eyeButton}
                      >
                        <Ionicons
                          name={showWifiPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={21}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {content.kind === 'wifi' && (
            <Text style={[styles.helperText, { color: subTextColor }]}>
              Copie a senha e use “{openLabel}” para selecionar a rede reconhecida.
            </Text>
          )}
          {content.kind === 'pix' && (
            <Text style={[styles.helperText, { color: subTextColor }]}>
              Confirme o recebedor e o valor no aplicativo do seu banco antes de pagar.
            </Text>
          )}

          <View style={styles.actionsContainer}>
            {actions.map((action) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={action.label}
                style={[styles.actionButton, { backgroundColor: cardColor }]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <Ionicons name={action.icon} size={23} color={colors.primary} />
                <Text style={[styles.actionText, { color: textColor }]} numberOfLines={1}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isSaveDialogVisible && (
          <View style={styles.saveOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardArea}
            >
              <View
                style={[
                  styles.saveDialog,
                  {
                    backgroundColor,
                    marginBottom: Math.max(insets.bottom, 18),
                  },
                ]}
              >
                <View style={styles.saveHeader}>
                  <View style={styles.saveTitleGroup}>
                    <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                    <Text style={[styles.saveTitle, { color: textColor }]}>Salvar como TXT</Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar salvamento"
                    onPress={() => setSaveDialogVisible(false)}
                    disabled={isSaving}
                    style={styles.saveCloseButton}
                  >
                    <Ionicons name="close" size={22} color={subTextColor} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { color: subTextColor }]}>Nome do arquivo</Text>
                <View style={[styles.fileNameInput, { backgroundColor: inputColor }]}>
                  <TextInput
                    autoFocus
                    selectTextOnFocus
                    value={fileName}
                    onChangeText={setFileName}
                    editable={!isSaving}
                    maxLength={84}
                    placeholder="leitura_qrcode"
                    placeholderTextColor={subTextColor}
                    style={[styles.textInput, { color: textColor }]}
                    returnKeyType="done"
                    onSubmitEditing={saveTextFile}
                  />
                  <Text style={[styles.extension, { color: subTextColor }]}>.txt</Text>
                </View>

                <Text style={[styles.saveHint, { color: subTextColor }]}>
                  {Platform.OS === 'android'
                    ? 'Depois de continuar, escolha a pasta onde deseja salvar.'
                    : Platform.OS === 'ios'
                      ? 'Depois de continuar, selecione “Salvar em Arquivos”.'
                      : 'O navegador baixará o arquivo com este nome.'}
                </Text>

                <View style={styles.saveButtons}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.secondaryButton, { backgroundColor: cardColor }]}
                    onPress={() => setSaveDialogVisible(false)}
                    disabled={isSaving}
                  >
                    <Text style={[styles.secondaryButtonText, { color: textColor }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[
                      styles.primaryButton,
                      { backgroundColor: colors.primary },
                      isSaving && styles.disabledButton,
                    ]}
                    onPress={saveTextFile}
                    disabled={isSaving}
                  >
                    <Ionicons
                      name={isSaving ? 'hourglass-outline' : 'folder-open-outline'}
                      size={20}
                      color="#ffffff"
                    />
                    <Text style={styles.primaryButtonText}>
                      {isSaving
                        ? 'Salvando…'
                        : Platform.OS === 'android'
                          ? 'Escolher pasta'
                          : 'Continuar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#a1a1aa',
    marginBottom: 14,
    opacity: 0.55,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  titleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.13)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  scrollArea: {
    flexGrow: 0,
  },
  details: {
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  detailRow: {
    paddingVertical: 13,
  },
  detailDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 6,
    marginLeft: 8,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    minHeight: 70,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 9,
  },
  actionText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  saveOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  keyboardArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  saveDialog: {
    borderRadius: 22,
    padding: 20,
  },
  saveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  saveTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  saveCloseButton: {
    padding: 5,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 7,
  },
  fileNameInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  extension: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  saveHint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  saveButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1.35,
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.65,
  },
});
