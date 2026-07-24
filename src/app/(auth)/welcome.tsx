import { Link } from 'expo-router';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton, TertiaryButton } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const { colors, spacing, radius } = useTheme();

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: spacing.five }}>
        <View style={{ alignItems: 'center', gap: spacing.two, paddingTop: spacing.four }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.lg,
              backgroundColor: colors.brand.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="section" style={{ color: colors.brand.onPrimary }}>
              M
            </AppText>
          </View>
          <Caption color="tertiary">MURPHY METHOD</Caption>
        </View>

        <View style={{ gap: spacing.three, alignItems: 'center' }}>
          <Heading variant="hero" align="center">
            Your body.{'\n'}Your goals.{'\n'}Your path.
          </Heading>
          <AppText
            color="secondary"
            align="center"
            style={{ maxWidth: 320 }}
            accessibilityLabel="A training plan that learns what works for you, and adapts as you progress."
          >
            A training plan that learns what works for you — and adapts as you progress.
          </AppText>
        </View>

        <View style={{ gap: spacing.three }}>
          <Link href="/(auth)/sign-up" asChild>
            <PrimaryButton label="Get Started" size="large" />
          </Link>
          <Link href="/(auth)/sign-in" asChild>
            <TertiaryButton label="I already have an account" fullWidth />
          </Link>
        </View>
      </View>
    </Screen>
  );
}
