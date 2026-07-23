import { useState } from 'react';

import { Card } from '@/components/ui/card';
import { ToggleRow } from '@/components/ui/list-row';
import { ScrollScreen } from '@/components/ui/scroll-screen';

export default function NotificationsScreen() {
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [coachInsights, setCoachInsights] = useState(true);
  const [progressUpdates, setProgressUpdates] = useState(false);

  return (
    <ScrollScreen>
      <Card style={{ gap: 0 }}>
        <ToggleRow
          title="Workout reminders"
          icon="notifications"
          value={workoutReminders}
          onValueChange={setWorkoutReminders}
        />
        <ToggleRow
          title="Coach insights"
          icon="coach"
          value={coachInsights}
          onValueChange={setCoachInsights}
        />
        <ToggleRow
          title="Progress updates"
          icon="progress"
          value={progressUpdates}
          onValueChange={setProgressUpdates}
        />
      </Card>
    </ScrollScreen>
  );
}
