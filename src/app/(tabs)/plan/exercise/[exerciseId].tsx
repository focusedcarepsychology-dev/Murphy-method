import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { StatChip } from '@/components/ui/stat-chip';
import { useTheme } from '@/hooks/use-theme';

export default function PlanExerciseDetailScreen() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const { spacing } = useTheme();
  const exerciseName = name ?? 'Exercise';

  return (
    <ScrollScreen>
      <Stack.Screen options={{ title: exerciseName }} />
      <Heading variant="title">{exerciseName}</Heading>
      <View style={{ flexDirection: 'row', gap: spacing.two }}>
        <StatChip icon="checkCircle" label="Compound" />
        <StatChip icon="trending" label="Push" />
      </View>
      <AppText color="secondary">
        Full exercise media, muscle diagrams, and instructional content are seeded from the exercise
        library in Phase 4.
      </AppText>
    </ScrollScreen>
  );
}
