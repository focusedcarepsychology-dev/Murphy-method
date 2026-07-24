import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { TextField } from '@/components/ui/text-field';
import { validatePassword, validatePasswordConfirmation } from '@/domain/auth/validation';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/state/auth/auth-context';

/**
 * Reached only via the deep link `resetPasswordForEmail`'s `redirectTo`
 * points at (`auth-context.tsx`'s `PASSWORD_RECOVERY_REDIRECT_PATH`).
 * `useProtectedRoute` (docs/ROUTES.md §3) forces navigation here whenever
 * `state.status === 'password_recovery'` and blocks navigating away from it
 * otherwise — a stale/expired link (state never reaches
 * `password_recovery`) is the only case this screen has to explain itself,
 * since the guard would already have redirected an ordinary session
 * elsewhere.
 */
export default function ResetPasswordScreen() {
  const { spacing, colors, radius } = useTheme();
  const { state, updatePasswordAndSignOut } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const passwordError = touched ? validatePassword(password) : undefined;
  const confirmError = touched
    ? validatePasswordConfirmation(password, confirmPassword)
    : undefined;

  if (state.status !== 'password_recovery') {
    return (
      <ScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ gap: spacing.three, alignItems: 'center' }}>
          <Heading variant="section" align="center">
            This link has expired
          </Heading>
          <AppText color="secondary" align="center" style={{ maxWidth: 300 }}>
            Password reset links only work once and expire after a while. Request a new one.
          </AppText>
          <PrimaryButton
            label="Request a new link"
            onPress={() => router.replace('/(auth)/forgot-password')}
          />
        </View>
      </ScrollScreen>
    );
  }

  async function handleSubmit() {
    setTouched(true);
    setFormError(null);

    const passwordIssue = validatePassword(password);
    const confirmIssue = validatePasswordConfirmation(password, confirmPassword);
    if (passwordIssue || confirmIssue) {
      return;
    }
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await updatePasswordAndSignOut(password);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      // Signing out (inside updatePasswordAndSignOut) flips state to
      // signed_out; the route guard sends the user to Welcome on its own.
      router.replace('/(auth)/sign-in');
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
          <Heading variant="title">Set a new password</Heading>
          <AppText color="secondary">Choose a new password for your account.</AppText>
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
            label="New password"
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
            label="Confirm new password"
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

        <View style={{ marginTop: 'auto' }}>
          <PrimaryButton label="Save New Password" onPress={handleSubmit} loading={submitting} />
        </View>
      </ScrollScreen>
    </KeyboardAvoidingView>
  );
}
