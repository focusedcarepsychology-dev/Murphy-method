import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton, TertiaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CoachInsightCard } from '@/components/ui/coach-insight-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GoalProgressCard } from '@/components/ui/goal-progress-card';
import { LoadingState } from '@/components/ui/loading-state';
import { MomentumCard } from '@/components/ui/momentum-card';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  previewCoachInsight,
  previewConsistencyPercent,
  previewGoals,
  previewMomentum,
  previewTodayWorkout,
  previewUser,
} from '@/dev/previewData';
import { useGreeting } from '@/hooks/use-greeting';
import { useTheme } from '@/hooks/use-theme';

const PREVIEW_WORKOUT_ID = 'preview-workout-1';

type TodayDevState = 'scheduled' | 'rest' | 'completed' | 'noProgramme' | 'loading' | 'error';

export default function TodayScreen() {
  const router = useRouter();
  const greeting = useGreeting();
  const { colors, spacing } = useTheme();
  const [devState, setDevState] = useState<TodayDevState>('scheduled');
  const [devOffline, setDevOffline] = useState(false);

  function startWorkout(mode: 'full' | 'quick' | 'minimum') {
    router.push({
      pathname: '/workout/[workoutId]/overview',
      params: { workoutId: PREVIEW_WORKOUT_ID, mode },
    });
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Caption>
          {greeting}, {previewUser.firstName}
        </Caption>
        <Heading variant="hero">What&apos;s next</Heading>
      </View>

      {devOffline ? <OfflineBanner /> : null}

      {devState === 'loading' ? (
        <LoadingState accessibilityLabel="Loading today's workout" />
      ) : devState === 'error' ? (
        <Card>
          <ErrorState onRetry={() => setDevState('scheduled')} />
        </Card>
      ) : devState === 'noProgramme' ? (
        <Card>
          <EmptyState
            icon="plan"
            title="No programme yet"
            description="Finish onboarding to get a plan built around your goals."
            actionLabel="Go to Plan"
            onAction={() => router.push('/(tabs)/plan')}
          />
        </Card>
      ) : devState === 'rest' ? (
        <Card>
          <EmptyState
            icon="today"
            title="Rest day"
            description="Nothing scheduled today. Recovery is part of the plan — but you can train anyway if you're feeling it."
            actionLabel="Train anyway"
            onAction={() => router.push('/(tabs)/plan')}
          />
        </Card>
      ) : devState === 'completed' ? (
        <Card>
          <EmptyState
            icon="checkCircle"
            title="Workout complete"
            description="Nice work — you finished Upper Body A earlier today."
            actionLabel="View summary"
            onAction={() =>
              router.push({
                pathname: '/workout/[workoutId]/summary',
                params: { workoutId: PREVIEW_WORKOUT_ID },
              })
            }
          />
        </Card>
      ) : (
        <Card style={{ gap: spacing.three, backgroundColor: colors.brand.primary }}>
          <Caption style={{ color: colors.brand.onPrimary, opacity: 0.85 }}>TODAY</Caption>
          <Heading variant="title" style={{ color: colors.brand.onPrimary }}>
            {previewTodayWorkout.title}
          </Heading>
          <AppText style={{ color: colors.brand.onPrimary, opacity: 0.9 }}>
            {previewTodayWorkout.durationMinutes} min · {previewTodayWorkout.exerciseCount}{' '}
            exercises
          </AppText>
          <PrimaryButton
            label="Start Workout"
            size="large"
            onPress={() => startWorkout('full')}
            onColor
          />
          <View style={{ flexDirection: 'row', gap: spacing.two }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label={`Quick · ${previewTodayWorkout.quickDurationMinutes} min`}
                onPress={() => startWorkout('quick')}
                onColor
              />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label={`Minimum · ${previewTodayWorkout.minimumDurationMinutes} min`}
                onPress={() => startWorkout('minimum')}
                onColor
              />
            </View>
          </View>
        </Card>
      )}

      <MomentumCard
        completedSessions={previewMomentum.completedSessions}
        plannedSessions={previewMomentum.plannedSessions}
      />

      <CoachInsightCard message={previewCoachInsight} />

      <View style={{ gap: spacing.two }}>
        <SectionHeader
          title="Goal journey"
          actionLabel="See all"
          onActionPress={() => router.push('/(tabs)/progress/goal-journey')}
        />
        <Card style={{ gap: spacing.one }}>
          {previewGoals.map((goal) => (
            <GoalProgressCard
              key={goal.label}
              goalLabel={goal.label}
              trajectory={goal.trajectory}
              icon={goal.icon}
            />
          ))}
          <GoalProgressCard goalLabel="Consistency" trajectory="progressing" icon="checkCircle" />
          <Caption>
            {previewConsistencyPercent}% of planned sessions completed, last 8 weeks
          </Caption>
        </Card>
      </View>

      {__DEV__ ? (
        <Card style={{ gap: spacing.two, borderStyle: 'dashed' }}>
          <Caption color="tertiary">DEV PREVIEW CONTROLS — Today states</Caption>
          <SegmentedControl
            accessibilityLabel="Today screen state"
            value={devState}
            onChange={(value) => setDevState(value as TodayDevState)}
            options={[
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'rest', label: 'Rest' },
              { value: 'completed', label: 'Done' },
              { value: 'noProgramme', label: 'None' },
            ]}
          />
          <SegmentedControl
            accessibilityLabel="Today screen state, loading and error"
            value={devState}
            onChange={(value) => setDevState(value as TodayDevState)}
            options={[
              { value: 'loading', label: 'Loading' },
              { value: 'error', label: 'Error' },
            ]}
          />
          <TertiaryButton
            label={devOffline ? 'Simulate: online' : 'Simulate: offline'}
            onPress={() => setDevOffline((current) => !current)}
          />
        </Card>
      ) : null}
    </ScrollScreen>
  );
}
