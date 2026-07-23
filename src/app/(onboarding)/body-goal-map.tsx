import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BodyMap } from '@/components/onboarding/body-map';
import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { Caption } from '@/components/ui/app-text';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectionCard } from '@/components/ui/selection-card';
import { previewBodyAreas } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

export default function BodyGoalMapScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  const areasForView = previewBodyAreas.filter((area) => area.view === view);

  return (
    <OnboardingScaffold
      stepIndex={4}
      title="Where would you like to focus?"
      description="Optional — body-area selection guides training emphasis within your plan. It does not target fat loss in a specific area, which isn't physiologically possible."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/training-experience')}
    >
      <View style={{ gap: spacing.four }}>
        <SegmentedControl
          accessibilityLabel="Body view"
          value={view}
          onChange={(value) => setView(value as 'front' | 'back')}
          options={[
            { value: 'front', label: 'Front' },
            { value: 'back', label: 'Back' },
          ]}
        />

        <BodyMap view={view} areas={previewBodyAreas} selectedIds={selectedIds} onToggle={toggle} />

        <View style={{ gap: spacing.two }}>
          <Caption>OR SELECT FROM A LIST</Caption>
          {areasForView.map((area) => (
            <SelectionCard
              key={area.id}
              label={area.label}
              selected={selectedIds.includes(area.id)}
              onPress={() => toggle(area.id)}
            />
          ))}
        </View>
      </View>
    </OnboardingScaffold>
  );
}
