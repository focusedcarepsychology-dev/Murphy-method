import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';

/**
 * A performance insight is only ever shown when it is backed by the
 * user's own persisted sets. No completed sets means no insight, not a
 * generic one written to fill the space.
 */
export default function CoachInsightScreen() {
  return (
    <ScrollScreen>
      <Card>
        <EmptyState
          icon="info"
          title="No insight yet"
          description="Insights come from your logged sets and session feedback. There is nothing recorded to draw on so far."
        />
      </Card>
    </ScrollScreen>
  );
}
