import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';

/**
 * The coach speaks only about things that genuinely happened. There is no
 * training history to draw on until the user completes real sessions.
 */
export default function CoachScreen() {
  const router = useRouter();
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">Coach</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Guidance based on your real sessions, sets and feedback.
        </AppText>
      </View>

      <Card variant="hero" elevated={false}>
        <EmptyState
          icon="coach"
          title="Nothing to report yet"
          description="Complete a session and the coach can reflect on what actually happened—without inventing progress or performance."
          actionLabel="View today's session"
          onAction={() => router.push('/(tabs)/today')}
        />
      </Card>

      <Card variant="quiet" elevated={false} style={{ gap: spacing.one }}>
        <Caption>HOW COACH WORKS</Caption>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Observations appear only when there is enough genuine information to be useful. A quiet
          coach is more trustworthy than a personalised-sounding message built from example data.
        </AppText>
      </Card>
    </ScrollScreen>
  );
}
