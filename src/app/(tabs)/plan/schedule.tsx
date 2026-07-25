import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import type { ProgrammeSession } from '@/domain/programme/structure';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { ensureRealProgramme } from '@/services/programme/programme-repository';
import { loadViewerProfile } from '@/services/training/training-repository';

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
] as const;

function normaliseDay(value: string | null): string | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  const aliases: Record<string, string> = {
    monday: 'mon',
    tuesday: 'tue',
    wednesday: 'wed',
    thursday: 'thu',
    friday: 'fri',
    saturday: 'sat',
    sunday: 'sun',
  };
  return aliases[lower] ?? lower.slice(0, 3);
}

function sessionForDay(sessions: ProgrammeSession[], day: string): ProgrammeSession | null {
  return sessions.find((session) => normaliseDay(session.dayOfWeek) === day) ?? null;
}

export default function WeeklyScheduleScreen() {
  const { spacing } = useTheme();
  const { status, data, reload } = useAuthenticatedData(async (client, userId) => {
    const [profile, programme] = await Promise.all([
      loadViewerProfile(client, userId),
      ensureRealProgramme(client, userId),
    ]);
    return { profile, programme };
  });

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading your weekly schedule" rows={7} />
      </ScrollScreen>
    );
  }

  if (status === 'error' || !data) {
    return (
      <ScrollScreen>
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      </ScrollScreen>
    );
  }

  const availableDays = new Set(
    data.profile.availableTrainingDays.map((day) => normaliseDay(day)).filter(Boolean),
  );
  const sessions = data.programme?.parsedStructure.sessions ?? [];

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Weekly schedule</Heading>
        <Caption style={{ flexShrink: 1 }}>
          Sessions are matched to the days you selected. Rest days remain unassigned.
        </Caption>
      </View>

      <View style={{ gap: spacing.three }}>
        {DAYS.map((day) => {
          const session = sessionForDay(sessions, day.key);
          const available = availableDays.has(day.key);
          return (
            <Card key={day.key} style={{ gap: spacing.one }}>
              <Caption>{day.label.toUpperCase()}</Caption>
              {session ? (
                <>
                  <AppText variant="bodyEmphasis" style={{ flexShrink: 1 }}>
                    {session.name}
                  </AppText>
                  <Caption>
                    {[
                      session.estimatedMinutes ? `${session.estimatedMinutes} min` : null,
                      `${session.exercises.length} ${
                        session.exercises.length === 1 ? 'exercise' : 'exercises'
                      }`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Caption>
                  {session.focus ? (
                    <AppText color="secondary" style={{ flexShrink: 1 }}>
                      {session.focus}
                    </AppText>
                  ) : null}
                </>
              ) : available ? (
                <AppText color="secondary" style={{ flexShrink: 1 }}>
                  Available to train, but no eligible session was generated for this day.
                </AppText>
              ) : (
                <Caption color="tertiary">Rest day</Caption>
              )}
            </Card>
          );
        })}
      </View>
    </ScrollScreen>
  );
}
