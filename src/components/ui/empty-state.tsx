import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

export type EmptyStateProps = {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Explicit, never-blank empty state with a short explanation and optional CTA. */
export function EmptyState({
  icon = 'info',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: spacing.three, paddingVertical: spacing.five }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: colors.surface.sunken,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} color={colors.text.secondary} size={26} />
      </View>
      <View style={{ gap: spacing.one, alignItems: 'center' }}>
        <AppText variant="bodyEmphasis" align="center">
          {title}
        </AppText>
        {description ? (
          <Caption align="center" style={{ maxWidth: 280 }}>
            {description}
          </Caption>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} fullWidth={false} />
      ) : null}
    </View>
  );
}
