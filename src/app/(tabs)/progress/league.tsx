import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Icon } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { SectionHeader } from '@/components/ui/section-header';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import {
  loadGamificationDashboard,
  loadGamificationLeaderboard,
} from '@/services/gamification/gamification-repository';

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date);
}

export default function LeagueScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { status, data, reload } = useAuthenticatedData(async (client) => {
    const [dashboard, leaderboard] = await Promise.all([
      loadGamificationDashboard(client),
      loadGamificationLeaderboard(client),
    ]);
    return { dashboard, leaderboard };
  });

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Caption color="brand">OPT-IN COMPETITION</Caption>
        <Heading variant="hero">Momentum Cup</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          A monthly consistency tournament. Points come from fully logged sessions, never body
          measurements, lifted weight, paid status or unsafe extra volume.
        </AppText>
      </View>

      {status === 'loading' ? (
        <LoadingState accessibilityLabel="Loading the Momentum Cup" rows={4} />
      ) : status === 'error' || !data ? (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      ) : !data.dashboard.leaderboardOptIn ? (
        <Card>
          <EmptyState
            icon="trophy"
            title="Join only when it suits you"
            description="Your points and achievements remain private by default. Choose a public alias to enter the ranked tournament."
            actionLabel="Review tournament settings"
            onAction={() => router.push('/(tabs)/profile/gamification')}
          />
        </Card>
      ) : (
        <>
          <Card variant="hero" elevated={false} style={{ gap: spacing.three }}>
            <Caption color="brand">{data.leaderboard.season.name.toUpperCase()}</Caption>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.four }}>
              <View style={{ flex: 1, minWidth: 120, gap: spacing.one }}>
                <Caption>YOUR RANK</Caption>
                <Heading variant="hero">
                  {data.dashboard.season.rank ? `#${data.dashboard.season.rank}` : '—'}
                </Heading>
                <Caption color="tertiary">
                  {data.dashboard.season.participants
                    ? `of ${data.dashboard.season.participants} participants`
                    : 'ranking updates after entry'}
                </Caption>
              </View>
              <View style={{ flex: 1, minWidth: 120, gap: spacing.one }}>
                <Caption>THIS MONTH</Caption>
                <Heading variant="hero">{data.dashboard.season.points}</Heading>
                <Caption color="tertiary">Momentum Points</Caption>
              </View>
            </View>
            <Caption color="tertiary">
              {formatDate(data.leaderboard.season.startsOn)}–
              {formatDate(data.leaderboard.season.endsOn)}
            </Caption>
          </Card>

          <View style={{ gap: spacing.two }}>
            <SectionHeader title="Leaderboard" />
            {data.leaderboard.entries.length === 0 ? (
              <Card>
                <EmptyState
                  icon="people"
                  title="The tournament is just starting"
                  description="Opted-in members appear here after joining."
                />
              </Card>
            ) : (
              <Card style={{ gap: 0 }}>
                {data.leaderboard.entries.map((entry, index) => (
                  <View
                    key={`${entry.rank}-${entry.alias}`}
                    accessibilityLabel={`Rank ${entry.rank}, ${entry.alias}, ${entry.points} points`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.three,
                      minHeight: 58,
                      paddingVertical: spacing.two,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.border.subtle,
                      backgroundColor: entry.isCurrentUser ? colors.surface.sunken : 'transparent',
                      borderRadius: entry.isCurrentUser ? radius.sm : 0,
                    }}
                  >
                    <View style={{ width: 34, alignItems: 'center' }}>
                      {entry.rank <= 3 ? (
                        <Icon name="trophy" color={colors.brand.primary} size={20} />
                      ) : (
                        <Caption>{entry.rank}</Caption>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText variant="bodyEmphasis" numberOfLines={1}>
                        {entry.alias}
                        {entry.isCurrentUser ? ' · You' : ''}
                      </AppText>
                      <Caption color="tertiary">
                        {entry.scoredDays} scored {entry.scoredDays === 1 ? 'day' : 'days'}
                      </Caption>
                    </View>
                    <AppText variant="bodyEmphasis">{entry.points}</AppText>
                  </View>
                ))}
              </Card>
            )}
          </View>

          <Card variant="quiet" elevated={false} style={{ gap: spacing.two }}>
            <Heading variant="section">Fair-play scoring</Heading>
            <AppText color="secondary">
              Full {data.leaderboard.rules.fullSessionPoints} · Quick{' '}
              {data.leaderboard.rules.quickSessionPoints} · Minimum{' '}
              {data.leaderboard.rules.minimumSessionPoints}
            </AppText>
            <Caption color="tertiary" style={{ flexShrink: 1 }}>
              The highest completed mode counts once per UTC day. Meeting your weekly plan adds{' '}
              {data.leaderboard.rules.weeklyTargetBonus} points. Extra sets and heavier weights do
              not increase tournament score.
            </Caption>
            <PrimaryButton
              label="Tournament settings"
              fullWidth={false}
              onPress={() => router.push('/(tabs)/profile/gamification')}
            />
          </Card>
        </>
      )}
    </ScrollScreen>
  );
}
