import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton, TertiaryButton } from '@/components/ui/button';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { TextField } from '@/components/ui/text-field';
import { validateEmail, validatePassword } from '@/domain/auth/validation';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/state/auth/auth-context';

export default function SignInScreen() {
  const { spacing, colors, radius } = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const emailError = touched ? validateEmail(email) : undefined;
  const passwordError = touched && !password ? 'Enter your password.' : undefined;

  async function handleSubmit() {
    setTouched(true);
    setFormError(null);

    if (validateEmail(email) || validatePassword(password)) {
      return;
    }
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn({ email: email.trim(), password });
      if (result.error) {
        setFormError(result.error);
      }
      // On success, route guards (src/app/_layout.tsx) redirect automatically
      // once AuthProvider's state becomes signed_in.
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
          <Heading variant="title">Sign in</Heading>
          <AppText color="secondary">Welcome back.</AppText>
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
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <Link href="/(auth)/forgot-password" asChild>
            <TertiaryButton label="Forgot password?" />
          </Link>
        </View>

        <View style={{ gap: spacing.three, marginTop: 'auto' }}>
          <PrimaryButton label="Sign In" onPress={handleSubmit} loading={submitting} />
          <Link href="/(auth)/sign-up" asChild>
            <TertiaryButton label="Create an account" fullWidth />
          </Link>
        </View>
      </ScrollScreen>
    </KeyboardAvoidingView>
  );
}
