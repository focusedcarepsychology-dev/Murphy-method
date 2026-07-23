import { View, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

export type TabBarIconProps = {
  name: IconName;
  color: ColorValue;
  size: number;
  focused: boolean;
};

/**
 * Active tabs must not rely on colour alone (docs/DESIGN_SYSTEM.md
 * accessibility requirements) — the active tab additionally gets a filled
 * pill behind its icon, so selection reads by shape even for users who
 * can't distinguish the active/inactive tint colours.
 */
export function TabBarIcon({ name, color, size, focused }: TabBarIconProps) {
  const { colors, radius } = useTheme();

  return (
    <View
      testID="tab-bar-icon-pill"
      style={{
        width: size + 20,
        height: size + 12,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors.brand.primarySubtle : 'transparent',
      }}
    >
      <Icon name={name} color={color} size={size} />
    </View>
  );
}
