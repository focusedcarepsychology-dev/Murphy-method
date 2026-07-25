import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';

export default function ResetMyPlanScreen() {
  const router = useRouter();
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Adapt your plan to your life</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Update your goals, equipment or availability first when those have changed. You can then
          create a new programme version while keeping the previous plan in history.
        </AppText>
      </View>
      <Card style={{ gap: spacing.one }}>
        <AppText variant="bodyEmphasis">A workout already in progress?</AppText>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Finish or resume it before restructuring so the active workout remains consistent with the
          programme it came from.
        </AppText>
      </Card>
      <PrimaryButton
        label="Open programme restructure"
        onPress={() => router.push('/(tabs)/plan/reset')}
      />
    </ScrollScreen>
  );
}
