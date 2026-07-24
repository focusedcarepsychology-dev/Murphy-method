import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton, TertiaryButton } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';
import { onboardingSteps } from '@/onboarding/steps';

export type OnboardingScaffoldProps = {
  stepIndex: number;
  title: string;
  description?: string;
  children?: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Shows a spinner on the primary action and disables it, for an in-flight save. */
  nextLoading?: boolean;
};

/**
 * Shared onboarding chrome (docs/SCREEN_SPECIFICATIONS.md §2): persistent
 * progress indicator, optional Back, and a Next disabled until the step's
 * minimum input is satisfied.
 */
export function OnboardingScaffold({
  stepIndex,
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  nextLoading = false,
}: OnboardingScaffoldProps) {
  const { spacing } = useTheme();
  const total = onboardingSteps.length;

  return (
    <ScrollScreen contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ gap: spacing.two }}>
        <ProgressBar
          value={(stepIndex + 1) / total}
          accessibilityLabel={`Step ${stepIndex + 1} of ${total}`}
        />
        <Caption>
          STEP {stepIndex + 1} OF {total}
        </Caption>
      </View>

      <View style={{ gap: spacing.one }}>
        <Heading variant="title">{title}</Heading>
        {description ? <AppText color="secondary">{description}</AppText> : null}
      </View>

      {children ? <View style={{ gap: spacing.three, flex: 1 }}>{children}</View> : null}

      <View style={{ gap: spacing.two, marginTop: 'auto' }}>
        <PrimaryButton
          label={nextLabel}
          onPress={onNext}
          disabled={nextDisabled}
          loading={nextLoading}
        />
        {onBack ? <TertiaryButton label="Back" onPress={onBack} fullWidth /> : null}
      </View>
    </ScrollScreen>
  );
}
