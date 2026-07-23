import { CoachInsightCard } from '@/components/ui/coach-insight-card';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { previewCoachInsight } from '@/dev/previewData';

export default function CoachInsightScreen() {
  return (
    <ScrollScreen>
      <CoachInsightCard message={previewCoachInsight} />
    </ScrollScreen>
  );
}
