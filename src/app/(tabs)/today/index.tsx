import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { ProgrammeSessionCard } from '@/components/programme/programme-session-card';
import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { MomentumCard } from '@/components/ui/momentum-card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { ProgrammeSession } from '@/domain/programme/structure';
import { greetingWithName } from '@/domain/profile/greeting';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useGreeting } from '@/hooks/use-greeting';
import { useTheme } from '@/hooks/use-theme';
import { getExercisesByIds } from '@/services/exercises/exercise-repository';
import { loadSelectedGoals } from '@/services/onboarding/onboarding-repository';
import { ensureRealProgramme } from '@/services/programme/programme-repository';
import {
  loadTrainingHistorySummary,
  loadViewerProfile,
} from '@/services/training/training-repository';
import { loadActiveWorkout } from '@/services/workouts/active-workout-repository';
import { startWorkout, type WorkoutMode } from '@/services/workouts/workout-repository';

const WORKOUT_MODES: readonly { value: WorkoutMode; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'quick', label: 'Quick' },
  { value: 'minimum', label: 'Minimum' },
];

function nextSessionForToday(sessions: ProgrammeSession[]): ProgrammeSession | null {
  if (sessions.length === 0) return null;
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date());
  return (
    sessions.find((session) => session.dayOfWeek?.toLowerCase() === today.toLowerCase()) ??
    sessions[0]
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const greeting = useGreeting();
  const { spacing } = useTheme();
  const { client } = useAuthenticatedClient();
  const [selectedMode, setSelectedMode] = useState<WorkoutMode>('full');
  const [startingMode, setStartingMode] = useState<WorkoutMode | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const { status, data, reload } = useAuthenticatedData(async (authClient, userId) => {
    const [profile, programme, goals, activeWorkout] = await Promise.all([
      loadViewerProfile(authClient, userId),
      ensureRealProgramme(authClient, userId),
      loadSelectedGoals(authClient, userId),
      loadActiveWorkout(authClient, userId),
    ]);
    const structure = programme?.parsedStructure ?? null;
    const history = await loadTrainingHistorySummary(
      authClient,
      userId,
      structure?.trainingDays.length ?? profile.availableTrainingDays.length,
    );
    const exerciseIds =
      structure?.sessions.flatMap((session) =>
        session.exercises.map((exercise) => exercise.exerciseId),
      ) ?? [];
    const exerciseDetails = await getExercisesByIds(authClient, exerciseIds);
    return { profile, programme, goals, history, exerciseDetails, activeWorkout };
  });

  const structure = data?.programme?.parsedStructure ?? null;
  const nextSession = structure ? nextSessionForToday(structure.sessions) : null;
  const blockedByClearance = structure?.requiresClearance === true;

  function resumeActiveWorkout() {
    if (!data?.activeWorkout) return;
    router.push({
      pathname: '/workout/[workoutId]/active',
      params: { workoutId: data.activeWorkout.id },
    });
  }

  async function handleStart(mode: WorkoutMode) {
    if (data?.activeWorkout) {
      resumeActiveWorkout();
      return;
    }
    if (!data?.programme || !nextSession || blockedByClearance || startingMode) return;
    setStartError(null);
    setStartingMode(mode);
    try {
      const result = await startWorkout(client, {
        programmeVersionId: data.programme.versionId,
        sessionIndex: nextSession.sessionIndex,
        mode,
      });
      router.push({
        pathname: '/workout/[workoutId]/overview',
        params: { workoutId: result.workoutId },
      });
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Could not start this workout.');
    } finally {
      setStartingMode(null);
    }
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Caption>{greetingWithName(greeting, data?.profile.displayName)}</Caption>
        <Heading variant="hero">What&apos;s next</Heading>
      </View>

      {status === 'loading' ? (
        <LoadingState accessibilityLabel="Loading today's session" rows={4} />
      ) : status === 'error' || !data ? (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      ) : !data.programme ? (
        <Card>
          <EmptyState
            icon="plan"
            title="No programme yet"
            description="Finish onboarding and your plan will be built from your goals, equipment and availability."
            actionLabel="Go to Plan"
            onAction={() => router.push('/(tabs)/plan')}
          />
        </Card>
      ) : !structure?.hasExercises || !nextSession ? (
        <Card style={{ gap: spacing.two }}>
          <EmptyState
            icon="alertCircle"
            title="Your programme needs attention"
            description="A real exercise session could not be built from the current settings. Review your equipment, availability and safety answers."
            actionLabel="Review equipment"
            onAction={() => router.push('/(tabs)/profile/equipment')}
          />
          {structure?.limitations.map((limitation) => (
            <Caption key={limitation} color="tertiary" style={{ flexShrink: 1 }}>
              {limitation}
            </Caption>
          ))}
        </Card>
      ) : (
        <>
          {data.activeWorkout ? (
            <Card variant="hero" elevated={false} style={{ gap: spacing.two }}>
              <View style={{ gap: spacing.one }}>
                <Caption color="brand">IN PROGRESS</Caption>
                <Heading variant="bodyEmphasis">Workout ready to resume</Heading>
                <AppText color="secondary" style={{ flexShrink: 1 }}>
                  Your completed sets are saved. Resume this session before starting another one.
                </AppText>
              </View>
              <PrimaryButton label="Resume workout" onPress={resumeActiveWorkout} />
            </Card>
          ) : null}

          {blockedByClearance ? (
            <Card style={{ gap: spacing.one }}>
              <Heading variant="bodyEmphasis">Clearance required before training</Heading>
              <AppText color="secondary" style={{ flexShrink: 1 }}>
                Your safety answers indicate that you should obtain appropriate professional
                clearance before starting this programme. The workout button remains disabled until
                that status is reviewed.
              </AppText>
            </Card>
          ) : null}

          {startError ? (
            <Card>
              <AppText color="critical" style={{ flexShrink: 1 }}>
                {startError}
              </AppText>
            </Card>
          ) : null}

          <ProgrammeSessionCard
            session={nextSession}
            exerciseDetails={data.exerciseDetails}
            maxExercises={3}
            emphasis="hero"
            onExercisePress={(exerciseId) =>
              router.push({
                pathname: '/(tabs)/plan/exercise/[exerciseId]',
                params: { exerciseId },
              })
            }
            modeSelector={
              !blockedByClearance && !data.activeWorkout ? (
                <View style={{ gap: spacing.one }}>
                  <Caption>SESSION MODE</Caption>
                  <SegmentedControl<WorkoutMode>
                    accessibilityLabel="Choose workout mode"
                    options={WORKOUT_MODES}
                    value={selectedMode}
                    onChange={setSelectedMode}
                  />
                </View>
              ) : undefined
            }
            onStart={
              blockedByClearance || data.activeWorkout ? undefined : () => handleStart(selectedMode)
            }
            starting={startingMode === selectedMode}
            startLabel={`Start ${selectedMode} session`}
          />

          {structure.limitations.length > 0 ? (
            <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
              <Heading variant="bodyEmphasis">Current programme notes</Heading>
              {structure.limitations.map((limitation) => (
                <Caption key={limitation} style={{ flexShrink: 1 }}>
                  {limitation}
                </Caption>
              ))}
            </Card>
          ) : null}

          <MomentumCard
            completedSessions={data.history.completedThisWeek}
            plannedSessions={data.history.plannedThisWeek}
          />

          <View style={{ gap: spacing.two }}>
            <SectionHeader
              title="Goal journey"
              actionLabel="See all"
              onActionPress={() => router.push('/(tabs)/progress/goal-journey')}
            />
            <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
              {data.goals.length === 0 ? (
                <Caption>No goals saved yet.</Caption>
              ) : (
                <>
                  {data.goals.map((goal) => (
                    <Caption key={goal.goalKey} style={{ flexShrink: 1 }}>
                      {goal.priority}. {goal.label}
                    </Caption>
                  ))}
                  <Caption color="tertiary" style={{ flexShrink: 1 }}>
                    {data.history.completedTotal === 0
                      ? 'Progress towards each goal appears once you have completed sessions to measure.'
                      : `Based on ${data.history.completedTotal} completed ${
                          data.history.completedTotal === 1 ? 'session' : 'sessions'
                        } so far.`}
                  </Caption>
                </>
              )}
            </Card>
          </View>
        </>
      )}
    </ScrollScreen>
  );
}
