import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText, Caption } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

const initialOrder = ['Build muscle', 'Get stronger', 'Become more consistent'];

export default function GoalPrioritisationScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const [order, setOrder] = useState(initialOrder);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <OnboardingScaffold
      stepIndex={3}
      title="Prioritise your goals"
      description="Drag to reorder, or use the arrows. Your top goal gets the most emphasis in your plan."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/body-goal-map')}
    >
      <View style={{ gap: spacing.two }}>
        {order.map((goal, index) => (
          <Card
            key={goal}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}
          >
            <Caption>{index + 1}</Caption>
            <AppText variant="bodyEmphasis" style={{ flex: 1 }}>
              {goal}
            </AppText>
            <IconButton
              icon="chevronUp"
              accessibilityLabel={`Move ${goal} up`}
              onPress={() => move(index, -1)}
              disabled={index === 0}
            />
            <IconButton
              icon="chevronDown"
              accessibilityLabel={`Move ${goal} down`}
              onPress={() => move(index, 1)}
              disabled={index === order.length - 1}
            />
          </Card>
        ))}
      </View>
    </OnboardingScaffold>
  );
}
