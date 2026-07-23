import type { ReactNode } from 'react';
import { Pressable, Switch, View, type PressableProps } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { MinTouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  trailing?: ReactNode;
};

/** Base row layout shared by SettingRow/ToggleRow and plain list content. */
export function ListRow({ title, subtitle, icon, trailing }: ListRowProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.three,
        minHeight: MinTouchTarget,
        paddingVertical: spacing.two,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.sm,
            backgroundColor: colors.surface.sunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} color={colors.text.secondary} size={18} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body">{title}</AppText>
        {subtitle ? <Caption>{subtitle}</Caption> : null}
      </View>
      {trailing}
    </View>
  );
}

export type SettingRowProps = ListRowProps &
  Omit<PressableProps, 'style' | 'children'> & {
    onPress: () => void;
  };

/** Navigable settings row — Profile section entries. */
export function SettingRow({ title, subtitle, icon, onPress, ...pressableProps }: SettingRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <ListRow
        title={title}
        subtitle={subtitle}
        icon={icon}
        trailing={<Icon name="chevronRight" color={colors.text.tertiary} size={18} />}
      />
    </Pressable>
  );
}

export type ToggleRowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/** Settings row with an inline switch — Notifications, Privacy toggles. */
export function ToggleRow({ title, subtitle, icon, value, onValueChange }: ToggleRowProps) {
  const { colors } = useTheme();

  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      icon={icon}
      trailing={
        <Switch
          value={value}
          onValueChange={onValueChange}
          accessibilityLabel={title}
          trackColor={{ false: colors.surface.sunken, true: colors.brand.primary }}
          thumbColor={colors.surface.default}
        />
      }
    />
  );
}
