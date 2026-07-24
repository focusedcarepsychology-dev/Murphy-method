import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton, SecondaryButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/state/auth/auth-context';
import type { DeepLinkNotice } from '@/state/auth/types';

export default function VerifyEmailScreen() {
  const { spacing, colors, radius } = useTheme();
  const { resendVerificationEmail, refreshSession, deepLinkNotice, acknowledgeDeepLinkNotice } =
    useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : undefined;

  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'positive' | 'critical'>('positive');

  // Reflects the outcome of a tapped confirmation link (the session itself is
  // established elsewhere, in AuthProvider's incoming-link handler — success
  // routes the user onward via the route guard before this would matter, so
  // only the failure case is surfaced here). Malformed, expired, and
  // already-used links all land here with the same safe, generic copy
  // (docs/IMPLEMENTATION_PLAN.md Phase 2 §17) — never the underlying reason.
  //
  // Reacts to `deepLinkNotice` changing during render (not in an effect) per
  // React's "adjusting state when a prop changes" pattern, since the update
  // is local (`setMessage`/`setMessageTone`), not a subscription to an
  // external system.
  const [handledNotice, setHandledNotice] = useState<DeepLinkNotice | null>(null);
  if (deepLinkNotice !== handledNotice) {
    setHandledNotice(deepLinkNotice);
    if (deepLinkNotice?.kind === 'signup' && deepLinkNotice.outcome === 'failed') {
      setMessageTone('critical');
      setMessage('That verification link is invalid or has expired. Resend a new one below.');
    }
  }

  // Acknowledging is an update to AuthProvider's (external, ancestor) state,
  // so it belongs in an effect rather than the render body above.
  useEffect(() => {
    if (deepLinkNotice) {
      acknowledgeDeepLinkNotice();
    }
  }, [deepLinkNotice, acknowledgeDeepLinkNotice]);

  async function handleResend() {
    if (!email || resending) return;
    setResending(true);
    setMessage(null);
    try {
      const result = await resendVerificationEmail(email);
      if (result.error) {
        setMessageTone('critical');
        setMessage(result.error);
      } else {
        setMessageTone('positive');
        setMessage('Verification email sent again.');
      }
    } finally {
      setResending(false);
    }
  }

  async function handleCheckVerified() {
    if (checking) return;
    setChecking(true);
    setMessage(null);
    try {
      await refreshSession();
      // If verification completed, AuthProvider's state flips to signed_in
      // and the route guards (src/app/_layout.tsx) redirect automatically.
      // If not, there's nothing to redirect to yet — say so plainly.
      setMessageTone('critical');
      setMessage('Not verified yet. Check your inbox and tap the link, then try again.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.four }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: colors.brand.primarySubtle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="envelope" color={colors.brand.primary} size={26} />
        </View>

        <View style={{ gap: spacing.one, alignItems: 'center' }}>
          <Heading variant="section" align="center">
            Verify your email
          </Heading>
          <AppText color="secondary" align="center" style={{ maxWidth: 320 }}>
            {email
              ? `We’ve sent a verification link to ${email}. Tap it to confirm your account, then come back here.`
              : 'Check your email for a verification link, then come back here.'}
          </AppText>
        </View>

        {message ? (
          <AppText
            accessibilityRole="alert"
            color={messageTone}
            align="center"
            style={{ maxWidth: 320 }}
          >
            {message}
          </AppText>
        ) : null}

        <View style={{ gap: spacing.two, width: '100%' }}>
          <PrimaryButton
            label="I've verified — Continue"
            onPress={handleCheckVerified}
            loading={checking}
          />
          <SecondaryButton
            label="Resend verification email"
            onPress={handleResend}
            disabled={!email}
            loading={resending}
          />
        </View>
      </View>
    </Screen>
  );
}
