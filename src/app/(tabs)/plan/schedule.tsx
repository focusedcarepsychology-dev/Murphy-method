import { View } from 'react-native';

import { AppText, Caption } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadViewerProfile } from '@/services/training/training-repository';

const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

function label(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/**
 * The week as the user actually described it during onboarding
 * (`profiles.available_training_days`). Days they did not pick are shown
 * as rest days, and no session title or duration is claimed for a day
 * until a real generated session exists for it.
 */
export default function WeeklyScheduleScreen() {
  const { spacing } = useTheme();
  const { status, data, reload } = useAuthenticatedData((client, userId) =>
    loadViewerProfile(client, userId),
  );

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading your weekly schedule" rows={4} />
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

  const availableDays = new Set(data.availableTrainingDays.map((day) => day.toLowerCase()));

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.three }}>
        {DAY_ORDER.map((day) => (
          <View key={day} style={{ gap: 2 }}>
            <Caption>{label(day).toUpperCase()}</Caption>
            <Caption color="tertiary">
              {availableDays.has(day) ? 'Available to train' : 'Rest day'}
            </Caption>
          </View>
        ))}
      </View>
      <AppText color="secondary">
        Sessions appear against your available days once your exercise programme is generated.
      </AppText>
    </ScrollScreen>
  );
}
