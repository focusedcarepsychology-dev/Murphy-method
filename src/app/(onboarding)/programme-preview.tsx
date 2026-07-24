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
 * Calls `completeOnboarding` (`complete_onboarding` RPC) on mount —
 * generation is synchronous to completion (docs/SCREEN_SPECIFICATIONS.md
 * §2 "Programme Preview"), so this screen's loading state is meaningful,
 * not decorative. Safe to re-run (idempotent): navigating back here and
 * forward again does not create a second programme.
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
        onNext={() => {}}
        nextDisabled
      >
        <View style={{ gap: spacing.three }}>
          <AppText color="secondary">
            Putting together your starting structure from your goals, equipment, and safety
            information — this only takes a moment.
          </AppText>
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
      title="Your programme is ready"
      description="A preview of your starting structure — exercise selection builds from here."
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
              borderRadius: radius.lg,
              backgroundColor: colors.status.warningSubtle,
            }}
          >
            <Icon name="info" color={colors.status.warning} size={22} />
            <AppText color="secondary" style={{ flex: 1 }}>
              Based on your safety screening, confirm with a qualified professional before starting
              certain training content.
            </AppText>
          </View>
        ) : null}

        <Card style={{ gap: spacing.two }}>
          <Heading variant="section">Weekly structure</Heading>
          <AppText>
            {weeklyDays.length > 0 ? weeklyDays.map(weekdayLabel).join(', ') : 'To be scheduled'}
          </AppText>
          <Caption>
            {sessionMinutes
              ? `About ${sessionMinutes} minutes per session`
              : 'Session length to be confirmed'}
          </Caption>
        </Card>

        {goalPriorities.length > 0 ? (
          <Card style={{ gap: spacing.two }}>
            <Heading variant="section">Your priorities</Heading>
            {goalPriorities.map((goal) => (
              <AppText key={goal.priority}>
                {goal.priority}. {goal.label}
              </AppText>
            ))}
          </Card>
        ) : null}

        <AppText color="secondary">{summary}</AppText>
      </View>
    </OnboardingScaffold>
  );
}
