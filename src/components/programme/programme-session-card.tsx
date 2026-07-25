import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExerciseCard } from '@/components/ui/exercise-card';
import type { ProgrammeSession } from '@/domain/programme/structure';
import { useTheme } from '@/hooks/use-theme';
import type { ExerciseDetail } from '@/services/exercises/exercise-repository';

export type ProgrammeSessionCardProps = {
  session: ProgrammeSession;
  exerciseDetails: Map<string, ExerciseDetail>;
  onExercisePress?: (exerciseId: string) => void;
  onStart?: () => void;
  starting?: boolean;
  startLabel?: string;
  maxExercises?: number;
  modeSelector?: ReactNode;
  emphasis?: 'standard' | 'hero';
};

function targetLabel(
  repRangeLow: number | null,
  repRangeHigh: number | null,
  holdSeconds: number | null,
): string {
  if (holdSeconds !== null) return `${holdSeconds}-second hold`;
  if (repRangeLow !== null && repRangeHigh !== null) {
    return repRangeLow === repRangeHigh
      ? `${repRangeLow} reps`
      : `${repRangeLow}–${repRangeHigh} reps`;
  }
  return 'Repetitions guided in workout';
}

/** A real generated session with ontology-backed exercise explanations. */
export function ProgrammeSessionCard({
  session,
  exerciseDetails,
  onExercisePress,
  onStart,
  starting,
  startLabel = 'Start session',
  maxExercises,
  modeSelector,
  emphasis = 'standard',
}: ProgrammeSessionCardProps) {
  const { spacing } = useTheme();
  const visibleExercises =
    maxExercises === undefined ? session.exercises : session.exercises.slice(0, maxExercises);
  const hiddenCount = session.exercises.length - visibleExercises.length;
  const isHero = emphasis === 'hero';

  return (
    <View style={{ gap: spacing.two }}>
      <Card
        variant={isHero ? 'hero' : 'standard'}
        elevated={!isHero}
        style={{ gap: spacing.three }}
      >
        <View style={{ gap: spacing.one }}>
          {isHero ? <Caption color="brand">NEXT SESSION</Caption> : null}
          {session.dayOfWeek ? <Caption>{session.dayOfWeek.toUpperCase()}</Caption> : null}
          <Heading variant="title" style={{ flexShrink: 1 }}>
            {session.name}
          </Heading>
          {session.focus ? (
            <AppText color="secondary" style={{ flexShrink: 1 }}>
              {session.focus}
            </AppText>
          ) : null}
          <Caption>
            {[
              session.estimatedMinutes ? `${session.estimatedMinutes} min` : null,
              `${session.exercises.length} ${session.exercises.length === 1 ? 'exercise' : 'exercises'}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Caption>
        </View>
        {modeSelector}
        {onStart ? <PrimaryButton label={startLabel} onPress={onStart} loading={starting} /> : null}
      </Card>

      <View style={{ gap: spacing.two }}>
        {visibleExercises.map((exercise) => {
          const detail = exerciseDetails.get(exercise.exerciseId);
          const displayName = detail?.name || exercise.name || 'Exercise';
          return (
            <ExerciseCard
              key={exercise.exerciseId}
              name={displayName}
              targetSets={exercise.sets}
              targetReps={targetLabel(
                exercise.repRangeLow,
                exercise.repRangeHigh,
                exercise.holdSeconds,
              )}
              description={detail?.description}
              visualKey={detail?.visualKey}
              why={exercise.rationale[0]}
              onPress={onExercisePress ? () => onExercisePress(exercise.exerciseId) : undefined}
            />
          );
        })}
      </View>

      {hiddenCount > 0 ? (
        <Caption color="tertiary">
          Plus {hiddenCount} more {hiddenCount === 1 ? 'exercise' : 'exercises'} in the full
          session.
        </Caption>
      ) : null}
    </View>
  );
}
