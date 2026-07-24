import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shown instead of the app when Supabase isn't configured
 * (src/config/env.ts) — never a silent fallback to a fake backend
 * (docs/IMPLEMENTATION_PLAN.md Phase 2 §3). The message is the same in
 * development and production: a missing/malformed configuration is a
 * deployment problem, not something the app can route around.
 */
export function ConfigurationErrorScreen() {
  const { colors, spacing, radius } = useTheme();

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.three }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: colors.status.warningSubtle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="warning" color={colors.status.warning} size={26} />
        </View>
        <View style={{ gap: spacing.one, alignItems: 'center' }}>
          <Heading variant="section" align="center">
            Configuration required
          </Heading>
          <AppText color="secondary" align="center" style={{ maxWidth: 320 }}>
            EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set. See
            .env.example and docs/SUPABASE_SETUP.md.
          </AppText>
        </View>
      </View>
    </Screen>
  );
}
