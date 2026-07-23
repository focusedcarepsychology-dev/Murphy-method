import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton, TertiaryButton } from '@/components/ui/button';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';

export default function ResetPlanScreen() {
  const router = useRouter();
  const { spacing } = useTheme();

  return (
    <ScrollScreen contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ gap: spacing.two }}>
        <Heading variant="title">Reset or restructure your plan</Heading>
        <AppText color="secondary">
          This builds a new programme from scratch, keeping your prior version in history. Use this
          if your goals or circumstances have changed significantly — for smaller adjustments, Coach
          can usually adapt your current plan instead.
        </AppText>
      </View>
      <View style={{ gap: spacing.two, marginTop: 'auto' }}>
        <PrimaryButton label="Confirm restructure" onPress={() => router.back()} />
        <TertiaryButton label="Cancel" fullWidth onPress={() => router.back()} />
      </View>
    </ScrollScreen>
  );
}
