import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

export type StatChipProps = {
  label: string;
  icon?: IconName;
};

export function StatChip({ label, icon }: StatChipProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.one,
        borderRadius: radius.pill,
        backgroundColor: colors.surface.sunken,
        paddingVertical: spacing.half,
        paddingHorizontal: spacing.two,
        alignSelf: 'flex-start',
      }}
    >
      {icon ? <Icon name={icon} color={colors.text.secondary} size={14} /> : null}
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
    </View>
  );
}
