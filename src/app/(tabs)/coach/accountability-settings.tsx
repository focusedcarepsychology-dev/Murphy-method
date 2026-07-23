import { useState } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ToggleRow } from '@/components/ui/list-row';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';

export default function AccountabilitySettingsScreen() {
  const { spacing } = useTheme();
  const [dailyCheckIn, setDailyCheckIn] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [quietHours, setQuietHours] = useState(false);

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.two }}>
        <Card style={{ gap: spacing.one }}>
          <ToggleRow
            title="Daily check-in nudge"
            icon="notifications"
            value={dailyCheckIn}
            onValueChange={setDailyCheckIn}
          />
          <ToggleRow
            title="Weekly summary"
            icon="progress"
            value={weeklySummary}
            onValueChange={setWeeklySummary}
          />
          <ToggleRow
            title="Quiet hours"
            subtitle="Pause nudges overnight"
            icon="moon"
            value={quietHours}
            onValueChange={setQuietHours}
          />
        </Card>
      </View>
    </ScrollScreen>
  );
}
