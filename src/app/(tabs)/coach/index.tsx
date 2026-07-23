import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Heading } from '@/components/ui/app-text';
import { CoachInsightCard } from '@/components/ui/coach-insight-card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { previewCoachMessage, previewCoachQuickActions } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

export default function CoachScreen() {
  const router = useRouter();
  const { spacing } = useTheme();

  const actions = previewCoachQuickActions.map((label) => ({
    label,
    onPress: () => {
      if (label === 'Change my schedule') {
        router.push('/(tabs)/coach/accountability-settings');
      } else {
        router.push('/(tabs)/coach/insight');
      }
    },
  }));

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">Coach</Heading>
      </View>

      <CoachInsightCard message={previewCoachMessage} actions={actions} />
    </ScrollScreen>
  );
}
