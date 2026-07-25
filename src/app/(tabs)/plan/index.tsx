import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { ProgrammeSessionCard } from '@/components/programme/programme-session-card';
import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card, InteractiveCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import type { ProgrammeSession } from '@/domain/programme/structure';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { getExercisesByIds } from '@/services/exercises/exercise-repository';
import { ensureRealProgramme } from '@/services/programme/programme-repository';
import { loadViewerProfile } from '@/services/training/training-repository';
import { loadActiveWorkout } from '@/services/workouts/active-workout-repository';
import { startWorkout } from '@/services/workouts/workout-repository';

function WeeklyProgrammeStrip({ sessions }: { sessions: ProgrammeSession[] }) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.two }}>
      {sessions.map((session, index) => (
        <Card
          key={session.key}
          variant="quiet"
          elevated={false}
          style={{
            flexGrow: 1,
            flexBasis: '30%',
            minWidth: 96,
            padding: spacing.three,
            gap: spacing.one,
          }}
        >
          <Caption color="brand">
            {(session.dayOfWeek ?? `Day ${index + 1}`).slice(0, 3).toUpperCase()}
          </Caption>
          <AppText variant="supportingEmphasis" numberOfLines={2} style={{ flexShrink: 1 }}>
            {session.name}
          </AppText>
          <Caption color="tertiary">
            {session.estimatedMinutes ? `${session.estimatedMinutes} min` : 'Flexible'}
          </Caption>
        </Card>
      ))}
    </View>
  );
}

export default function PlanScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { client } = useAuthenticatedClient();
  const [startingSession, setStartingSession] = useState<number | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const { status, data, reload } = useAuthenticatedData(async (authClient, userId) => {
    const [profile, programme, activeWorkout] = await Promise.all([
      loadViewerProfile(authClient, userId),
      ensureRealProgramme(authClient, userId),
      loadActiveWorkout(authClient, userId),
    ]);
    const exerciseIds =
      programme?.parsedStructure.sessions.flatMap((session) =>
        session.exercises.map((exercise) => exercise.exerciseId),
      ) ?? [];
    const exerciseDetails = await getExercisesByIds(authClient, exerciseIds);
    return { profile, programme, exerciseDetails, activeWorkout };
  });

  const structure = data?.programme?.parsedStructure ?? null;
  const daysPerWeek =
    structure?.trainingDays.length ?? data?.profile.availableTrainingDays.length ?? 0;
  const blockedByClearance = structure?.requiresClearance === true;

  function resumeActiveWorkout() {
    if (!data?.activeWorkout) return;
    router.push({
      pathname: '/workout/[workoutId]/active',
      params: { workoutId: data.activeWorkout.id },
    });
  }

  async function handleStart(sessionIndex: number) {
    if (data?.activeWorkout) {
      resumeActiveWorkout();
      return;
    }
    if (!data?.programme || blockedByClearance || startingSession !== null) return;
    setStartError(null);
    setStartingSession(sessionIndex);
    try {
      const result = await startWorkout(client, {
        programmeVersionId: data.programme.versionId,
        sessionIndex,
        mode: 'full',
      });
      router.push({
        pathname: '/workout/[workoutId]/overview',
        params: { workoutId: result.workoutId },
      });
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Could not start this workout.');
    } finally {
      setStartingSession(null);
    }
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">My Plan</Heading>
        {status === 'ready' && daysPerWeek > 0 ? (
          <Caption>{daysPerWeek} DAYS / WEEK</Caption>
        ) : null}
      </View>

      {status === 'loading' ? (
        <LoadingState accessibilityLabel="Loading your plan" rows={5} />
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
          />
        </Card>
      ) : !structure?.hasExercises ? (
        <Card style={{ gap: spacing.two }}>
          <EmptyState
            icon="alertCircle"
            title="No eligible sessions could be built"
            description="Review your equipment, training availability and safety answers. The app will never substitute an exercise that your settings do not support."
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
          <View style={{ gap: spacing.two }}>
            <SectionHeader
              title="This week"
              actionLabel="Schedule"
              onActionPress={() => router.push('/(tabs)/plan/schedule')}
            />
            <WeeklyProgrammeStrip sessions={structure.sessions} />
          </View>

          {data.activeWorkout ? (
            <Card variant="hero" elevated={false} style={{ gap: spacing.two }}>
              <View style={{ gap: spacing.one }}>
                <Caption color="brand">IN PROGRESS</Caption>
                <Heading variant="bodyEmphasis">Continue your current workout</Heading>
                <AppText color="secondary" style={{ flexShrink: 1 }}>
                  Resume your {data.activeWorkout.mode} session before starting another workout.
                </AppText>
              </View>
              <PrimaryButton label="Resume workout" onPress={resumeActiveWorkout} />
            </Card>
          ) : null}

          {blockedByClearance ? (
            <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
              <Heading variant="bodyEmphasis">Training is paused pending clearance</Heading>
              <AppText color="secondary" style={{ flexShrink: 1 }}>
                The sessions remain visible so you can understand the plan, but they cannot be
                started until the clearance requirement is reviewed.
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

          <View style={{ gap: spacing.four }}>
            {structure.sessions.map((session) => (
              <ProgrammeSessionCard
                key={session.key}
                session={session}
                exerciseDetails={data.exerciseDetails}
                maxExercises={2}
                onExercisePress={(exerciseId) =>
                  router.push({
                    pathname: '/(tabs)/plan/exercise/[exerciseId]',
                    params: { exerciseId },
                  })
                }
                onStart={
                  blockedByClearance || data.activeWorkout
                    ? undefined
                    : () => handleStart(session.sessionIndex)
                }
                starting={startingSession === session.sessionIndex}
                startLabel="Start session"
              />
            ))}
          </View>

          {structure.limitations.length > 0 ? (
            <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
              <Heading variant="bodyEmphasis">Programme notes</Heading>
              {structure.limitations.map((limitation) => (
                <Caption key={limitation} style={{ flexShrink: 1 }}>
                  {limitation}
                </Caption>
              ))}
            </Card>
          ) : null}
        </>
      )}

      <View style={{ gap: spacing.two }}>
        <SectionHeader title="Programme tools" />
        <InteractiveCard
          variant="quiet"
          accessibilityLabel="Why this plan?"
          onPress={() =>
            router.push({
              pathname: '/(tabs)/plan/why-changed/[decisionId]',
              params: { decisionId: 'current' },
            })
          }
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}>
            <Icon name="help" color={colors.text.secondary} size={20} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Heading variant="bodyEmphasis" style={{ flexShrink: 1 }}>
                Why this plan?
              </Heading>
              <Caption color="tertiary">See how your answers shaped the programme.</Caption>
            </View>
          </View>
        </InteractiveCard>
        <InteractiveCard
          variant="quiet"
          accessibilityLabel="Programme change history"
          onPress={() => router.push('/(tabs)/plan/history')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}>
            <Icon name="history" color={colors.text.secondary} size={20} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Heading variant="bodyEmphasis" style={{ flexShrink: 1 }}>
                Programme history
              </Heading>
              <Caption color="tertiary">Review previous versions without losing progress.</Caption>
            </View>
          </View>
        </InteractiveCard>
        <InteractiveCard
          variant="quiet"
          accessibilityLabel="Reset or restructure plan"
          onPress={() => router.push('/(tabs)/plan/reset')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}>
            <Icon name="sync" color={colors.text.secondary} size={20} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Heading variant="bodyEmphasis" style={{ flexShrink: 1 }}>
                Restructure plan
              </Heading>
              <Caption color="tertiary">Build a new version from your current settings.</Caption>
            </View>
          </View>
        </InteractiveCard>
      </View>
    </ScrollScreen>
  );
}
