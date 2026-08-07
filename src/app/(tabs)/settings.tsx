import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTheme, getAppColors } from '../../constants/app-colors';
import { useApp } from '../../context/AppProvider';

export default function SettingsScreen() {
  const {
    theme,
    setTheme,
    pauseHistory,
    setPauseHistory,
    clearHistory,
    history,
  } = useApp();
  const insets = useSafeAreaInsets();
  const colors = getAppColors(theme);

  const updateTheme = async (newTheme: AppTheme) => {
    if (newTheme === theme) return;
    try {
      await setTheme(newTheme);
    } catch {
      Alert.alert(
        'Tema não salvo',
        'O tema foi aplicado nesta sessão, mas a preferência pode não permanecer no próximo acesso.'
      );
    }
  };

  const updateHistoryPreference = async (pause: boolean) => {
    try {
      await setPauseHistory(pause);
    } catch {
      Alert.alert(
        'Preferência não salva',
        'Não foi possível atualizar o armazenamento do histórico.'
      );
    }
  };

  const handleClearHistory = () => {
    if (history.length === 0) return;

    Alert.alert(
      'Apagar todas as leituras?',
      `${history.length} ${
        history.length === 1 ? 'item será removido' : 'itens serão removidos'
      } permanentemente deste aparelho.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearHistory();
            } catch {
              Alert.alert(
                'Não foi possível apagar',
                'O armazenamento local não respondeu. Tente novamente.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop:
            Platform.OS === 'web'
              ? Math.max(insets.top + 90, 102)
              : Math.max(insets.top + 18, 30),
          paddingBottom: Math.max(insets.bottom + 36, 48),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.eyebrow, { color: colors.primary }]}>DO SEU JEITO</Text>
      <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Aparência, privacidade e dados salvos no aparelho.
      </Text>

      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>APARÊNCIA</Text>
      <View
        style={[
          styles.section,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.sectionHeading}>
          <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="color-palette-outline" size={21} color={colors.primary} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Tema do aplicativo</Text>
            <Text style={[styles.rowDescription, { color: colors.textMuted }]}>
              Escolha a aparência mais confortável.
            </Text>
          </View>
        </View>

        <View style={[styles.themePicker, { backgroundColor: colors.surfaceMuted }]}>
          {([
            { value: 'light' as const, label: 'Claro', icon: 'sunny-outline' as const },
            { value: 'dark' as const, label: 'Escuro', icon: 'moon-outline' as const },
          ]).map((option) => {
            const selected = theme === option.value;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected }}
                activeOpacity={0.75}
                key={option.value}
                onPress={() => void updateTheme(option.value)}
                style={[
                  styles.themeOption,
                  selected && {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={18}
                  color={selected ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: selected ? colors.text : colors.textMuted },
                  ]}
                >
                  {option.label}
                </Text>
                {selected && (
                  <Ionicons name="checkmark-circle" size={17} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PRIVACIDADE E DADOS</Text>
      <View
        style={[
          styles.section,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.settingRow}>
          <View
            style={[
              styles.rowIcon,
              { backgroundColor: pauseHistory ? colors.warningSoft : colors.accentSoft },
            ]}
          >
            <Ionicons
              name={pauseHistory ? 'pause-outline' : 'time-outline'}
              size={21}
              color={pauseHistory ? colors.warning : colors.accent}
            />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Pausar histórico</Text>
            <Text style={[styles.rowDescription, { color: colors.textMuted }]}>
              {pauseHistory
                ? 'Novas leituras não serão registradas.'
                : 'Novas leituras são salvas localmente.'}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Pausar armazenamento do histórico"
            value={pauseHistory}
            onValueChange={(value) => void updateHistoryPreference(value)}
            trackColor={{ false: colors.surfaceMuted, true: colors.primarySoft }}
            thumbColor={pauseHistory ? colors.primary : colors.textMuted}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={history.length > 0 ? 0.7 : 1}
          disabled={history.length === 0}
          onPress={handleClearHistory}
          style={[styles.settingRow, history.length === 0 && styles.disabledRow]}
        >
          <View style={[styles.rowIcon, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="trash-outline" size={21} color={colors.danger} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.danger }]}>Limpar histórico</Text>
            <Text style={[styles.rowDescription, { color: colors.textMuted }]}>
              {history.length === 0
                ? 'Nenhuma leitura salva.'
                : `${history.length} ${history.length === 1 ? 'leitura salva' : 'leituras salvas'}.`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.privacyCard,
          {
            backgroundColor: colors.accentSoft,
            borderColor: colors.accent,
          },
        ]}
      >
        <View style={[styles.privacyIcon, { backgroundColor: colors.surface }]}>
          <Ionicons name="shield-checkmark" size={23} color={colors.accent} />
        </View>
        <View style={styles.privacyCopy}>
          <Text style={[styles.privacyTitle, { color: colors.text }]}>Privacidade local</Text>
          <Text style={[styles.privacyDescription, { color: colors.textMuted }]}>
            O histórico é armazenado somente neste aparelho e não é enviado para servidores.
          </Text>
        </View>
      </View>

      <Text style={[styles.version, { color: colors.textMuted }]}>
        Scanner QR • Expo SDK 57
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
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
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 28,
    marginBottom: 9,
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 21,
    overflow: 'hidden',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  settingRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    marginHorizontal: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  rowDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  themePicker: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: 15,
    padding: 5,
    margin: 12,
    marginTop: 0,
  },
  themeOption: {
    flex: 1,
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
  },
  disabledRow: {
    opacity: 0.48,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRadius: 19,
    padding: 16,
    marginTop: 18,
  },
  privacyIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyCopy: {
    flex: 1,
    marginLeft: 12,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  privacyDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  version: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 26,
  },
});
