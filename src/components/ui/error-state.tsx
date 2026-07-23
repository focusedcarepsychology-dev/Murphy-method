import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

export type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry: () => void;
};

/** Retry-capable inline error state — never a blank screen or raw crash. */
export function ErrorState({
  title = 'Something went wrong',
  description = "That didn't work. You can try again.",
  onRetry,
}: ErrorStateProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={{ alignItems: 'center', gap: spacing.three, paddingVertical: spacing.five }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: colors.status.criticalSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="alertCircle" color={colors.status.critical} size={26} />
      </View>
      <View style={{ gap: spacing.one, alignItems: 'center' }}>
        <AppText variant="bodyEmphasis" align="center">
          {title}
        </AppText>
        <Caption align="center" style={{ maxWidth: 280 }}>
          {description}
        </Caption>
      </View>
      <PrimaryButton label="Try again" onPress={onRetry} fullWidth={false} />
    </View>
  );
}
