import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';

export default function StrengthProgressScreen() {
  return (
    <ScrollScreen>
      <Card>
        <EmptyState
          icon="trending"
          title="Trends need a little history"
          description="Complete a few workouts logging the same exercise and your strength trend will appear here."
        />
      </Card>
    </ScrollScreen>
  );
}
