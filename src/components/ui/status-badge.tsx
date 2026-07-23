import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

export type StatusTone = 'positive' | 'warning' | 'critical' | 'neutral';

const toneIcon: Record<StatusTone, IconName> = {
  positive: 'checkCircle',
  warning: 'warning',
  critical: 'alertCircle',
  neutral: 'info',
};

export type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

/**
 * Colour is never the sole signal (docs/DESIGN_SYSTEM.md §3.4) — every
 * status badge pairs its tone with an icon and a text label.
 */
export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const { colors, radius, spacing } = useTheme();

  const { fg, bg } =
    tone === 'positive'
      ? { fg: colors.status.positive, bg: colors.status.positiveSubtle }
      : tone === 'warning'
        ? { fg: colors.status.warning, bg: colors.status.warningSubtle }
        : tone === 'critical'
          ? { fg: colors.status.critical, bg: colors.status.criticalSubtle }
          : { fg: colors.text.secondary, bg: colors.surface.sunken };

  return (
    <View
      accessibilityRole="text"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.one,
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingVertical: spacing.half,
        paddingHorizontal: spacing.two,
      }}
    >
      <Icon name={toneIcon[tone]} color={fg} size={14} />
      <AppText variant="caption" style={{ color: fg }}>
        {label}
      </AppText>
    </View>
  );
}
