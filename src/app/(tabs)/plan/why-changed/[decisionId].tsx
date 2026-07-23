import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { previewPlanSummary } from '@/dev/previewData';
import { useTheme } from '@/hooks/use-theme';

export default function WhyChangedScreen() {
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.two }}>
        <Heading variant="title">Why this plan?</Heading>
        <AppText color="secondary">{previewPlanSummary.whyThisPlan}</AppText>
      </View>
    </ScrollScreen>
  );
}
