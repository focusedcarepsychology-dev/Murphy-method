import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadGamificationDashboard } from '@/services/gamification/gamification-repository';

const iconByKey: Record<string, IconName> = {
  first_session: 'flag',
  three_sessions: 'bolt',
  ten_sessions: 'checkCircle',
  fifty_sessions: 'trophy',
  minimum_counts: 'star',
  weekly_target: 'verified',
};

function achievedDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        date,
      );
}

export default function AchievementsScreen() {
  const { colors, spacing, radius } = useTheme();
  const { status, data, reload } = useAuthenticatedData((client) =>
    loadGamificationDashboard(client),
  );

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="hero">Achievements</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Positive milestones for consistency and flexible participation. Missing a day never
          removes an achievement.
        </AppText>
      </View>

      {status === 'loading' ? (
        <LoadingState accessibilityLabel="Loading achievements" rows={5} />
      ) : status === 'error' || !data ? (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      ) : (
        <>
          <Card variant="hero" elevated={false} style={{ gap: spacing.one }}>
            <Caption color="brand">PRIVATE PROGRESS</Caption>
            <Heading variant="hero">
              {data.achievements.filter((item) => item.achievedAt).length}
            </Heading>
            <AppText color="secondary">achievements earned</AppText>
            <Caption color="tertiary">{data.lifetimePoints} lifetime Momentum Points</Caption>
          </Card>

          <View style={{ gap: spacing.two }}>
            {data.achievements.map((achievement) => {
              const earned = Boolean(achievement.achievedAt);
              return (
                <Card
                  key={achievement.key}
                  variant={earned ? 'standard' : 'quiet'}
                  elevated={false}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.three }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: radius.pill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: earned
                        ? colors.status.positiveSubtle
                        : colors.surface.sunken,
                    }}
                  >
                    <Icon
                      name={iconByKey[achievement.key] ?? 'trophy'}
                      color={earned ? colors.status.positive : colors.text.disabled}
                      size={23}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: spacing.half }}>
                    <AppText variant="bodyEmphasis" color={earned ? 'primary' : 'secondary'}>
                      {achievement.label}
                    </AppText>
                    <Caption color="tertiary" style={{ flexShrink: 1 }}>
                      {achievement.description}
                    </Caption>
                    <Caption color={earned ? 'positive' : 'tertiary'}>
                      {earned
                        ? `Earned ${achievedDate(achievement.achievedAt) ?? ''}`
                        : 'Not earned yet'}
                    </Caption>
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      )}
    </ScrollScreen>
  );
}
