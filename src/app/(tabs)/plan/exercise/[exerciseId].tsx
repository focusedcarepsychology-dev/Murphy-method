import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ExerciseVisual } from '@/components/ui/exercise-visual';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import {
  getExerciseById,
  getExerciseSubstitutions,
} from '@/services/exercises/exercise-repository';

function TextList({ items, numbered = false }: { items: string[]; numbered?: boolean }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.two }}>
      {items.map((item, index) => (
        <View key={`${index}-${item}`} style={{ flexDirection: 'row', gap: spacing.two }}>
          <AppText variant="bodyEmphasis">{numbered ? `${index + 1}.` : '•'}</AppText>
          <AppText style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>{item}</AppText>
        </View>
      ))}
    </View>
  );
}

export default function PlanExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { spacing } = useTheme();

  const { status, data, reload } = useAuthenticatedData(
    async (client) => {
      const id = exerciseId ?? '';
      const [exercise, substitutions] = await Promise.all([
        getExerciseById(client, id),
        getExerciseSubstitutions(client, id),
      ]);
      return { exercise, substitutions };
    },
    [exerciseId],
  );

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading exercise instructions" rows={5} />
      </ScrollScreen>
    );
  }

  if (status === 'error' || !data) {
    return (
      <ScrollScreen>
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      </ScrollScreen>
    );
  }

  if (!data.exercise) {
    return (
      <ScrollScreen>
        <Card>
          <EmptyState
            icon="alertCircle"
            title="Exercise not found"
            description="This exercise is no longer available in the current catalogue."
          />
        </Card>
      </ScrollScreen>
    );
  }

  const exercise = data.exercise;
  const requiredEquipment = exercise.equipment.filter((item) => item.required);

  return (
    <ScrollScreen>
      <Stack.Screen options={{ title: exercise.name }} />

      <View style={{ gap: spacing.two }}>
        <Heading variant="title" style={{ flexShrink: 1 }}>
          {exercise.name}
        </Heading>
        {exercise.visualKey ? (
          <View style={{ alignItems: 'center' }}>
            <ExerciseVisual poseKey={exercise.visualKey} size={180} />
          </View>
        ) : null}
        {exercise.description ? (
          <Card>
            <AppText style={{ flexShrink: 1 }}>{exercise.description}</AppText>
          </Card>
        ) : null}
      </View>

      <View style={{ gap: spacing.two }}>
        <SectionHeader title="Starting position" />
        <Card>
          <AppText style={{ flexShrink: 1 }}>
            {exercise.startingPosition ?? 'Follow the first instruction to set up safely.'}
          </AppText>
        </Card>
      </View>

      <View style={{ gap: spacing.two }}>
        <SectionHeader title="How to do it" />
        <Card>
          {exercise.instructions.length > 0 ? (
            <TextList items={exercise.instructions} numbered />
          ) : (
            <Caption>Detailed instructions are not available for this exercise yet.</Caption>
          )}
        </Card>
      </View>

      {exercise.coachingCues.length > 0 ? (
        <View style={{ gap: spacing.two }}>
          <SectionHeader title="Helpful cues" />
          <Card>
            <TextList items={exercise.coachingCues} />
          </Card>
        </View>
      ) : null}

      {exercise.commonMistakes.length > 0 ? (
        <View style={{ gap: spacing.two }}>
          <SectionHeader title="Common mistakes" />
          <Card>
            <TextList items={exercise.commonMistakes} />
          </Card>
        </View>
      ) : null}

      <View style={{ gap: spacing.two }}>
        <SectionHeader title="What it trains" />
        <Card style={{ gap: spacing.one }}>
          <AppText variant="bodyEmphasis">{exercise.movementPatternLabel}</AppText>
          {exercise.muscles.length > 0 ? (
            <Caption style={{ flexShrink: 1 }}>
              {exercise.muscles
                .map((muscle) =>
                  muscle.role === 'primary' ? muscle.label : `${muscle.label} (secondary)`,
                )
                .join(' · ')}
            </Caption>
          ) : null}
        </Card>
      </View>

      <View style={{ gap: spacing.two }}>
        <SectionHeader title="Equipment" />
        <Card>
          <AppText style={{ flexShrink: 1 }}>
            {requiredEquipment.length > 0
              ? requiredEquipment.map((item) => item.label).join(' · ')
              : 'No equipment required.'}
          </AppText>
        </Card>
      </View>

      {data.substitutions.length > 0 ? (
        <View style={{ gap: spacing.two }}>
          <SectionHeader title="Alternatives" />
          <Card style={{ gap: spacing.two }}>
            {data.substitutions.map((alternative) => (
              <View key={alternative.exerciseId} style={{ gap: spacing.one }}>
                <AppText variant="bodyEmphasis" style={{ flexShrink: 1 }}>
                  {alternative.name}
                </AppText>
                <Caption>{alternative.relationType}</Caption>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <Caption color="tertiary">
        Stop if you feel sharp pain, dizziness or unusual shortness of breath. Exercise guidance is
        educational and does not replace individual medical advice.
      </Caption>
    </ScrollScreen>
  );
}
