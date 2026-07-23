import { View } from 'react-native';

import { Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';

export default function ProgrammeHistoryScreen() {
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <Heading variant="title">Programme history</Heading>
      <Card>
        <EmptyState
          icon="history"
          title="This is your first programme version"
          description="History builds over time as your plan adapts — each change will appear here with its reason."
        />
      </Card>
      <View style={{ gap: spacing.one }}>
        <Caption>V1 · TODAY</Caption>
        <Caption color="tertiary">Initial programme, generated from onboarding.</Caption>
      </View>
    </ScrollScreen>
  );
}
