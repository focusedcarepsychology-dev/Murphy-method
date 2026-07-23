import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { MomentumCard } from '@/components/ui/momentum-card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import {
  previewConsistencyPercent,
  previewConsistencyWeeks,
  previewMomentum,
} from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

export default function ConsistencyScreen() {
  const { colors, spacing, radius } = useTheme();
  const maxWeek = Math.max(...previewConsistencyWeeks, 1);

  return (
    <ScrollScreen>
      <MomentumCard
        completedSessions={previewMomentum.completedSessions}
        plannedSessions={previewMomentum.plannedSessions}
      />
      <Card style={{ gap: spacing.two }}>
        <Caption>LAST 6 WEEKS</Caption>
        <View
          style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.two, height: 96 }}
        >
          {previewConsistencyWeeks.map((sessions, index) => (
            <View key={index} style={{ flex: 1, alignItems: 'center', gap: spacing.one }}>
              <View
                style={{
                  width: '100%',
                  height: Math.max(8, (sessions / maxWeek) * 72),
                  borderRadius: radius.sm,
                  backgroundColor: colors.status.positive,
                }}
              />
              <Caption>{sessions}</Caption>
            </View>
          ))}
        </View>
        <AppText color="secondary">
          {previewConsistencyPercent}% of planned sessions completed over this period.
        </AppText>
      </Card>
    </ScrollScreen>
  );
}
