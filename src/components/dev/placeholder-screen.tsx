import { Stack } from 'expo-router';
import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';

export type PlaceholderScreenProps = {
  title: string;
  description: string;
  icon?: IconName;
};

/**
 * Route-group shell placeholder (docs/IMPLEMENTATION_PLAN.md Phase 1):
 * every route in docs/ROUTES.md exists and is navigable, but screens not
 * explicitly designed in docs/SCREEN_SPECIFICATIONS.md for this phase get a
 * themed placeholder rather than a fully built UI — that UI lands in the
 * phase that wires it to real data.
 */
export function PlaceholderScreen({ title, description, icon = 'info' }: PlaceholderScreenProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.three }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: colors.surface.sunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} color={colors.text.secondary} size={26} />
        </View>
        <View style={{ gap: spacing.one, alignItems: 'center' }}>
          <Heading variant="section" align="center">
            {title}
          </Heading>
          <AppText color="secondary" align="center" style={{ maxWidth: 320 }}>
            {description}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}
