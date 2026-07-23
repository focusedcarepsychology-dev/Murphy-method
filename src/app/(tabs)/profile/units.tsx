import { useState } from 'react';
import { View } from 'react-native';

import { Caption } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ToggleRow } from '@/components/ui/list-row';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/hooks/use-theme-preference';

export default function UnitsScreen() {
  const { spacing } = useTheme();
  const { preference, setPreference } = useThemePreference();
  const [useMetric, setUseMetric] = useState(true);

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.two }}>
        <Caption>APPEARANCE</Caption>
        <Card>
          <SegmentedControl
            accessibilityLabel="Appearance"
            value={preference}
            onChange={(value) => setPreference(value as typeof preference)}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </Card>
      </View>

      <View style={{ gap: spacing.two }}>
        <Caption>UNITS</Caption>
        <Card>
          <ToggleRow
            title="Use metric units"
            subtitle={useMetric ? 'kg, cm' : 'lb, in'}
            value={useMetric}
            onValueChange={setUseMetric}
          />
        </Card>
      </View>
    </ScrollScreen>
  );
}
