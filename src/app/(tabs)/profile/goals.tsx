import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { IconButton, PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SelectionCard } from '@/components/ui/selection-card';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import {
  listGoals,
  loadSelectedGoals,
  replaceUserGoalPriorities,
} from '@/services/onboarding/onboarding-repository';

type GoalDraft = { key: string; label: string };

export default function ProfileGoalsScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { client } = useAuthenticatedClient();
  const { status, data, reload } = useAuthenticatedData(async (c, id) => {
    const [options, selected] = await Promise.all([listGoals(c), loadSelectedGoals(c, id)]);
    return {
      options,
      selected: selected.map((goal) => ({ key: goal.goalKey, label: goal.label })),
    };
  });
  const [draft, setDraft] = useState<GoalDraft[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = draft ?? data?.selected ?? [];
  const selectedKeys = new Set(selected.map((goal) => goal.key));

  function toggle(key: string, label: string) {
    setDraft((currentDraft) => {
      const current = currentDraft ?? data?.selected ?? [];
      return current.some((goal) => goal.key === key)
        ? current.filter((goal) => goal.key !== key)
        : [...current, { key, label }];
    });
    setSaved(false);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(next);
    setSaved(false);
  }

  async function save() {
    if (saving || selected.length === 0) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await replaceUserGoalPriorities(
        client,
        selected.map((goal) => goal.key),
      );
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save goals.');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading your goals" rows={5} />
      </ScrollScreen>
    );
  }
  if (status === 'error' || !data) {
    return (
      <ScrollScreen>
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Goals</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Select what matters now, then put the most important goal first.
        </AppText>
      </View>

      <View style={{ gap: spacing.two }}>
        <SectionHeader title="Choose goals" />
        {data.options.map((option) => (
          <SelectionCard
            key={option.key}
            label={option.label}
            description={option.description ?? undefined}
            selected={selectedKeys.has(option.key)}
            onPress={() => toggle(option.key, option.label)}
          />
        ))}
      </View>

      <View style={{ gap: spacing.two }}>
        <SectionHeader title="Priority order" />
        {selected.length === 0 ? (
          <Card>
            <AppText color="secondary">Choose at least one goal to save.</AppText>
          </Card>
        ) : (
          selected.map((goal, index) => (
            <Card
              key={goal.key}
              variant="quiet"
              elevated={false}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.two }}
            >
              <Caption accessibilityLabel={`Priority ${index + 1}`}>{index + 1}</Caption>
              <AppText variant="bodyEmphasis" style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
                {goal.label}
              </AppText>
              <IconButton
                icon="chevronUp"
                accessibilityLabel={`Move ${goal.label} up`}
                disabled={index === 0}
                onPress={() => move(index, -1)}
              />
              <IconButton
                icon="chevronDown"
                accessibilityLabel={`Move ${goal.label} down`}
                disabled={index === selected.length - 1}
                onPress={() => move(index, 1)}
              />
            </Card>
          ))
        )}
      </View>

      <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
        <AppText variant="bodyEmphasis">No silent plan changes</AppText>
        <Caption color="tertiary" style={{ flexShrink: 1 }}>
          Saving goals updates your profile. Your current programme remains unchanged until you
          explicitly create a new version.
        </Caption>
        <SecondaryButton
          label="Open programme restructure"
          fullWidth={false}
          onPress={() => router.push('/(tabs)/plan/reset')}
        />
      </Card>

      {error ? <AppText color="critical">{error}</AppText> : null}
      {saved ? <Caption color="positive">Goal priorities saved.</Caption> : null}
      <PrimaryButton
        label="Save goals"
        loading={saving}
        disabled={selected.length === 0}
        onPress={save}
      />
    </ScrollScreen>
  );
}
