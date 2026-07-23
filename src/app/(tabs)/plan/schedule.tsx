import { View } from 'react-native';

import { Caption } from '@/components/ui/app-text';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { WorkoutCard } from '@/components/ui/workout-card';
import { previewWeeklyPlan } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WeeklyScheduleScreen() {
  const { spacing } = useTheme();
  const scheduled = new Map(previewWeeklyPlan.map((workout) => [workout.day, workout]));

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.three }}>
        {dayOrder.map((day) => {
          const workout = scheduled.get(day);
          return workout ? (
            <WorkoutCard
              key={day}
              dayLabel={day.toUpperCase()}
              title={workout.title}
              durationMinutes={workout.durationMinutes}
              exerciseCount={workout.exerciseCount}
              status={workout.status}
            />
          ) : (
            <View key={day} style={{ gap: 2 }}>
              <Caption>{day.toUpperCase()}</Caption>
              <Caption color="tertiary">Rest day</Caption>
            </View>
          );
        })}
      </View>
    </ScrollScreen>
  );
}
