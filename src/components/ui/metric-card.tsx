import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

export type MetricCardProps = {
  label: string;
  value: string;
  caption?: string;
  icon?: IconName;
};

export function MetricCard({ label, value, caption, icon }: MetricCardProps) {
  const { colors, spacing } = useTheme();

  return (
    <Card style={{ flex: 1, gap: spacing.one }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.one }}>
        {icon ? <Icon name={icon} color={colors.text.tertiary} size={16} /> : null}
        <Caption>{label}</Caption>
      </View>
      <AppText variant="section">{value}</AppText>
      {caption ? <Caption color="tertiary">{caption}</Caption> : null}
    </Card>
  );
}
