import { Link } from 'expo-router';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton, TertiaryButton } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';

/**
 * Public-facing introduction: hopeful and non-judgemental.
 * Founder biographical claims belong in the separately reviewed brand story,
 * not in the application until approved by the individual concerned.
 */
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
          <Caption color="tertiary">THE MURPHY METHOD</Caption>
        </View>

        <View style={{ gap: spacing.three, alignItems: 'center' }}>
          <Caption color="secondary">MORE THAN A WORKOUT</Caption>
          <Heading variant="hero" align="center">
            Your past is a chapter.{'\n'}Not your whole story.
          </Heading>
          <AppText
            color="secondary"
            align="center"
            style={{ maxWidth: 330 }}
            accessibilityLabel="Build strength, rediscover your confidence and make progress on your terms, with a plan that adapts to you."
          >
            Build strength. Rediscover confidence. Find your reason to keep going — with a plan that adapts to you.
          </AppText>
          <AppText color="tertiary" align="center" style={{ maxWidth: 320 }}>
            Progress isn't punishment. It's something you do for yourself.
          </AppText>
        </View>

        <View style={{ gap: spacing.three }}>
          <Link href="/(auth)/sign-up" asChild>
            <PrimaryButton label="Start Your Next Chapter" size="large" />
          </Link>
          <Link href="/(auth)/sign-in" asChild>
            <TertiaryButton label="I already have an account" fullWidth />
          </Link>
        </View>
      </View>
    </Screen>
  );
}
