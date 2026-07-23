import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';

export default function DeleteDataScreen() {
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.two }}>
        <Heading variant="title">Delete data</Heading>
        <AppText color="secondary">
          Category-specific deletion, starting with BodyScan data, with an explicit confirmation
          step. Not yet wired to real storage — this is a preview-only control.
        </AppText>
      </View>
      <PrimaryButton label="Delete BodyScan data" tone="critical" fullWidth={false} disabled />
    </ScrollScreen>
  );
}
