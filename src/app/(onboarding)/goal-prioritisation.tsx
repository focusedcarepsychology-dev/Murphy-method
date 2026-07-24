import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText, Caption } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import {
  loadSelectedGoals,
  replaceUserGoalPriorities,
} from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';
type GoalRow = { goalKey: string; label: string };

export default function GoalPrioritisationScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [order, setOrder] = useState<GoalRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    if (!userId) return;
    loadSelectedGoals(client, userId)
      .then((selected) => {
        setOrder(selected.map((goal) => ({ goalKey: goal.goalKey, label: goal.label })));
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }

  function retry() {
    setStatus('loading');
    load();
  }

  useEffect(load, [client, userId]);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(index: number) {
    setOrder((current) => current.filter((_, i) => i !== index));
  }

  async function handleNext() {
    if (order.length === 0 || !userId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await replaceUserGoalPriorities(
        client,
        order.map((row) => row.goalKey),
      );
      router.push('/(onboarding)/body-goal-map');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <OnboardingScaffold
        stepIndex={3}
        title="Prioritise your goals"
        onNext={() => {}}
        nextDisabled
      >
        <LoadingState accessibilityLabel="Loading your goals" rows={3} />
      </OnboardingScaffold>
    );
  }

  if (status === 'error') {
    return (
      <OnboardingScaffold
        stepIndex={3}
        title="Prioritise your goals"
        onNext={() => {}}
        nextDisabled
      >
        <ErrorState onRetry={retry} />
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={3}
      title="Prioritise your goals"
      description="Use the arrows to reorder. Your top goal gets the most emphasis in your plan."
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={order.length === 0}
      nextLoading={submitting}
    >
      <View style={{ gap: spacing.two }}>
        {submitError ? <AppText color="critical">{submitError}</AppText> : null}
        {order.length === 0 ? (
          <AppText color="secondary">
            No goals selected. Go back and choose at least one to continue.
          </AppText>
        ) : null}
        {order.map((goal, index) => (
          <Card
            key={goal.goalKey}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}
          >
            <Caption>{index + 1}</Caption>
            <AppText variant="bodyEmphasis" style={{ flex: 1 }}>
              {goal.label}
            </AppText>
            <IconButton
              icon="chevronUp"
              accessibilityLabel={`Move ${goal.label} up`}
              onPress={() => move(index, -1)}
              disabled={index === 0}
            />
            <IconButton
              icon="chevronDown"
              accessibilityLabel={`Move ${goal.label} down`}
              onPress={() => move(index, 1)}
              disabled={index === order.length - 1}
            />
            <IconButton
              icon="trash"
              accessibilityLabel={`Remove ${goal.label}`}
              onPress={() => remove(index)}
              disabled={order.length === 1}
            />
          </Card>
        ))}
      </View>
    </OnboardingScaffold>
  );
}
