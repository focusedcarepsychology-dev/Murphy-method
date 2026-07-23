import { View } from 'react-native';

import { AppText, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';

export default function DeleteAccountScreen() {
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.two }}>
        <Heading variant="title">Delete account</Heading>
        <AppText color="secondary">
          Starts a grace period before permanent deletion, with an explicit confirmation step and a
          cancel path. Not yet wired to a real account — this is a preview-only control.
        </AppText>
      </View>
      <PrimaryButton label="Delete my account" tone="critical" fullWidth={false} disabled />
    </ScrollScreen>
  );
}
