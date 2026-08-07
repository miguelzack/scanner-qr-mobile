import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAppColors } from '../constants/app-colors';
import { useApp } from '../context/AppProvider';

const features: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
}[] = [
  {
    icon: 'sparkles-outline',
    title: 'Entende o conteúdo',
    description: 'Links, Pix, Wi-Fi, contatos, mensagens e muito mais.',
  },
  {
    icon: 'time-outline',
    title: 'Histórico sob controle',
    description: 'Tudo fica no aparelho e você pode pausar ou apagar quando quiser.',
  },
  {
    icon: 'document-text-outline',
    title: 'Pronto para usar',
    description: 'Abra, copie ou salve qualquer leitura como arquivo TXT.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding, theme } = useApp();
  const insets = useSafeAreaInsets();
  const colors = getAppColors(theme);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await completeOnboarding();
      router.replace('/(tabs)/scan');
    } catch {
      Alert.alert(
        'Não foi possível continuar',
        'O aplicativo não conseguiu salvar sua preferência. Tente novamente.'
      );
      setIsStarting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 22, 38),
            paddingBottom: Math.max(insets.bottom + 22, 34),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <Ionicons name="scan" size={21} color="#FFFFFF" />
          </View>
          <Text style={[styles.brandName, { color: colors.text }]}>Scanner QR</Text>
          <View style={[styles.localBadge, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="shield-checkmark" size={13} color={colors.accent} />
            <Text style={[styles.localBadgeText, { color: colors.accent }]}>Privado</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={[styles.heroHalo, { backgroundColor: colors.primarySoft }]}>
            <View style={[styles.qrCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="qr-code" size={88} color={colors.text} />
              <View style={[styles.scanLine, { backgroundColor: colors.accent }]} />
            </View>
          </View>

          <Text style={[styles.eyebrow, { color: colors.primary }]}>APONTE. LEIA. USE.</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Um scanner que já sabe o que fazer depois.
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Leia QR Codes com segurança e transforme o resultado em uma ação útil em poucos
            segundos.
          </Text>
        </View>

        <View style={styles.featureList}>
          {features.map((feature) => (
            <View
              key={feature.title}
              style={[
                styles.feature,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={feature.icon} size={21} color={colors.primary} />
              </View>
              <View style={styles.featureCopy}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                <Text style={[styles.featureDescription, { color: colors.textMuted }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Começar a escanear"
          activeOpacity={0.82}
          disabled={isStarting}
          onPress={handleStart}
          style={[styles.button, { backgroundColor: colors.primary }, isStarting && styles.disabled]}
        >
          <Text style={styles.buttonText}>{isStarting ? 'Preparando…' : 'Começar agora'}</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
          Nenhuma conta necessária. Seu histórico permanece salvo localmente.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  glowOne: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(109, 92, 231, 0.12)',
    top: -120,
    right: -120,
  },
  glowTwo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(32, 185, 151, 0.10)',
    bottom: 80,
    left: -130,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  localBadge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  localBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  hero: {
    alignItems: 'center',
    marginTop: 34,
  },
  heroHalo: {
    width: 170,
    height: 170,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '5deg' }],
  },
  qrCard: {
    width: 132,
    height: 132,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#151326',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
    transform: [{ rotate: '-5deg' }],
  },
  scanLine: {
    position: 'absolute',
    width: 94,
    height: 3,
    borderRadius: 2,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginTop: 28,
  },
  title: {
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: -1.25,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 410,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 380,
  },
  featureList: {
    gap: 10,
    marginTop: 28,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 13,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    flex: 1,
    marginLeft: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  featureDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  button: {
    minHeight: 58,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    shadowColor: '#6D5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.65,
  },
  privacyNote: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
  },
});
