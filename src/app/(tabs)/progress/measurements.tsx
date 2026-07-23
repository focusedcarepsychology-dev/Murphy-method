import { useState } from 'react';
import { View } from 'react-native';

import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ToggleRow } from '@/components/ui/list-row';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';

export default function MeasurementsScreen() {
  const { spacing } = useTheme();
  const [hideAppearanceMetrics, setHideAppearanceMetrics] = useState(false);

  return (
    <ScrollScreen>
      <Card style={{ gap: spacing.two }}>
        <ToggleRow
          title="Hide appearance & weight metrics"
          subtitle="Show only what you want to track"
          value={hideAppearanceMetrics}
          onValueChange={setHideAppearanceMetrics}
        />
      </Card>
      <Card>
        <EmptyState
          icon="measurements"
          title="No measurements yet"
          description="Add your first measurement to start tracking a trend."
        />
      </Card>
      <View>
        <PrimaryButton label="Add Measurement" fullWidth={false} disabled />
      </View>
    </ScrollScreen>
  );
}
