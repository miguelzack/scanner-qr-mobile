import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAppColors } from '../constants/app-colors';
import { useApp } from '../context/AppProvider';
import type { ScanItem } from '../context/AppProvider';
import {
  buildHistoryExportText,
  getDefaultHistoryExportName,
  sanitizeExportFileName,
} from '../utils/history-export';

type HistoryExportDialogProps = {
  items: ScanItem[];
  onClose: () => void;
  onExported: () => void;
};

export default function HistoryExportDialog({
  items,
  onClose,
  onExported,
}: HistoryExportDialogProps) {
  const { theme } = useApp();
  const colors = getAppColors(theme);
  const insets = useSafeAreaInsets();
  const [fileName, setFileName] = useState(getDefaultHistoryExportName);
  const [isSaving, setIsSaving] = useState(false);

  const saveExport = async () => {
    if (items.length === 0 || isSaving) return;

    const safeName = sanitizeExportFileName(fileName);
    const fullName = `${safeName}.txt`;
    const fileContent = buildHistoryExportText(items);
    Keyboard.dismiss();
    setIsSaving(true);

    try {
      if (Platform.OS === 'android') {
        const permission =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permission.granted) return;

        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permission.directoryUri,
          safeName,
          'text/plain'
        );
        await FileSystem.writeAsStringAsync(fileUri, fileContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        onExported();
        Alert.alert(
          'Histórico exportado',
          `${fullName} foi salvo com ${items.length} ${items.length === 1 ? 'item' : 'itens'}.`
        );
        return;
      }

      if (!FileSystem.cacheDirectory) throw new Error('Cache indisponível');

      const fileUri = `${FileSystem.cacheDirectory}${fullName}`;
      await FileSystem.writeAsStringAsync(fileUri, fileContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Compartilhamento indisponível');
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        UTI: 'public.plain-text',
        dialogTitle: 'Salvar histórico em TXT',
      });
      onExported();
    } catch {
      Alert.alert(
        'Não foi possível exportar',
        'Tente outro nome ou selecione uma pasta diferente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isSaving) onClose();
      }}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardArea}
        >
          <View
            style={[
              styles.dialog,
              {
                backgroundColor: colors.surface,
                marginBottom: Math.max(insets.bottom, 18),
              },
            ]}
          >
            <View style={styles.header}>
              <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="documents-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.titleGroup}>
                <Text style={[styles.title, { color: colors.text }]}>Exportar histórico</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {items.length} {items.length === 1 ? 'leitura selecionada' : 'leituras selecionadas'}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Fechar exportação"
                onPress={onClose}
                disabled={isSaving}
                style={[styles.closeButton, { backgroundColor: colors.surfaceMuted }]}
              >
                <Ionicons name="close" size={21} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.formatCard, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="checkmark-circle" size={21} color={colors.accent} />
              <Text style={[styles.formatText, { color: colors.text }]}>
                O TXT terá cabeçalho, datas, tipo reconhecido, resumo e conteúdo completo de cada QR Code.
              </Text>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nome do arquivo</Text>
            <View style={[styles.fileNameInput, { backgroundColor: colors.background }]}>
              <TextInput
                autoFocus
                selectTextOnFocus
                value={fileName}
                onChangeText={setFileName}
                editable={!isSaving}
                maxLength={84}
                placeholder="historico_qrcodes"
                placeholderTextColor={colors.textMuted}
                style={[styles.textInput, { color: colors.text }]}
                returnKeyType="done"
                onSubmitEditing={() => void saveExport()}
              />
              <Text style={[styles.extension, { color: colors.textMuted }]}>.txt</Text>
            </View>

            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {Platform.OS === 'android'
                ? 'Ao continuar, escolha em qual pasta o arquivo será salvo.'
                : Platform.OS === 'ios'
                  ? 'Ao continuar, escolha “Salvar em Arquivos”.'
                  : 'O navegador fará o download do arquivo formatado.'}
            </Text>

            <View style={styles.buttons}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={onClose}
                disabled={isSaving}
                style={[styles.cancelButton, { backgroundColor: colors.surfaceMuted }]}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => void saveExport()}
                disabled={isSaving}
                style={[
                  styles.exportButton,
                  { backgroundColor: colors.primary },
                  isSaving && styles.disabledButton,
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="folder-open-outline" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.exportText}>
                  {isSaving
                    ? 'Salvando…'
                    : Platform.OS === 'android'
                      ? 'Escolher pasta'
                      : 'Exportar TXT'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  keyboardArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  dialog: {
    borderRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 14,
    padding: 13,
    marginBottom: 18,
  },
  formatText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  fileNameInput: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  extension: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 4,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    minHeight: 51,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  exportButton: {
    flex: 1.5,
    minHeight: 51,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  exportText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.65,
  },
});
