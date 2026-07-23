import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { SelectionCard } from '@/components/ui/selection-card';
import { useTheme } from '@/hooks/use-theme';
import { previewGoalOptions } from '@/dev/previewData';

export default function MainGoalScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <OnboardingScaffold
      stepIndex={2}
      title="What would you like to achieve?"
      description="Select everything that applies — you'll prioritise them next."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/goal-prioritisation')}
      nextDisabled={selected.length === 0}
    >
      <View style={{ gap: spacing.two }}>
        {previewGoalOptions.map((option) => (
          <SelectionCard
            key={option.id}
            label={option.label}
            icon={option.icon}
            selected={selected.includes(option.id)}
            onPress={() => toggle(option.id)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}
