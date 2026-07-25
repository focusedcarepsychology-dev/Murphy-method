import { View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

export type MetricCardProps = {
  label: string;
  value: string;
  caption?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

export function MetricCard({ label, value, caption, icon, style }: MetricCardProps) {
  const { colors, spacing } = useTheme();

  return (
    <Card style={[{ flex: 1, minWidth: 0, gap: spacing.one }, style]}>
      <View
        style={{
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.one,
        }}
      >
        {icon ? <Icon name={icon} color={colors.text.tertiary} size={16} /> : null}
        <Caption style={{ flexShrink: 1 }}>{label}</Caption>
      </View>
      <AppText variant="section" style={{ flexShrink: 1 }}>
        {value}
      </AppText>
      {caption ? (
        <Caption color="tertiary" style={{ flexShrink: 1 }}>
          {caption}
        </Caption>
      ) : null}
    </Card>
  );
}
