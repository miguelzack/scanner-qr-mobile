import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HistoryExportDialog from '../../components/HistoryExportDialog';
import ResultModal from '../../components/ResultModal';
import { getAppColors } from '../../constants/app-colors';
import { ScanItem, useApp } from '../../context/AppProvider';
import { getQrContentSummary, parseQrContent } from '../../utils/qr-content';

function formatScanDate(dateValue: string): string {
  const date = new Date(dateValue);
  const today = new Date();
  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return sameDay
    ? `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
}

export default function HistoryScreen() {
  const { history, theme, clearHistory, pauseHistory } = useApp();
  const [selectedItem, setSelectedItem] = useState<ScanItem | null>(null);
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isExportDialogVisible, setExportDialogVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const colors = getAppColors(theme);

  const recognizedTypes = useMemo(
    () => new Set(history.map((item) => parseQrContent(item.data).kind)).size,
    [history]
  );

  const selectedItems = useMemo(
    () => history.filter((item) => selectedIds.has(item.id)),
    [history, selectedIds]
  );

  const cancelSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const enterSelectionMode = (itemId?: string) => {
    setSelectedItem(null);
    setSelectionMode(true);
    if (itemId) setSelectedIds(new Set([itemId]));
  };

  const toggleSelection = (itemId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((current) =>
      current.size === history.length ? new Set() : new Set(history.map((item) => item.id))
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Limpar histórico?',
      'Todas as leituras salvas serão apagadas deste aparelho. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearHistory();
              cancelSelection();
            } catch {
              Alert.alert(
                'Não foi possível limpar',
                'O armazenamento local não respondeu. Tente novamente.'
              );
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ScanItem }) => {
    const summary = getQrContentSummary(parseQrContent(item.data));
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${summary.title}: ${summary.subtitle}`}
        accessibilityState={isSelectionMode ? { selected: isSelected } : undefined}
        activeOpacity={0.72}
        onPress={() => {
          if (isSelectionMode) toggleSelection(item.id);
          else setSelectedItem(item);
        }}
        onLongPress={() => {
          if (!isSelectionMode) enterSelectionMode(item.id);
        }}
        style={[
          styles.card,
          {
            backgroundColor: isSelected ? colors.primarySoft : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
      >
        {isSelectionMode ? (
          <View
            style={[
              styles.selectionBox,
              {
                backgroundColor: isSelected ? colors.primary : colors.surfaceMuted,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
          >
            {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
          </View>
        ) : (
          <View style={[styles.cardIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={summary.icon} size={23} color={colors.primary} />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {summary.title}
            </Text>
            <Text style={[styles.cardDate, { color: colors.textMuted }]}>
              {formatScanDate(item.date)}
            </Text>
          </View>
          <Text style={[styles.cardPreview, { color: colors.textMuted }]} numberOfLines={2}>
            {summary.subtitle}
          </Text>
        </View>

        {!isSelectionMode && (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop:
              Platform.OS === 'web'
                ? Math.max(insets.top + 90, 102)
                : Math.max(insets.top + 18, 30),
            paddingBottom: isSelectionMode
              ? Math.max(insets.bottom + 150, 174)
              : Math.max(insets.bottom + 30, 42),
          },
          history.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>SUA BIBLIOTECA</Text>
                <Text style={[styles.title, { color: colors.text }]}>Histórico</Text>
              </View>
              {history.length > 0 &&
                (isSelectionMode ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar seleção"
                    onPress={cancelSelection}
                    style={[styles.cancelSelectionButton, { backgroundColor: colors.surfaceMuted }]}
                  >
                    <Text style={[styles.cancelSelectionText, { color: colors.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.headerActions}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Selecionar itens do histórico"
                      onPress={() => enterSelectionMode()}
                      style={[styles.selectButton, { backgroundColor: colors.primarySoft }]}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Limpar histórico"
                      onPress={handleClearHistory}
                      style={[styles.clearButton, { backgroundColor: colors.dangerSoft }]}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>

            {history.length > 0 && (
              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: colors.primarySoft, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.statNumber, { color: colors.primary }]}>
                    {history.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                    {history.length === 1 ? 'leitura salva' : 'leituras salvas'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: colors.accentSoft, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.statNumber, { color: colors.accent }]}>
                    {recognizedTypes}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                    {recognizedTypes === 1 ? 'tipo encontrado' : 'tipos encontrados'}
                  </Text>
                </View>
              </View>
            )}

            {pauseHistory && (
              <View
                style={[
                  styles.pausedBanner,
                  { backgroundColor: colors.warningSoft, borderColor: colors.warning },
                ]}
              >
                <Ionicons name="pause-circle-outline" size={19} color={colors.warning} />
                <Text style={[styles.pausedText, { color: colors.warning }]}>
                  O histórico está pausado. Novas leituras não serão salvas.
                </Text>
              </View>
            )}

            {isSelectionMode && (
              <View
                style={[
                  styles.selectionToolbar,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View>
                  <Text style={[styles.selectionCount, { color: colors.text }]}>
                    {selectedIds.size} {selectedIds.size === 1 ? 'selecionado' : 'selecionados'}
                  </Text>
                  <Text style={[styles.selectionHint, { color: colors.textMuted }]}>
                    Toque nos itens que deseja incluir
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selectedIds.size === history.length }}
                  onPress={toggleSelectAll}
                  style={styles.selectAllButton}
                >
                  <Ionicons
                    name={
                      selectedIds.size === history.length
                        ? 'checkbox'
                        : 'square-outline'
                    }
                    size={21}
                    color={colors.primary}
                  />
                  <Text style={[styles.selectAllText, { color: colors.primary }]}>Todos</Text>
                </TouchableOpacity>
              </View>
            )}

            {history.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                MAIS RECENTES
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="time-outline" size={38} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nada por aqui ainda</Text>
            <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>
              Seus QR Codes aparecerão aqui depois da primeira leitura.
            </Text>
          </View>
        }
      />

      <ResultModal
        visible={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        data={selectedItem?.data ?? null}
      />

      {isSelectionMode && (
        <View
          style={[
            styles.exportBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              bottom: Math.max(insets.bottom + 74, 92),
            },
          ]}
        >
          <View style={[styles.exportBarIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="document-text-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.exportBarCopy}>
            <Text style={[styles.exportBarTitle, { color: colors.text }]}>Arquivo único formatado</Text>
            <Text style={[styles.exportBarSubtitle, { color: colors.textMuted }]}>
              {selectedIds.size === 0
                ? 'Selecione ao menos uma leitura'
                : `${selectedIds.size} ${selectedIds.size === 1 ? 'item será incluído' : 'itens serão incluídos'}`}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Exportar selecionados em TXT"
            disabled={selectedIds.size === 0}
            onPress={() => setExportDialogVisible(true)}
            style={[
              styles.exportAction,
              { backgroundColor: colors.primary },
              selectedIds.size === 0 && styles.exportActionDisabled,
            ]}
          >
            <Ionicons name="download-outline" size={19} color="#FFFFFF" />
            <Text style={styles.exportActionText}>Exportar</Text>
          </TouchableOpacity>
        </View>
      )}

      {isExportDialogVisible && (
        <HistoryExportDialog
          items={selectedItems}
          onClose={() => setExportDialogVisible(false)}
          onExported={() => {
            setExportDialogVisible(false);
            cancelSelection();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1.1,
    marginTop: 3,
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectButton: {
    width: 44,
    minHeight: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelSelectionButton: {
    minHeight: 42,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cancelSelectionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  statCard: {
    flex: 1,
    minHeight: 92,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 15,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 3,
  },
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderLeftWidth: 3,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 14,
  },
  pausedText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  selectionToolbar: {
    minHeight: 70,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '900',
  },
  selectionHint: {
    fontSize: 11,
    marginTop: 3,
  },
  selectAllButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 27,
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 82,
    padding: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 19,
    marginBottom: 10,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectionBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 9,
    marginRight: 20,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  cardDate: {
    fontSize: 10,
    marginLeft: 8,
  },
  cardPreview: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    paddingBottom: 40,
  },
  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 20,
  },
  emptyDescription: {
    maxWidth: 300,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
  },
  exportBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 76,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 21,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 9,
  },
  exportBarIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exportBarCopy: {
    flex: 1,
    marginRight: 8,
  },
  exportBarTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  exportBarSubtitle: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  exportAction: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  exportActionDisabled: {
    opacity: 0.42,
  },
  exportActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
