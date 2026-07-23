import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';

export default function BodyScanTimelineScreen() {
  const router = useRouter();

  return (
    <ScrollScreen>
      <Card>
        <EmptyState
          icon="camera"
          title="BodyScan is optional"
          description="Standardised photos, taken over time, to track visual progress. Nothing is captured until you choose to start — no pressure either way."
          actionLabel="Start a BodyScan"
          onAction={() => router.push('/(tabs)/progress/bodyscan/new')}
        />
      </Card>
    </ScrollScreen>
  );
}
