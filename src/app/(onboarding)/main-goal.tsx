import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SelectionCard } from '@/components/ui/selection-card';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useTheme } from '@/hooks/use-theme';
import {
  listGoals,
  loadSelectedGoals,
  replaceUserGoalPriorities,
  type GoalOption,
} from '@/services/onboarding/onboarding-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

/**
 * Multi-select from the fixed goal list (docs/MASTER_SPEC.md §7). Saves
 * immediately on Next, in selection order, via the same
 * `set_user_goal_priorities` RPC Goal Prioritisation refines — so data
 * survives even if the user abandons before reaching that screen.
 */
export default function MainGoalScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    if (!userId) return;
    Promise.all([listGoals(client), loadSelectedGoals(client, userId)])
      .then(([goalOptions, selected]) => {
        setGoals(goalOptions);
        setSelectedKeys(selected.map((goal) => goal.goalKey));
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }

  function retry() {
    setStatus('loading');
    load();
  }

  useEffect(load, [client, userId]);

  function toggle(key: string) {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  async function handleNext() {
    if (selectedKeys.length === 0 || !userId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await replaceUserGoalPriorities(client, selectedKeys);
      router.push('/(onboarding)/goal-prioritisation');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <OnboardingScaffold
        stepIndex={2}
        title="What would you like to achieve?"
        onNext={() => {}}
        nextDisabled
      >
        <LoadingState accessibilityLabel="Loading goals" rows={5} />
      </OnboardingScaffold>
    );
  }

  if (status === 'error') {
    return (
      <OnboardingScaffold
        stepIndex={2}
        title="What would you like to achieve?"
        onNext={() => {}}
        nextDisabled
      >
        <ErrorState onRetry={retry} />
      </OnboardingScaffold>
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={2}
      title="What would you like to achieve?"
      description="Select everything that applies — you'll prioritise them next."
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={selectedKeys.length === 0}
      nextLoading={submitting}
    >
      <View style={{ gap: spacing.two }}>
        {submitError ? <AppText color="critical">{submitError}</AppText> : null}
        {goals.map((goal) => (
          <SelectionCard
            key={goal.id}
            label={goal.label}
            description={goal.description ?? undefined}
            selected={selectedKeys.includes(goal.key)}
            onPress={() => toggle(goal.key)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}
