import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import { WEEKDAY_OPTIONS } from '@/domain/onboarding/types';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import {
  completeOnboarding,
  type CompleteOnboardingResult,
} from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

function weekdayLabel(key: string): string {
  return WEEKDAY_OPTIONS.find((day) => day.key === key)?.label ?? key;
}

/**
 * Calls `completeOnboarding` (`complete_onboarding` RPC) on mount. Generation
 * is synchronous and idempotent, so returning to this screen cannot create a
 * competing programme.
 */
export default function ProgrammePreviewScreen() {
  const router = useRouter();
  const { spacing, colors, radius } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [result, setResult] = useState<CompleteOnboardingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function generate() {
    if (!userId) return;
    completeOnboarding(client)
      .then((value) => {
        setResult(value);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : 'Something went wrong.');
        setStatus('error');
      });
  }

  function retry() {
    setStatus('loading');
    setErrorMessage(null);
    generate();
  }

  useEffect(generate, [client, userId]);

  if (status === 'loading') {
    return (
      <OnboardingScaffold
        stepIndex={14}
        title="Building your programme"
        description="Your answers are being turned into a real starting plan."
        onNext={() => {}}
        nextDisabled
      >
        <View style={{ gap: spacing.three }}>
          <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
            <Caption>WHAT THE ENGINE IS USING</Caption>
            <AppText color="secondary" style={{ flexShrink: 1 }}>
              Goals, available equipment, training days, session length, experience and safety
              information.
            </AppText>
          </Card>
          <LoadingState accessibilityLabel="Generating your programme" rows={3} />
        </View>
      </OnboardingScaffold>
    );
  }

  if (status === 'error') {
    return (
      <OnboardingScaffold
        stepIndex={14}
        title="Building your programme"
        onNext={() => {}}
        nextDisabled
      >
        <ErrorState
          title="Couldn't build your programme"
          description={errorMessage ?? undefined}
          onRetry={retry}
        />
      </OnboardingScaffold>
    );
  }

  const structure = result!.programme.structure;
  const weeklyDays = (structure.weeklyFrequencyDays as string[] | undefined) ?? [];
  const sessionMinutes = structure.sessionDurationMinutes as number | undefined;
  const requiresClearance = structure.requiresClearance === true;
  const summary = (structure.summary as string | undefined) ?? '';
  const goalPriorities =
    (structure.goalPriorities as { label: string; priority: number }[] | undefined) ?? [];

  return (
    <OnboardingScaffold
      stepIndex={14}
      title="Your starting plan"
      description="Review how your answers shaped the programme before you begin."
      nextLabel="Start Training"
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/complete')}
    >
      <View style={{ gap: spacing.three }}>
        {requiresClearance ? (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.three,
              padding: spacing.three,
              borderRadius: radius.md,
              backgroundColor: colors.status.warningSubtle,
            }}
          >
            <Icon name="info" color={colors.status.warning} size={22} />
            <AppText color="secondary" style={{ flex: 1 }}>
              Your safety answers indicate that appropriate professional clearance is needed before
              starting some training content. The programme stays visible but protected.
            </AppText>
          </View>
        ) : null}

        <Card variant="hero" elevated={false} style={{ gap: spacing.three }}>
          <Caption color="brand">WEEKLY STRUCTURE</Caption>
          <Heading variant="section" style={{ flexShrink: 1 }}>
            {weeklyDays.length > 0
              ? `${weeklyDays.length} ${weeklyDays.length === 1 ? 'day' : 'days'} each week`
              : 'Flexible weekly schedule'}
          </Heading>
          <AppText style={{ flexShrink: 1 }}>
            {weeklyDays.length > 0 ? weeklyDays.map(weekdayLabel).join(' · ') : 'To be scheduled'}
          </AppText>
          <Caption color="tertiary">
            {sessionMinutes
              ? `About ${sessionMinutes} minutes per session`
              : 'Session length to be confirmed'}
          </Caption>
        </Card>

        {goalPriorities.length > 0 ? (
          <Card variant="quiet" elevated={false} style={{ gap: spacing.two }}>
            <Caption>YOUR PRIORITIES</Caption>
            {goalPriorities.map((goal) => (
              <View
                key={goal.priority}
                style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.two }}
              >
                <Caption color="brand">{goal.priority}</Caption>
                <AppText style={{ flex: 1, flexShrink: 1 }}>{goal.label}</AppText>
              </View>
            ))}
          </Card>
        ) : null}

        <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
          <Caption>WHY IT LOOKS THIS WAY</Caption>
          <AppText color="secondary" style={{ flexShrink: 1 }}>
            {summary ||
              'Exercise selection is filtered by your equipment and safety answers, then balanced around your priorities and available time.'}
          </AppText>
        </Card>

        <Caption color="tertiary" style={{ flexShrink: 1 }}>
          You can review individual exercise explanations and restructure the programme later
          without deleting your history.
        </Caption>
      </View>
    </OnboardingScaffold>
  );
}
