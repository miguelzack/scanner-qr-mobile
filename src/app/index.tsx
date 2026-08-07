import { Redirect } from 'expo-router';
import { useApp } from '../context/AppProvider';
import { View, ActivityIndicator } from 'react-native';
import { getAppColors } from '../constants/app-colors';

export default function Index() {
  const { hasSeenOnboarding, isLoaded, theme } = useApp();
  const colors = getAppColors(theme);

  if (!isLoaded || hasSeenOnboarding === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/scan" />;
}
