import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

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
  const { width } = useWindowDimensions();
  const { client, userId } = useAuthenticatedClient();
  const narrow = width < 430;

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
    setOrder((current) => current.filter((_, itemIndex) => itemIndex !== index));
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
        {submitError ? (
          <AppText color="critical" style={{ flexShrink: 1 }}>
            {submitError}
          </AppText>
        ) : null}
        {order.length === 0 ? (
          <AppText color="secondary" style={{ flexShrink: 1 }}>
            No goals selected. Go back and choose at least one to continue.
          </AppText>
        ) : null}
        {order.map((goal, index) => (
          <Card
            key={goal.goalKey}
            style={{
              gap: spacing.two,
              flexDirection: narrow ? 'column' : 'row',
              alignItems: narrow ? 'stretch' : 'center',
            }}
          >
            <View
              style={{
                flex: 1,
                minWidth: 0,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.three,
              }}
            >
              <Caption accessibilityLabel={`Priority ${index + 1}`}>{index + 1}</Caption>
              <AppText variant="bodyEmphasis" style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
                {goal.label}
              </AppText>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: narrow ? 'flex-end' : 'flex-start',
                gap: spacing.one,
              }}
            >
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
            </View>
          </Card>
        ))}
      </View>
    </OnboardingScaffold>
  );
}
