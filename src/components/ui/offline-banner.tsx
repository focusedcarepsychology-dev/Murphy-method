import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

/** Persistent offline indicator for screens showing cached server data. */
export function OfflineBanner() {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="You're offline. Showing last-synced content."
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.two,
        backgroundColor: colors.status.warningSubtle,
        borderRadius: radius.md,
        paddingVertical: spacing.two,
        paddingHorizontal: spacing.three,
      }}
    >
      <Icon name="offline" color={colors.status.warning} size={16} />
      <AppText variant="supporting" style={{ color: colors.status.warning }}>
        You&apos;re offline — showing last-synced content
      </AppText>
    </View>
  );
}
