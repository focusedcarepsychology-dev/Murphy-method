import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { InteractiveCard } from '@/components/ui/card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';

const options = [
  'Shorter workouts',
  'Fewer days',
  'Change days',
  'Change exercises',
  'Reduce difficulty',
  'Pause and restart',
];

export default function ResetMyPlanScreen() {
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Let&apos;s adapt your plan to your life</Heading>
        <AppText color="secondary">
          Life gets busy — that&apos;s normal. Pick what would help most right now.
        </AppText>
      </View>
      <View style={{ gap: spacing.two }}>
        {options.map((option) => (
          <InteractiveCard
            key={option}
            accessibilityLabel={`${option} (preview only)`}
            disabled
            showChevron={false}
          >
            <AppText variant="bodyEmphasis">{option}</AppText>
          </InteractiveCard>
        ))}
      </View>
      <AppText color="tertiary">
        These options connect to the adherence-rescue flow in Phase 8.
      </AppText>
    </ScrollScreen>
  );
}
