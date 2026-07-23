import { Pressable, View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

export type CoachInsightAction = {
  label: string;
  onPress: () => void;
};

export type CoachInsightCardProps = {
  message: string;
  actions?: CoachInsightAction[];
};

/** Murphy's coach message card — premium, not a generic chat bubble. */
export function CoachInsightCard({ message, actions }: CoachInsightCardProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <Card style={{ gap: spacing.three }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.two }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.pill,
            backgroundColor: colors.brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="caption" style={{ color: colors.brand.onPrimary }}>
            M
          </AppText>
        </View>
        <Caption color="tertiary">MURPHY · YOUR ADAPTIVE COACH</Caption>
      </View>
      <AppText variant="body">{message}</AppText>
      {actions?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.two }}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              onPress={action.onPress}
              style={({ pressed }) => ({
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border.default,
                paddingVertical: spacing.two,
                paddingHorizontal: spacing.three,
                backgroundColor: pressed ? colors.surface.sunken : 'transparent',
              })}
            >
              <AppText variant="supportingEmphasis" style={{ color: colors.brand.primary }}>
                {action.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
