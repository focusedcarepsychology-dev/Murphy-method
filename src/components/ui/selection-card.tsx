import { Pressable, View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

export type SelectionCardProps = {
  label: string;
  description?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
};

/** Selectable card used by Goal Selection and similar multi-choice screens. */
export function SelectionCard({ label, description, icon, selected, onPress }: SelectionCardProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.three,
          borderRadius: radius.lg,
          borderWidth: 2,
          borderColor: selected ? colors.brand.primary : colors.border.default,
          backgroundColor: selected ? colors.brand.primarySubtle : colors.surface.raised,
          padding: spacing.three,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {icon ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: selected ? colors.surface.raised : colors.surface.sunken,
          }}
        >
          <Icon
            name={icon}
            color={selected ? colors.brand.primary : colors.text.secondary}
            size={20}
          />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyEmphasis">{label}</AppText>
        {description ? <Caption>{description}</Caption> : null}
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: radius.pill,
          borderWidth: 2,
          borderColor: selected ? colors.brand.primary : colors.border.default,
          backgroundColor: selected ? colors.brand.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Icon name="check" color={colors.brand.onPrimary} size={14} /> : null}
      </View>
    </Pressable>
  );
}
