import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { getAppColors } from '../../constants/app-colors';
import { useApp } from '../../context/AppProvider';

export default function TabLayout() {
  const { theme } = useApp();
  const colors = getAppColors(theme);
  const isDark = theme === 'dark';

  return (
    <NativeTabs
      backBehavior="history"
      backgroundColor={colors.surface}
      blurEffect={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
      disableTransparentOnScrollEdge
      iconColor={{ default: colors.textMuted, selected: colors.primary }}
      indicatorColor={colors.primarySoft}
      labelStyle={{
        default: { color: colors.textMuted },
        selected: { color: colors.primary, fontWeight: '700' },
      }}
      labelVisibilityMode="labeled"
      rippleColor="rgba(109, 92, 231, 0.16)"
      tintColor={colors.primary}
    >
      <NativeTabs.Trigger name="scan" contentStyle={{ backgroundColor: colors.background }}>
        <NativeTabs.Trigger.Icon sf="qrcode.viewfinder" md="qr_code_scanner" />
        <NativeTabs.Trigger.Label>Escanear</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history" contentStyle={{ backgroundColor: colors.background }}>
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
        <NativeTabs.Trigger.Label>Histórico</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings" contentStyle={{ backgroundColor: colors.background }}>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
