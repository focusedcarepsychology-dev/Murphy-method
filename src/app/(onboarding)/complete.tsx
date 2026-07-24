import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/state/auth/auth-context';

/**
 * Brief success state (docs/SCREEN_SPECIFICATIONS.md §2 "Onboarding
 * Complete"). `onboarding_completed_at` was already set server-side when
 * Programme Preview called `complete_onboarding` — this screen's CTA
 * re-fetches that cached auth state (`retryProfileLoad`, which despite its
 * name is a general "refresh profile-routing fields" trigger, not just an
 * error-retry) so `useProtectedRoute` sees the completed state and takes
 * over navigation into `(tabs)`, rather than this screen guessing a
 * `router.replace` against possibly-stale cached state.
 */
export default function OnboardingCompleteScreen() {
  const { colors, spacing, radius } = useTheme();
  const { state, retryProfileLoad } = useAuth();
  const [requestedContinue, setRequestedContinue] = useState(false);
  // Derived, not stored: if the refresh this triggers ends in profileStatus
  // 'error', the spinner clears itself on the next render with no effect
  // needed (docs/DESIGN_SYSTEM.md §7 — avoid syncing state that render can
  // just compute).
  const continuing =
    requestedContinue && !(state.status === 'signed_in' && state.profileStatus === 'error');

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.four }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.pill,
            backgroundColor: colors.status.positiveSubtle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="checkCircle" color={colors.status.positive} size={36} />
        </View>
        <View style={{ gap: spacing.one, alignItems: 'center' }}>
          <Heading variant="title" align="center">
            You&apos;re all set
          </Heading>
          <AppText color="secondary" align="center" style={{ maxWidth: 300 }}>
            Your plan is ready. Let&apos;s get to your first session.
          </AppText>
        </View>
        <PrimaryButton
          label="Continue to Today"
          fullWidth={false}
          loading={continuing}
          onPress={() => {
            setRequestedContinue(true);
            retryProfileLoad();
          }}
        />
      </View>
    </Screen>
  );
}
