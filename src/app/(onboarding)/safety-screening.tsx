import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  SAFETY_SCREENING_QUESTIONS,
  isCompleteSafetyScreeningAnswers,
  type SafetyScreeningAnswers,
} from '@/domain/onboarding/safety-screening';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import {
  hasHealthScreening,
  submitSafetyScreening,
} from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';
type Phase = 'form' | 'clearance_notice';

/**
 * Safety-critical, cannot be skipped (docs/MASTER_SPEC.md §8.1). The client
 * only collects raw yes/no answers — `requires_clearance`/
 * `restriction_flags` are always derived server-side
 * (`submit_safety_screening` RPC), never computed or trusted from here.
 */
export default function SafetyScreeningScreen() {
  const router = useRouter();
  const { spacing, colors, radius } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [alreadyScreened, setAlreadyScreened] = useState(false);
  const [answers, setAnswers] = useState<Partial<SafetyScreeningAnswers>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('form');

  function load() {
    if (!userId) return;
    hasHealthScreening(client, userId)
      .then((exists) => {
        setAlreadyScreened(exists);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }

  function retry() {
    setStatus('loading');
    load();
  }

  useEffect(load, [client, userId]);

  function setAnswer(key: keyof SafetyScreeningAnswers, value: boolean) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  const complete = isCompleteSafetyScreeningAnswers(answers);

  async function handleNext() {
    if (!userId || submitting) return;

    // Re-screening isn't required if already complete this session/on
    // resume — proceeding is safe either way, but avoid an unnecessary
    // duplicate immutable row when nothing changed.
    if (alreadyScreened && !complete) {
      router.push('/(onboarding)/baseline-measurements');
      return;
    }
    if (!complete) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitSafetyScreening(client, answers as SafetyScreeningAnswers);
      if (result.requiresClearance) {
        setPhase('clearance_notice');
      } else {
        router.push('/(onboarding)/baseline-measurements');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <OnboardingScaffold
        stepIndex={9}
        title="A few safety questions"
        onNext={() => {}}
        nextDisabled
      >
        <LoadingState accessibilityLabel="Loading" rows={4} />
      </OnboardingScaffold>
    );
  }

  if (status === 'error') {
    return (
      <OnboardingScaffold
        stepIndex={9}
        title="A few safety questions"
        onNext={() => {}}
        nextDisabled
      >
        <ErrorState onRetry={retry} />
      </OnboardingScaffold>
    );
  }

  if (phase === 'clearance_notice') {
    return (
      <OnboardingScaffold
        stepIndex={9}
        title="Thanks for letting us know"
        onNext={() => router.push('/(onboarding)/baseline-measurements')}
        nextLabel="Continue"
      >
        <View style={{ gap: spacing.three }}>
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
              Based on your answers, we recommend confirming with a qualified professional before
              starting certain training content. We&apos;ll still build a starting structure for you
              — exercise selection will respect this once that&apos;s confirmed.
            </AppText>
          </View>
          <Caption>
            This isn&apos;t a diagnosis — Murphy Method is fitness and wellness software, not a
            medical service.
          </Caption>
        </View>
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={9}
      title="A few safety questions"
      description="This helps us build a programme that's appropriate for you — it can't be skipped. Answer honestly; if you're ever unsure, answer yes."
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={!complete && !alreadyScreened}
      nextLoading={submitting}
    >
      <View style={{ gap: spacing.three }}>
        {submitError ? <AppText color="critical">{submitError}</AppText> : null}
        <Caption>
          Murphy Method is fitness and wellness software — this is not a medical diagnosis. If
          anything here feels uncertain, a qualified professional is always the safer call.
        </Caption>

        {SAFETY_SCREENING_QUESTIONS.map((question) => (
          <Card key={question.key} style={{ gap: spacing.two }}>
            <Heading variant="section">{question.prompt}</Heading>
            {question.helpText ? <Caption>{question.helpText}</Caption> : null}
            <SegmentedControl
              accessibilityLabel={question.prompt}
              value={
                answers[question.key] === undefined ? '' : answers[question.key] ? 'yes' : 'no'
              }
              onChange={(value) => setAnswer(question.key, value === 'yes')}
              options={[
                { value: 'no', label: 'No' },
                { value: 'yes', label: 'Yes' },
              ]}
            />
          </Card>
        ))}
      </View>
    </OnboardingScaffold>
  );
}
