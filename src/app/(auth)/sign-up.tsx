import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton, TertiaryButton } from '@/components/ui/button';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { TextField } from '@/components/ui/text-field';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '@/domain/auth/validation';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/state/auth/auth-context';

export default function SignUpScreen() {
  const { spacing, colors, radius } = useTheme();
  const { signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const emailError = touched ? validateEmail(email) : undefined;
  const passwordError = touched ? validatePassword(password) : undefined;
  const confirmError = touched
    ? validatePasswordConfirmation(password, confirmPassword)
    : undefined;

  async function handleSubmit() {
    setTouched(true);
    setFormError(null);

    const emailIssue = validateEmail(email);
    const passwordIssue = validatePassword(password);
    const confirmIssue = validatePasswordConfirmation(password, confirmPassword);
    if (emailIssue || passwordIssue || confirmIssue) {
      return;
    }
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp({ email: email.trim(), password });
      if (result.error) {
        setFormError(result.error);
        return;
      }
      if (result.needsVerification) {
        router.replace({ pathname: '/(auth)/verify-email', params: { email: email.trim() } });
      }
      // If verification isn't required, the session becomes signed_in and
      // the route guards (src/app/_layout.tsx) take over automatically.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollScreen contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ gap: spacing.one }}>
          <Heading variant="title">Create your account</Heading>
          <AppText color="secondary">Set up email and password sign-in.</AppText>
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

        <View style={{ gap: spacing.three }}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            isPassword
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
          />
          <TextField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmError}
            isPassword
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        <View style={{ gap: spacing.three, marginTop: 'auto' }}>
          <PrimaryButton label="Create Account" onPress={handleSubmit} loading={submitting} />
          <Link href="/(auth)/sign-in" asChild>
            <TertiaryButton label="I already have an account" fullWidth />
          </Link>
        </View>
      </ScrollScreen>
    </KeyboardAvoidingView>
  );
}
