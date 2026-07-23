import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { previewPersonalRecords } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

export default function PersonalRecordsScreen() {
  const { spacing } = useTheme();

  if (previewPersonalRecords.length === 0) {
    return (
      <ScrollScreen>
        <Card>
          <EmptyState
            icon="trophy"
            title="No records yet"
            description="Complete a workout to set your first record."
          />
        </Card>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.two }}>
        {previewPersonalRecords.map((record) => (
          <Card key={record.exercise} style={{ gap: 2 }}>
            <AppText variant="bodyEmphasis">{record.exercise}</AppText>
            <AppText color="secondary">{record.value}</AppText>
            <Caption>{record.date}</Caption>
          </Card>
        ))}
      </View>
    </ScrollScreen>
  );
}
