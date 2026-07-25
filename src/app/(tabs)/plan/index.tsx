import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { ProgrammeSessionCard } from '@/components/programme/programme-session-card';
import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { Card, InteractiveCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { getExercisesByIds } from '@/services/exercises/exercise-repository';
import { ensureRealProgramme } from '@/services/programme/programme-repository';
import { loadViewerProfile } from '@/services/training/training-repository';
import { startWorkout } from '@/services/workouts/workout-repository';

export default function PlanScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { client } = useAuthenticatedClient();
  const [startingSession, setStartingSession] = useState<number | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const { status, data, reload } = useAuthenticatedData(async (authClient, userId) => {
    const [profile, programme] = await Promise.all([
      loadViewerProfile(authClient, userId),
      ensureRealProgramme(authClient, userId),
    ]);
    const exerciseIds =
      programme?.parsedStructure.sessions.flatMap((session) =>
        session.exercises.map((exercise) => exercise.exerciseId),
      ) ?? [];
    const exerciseDetails = await getExercisesByIds(authClient, exerciseIds);
    return { profile, programme, exerciseDetails };
  });

  const structure = data?.programme?.parsedStructure ?? null;
  const daysPerWeek = structure?.trainingDays.length ?? data?.profile.availableTrainingDays.length ?? 0;
  const blockedByClearance = structure?.requiresClearance === true;

  async function handleStart(sessionIndex: number) {
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
          {blockedByClearance ? (
            <Card style={{ gap: spacing.one }}>
              <Heading variant="bodyEmphasis">Training is paused pending clearance</Heading>
              <AppText color="secondary" style={{ flexShrink: 1 }}>
                The sessions remain visible so you can understand the plan, but they cannot be started
                until the clearance requirement is reviewed.
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
                onExercisePress={(exerciseId) =>
                  router.push({
                    pathname: '/(tabs)/plan/exercise/[exerciseId]',
                    params: { exerciseId },
                  })
                }
                onStart={blockedByClearance ? undefined : () => handleStart(session.sessionIndex)}
                starting={startingSession === session.sessionIndex}
              />
            ))}
          </View>

          {structure.limitations.length > 0 ? (
            <Card style={{ gap: spacing.one }}>
              <Heading variant="bodyEmphasis">Current limitations</Heading>
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
        <SectionHeader
          title="More"
          actionLabel="Weekly schedule"
          onActionPress={() => router.push('/(tabs)/plan/schedule')}
        />
        <InteractiveCard
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
            <Heading variant="bodyEmphasis" style={{ flexShrink: 1 }}>
              Why this plan?
            </Heading>
          </View>
        </InteractiveCard>
        <InteractiveCard
          accessibilityLabel="Programme change history"
          onPress={() => router.push('/(tabs)/plan/history')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}>
            <Icon name="history" color={colors.text.secondary} size={20} />
            <Heading variant="bodyEmphasis" style={{ flexShrink: 1 }}>
              Programme history
            </Heading>
          </View>
        </InteractiveCard>
        <InteractiveCard
          accessibilityLabel="Reset or restructure plan"
          onPress={() => router.push('/(tabs)/plan/reset')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}>
            <Icon name="sync" color={colors.text.secondary} size={20} />
            <Heading variant="bodyEmphasis" style={{ flexShrink: 1 }}>
              Reset / restructure plan
            </Heading>
          </View>
        </InteractiveCard>
      </View>
    </ScrollScreen>
  );
}
