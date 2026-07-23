import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function ProfileLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.default },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text.primary },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="personal-details" options={{ title: 'Personal Details' }} />
      <Stack.Screen name="goals" options={{ title: 'Goals' }} />
      <Stack.Screen name="equipment" options={{ title: 'Equipment' }} />
      <Stack.Screen name="availability" options={{ title: 'Training Availability' }} />
      <Stack.Screen name="coaching-style" options={{ title: 'Coaching Style' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="units" options={{ title: 'Units & Appearance' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      <Stack.Screen name="bodyscan-privacy" options={{ title: 'BodyScan Privacy' }} />
      <Stack.Screen name="consent" options={{ title: 'Consent' }} />
      <Stack.Screen name="data-export" options={{ title: 'Data Export' }} />
      <Stack.Screen name="delete-data" options={{ title: 'Delete Data' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Delete Account' }} />
      <Stack.Screen name="subscription" options={{ title: 'Subscription' }} />
    </Stack>
  );
}
