import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { TextField } from '@/components/ui/text-field';
import { validateEmail } from '@/domain/auth/validation';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/state/auth/auth-context';

export default function ForgotPasswordScreen() {
  const { spacing, colors, radius } = useTheme();
  const { resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const emailError = touched ? validateEmail(email) : undefined;

  async function handleSubmit() {
    setTouched(true);
    setFormError(null);

    if (validateEmail(email)) {
      return;
    }
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await resetPasswordForEmail(email.trim());
      if (result.error) {
        setFormError(result.error);
        return;
      }
      // Same confirmation regardless of whether the email is registered —
      // never reveal account existence (docs/SCREEN_SPECIFICATIONS.md §1).
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <ScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: spacing.three }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.pill,
              backgroundColor: colors.status.positiveSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="envelope" color={colors.status.positive} size={26} />
          </View>
          <Heading variant="section" align="center">
            Check your email
          </Heading>
          <AppText color="secondary" align="center" style={{ maxWidth: 300 }}>
            If an account exists for {email.trim()}, we&apos;ve sent a link to reset your password.
          </AppText>
        </View>
      </ScrollScreen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollScreen contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ gap: spacing.one }}>
          <Heading variant="title">Reset your password</Heading>
          <AppText color="secondary">
            Enter your email and we&apos;ll send you a reset link.
          </AppText>
        </View>

        {formError ? (
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: colors.status.criticalSubtle,
              borderRadius: radius.sm,
              padding: spacing.three,
            }}
          >
            <AppText color="critical">{formError}</AppText>
          </View>
        ) : null}

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <View style={{ marginTop: 'auto' }}>
          <PrimaryButton label="Send Reset Link" onPress={handleSubmit} loading={submitting} />
        </View>
      </ScrollScreen>
    </KeyboardAvoidingView>
  );
}
