import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { IconButton, TertiaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { StatChip } from '@/components/ui/stat-chip';
import { RestTimer } from '@/components/workout/rest-timer';
import { SetLogger } from '@/components/workout/set-logger';
import { previewActiveSet, previewWorkoutExercises } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

export default function ActiveWorkoutScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const { spacing } = useTheme();

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setNumber, setSetNumber] = useState(previewActiveSet.setNumber);
  const [weightKg, setWeightKg] = useState(previewActiveSet.todayWeightKg);
  const [reps, setReps] = useState(previewActiveSet.todayReps);
  const [resting, setResting] = useState(false);

  const exercise = previewWorkoutExercises[exerciseIndex];
  const totalSets = previewActiveSet.totalSets;
  const isLastExercise = exerciseIndex === previewWorkoutExercises.length - 1;

  function handleCompleteSet() {
    setResting(true);
  }

  function handleRestComplete() {
    setResting(false);
    if (setNumber < totalSets) {
      setSetNumber((current) => current + 1);
      return;
    }
    if (isLastExercise) {
      router.replace({
        pathname: '/workout/[workoutId]/summary',
        params: { workoutId: workoutId ?? 'preview-workout-1' },
      });
      return;
    }
    setExerciseIndex((current) => current + 1);
    setSetNumber(1);
  }

  function confirmStopWorkout() {
    Alert.alert('Stop workout?', 'Your progress so far will still be saved.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Stop workout',
        style: 'destructive',
        onPress: () => router.replace('/(tabs)/today'),
      },
    ]);
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="close" accessibilityLabel="Stop workout" onPress={confirmStopWorkout} />
        <Caption>
          EXERCISE {exerciseIndex + 1} OF {previewWorkoutExercises.length}
        </Caption>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ flex: 1, gap: spacing.four, justifyContent: 'center' }}>
        <View style={{ gap: spacing.one }}>
          <Heading variant="hero">{exercise.name}</Heading>
          <AppText color="secondary">
            Set {setNumber} of {totalSets}
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.two }}>
          <StatChip label={`Target: ${exercise.targetReps} reps`} icon="checkCircle" />
          {exercise.previous ? (
            <StatChip label={`Previous: ${exercise.previous}`} icon="history" />
          ) : null}
        </View>

        {resting ? (
          <Card>
            <RestTimer
              totalSeconds={previewActiveSet.restSeconds}
              onComplete={handleRestComplete}
            />
          </Card>
        ) : (
          <SetLogger
            weightKg={weightKg}
            reps={reps}
            onChangeWeight={setWeightKg}
            onChangeReps={setReps}
            onCompleteSet={handleCompleteSet}
          />
        )}

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            rowGap: spacing.one,
          }}
        >
          <TertiaryButton label="Exercise info" icon="info" onPress={() => {}} disabled />
          <TertiaryButton label="Swap" icon="swap" onPress={() => {}} disabled />
          <TertiaryButton
            label="Report discomfort"
            icon="warning"
            tone="critical"
            onPress={() => {}}
            disabled
          />
        </View>
      </View>
    </Screen>
  );
}
