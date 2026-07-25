import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';

/**
 * The coach speaks only about things that genuinely happened. There is no
 * training history to draw on until the user completes real sessions, and
 * an encouraging message about sessions they never did is exactly the
 * fictional-personal-data problem this remediation removes — so this
 * screen says plainly that there is nothing to report yet.
 */
export default function CoachScreen() {
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">Coach</Heading>
      </View>

      <Card>
        <EmptyState
          icon="coach"
          title="Nothing to report yet"
          description="Your coach comments on your actual sessions, sets and feedback. Once you have trained, useful observations appear here."
        />
      </Card>

      <AppText color="tertiary">
        Coach messages are never generated from example data. If there is nothing real to say, this
        screen stays quiet.
      </AppText>
    </ScrollScreen>
  );
}
